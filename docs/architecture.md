# Goldproof — Architecture Decision Record

> **Status:** Phase 1 (Recon) complete — awaiting review before build.
> **Date:** 2026-07-15
> **Supersedes:** working name `skill-scout`.

---

## 0. TL;DR (plain English)

**Goldproof** is a Claude Code skill. You give it a loose prompt — a topic, a pain point, or
"things I think my build could do better." It fans out research **sub-agents** that pull knowledge
from **YouTube transcripts** (and, only if you opt in, **X/Twitter posts**), boils the raw firehose
down to a handful of **sourced, confidence-graded findings**, and turns those into **actionable
changes to your own tooling**: things to integrate now, new skills to scaffold, and
`CLAUDE.md` / behavior edits — proposed as **diffs you approve**, never written silently.

The name: it joins the **`-proof` family** (DATproof, Modelproof). "Proof" is load-bearing here, not
decorative — *proving* gold means assaying its purity, and a *proof* is the highest-grade strike. That
is exactly what this pipeline does to every finding: source it, grade its purity (confidence), discard
the dross. It also welds to the gold design system (Phase 4). Fallbacks if rejected: **Toolproof** /
**Stackproof**. One-word change.

**Two corrections to the original brief surfaced during recon — read §8 before approving.**

---

## 1. What we verified (don't assume — recon results)

Every component below was checked against current (July 2026) sources, cited inline.

### 1.1 Transcript retrieval — the pluggable fetcher

| Backend | Component | Why |
|---|---|---|
| **`local`** (default, personal) | **`youtube-transcript-api` v1.2.4** (Python) | No key, no browser. Works from **residential** IPs. |
| **`hosted`** (cloud/routine) | **Supadata** (default) → **youtube-transcript.io** (fallback) | Server-side proxy fleets → **works from cloud/datacenter IPs**. |
| *optional 3rd* | a transcript **MCP server** | Auto-used *if present*; never required. |

