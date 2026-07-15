# Goldproof — roadmap / not-yet-done

Status: built end-to-end, **private** repo, pre-public polish. Tracking what's left before going public.

## Before public
- [ ] **Design overhaul of the showcase + report template** _(Lucas, 2026-07-15)_ — apply the
      UI / animation / design findings Goldproof itself surfaced (define a type scale, single spacing
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

## Nice-to-haves
- More example topics (each doubles as a showcase run).
- Optional transcript-MCP backend (currently library-first; MCP is a documented optional path).
- A GitHub Action recipe for hosted/routine runs (uses the `hosted` backend to dodge the cloud-IP block).
- Package as a Claude Code plugin for one-command install.
