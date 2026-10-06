# Skillproof — Output Contract (Phase 2)

> This is the spec Phase 3 implements. It defines exactly what a run produces: the **Finding**
> object, the **confidence** rubric, the **classification** taxonomy and its decision rules, the
> per-tag **payloads**, dedup/corroboration, the **report** layout, and the **"Do this first"**
> ranking. Two artifacts are emitted per run: a human `report.md` (+ optional gold `report.html`)
> and a machine-readable `findings.json` sidecar that `--apply` consumes.

---

## 1. The Finding object (canonical)

Every finding — the atomic unit — is one JSON object. `report.md` is a rendering of an array of these.

```jsonc
{
  "id": "f-07",                          // stable within a run; used by --apply and the ranked list
  "claim": "Return only a compact JSON summary from each sub-agent instead of prose; the parent re-expands it.",
                                          // 1–2 sentences, in the USER's voice, not a quote
  "source": {
    "type": "youtube",                   // youtube | web | x
    "url": "https://youtu.be/VIDEO_ID?t=1423",
    "timestamp": "23:43",                // REQUIRED for youtube/x video; null for text
    "title": "Advanced Claude Code sub-agent patterns",
    "author": "channel or handle",       // as stated by the source; never inferred
    "published": "2026-05-12"            // ISO date if the source exposes it, else null
  },
  "evidence_quote": "…have the sub-agent hand back a tiny JSON blob, not the whole transcript…",
                                          // SHORT verbatim snippet that anchors the claim in the source
  "confidence": "high",                  // high | moderate | low  (see §2)
  "corroborating_sources": [             // other independent sources asserting the same claim
    { "type": "web", "url": "https://…", "title": "…" }
  ],
  "classification": "integrate-now",     // integrate-now | skill-candidate | behavior-change | ignore (§3)
  "impact": "high",                      // high | med | low   — how much it moves the user's stated goal
  "effort": "trivial",                   // trivial | moderate | involved — cost to adopt
  "rationale": "Directly cuts main-context tokens on every multi-source run; matches the token math in the ADR.",
  "payload": { /* tag-specific — see §4 */ },
  "dedup_key": "subagent:return-json-not-prose"  // canonical slug for claim-level dedup (§5)
}
```

**Hard rules (anti-hallucination — load-bearing):**
- `source.url` MUST resolve. **A finding with no locatable source is dropped, never guessed.**
- `evidence_quote` MUST be a real substring of the fetched source text. If the sub-agent can't quote
  it, the finding does not ship.
- `author`/`title`/`timestamp` are copied from the source, **never inferred**. Unknown → `null`.
- The synthesis layer may **downgrade or keep** confidence; it may **never upgrade** without adding a
  corroborating source.

---

## 2. Confidence rubric

| Level | Meaning | Bar |
|---|---|---|
| **high** | Stated explicitly & unambiguously in the source. | Direct `evidence_quote` that says the thing. |
| **moderate** | Clearly implied or demonstrated, but not stated verbatim; **or** single authoritative source. | Quote shows the behavior/context even if not a literal claim. |
| **low** | Inferred, partial, or from a low-authority / one-off source. | Surfaced but flagged; never auto-applied. |

**Corroboration bump:** the *same* claim from **≥2 independent sources** may raise `moderate → high`
(cite both in `corroborating_sources`). Two uploads of the same video, or a blog that re-embeds the
same video, are **not** independent. Independence is judged on author + platform + url origin.

**Effect on `--apply`:** only `high`- and `moderate`-confidence findings are eligible to be written.
`low` findings are shown for the human but excluded from any auto-apply set.

---

## 3. Classification taxonomy + decision rules

Applied in order; first match wins. This determinism is what makes runs reproducible.

