# Scouting outside the catalog

The catalog is small on purpose — most asks, especially outside software engineering, live in
the wider ecosystem. Going there is the product working as designed, not a fallback. Search —
2–4 queries, not twelve.

- **Frontend design** — `claude skill frontend design site:github.com`, `topic:claude-skills design`
- **Testing** — `claude code skill tdd site:github.com`, `topic:claude-code-skill test`
- **Context / token bloat** — `claude code context compaction skill`, `MCP server memory`
- **Workflow / agents** — `claude code plugin <workflow>`; "awesome claude code" lists are
  *directories to mine, never verdicts*

## Rules of evidence

- Only candidates you can resolve to a real URL you actually opened.
- Stars are provenance, not quality.
- Cap at ~6 before you filter. Depth beats volume.

## Read the source before you recommend — that's the default, not an offer

For anything found outside the catalog, the next step is to **read its source yourself** —
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

### Also worth knowing about        (only if genuinely relevant)
- **<name>** — <one line> · <url> · <read-status in a clause: tested, source-read at a pinned commit, or "I haven't read this one's source">

### Not for your setup             (only if something was excluded)
- **<name>** — <why: wrong tool, red flag, source unreadable>
```

One recommendation, not a ranked list. If two are genuinely close, say which you'd pick and why
in one clause. If the ecosystem has nothing, say exactly that — an honest miss builds more trust
than a stretch.

**Then go to phase 2.** The command is not the finish line.