- **Current API is instance-based** (changed at v1.0.0 — the old static `get_transcript()` is gone):
  ```python
  from youtube_transcript_api import YouTubeTranscriptApi
  YouTubeTranscriptApi().fetch(video_id)     # not get_transcript(); pass the ID, not the URL
  ```
  Proxy support is built in (`WebshareProxyConfig`, `GenericProxyConfig`).
  Sources: [PyPI](https://pypi.org/project/youtube-transcript-api/) ·
  [GitHub README](https://github.com/jdepoix/youtube-transcript-api)
- **The cloud-IP wall, verbatim from the README:** *"YouTube has started blocking most IPs that are
  known to belong to cloud providers (like AWS, Google Cloud Platform, Azure, etc.), which means you
  will most likely run into `RequestBlocked` or `IpBlocked` exceptions when deploying your code to
  any cloud solutions."* → this single fact is **why `local` vs `hosted` exists.**
- **Hosted pricing** (works from cloud IPs): Supadata — free 100 credits/mo, paid from **$17/mo /
  3,000 credits** ([pricing](https://supadata.ai/pricing)); youtube-transcript.io — free 25/mo, Pro
  **$24.99/mo / 3,000** ([pricing](https://www.youtube-transcript.io/pricing)). SearchAPI.io and
  Dumpling AI are viable alternates; Tactiq is a UI tool, not a clean API — excluded.

### 1.2 X / Twitter reader (OFF by default)

- **Default reader: TwitterAPI.io** — third-party (not affiliated with X), pay-per-use, **no
  subscription / no minimum / no monthly cap**, single API-key header auth, **1,000+ QPS**.
  75+ endpoints incl. advanced tweet search + user timeline.
  Sources: [pricing](https://twitterapi.io/pricing) · [limits](https://twitterapi.io/qps-limits) ·
  [docs](https://docs.twitterapi.io/introduction)
- **Verified per-read cost: ~$0.00015 / tweet ($0.15 per 1,000).** A 200-read run ≈ **$0.03.**
- Competitor class (documented as swappable): Apify actors ($0.15–0.40/1K), Bright Data
  ($1.50/1K, enterprise), ScrapeCreators (PAYG). SocialData.tools **shut down — do not use.**
- **Official X API excluded** — since **Feb 6 2026** it defaults to pay-per-use at **$0.005/read**
  (33× TwitterAPI.io), capped 2M/mo, **no viable free read tier**
  ([X announcement](https://devcommunity.x.com/t/announcing-the-launch-of-x-api-pay-per-use-pricing/256476)).

### 1.3 Skill + sub-agent mechanics (official docs)

- **SKILL.md frontmatter** ([reference](https://code.claude.com/docs/en/skills.md#frontmatter-reference)):
  `name`, `description`, `when_to_use` (combined `description`+`when_to_use` **capped at 1,536 chars** —
  this governs trigger tuning in Phase 3), `allowed-tools`, `disallowed-tools`, `model`, `effort`,
  `context: fork`, `agent`, `argument-hint`, `arguments`, `paths`, `hooks`, `shell`,
  `disable-model-invocation`, `user-invocable`.
- **`allowed-tools` only *pre-approves*, it does NOT restrict** — every tool stays callable; it just
  suppresses permission prompts for the listed ones.
- **No MCP-dependency field exists.** Skills **assume MCP tools are present and degrade silently if
  absent.** → Our "X off / skip silently if no key" and "use transcript MCP only if present" behaviors
  are the *idiomatic* pattern, not a hack. Optional deps get documented in the README, not declared.
- **Bundled scripts** run via `Bash` and resolve with **`${CLAUDE_SKILL_DIR}`** (v2.1.196+) — the home
  for our pluggable Python fetcher.
- **Sub-agents (the Agent/Task tool)** — [docs](https://code.claude.com/docs/en/sub-agents.md):
  each runs in its **own isolated context window**; **only its final text returns** to the caller —
  raw transcripts never enter the main context. **Nesting max 5 levels** (we use 2). No hard
  concurrency cap, but "many detailed results consume context" → **we cap source count.** Custom
  sub-agent types live in `.claude/agents/*.md`.

---

## 2. Chosen architecture

**The skill is the orchestrator (the brain). Retrieval is off-the-shelf.** We reinvent nothing:
discovery = `WebSearch`; transcript = existing library/API; X = existing third-party reader.

```
                    ┌─────────────────────────  MAIN THREAD (cheap, stays clean)  ─────────────────────────┐
  loose prompt ─▶  1. INTAKE + flags
                   2. QUERY-GEN            loose prompt → search plan (3–5 queries per enabled source)
                   3. DISCOVERY (sub) ───▶ per query: find candidate IDs/URLs  ──┐  returns lists only
                   4. DEDUP + CAP  ◀───────────────────────────────────────────┘  (title,url,id,date)
                        │  enforce source caps + X budget cap HERE (before any paid read)
                        ▼
                   5. FETCH+DISTILL (sub, 1 per source) ─▶ raw text stays IN the sub-agent
                        │                                    returns ~200–400 tok structured findings
                        ▼
                   6. SYNTHESIS           merge · collapse dup claims · corroboration · classify
                   7. REPORT              markdown (+ optional gold HTML); ranked "do this first"
                   8. PROPOSE             dry-run diffs → require approval → (--apply) write
                    └──────────────────────────────────────────────────────────────────────────────────────┘
```

**Discovery vs. Fetch — a distinction the brief didn't call out:** the transcript library *fetches*
a transcript given a video **ID**; it does **not search**. So step 3 (find candidate videos) uses the
off-the-shelf **`WebSearch`** tool (YouTube-targeted queries → parse video IDs), with an optional
YouTube Data API key for richer discovery. Step 5 then fetches transcripts for those IDs. Web sources:
`WebSearch` → `WebFetch`. X: TwitterAPI.io search *is* discovery+fetch in one call (hence the cap gates it).

### 2.1 Sub-agent orchestration + token math (why this shape)

A single 30–60 min YouTube transcript ≈ **6k–15k tokens**. Fifteen sources = **~90k–225k tokens of
raw text.** Pulling that into the main thread blows the window and buries the signal.

**One fetch sub-agent per source.** Each ingests ~6–15k raw tokens and returns **~200–400 tokens** of
structured findings. Main thread sees `N × ~300` — a few thousand tokens for 15 sources instead of
~150k. **≈ 30–50× compression of the raw layer**; the main context holds the *synthesis*, not the ore.

- **Context win (big):** main window stays clean → synthesis quality stays high; approval UX stays usable.
- **Cost honesty:** you still pay to read the ore *somewhere* — total tokens are ~linear in source
  count. The win is **context + parallel wall-clock**, not free reads. → **cap source count** (default
  ≤ ~8 YouTube + ~5 web per run; configurable) and log anything dropped. No silent truncation.

### 2.2 Anti-hallucination model (load-bearing)

- **Every finding carries a resolvable `source_url` (+ `timestamp` for video) and a short verbatim
  `evidence_quote`.** No locatable source → the finding is **dropped, not guessed.**
- **Confidence rubric:**
  - **high** — claim stated explicitly/unambiguously in the source (with the evidence quote).
  - **moderate** — clearly implied/demonstrated but not verbatim; or single authoritative source.
  - **low** — inferred/partial, or a low-authority one-off. Surfaced but flagged.
- **Corroboration** — the same claim from ≥2 independent sources may raise moderate→high (cite both).
- **Sub-agents are instructed:** attribute ONLY to the source you were handed; never invent author
  names, titles, or timestamps; if you can't find the claim in the fetched text, don't emit it.
- **Synthesis can only downgrade or keep confidence, never upgrade without adding a source.**

---

## 3. Search-query generation (loose prompt → 3–5 queries/source)

From the loose prompt, the orchestrator builds a small, logged **search plan** (reproducible +
user-editable) before any fetching:

- `intent_type`: `research-topic` | `pain-point` | `could-do-better` (reframes the queries)
- `core_terms[]`: the tools/nouns named (e.g. "Claude Code", "sub-agents", "hooks")
- `improvement_lens`: speed | tokens | accuracy | DX | cost | reliability | safety (inferred if unset)
- `recency`: default **last 12 months** (power-user tooling moves fast); overridable

Expanded into per-source query sets (**3 for a narrow prompt, up to 5 for a broad one**):
- **YouTube:** walkthrough/"tips"/"advanced" framings + tool + year — e.g.
  `Claude Code sub-agents advanced workflow 2026`, `Claude Code token optimization tips`.
- **Web:** docs/changelog/best-practice framings — `Claude Code <feature> best practices`,
  `<tool> release notes`, `awesome-claude-code`.
- **X** (only if `--include-x`): practitioner-signal framings with noise filters —
  `Claude Code <feature> min_faves:20`, recency-bounded.

The plan is printed so you can see and adjust the queries before the run spends anything.

---

## 4. Output contract (preview — full spec is Phase 2)

Each finding emits: `claim` (1–2 sentences, your voice) · `source_url` (+`timestamp`) · `confidence` ·
a **classification tag** → and a tag-specific payload:

| Tag | Payload |
|---|---|
| `integrate-now` | the exact tool / command / config change |
| `skill-candidate` | a stub **SKILL.md** (name + description block, drop-in ready) |
| `behavior-change` | a concrete **CLAUDE.md diff block** |
| `ignore` | one-line reason (kept for transparency, not actioned) |

Every report ends with a ranked **"Do this first"** list. **Dry-run by default;** `--apply` writes
files only behind explicit per-diff approval.

---

## 5. Configuration surface (env vars + flags)

```
# Transcript
GOLDPROOF_TRANSCRIPT_BACKEND      local | hosted        (default: local)
GOLDPROOF_TRANSCRIPT_API_KEY      key for hosted backend
GOLDPROOF_TRANSCRIPT_HOSTED_PROVIDER  supadata | youtube-transcript-io   (default: supadata)
# Discovery (optional)
GOLDPROOF_YOUTUBE_DATA_API_KEY    richer video discovery; falls back to WebSearch if unset
# X (all optional; absent key ⇒ X skipped silently)
GOLDPROOF_X_API_KEY               TwitterAPI.io key
GOLDPROOF_X_MAX_READS             hard per-run cap (default: 200 ≈ $0.03); run refuses to exceed
# Caps
GOLDPROOF_MAX_YOUTUBE / GOLDPROOF_MAX_WEB   source-count caps (default 8 / 5)
```
Flags: `--include-x` (required to touch X at all) · `--max-x-reads N` · `--backend local|hosted` ·
`--apply` (off by default = dry-run).

---

## 6. Failure modes (and mitigations)

1. **Cloud-IP blocking (YouTube).** `local` dies on datacenter IPs. → pluggable `hosted` backend;
   residential-proxy option for `local`; on block, **fall back / skip the source — never fabricate**.
   *(Verified live 2026-07-15: from this cloud container the local fetch fails with a `ProxyError`
   before even reaching YouTube — egress is restricted — so the shipped example uses harness
   `WebSearch`/`WebFetch` retrieval, and YouTube-transcript findings are for residential runs.)*
2. **X cost blowout.** → OFF by default; `--include-x` required; **hard `--max-x-reads` enforced
   *before* any read** (refuse to exceed, log skipped); no key ⇒ skip silently.
3. **Context bloat.** → sub-agent isolation + source-count caps + short evidence quotes.
4. **Dedup failures** (re-uploads, same claim across sources). → canonical id/url dedup at discovery;
   claim-level near-dup collapse at synthesis.
5. **Hallucinated attributions.** → drop-if-unsourced rule (§2.2).
6. **No captions / private / age-gated video.** → skip + log; never guess content.
7. **Rate-limit / API errors.** → per-source try/except in the sub-agent; a dead source returns
   "no findings," not a crash; run continues with partial coverage and **says so**.
8. **Skill over/under-triggering.** → precise `description`+`when_to_use` within the 1,536-char cap (Phase 3).
9. **Bad diffs.** → dry-run default + per-diff approval; nothing written without `--apply` **and** a yes.

---

## 7. Repo layout (proposed)

```
goldproof/
├── SKILL.md                     # frontmatter (trigger) + orchestration instructions
├── scripts/
│   ├── fetch_transcript.py      # local + hosted backends behind one interface
│   └── x_read.py                # TwitterAPI.io reader w/ hard cap
├── references/
│   ├── query-generation.md      # the search-plan spec
│   ├── output-contract.md       # full Phase-2 schema
│   └── subagent-prompts.md      # fetch+distill prompt templates (anti-hallucination baked in)
├── examples/
│   └── <sample-topic>/          # one real end-to-end run (Phase 3/4)
├── report-template.html         # gold/cosmic HTML report (Phase 4 design system)
├── portfolio/index.html         # self-contained showcase page (Phase 4)
├── README.md · LICENSE (MIT) · .env.example
└── docs/architecture.md         # this file
```

---

## 8. ⚠️ Corrections to the original brief (need your ack before build)

1. **Transcript source is a *library*, not necessarily an *MCP*.** Your constraint #3 named an
   "existing transcript MCP." Recon says: existing transcript MCPs just wrap `youtube-transcript-api`
   and **inherit the same cloud-IP block**, while adding a config/process/version failure surface. So
   the default is **call the library directly via a Bash step inside the fetch sub-agent**; an MCP
   server is supported as an *optional* backend if you already run one. Still fully off-the-shelf —
   we're using jdepoix's library, not building a scraper. **This is my recommended default; confirm.**

2. **The `$0.005/read` + `2M/mo cap` in your brief are the *official X API* numbers, not the
   third-party's.** The third-party default (**TwitterAPI.io**) is **~$0.00015/read — 33× cheaper**.
   Nothing about the design changes (still gated + hard-capped), but the cost math in the docs uses
   **$0.00015/read** and the budget cap becomes very comfortable (200 reads ≈ $0.03). Flagging so the
   published caveats are accurate.

**Verify-before-publish (not build-blockers):** two primary pricing pages (twitterapi.io, supadata.ai)
403'd on direct fetch (Cloudflare); figures are corroborated across ≥2 independent 2026 sources each.
**Re-check the exact cents live before Phase 4 publish.**

---

## 9. Definition of done (unchanged from brief)

Runs end-to-end on one sample topic → a sourced report + ≥1 skill-candidate stub + ≥1 CLAUDE.md diff;
every claim carries source + confidence; **X disabled; dry-run by default.**

## 10. Decisions (resolved 2026-07-15)

- **Name:** ✅ **Goldproof** (joins the `-proof` family; fallbacks Toolproof/Stackproof).
- **Correction #1** (library-first, MCP-optional): ✅ approved — this is the default.
- **Correction #2** (X pricing = official API's numbers; third-party is 33× cheaper): ✅ acknowledged.
- **Sample topics — TWO example runs:**
  1. **"Make Claude Code sub-agents more token-efficient"** — dogfoods Goldproof on its own architecture.
  2. **"Best web-design / UI component libraries & animation techniques"** (headline showcase) — surfaces
     UI libraries, components, and motion patterns to de-stale real sites. Broad appeal beyond the author.
- **New GitHub repo** — create `goldproof` (public, MIT) at Phase 4, pending an explicit "yes" then.
