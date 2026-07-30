#!/usr/bin/env python3
"""Refresh exposure signals for every catalog entry from the GitHub API.

Writes a structured `signals` object per skill — real numbers only, stamped
with the date they were checked:

    "signals": { "stars": 88561, "forks": 4123, "checked": "2026-07-25" }

Also refreshes the triage.freshness receipt line for scouted entries so the
last-push date never silently goes stale. This is the piece that can run on a
schedule later (weekly GitHub Action) so the catalog keeps itself honest.

Usage: python3 scripts/refresh_signals.py
Requires: `gh` CLI authenticated.
"""
import json
import re
import subprocess
import sys
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "docs" / "data" / "skills.json"
TODAY = date.today().isoformat()


def gh(path):
    r = subprocess.run(["gh", "api", path], capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        return None
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        return None


def months_since(iso):
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return (datetime.now(timezone.utc) - dt).days / 30.44


def freshness_line(pushed_at):
    m = months_since(pushed_at)
    day = pushed_at[:10]
    if m < 3:
        return f"Last push {day} (checked {TODAY}) — actively maintained."
    if m > 6:
        return f"Last push {day} (checked {TODAY}) — ~{int(round(m))} months quiet."
    return f"Last push {day} (checked {TODAY})."


def head_sha(full, default_branch):
    """The current tip commit of the repo's default branch.

    This is what `review.source_sha` is checked against. Without it, a review
    block is an assertion about code nobody re-checked — so a fetch failure
    leaves the previous value alone rather than clearing it, and the honesty
    gate treats an unknown HEAD as unverified rather than as agreement.
    """
    commit = gh(f"repos/{full}/commits/{default_branch}")
    if not commit or not commit.get("sha"):
        return None
    return commit["sha"]


def main():
    data = json.loads(DATA.read_text())
    ok = missed = sha_missed = 0
    for s in data["skills"]:
        m = re.match(r"https://github\.com/([^/]+/[^/]+)", s["repo_url"])
        if not m:
            continue
        repo = gh(f"repos/{m.group(1)}")
        if not repo:
            print(f"  miss: {s['id']} ({m.group(1)}) — API error; signals left as-is")
            missed += 1
            continue
        prev = s.get("signals") or {}
        s["signals"] = {
            "stars": repo["stargazers_count"],
            "forks": repo["forks_count"],
            "checked": TODAY,
        }
        sha = head_sha(m.group(1), repo.get("default_branch") or "main")
        if sha:
            s["signals"]["head_sha"] = sha
            s["signals"]["head_checked"] = TODAY
            if prev.get("head_sha") and prev["head_sha"] != sha:
                print(f"  moved: {s['id']} {prev['head_sha'][:8]} → {sha[:8]}")
        else:
            # Keep whatever we last knew; never fabricate a HEAD.
            if prev.get("head_sha"):
                s["signals"]["head_sha"] = prev["head_sha"]
                s["signals"]["head_checked"] = prev.get("head_checked", "unknown")
            sha_missed += 1
            print(f"  miss: {s['id']} — HEAD sha unavailable; previous value kept")
        # keep the freshness receipt current for scouted entries
        if s.get("status") == "scouted" and isinstance(s.get("triage"), dict):
            s["triage"]["freshness"] = freshness_line(repo["pushed_at"])
        ok += 1
    data["as_of"] = TODAY
    DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"signals refreshed: {ok} updated, {missed} missed, "
          f"{sha_missed} without a HEAD sha → {DATA}")
    print("now run: python3 scripts/validate_index.py --downgrade-stale")
    return 0 if missed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
