#!/usr/bin/env python3
"""Skillproof feeder — v1 job 2 (automation/PIPELINE_V1.md).

Runs the full feed -> check -> publish stack in one deterministic script, no
review stage, no model calls. One flat catalog (tiers nuked 2026-08-21): the
only safety gate is the malice scan; pass = published as a full entry.

Stages:
  feed    - GitHub topic search + named-creator seeds (scripts/feeder_sources.json),
            deduped against docs/data/skills.json by repo URL, capped at --cap new.
  check   - drop if quarantined, < min-stars (unless owner is a named source),
            stale (> 12 months since last push), archived, a fork, or has no OSS
            license. Survivors get the safety_skim.scan_repo() malice scan;
            a red flag quarantines instead of listing.
  refresh - every listed entry: stars/forks/pushed/summary from the API; if
            the repo's code moved since we last scanned it, re-run the malice
            scan on the current code. Flag in code -> quarantined; scan
            error/timeout -> entry kept as-is, retried next run. Growth-only:
            nothing leaves the catalog for any reason but malice.
  recheck - every quarantined repo is re-scanned on its current code; clean
            -> re-admitted (a flag that was only ever in docs never sticks).
  publish - write docs/data/skills.json + grading/quarantine.json, then run
            validate_index.py as the honesty gate. Gate failure = exit
            nonzero, nothing written.
  Every repo is handled in isolation: one bad repo never kills the run.

Usage:
  python3 scripts/feeder.py --dry-run
  GH_TOKEN=$(gh auth token) python3 scripts/feeder.py

Requires: `gh` CLI authenticated (or GH_TOKEN env var), stdlib only otherwise.
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from quarantine import load_quarantine, save_quarantine  # noqa: E402
from safety_skim import scan_repo  # noqa: E402
from scout_scrape import (  # noqa: E402
    to_entry, is_library, kebab, months_since,
)

DATA = ROOT.parent / "docs" / "data" / "skills.json"
SOURCES = ROOT / "feeder_sources.json"
TODAY = date.today().isoformat()

TOPIC_QUERIES = [
    "topic:claude-skills",
    "topic:claude-code-skills",
    "topic:agent-skills",
    "topic:anthropic-skills",
]
# Repos whose authors never added a topic label are invisible to the searches
# above. These keyword sweeps catch them; the SKILL.md-evidence check downstream
# keeps non-skills out.
KEYWORD_QUERIES = [
    "claude+skill+in:name,description",
    "claude+code+skill+in:name,description",
    "agent+skills+in:name,description",
]

MAX_AGE_MONTHS = 12
MIN_STARS = 50

# A repo must show real evidence it IS a skill/skill-collection, not just an
# AI-adjacent project that happens to pass the star/license/freshness bar
# (gemini-cli, Scrapling, cherry-studio, TrendRadar, worldmonitor all did).
SKILL_TOPICS = {
    "claude-skills", "claude-code-skills", "agent-skills",
    "anthropic-skills", "claude-code-plugin", "claude-skill",
}


def gh(path):
    r = subprocess.run(["gh", "api", path], capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        return None
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        return None


def load_sources():
    if SOURCES.exists():
        return json.loads(SOURCES.read_text()).get("creators", [])
    return []


def verify_owner(login):
    """Confirm a named creator/org actually exists. Silently dropped if not."""
    return gh(f"users/{login}") is not None


# ---------------------------------------------------------------- feed stage
def feed(cap, named_owners):
    data = json.loads(DATA.read_text())
    existing_urls = {s["repo_url"].lower().rstrip("/") for s in data["skills"]}
    q = load_quarantine()
    quarantined_urls = {e["repo_url"].lower().rstrip("/") for e in q.get("entries", [])}

    candidates = {}

    # named creators: list their repos directly
    for owner in named_owners:
        repos = gh(f"users/{owner}/repos?per_page=100&sort=pushed") or []
        for repo in repos:
            candidates.setdefault(repo["full_name"].lower(), repo)

    # topic search — by stars (the established) and by recent update (the new)
    for q_str in TOPIC_QUERIES:
        for sort in ("stars", "updated"):
            res = gh(f"search/repositories?q={q_str}&sort={sort}&order=desc&per_page=30")
            for repo in (res or {}).get("items") or []:
                candidates.setdefault(repo["full_name"].lower(), repo)
    # keyword sweep for untagged repos
    for q_str in KEYWORD_QUERIES:
        res = gh(f"search/repositories?q={q_str}&sort=updated&order=desc&per_page=30")
        for repo in (res or {}).get("items") or []:
            candidates.setdefault(repo["full_name"].lower(), repo)

    fresh = []
    for repo in sorted(candidates.values(), key=lambda r: -r.get("stargazers_count", 0)):
        url = repo["html_url"].lower().rstrip("/")
        if url in existing_urls or url in quarantined_urls:
            continue
        existing_urls.add(url)
        fresh.append(repo)
        if len(fresh) >= cap:
            break
    return data, fresh


# --------------------------------------------------------------- check stage
def license_ok(repo):
    lic = (repo.get("license") or {})
    spdx = lic.get("spdx_id")
    return bool(spdx and spdx != "NOASSERTION")


def passes_baseline(repo, named_owners):
    if repo.get("archived") or repo.get("fork"):
        return False, "archived/fork"
    if not license_ok(repo):
        return False, "no OSS license"
    try:
        if months_since(repo["pushed_at"]) > MAX_AGE_MONTHS:
            return False, f"no push in > {MAX_AGE_MONTHS} months"
    except Exception:
        return False, "bad pushed_at"
    owner = repo.get("owner", {}).get("login", "")
    if repo.get("stargazers_count", 0) < MIN_STARS and owner.lower() not in {
        o.lower() for o in named_owners
    }:
        return False, f"< {MIN_STARS} stars and not a named source"
    return True, "ok"


def has_skill_topic(repo):
    topics = {t.lower() for t in (repo.get("topics") or [])}
    return bool(topics & SKILL_TOPICS)


def has_skill_md(full_name, default_branch):
    """True/False if we can tell, None if unknown (truncated tree or lookup
    failure) — an unknown result is never treated as evidence."""
    tree = gh(f"repos/{full_name}/git/trees/{default_branch}?recursive=1")
    if not tree or tree.get("truncated"):
        return None
    for item in tree.get("tree", []):
        path = item.get("path", "")
        if path == "SKILL.md" or path.endswith("/SKILL.md"):
            return True
    return False


def is_skill_evidence(repo):
    """The repo must actually contain a SKILL.md — topics alone are not evidence
    (maintainers mis-tag; 2026-08-16). A truncated/unreadable tree is 'unknown',
    which drops the candidate rather than assuming either way."""
    branch = repo.get("default_branch") or "main"
    md = has_skill_md(repo["full_name"], branch)
    if md is None:
        return False, "skill evidence unknown (tree truncated/unreadable) — skipped"
    if not md:
        return False, "no SKILL.md in repo"
    return True, "ok"


def check(repos, named_owners, skim_new):
    kept, dropped, quarantined_new = [], [], []
    for repo in repos:
        ok, reason = passes_baseline(repo, named_owners)
        if not ok:
            dropped.append((repo["full_name"], reason))
            continue
        ok, reason = is_skill_evidence(repo)
        if not ok:
            dropped.append((repo["full_name"], reason))
            continue
        entry = to_entry(repo)
        if not skim_new:
            kept.append(entry)
            continue
        status, result = rescan(entry["repo_url"])
        if status == "error":
            dropped.append((repo["full_name"], "clone failed during safety skim (retried next run)"))
            continue
        if status == "flagged":
            # quarantine entries keep the full skim record so --list shows why
            quarantined_new.append(dict(entry, quarantined_on=TODAY, skim=skim_record(result)))
            dropped.append((repo["full_name"], f"quarantined: {sorted(result['reds'])}"))
            continue
        entry["checked"] = {"date": TODAY, "files_scanned": result["files_scanned"]}
        kept.append(entry)
    return kept, dropped, quarantined_new


# ------------------------------------------------------------- refresh stage
def rescan(url):
    """Malice scan on the repo's CURRENT code. Returns (status, result) where
    status is "clean" | "flagged" | "error". An error is an infrastructure
    problem (clone failed, timeout), never a verdict on the repo."""
    with tempfile.TemporaryDirectory() as tmp:
        try:
            result = scan_repo(url, tmp)
        except Exception:
            result = None
    if result is None:
        return "error", None
    return ("flagged" if result["reds"] else "clean"), result


def skim_record(result):
    return {
        "date": TODAY,
        "files_scanned": result["files_scanned"],
        "red_flags": sorted(result["reds"]),
        "notes": sorted(result["notes"]),
    }


def refresh_existing(data, do_rescan=True):
    """Refresh every listed entry from the API, and re-scan the ones whose code
    moved since we last scanned. Growth-only: an entry only leaves the catalog
    when the scan finds a red flag in its current code. API misses, clone
    failures and timeouts keep the entry exactly as it was (retried next run).
    Each entry is isolated — an exception on one never touches the others."""
    refreshed, rescanned, quarantined = 0, 0, []
    kept = []
    for s in data["skills"]:
        try:
            m = re.match(r"https://github\.com/([^/]+/[^/]+)/?$", s.get("repo_url", ""))
            repo = gh(f"repos/{m.group(1)}") if m else None
            if not repo:
                kept.append(s)
                continue
            sig = s.setdefault("signals", {})
            sig["stars"] = repo["stargazers_count"]
            sig["forks"] = repo["forks_count"]
            sig["checked"] = TODAY
            if repo.get("pushed_at"):
                s["pushed"] = repo["pushed_at"][:10]
            desc = (repo.get("description") or "").strip()
            if desc:
                s["summary"] = desc[:220]
            refreshed += 1

            commits = gh(f"repos/{m.group(1)}/commits?per_page=1")
            new_sha = commits[0]["sha"] if commits else None
            old_sha = sig.get("head_sha")
            if new_sha:
                sig["head_sha"] = new_sha
                sig["head_checked"] = TODAY
            moved = bool(new_sha and old_sha and new_sha != old_sha)
            never_scanned = "checked" not in s
            if do_rescan and (moved or never_scanned):
                status, result = rescan(s["repo_url"])
                if status == "clean":
                    s["checked"] = {"date": TODAY, "files_scanned": result["files_scanned"]}
                    rescanned += 1
                elif status == "flagged":
                    quarantined.append(dict(s, quarantined_on=TODAY, skim=skim_record(result)))
                    print(f"  pulled to quarantine: {s['name']} {sorted(result['reds'])}")
                    continue
                # "error": keep as-is, retry next run
            kept.append(s)
        except Exception as e:  # noqa: BLE001 — isolation is the point
            print(f"  refresh error on {s.get('id')}: {e} — kept as-is")
            kept.append(s)
    data["skills"] = kept
    return refreshed, rescanned, quarantined


def recheck_quarantine(q, data, named_owners):
    """Re-scan every quarantined repo on its current code. Clean -> back into
    the catalog as a fresh flat entry (must still pass the baseline + SKILL.md
    checks). Still flagged -> stays, with the skim record updated. Error ->
    stays, retried next run. An entry a human marked `hold: true` is never
    re-admitted automatically."""
    readmitted, still = [], []
    existing = {s["repo_url"].lower().rstrip("/") for s in data["skills"]}
    for e in q.get("entries", []):
        try:
            if e.get("hold"):
                still.append(e)
                continue
            status, result = rescan(e["repo_url"])
            if status != "clean":
                if status == "flagged":
                    e["skim"] = skim_record(result)
                still.append(e)
                continue
            m = re.match(r"https://github\.com/([^/]+/[^/]+)/?$", e["repo_url"])
            repo = gh(f"repos/{m.group(1)}") if m else None
            if not repo or e["repo_url"].lower().rstrip("/") in existing:
                still.append(e)
                continue
            ok, _ = passes_baseline(repo, named_owners)
            if ok:
                ok, _ = is_skill_evidence(repo)
            if not ok:
                still.append(e)
                continue
            entry = to_entry(repo)
            entry["checked"] = {"date": TODAY, "files_scanned": result["files_scanned"]}
            commits = gh(f"repos/{m.group(1)}/commits?per_page=1")
            if commits:
                entry["signals"]["head_sha"] = commits[0]["sha"]
                entry["signals"]["head_checked"] = TODAY
            data["skills"].append(entry)
            existing.add(entry["repo_url"].lower().rstrip("/"))
            readmitted.append(entry)
            print(f"  re-admitted from quarantine (clean on current code): {entry['name']}")
        except Exception as ex:  # noqa: BLE001
            print(f"  recheck error on {e.get('id')}: {ex} — left in quarantine")
            still.append(e)
    q["entries"] = still
    return readmitted


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--cap", type=int, default=50)
    ap.add_argument("--no-signal-refresh", action="store_true")
    args = ap.parse_args()

    named = load_sources()
    verified = [o for o in named if verify_owner(o)]
    for missing in set(named) - set(verified):
        print(f"  source dropped (not found via API): {missing}")

    data, candidates = feed(args.cap, verified)
    print(f"feed: {len(candidates)} candidate repo(s) after dedupe (cap {args.cap})")

    kept, dropped, quarantined_new = check(candidates, verified, skim_new=not args.dry_run)
    print(f"check: {len(kept)} passed the bar, {len(dropped)} dropped")
    # dropped-with-reason counts: one line per distinct reason, "<count> <reason>",
    # highest count first — the format automation/jobs/feeder/README.md documents.
    reason_counts = {}
    for _, reason in dropped:
        reason_counts[reason] = reason_counts.get(reason, 0) + 1
    for reason, n in sorted(reason_counts.items(), key=lambda kv: -kv[1]):
        print(f"  dropped: {n} {reason}")

    print(f"\nwould add {len(kept)} entr{'y' if len(kept) == 1 else 'ies'}:" if args.dry_run
          else f"\nadding {len(kept)} entr{'y' if len(kept) == 1 else 'ies'}:")
    for e in kept[:10]:
        print(f"  + {e['name']}  ★{e['signals']['stars']:,}  [{e['category']}]")

    if args.dry_run:
        print(f"\nDRY RUN — nothing written. {len(candidates)} candidates found, "
              f"{len(kept)} would be added.")
        return 0

    q = load_quarantine()

    refreshed, rescanned, pulled = 0, 0, []
    if not args.no_signal_refresh:
        refreshed, rescanned, pulled = refresh_existing(data)
    readmitted = recheck_quarantine(q, data, verified)

    data["skills"].extend(kept)
    data["as_of"] = TODAY

    ids = {e["id"] for e in quarantined_new + pulled}
    q["entries"] = [e for e in q.get("entries", []) if e["id"] not in ids] + quarantined_new + pulled
    save_quarantine(q)
    DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    gate = subprocess.run([sys.executable, str(ROOT / "validate_index.py")])
    if gate.returncode != 0:
        print("honesty gate FAILED — feeder run rejected", file=sys.stderr)
        return gate.returncode

    print(f"\nfeeder: +{len(kept)} new, {len(readmitted)} re-admitted, "
          f"{len(quarantined_new) + len(pulled)} quarantined, {refreshed} refreshed, "
          f"{rescanned} re-scanned after a code change, gate passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
