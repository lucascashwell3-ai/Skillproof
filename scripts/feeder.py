#!/usr/bin/env python3
"""Skillproof feeder — keeps the short list of proven single skills current.

One flat list of single skill folders (tiers nuked 2026-08-21; short list
2026-09-27). No review stage, no model calls. Every entry is ONE skill's
folder on GitHub — never a whole repo, pack, app, or link page.

Stages:
  usage   - install counts per skill from skills.sh (its leaderboard page and
            its public search API). Unreachable -> no usage this run: nothing
            is admitted on installs, and listed counts are kept as they are.
  feed    - skill-level sources, never whole repos, and only what is NEW
            since the list was chosen by hand (grading/feeder_seen.json holds
            every folder already judged, with its verdict):
              * proven authors (feeder_sources.json "authors"): every SKILL.md
                folder inside the original repos they own, so a new skill in a
                known repo is noticed the day it shows up;
              * the skills.sh leaderboard: the most-installed skills anywhere;
              * GitHub topic search: repos that ARE one skill (a single SKILL.md).
            Deduped against the list by folder and by skill name (never a twin),
            against quarantine and the skip list.
  check   - the one bar, the same for every entry:
              real use     installs >= MIN_INSTALLS, or >= MIN_INSTALLS_AUTHOR
                           for a proven author, or >= MIN_SINGLE_STARS stars on
                           a repo that holds just this one skill;
              an original  the source repo has >= MIN_REPO_STARS stars (copies
                           riding a popular name don't);
              for anyone   not tied to one vendor's product or a paid media
                           service (VENDOR), not on the skip list;
              basics       open license, pushed within 12 months, not archived
                           or a fork;
              malice scan  of exactly the folders it installs. Red flag ->
                           quarantine, never listed.
            At most MAX_NEW admitted per run (most-installed first), never
            past MAX_LIST entries — a short list, not a pile.
  refresh - every listed entry: stars/forks/pushed from its repo, installs
            from skills.sh, and the folder's latest commit; if the folder
            changed, re-scan it. Flag -> pulled to quarantine. API miss, clone
            failure or timeout -> kept exactly as it was, retried next run.
            Hand-written text (summary, line) is never overwritten.
  recheck - quarantined single-skill entries re-scanned on current code;
            clean -> re-admitted. Whole-repo entries parked by the old catalog
            stay parked: whole packs are not list entries.
  publish - write docs/data/skills.json + grading/quarantine.json +
            grading/feeder_seen.json, then run
            validate_index.py as the honesty gate. Gate failure = exit
            nonzero, nothing published.
  Every candidate and entry is handled in isolation: one bad repo never kills
  the run.

Usage:
  python3 scripts/feeder.py --dry-run
  GH_TOKEN=$(gh auth token) python3 scripts/feeder.py
  python3 scripts/feeder.py --baseline   # record every folder visible now as judged

Requires: `gh` CLI authenticated (or GH_TOKEN env var), stdlib only otherwise.
"""
import argparse
import base64
import hashlib
import json
import re
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from quarantine import load_quarantine, save_quarantine  # noqa: E402
from safety_skim import scan_repo  # noqa: E402
from scout_scrape import kebab, months_since  # noqa: E402

DATA = ROOT.parent / "docs" / "data" / "skills.json"
SOURCES = ROOT / "feeder_sources.json"
SEEN = ROOT.parent / "grading" / "feeder_seen.json"
TODAY = date.today().isoformat()
SKILLS_SH = "https://skills.sh"
LEADERBOARD = "https://www.skills.sh/"   # the bare domain answers with a 308 to here

TOPIC_QUERIES = [
    "topic:claude-skills",
    "topic:claude-code-skills",
    "topic:agent-skills",
    "topic:anthropic-skills",
]

MIN_INSTALLS = 200_000        # proven by use alone, any author
MIN_INSTALLS_AUTHOR = 20_000  # a proven author's skill, with real use behind it
MIN_SINGLE_STARS = 5_000      # a repo that is one skill: its stars are that skill's
MIN_REPO_STARS = 1_000        # the source is an original, not a copy of one
MAX_AGE_MONTHS = 12
MAX_NEW = 1                   # per run
MAX_LIST = 30                 # a short list: past this, new skills wait
WAIT_DAYS = 90                # a new skill gets this long to show real use
USAGE_LOOKUPS = 200           # skills.sh API calls per run, beyond the leaderboard

