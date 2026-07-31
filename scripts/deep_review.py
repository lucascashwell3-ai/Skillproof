#!/usr/bin/env python3
"""Automated deep source review — the rung between "a robot scanned it" and
"a human installed and probed it".

`safety_skim.py` answers "does this contain known-poison patterns?" with regex.
This answers the three questions a non-engineer actually has, by READING the
source with a model:

    what does it do  ·  what does it touch  ·  how do I undo it

It never installs anything and never executes the code it reads. That is the
whole reason the tier is called `reviewed` and not `tested`, and it is why every
review block carries a `limits` field saying so in the entry's own words.

`source_sha` is the load-bearing field. Files are read from a shallow clone, and
the sha recorded is the sha of the bytes that were read — so a review can never
silently describe code that has since changed. When upstream moves,
`validate_index.py --downgrade-stale` demotes the entry back to `scouted`.

Backends
--------
  --backend cli   DEFAULT. The Claude Code CLI in print mode, so the run bills to
                  a Claude subscription rather than metered API credits. Uses
                  --json-schema for the same structured-output enforcement the API
                  path gets, and --tools "" so the reviewer cannot touch anything.
  --backend api   Anthropic Messages API. Needs ANTHROPIC_API_KEY. Metered: ~$0.07
                  per entry, and ~30 of the 53 catalogued repos move in any given
                  week, so this is a recurring bill — not the default for a reason.
  --backend echo  No model. Writes nothing; prints exactly what WOULD be sent per
                  entry (files, bytes, token estimate, cost estimate).

Usage:
  python3 scripts/deep_review.py --backend echo                # price it, write nothing
  python3 scripts/deep_review.py --only superpowers            # one entry, on your plan
  python3 scripts/deep_review.py                               # the whole catalogue
  python3 scripts/validate_index.py                            # then gate it
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import date
from pathlib import Path

from review_contract import (
    REVIEWER_ID,
    TOUCHES_EXCLUSIVE,
    TOUCHES_VOCAB,
    UNDO_NOT_DOCUMENTED,
    output_schema,
)

ROOT = Path(__file__).resolve().parent.parent
# Overridable so the reviewer can be exercised against a fixture without any
# chance of a test run writing into the published catalog.
DATA = Path(os.environ.get("SKILLPROOF_DATA")
            or ROOT / "docs" / "data" / "skills.json")
TODAY = date.today().isoformat()

MODEL = "claude-opus-5"
# Per Anthropic list pricing for claude-opus-5, USD per 1M tokens. Used only for
# the run's own cost report and the budget stop — re-verify before trusting it.
PRICE_IN_PER_MTOK = 5.00
PRICE_OUT_PER_MTOK = 25.00

# Total reviewable bytes sent per entry. A library with 200 skills cannot be read
# whole; the cap is honest and what it excluded is recorded in review.scope.
MAX_TOTAL_BYTES = 40 * 1024
MAX_FILE_BYTES = 64 * 1024
MAX_FILES = 40

# The reviewable surface: the behaviour contract, then the docs, then anything
# that actually runs on the user's machine.
SKILL_NAMES = {"skill.md", "agent.md", "agents.md"}
README_RE = re.compile(r"^readme(\.md|\.txt|\.rst)?$", re.I)
CODE_EXT = {".py", ".sh", ".bash", ".zsh", ".js", ".mjs", ".cjs", ".ts"}
SKIP_DIRS = {".git", "node_modules", "dist", "build", "vendor", ".next",
             "__pycache__", ".venv", "venv", "test", "tests", "__tests__",
             "fixtures", "spec"}

SYSTEM = f"""You review the source of third-party AI agent skills and libraries for
Skillproof, and you write for a reader who cannot read code. They came to us
precisely because "review the source before installing" is not something they can do.

You are READING source. You are NOT running it. Never write anything that implies
the code was executed, installed, tested, or observed working.

Answer exactly three questions, plus your own limits:

1. does — one plain sentence: what this gives their agent. No jargon. Do not
   define it by category ("a skill that…"); say what changes for them.
2. touches — every category below that the source actually shows. Evidence in the
   source, not inference from the name or the README's promises:
{chr(10).join('     - ' + t for t in TOUCHES_VOCAB)}
   Use "{TOUCHES_EXCLUSIVE}" alone, and only for pure prose/markdown that ships no
   executable code at all.
3. undo — how to turn it off or remove it, taken from what the source says. If the
   source does not say, write exactly "{UNDO_NOT_DOCUMENTED}". Never invent or infer
   a command. A missing undo is a real, useful finding.
