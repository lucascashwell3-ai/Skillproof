# Product

## Register

product

## Users

AI power users and developers who use Claude (Code/Desktop) daily and are drowning in
untested community skills, libraries, and "10 tools" listicles. They arrive with a pain
point, weakness, or goal ("my frontend output looks generic", "long sessions degrade",
"my commits are a mess") and want to leave with something quality installed — not another
directory to crawl. They are mid-task when they arrive; the site is a tool they use, not
a page they admire.

## Product Purpose

Skillproof is **a tool AI users use to upgrade and enhance their AI environment** with
high-quality skills and resources fetched from high-quality sources and creators, matched
to the pain points, weaknesses, or goals the user describes. (Lucas's definition, 2026-07-24 —
this replaced the earlier "rating agency" identity.)

The workbench flow: tap your setup (where you run AI + up to three pain points + a trust
bar) → the catalog re-ranks with plain-English, data-derived reasons on every row → drop
picks in the build tray → it flags overlaps and writes one install plan.

Vetting/grading survives as the **internal quality bar and trust signal** — never the
identity. Every listing is checked before it appears and labeled by how far the check went:
tested & graded (installed, probed, source read, worksheet receipts) or scouted (found +
triaged, explicitly never tested). The honesty gate (`scripts/validate_index.py`) blocks
any entry claiming more than its receipts support. Note (Lucas, 2026-07-25): most public
skills already carry GitHub stars and similar signals — grading is not our lane to own and
may be scrapped entirely; keep it demoted.

## Brand Personality

Light, colorful, glassmorphism, techy — engineered, not sketchy or pencil-y. Cool
micro-interactions on the buttons (spring easings, ripples, magnetic pulls, fly-to-tray).
Own direction per TASTE.md LAW 0: no house skin; this is NOT the gold-on-dark -proof look.
Honesty stays the voice: every claim traceable to data, every "we haven't tested this"
said plainly.

Approved design source: `claude-universe/design/direction-lab/skillproof/round2/p4-merged.html`.

## Anti-references

- Skill directories that count everything and vet nothing (6+ incumbents).
- Affiliate-flavored "best AI tools" listicles; hype language; unverifiable claims.
- "Rating agency" framing — grades-first identity is retired.
- The gold-dark -proof house skin (rejected 2026-07-24).

## Design Principles

1. **The setup is the filter.** Pain points + environment drive everything; the catalog
   rearranges around the user, with a reason pill for every rank.
2. **Honesty over coverage.** Scouted ≠ graded, ever; red flags (no license, quiet repo)
   render on the row, not in a footnote. "We haven't tested one yet" is a first-class state
   with a next step (the scout).
3. **Real commands only.** The install plan contains real, per-entry commands or
   review-first repo links — never a fabricated package manager.
4. **Motion conveys state.** Springs and ripples on interaction; no orchestrated page-load
   choreography; `prefers-reduced-motion` fully honored.

## Accessibility & Inclusion

WCAG AA contrast on light ground; full keyboard operability for the workbench (chips, segs,
search, ↑/↓/Enter add-to-tray); aria-pressed on all toggles; aria-live toast; no information
carried by color alone (tier always paired with a text label).
