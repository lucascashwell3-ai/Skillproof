#!/usr/bin/env python3
"""Scout scraper: sweep GitHub for high-quality Claude/agent skills and libraries,
emit scouted-tier entries with REAL triage receipts into docs/data/skills.json.

Honesty rules (same as the site):
- Every field comes from the GitHub API response — nothing invented.
- Entries are status "scouted": found + triaged, never installed, never graded.
- The honesty gate (scripts/validate_index.py) must pass after every run.

Sources:
- Topic searches (claude-skills, claude-code, agent-skills, ...) filtered by stars.
- A curated seed list of known creators/repos — verified via the API, silently
  dropped if the repo doesn't exist or fails the quality bar.

Usage: python3 scripts/scout_scrape.py [--dry-run] [--min-stars N] [--cap N]
Requires: `gh` CLI authenticated (uses it for API auth).
"""
import argparse
import json
import re
import subprocess
import sys
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "docs" / "data" / "skills.json"
TODAY = date.today().isoformat()

TOPIC_QUERIES = [
    "topic:claude-skills",
    "topic:claude-code-skills",
    "topic:agent-skills",
    "topic:claude-code",
    "awesome claude code in:name",
    "claude skills in:name,description",
]

# Known creators/repos worth checking directly (famous devs, quality shops).
# Each is verified via the API; missing/weak repos are dropped, never guessed at.
SEEDS = [
    "mattpocock/evalite",
    "mattpocock/skills",
    "hesreallyhim/awesome-claude-code",
    "wshobson/agents",
    "wshobson/commands",
    "VoltAgent/awesome-claude-code-subagents",
    "vijaythecoder/awesome-claude-agents",
    "disler/claude-code-hooks-mastery",
    "steipete/agent-rules",
    "ruvnet/claude-flow",
    "simonw/llm",
    "anthropics/claude-code",
    "davila7/claude-code-templates",
    "kingabzpro/awesome-claude-skills",
]

# Off-mission repos the searches surface: client apps, agent runtimes, platforms,
# product repos — not skills/resources that upgrade an existing AI environment.
EXCLUDE = {
    "anthropics/claude-code",        # the product itself, not an upgrade to it
    "cherryhq/cherry-studio",        # desktop LLM client app
    "bin-huang/chatbox",             # desktop LLM client app
    "jeecgboot/jeecgboot",           # low-code platform
    "luispater/cliproxyapi",         # API proxy service
    "router-for-me/cliproxyapi",     # API proxy service
    "zhayujie/cowagent",             # chatbot framework
    "zhayujie/chatgpt-on-wechat",    # chatbot framework
    "farion1231/cc-switch",          # provider-switcher client
    "googleworkspace/cli",           # Workspace CLI, not AI-env tooling
    "asgeirtj/system_prompts_leaks", # leaked prompts dump — off-mission
    "nanocoai/nanoclaw",             # agent runtime, not a skill
    "code-yeongyu/oh-my-openagent",  # an agent itself
    "nousresearch/hermes-agent",     # an agent itself
    "chatboxai/chatbox",             # AI client app
    "kubesphere/kubesphere",         # container platform
    "wasp-lang/open-saas",           # SaaS boilerplate
    "hkuds/nanobot",                 # an agent itself
    "alibaba/zvec",                  # vector DB infra, not a skill
    "santifer/career-ops",           # job-search tool, not AI-env upgrade
    "liyupi/ai-guide",               # general CN tutorial collection
}

# repo-name/description keywords -> pain-point ids (controlled vocab in skills.json)
PAIN_RULES = [
    (r"design|frontend|front-end|\bui\b|\bux\b|css|tailwind|component|landing", "generic-frontend"),
    (r"\btest|tdd|playwright|eval|e2e|qa\b", "testing-discipline"),
    (r"research|citation|sources|search the web|web search", "shallow-research"),
    (r"memory|context|session|token|compact", "context-bloat"),
    (r"\bplan|spec\b|task|roadmap|workflow orchestr", "planning-drift"),
    (r"\bgit\b|commit|pull request|\bpr\b|changelog", "git-hygiene"),
    (r"debug", "debugging-loops"),
    (r"secur|audit|secret|vulnerab", "security-worries"),
    (r"\bdocs\b|documentation|readme", "docs-drift"),
    (r"refactor|lint|code review|code quality|simplif", "code-quality"),
]
CAT_RULES = [
    (r"design|frontend|\bui\b|css", "frontend"),
    (r"\btest|eval|playwright", "testing"),
    (r"research|search", "research"),
    (r"memory|context|token", "context"),
    (r"secur|audit|secret", "security"),
    (r"\bdocs\b|documentation", "docs"),
    (r"\bgit\b|commit|\bpr\b", "git"),
    (r"\bplan|spec\b", "planning"),
    (r"hook|automat|flow", "automation"),
]