4. limits — what your review cannot tell them. Always state that the code was read,
   not run. If files were withheld from you, say that the review covers only part of
   the repo. If anything is genuinely ambiguous, put it here rather than reassuring
   them.

Be conservative. Understating is correct; a comforting guess is a defect. If the
README claims something the source does not show, describe the source and note the
gap in limits."""


def strip_fence(text: str) -> str:
    """Pull a JSON object out of a reply that may be wrapped in a code fence."""
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```[a-zA-Z]*\n?", "", t)
        t = re.sub(r"\n?```$", "", t.strip())
    a, b = t.find("{"), t.rfind("}")
    return t[a:b + 1] if a != -1 and b > a else t


# ---------------------------------------------------------------- source fetch

def clone(url, workdir):
    """Shallow clone; returns (path, head_sha). The sha is of the bytes on disk."""
    dest = Path(workdir) / "repo"
    r = subprocess.run(
        ["git", "clone", "--depth", "1", "--quiet", url + ".git", str(dest)],
        capture_output=True, text=True, timeout=300,
    )
    if r.returncode != 0:
        return None, None
    rev = subprocess.run(["git", "-C", str(dest), "rev-parse", "HEAD"],
                         capture_output=True, text=True, timeout=60)
    if rev.returncode != 0:
        return None, None
    return dest, rev.stdout.strip()


def rank(rel: str) -> int:
    """Read order. The behaviour contract before the marketing before the code."""
    name = Path(rel).name.lower()
    if name in SKILL_NAMES:
        return 0
    if README_RE.match(name):
        return 1
    return 2


def collect(repo: Path):
    """Pick the reviewable surface under the byte cap.

    Returns (files, skipped_count, truncated, total_bytes); `files` is [(rel, text)].
    Within each tier, smallest first — covering ten small scripts tells the reader
    more than half of one big one.

    An oversized SKILL.md or README is TRUNCATED, not dropped. Awesome-lists are
    a single 240KB README and nothing else; skipping it made the whole entry look
    unreviewable when the first 40KB answers all three questions perfectly well.
    Oversized *code* is still skipped — a fragment of logic invites a confident
    wrong reading, which is the one failure mode this tier cannot afford.
    """
    candidates = []
    for p in sorted(repo.rglob("*")):
        if not p.is_file() or p.is_symlink():
            continue
        rel_parts = p.relative_to(repo).parts
        if any(part in SKIP_DIRS for part in rel_parts):
            continue
        name = p.name.lower()
        is_doc = name in SKILL_NAMES or bool(README_RE.match(name))
        if not (is_doc or p.suffix.lower() in CODE_EXT):
            continue
        try:
            size = p.stat().st_size
        except OSError:
            continue
        if size == 0 or (size > MAX_FILE_BYTES and not is_doc):
            continue
        candidates.append((str(p.relative_to(repo)), size, p, is_doc))

    candidates.sort(key=lambda c: (rank(c[0]), c[1], c[0]))

    files, used, skipped, truncated = [], 0, 0, []
    for rel, size, p, is_doc in candidates:
        room = MAX_TOTAL_BYTES - used
        if len(files) >= MAX_FILES or room <= 512:
            skipped += 1
            continue
        try:
            text = p.read_text(errors="ignore")
        except OSError:
            skipped += 1
            continue
        if size > room:
            if not is_doc:
                skipped += 1
                continue
            text = text[:room] + "\n\n[... TRUNCATED — this document continues ...]"
            truncated.append((rel, size, room))
            used = MAX_TOTAL_BYTES
        else:
            used += size
        files.append((rel, text))
    return files, skipped, truncated, used


def scope_line(files, skipped, truncated, used):
    """What the review covered — stated so a skeptic can check it against the repo."""
    shown = ", ".join(rel for rel, _ in files[:4])
    more = f", +{len(files) - 4} more" if len(files) > 4 else ""
    base = f"{len(files)} file(s), {used / 1024:.1f}KB read: {shown}{more}"
    for rel, size, kept in truncated:
        base += (f". {rel} truncated at {kept / 1024:.0f}KB of "
                 f"{size / 1024:.0f}KB")
    if skipped:
        base += (f". {skipped} further file(s) NOT read — repo exceeds the "
                 f"{MAX_TOTAL_BYTES // 1024}KB review cap")
    return base


def build_prompt(entry, files, skipped, truncated):
    head = (f"Repository: {entry['repo_url']}\n"
            f"Name: {entry['name']}\n"
            f"Author's own description: {entry.get('summary', '(none)')}\n")
    # The model must know what it was NOT shown, or its `limits` field will
    # understate the review's reach — which is the one thing this tier sells.
    if skipped:
        head += (f"\nNOTE: {skipped} file(s) in this repo were NOT given to you "
                 f"(review byte cap). Your review covers only what is below — say "
                 f"so in limits.\n")
    for rel, size, kept in truncated:
        head += (f"\nNOTE: {rel} is {size // 1024}KB and you are seeing only its "
                 f"first {kept // 1024}KB. Say so in limits.\n")
    body = "\n".join(
        f"\n===== FILE: {rel} =====\n{text}" for rel, text in files
    )
    return head + body


# ------------------------------------------------------------------- backends

class ApiBackend:
    """Anthropic Messages API with a structured-output schema.

    The schema is enforced at the API boundary (`additionalProperties: false`,
    enum on `touches`), so a malformed review fails here rather than shipping.
    """

    def __init__(self):
        try:
            import anthropic
        except ImportError:
            sys.exit("--backend api needs the anthropic package: pip install anthropic")
        if not (os.environ.get("ANTHROPIC_API_KEY")
                or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
            sys.exit("--backend api needs ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN) set.")
        self.client = anthropic.Anthropic()
        self.schema = output_schema()

    def count_tokens(self, prompt):
        r = self.client.messages.count_tokens(
            model=MODEL,
            system=[{"type": "text", "text": SYSTEM}],
            messages=[{"role": "user", "content": prompt}],
        )
        return r.input_tokens

    def review(self, prompt):
        """Returns (fields, in_tokens, out_tokens)."""
        resp = self.client.messages.create(
            model=MODEL,
            max_tokens=8000,
            # The system prompt is byte-identical across all 54 calls, so it
            # caches; only the per-entry source is billed at full rate.
            system=[{"type": "text", "text": SYSTEM,
                     "cache_control": {"type": "ephemeral"}}],
            output_config={
                "effort": "low",
                "format": {"type": "json_schema", "schema": self.schema},
            },
            messages=[{"role": "user", "content": prompt}],
        )
        if resp.stop_reason == "refusal":
            raise RuntimeError(f"model declined to review: {resp.stop_details}")
        if resp.stop_reason == "max_tokens":
            raise RuntimeError("review truncated at max_tokens — raise it and retry")
        text = next((b.text for b in resp.content if b.type == "text"), None)
        if not text:
            raise RuntimeError("no text block in response")
        u = resp.usage
        billed_in = (u.input_tokens + getattr(u, "cache_creation_input_tokens", 0) or 0)
        return json.loads(text), billed_in, u.output_tokens


class CliBackend:
    """The Claude Code CLI in print mode — runs on the operator's Claude
    subscription instead of metered API credits.

    This is the default because the API path costs real money every week: 30 of
    the 53 catalogued repos push within any given 7 days, so "only re-review what
    changed" is most of the catalogue, not a rounding error. A weekly bill is a
    reason to not run the reviewer at all, and a reviewer that doesn't run is
    worth nothing.

    `--json-schema` gives the same enforcement the API's structured output does,
    so a malformed review is rejected here too rather than reaching the data file.
    `--tools ""` makes it read-only: every byte it reasons about is in the prompt,
    so it has no reason to touch the machine and no ability to.
    """

    def __init__(self, model="opus", effort="low"):
        self.exe = shutil.which("claude")
        if not self.exe:
            sys.exit("--backend cli needs the `claude` CLI on PATH "
                     "(https://claude.com/claude-code)")
        self.model, self.effort = model, effort
        self.schema = json.dumps(output_schema())

    def count_tokens(self, prompt):
        return len(prompt) // 4 + 250

    def review(self, prompt):
        cmd = [self.exe, "-p",
               "--output-format", "json",
               "--json-schema", self.schema,
               "--system-prompt", SYSTEM,
               "--model", self.model,
               "--effort", self.effort,
               "--tools", "",              # read-only: no filesystem, no network
               "--disable-slash-commands",  # no local skill can reshape the review
               "--no-session-persistence"]
        r = subprocess.run(cmd, input=prompt, capture_output=True, text=True,
                           timeout=600)
        if r.returncode != 0:
            tail = (r.stderr or r.stdout or "").strip().splitlines()
            raise RuntimeError(f"claude exited {r.returncode}: "
                               f"{tail[-1] if tail else 'no output'}")
        try:
            env = json.loads(r.stdout)
        except json.JSONDecodeError:
            raise RuntimeError(f"claude did not return JSON: {r.stdout[:200]!r}")
        if env.get("is_error"):
            raise RuntimeError(f"claude reported an error: {env.get('result')}")

        payload = env.get("structured_output", env.get("result"))
        if isinstance(payload, str):
            payload = json.loads(strip_fence(payload))
        if not isinstance(payload, dict):
            raise RuntimeError(f"unexpected result shape: {type(payload).__name__}")

        u = env.get("usage") or {}
        return payload, u.get("input_tokens", 0), u.get("output_tokens", 0)


class EchoBackend:
    """No model. Prices the run and proves the fetch/prompt path in isolation."""

    def count_tokens(self, prompt):
        # ~3.5 chars/token is a reasonable estimate for mixed source + prose.
        return len(prompt) // 4 + 250

    def review(self, prompt):
        raise RuntimeError("echo backend writes nothing — it only prices the run")


# ------------------------------------------------------------------ validation

def check_fields(f):
    """Reject a model response the schema couldn't catch. Cheap, and it means a
    bad review never reaches the data file even if the schema is relaxed later."""
    errs = []
    for k in ("does", "undo", "limits"):
        if not isinstance(f.get(k), str) or not f[k].strip():
            errs.append(f"{k} missing or empty")
    t = f.get("touches")
    if not isinstance(t, list) or not t:
        errs.append("touches missing or empty")
    else:
        bad = [x for x in t if x not in TOUCHES_VOCAB]
        if bad:
            errs.append(f"touches outside the fixed vocabulary: {bad}")
        if TOUCHES_EXCLUSIVE in t and len(t) > 1:
            errs.append(f"'{TOUCHES_EXCLUSIVE}' cannot be combined with other values")
    return errs


def cost(in_tok, out_tok):
    return in_tok / 1e6 * PRICE_IN_PER_MTOK + out_tok / 1e6 * PRICE_OUT_PER_MTOK


# ------------------------------------------------------------------------ main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--backend", choices=("cli", "api", "echo"), default="cli",
                    help="cli = Claude Code CLI on your subscription (default); "
                         "api = metered Anthropic API; echo = price only, writes nothing")
    ap.add_argument("--model", default="opus", help="cli backend only")
    ap.add_argument("--effort", default="low", choices=("low", "medium", "high"))
    ap.add_argument("--only", help="one entry id")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--max-cost", type=float, default=5.00,
                    help="hard stop, USD. Refuses to start a run it estimates "
                         "will exceed this, and stops mid-run if actuals do.")
    ap.add_argument("--force", action="store_true",
                    help="re-review even when review.source_sha is current")
    ap.add_argument("--dump-prompts", metavar="DIR",
                    help="write one <id>.json per entry (system + prompt + pinned sha) "
                         "and exit without calling any model. A reviewing agent answers "
                         "each file; scripts/ingest_reviews.py validates + writes. This "
                         "is the no-CLI path: same clone, same byte caps, same sha pin.")
    args = ap.parse_args()

    backend = (None if args.dump_prompts
               else ({"api": ApiBackend,
                      "echo": EchoBackend}.get(args.backend)
                     or (lambda: CliBackend(args.model, args.effort)))())
    data = json.loads(DATA.read_text())

    # `reviewed` is a promotion from `scouted`: found, skimmed clean, published.
    # A graded entry already had a human read its source, so it is not a target.
    targets = [s for s in data["skills"] if s.get("status") in ("scouted", "reviewed")]
    if args.only:
        targets = [s for s in targets if s["id"] == args.only]
        if not targets:
            sys.exit(f"no scouted/reviewed entry with id '{args.only}'")

    print(f"deep review · backend={args.backend} · model={MODEL} · "
          f"budget=${args.max_cost:.2f}")
    print(f"{len(targets)} candidate entr(y|ies) · about a minute each\n",
          flush=True)

    spent = 0.0
    done = failed = skipped_current = missed = 0
    stopped_for_budget = []

    total = len(targets) if not args.limit else min(args.limit, len(targets))
    for n, s in enumerate(targets, 1):
        sid = s["id"]
        if args.limit and done >= args.limit:
            break
        print(f"  [{n}/{total}] {sid}: downloading…", end="\r", flush=True)

        with tempfile.TemporaryDirectory() as tmp:
            try:
                repo, head_sha = clone(s["repo_url"], tmp)
            except subprocess.TimeoutExpired:
                repo, head_sha = None, None
            if repo is None:
                print(f"  miss  {sid}: clone failed — left as-is")
                missed += 1
                continue

            # Idempotent: the review already describes this exact commit.
            existing = s.get("review") or {}
            if not args.force and existing.get("source_sha") == head_sha:
                print(f"  skip  {sid}: review already pinned to {head_sha[:8]}")
                skipped_current += 1
                continue

            print(f"  [{n}/{total}] {sid}: reading source…    ", end="\r", flush=True)
            files, nskipped, ntrunc, used = collect(repo)
            if not files:
                print(f"  miss  {sid}: nothing reviewable found (no SKILL.md, "
                      f"README, or scripts)")
                missed += 1
                continue
            prompt = build_prompt(s, files, nskipped, ntrunc)

        if args.dump_prompts:
            outdir = Path(args.dump_prompts)
            outdir.mkdir(parents=True, exist_ok=True)
            (outdir / f"{sid}.json").write_text(json.dumps({
                "id": sid,
                "source_sha": head_sha,           # pinned HERE, at read time —
                "scope": scope_line(files, nskipped, ntrunc, used),  # never by the reviewer
                "system": SYSTEM,
                "prompt": prompt,
            }, ensure_ascii=False) + "\n")
            done += 1
            print(f"  dump  [{n}/{total}] {sid}: {len(files)} files @ {head_sha[:8]} "
                  f"→ {outdir / (sid + '.json')}")
            continue

        est_in = backend.count_tokens(prompt)
        est = cost(est_in, 900)

        if args.backend == "echo":
            print(f"  price {sid}: {len(files)} files, {used/1024:.1f}KB, "
                  f"~{est_in:,} in-tokens, ~${est:.3f}"
                  + (f", {nskipped} file(s) over cap" if nskipped else ""))
            spent += est
            done += 1
            continue

        # Budget stop BEFORE spending, not after.
        if spent + est > args.max_cost:
            stopped_for_budget.append(sid)
            print(f"  STOP  {sid}: est ${est:.3f} would push the run past the "
                  f"${args.max_cost:.2f} budget (spent ${spent:.2f})")
            break

        try:
            fields, in_tok, out_tok = backend.review(prompt)
        except Exception as e:  # noqa: BLE001 — one bad entry must not kill the run
            print(f"  FAIL  {sid}: {e}")
            failed += 1
            continue

        errs = check_fields(fields)
        if errs:
            print(f"  FAIL  {sid}: bad review — {'; '.join(errs)}")
            failed += 1
            continue

        # Record the sha as the entry's current HEAD too. refresh_signals.py does
        # this weekly, but a brand-new scouted entry has never been through it —
        # without this, a fresh review would sit unverifiable until the next run.
        s.setdefault("signals", {})["head_sha"] = head_sha
        s["signals"]["head_checked"] = TODAY

        s["review"] = {
            "does": fields["does"].strip(),
            "touches": fields["touches"],
            "undo": fields["undo"].strip(),
            "scope": scope_line(files, nskipped, ntrunc, used),
            "limits": fields["limits"].strip(),
            "reviewed_at": TODAY,
            "reviewer": REVIEWER_ID,
            "source_sha": head_sha,
        }
        s.pop("review_stale", None)   # superseded by a current review
        s["status"] = "reviewed"
        s["next"] = "Queued for a full grading run (installed + probed)."

        c = cost(in_tok, out_tok)
        spent += c
        done += 1
        print(f"  ok    [{n}/{total}] {sid}: {len(files)} files @ {head_sha[:8]} · "
              f"{in_tok:,} in / {out_tok:,} out · ${c:.3f} · "
              f"touches={','.join(fields['touches'])}")

    if args.backend == "echo":
        print(f"\nESTIMATE for {done} entr(y|ies): ${spent:.2f} "
              f"(at ${PRICE_IN_PER_MTOK}/${PRICE_OUT_PER_MTOK} per Mtok, "
              f"~900 output tokens each)")
        if spent > args.max_cost:
            print(f"✗ estimate exceeds the ${args.max_cost:.2f} budget — "
                  f"raise --max-cost deliberately or run in batches with --limit")
            return 1
        print("nothing written (echo backend)")
        return 0

    if args.dump_prompts:
        print(f"\ndumped {done} prompt file(s) to {args.dump_prompts} — nothing written "
              f"to {DATA.name}. Answer each, then run scripts/ingest_reviews.py")
        return 0

    DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    n_reviewed = sum(1 for s in data["skills"] if s.get("status") == "reviewed")
    print(f"\nreviewed {done} · already-current {skipped_current} · "
          f"failed {failed} · unreviewable {missed}")
    print(f"TOTAL COST ${spent:.4f}")
    print(f"REVIEWED_COUNT={n_reviewed} of {len(data['skills'])} published entries")
    if stopped_for_budget:
        print(f"BUDGET STOP — did not review: {', '.join(stopped_for_budget)} "
              f"(and any after it). Re-run to continue.")
    print(f"wrote {DATA} — now run: python3 scripts/validate_index.py")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