# Skills tied to one vendor's product, platform or paid media service help the
# people on that product, not a normal AI user. Matched on name + description.
VENDOR = re.compile(
    r"\b(lark|feishu|azure|entra|kusto|microsoft|aws|gcp|google[- ]cloud|firebase|supabase|"
    r"vercel|next\.?js|nuxt|expo|react[- ]native|flutter|swift(ui)?|android|ios|unity|unreal|"
    r"shopify|salesforce|hubspot|stripe|notion|slack|jira|linear|figma|obsidian|"
    r"twitter|reddit|tiktok|instagram|youtube|linkedin|telegram|wechat|"
    r"kubernetes|terraform|docker|remotion|hyperframes|heygen|higgsfield|runcomfy|comfy|"
    r"kling|seedance|flux|nano[- ]banana|wan-\d|lipsync|face[- ]swap|avatar|"
    r"(image|video|music|audio|speech)[- ](generation|edit|to-video)|in-?painting|out-?painting|"
    r"crypto|trading|polymarket|seo|google|gemini|openai|claude[- ]api|anthropic[- ]api|sdk)\b", re.I)
# A skill named for a command-line tool ("orca-cli", "google-agents-cli-deploy")
# teaches that one tool.
TOOL_NAME = re.compile(r"(^|-)(cli|api|sdk|mcp)(-|$)", re.I)


