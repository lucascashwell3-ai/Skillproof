#!/usr/bin/env python3
"""Proof that the CLI review backend is wired correctly, without a model call.

The live call can only be made outside a Claude Code session (nested sessions are
refused), so the thing that gets verified here is everything around it: the flags
the reviewer passes, that it is genuinely read-only, that a schema-shaped reply is
parsed and written, and that a bad reply is REJECTED rather than published.

A stub `claude` on PATH stands in for the model. It records the argv it was called
with, so the read-only guarantees are asserted rather than assumed.

Usage: python3 scripts/test_cli_backend.py
"""
import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIVE = ROOT / "docs" / "data" / "skills.json"
REVIEWER = ROOT / "scripts" / "deep_review.py"

GOOD = {
    "does": "Gives your agent a step-by-step debugging routine instead of guessing.",
    "touches": ["reads project files", "runs shell commands"],
    "undo": "Remove the folder from ~/.claude/skills/ to uninstall it.",
    "limits": "The source was read, not run. This cannot tell you whether the "
              "routine actually helps, only what the code does.",
}

STUB = r'''#!/usr/bin/env python3
import json, os, sys
# Record how the reviewer invoked us so the test can assert on it.
with open(os.environ["STUB_ARGV_LOG"], "w") as f:
    json.dump(sys.argv[1:], f)
prompt = sys.stdin.read()
with open(os.environ["STUB_PROMPT_LOG"], "w") as f:
    f.write(prompt)
print(json.dumps({
    "type": "result",
    "is_error": False,
    "structured_output": json.loads(os.environ["STUB_REPLY"]),
    "usage": {"input_tokens": 10500, "output_tokens": 420},
}))
'''


def run(reply, entry_id):
    """Run the reviewer with a stubbed model. Returns (code, out, data, argv, prompt)."""
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        bindir = tmp / "bin"
        bindir.mkdir()
        stub = bindir / "claude"
        stub.write_text(STUB)
        stub.chmod(stub.stat().st_mode | stat.S_IEXEC)

        data_path = tmp / "skills.json"
        d = json.loads(LIVE.read_text())
        d["skills"] = [s for s in d["skills"] if s["id"] == entry_id]
        data_path.write_text(json.dumps(d, indent=2) + "\n")

        argv_log, prompt_log = tmp / "argv.json", tmp / "prompt.txt"
        env = dict(os.environ,
                   PATH=f"{bindir}:{os.environ['PATH']}",
                   SKILLPROOF_DATA=str(data_path),
                   STUB_ARGV_LOG=str(argv_log),
                   STUB_PROMPT_LOG=str(prompt_log),
                   STUB_REPLY=json.dumps(reply))
        r = subprocess.run([sys.executable, str(REVIEWER), "--backend", "cli",
                            "--only", entry_id],
                           capture_output=True, text=True, env=env, timeout=600)
        return (r.returncode, r.stdout + r.stderr,
                json.loads(data_path.read_text()),
                json.loads(argv_log.read_text()) if argv_log.exists() else [],
                prompt_log.read_text() if prompt_log.exists() else "")


def main():
    entry_id = next(s["id"] for s in json.loads(LIVE.read_text())["skills"]
                    if s.get("status") == "scouted")
    print(f"CLI backend wiring · stub model · fixture entry: {entry_id}\n")
    passed = failed = 0

    def check(label, cond, detail=""):
        nonlocal passed, failed
        if cond:
            print(f"  ✓ {label}")
            if detail:
                print(f"      → {detail}")
            passed += 1
        else:
            print(f"  ✗ {label}    {detail}")
            failed += 1

    # ---- a well-formed reply must be parsed, validated, and written
    code, out, data, argv, prompt = run(GOOD, entry_id)
    e = data["skills"][0]
    rv = e.get("review") or {}
    check("exits 0 on a good reply", code == 0)
    check("promotes the entry to `reviewed`", e.get("status") == "reviewed",
          f"status={e.get('status')}")
    check("writes the three fields verbatim",
          rv.get("does") == GOOD["does"] and rv.get("undo") == GOOD["undo"]
          and rv.get("touches") == GOOD["touches"])
    check("stamps source_sha with the cloned commit",
          len(str(rv.get("source_sha", ""))) == 40,
          f"source_sha={str(rv.get('source_sha'))[:12]}…")
    check("source_sha matches signals.head_sha (so the gate sees it as current)",
          rv.get("source_sha") == (e.get("signals") or {}).get("head_sha"))
    check("records scope, not just a claim", "read" in rv.get("scope", ""),
          rv.get("scope", "")[:90])
    check("records the reviewer id", rv.get("reviewer") == "automated-source-review v1")

    # ---- the read-only guarantees, asserted from the actual argv
    check('passes --tools "" (reviewer cannot touch the machine)',
          "--tools" in argv and argv[argv.index("--tools") + 1] == "")
    check("passes --json-schema (same enforcement as the API path)",
          "--json-schema" in argv)
    check("passes --disable-slash-commands (no local skill reshapes the review)",
          "--disable-slash-commands" in argv)
    check("passes --no-session-persistence", "--no-session-persistence" in argv)
    check("schema it sends enumerates the fixed touches vocabulary",
          "reads credentials/keys" in argv[argv.index("--json-schema") + 1])

    # ---- the prompt actually contains source, and says what was withheld
    check("prompt carries real file contents", "===== FILE:" in prompt,
          f"{len(prompt):,} chars sent")
    check("prompt names the repo under review", entry_id.split("-")[0] in prompt.lower()
          or "Repository:" in prompt)

    # ---- a malformed reply must be REJECTED, not published
    print()
    bad_cases = {
        "invented touches value": dict(GOOD, touches=["reads your mind"]),
        "empty undo": dict(GOOD, undo="   "),
        "no side effects + a real effect":
            dict(GOOD, touches=["no side effects", "network calls"]),
    }
    for label, reply in bad_cases.items():
        code, out, data, _, _ = run(reply, entry_id)
        e = data["skills"][0]
        rejected = e.get("status") == "scouted" and "review" not in e
        check(f"rejects a bad reply — {label}", rejected and "FAIL" in out,
              next((l.strip() for l in out.splitlines() if "FAIL" in l), "")[:110])

    print(f"\n{passed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
