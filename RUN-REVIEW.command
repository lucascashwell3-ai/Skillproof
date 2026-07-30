#!/bin/bash
# Double-click this in Finder to run the source review.
#
# Why this file exists: the review shells out to the `claude` CLI so it bills to a
# Claude subscription instead of metered API credits. Claude Code refuses to
# launch itself inside itself, so this CANNOT be run from Claude Code's inline
# terminal — it stops after two lines with no explanation. Launched from Finder it
# gets a clean shell and works.
#
# It opens a pull request rather than writing straight to the live site. The
# reviews are machine-written prose about third-party code that will be published
# under Lucas's name, so he gets to skim it first. One click to merge.

cd "$(dirname "$0")" || { echo "could not find the repo folder"; exit 1; }
unset CLAUDECODE CLAUDE_CODE_SESSION   # belt and braces if launched oddly

LINE="------------------------------------------------------------------"
BRANCH="reviews/$(date +%Y-%m-%d-%H%M)"

bail () { echo; echo "  $1"; echo; read -n 1 -s -r -p "  Press any key to close."; echo; exit 1; }

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

command -v claude >/dev/null 2>&1 || bail "✗ The 'claude' command isn't on this machine's PATH. Nothing changed — tell Claude."
command -v git    >/dev/null 2>&1 || bail "✗ git isn't available. Nothing changed — tell Claude."

# Never write reviews onto main. They go up as a PR so Lucas sees them first.
git diff --quiet && git diff --cached --quiet || \
  bail "✗ This repo has uncommitted changes. Tell Claude before running, so nothing of yours gets mixed in."

git checkout -q main 2>/dev/null || bail "✗ Couldn't switch to main. Nothing changed — tell Claude."
git pull -q --ff-only 2>/dev/null || echo "  (couldn't refresh from GitHub — carrying on with what's here)"
git checkout -q -b "$BRANCH" 2>/dev/null || bail "✗ Couldn't start a new branch. Nothing changed — tell Claude."

python3 scripts/deep_review.py
echo
echo "$LINE"
echo "  Checking the results are honest before saving anything…"
echo "$LINE"
echo

if ! python3 scripts/validate_index.py; then
  git checkout -q -- docs/data/skills.json 2>/dev/null
  git checkout -q main 2>/dev/null && git branch -q -D "$BRANCH" 2>/dev/null
  bail "✗ The honesty check FAILED, so nothing was saved. That's the safety net doing its job — it refuses to publish a claim it can't back up. Copy the errors above and show Claude."
fi

echo
if git diff --quiet docs/data/skills.json; then
  git checkout -q main 2>/dev/null && git branch -q -D "$BRANCH" 2>/dev/null
  echo "  Nothing new to save — every review was already up to date."
  echo
  read -n 1 -s -r -p "  Press any key to close."
  echo
  exit 0
fi

REVIEWED=$(python3 -c "import json;d=json.load(open('docs/data/skills.json'));print(sum(1 for s in d['skills'] if s.get('status')=='reviewed'))")
TOTAL=$(python3 -c "import json;print(len(json.load(open('docs/data/skills.json'))['skills']))")

git add docs/data/skills.json
git commit -q -m "Source reviews: what each entry does, touches, and how to undo it

$REVIEWED of $TOTAL entries now carry a source review, each pinned to the commit
whose code was read. Written by scripts/deep_review.py on a Claude subscription.
Nothing was installed and nothing was executed."

if ! git push -q -u origin "$BRANCH" 2>/dev/null; then
  bail "⚠ Saved on this machine but the upload failed (network?). Nothing is lost — tell Claude and it'll push it."
fi

PR_URL=$(gh pr create --base main --head "$BRANCH" \
  --title "Source reviews: $REVIEWED of $TOTAL entries" \
  --body "Ran \`scripts/deep_review.py\` on a Claude subscription. **$REVIEWED of $TOTAL** entries now carry a source review — what it does, what it touches, how to undo it — each pinned to the commit whose code was read.

Nothing was installed and nothing was executed. The honesty gate passed before this was committed; it would have refused to save anything that implied otherwise.

**Skim a few of the \`review\` blocks in \`docs/data/skills.json\`** — this prose gets published under your name. If it reads well, merge." 2>/dev/null)

echo "$LINE"
if [ -n "$PR_URL" ]; then
  echo "  ✓ Done — $REVIEWED of $TOTAL entries reviewed, and a pull request is open:"
  echo "    $PR_URL"
  echo
  echo "  Skim a few of the reviews, then merge. Nothing is live until you do."
else
  echo "  ✓ Reviews saved and uploaded to branch: $BRANCH"
  echo "    Couldn't open the PR automatically — tell Claude and it'll do it."
fi
echo "$LINE"
echo
read -n 1 -s -r -p "  Press any key to close this window."
echo
