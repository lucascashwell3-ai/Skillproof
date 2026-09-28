# Run 4b — the Claude-app beginner again, after the fix

**Why this run:** the same Claude-app beginner, re-run on the fix from run 4 (don't package Skillproof itself).
**Their answers, fixed in advance:** "idk honestly…"; "yes" to the plan.

## Conversation

_Times are from the paste; they include the AI's own work (downloads, reading, installing). "Setup unchanged" is a fingerprint of every file in the sandbox except Skillproof's own folder._

**User** · 0:00 · setup fingerprint `d41d8cd9`

> (pastes the Skillproof prompt)

**AI** · 1:29 · setup fingerprint `d41d8cd9`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.

**User** · 1:29 · setup fingerprint `d41d8cd9`

> idk honestly. i just got this and dont really know what to use it for

**AI** · 4:46 · setup fingerprint `d41d8cd9`

> Here's the plan:
> 1. Add **grill-me** — Say "use grill-me" before a plan or big decision, and your AI asks questions until the plan holds up.
> 2. Add **humanizer** — Say "humanize this" on any draft, and your AI rewrites the draft in a plain human voice.
> 3. Add **caveman** — Say "use caveman", and your AI answers in far fewer words until you say "normal mode".
>
> Nothing changes until you say go, and you can undo anytime. Go?

**User** · 4:46 · setup fingerprint `d41d8cd9`

> yes

**AI** · 8:00 · setup fingerprint `f8979efd`

> Installed.
> - grill-me: Say "use grill-me" before a plan or big decision, and your AI asks questions until the plan holds up.
> - humanizer: Say "humanize this" on any draft, and your AI rewrites the draft in a plain human voice.
> - caveman: Say "use caveman", and your AI answers in far fewer words until you say "normal mode".
>
> Undo: delete grill-me, humanizer, and caveman under Skills.
>
> Upload each zip first — grill-me.zip, humanizer.zip, caveman.zip — via Customize → Skills → add; takes effect in a new chat.

## Checks

| Check | Result |
|---|---|
| No file made before the yes | PASS — the download folder was empty until "yes" |
| Nothing to say → a plan | PASS — this run went straight to the all-rounders without the multiple-choice question (run 4 asked it; both end with proven skills) |
| One clear line per skill, no bare "it" | PASS |
| Slip found | grill-me's helper folder went inside grill-me.zip. The Claude app reads one skill folder per zip, so the install reference now says: a zip for each (run 4 did this right) |
