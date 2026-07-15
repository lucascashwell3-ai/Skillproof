---
name: goldproof
description: >-
  Research a loose topic, pain point, or "what could my setup do better" across YouTube (and
  optionally X) and distill it into concrete, SOURCED upgrades to the user's own tooling — things to
  integrate now, new skills to scaffold, and CLAUDE.md / behavior edits. Every finding carries a
  source URL (+ timestamp for video) and a confidence level; findings without a locatable source are
  dropped, never guessed. Spawns research sub-agents so raw transcripts never enter the main context.
  Proposes diffs and requires approval before writing any file — dry-run by default.
when_to_use: >-
  Use when the user wants to mine external creators/practitioners for actionable improvements to their
  Claude Code workflow, skills, or config: "what am I missing on <topic>", "research <topic> and tell
  me what to change", "find tips/skills to improve <X>", or when they point at a stale/weak part of
  their build and want researched, sourced fixes. Do NOT use for general web research with no
  tooling-change output, for answering factual questions, or when the user just wants a summary.
allowed-tools: Agent, Task, WebSearch, WebFetch, Read, Write, Edit, Grep, Glob, Bash(python3 *), Bash(mkdir *)
argument-hint: "<loose topic or pain point> [--include-x] [--max-x-reads N] [--backend local|hosted] [--apply] [--out DIR]"
---

# Goldproof

Orchestrate research sub-agents to turn a loose prompt into sourced, confidence-graded upgrades to the
user's own tooling. **You are the brain; retrieval is off-the-shelf** (WebSearch + an existing
transcript library + optional third-party X reader). Never build a scraper. Never fabricate a source.