def gh(path):
    r = subprocess.run(["gh", "api", path], capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        return None
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        return None


def kebab(s):
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return re.sub(r"-{2,}", "-", s) or "x"


def months_since(iso):
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    return (now - dt).days / 30.44


def freshness_line(pushed_at):
    m = months_since(pushed_at)
    day = pushed_at[:10]
    if m < 3:
        return f"Last push {day} (checked {TODAY}) — actively maintained."
    if m > 6:
        return f"Last push {day} (checked {TODAY}) — ~{int(round(m))} months quiet."
    return f"Last push {day} (checked {TODAY})."


def license_line(repo):
    lic = (repo.get("license") or {})
    spdx = lic.get("spdx_id")
    if not spdx or spdx == "NOASSERTION":
        name = lic.get("name")
        if name and name != "Other":
            return name
        return "No license file detected via the GitHub API — usage rights unclear; a real triage red flag."
    return spdx


def is_library(repo):
    """A collection of many skills/agents/templates, vs one installable thing.
    Judged from the repo's own name/description, NOT its topics (the agent-skills
    topic would make every single skill look like a library)."""
    name = repo["name"].lower()
    desc = (repo.get("description") or "").lower()
    if re.search(r"awesome|collection|marketplace|templates?$|-skills$|^skills$|agents$|commands$", name):
        return True
    return bool(re.search(r"curated|collection of|library of|list of|\d+\+? (skills|agents|subagents|commands)", desc))


def classify(text):
    text = text.lower()
    pains = [pid for pat, pid in PAIN_RULES if re.search(pat, text)]
    cat = "workflow"
    for pat, c in CAT_RULES:
        if re.search(pat, text):
            cat = c
            break
    return cat, pains[:3]


def to_entry(repo):
    full = repo["full_name"]
    desc = (repo.get("description") or "").strip()
    owner = repo["owner"]["login"]
    text = f"{repo['name']} {desc} {' '.join(repo.get('topics') or [])}"
    is_lib = is_library(repo)
    category, pains = classify(text)
    if is_lib:
        category = "library"
    safety = (
        "A library, not one skill — each skill needs its own read before use. Not graded; "
        "individual skills may be graded separately later."
        if is_lib else
        "Source NOT yet read line-by-line — that read happens in grading. Treat as untrusted until graded."
    )
    return {
        "id": kebab(full),
        "name": full if is_lib else repo["name"],
        "repo_url": repo["html_url"],
        "author": owner,
        "category": category,
        "summary": desc[:220] if desc else full,
        "pain_points": pains,
        "status": "scouted",
        "scouted_on": TODAY,
        "signals": {
            "stars": repo["stargazers_count"],
            "forks": repo["forks_count"],
            "checked": TODAY,
        },
        "triage": {
            # No star count here on purpose: signals.stars is refreshed weekly and
            # carries its own `checked` date, so restating it in frozen prose just
            # guarantees the record ends up contradicting itself.
            "provenance": (
                f"Repo verified real via GitHub API: {full}, "
                f"created {repo['created_at'][:7]}."
            ),
            "license": license_line(repo),
            "freshness": freshness_line(repo["pushed_at"]),
            "safety": safety,
        },
        "next": "Queued for a full grading run.",
    }


def quality_ok(repo, min_stars):
    if repo["full_name"].lower() in EXCLUDE:
        return False
    if repo.get("archived") or repo.get("fork"):
        return False
    if not (repo.get("description") or "").strip():
        return False
    if repo["stargazers_count"] < min_stars:
        return False
    if months_since(repo["pushed_at"]) > 24:
        return False
    hay = f"{repo['full_name']} {repo.get('description','')} {' '.join(repo.get('topics') or [])}".lower()
    return bool(re.search(r"claude|agent|skill|\bmcp\b|prompt|\bllm\b|\bai\b", hay))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--min-stars", type=int, default=300)
    ap.add_argument("--seed-min-stars", type=int, default=40)
    ap.add_argument("--cap", type=int, default=50)
    args = ap.parse_args()

    data = json.loads(DATA.read_text())
    existing_ids = {s["id"] for s in data["skills"]}
    existing_urls = {s["repo_url"].lower().rstrip("/") for s in data["skills"]}

    candidates = {}

    for seed in SEEDS:
        repo = gh(f"repos/{seed}")
        if not repo:
            print(f"  seed miss: {seed} (not found / API error)")
            continue
        if quality_ok(repo, args.seed_min_stars):
            candidates[repo["full_name"].lower()] = repo
        else:
            print(f"  seed rejected by quality bar: {seed} (★{repo.get('stargazers_count')})")

    for q in TOPIC_QUERIES:
        res = gh(f"search/repositories?q={q.replace(' ', '+')}&sort=stars&order=desc&per_page=30")
        items = (res or {}).get("items") or []
        kept = 0
        for repo in items:
            if quality_ok(repo, args.min_stars):
                candidates.setdefault(repo["full_name"].lower(), repo)
                kept += 1
        print(f"  query '{q}': {len(items)} results, {kept} pass quality bar")

    fresh = []
    for repo in sorted(candidates.values(), key=lambda r: -r["stargazers_count"]):
        e = to_entry(repo)
        if e["id"] in existing_ids or e["repo_url"].lower().rstrip("/") in existing_urls:
            continue
        existing_ids.add(e["id"])
        fresh.append(e)
        if len(fresh) >= args.cap:
            break

    print(f"\n{len(fresh)} new scouted entries (cap {args.cap}):")
    for e in fresh:
        stars = f"{e['signals']['stars']:,}"
        print(f"  + {e['name']}  ★{stars}  [{e['category']}]  pains={','.join(e['pain_points']) or '-'}")

    if args.dry_run:
        return 0

    data["skills"].extend(fresh)
    data["as_of"] = TODAY
    DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"\nwrote {DATA} — now run: python3 scripts/validate_index.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