def gh(path):
    r = subprocess.run(["gh", "api", path], capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        return None
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        return None


def http_get(url, timeout=30):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "skillproof-feeder"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read().decode("utf-8", "replace")
    except Exception:
        return None


def load_sources():
    if SOURCES.exists():
        d = json.loads(SOURCES.read_text())
        return d.get("authors", []), d.get("skip", {})
    return [], {}


def seen_key(path):
    """Seen-record keys are short hashes of "owner/repo/folder" (and of
    "owner/repo/skill-name"), not the names themselves: the record is state
    for this job, and a thousand third-party folder names don't belong in the
    repo's text."""
    return hashlib.sha1(path.lower().encode("utf-8")).hexdigest()[:16]


def load_seen():
    """Every skill folder the feeder has already judged: {seen_key(folder):
    {"first_seen": date, "verdict": str}}. The short list was chosen by hand
    on 2026-09-27; everything visible that day was recorded here as judged, so
    the feeder only ever acts on what is NEW since — a new folder from a
    proven author, or a skill that newly crosses the install bar. "waiting"
    (not enough use yet) stays open for WAIT_DAYS, then closes."""
    if SEEN.exists():
        return json.loads(SEEN.read_text()).get("folders", {})
    return {}


def save_seen(seen):
    SEEN.parent.mkdir(parents=True, exist_ok=True)
    SEEN.write_text(json.dumps({
        "_comment": "Skill folders the feeder has judged, with the verdict. Written by "
                    "scripts/feeder.py; see load_seen().",
        "folders": dict(sorted(seen.items())),
    }, indent=1, ensure_ascii=False) + "\n")


def days_since(iso):
    try:
        return (date.today() - date.fromisoformat(iso)).days
    except (TypeError, ValueError):
        return 0


# ---------------------------------------------------------------- usage stage
LEADER_ROW = re.compile(
    r'\{"source":"([^"]+)","skillId":"([^"]+)","name":"[^"]*","installs":(\d+)')


def fetch_leaderboard():
    """{"owner/repo/skill": installs} off the skills.sh home page. Empty when the
    page is unreachable or its shape changed — never a guess."""
    page = http_get(LEADERBOARD)
    if not page:
        return {}
    rows = LEADER_ROW.findall(page.replace('\\"', '"'))
    return {f"{src}/{sid}".lower(): int(n) for src, sid, n in rows if "/" in src}


class Usage:
    """Install counts: the leaderboard first, then a capped number of exact
    lookups through the skills.sh search API."""

    def __init__(self, board, budget=USAGE_LOOKUPS):
        self.board, self.budget, self.cache = board, budget, {}

    def installs(self, repo, name):
        key = f"{repo}/{name}".lower()
        if key in self.board:
            return self.board[key]
        if key in self.cache:
            return self.cache[key]
        if self.budget <= 0:
            return None
        self.budget -= 1
        q = urllib.parse.urlencode({"q": name, "owner": repo.split("/")[0], "limit": 50})
        body = http_get(f"{SKILLS_SH}/api/search?{q}")
        n = None
        try:
            for s in json.loads(body or "{}").get("skills") or []:
                if str(s.get("id", "")).lower() == key:
                    n = int(s.get("installs") or 0)
                    break
        except (ValueError, TypeError):
            n = None
        self.cache[key] = n
        return n


# ----------------------------------------------------------- skill folders
FRONT = re.compile(r"^---\s*\n(.*?)\n---", re.S)


def frontmatter(text):
    """name / description / disable-model-invocation / license from a SKILL.md
    header. Folded (`>`) and literal (`|`) descriptions are joined to one line."""
    m = FRONT.match(text or "")
    out = {}
    if not m:
        return out
    key, buf = None, []
    for line in m.group(1).splitlines():
        top = re.match(r"^([A-Za-z_-]+):\s*(.*)$", line)
        if top and not line.startswith(" "):
            if key:
                out[key] = " ".join(buf).strip()
            key, val = top.group(1).lower(), top.group(2).strip()
            buf = [] if val in (">", "|", ">-", "|-") else [val.strip("'\"")]
        elif key:
            buf.append(line.strip())
    if key:
        out[key] = " ".join(buf).strip()
    return out


def skill_folders(tree):
    """Installable SKILL.md folders in a repo tree ('' = the repo root). A
    SKILL.md inside a dot-folder (.claude/skills/, .openclaw/skills/) is the
    repo's own tooling or a mirror, not an installable skill."""
    out = []
    for item in (tree or {}).get("tree", []):
        path = item.get("path", "")
        if path == "SKILL.md" or path.endswith("/SKILL.md"):
            parts = path.split("/")[:-1]
            if any(p.startswith(".") for p in parts):
                continue
            out.append("/".join(parts))
    return out


def read_skill(full_name, branch, folder):
    path = f"{folder}/SKILL.md" if folder else "SKILL.md"
    c = gh(f"repos/{full_name}/contents/{urllib.parse.quote(path)}?ref={branch}")
    if not c or "content" not in c:
        return None
    try:
        return base64.b64decode(c["content"]).decode("utf-8", "replace")
    except Exception:
        return None


def candidate(repo, folder, tree=None):
    """A skill folder in `repo`, with its header read. None if unreadable."""
    branch = repo.get("default_branch") or "main"
    text = read_skill(repo["full_name"], branch, folder)
    if text is None:
        return None
    fm = frontmatter(text)
    name = fm.get("name") or (folder.split("/")[-1] if folder else repo["name"])
    files = []
    if tree:
        prefix = f"{folder}/" if folder else ""
        files = [i["path"] for i in tree.get("tree", [])
                 if i.get("type") == "blob" and i["path"].startswith(prefix)]
    return {"repo": repo, "folder": folder, "name": name, "fm": fm, "files": files,
            "single": bool(tree) and len(skill_folders(tree)) == 1}


# ---------------------------------------------------------------- feed stage
def listed_keys(data):
    folders, names = set(), set()
    for s in data["skills"]:
        src = s.get("source") or {}
        folders.add(f"{src.get('repo', '')}/{src.get('path', '')}".lower())
        names.add(str(s.get("name", "")).lower())
    return folders, names


def quarantined_keys(q):
    keys = set()
    for e in q.get("entries", []):
        src = e.get("source")
        if src:
            keys.add(f"{src.get('repo', '')}/{src.get('path', '')}".lower())
        else:
            keys.add(re.sub(r"^https://github\.com/", "", e.get("repo_url", "")).lower().rstrip("/") + "/")
    return keys


def repo_tree(full_name, branch):
    t = gh(f"repos/{full_name}/git/trees/{branch}?recursive=1")
    return None if (not t or t.get("truncated")) else t


def feed(data, q, authors, skip, usage, seen=None, baseline=False):
    """Skill-level candidates, deduped, cheapest filters first: a folder's name,
    the skip list, quarantine and install counts are checked BEFORE its
    SKILL.md is fetched, so a run reads a handful of files, not a thousand.
    Folders already judged (`seen`) are passed over; with `baseline=True`
    every folder visible now is recorded as judged and nothing is admitted.
    Returns (candidates, dropped)."""
    seen = {} if seen is None else seen
    have_folders, have_names = listed_keys(data)
    parked = quarantined_keys(q)
    skip_keys = {k.lower(): v for k, v in skip.items() if not k.startswith("_")}
    authors_l = {a.lower() for a in authors}
    found, dropped, walked, repos = {}, [], set(), {}
    have_names_by_repo = {}
    for s_ in data["skills"]:
        r_ = str((s_.get("source") or {}).get("repo", "")).lower()
        have_names_by_repo.setdefault(r_, set()).add(str(s_.get("name", "")).lower())

    def verdict(key, skey, reason, final=True):
        dropped.append((skey, reason))
        rec = seen.setdefault(seen_key(key), {"first_seen": TODAY})
        rec["verdict"] = reason if final else "waiting"
        seen[seen_key(skey)] = rec

    def consider(repo, folder, tree, route):
        full = repo["full_name"]
        key = f"{full}/{folder}".lower()
        if key in walked or key in have_folders:
            return
        walked.add(key)
        guess = (folder.split("/")[-1] if folder else repo["name"]).lower()
        skey = f"{full}/{guess}".lower()
        if baseline:
            rec = seen.setdefault(seen_key(key), {"first_seen": TODAY,
                                                  "verdict": "already there when the list was chosen by hand"})
            seen.setdefault(seen_key(skey), rec)
            return
        rec = seen.get(seen_key(key))
        if rec and rec.get("verdict") != "waiting":
            return
        if rec and days_since(rec.get("first_seen")) > WAIT_DAYS:
            rec["verdict"] = f"no real use within {WAIT_DAYS} days"
            return
        if guess in have_names:
            return verdict(key, skey, "a skill with this name is already listed (no twins)")
        part_of = next((n for n in have_names_by_repo.get(full.lower(), ()) if guess.startswith(n + "-")), None)
        if part_of:
            return verdict(key, skey, f"part of {part_of}, which is already listed")
        if skey in skip_keys:
            return verdict(key, skey, f"skip list: {skip_keys[skey]}")
        if key in parked or f"{full}/".lower() in parked:
            return verdict(key, skey, "quarantined")
        if VENDOR.search(guess.replace("-", " ")) or TOOL_NAME.search(guess):
            return verdict(key, skey, "tied to one vendor's product or a paid service")
        n = usage.installs(full, guess)
        if route == "single":
            enough = repo.get("stargazers_count", 0) >= MIN_SINGLE_STARS
        elif route == "author":
            enough = bool(n and n >= MIN_INSTALLS_AUTHOR)
        else:
            enough = bool(n and n >= MIN_INSTALLS)
        if not enough:
            return verdict(key, skey, "not enough real use yet", final=False)
        c = candidate(repo, folder, tree)
        if c is None:
            return verdict(key, skey, "SKILL.md unreadable", final=False)
        real = f"{full}/{c['name']}".lower()
        if c["name"].lower() in have_names:
            return verdict(key, real, "a skill with this name is already listed (no twins)")
        if real in skip_keys:
            return verdict(key, real, f"skip list: {skip_keys[real]}")
        c["installs"], c["route"], c["key"] = n, route, key
        found[key] = c

    def get_repo(full):
        if full not in repos:
            repos[full] = gh(f"repos/{full}")
        return repos[full]

    # proven authors: every skill folder in the original repos they own
    for owner in authors:
        for repo in gh(f"users/{owner}/repos?per_page=100&sort=pushed") or []:
            if repo.get("fork") or repo.get("archived"):
                continue
            if repo.get("stargazers_count", 0) < MIN_REPO_STARS:
                continue
            tree = repo_tree(repo["full_name"], repo.get("default_branch") or "main")
            for folder in skill_folders(tree):
                consider(repo, folder, tree, "author")

    # the leaderboard: most-installed skills anywhere (GitHub sources only)
    for key, n in sorted(usage.board.items(), key=lambda kv: -kv[1]):
        if n < MIN_INSTALLS:
            break
        full, _, sid = key.rpartition("/")
        if full.split("/")[0] in authors_l:
            continue  # already walked above, folder by folder
        if key in skip_keys or sid in have_names:
            continue
        judged = seen.get(seen_key(key))
        if not baseline and judged and judged.get("verdict") != "waiting":
            continue  # judged before (recorded under its name, too)
        repo = get_repo(full)
        if not repo:
            continue
        tree = repo_tree(repo["full_name"], repo.get("default_branch") or "main")
        folders = [f for f in skill_folders(tree)
                   if (f.split("/")[-1] if f else repo["name"]).lower() == sid]
        if not folders:
            dropped.append((key, "skill folder not found in its repo"))
            continue
        consider(repo, folders[0], tree, "leaderboard")

    # topic search: repos that ARE one skill — its SKILL.md at the root, or in
    # a folder named after the repo. A product that merely ships a SKILL.md for
    # its own tooling is not a skill.
    for q_str in TOPIC_QUERIES:
        res = gh(f"search/repositories?q={q_str}&sort=stars&order=desc&per_page=30")
        for repo in (res or {}).get("items") or []:
            if repo.get("stargazers_count", 0) < MIN_SINGLE_STARS:
                continue
            tree = repo_tree(repo["full_name"], repo.get("default_branch") or "main")
            folders = skill_folders(tree)
            if len(folders) == 1 and (folders[0] == "" or
                                      folders[0].split("/")[-1].lower() == repo["name"].lower()):
                consider(repo, folders[0], tree, "single")
    return list(found.values()), dropped


# --------------------------------------------------------------- check stage
def license_of(c):
    spdx = ((c["repo"].get("license") or {}).get("spdx_id") or "")
    if spdx and spdx != "NOASSERTION":
        return spdx
    lic = c["fm"].get("license", "")
    return lic if re.match(r"^(MIT|Apache|BSD|ISC|MPL|CC)", lic, re.I) else None


def passes_bar(c):
    """(ok, reason) — the rest of the one bar, once real use is established in
    feed(): an original source, not tied to one vendor, open license, fresh."""
    repo = c["repo"]
    if repo.get("archived") or repo.get("fork"):
        return False, "archived/fork"
    if not license_of(c):
        return False, "no open license"
    try:
        if months_since(repo["pushed_at"]) > MAX_AGE_MONTHS:
            return False, f"no push in > {MAX_AGE_MONTHS} months"
    except Exception:
        return False, "bad pushed_at"
    if repo.get("stargazers_count", 0) < MIN_REPO_STARS:
        return False, f"source repo under {MIN_REPO_STARS:,} stars (not an original)"
    if VENDOR.search(f"{c['name']} {c['fm'].get('description', '')}") or TOOL_NAME.search(c["name"]):
        return False, "tied to one vendor's product or a paid service"
    return True, "ok"


def first_sentence(text, limit=160):
    text = re.sub(r"\s+", " ", text or "").strip()
    text = re.split(r"(?<=[.!?])\s|\s(?:Use (?:when|this|for|on)\b)", text)[0].strip()
    if len(text) > limit:
        text = text[:limit - 1].rsplit(" ", 1)[0] + "…"
    return text


PAIN_RULES = [
    (r"design|frontend|front-end|\bui\b|\bux\b|css|tailwind|landing|animation", "generic-frontend"),
    (r"\btest|tdd|verif", "testing-discipline"),
    (r"memory|context|session|token|compact|handoff", "context-bloat"),
    (r"\bplan|spec\b|decision|grill", "planning-drift"),
    (r"debug|diagnos|\bbug", "debugging-loops"),
    (r"refactor|lint|code review|code quality|simplif|architect", "code-quality"),
    (r"\bprose\b|copywrit|marketing copy|\bemail|\bessay|\bblog|humani[sz]", "ai-sounding"),
    (r"teach|learn|tutor|lesson", "learning"),
    (r"concise|terse|brief|shorter|verbose", "buried-answers"),
]
CAT_RULES = [
    (r"design|frontend|\bui\b|css|animation", "frontend"),
    (r"\btest|tdd|verif", "testing"),
    (r"\bprose\b|copywrit|marketing copy|\bemail|\bessay|\bblog|humani[sz]", "writing"),
    (r"teach|learn|tutor", "learning"),
    (r"research|search", "research"),
    (r"memory|context|token|handoff", "context"),
    (r"\bplan|spec\b|grill", "planning"),
    (r"\bdocs\b|documentation", "docs"),
    (r"\bgit\b|commit|\bpr\b", "git"),
]
CODE_EXT = (".py", ".js", ".mjs", ".cjs", ".ts", ".sh", ".bash", ".rb", ".go", ".ps1")
THIRD_PERSON = re.compile(
    r"^(makes|gives|turns|writes|rewrites|builds|keeps|adds|helps|shows|asks|runs|finds|checks|"
    r"reviews|creates|generates|explains|teaches|scans|cuts|stops|forces|pushes|lets|guides|"
    r"plans|drafts|tests|fixes|audits|summari[sz]es|compacts|grills)\b", re.I)


def make_line(name, calls, summary):
    """The one line Skillproof shows in the plan and at install, built from the
    skill's own description. None when no clear line comes out of it (empty,
    too long, or it would need a bare "it") — such a skill is not admitted."""
    s = (summary or "").strip().rstrip(".").strip()
    if not s or s.lower() == name.lower():
        return None
    low = s[0].lower() + s[1:]
    if calls == "you":
        line = f"Type /{name}: {s}." if THIRD_PERSON.match(s) else f"Type /{name} to {low}."
    else:
        line = f"{s}." if THIRD_PERSON.match(s) else f"Your AI uses {name} when needed: {s}."
    # the same bar validate_index.py holds every line to
    if re.search(r"\bit\b", line, re.I) or len(line) > 160 or len(line.split()) < 6:
        return None
    return line


def to_entry(c, installs, pain_ids):
    """A new short-list entry, every field from the source or an API response.
    `line` is built from the skill's own description (make_line); None means
    no clear line, and check() leaves the skill out."""
    repo, folder, name = c["repo"], c["folder"], c["name"]
    full, branch = repo["full_name"], repo.get("default_branch") or "main"
    desc = c["fm"].get("description", "")
    text = f"{name} {desc}".lower()
    cat = next((k for pat, k in CAT_RULES if re.search(pat, text)), "workflow")
    pains = [p for pat, p in PAIN_RULES if re.search(pat, text) and p in pain_ids][:3]
    for_ = {"frontend": "design", "writing": "writing"}.get(cat, "coding")
    needs = [] if for_ in ("design", "writing") else ["files"]
    if any(f.endswith(CODE_EXT) for f in c["files"]):
        needs = sorted(set(needs) | {"files", "scripts"})
    calls = "you" if str(c["fm"].get("disable-model-invocation", "")).lower() == "true" else "auto"
    summary = first_sentence(desc) or name
    line = make_line(name, calls, summary)
    dest = "~/.claude/skills/"
    cmd = (f"d=$(mktemp -d) && git clone --depth 1 -q https://github.com/{full} \"$d\" && "
           f"mkdir -p {dest} && cp -R \"$d/{folder}\" {dest}") if folder else \
          f"git clone --depth 1 -q https://github.com/{full} {dest}{name}"
    entry = {
        "id": kebab(name),
        "name": name,
        "repo_url": f"https://github.com/{full}" + (f"/tree/{branch}/{folder}" if folder else ""),
        "author": repo["owner"]["login"],
        "category": cat,
        "summary": summary,
        "line": line,
        "calls": calls,
        "for": for_,
        "needs": needs,
        "pain_points": pains,
        "source": {"repo": full, "branch": branch, "path": folder},
        "install": {"command": cmd,
                    "notes": "Claude Code folder shown. Codex: ~/.agents/skills/ · Cursor: "
                             "~/.cursor/skills/ · Gemini CLI: ~/.gemini/skills/ · Copilot: "
                             "~/.copilot/skills/. Loads in a new session."},
        "signals": {"stars": repo["stargazers_count"], "forks": repo.get("forks_count", 0),
                    "checked": TODAY},
        "pushed": repo["pushed_at"][:10],
    }
    if installs:
        entry["signals"]["installs"] = installs
        entry["signals"]["installs_source"] = "skills.sh"
    lic = license_of(c)
    if lic:
        entry["license"] = lic
    return entry


def entry_paths(e):
    src = e.get("source") or {}
    paths = [src.get("path", "")] + list(src.get("with") or [])
    return [p for p in paths if p] or None


def rescan(url, paths=None):
    """Malice scan on the CURRENT code of exactly `paths` (the folders the entry
    installs). Returns (status, result): "clean" | "flagged" | "error". An error
    is an infrastructure problem (clone failed, timeout, folder gone), never a
    verdict on the skill."""
    with tempfile.TemporaryDirectory() as tmp:
        try:
            result = scan_repo(url, tmp, paths)
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


def check(cands, data, scan_new, seen=None):
    """Apply the rest of the bar, most-installed first; admit at most MAX_NEW
    and never past MAX_LIST. Every final outcome is recorded in `seen`.
    Returns (kept, dropped, quarantined_new)."""
    seen = {} if seen is None else seen
    pain_ids = {p["id"] for p in data.get("pain_points", [])}
    kept, dropped, quarantined_new, passed = [], [], [], []

    def record(c, verdict_text):
        key = c.get("key") or f"{c['repo']['full_name']}/{c['folder']}".lower()
        rec = seen.setdefault(seen_key(key), {"first_seen": TODAY})
        rec["verdict"] = verdict_text
        seen[seen_key(f"{c['repo']['full_name']}/{c['name']}")] = rec

    def verdict(c, reason, final=True):
        dropped.append((f"{c['repo']['full_name']}/{c['name']}", reason))
        record(c, reason if final else "waiting")

    for c in cands:
        ok, reason = passes_bar(c)
        if not ok:
            verdict(c, reason)
        else:
            passed.append((c.get("installs") or 0, c))
    passed.sort(key=lambda t: -t[0])
    room = max(0, MAX_LIST - len(data["skills"]))
    for n, c in passed:
        if len(kept) >= min(MAX_NEW, room):
            verdict(c, "waiting — this run's slot is taken" if room
                    else f"waiting — the list is full ({MAX_LIST})", final=False)
            continue
        entry = to_entry(c, n or None, pain_ids)
        if not entry["line"]:
            verdict(c, "no clear one-line description")
            continue
        if scan_new:
            status, result = rescan(f"https://github.com/{c['repo']['full_name']}", entry_paths(entry))
            if status == "error":
                verdict(c, "scan failed (retried next run)", final=False)
                continue
            if status == "flagged":
                quarantined_new.append(dict(entry, quarantined_on=TODAY, skim=skim_record(result)))
                verdict(c, f"quarantined: {sorted(result['reds'])}")
                continue
            entry["checked"] = {"date": TODAY, "files_scanned": result["files_scanned"]}
            commits = gh(f"repos/{entry['source']['repo']}/commits?per_page=1"
                         + (f"&path={urllib.parse.quote(c['folder'])}" if c["folder"] else ""))
            if commits:
                entry["signals"]["head_sha"] = commits[0]["sha"]
                entry["signals"]["head_checked"] = TODAY
        kept.append(entry)
        record(c, "listed")
    return kept, dropped, quarantined_new


# ------------------------------------------------------------- refresh stage
REFRESH_PER_RUN = 60  # ~3 API calls each; well inside GitHub's hourly limit


def refresh_existing(data, usage=None, do_rescan=True, budget=REFRESH_PER_RUN):
    """Refresh listed entries from the APIs, and re-scan the ones whose folder
    moved since we last scanned. An entry only leaves the list when the scan
    finds a red flag in its current code. API misses, clone failures and
    timeouts keep the entry exactly as it was (retried next run). Hand-written
    text is never touched. Rotating slice: the `budget` entries with the
    oldest `signals.checked` go first."""
    refreshed, rescanned, quarantined = 0, 0, []
    kept = []
    order = sorted(range(len(data["skills"])),
                   key=lambda i: (data["skills"][i].get("signals") or {}).get("checked") or "")
    due = set(order[:budget])
    for i, s in enumerate(data["skills"]):
        if i not in due:
            kept.append(s)
            continue
        try:
            src = s.get("source") or {}
            full = src.get("repo")
            repo = gh(f"repos/{full}") if full else None
            if not repo:
                kept.append(s)
                continue
            sig = s.setdefault("signals", {})
            sig["stars"] = repo["stargazers_count"]
            sig["forks"] = repo["forks_count"]
            sig["checked"] = TODAY
            if repo.get("pushed_at"):
                s["pushed"] = repo["pushed_at"][:10]
            if usage is not None:
                n = usage.installs(full, s.get("name", ""))
                if n:
                    sig["installs"] = n
                    sig["installs_source"] = "skills.sh"
            refreshed += 1

            path = src.get("path") or ""
            commits = gh(f"repos/{full}/commits?per_page=1"
                         + (f"&path={urllib.parse.quote(path)}" if path else ""))
            new_sha = commits[0]["sha"] if commits else None
            old_sha = sig.get("head_sha")
            if new_sha:
                sig["head_sha"] = new_sha
                sig["head_checked"] = TODAY
            moved = bool(new_sha and old_sha and new_sha != old_sha)
            never_scanned = "checked" not in s
            if do_rescan and (moved or never_scanned):
                status, result = rescan(f"https://github.com/{full}", entry_paths(s))
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


def recheck_quarantine(q, data):
    """Re-scan every quarantined single-skill entry on its current code. Clean
    -> back on the list with its fields intact. Still flagged -> stays, with the
    skim record updated. Error -> stays, retried next run. A `hold: true` entry
    is never re-admitted automatically. Whole-repo entries (no `source`) from
    the old catalog are never re-admitted: whole packs are not list entries."""
    readmitted, still = [], []
    have_folders, have_names = listed_keys(data)
    for e in q.get("entries", []):
        try:
            src = e.get("source")
            if e.get("hold") or not src:
                still.append(e)
                continue
            key = f"{src.get('repo', '')}/{src.get('path', '')}".lower()
            if key in have_folders or str(e.get("name", "")).lower() in have_names \
                    or len(data["skills"]) >= MAX_LIST:
                still.append(e)
                continue
            status, result = rescan(f"https://github.com/{src['repo']}", entry_paths(e))
            if status != "clean":
                if status == "flagged":
                    e["skim"] = skim_record(result)
                still.append(e)
                continue
            entry = {k: v for k, v in e.items() if k not in ("quarantined_on", "skim", "hold")}
            entry["checked"] = {"date": TODAY, "files_scanned": result["files_scanned"]}
            data["skills"].append(entry)
            have_folders.add(key)
            readmitted.append(entry)
            print(f"  re-admitted from quarantine (clean on current code): {entry.get('name')}")
        except Exception as ex:  # noqa: BLE001
            print(f"  recheck error on {e.get('id')}: {ex} — left in quarantine")
            still.append(e)
    q["entries"] = still
    return readmitted


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--no-signal-refresh", action="store_true")
    ap.add_argument("--baseline", action="store_true",
                    help="record every skill folder visible now as judged; admit nothing")
    args = ap.parse_args()

    authors, skip = load_sources()
    verified = [a for a in authors if gh(f"users/{a}") is not None]
    for missing in sorted(set(authors) - set(verified)):
        print(f"  author dropped (not found via API): {missing}")

    data = json.loads(DATA.read_text())
    q = load_quarantine()
    seen = load_seen()
    board = fetch_leaderboard()
    usage = Usage(board)
    print(f"usage: {len(board)} skills with install counts from skills.sh"
          + ("" if board else " — unreachable; nothing admitted on installs this run"))

    if args.baseline:
        before = len(seen)
        feed(data, q, verified, skip, usage, seen=seen, baseline=True)
        save_seen(seen)
        print(f"baseline: {len(seen) - before} folder(s) recorded as judged ({len(seen)} total)")
        return 0
    judged = sum(1 for v in seen.values() if v.get("verdict") != "waiting")
    print(f"seen: {judged} record(s) of skill folders already judged (by folder and by name), "
          f"{len(seen) - judged} still waiting for real use")

    cands, feed_dropped = feed(data, q, verified, skip, usage, seen=seen)
    print(f"feed: {len(cands)} new skill folder(s) with real use, from {len(verified)} proven "
          f"authors, the leaderboard and topic search ({len(feed_dropped)} new ones not ready)")

    kept, dropped, quarantined_new = check(cands, data, scan_new=not args.dry_run, seen=seen)
    dropped = feed_dropped + dropped
    print(f"check: {len(kept)} cleared the bar and fit, {len(dropped)} not added")
    # dropped-with-reason counts: one line per distinct reason, "<count> <reason>",
    # highest count first — the format automation/jobs/feeder/README.md documents.
    reason_counts = {}
    for _, reason in dropped:
        reason = re.sub(r"^skip list: .*", "skip list", reason)
        reason_counts[reason] = reason_counts.get(reason, 0) + 1
    for reason, n in sorted(reason_counts.items(), key=lambda kv: -kv[1]):
        print(f"  not added: {n} {reason}")
    waiting = [t for t, r in dropped if r.startswith("waiting")]
    if waiting:
        print(f"  next in line: {', '.join(waiting[:10])}")

    verb = "would add" if args.dry_run else "adding"
    print(f"\n{verb} {len(kept)} entr{'y' if len(kept) == 1 else 'ies'}:")
    for e in kept:
        n = e["signals"].get("installs")
        print(f"  + {e['name']}  ({e['source']['repo']})  "
              f"{f'{n:,} installs' if n else ''} ★{e['signals']['stars']:,}  [{e['for']}]")

    if args.dry_run:
        print(f"\nDRY RUN — nothing written. List stays at {len(data['skills'])}; "
              f"{len(kept)} would be added.")
        return 0

    refreshed, rescanned, pulled = 0, 0, []
    if not args.no_signal_refresh:
        refreshed, rescanned, pulled = refresh_existing(data, usage)
    readmitted = recheck_quarantine(q, data)

    data["skills"].extend(kept)
    data["as_of"] = TODAY

    ids = {e["id"] for e in quarantined_new + pulled}
    q["entries"] = [e for e in q.get("entries", []) if e["id"] not in ids] + quarantined_new + pulled
    save_quarantine(q)
    save_seen(seen)
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
