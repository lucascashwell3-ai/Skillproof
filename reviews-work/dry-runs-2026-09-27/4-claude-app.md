# Run 4 — a beginner in the Claude app (free plan)

**Who:** a complete beginner in a brand-new chat in the Claude app (free plan).
**App:** the Claude app, played by a fresh Sonnet agent that had never seen Skillproof. It can fetch web pages and create files for download; it can't touch the person's computer.
**Their answers, fixed in advance:** "idk honestly…" to the opening; "1" to a multiple-choice question; "yes" to the plan.

## Conversation

_Times are from the paste; they include the AI's own work (downloads, reading, installing). "Setup unchanged" is a fingerprint of every file in the sandbox except Skillproof's own folder._

**User** · 0:00 · setup fingerprint `d41d8cd9`

> (pastes the Skillproof prompt)

**AI** · 1:43 · setup fingerprint `d41d8cd9`

> What do you want your AI to do better? Not sure? Tell me what you use AI for, or say "look" and I'll check your setup.

**User** · 1:43 · setup fingerprint `d41d8cd9`

> idk honestly. i just got this and dont really know what to use it for

**AI** · 2:58 · setup fingerprint `d41d8cd9`

> Which is closest? Reply with a number: 1 Writing and email · 2 Learning · 3 Planning and decisions · 4 Coding · 5 A bit of everything

**User** · 2:58 · setup fingerprint `d41d8cd9`

> 1

**AI** · 5:52 · setup fingerprint `d41d8cd9`

> Here's the plan:
> 1. Add **humanizer** — Say "humanize this" on any draft, and your AI rewrites the draft in a plain human voice.
> 2. Add **copywriting** — Your AI now writes page copy — headlines, pitches, buttons — using proven marketing patterns.
>
> Nothing changes until you say go, and you can undo anytime. Go?

**User** · 5:52 · setup fingerprint `d41d8cd9`

> yes

**AI** · 9:15 · setup fingerprint `39fd6f34`

> Installed.
> - humanizer: Say "humanize this" on any draft, and your AI rewrites the draft in a plain human voice.
> - copywriting: Your AI now writes page copy — headlines, pitches, buttons — using proven marketing patterns.
>
> Two zips are ready above: humanizer.zip and copywriting.zip. Upload each one: Customize → Skills → add → upload the zip (you'll need code execution turned on first, under Settings → Capabilities, if it isn't already).
>
> Undo: remove humanizer and copywriting under Skills. Takes effect once you've uploaded them, in a new chat.

## Checks

| Check | Result |
|---|---|
| Nothing to say → one multiple-choice question → a plan that fits the answer | PASS — "Which is closest?…"; "1 Writing and email" → humanizer and copywriting |
| No file made before the yes | PASS — the download folder stayed empty until "yes"; Skillproof itself was not packaged |
| A ready zip + one upload step | PASS — humanizer.zip and copywriting.zip, one skill folder at each zip's root; "Customize → Skills → add → upload the zip", with the code-execution setting named |
| One clear line per skill, no bare "it" | PASS |
| Undo | PASS — "remove humanizer and copywriting under Skills" |
| Time | The person's own time ~1.2 min (198 words + 3 replies). The AI's own work: 8:21, including building the zips. Paste to "Installed.": 9:15 |
