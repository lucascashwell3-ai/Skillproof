#!/usr/bin/env python3
"""Skillproof X (Twitter) reader — third-party read API, hard-capped.

Uses TwitterAPI.io (a third-party X read API). NEVER the official X API. X is
OFF by default at the orchestrator level; this script additionally enforces a
hard per-run read cap and refuses to exceed it. If no key is set it prints
{"skipped": true} and exits 0 so the orchestrator skips X silently.

Usage:
    python3 x_read.py search "<query>" [--max N]

Env:
    SKILLPROOF_X_API_KEY     TwitterAPI.io key. Absent -> skip silently.
    SKILLPROOF_X_MAX_READS   hard cap on posts read per invocation (default 200).

Cost note: TwitterAPI.io ~= $0.00015 / tweet ($0.15 / 1,000). A 200-read run ~= $0.03.
(Re-verify the live price before relying on the estimate.)
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

PER_READ_USD = 0.00015
BASE = "https://api.twitterapi.io"
TIMEOUT = 30


def _get(path: str, params: dict, key: str) -> dict:
    url = f"{BASE}{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"X-API-Key": key})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _norm(t: dict) -> dict:
    author = t.get("author") or {}
    uname = author.get("userName") or author.get("screen_name") or ""
    tid = str(t.get("id") or t.get("id_str") or "")
    return {
        "id": tid,
        "url": f"https://x.com/{uname}/status/{tid}" if uname and tid else t.get("url", ""),
        "text": t.get("text", ""),
        "author": f"@{uname}" if uname else "",
        "created_at": t.get("createdAt") or t.get("created_at", ""),
        "like_count": t.get("likeCount") or t.get("favorite_count", 0),
    }


def search(query: str, requested: int, key: str) -> dict:
    cap = int(os.environ.get("SKILLPROOF_X_MAX_READS", "200"))
    budget = min(requested, cap)  # HARD cap — never read more than this
    posts, cursor, reads = [], "", 0
    while reads < budget:
        params = {"query": query, "queryType": "Latest"}
        if cursor:
            params["cursor"] = cursor
        try:
            j = _get("/twitter/tweet/advanced_search", params, key)
        except urllib.error.HTTPError as e:
            return {"error": f"HTTP {e.code}: {e.reason}", "query": query,
                    "reads": reads, "posts": posts}
        except Exception as e:  # noqa: BLE001
            return {"error": f"{type(e).__name__}: {str(e)[:160]}", "query": query,
                    "reads": reads, "posts": posts}
        batch = j.get("tweets") or j.get("data") or []
        for t in batch:
            if reads >= budget:
                break
            posts.append(_norm(t))
            reads += 1
        cursor = j.get("next_cursor") or j.get("cursor") or ""
        if not batch or not cursor or not j.get("has_next_page", bool(cursor)):
            break
    return {
        "query": query,
        "requested": requested,
        "cap": cap,
        "reads": reads,
        "clamped": requested > cap,
        "est_cost_usd": round(reads * PER_READ_USD, 4),
        "posts": posts,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["search"])
    ap.add_argument("query")
    ap.add_argument("--max", type=int, default=50)
    args = ap.parse_args()

    key = os.environ.get("SKILLPROOF_X_API_KEY", "")
    if not key:
        # No key -> orchestrator skips X silently. Not an error.
        print(json.dumps({"skipped": True, "reason": "SKILLPROOF_X_API_KEY not set"}))
        return 0

    print(json.dumps(search(args.query, args.max, key), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
