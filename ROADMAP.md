# Skillproof — roadmap / not-yet-done

Status: built end-to-end, **private** repo, pre-public polish. Tracking what's left before going public.

## Before public
- [x] **Lock the final name** — **Skillproof**, decided 2026-07-19. Renamed everywhere (skill
      invocation name, `SKILLPROOF_*` env vars, docs, scripts, portfolio page, example run outputs).
      Standalone repo, not folded into Modelproof. (Modelproof link still exists via the
      token-efficiency example's model-routing findings — a bridge, not a merge.)
- [ ] **Design overhaul of the showcase + report template** _(Lucas, 2026-07-15)_ — apply the
      UI / animation / design findings Skillproof itself surfaced (define a type scale, single spacing
      base, Motion for entrances, layered shadow + easing tokens, view-transitions, prefers-reduced-motion)
      to `portfolio/index.html` and the `render_report.py` theme. Dogfood the tool's own output on its
      own site — a strong portfolio narrative.
- [ ] **Verify paid backends live with real keys** — the hosted transcript providers (Supadata,
      youtube-transcript.io) and TwitterAPI.io happy-paths are structurally correct but untested here
      (no keys; two pricing pages 403'd during recon). Confirm endpoints + exact per-read price before
      publishing the cost claims.
- [ ] **Add a residential YouTube-transcript finding to an example** — this cloud env IP-blocks the
      local backend, so both example runs are web-sourced. A run from a residential machine would add a
      real transcript-sourced finding (with timestamp) — nice proof for the README/site.
- [ ] Flip repo to **public** once the above land.

## Workflow / quality — user-trust gates (requested by Lucas 2026-07-15)
Goal: assure the user that **high-quality, relevant** sources were fetched *before* anything is built
into a skill or diff. Today's bar = sourced-or-dropped + confidence + corroboration + official-source
preference — but there's no mid-run user gate, and skill-candidates aren't held to a higher bar than a
config tweak. Proposed additions:
- **Gate 2 — source shortlist review (new):** after discovery, show ranked candidates with a quality
  score (authority tier · recency · relevance-to-the-ask); user prunes/approves before any fetch spend.
- **Gate 3 — findings review (new):** after synthesis, user approves / rejects / reclassifies findings
  BEFORE any skill stub or CLAUDE.md diff is generated. ("Here's what I got — review it" made structural.)
- **Higher bar for skill-candidates:** a skill is durable → require ≥moderate confidence + corroboration
  OR explicit confirm, plus a one-line "why this deserves a skill" justification before scaffolding.
- **Relevance re-rank:** score each finding against the original intent/lens; flag tangential ones.
- **Modes:** `--interactive` (the gates) default for trust; `--auto` for a straight-through run reviewed
  at the end. (Gate 1 — the search plan — already exists.)

## Nice-to-haves
- More example topics (each doubles as a showcase run).
- Optional transcript-MCP backend (currently library-first; MCP is a documented optional path).
- A GitHub Action recipe for hosted/routine runs (uses the `hosted` backend to dodge the cloud-IP block).
- Package as a Claude Code plugin for one-command install.
