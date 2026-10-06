# Skillproof — Query Generation (loose prompt → search plan)

Turn one loose prompt into a small, **logged, editable** search plan *before* any fetching or
spending. Determinism here = reproducible runs.

## The search plan object

```jsonc
{
  "topic": "make Claude Code sub-agents more token-efficient",
  "intent_type": "pain-point",        // research-topic | pain-point | could-do-better
  "core_terms": ["Claude Code", "sub-agents", "context", "tokens"],
  "improvement_lens": "tokens",       // speed | tokens | accuracy | DX | cost | reliability | safety
  "recency": "12mo",                  // default 12mo; power-user tooling moves fast
  "queries": {
    "youtube": ["…", "…", "…"],       // 3–5
    "web":     ["…", "…", "…"],       // 3–5
    "x":       ["…"]                   // only if --include-x
  }
}
```

## Deriving the fields

- **intent_type**
  - `research-topic` — a neutral subject ("MCP servers for data work"). Query broadly, survey-style.
  - `pain-point` — a stated problem ("my sub-agents burn too much context"). Query for fixes/causes.
  - `could-do-better` — a target to upgrade ("my UI is stale"). Query for exemplars + techniques.
- **core_terms** — the concrete tools/nouns named. Keep the product name verbatim (e.g. "Claude Code",
  not "AI coding tool"). These anchor every query so results stay on-topic.
- **improvement_lens** — what "better" means here. Infer from intent if unstated; when ambiguous,
  default to the most load-bearing for the user's stated goal and **state the assumption** in the plan.
- **recency** — default `12mo`. Widen to `24mo` for slow-moving topics, narrow to `3mo` for
  fast-churn ones (model releases, a tool's changelog).

## Expanding into per-source queries (3 for a narrow topic, up to 5 for a broad one)

**YouTube** — creators teach with walkthroughs; bias toward tutorial/《tips》/advanced framings + the
tool + the year:
```
"<core_term> advanced <lens> workflow 2026"
"<core_term> <lens> tips"
"<core_term> tutorial <specific subtopic>"
"how I use <core_term> to <goal>"
```
**Web** — docs, changelogs, best-practice posts, curated lists:
```
"<core_term> <feature> best practices"
"<core_term> <lens> guide"
"<core_term> release notes 2026"
"awesome <core_term>"        # curated GitHub lists
"<core_term> <subtopic> site:github.com"
```
**X** (only if `--include-x`) — practitioner signal, filtered for noise:
```
"<core_term> <lens> min_faves:20"     # cut low-signal posts
"<core_term> tips filter:links"
```
Keep X queries fewest (cost) and always noise-filtered.

## Worked examples

**Topic:** *make Claude Code sub-agents more token-efficient* → lens `tokens`, intent `pain-point`
- YouTube: `Claude Code sub-agents advanced workflow 2026` · `Claude Code token optimization tips` ·
  `Claude Code context management tutorial`
- Web: `Claude Code sub-agents best practices` · `Claude Code context window optimization` ·
  `awesome-claude-code` · `Claude Code sub-agent token cost site:github.com`

**Topic:** *best web-design / UI component libraries & animation techniques* → lens `DX`/quality,
intent `could-do-better`
- YouTube: `best React UI component libraries 2026` · `web design trends 2026 tutorial` ·
  `Framer Motion animation techniques` · `shadcn ui walkthrough`
- Web: `best UI component libraries 2026` · `modern CSS animation techniques guide` ·
  `awesome-web-design` · `Tailwind UI vs shadcn vs Radix` · `micro-interactions best practices`

## Rules

- **Print the plan and pause a beat** — the user can interrupt to edit queries before any spend.
- **Never let X exceed its query budget or the read cap** (enforced again in `scripts/x_read.py`).
- Log the exact plan into the run folder so a run is reproducible and auditable.
