<div align="center">

# ✦ Skillproof

**The rating agency for Claude skills.**

Thousands of community skills exist; directories count them, nobody grades them.
Skillproof is a small, curated index where every skill was **installed, probed in real
sessions, and graded A–F** against a [published rubric](grading/RUBRIC.md) — with a
filled [grading worksheet](grading/worksheets/) behind every grade. Tell the site your
pain point; it hands you a vetted stack.

`MIT` · a static site + a Claude Code research skill · part of the `-proof` family (DATproof · Modelproof)

<img src="docs/assets/og-preview.png" alt="Skillproof — the graded index and pain-point matcher on a dark starfield" width="840">

</div>

---

## The site — [`docs/`](docs/)

- **Pain-point matcher.** Pick up to three frustrations (or type your own words) → a ranked
  stack of 3–5 graded skills. Honest by design: keyword matching over a curated set, and an
  explicit *"no match means we haven't graded one yet"* empty state.
- **The graded index.** Every entry shows its grade, all five dimension scores *with the
  one-line why*, install command, and a link to the worksheet that produced the grade.
- **[Methodology page](docs/methodology.html).** The rubric is the product: five dimensions
  (triggering · does-what-it-claims ×2 · docs & install · maintenance · safety), a fixed
  per-skill protocol a solo operator can run in 30–60 minutes, an auto-F safety override,
  90-day staleness flags, and a public dispute path.
- **Take-it-with-you advisor.** One click generates a paste-in prompt embedding the graded
  index, so your own Claude becomes the skill-picker.

**No placeholder grades, ever.** The index starts small (first seeds graded 2026-07-21;
target 25) because every entry costs a real grading run: full source read before anything
executes, five headless trigger probes in fresh sessions, the skill's headline job run in a
sandboxed container against a control. `scripts/validate_index.py` is the honesty gate — it
re-derives every grade from its dimension scores and fails the build on any mismatch.

## The grades — how they're made

```
candidate skill
   │  1. safety read — EVERY line of source, before anything executes
   ▼
clean fixture project (disposable container)
   │  2. five trigger probes, fresh headless session each (3 should-fire, 2 near-miss)
   │  3. its headline claimed job, run once — usually vs a no-skill control run
   ▼
worksheet (grading/worksheets/<id>.md)  ──▶  docs/data/skills.json  ──▶  validate_index.py
                the receipts                     the index                the honesty gate
```

Canonical rubric: [`grading/RUBRIC.md`](grading/RUBRIC.md) ·
worksheet template: [`grading/WORKSHEET_TEMPLATE.md`](grading/WORKSHEET_TEMPLATE.md).
Disagree with a grade? Open an issue — we re-run the protocol and publish the re-test either way.

## The research skill — the engine underneath

Skillproof began as (and still ships) a Claude Code skill that mines YouTube and X for
**sourced, confidence-graded** upgrades to your Claude setup — now also the scouting engine
that finds and vets candidates for the index. Give it a loose prompt; it fans out research
sub-agents, distills findings with a source URL + confidence grade each (anything unsourced
is dropped, not guessed), and proposes changes as diffs you approve. Dry-run by default.

<details>
<summary><strong>Install & use the research skill</strong></summary>

```bash
git clone https://github.com/lucascashwell3-ai/skillproof.git ~/.claude/skills/skillproof
# Local (residential) transcript backend:
pip install youtube-transcript-api
```

```
/skillproof make my Claude Code sub-agents more token-efficient
/skillproof "AI agent eval techniques" --include-x --apply
```

| Flag | Default | Meaning |
|---|---|---|
| `--include-x` | off | Also read X/Twitter. Needs `SKILLPROOF_X_API_KEY`, else skipped silently. |
| `--max-x-reads N` | 200 | Hard cap on X posts read per run. |
| `--backend local\|hosted` | `local` | Transcript backend. **Local works from residential IPs only** — YouTube blocks datacenter IPs; use `hosted` (Supadata / youtube-transcript.io) for cloud runs. |
| `--apply` | off | Propose diffs and write approved ones. Omitted = dry-run. |
| `--auto` | off | Skip the findings-review gate (default is interactive). |
| `--out DIR` | `runs/<date>-<slug>/` | Where `report.md` + `findings.json` land. |

Every run writes `report.md` + machine-readable `findings.json`
(schema: [`references/output-contract.md`](references/output-contract.md); a complete real
run lives in [`examples/`](examples/)). X reads use a third-party API (~$0.03 per 200-read
run), never the official X API. Config: [`.env.example`](.env.example).

</details>

## Repo layout

```
skillproof/
├── docs/                        # THE SITE (GitHub Pages source once public)
│   ├── index.html               #   matcher + graded index
│   ├── methodology.html         #   the published rubric
│   ├── data/skills.json         #   the dataset (validated)
│   └── assets/                  #   styles, app.js, preview image
├── grading/                     # THE RECEIPTS
│   ├── RUBRIC.md                #   canonical rubric, versioned
│   ├── WORKSHEET_TEMPLATE.md
│   └── worksheets/<id>.md       #   one filled worksheet per graded skill
├── scripts/
│   ├── validate_index.py        #   honesty gate for skills.json
│   ├── fetch_transcript.py      #   research-skill backends
│   ├── x_read.py · render_report.py
├── SKILL.md · references/       # the research skill (the scouting engine)
├── examples/                    # a real end-to-end research run
└── docs/architecture.md         # decision record
```

## Credits

Built by [Lucas Cashwell](https://github.com/lucascashwell3-ai). Transcript retrieval by
[`youtube-transcript-api`](https://github.com/jdepoix/youtube-transcript-api) (local) and
[Supadata](https://supadata.ai) / [youtube-transcript.io](https://www.youtube-transcript.io)
(hosted). X reads via [TwitterAPI.io](https://twitterapi.io). MIT licensed.