```
1. Is the claim not actually a change to the USER's tooling/workflow (just background/opinion/news)?
      → ignore  (keep it, with a one-line reason, for transparency — do not action)
2. Does adopting it mean a concrete edit to an existing config/command/tool the user already has
   (settings.json, a flag, an MCP entry, an install, a one-line workflow tweak)?
      → integrate-now
3. Is it a repeatable capability big enough to deserve its own reusable skill (a named procedure the
   user would invoke again and again)?
      → skill-candidate
4. Is it a durable behavioral norm — "always/never do X", a default, a house style — that belongs in
   CLAUDE.md rather than in code?
      → behavior-change
```

Guidance for the fuzzy 2-vs-3-vs-4 boundary:
- **integrate-now** = a *thing you turn on/change once*. (Install X. Add this flag. Set this env var.)
- **skill-candidate** = a *procedure you re-run*. (A repeatable multi-step workflow worth packaging.)
- **behavior-change** = a *rule you want obeyed by default*. (No config exists for it; it's a norm.)

---

## 4. Per-tag payloads

### 4a. `integrate-now` → the exact change
```jsonc
"payload": {
  "action": "config-edit",             // config-edit | install | flag | mcp-add | command
  "target": ".claude/settings.json",   // file/tool touched (or "shell", "mcp config")
  "change": "Add \"cleanupPeriodDays\": 30 under the top-level object.",
  "command": null,                     // exact command if action=install/command, else null
  "diff": "…unified diff if it edits a tracked file…"  // present when target is a file
}
```

### 4b. `skill-candidate` → a drop-in SKILL.md stub
The payload is a **ready-to-save SKILL.md** (valid frontmatter within the 1,536-char description cap),
plus a one-line `why_skill`. **Higher bar:** `skill-candidate` requires **≥moderate confidence AND
corroboration (≥2 independent sources)**, or an explicit user yes at the findings gate (§8b) — a skill
is durable, so it's held to a higher standard than a config tweak.
```jsonc
"payload": {
  "why_skill": "This add-and-wire-in flow recurs across every project — worth invoking as one command.",
  "suggested_path": "~/.claude/skills/context-budget/SKILL.md",
  "skill_md": "---\nname: context-budget\ndescription: Report and trim the running context budget for a Claude Code session. Use when the user says the context is getting full, asks to compact, or wants to see what is consuming tokens before a long task.\nallowed-tools: Read, Bash\n---\n\n# Context budget\n\n1. Estimate current context usage …\n2. List the largest consumers …\n3. Propose what to /compact or drop.\n"
}
```
The stub is a *starting point* the user confirms at the findings gate (§8b) — never auto-installed.

### 4c. `behavior-change` → a CLAUDE.md diff block
```jsonc
"payload": {
  "target": "~/.claude/CLAUDE.md",     // or a project CLAUDE.md
  "section": "Operating principles",   // where it lands (append if absent)
  "diff": "@@ CLAUDE.md @@\n+ ## Sub-agent hygiene\n+ When fanning out research sub-agents, instruct each to\n+ return a compact JSON summary, never raw source text. Raw content stays in the sub-agent.\n"
}
```

### 4d. `ignore` → a reason
```jsonc
"payload": { "reason": "General AI-industry commentary; no change to the user's tooling." }
```

---

## 5. Dedup & corroboration

- **Discovery-level dedup:** collapse candidates by canonical id/url (YouTube video ID; normalized
  article URL; X status ID) **before** any fetch — so we never pay to read the same source twice.
- **Claim-level dedup:** at synthesis, collapse findings sharing a `dedup_key` (a normalized slug of
  the claim). Merge their sources into one finding's `corroborating_sources` and apply the §2 bump.
- **Never dedup across different claims** just because they cite the same source.

---

## 6. The report document (`report.md`)

```
# Skillproof report — "<topic>"
<run metadata block>

## Do this first        ← the ranked shortlist (§7), 5–7 items, each linking to its finding
## Integrate now        ← findings, high→low priority
## New skills to scaffold
## Behavior changes (CLAUDE.md)
## Considered & skipped  ← ignore-tagged + dropped-for-no-source (transparency)
## Appendix: sources & coverage
```

**Run metadata block (always present, honest about coverage):**
```
Topic:        make Claude Code sub-agents more token-efficient
Sources:      YouTube 6 · Web 5 · X off
Backend:      local (youtube-transcript-api)     Dry-run: yes
Findings:     14 kept · 3 dropped (no locatable source) · 2 sources blocked (cloud IP)
X budget:     n/a (disabled)
Generated:    2026-07-15
```
If sources were **blocked, skipped, or capped**, the block says so explicitly. **No silent
truncation** — a partial run must announce it is partial.

**Each rendered finding** shows: the claim, a `confidence` chip, the source link (with timestamp),
the evidence quote (collapsed), impact/effort, and its payload (the diff / stub / command).

---

## 7. "Do this first" ranking

```
priority = (impact_w × confidence_w) / effort_w
  impact_w:     high 3 · med 2 · low 1
  confidence_w: high 3 · moderate 2 · low 1
  effort_w:     trivial 1 · moderate 2 · involved 3
```
Sort desc by `priority`. Tie-break: tag order (`integrate-now` > `behavior-change` > `skill-candidate`),
then confidence. `low`-confidence items may appear in the report but are **suppressed from the top of
the shortlist** unless nothing else qualifies. Each shortlist row shows the score components so the
ranking is legible, e.g. `impact:high × conf:high / effort:trivial = 9.0`.

---

## 8. `findings.json` sidecar + the `--apply` handshake

- Every run writes `findings.json` = the raw Finding array. `report.md` is its rendering.
- **Dry-run (default):** nothing is written outside the run's own output folder.
- **`--apply`:** Skillproof presents each eligible finding's diff/stub **one at a time** and writes
  ONLY on an explicit per-item yes. Eligibility = `confidence ∈ {high, moderate}` AND a concrete
  `payload.diff`/`skill_md`/`command`. `low`-confidence and `ignore` items are never in the apply set.
- A file write is refused if the target's current content doesn't match the diff's context (no blind
  overwrite). Backups are made before any edit to an existing file.

