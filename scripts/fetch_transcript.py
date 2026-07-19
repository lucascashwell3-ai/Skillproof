#!/usr/bin/env python3
"""Skillproof transcript fetcher — one interface, two backends.

    local   -> youtube-transcript-api (residential/personal use)
    hosted  -> Supadata or youtube-transcript.io (works from cloud IPs)

Prints a single JSON object to stdout so the calling sub-agent can cite exact
timestamps. NEVER fabricates content: on a block/unavailable transcript it
returns {"blocked": true|false, "error": "..."} and the sub-agent falls back to
WebFetch (page metadata only) or drops the source.

Usage:
    python3 fetch_transcript.py <video_url_or_id> [--backend local|hosted]

Env:
    SKILLPROOF_TRANSCRIPT_BACKEND          local | hosted            (default: local)
    SKILLPROOF_TRANSCRIPT_HOSTED_PROVIDER  supadata | youtube-transcript-io  (default: supadata)
    SKILLPROOF_TRANSCRIPT_API_KEY          key for the hosted backend
"""
import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

TIMEOUT = 30


def video_id(s: str) -> str:
    """Accept a bare ID or any common YouTube URL form."""
    s = s.strip()
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", s):
        return s
    m = re.search(r"(?:v=|/shorts/|youtu\.be/|/embed/)([A-Za-z0-9_-]{11})", s)
    if m:
        return m.group(1)
    raise ValueError(f"could not parse a video id from: {s!r}")


def hms(seconds: float) -> str:
    seconds = int(seconds)
    h, rem = divmod(seconds, 3600)
    m, sec = divmod(rem, 60)
    return f"{h}:{m:02d}:{sec:02d}" if h else f"{m}:{sec:02d}"


def _segments(raw):
    """raw: iterable of objects/dicts with text + start (seconds)."""
    out = []
    for r in raw:
        text = getattr(r, "text", None) if not isinstance(r, dict) else r.get("text")
        start = getattr(r, "start", None) if not isinstance(r, dict) else r.get("start", r.get("offset"))
        if text is None or start is None:
            continue
        start = float(start)
        # offset may be milliseconds on some hosted APIs
        if start > 100000:
            start = start / 1000.0
        out.append({"start_seconds": round(start, 2), "start_hms": hms(start), "text": text.strip()})
    return out


# ---------------------------------------------------------------- local backend
def fetch_local(vid: str) -> dict:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError:
        return {"blocked": False, "error": "youtube-transcript-api not installed "
                "(pip install youtube-transcript-api)"}
    try:
        fetched = YouTubeTranscriptApi().fetch(vid)
        segs = _segments(fetched.snippets)
        return {"segments": segs, "text": " ".join(s["text"] for s in segs)}
    except Exception as e:  # noqa: BLE001 - classify below
        name = type(e).__name__
        msg = str(e)
        blocked = any(k in name for k in ("IpBlocked", "RequestBlocked")) or \
            "cloud provider" in msg.lower() or "blocking requests" in msg.lower() or \
            "ProxyError" in name or "Tunnel connection" in msg
        return {"blocked": blocked, "error": f"{name}: {msg[:200]}"}


# --------------------------------------------------------------- hosted backend
def _http_json(url: str, headers: dict, data: bytes = None) -> dict:
    req = urllib.request.Request(url, headers=headers, data=data,
                                 method="POST" if data else "GET")
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_hosted(vid: str) -> dict:
    provider = os.environ.get("SKILLPROOF_TRANSCRIPT_HOSTED_PROVIDER", "supadata").lower()
    key = os.environ.get("SKILLPROOF_TRANSCRIPT_API_KEY", "")
    if not key:
        return {"blocked": False, "error": "SKILLPROOF_TRANSCRIPT_API_KEY not set for hosted backend"}
    url = f"https://www.youtube.com/watch?v={vid}"
    try:
        if provider == "supadata":
            # https://docs.supadata.ai — GET transcript; header x-api-key. Verify endpoint before publish.
            q = urllib.parse.urlencode({"url": url, "text": "false"})
            j = _http_json(f"https://api.supadata.ai/v1/transcript?{q}", {"x-api-key": key})
            content = j.get("content", j.get("transcript", []))
            if isinstance(content, str):
                return {"segments": [], "text": content}
            return {"segments": _segments(content), "text": " ".join(
                (c.get("text", "") if isinstance(c, dict) else str(c)) for c in content)}
        elif provider in ("youtube-transcript-io", "youtube-transcript.io"):
            body = json.dumps({"ids": [vid]}).encode()
            j = _http_json("https://www.youtube-transcript.io/api/transcripts",
                           {"Authorization": f"Basic {key}", "Content-Type": "application/json"}, body)
            item = (j[0] if isinstance(j, list) else j).get("transcript", [])
            return {"segments": _segments(item), "text": " ".join(
                (c.get("text", "") if isinstance(c, dict) else str(c)) for c in item)}
        else:
            return {"blocked": False, "error": f"unknown hosted provider: {provider}"}
    except urllib.error.HTTPError as e:
        return {"blocked": e.code in (403, 429), "error": f"HTTP {e.code}: {e.reason}"}
    except Exception as e:  # noqa: BLE001
        return {"blocked": False, "error": f"{type(e).__name__}: {str(e)[:200]}"}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--backend", default=os.environ.get("SKILLPROOF_TRANSCRIPT_BACKEND", "local"),
                    choices=["local", "hosted"])
    args = ap.parse_args()
    try:
        vid = video_id(args.video)
    except ValueError as e:
        print(json.dumps({"blocked": False, "error": str(e)}))
        return 2

    result = fetch_local(vid) if args.backend == "local" else fetch_hosted(vid)
    result.update({
        "video_id": vid,
        "backend": args.backend,
        "source_url": f"https://youtu.be/{vid}",
    })
    # convenience: a per-segment citeable url
    if result.get("segments"):
        for s in result["segments"]:
            s["cite_url"] = f"https://youtu.be/{vid}?t={int(s['start_seconds'])}"
    print(json.dumps(result, ensure_ascii=False))
    return 0 if not result.get("error") else 1


if __name__ == "__main__":
    sys.exit(main())
