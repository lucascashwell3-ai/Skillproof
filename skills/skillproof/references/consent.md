# Consent — read this before your first edit in any session

This skill changes someone's working setup. That is the whole value and the whole risk. The
rules below are not guidance; they are the contract. If following one would make the job
harder, follow it anyway.

## The one-line version

Reading is always allowed. Writing is never allowed until they have seen the exact change and
said yes to that specific change.

## Before any write

1. **Phase 4 has been shown.** Every change, numbered, one line each: the file, what changes,
   why. Including the install command itself.
2. **They said yes to this change.** Not to the plan. To this change.
3. **A backup exists.** Copy the file to `~/.claude/skillproof-backups/<YYYY-MM-DD>/` keeping
   its path (`.../2026-08-03/CLAUDE.md`, `.../2026-08-03/skills/foo/SKILL.md`). If a backup
   already exists from this session, don't overwrite it — the first copy is the one that
   matters.
4. **You can state the undo.** If you can't say exactly how to reverse it, you don't do it yet.

## Asking

Ask for one change at a time, in their words, with the change visible. Short:

> Change 2 of 3: add four lines to `~/.claude/CLAUDE.md` under "Frontend work" pointing at the
> new skill, so your global instructions stop contradicting it. Want me to?

- **A no ends that change.** No argument, no re-pitch, no "are you sure". Say what that means
  for the rest (does change 3 still make sense?) and move on.
- **Silence or a vague answer is not a yes.** "Sounds good" about the plan is not consent to
  edit a file. Ask again, plainly.
- **A blanket yes only counts if they offer it.** Never ask for one. If they say "just do all
  of them", repeat the full list back once, then proceed.
- **Scope creep needs a new yes.** If doing an approved change means touching a second file you
  didn't list, stop and ask for that one separately.

## While writing

- One approved change at a time. Never batch approved changes into one big write.
- **Never delete.** Move aside, then say where it went. This applies to lines in a file too —
  if you're removing instructions, put them somewhere retrievable, not in the void.
- **Never reformat, reorder, or tidy anything you weren't asked to change.** Someone else's
  CLAUDE.md is their document. Add, don't rewrite.
- Stay inside the approved list. No opportunistic fixes, however small and however obvious.

## After writing

- **Re-read the file and show what's there now.** Not a summary of your intent — the actual
  text. A write that silently did nothing looks exactly like a write that worked.
- **Confirm it works.** Say what should now be different and how they'd see it. Check what you
  can check.
- **Give the undo, exact:** the backup path, the file, and what to put back.
- **Say what you couldn't confirm.** "I can't verify this triggers until you start a new
  session" is a real and useful sentence.

## Things that are never okay

- Writing to a file that was never named in phase 4.
- Running a command they haven't seen.
- `rm`, `rm -rf`, force-overwriting, or piping a download into a shell.
- Touching anything outside the home or project they picked in phase 2.
- Editing files that belong to another running session or agent.
- "I went ahead and also…" — there is no also.
