# Scouting outside the catalog

The catalog is small on purpose. If it doesn't cover the ask, search — 2–4 queries, not twelve.

- **Frontend design** — `claude skill frontend design site:github.com`, `topic:claude-skills design`
- **Testing** — `claude code skill tdd site:github.com`, `topic:claude-code-skill test`
- **Context / token bloat** — `claude code context compaction skill`, `MCP server memory`
- **Workflow / agents** — `claude code plugin <workflow>`; "awesome claude code" lists are
  *directories to mine, never verdicts*

## Rules of evidence

- Only candidates you can resolve to a real URL you actually opened.
- Stars are provenance, not quality.
- Cap at ~6 before you filter. Depth beats volume.

## Anything from outside the catalog is unreviewed, and you say so in those words

Then apply the three questions honestly, from the README and file listing you can see:

- **What it does** — from its own docs, marked as the author's claim, not your finding.
- **What it touches** — what you can see in the file tree. If you haven't read the source, say
  "I haven't read the source; from the file list it ships shell scripts and a hook."
- **How to undo it** — if the README doesn't say, say the README doesn't say.

Then hand over the **repo URL, not an install command.** You haven't read it; you don't get to
hand someone a command for it. Offer instead: "want me to read the source and answer the three
questions properly before you install?" — and if they say yes, read it and answer them. Once
you've actually read the source, you can proceed to phase 2 with it.

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
- **<name>** — <one line> · <url> · <tier, and what that tier means in a clause>

### Not for your setup             (only if something was excluded)
- **<name>** — <why: wrong tool, red flag, source unreadable>
```

One recommendation, not a ranked list. If two are genuinely close, say which you'd pick and why
in one clause. If the ecosystem has nothing, say exactly that — an honest miss builds more trust
than a stretch.

**Then go to phase 2.** The command is not the finish line.
