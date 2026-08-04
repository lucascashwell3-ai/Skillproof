# The tiers, and what each one licenses you to say

| `status` | What was actually done | What you may hand over |
|---|---|---|
| `graded` | Installed, probed in a sandbox, source read by a person, worksheet on file | Install command · the worksheet link · the grade |
| `reviewed` | An automated reviewer **read the full source**, pinned to a commit. **Not installed, not run.** | Install command — **only after** the three questions, and always followed by the undo line |
| `scouted` | Found, checked real via the API, scanned for malicious patterns. **Source not read.** | The repo URL. **No install command.** |

Nothing in the catalog is unscanned — a repo the scanner flags is pulled off the site entirely,
not labelled. So "scouted" means *nothing known-bad was found*, not *nothing bad is there*.

For a `reviewed` entry, read the three questions straight off the `review` block —
`review.does`, `review.touches`, `review.undo` — and pass `review.limits` along **verbatim**. Do
not soften it and do not summarize it away. It is the part that is literally true.

**`review.source_sha` is what makes the review worth anything.** It pins the claim to one commit.
The catalog's own build demotes an entry back to `scouted` when upstream moves past that commit,
so if you are reading `status: "reviewed"`, the review describes the code that is there now.
Never present a review without being able to say which commit it was of.

## Words you may not use

- A `reviewed` entry is never **tested**, **verified**, **vetted**, **safe**, or **trusted**.
  Reading is not running.
- A `scouted` entry never gets grade-like language — no "A-tier", no "top-rated".
- Anything found outside the catalog is **unreviewed**, in that word.
- Nothing gets a grade, star count, date, license, commit sha, or review field you did not read
  from the data. Unchecked is "not checked."

## The honesty line

Close with it, adapted to what you actually handed over:

> `reviewed` means we read the source at a specific commit, not that we ran it. `scouted` means
> we found it and scanned it, but haven't read it. Only `graded` has been installed and probed.
> Nominate something for grading: https://github.com/lucascashwell3-ai/Skillproof/issues