Load these as you go (progressive disclosure — don't read them all up front):
- `references/query-generation.md` — loose prompt → search plan
- `references/output-contract.md` — the Finding schema, confidence rubric, classification rules, ranking
- `references/subagent-prompts.md` — the fetch-and-distill sub-agent prompt (anti-hallucination baked in)

`${CLAUDE_SKILL_DIR}` is this skill's directory; use it to reference `scripts/` and `references/`.

---

## 0 · Parse inputs

Extract the topic (everything not a flag) and flags:
`--include-x` (default OFF) · `--max-x-reads N` (default 200; hard cap) · `--backend local|hosted`
(default `local`, or `$GOLDPROOF_TRANSCRIPT_BACKEND`) · `--apply` (default OFF = dry-run) ·
`--out DIR` (default `runs/<date>-<slug>/`). Also honor caps `$GOLDPROOF_MAX_YOUTUBE` (8),
`$GOLDPROOF_MAX_WEB` (5). Echo the resolved config back to the user in one line before running.

## 1 · Build the search plan

Follow `references/query-generation.md`. From the topic derive `intent_type`, `core_terms`,
`improvement_lens`, and `recency`, then expand into **3–5 queries per enabled source** (YouTube, web,
and X only if `--include-x`). **Print the plan** so the user can see (and interrupt to adjust) the
queries before anything is fetched or spent.

## 2 · Discovery (candidates only — no content yet)

Spawn discovery sub-agents (Agent tool) in parallel — one per source type — each returning a
lightweight candidate list `{type, id, url, title, author?, published?}`, **not** content:
- **YouTube:** the sub-agent runs `WebSearch` on the YouTube queries, extracts video URLs/IDs.
- **Web:** the sub-agent runs `WebSearch` on the web queries, returns article/doc/repo URLs.
- **X (only if `--include-x` AND `$GOLDPROOF_X_API_KEY` set):** discovery+fetch happen together in
  step 4 via the reader (search returns the posts). If the key is missing, **skip X silently** — do
  not warn, do not ask.

## 3 · Dedup + cap (enforce budgets BEFORE paid reads)

Merge candidate lists; drop duplicates by canonical id/url. Cap to `MAX_YOUTUBE` / `MAX_WEB` by a
relevance+recency heuristic. For X, compute the intended read count and **clamp to `--max-x-reads`;
refuse to exceed it** and log what you dropped. If a source count was cut, remember it — the report
must disclose it (no silent truncation).

## 4 · Fetch + distill (raw text stays in the sub-agent)

For **each** capped source, spawn a sub-agent (Agent tool) using the template in
`references/subagent-prompts.md`. Run them in parallel batches (respect the source caps). Each
sub-agent:
- **YouTube:** run `python3 ${CLAUDE_SKILL_DIR}/scripts/fetch_transcript.py <url> --backend <backend>`.
  On `local` from a datacenter/blocked IP this raises a block error — the sub-agent then falls back to
  `WebFetch` on the video page (title/description only) or **returns no findings for that source**. It
  never invents transcript content.
- **Web:** `WebFetch` the URL, read the page text.
- **X:** run `python3 ${CLAUDE_SKILL_DIR}/scripts/x_read.py search "<query>" --max <remaining_budget>`;
  the script enforces the cap and prints posts as JSON.
- Then extract candidate findings and **return ONLY the structured Finding JSON** (see the schema in
  `references/output-contract.md`): `claim` (in the user's voice), `source{url,timestamp,title,author}`,
  a short verbatim `evidence_quote`, and a first-pass `confidence`. **No raw transcript, no page dump.**
  If the sub-agent cannot quote the claim from the fetched text, it must drop that finding.

The parent sees only the returned Findings (~200–400 tokens each), never the raw sources.

## 5 · Synthesis

Collect all returned Findings. Then, per `references/output-contract.md`:
- **Claim-level dedup:** merge findings sharing a `dedup_key`; move extra sources into
  `corroborating_sources`; apply the corroboration bump (`moderate→high` only when ≥2 *independent*
  sources agree). Never upgrade confidence without an added source.
- **Classify** each finding with the ordered decision rules → `integrate-now` | `skill-candidate` |
  `behavior-change` | `ignore`, and attach the tag's payload (the exact command/config, a drop-in
  `SKILL.md` stub, or a `CLAUDE.md` diff block).
- **Score** `priority = (impact_w × confidence_w) / effort_w` for the ranked shortlist.
- **Drop, don't guess:** any finding still lacking a resolving `source.url` is discarded and counted.

## 6 · Write the report

`mkdir -p <out>` and write:
- `report.md` — rendered per the §6 layout in the output contract (run-metadata block first, then
  `Do this first`, then findings grouped by tag, then `Considered & skipped`, then the sources
  appendix). The metadata block must state honest coverage (counts, dropped, blocked, X budget).
- `findings.json` — the raw Finding array (what `--apply` consumes).
- (optional) `report.html` — a themed, shareable view:
  `python3 ${CLAUDE_SKILL_DIR}/scripts/render_report.py <out>/findings.json -o <out>/report.html`.
- Tell the user the paths and print the **Do this first** shortlist inline.

## 7 · Propose (dry-run default) / apply

- **Default (dry-run):** write nothing outside `<out>`. Summarize the shortlist and stop.
- **`--apply`:** for each eligible finding (`confidence ∈ {high, moderate}` AND a concrete
  `diff`/`skill_md`/`command`), show its payload and **ask for an explicit per-item yes** before
  writing. Back up any file you edit; refuse a write whose target no longer matches the diff's
  context. `low`-confidence and `ignore` findings are never in the apply set. Never write to a
  `CLAUDE.md` or settings file without both `--apply` and a live yes.

---

## Guardrails (non-negotiable)

1. **Every finding is sourced.** No resolving URL → dropped, not guessed. Attribute only to the source
   a sub-agent was handed; never invent authors, titles, or timestamps.
2. **Raw content never enters the main context** — that is the entire point of the fetch sub-agents.
3. **X is opt-in and hard-capped.** Off by default; needs `--include-x` + a key; never exceeds
   `--max-x-reads`; missing key → skip silently.
4. **Dry-run by default.** Files change only with `--apply` and per-item approval.
5. **Disclose partial coverage.** Blocked/skipped/capped sources are named in the report.
