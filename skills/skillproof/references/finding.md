# Finding — installed setup, catalog, live sources

Beat 2's procedure. All of this happens silently; the user sees only the result in beat 3.

## 1. What they already have (read-only)

Read every installed skill before you search: `~/.claude/skills/*/SKILL.md`, the project's
`.claude/skills/*/SKILL.md`, and any plugin skill list. For anything touching the ask, read
the full file, not just the description — you're judging it, not inventorying it. Signs an
installed skill is weak: vague or colliding trigger words, instructions that contradict the
setup around it, bloat that buries the point, or it simply does half of what current
ecosystem skills do.

**Installed never ends the search.** Run the catalog and live passes below regardless, then
compare. "You already have `X` and it's good" is a great outcome — but only after you've
looked at what else exists. If a found skill clearly beats theirs, say so plainly and plan a
replace-and-fold: their personal rules and preferences from the old skill get folded into the
new one, the old wrapper moves aside (never deleted). What you never do is add a twin on top
of a weak skill — clutter is the problem this product exists to stop.

## 2. The catalog

`https://lucascashwell3-ai.github.io/Skillproof/data/skills.json` (mirror:
`https://raw.githubusercontent.com/lucascashwell3-ai/Skillproof/main/docs/data/skills.json`).
One flat list. Match on `pain_points`, `summary`, `name`, `category`. Useful fields per entry:
`install.command` where known, `does`/`touches`/`undo` where someone has written them,
`signals.stars`, `checked.date` (when its malice scan ran). The catalog's numbers are a dated
snapshot — fine to use as-is; when a number carries weight in your pitch, a live GitHub check
beats the snapshot. Never state a number from memory.

## 3. Live sources, same pass

The catalog is a shelf, not a boundary. Search the ecosystem every time, in parallel with the
catalog read. 2–4 queries, ~6 candidates before you filter.

**GitHub topic search** (works without a token, ~10 requests a minute):
```
https://api.github.com/search/repositories?q=topic:claude-skills+<your words>&sort=stars&per_page=10
```
Run it for: `claude-skills`, `claude-code-skills`, `agent-skills`, `anthropic-skills`. Read
`full_name`, `stargazers_count`, `pushed_at`, `default_branch`, `license`, `html_url` off the
response — never from memory.

**Web search** — `claude code skill <topic> site:github.com`. "Awesome claude code" lists are
directories to mine, never verdicts.

**Your words, not theirs.** Build queries from the capability they want, never from a phrase
lifted out of their CLAUDE.md, memory, or settings.

## Rules of evidence

- Only candidates you can resolve to a real URL you actually opened.
- **A candidate must contain a `SKILL.md` you opened.** Topics and stars alone are not
  evidence — maintainers mis-tag.
- Stars are popularity, not quality. A recent push beats a star count.
- Cap at ~6 candidates before you filter. Depth beats volume.

## Read the source before you recommend

For anything you might recommend — catalog entry or live find — read its source yourself:
SKILL.md, whatever it installs, any scripts it runs. From the code (README is the author's
claim, not your finding), note:

- **what it does** — one plain sentence
- **what it touches** — files, network, credentials, shell
- **how to undo it** — or "the author doesn't document how to remove this"

**Depth bound for big repos:** read everything the plan would actually install, plus any hook
or script that would run automatically. If a repo is too large to read fully, scope the
recommendation down to the part you read (e.g. just its `skills/` folder, skipping its plugin
manifest and server) and say so in one line if it matters. If you genuinely can't read even
that (no access, obfuscated), hand over the repo URL and say plainly the source hasn't been
read. Unread code never gets an install command.

## Red flags — exclude it and say why, in one line

- an install line piping a download straight into a shell
- credential or SSH-key reads
- a hook that runs on every session start
- obfuscated or encoded blobs

A red flag tied to one install route is not a kill if the same repo offers a clean route —
recommend the clean route and name what you're avoiding, in one line. This same list is the
re-scan you run at install time in beat 5 — code can change between anyone's check and now.

## Picking

One recommendation. If two are genuinely close, say which you'd pick and why in one clause.
If the ecosystem has nothing, say exactly that — an honest miss beats a stretch.
