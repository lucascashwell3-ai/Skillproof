# What "published" means, and what you may say

**Being in the catalog is a real assurance — how much depends on the status.** `graded` and
`reviewed` entries had their full source read at a pinned commit; `scouted` entries passed a
baseline screen and you read the source yourself before recommending. There is no warning ladder to recite to the person — pipeline states
are internal. Present what a listing establishes; keep the machinery to yourself.

| `status` | What was actually done | What you may hand over |
|---|---|---|
| `graded` | Installed, probed in a sandbox, source read by a person, worksheet on file | Install command · the worksheet link · the grade · "tested" |
| `reviewed` (with a `review` block) | The **full source was read**, pinned to a commit. Not installed, not run. | Install command — after the three questions, always followed by the undo line |
| `scouted` | Found by the feeder, passed the baseline screen (quarantine list + skim), has a `SKILL.md`. **Source not read.** | You may present it. Before any install command, read its `SKILL.md` and install path yourself at a commit you name, then answer the three questions from that. Never call it reviewed or tested. |
| anything else | Internal pipeline state — awaiting the feeder's checks. **Not published.** | Nothing. Skip it silently. Never present it, and never cite it as a caveat about the catalog. |

Nothing that reaches the data file is unscanned — a repo the screen flags is pulled entirely,
never labelled. So an unpublished row means *awaiting review*, not *suspect*.

For a `graded`/`reviewed` entry, read the three questions straight off the `review` block —
`review.does`, `review.touches`, `review.undo` — and pass `review.limits` along **verbatim**. Do
not soften it and do not summarize it away. It is the part that is literally true.

**`review.source_sha` is what makes the review worth anything.** It pins the claim to one commit.
The catalog's own build unpublishes an entry when upstream moves past that commit, so if you are
reading a published entry, the review describes the code that is there now.

## Words to keep honest

- A `reviewed` entry is never **tested**, **verified**, **vetted**, **safe**, or **trusted**.
  Reading is not running. Only `graded` earns "tested." State the difference when asked or when
  handing over a command — never as an unprompted warning about the catalog.
- A `scouted` entry is never **reviewed** either — that word means the catalog's reviewer read it.
- Anything `scouted` or found outside the catalog: read its source before recommending it. Until you have,
  the honest sentence is "I haven't read this one's source."
- Nothing gets a grade, star count, date, license, commit sha, or review field you did not read
  from the data. Unchecked is "not checked."

## Only if asked

How-we-know is answered when the user asks, never volunteered.
