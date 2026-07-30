#!/bin/bash
# Double-click this in Finder to run the source review.
#
# Why this file exists: the review shells out to the `claude` CLI so it bills to
# Lucas's Claude subscription instead of metered API credits. Claude Code refuses
# to launch itself inside itself, so this CANNOT be run from Claude Code's inline
# terminal — it stops after two lines with no explanation. Launched from Finder it
# gets a clean shell and works.

cd "$(dirname "$0")" || { echo "could not find the repo folder"; exit 1; }
unset CLAUDECODE CLAUDE_CODE_SESSION   # belt and braces if launched oddly

BRANCH="verification/reviewed-tier"
LINE="------------------------------------------------------------------"

clear
echo "$LINE"
echo "  Skillproof — reading the source of every skill in the catalogue"
echo "$LINE"
echo
echo "  It downloads each repo, reads the code, and writes three things:"
echo "    what it does  ·  what it touches  ·  how to undo it"
echo
echo "  About a minute each, ~53 to go. Leave it running and come back."
echo "  Nothing is installed and no code is executed."
echo
echo "$LINE"
echo

if ! command -v claude >/dev/null 2>&1; then
  echo "  ✗ The 'claude' command isn't on this machine's PATH."
  echo "    Nothing has changed. Tell Claude and it'll sort it out."
  echo
  read -n 1 -s -r -p "  Press any key to close."
  exit 1
fi

# Stay on the PR's branch. Writing reviews onto main would put unreviewed data
# on the live site without Lucas ever seeing the PR.
CURRENT=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ "$CURRENT" != "$BRANCH" ]; then
  echo "  This repo is on '$CURRENT' but the reviews belong on '$BRANCH'."
  echo "  Switching over…"
  git checkout "$BRANCH" 2>/dev/null || {
    echo "  ✗ Couldn't switch branches. Nothing changed — tell Claude."
    echo
    read -n 1 -s -r -p "  Press any key to close."
    exit 1
  }
  echo
fi

python3 scripts/deep_review.py
echo
echo "$LINE"
echo "  Checking the results are honest before saving anything…"
echo "$LINE"
echo

if python3 scripts/validate_index.py; then
  echo
  if git diff --quiet docs/data/skills.json; then
    echo "  Nothing new to save — every review was already up to date."
  else
    git add docs/data/skills.json
    git commit -q -m "Source reviews: what each entry does, touches, and how to undo it

Written by scripts/deep_review.py on a Claude subscription, each pinned to the
commit whose source was read. Nothing was installed or executed."
    if git push -q 2>/dev/null; then
      echo "  ✓ Saved and uploaded to the pull request."
    else
      echo "  ⚠ Saved on this machine but the upload failed (network?)."
      echo "    Nothing is lost. Tell Claude and it'll push it."
    fi
  fi
  echo
  echo "$LINE"
  echo "  Done. Last step is yours — look at the PR and decide:"
  echo "  https://github.com/lucascashwell3-ai/Skillproof/pull/12"
  echo "$LINE"
else
  echo
  echo "$LINE"
  echo "  ✗ The honesty check FAILED, so nothing was saved or uploaded."
  echo "    That's the safety net doing its job — it refuses to publish a claim"
  echo "    it can't back up. Copy the errors above and show Claude."
  echo "$LINE"
fi

echo
read -n 1 -s -r -p "  Press any key to close this window."
echo
