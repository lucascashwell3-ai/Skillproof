# Run 4 — a beginner in the Claude app (free plan)

**Who:** a complete beginner in a brand-new chat in the Claude app (free plan).
**App:** the Claude app, played by a fresh Sonnet agent that had never seen Skillproof. It can fetch web pages and create files for download; it can't touch the person's computer.
**Their answers, fixed in advance:** "idk honestly…" to the opening; "1" to a multiple-choice question; "yes" to the plan.

## Conversation

_Times are from the paste; they include the AI's own work (downloads, reading, installing). "Setup unchanged" is a fingerprint of every file in the sandbox except Skillproof's own folder._

**User** · 0:00 · setup fingerprint `d41d8cd9`

> (pastes the Skillproof prompt)

**AI** · 2:54 · setup fingerprint `d41d8cd9`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.

**User** · 2:54 · setup fingerprint `d41d8cd9`

> idk honestly. i just got this and dont really know what to use it for

**AI** · 8:05 · setup fingerprint `4127e879`

> Skillproof's installed — skillproof.zip is ready above. Upload it: Customize → Skills → add → upload the zip (turn on code execution first, if it isn't already: Settings → Capabilities).
>
> Which is closest? Reply with a number: 1 Writing and email · 2 Learning · 3 Planning and decisions · 4 Coding · 5 A bit of everything

**User** · 8:05 · setup fingerprint `4127e879`

> 1

**AI** · 11:03 · setup fingerprint `4127e879`

> 1. Add **grill-me** — Say "use grill-me" before a plan or big decision, and your AI asks questions until the plan holds up.
> 2. Add **caveman** — Say "use caveman", and your AI answers in far fewer words until you say "normal mode".
> 3. Add **humanizer** — Say "humanize this" on any draft, and your AI rewrites the draft in a plain human voice.
>
> Nothing changes until you say go, and you can undo anytime. Go?

**User** · 11:03 · setup fingerprint `4127e879`

> yes

**AI** · 13:54 · setup fingerprint `2c8cf15c`

> Installed.
> - grill-me: Say "use grill-me" before a plan or big decision, and your AI asks questions until the plan holds up.
> - caveman: Say "use caveman", and your AI answers in far fewer words until you say "normal mode".
> - humanizer: Say "humanize this" on any draft, and your AI rewrites the draft in a plain human voice.
>
> Upload each zip above to use them — Customize → Skills → add → upload the zip (grill-me needs its small grilling.zip companion uploaded too, four zips total).
>
> Undo: remove any of them under Customize → Skills. They take effect in a new chat.

## Checks

| Check | Result |
|---|---|
| Nothing to say → one multiple-choice question → a plan | PASS — "Which is closest? Reply with a number…", then a plan after "1" |
| Calls a skill the chat-app way | PASS — "use grill-me" instead of `/grill-me` |
| A ready zip + one upload step | PASS — one zip per skill folder, each with the folder at its root (grill-me.zip, grilling.zip, humanizer.zip, caveman.zip); "Customize → Skills → add → upload the zip" |
| One clear line per skill, no bare "it" | PASS |
| Undo | PASS — "remove any of them under Customize → Skills" |
| Slip found | It also zipped Skillproof itself and asked for that upload first. Fixed: a chat app runs Skillproof from the chat; only the planned skills get zips. The re-run below confirms no file is made before the yes |
| Time | The person's own time ~1.5 min (263 words + 3 replies). The AI's own work: 13:00, most of it building zips |
