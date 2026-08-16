# Finding — installed setup, catalog, live sources

Phase 1 is four steps. This file is the procedure.

## Step 0 — what they already have (read-only)

Read the `description` line of every installed skill before you search:
`~/.claude/skills/*/SKILL.md`, the project's `.claude/skills/*/SKILL.md`, and any plugin skill
list. If one already covers the ask, lead with it: "you already have `X` — it does this." Do not
recommend a near-twin; that is clutter, and clutter is the problem this product exists to stop.
Only if nothing installed covers it do you go find something.

## Step 1 — the catalog

`https://lucascashwell3-ai.github.io/Skillproof/data/skills.json` (mirror:
`https://raw.githubusercontent.com/lucascashwell3-ai/Skillproof/main/docs/data/skills.json`).
Match on `pain_points`, `summary`, `name`, `category`. Usable statuses: `graded`, `reviewed`,
`scouted` — what each lets you say is in `tiers.md`.

## Step 2 — live sources, same pass

The catalog is a shelf, not a boundary. Search the ecosystem every time, in parallel with the
catalog read. 2–4 queries, ~6 candidates before you filter.

**GitHub topic search** (works without a token, ~10 requests a minute):
```
https://api.github.com/search/repositories?q=topic:claude-skills+<your words>&sort=stars&per_page=10
```
Run it for the four topics the catalog's feeder scouts: `claude-skills`, `claude-code-skills`,
`agent-skills`, `anthropic-skills`. Read `full_name`, `stargazers_count`, `pushed_at`,
`default_branch`, `license`, `html_url` off the response — never from memory.

**Named creators the feeder trusts** (`scripts/feeder_sources.json` in the Skillproof repo —
anthropics, obra, addyosmani, davila7, hesreallyhim, VoltAgent, agentskills at time of writing):
worth a direct look when the topic search is thin.

**Web search** — `claude code skill <topic> site:github.com`. "Awesome claude code" lists are
directories to mine, never verdicts.

**Your words, not theirs.** Build queries from the capability they want, never from a phrase
lifted out of their CLAUDE.md, memory, or settings (guardrail 4).

## Rules of evidence

- Only candidates you can resolve to a real URL you actually opened.
- **A candidate must contain a `SKILL.md` you opened.** Topics and stars alone are not evidence —
  maintainers mis-tag. Fetch the tree or the file: no `SKILL.md`, no candidate.
- Stars are provenance, not quality. Recent `pushed_at` beats star count.
- Cite what you read: "I read `<path>` at commit `<sha7>`." A sha you did not see is not cited.
- Cap at ~6 before you filter. Depth beats volume.

## Step 3 — read the source before you recommend; that's the default, not an offer

For anything found live, and for any `scouted` catalog row, the next step is to **read its
source yourself** —
same job the catalog's reviewer does — and answer the three questions from the code you read:

- **What it does** — from the code, with the README as the author's claim, not your finding.
- **What it touches** — files, network, credentials, shell, from what you actually read.
- **How to undo it** — if neither the code nor the README says, say the author doesn't document it.

Once you've read the source, an install command is fine — proceed to phase 2 with it. If you
genuinely can't read it (no access, too large, obfuscated), hand over the **repo URL, not a
command**, and say plainly the source hasn't been read. Unread code never gets a command.

## Hard red flags — exclude it and say why

- an install line piping a download straight into a shell
- credential or SSH-key reads
- a hook that runs on every session start
- obfuscated or encoded blobs

Suspicion is a finding, not a footnote. Say which flag and where you saw it.

## The output shape

```
## What you asked for: <one line, in their words>

### Install this
**<name>** — <what it does, one plain sentence>

- **Touches:** <chips, plain language>
- **Undo:** <exact way off, or "the author doesn't document how to remove this">
- **How we know:** <graded → tested + probed, worksheet: url>
                   <reviewed → an automated reviewer read the full source at commit <sha7>;
                    nobody installed or ran it. <review.limits verbatim>>
                   <scouted or live → I read <path> at commit <sha7> myself; nobody installed
                    or ran it>

### Also worth knowing about        (only if genuinely relevant)
- **<name>** — <one line> · <url> · <read-status in a clause: tested, source-read at a pinned commit, or "I haven't read this one's source">

### Not for your setup             (only if something was excluded)
- **<name>** — <why: wrong tool, red flag, source unreadable>
```

One recommendation, not a ranked list. If two are genuinely close, say which you'd pick and why
in one clause. If the ecosystem has nothing, say exactly that — an honest miss builds more trust
than a stretch.

**Then go to phase 2.** The command is not the finish line.
