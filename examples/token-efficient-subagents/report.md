# ✦ Skillproof report — "make my Claude Code sub-agents (and sessions) more token-efficient"

```
Topic:      make my Claude Code sub-agents + sessions more token-efficient
Stack:      Claude Code power user · also runs Modelproof (informed model selection)
Sources:    Web 8 · YouTube 0 · X off
Backend:    local            Dry-run: yes
Findings:   16 kept (2 corroborated-and-merged from 18) · 0 dropped · 0 fabricated
X budget:   n/a (disabled)
Generated:  2026-07-15
```

> **This run dogfoods Skillproof** — it researches how to make sub-agents token-efficient, which is
> exactly Skillproof's own architecture. All 8 sources are official Anthropic / Claude Code docs.
> Three practitioner blogs were egress-blocked (403) and **excluded rather than guessed**. Two claims
> were **corroborated by ≥2 independent official pages** (f-01, f-07) — confidence held at `high` with
> both sources cited. `YouTube 0`: local backend IP-blocked from this cloud container (the documented
> caveat); a residential run would add creator-video findings with timestamps.

---

## ▶ Do this first

Ranked by `priority = (impact × confidence) / effort`.

| # | Change | Why it ranks | Score |
|---|---|---|---|
| 1 | **`model: haiku` on every mechanical sub-agent** — [f-01](#f-01) *(corroborated)* | high · high · trivial | `9.0` |
| 2 | **Tell each sub-agent the compact output to return** — [f-08](#f-08) | high · high · trivial | `9.0` |
| 3 | **Delegate verbose/research work to sub-agents** — [f-07](#f-07) *(corroborated)* | high · high · trivial | `9.0` |
| 4 | **Routing default: Haiku → Sonnet → Opus (Opus only for hard synthesis)** — [f-11](#f-11) | high · high · trivial | `9.0` |
| 5 | **Tune effort before switching models** — [f-12](#f-12) | high · high · trivial | `9.0` |
| 6 | **Shadow Explore with `model: haiku`** — [f-02](#f-02) | med · high · trivial | `6.0` |
| 7 | **`/model opusplan` (Opus plans, Sonnet executes)** — [f-04](#f-04) | med · high · trivial | `6.0` |

Five of these are zero-dependency wins — frontmatter lines and a CLAUDE.md norm. Do them first.

---

## ⚙ Integrate now

<a id="f-01"></a>**f-01 · `model: haiku` on mechanical sub-agents** &nbsp;`high` · impact high · effort trivial · **corroborated**
The `model` field defaults to `inherit` (your expensive main-session model) if omitted.
› `~/.claude/agents/<agent>.md` frontmatter → add `model: haiku`
› sources: [sub-agents](https://code.claude.com/docs/en/sub-agents) — *"routing tasks to faster, cheaper models like Haiku"* · corroborated by [costs](https://code.claude.com/docs/en/costs) — *"specify `model: haiku`"*

<a id="f-02"></a>**f-02 · Shadow Explore with `model: haiku`** &nbsp;`high` · impact med · effort trivial
Explore inherits your main model (up to Opus) unless you override it.
› create `~/.claude/agents/Explore.md` with `model: haiku`
› source: [sub-agents](https://code.claude.com/docs/en/sub-agents) — *"define one with `model: haiku` to keep exploration on a lower-cost model"*

<a id="f-04"></a>**f-04 · `/model opusplan`** &nbsp;`high` · impact med · effort trivial
Opus during plan mode, auto-switch to Sonnet for execution — Opus rates only for planning.
› `/model opusplan` (or set as a standing default)
› source: [model-config](https://code.claude.com/docs/en/model-config) — *"uses `opus` during plan mode, then switches to `sonnet` for execution"*

<a id="f-05"></a>**f-05 · Move workflow rules from CLAUDE.md → skills** &nbsp;`high` · impact high · effort moderate
Everything in CLAUDE.md loads every session even when irrelevant; keep it < 200 lines.
› move per-workflow rules to `~/.claude/skills/<name>/SKILL.md`; trim CLAUDE.md to essentials
› source: [costs](https://code.claude.com/docs/en/costs) — *"keep CLAUDE.md under 200 lines by including only essentials."*

<a id="f-06"></a>**f-06 · Trim MCP servers; inspect the window** &nbsp;`high` · impact high · effort moderate
› `/mcp` (disable unused) · `/context` (see consumers) · prefer `gh` CLI over MCP where possible
› source: [costs](https://code.claude.com/docs/en/costs) — *"Run `/mcp` … disable any you're not actively using."*

<a id="f-03"></a>**f-03 · Scope a heavy MCP server to one sub-agent** &nbsp;`high` · impact med · effort moderate
Define it inline in the sub-agent's `mcpServers` frontmatter, not `.mcp.json`, so its tool descriptions never tax the main context.
› source: [sub-agents](https://code.claude.com/docs/en/sub-agents) — *"The subagent gets the tools; the parent conversation doesn't."*

---

## 🧩 New skills to scaffold

None this run — every finding was a config change or a durable norm, not a repeatable procedure worth
packaging. (Skillproof doesn't invent skill-candidates to hit a quota; it reports what the sources support.)

---

## 📐 Behavior changes → one `CLAUDE.md` block

Ten findings are durable norms. Skillproof would propose this single diff (dry-run — nothing writes without `--apply`):

```diff
@@ ~/.claude/CLAUDE.md @@
+ ## Sub-agent & token hygiene
+ - Delegate verbose/research-heavy work (many file reads, test runs, doc fetches) to a sub-agent;
+   only a short summary returns to the main thread.              [f-07, high · corroborated]
+ - Every sub-agent prompt must specify the compact output to return; never dump raw walls of text back. [f-08, high]
+ - Don't delegate quick single-fact lookups or small edits — sub-agents start empty + add latency; do those inline. [f-09, high]
+ - Parallel fan-out multiplies tokens (each agent has its own window; agent teams ≈ 7×). Keep batches small. [f-10, high]
+
+ ## Model routing
+ - Routing default: Haiku = simple/mechanical, Sonnet = most work, Opus = hardest synthesis only.  [f-11, high]
+ - Before switching to a bigger model, tune effort (low/medium mechanical, xhigh hard work).        [f-12, high]
+ - Price anchor: Haiku 4.5 $1/$5 vs Opus 4.8 $5/$25 per MTok (5×); mechanical volume off Opus ≈ 80% cheaper. [f-13, high]
+
+ ## Context hygiene
+ - Prune CLAUDE.md per line: "would removing this cause a mistake?" If not, cut it — bloat buries real rules. [f-14, high]
+ - Before a long new task mid-session, `/compact` with a focus rather than waiting for auto-compaction. [f-15, high]
+ - Keep the MCP/tool set stable within a session — changing tool definitions invalidates the whole prompt cache. [f-16, moderate]
```

Sources: sub-agents + costs (f-07..f-10), pricing + choosing-a-model (f-11..f-13), best-practices +
context-window + prompt-caching (f-14..f-16) — all linked in `findings.json`.

---

## 🗂 Considered & skipped / coverage

- **0 dropped for a missing source; 0 fabricated.** Three practitioner blogs (hackernoon, amitkoth,
  richsnapp) 403'd and were excluded — findings anchored to official docs instead.
- **Corroboration in action:** f-01 and f-07 each appeared on two independent official pages; the two
  pairs were merged (18 → 16) with both URLs retained.
- **YouTube (0):** local backend IP-blocked here — a residential run adds creator-video findings.

---

## 📎 Appendix — sources (8, all official)

sub-agents · costs · best-practices · context-window · model-config (code.claude.com) ·
pricing · choosing-a-model · prompt-caching (platform.claude.com).

*Machine-readable: [`findings.json`](findings.json) · themed HTML: [`report.html`](report.html).*
*Generated by [Skillproof](../../README.md) — dry-run, X disabled. Every claim carries a source + confidence.*
