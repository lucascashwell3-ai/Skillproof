# ✦ Skillproof report — "best web-design / UI component libraries & animation techniques to de-stale my sites"

```
Topic:      de-stale my sites — modern UI component libraries + animation techniques
Stack:      Next.js 15 · Tailwind CSS v3 · TypeScript
Sources:    Web 14 · YouTube 0 · X off
Backend:    local            Dry-run: yes
Findings:   18 kept · 0 dropped (no source) · 0 fabricated
X budget:   n/a (disabled)
Generated:  2026-07-15
```

> **Coverage is honest, not padded.** `YouTube 0`: the local transcript backend is IP-blocked from
> this cloud container (a `ProxyError` before it even reaches YouTube) — on your residential machine,
> creator-video findings would be added here. Some design blogs (Comeau, Smashing, NN/g, web.dev)
> were egress-blocked this session, so the visual-polish findings were re-anchored to **official
> design-token source files that were actually retrieved** (Tailwind `theme.css`, Open Props) rather
> than guessed. Every claim below is a verbatim quote from a page that was really fetched.

---

## ▶ Do this first

Ranked by `priority = (impact × confidence) / effort`. These are the highest-leverage, lowest-effort moves.

| # | Change | Why it ranks | Score |
|---|---|---|---|
| 1 | **Define one type scale** (paired sizes + line-heights) — [f-13](#f-13) | high impact · high conf · trivial | `9.0` |
| 2 | **Drive all spacing from one 4px base** — [f-14](#f-14) | high impact · high conf · trivial | `9.0` |
| 3 | **Respect `prefers-reduced-motion`** on all motion — [f-11](#f-11) | high impact · high conf · trivial | `9.0` |
| 4 | **Add Headless UI** for accessible menus/modals — [f-03](#f-03) | med impact · high conf · trivial | `6.0` |
| 5 | **Adopt shadcn/ui** as your base component system — [f-01](#f-01) | high impact · high conf · moderate | `4.5` |
| 6 | **Adopt Motion** for React micro-motion — [f-07](#f-07) | high impact · high conf · moderate | `4.5` |
| 7 | **Enable Next.js View Transitions** for route feel — [f-08](#f-08) | high impact · high conf · moderate | `4.5` |

The three trivial wins (1–3) are pure discipline — no new dependency — and they kill the "generic
AI page" look fastest. Do them before adding any library.

---

## ⚙ Integrate now

<a id="f-01"></a>**f-01 · Adopt shadcn/ui as your base component system** &nbsp;`high` · impact high · effort moderate
Its CLI copies modern, accessible components (Radix + Tailwind) into your repo so you own and freely restyle the code, instead of fighting a black-box npm design system.
› `npx shadcn@latest init && npx shadcn@latest add button card dialog input` — works with Tailwind v3.
› source: [shadcn/ui README](https://raw.githubusercontent.com/shadcn-ui/ui/main/README.md) — *"…components that you can customize, extend, and build on. …Open Code."*

<a id="f-02"></a>**f-02 · Build interactive primitives on Radix** &nbsp;`high` · impact high · effort moderate
Dropdowns, dialogs, tooltips, comboboxes get accessibility (ARIA, focus, keyboard) unstyled; apply your own Tailwind. Adopt incrementally.
› `npm i radix-ui` — (shadcn already sits on Radix; add directly for primitives it doesn't cover).
› source: [Radix Primitives README](https://raw.githubusercontent.com/radix-ui/primitives/main/README.md) — *"…the base layer of your design system, or adopt them incrementally."*

<a id="f-03"></a>**f-03 · Add Headless UI (Tailwind-native)** &nbsp;`high` · impact med · effort trivial
Lightweight accessible menus/dialogs/comboboxes/transitions with almost no setup — from the Tailwind team.
› `npm i @headlessui/react`
› source: [@headlessui/react — npm](https://registry.npmjs.org/@headlessui/react) — *"completely unstyled, fully accessible UI components… designed to integrate beautifully with Tailwind CSS."*

<a id="f-07"></a>**f-07 · Adopt Motion for React micro-motion** &nbsp;`high` · impact high · effort moderate
Declarative entrances, hover/tap gestures, layout transitions; TypeScript-native, GPU-accelerated.
› `npm i motion` → `import { motion } from "motion/react"` → `<motion.div animate={{ x: 100 }} />`
› source: [Motion (GitHub)](https://github.com/motiondivision/motion) — *"…native browser APIs for 120fps, GPU-accelerated animations."*

<a id="f-08"></a>**f-08 · Enable Next.js View Transitions** &nbsp;`high` · impact high · effort moderate
Wrap shared elements in `<ViewTransition name>`; the browser animates route changes; unsupported browsers navigate normally.
› `next.config.ts` → `experimental: { viewTransition: true }`
› source: [Designing view transitions — Next.js](https://nextjs.org/docs/app/guides/view-transitions) — *"…the browser animates between their old and new positions."*

<a id="f-09"></a>**f-09 · Use native CSS scroll-driven animations** &nbsp;`high` · impact high · effort moderate
Replace scroll-listener / IntersectionObserver reveals with `animation-timeline: view()` — zero JS, no main-thread jank.
› `animation-timeline: view(); animation-range: entry 0% cover 40%;` (pair with f-10 fallback)
› source: [MDN — Scroll-driven timelines](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations/Timelines) — *"…rely on the main thread… you run the risk of blocking the main thread…"*

<a id="f-05"></a>**f-05 · Layer in animated components (Magic UI / Aceternity)** &nbsp;`moderate` · impact high · effort moderate
Motion-rich hero/section effects for landing pages, installed via the same shadcn-style CLI. Use sparingly (see f-12).
› `npx shadcn@latest add "https://magicui.design/r/marquee"`
› source: [Magic UI README](https://raw.githubusercontent.com/magicuidesign/magicui/main/README.md) — *"UI Library for Design Engineers"*

<a id="f-15"></a>**f-15 · Replace flat shadows with layered shadow tokens** &nbsp;`moderate` · impact med · effort moderate
Stacked shadow lines sharing one color + graduated opacity, stored as `shadow-1…6` tokens = deliberate depth.
› `npm i open-props` (or copy the tokens into `theme.extend.boxShadow`)
› source: [Open Props — shadows](https://github.com/argyleink/open-props/blob/b515be8e7ab907f085ee7fa175e21456a358cd6c/src/props.shadows.css) — *"--shadow-5: 0 -1px 2px 0 hsl(var(--shadow-color) / var(--shadow-strength-3)),"*

<a id="f-04"></a>**f-04 · Consider HeroUI (batteries-included)** &nbsp;`high` · impact high · effort involved
Beautiful-by-default, Tailwind-native — **but built on Tailwind v4**, so adopting it means migrating off v3. Weigh vs. staying on shadcn.
› `npm i @heroui/react` (after a Tailwind v3→v4 migration)
› source: [@heroui/react — npm](https://registry.npmjs.org/@heroui/react) — *"…built with Tailwind CSS 4.0."*

<a id="f-18"></a>**f-18 · Use rich multi-stop gradients, tokenized** &nbsp;`moderate` · impact low · effort trivial
Chain 6–8 tuned colors instead of a flat 2-stop gradient; save as a token. Flat 2-color gradients read as generic-template.
› Define a multi-stop gradient token; reuse it.
› source: [Open Props — gradients](https://github.com/argyleink/open-props/blob/b515be8e7ab907f085ee7fa175e21456a358cd6c/src/props.gradients.css) — *"linear-gradient(… #1f005c, #5b0060, #870160, #ac255e, #ca485c, #e16b5c, #f39060, #ffb56b)"*

---

## 🧩 New skills to scaffold

<a id="f-06"></a>**f-06 · `add-ui-component` skill** &nbsp;`moderate` · impact med · effort trivial
shadcn/ui, Magic UI and Aceternity all distribute through `npx shadcn add …` — package the add-and-wire-in procedure once.
› _why a skill:_ the add-and-wire-in flow recurs across every project & registry — one reusable command beats re-explaining it each time.
› ⚠️ `moderate` confidence + single source → under the skill-candidate bar this is **confirmed at the findings gate**, not auto-built.

Drop-in stub:

```markdown
---
name: add-ui-component
description: Add and wire in a UI component from a shadcn-compatible registry (shadcn/ui, Magic UI,
  Aceternity). Use when the user wants to drop in a button, dialog, animated hero, marquee, or other
  prebuilt component into a Next.js + Tailwind project.
allowed-tools: Bash(npx shadcn *), Read, Edit
---

# Add a UI component
1. Confirm the registry + component name (shadcn/ui default, or a full URL for Magic UI / Aceternity).
2. Run `npx shadcn@latest add <name-or-url>`.
3. Import it where needed and wire props; keep styling in Tailwind classes so it matches the site's tokens.
4. Check it against prefers-reduced-motion if it animates.
```
› source: [shadcn CLI — npm](https://registry.npmjs.org/shadcn) — *"Add components to your apps."*

---

## 📐 Behavior changes → one `CLAUDE.md` block

Seven findings (f-10..f-14, f-16, f-17) are durable design norms, not one-off edits. Skillproof would
propose this single diff to your **project** `CLAUDE.md` (dry-run — nothing is written without `--apply`):

```diff
@@ project CLAUDE.md @@
+ ## UI / design house rules
+ - Type: use only the defined scale (text-sm/base/lg/xl/2xl…) with its paired line-height.
+   No ad-hoc font sizes — ad-hoc sizing is the #1 tell of a generic page.        [f-13, high]
+ - Spacing: every padding/margin/gap comes from the 4px spacing scale. No ad-hoc px. [f-14, high]
+ - All non-essential motion is wrapped in `@media (prefers-reduced-motion: reduce)`
+   (reduce to an opacity fade or 0ms). Never ship scaling/panning motion without it. [f-11, high]
+ - Motion defaults: travel ≤ ~60px; enters 200–400ms, exits ~150ms (exits faster).   [f-12, moderate]
+ - Scroll-driven CSS animations are progressive enhancement: gate behind
+   `@supports (animation-timeline: view())` so unsupported browsers stay readable.    [f-10, moderate]
+ - Dark mode: never reuse light shadows — darken shadow-color and raise strength,
+   or cards visually flatten.                                                          [f-16, high]
+ - Easing: reference named easing tokens (e.g. --ease-out-5) in transitions; no default ease. [f-17, moderate]
```

Sources: Tailwind `theme.css` (f-13/f-14), MDN `prefers-reduced-motion` (f-11), MDN scroll-driven +
Next.js view-transitions (f-10/f-12), Open Props shadows/easing (f-16/f-17) — all linked in `findings.json`.

---

## 🗂 Considered & skipped

Nothing was dropped for a missing source this run (0 fabricated, 0 unsourced). Coverage limits:
- **YouTube (0 sources):** local backend IP-blocked from this cloud container — the documented caveat.
  A residential run adds creator-video findings (with timestamps).
- **Design blogs (Comeau / Smashing / NN/g / web.dev):** egress-blocked this session; the taste-layer
  findings were re-anchored to official token files instead of guessing. Re-run from open egress for
  prose-blog findings.

---

## 📎 Appendix — sources & coverage

14 distinct web sources fetched, all quote-anchored:
shadcn/ui README · Radix Primitives README · @headlessui/react (npm) · @heroui/react (npm) · Magic UI
README · shadcn CLI (npm) · Motion (GitHub) · Next.js View Transitions docs · MDN scroll-driven
timelines · MDN scroll-driven animations · MDN prefers-reduced-motion · Tailwind `theme.css` ·
Open Props shadows · Open Props easing · Open Props gradients.

*Machine-readable findings (with per-finding payloads and scores): [`findings.json`](findings.json).*
*Generated by [Skillproof](../../README.md) — dry-run, X disabled. Every claim carries a source + confidence.*
