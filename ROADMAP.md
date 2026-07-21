# Skillproof — roadmap / not-yet-done

Status: **repositioned 2026-07-21** — Skillproof is now "the rating agency for Claude skills":
a static site (`docs/`) with a graded, receipted index + pain-point matcher, with the original
research skill as the scouting engine underneath. Repo still **private**, pre-public polish.

## Before public (Lucas-gated where marked)

- [ ] **Grow the graded index to 25** — batch grading sessions (~30–60 min per skill,
      ~4 skills per session, worksheets + JSON entries + `validate_index.py` green).
      Next candidates already scouted: `doraemonkeys/claude-code-debug-mode` (debugging),
      `aidankinzett/claude-git-pr-skill` (git/PR hygiene), `Anjos2/recursive-research`
      (research rigor), `lackeyjb/playwright-skill` (browser testing).
- [ ] **Flip repo to public** — 🔒 Lucas's call, in the live conversation.
- [ ] **Enable GitHub Pages** (Settings → Pages → deploy from `main` / `docs/`) — 🔒 Lucas's
      call, after flip-public. Until then merging deploys nothing.
- [ ] Decide the lowercase-rename question (`Skillproof` repo vs `skillproof` URLs used in
      docs) — 🔒 Lucas's call at flip-public time.
- [ ] **Verify research-skill paid backends live with real keys** (Supadata,
      youtube-transcript.io, TwitterAPI.io) before publishing the cost claims.

## v1.1 (small PRs, post-Pages)

- [ ] **Advisor skill** — `skills/skillproof-advisor/SKILL.md` fetching the live
      `docs/data/skills.json` URL (adapt `modelproof/skills/modelproof-advisor/SKILL.md`).
      The paste-in advisor prompt already ships on the site.
- [ ] Document community submissions: "PR against `skills.json` + a filled worksheet" +
      a nomination issue template.
- [ ] Re-grade cadence: calendar the 90-day staleness sweep (grades auto-flag stale on-site).

## Later / ideas (captured, not scheduled)

- [ ] MCP server for the index (modelproof's `mcp/server.js` is the template).
- [ ] **Interview → personalized global instructions skill** _(Lucas, 2026-07-21)_: a skill
      that interviews you (or runs a quick quiz) and generates tuned global instructions for
      how AI should respond/chat with you — Lucas prototyped this once and it worked; the
      viral `i-have-adhd` skill (graded A in our index) proves the demand for output-style
      personalization. Could also become a second advisor lens on the site.
- [ ] Auto-crawl candidate discovery / CI-scheduled re-grading (flag-first, never auto-publish).
- [ ] More research-skill example topics; GitHub Action recipe for hosted/routine runs;
      package research skill as a plugin.

## Superseded

- ~~Design overhaul of the showcase + report template~~ — the `portfolio/index.html`
  showcase is retired; its design DNA (cosmic-gold identity) carried into the `docs/` site
  (2026-07-21). The `render_report.py` HTML theme refresh remains a nice-to-have above.
- ✅ Name locked: **Skillproof** (2026-07-19).
- ✅ User-trust gates (findings review, higher skill-candidate bar) — built 2026-07-19.