---

## 8b. Findings-review gate & the skill-candidate bar

Two checkpoints protect **relevance + quality**, not just truth:

1. **Findings gate (default; `--auto` skips).** After synthesis and before any actionable payload is
   built, the run presents every finding — `claim` · `confidence` · source (✓ if corroborated) ·
   proposed tag · impact/effort — and the user **approves / rejects / reclassifies**. Only approved
   findings get a diff/stub/command and become `--apply`-eligible. Rejected → *Considered & skipped*.
2. **Skill-candidate bar (always on).** A skill is durable, so `skill-candidate` is held higher than a
   config tweak: it needs **≥moderate confidence AND corroboration (≥2 independent sources)**, or an
   explicit user yes at the gate, plus a one-line `why_skill`. Below the bar it's surfaced as a
   *proposal to confirm* — never auto-built.

Modes: `--interactive` (default) runs the gate; `--auto` runs straight through (still enforcing the bar
and recording every decision). `--apply` keeps its own per-item approval on top of either. Net effect:
**nothing becomes a skill or a `CLAUDE.md` edit until the user has seen what was found and how
well-sourced it is.**

---

## 9. Worked micro-examples (illustrative format only — NOT real findings)

> Placeholders below show the *shape*. Real runs carry resolving URLs + verbatim quotes or they don't ship.

**integrate-now** — `Set a settings.json cleanup window` · conf: moderate · impact: low · effort: trivial
→ payload.diff edits `.claude/settings.json`.

**skill-candidate** — `context-budget` skill (see §4b) · conf: high · impact: med · effort: moderate
→ payload.skill_md is a drop-in SKILL.md.

**behavior-change** — `Add a "Sub-agent hygiene" norm to CLAUDE.md` · conf: high · impact: high · effort: trivial
→ payload.diff appends to `~/.claude/CLAUDE.md`.

Shortlist would rank the behavior-change first (9.0), the skill second (4.0), the config edit last (2.0).
