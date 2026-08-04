#!/usr/bin/env python3
"""Proof that the published install command installs a working skill.

This exists because it broke twice in one day, the same way both times: a file
was added to the skill and the install command — which names every file
explicitly — was not updated. The result installs a SKILL.md whose instructions
point at files that are not there, and nothing anywhere would have said so. The
gate checks the catalog's honesty; nothing checked that the thing we hand people
actually assembles.

Three rules, all mechanical:

  1. Every file in skills/skillproof/ appears in the install command.
  2. Every references/*.md that SKILL.md points at exists on disk.
  3. The file count stated in the prose matches reality.

Usage: python3 scripts/test_install_command.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILL_DIR = ROOT / "skills" / "skillproof"
CARRIERS = (ROOT / "docs" / "index.html", ROOT / "skills" / "README.md")
WORDS = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six",
         7: "seven", 8: "eight", 9: "nine", 10: "ten"}


def main():
    failed = 0
    on_disk = sorted(p.relative_to(SKILL_DIR).as_posix()
                     for p in SKILL_DIR.rglob("*") if p.is_file())
    print(f"skill ships {len(on_disk)} file(s): {', '.join(on_disk)}\n")

    # 1. the install command must name every one of them
    for carrier in CARRIERS:
        text = carrier.read_text()
        missing = [f for f in on_disk if f not in text]
        if missing:
            print(f"  ✗ {carrier.name}: install command omits {missing} — "
                  f"installs a skill with missing files")
            failed += 1
        else:
            print(f"  ✓ {carrier.name}: install command names all "
                  f"{len(on_disk)} files")

    # 2. every reference SKILL.md points at must exist
    skill_md = (SKILL_DIR / "SKILL.md").read_text()
    pointed = sorted(set(re.findall(r"references/[\w-]+\.md", skill_md)))
    absent = [r for r in pointed if not (SKILL_DIR / r).exists()]
    if absent:
        print(f"  ✗ SKILL.md points at files that do not exist: {absent}")
        failed += 1
    else:
        print(f"  ✓ SKILL.md's {len(pointed)} reference(s) all exist on disk")

    # 3. prose that states a count must state the right one
    n = len(on_disk)
    for carrier in CARRIERS:
        text = carrier.read_text().lower()
        wrong = [w for k, w in WORDS.items()
                 if k != n and re.search(rf"\b{w} files to disk", text)]
        if wrong:
            print(f"  ✗ {carrier.name}: prose says '{wrong[0]} files to disk', "
                  f"but the skill ships {n}")
            failed += 1
        else:
            print(f"  ✓ {carrier.name}: stated file count is honest")

    print(f"\n{'FAILED' if failed else 'ok'} — {failed} problem(s)")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
