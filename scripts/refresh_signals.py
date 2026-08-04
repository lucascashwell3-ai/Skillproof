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

sys.path.insert(0, str(Path(__file__).resolve().parent))
from review_contract import inert_file

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


def changed_files(full, base, head):
    """Files that differ between two commits, or None if we cannot tell.

    None is not 'nothing changed'. A comparison we could not make must never
    keep a review alive — the caller treats None as material.
    """
    cmp = gh(f"repos/{full}/compare/{base}...{head}")
    if not cmp or "files" not in cmp:
        return None
    return [f.get("filename", "") for f in cmp["files"]]


def repin(s, full, old, new):
    """Keep a review alive across a commit that changed nothing material.

    A review says: we read these bytes. If every file that changed since is one
    whose contents cannot affect behaviour — a README, a licence, a screenshot —
    then the bytes we read are still the bytes there now, and expiring the
    review would throw away good work for a typo. Anything else, including a
    comparison we could not make, expires it.

    Returns True if the review was re-pinned. The trail is recorded on the entry
    so the claim stays auditable: the gate re-checks the file list and fails the
    build if a re-pin ever names a file that is not inert.
    """
    files = changed_files(full, old, new)
    if files is None or not files or any(not inert_file(f) for f in files):
        return False
    r = s["review"]
    r["source_sha"] = new
    r.setdefault("repinned", []).append({
        "from": old, "to": new, "on": TODAY, "changed": sorted(files),
    })
    print(f"  = kept: {s['id']} {old[:8]} → {new[:8]} "
          f"({len(files)} file(s) changed, none material: {', '.join(sorted(files)[:3])})")
    return True


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
                # A live review pinned to the commit we just moved off gets one
                # chance to survive: only if nothing material changed.
                rv = s.get("review")
                if rv and rv.get("source_sha") == prev["head_sha"]:
                    repin(s, m.group(1), prev["head_sha"], sha)
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
