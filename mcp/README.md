# SKILLproof MCP server

The rating agency for Claude skills, callable from any MCP host (Claude Desktop, Claude Code,
Cursor, …) mid-workflow. Read-only, no auth, no side effects. It reads the **same
`docs/data/skills.json`** the website renders and the honesty gate
(`scripts/validate_index.py`) validates — so its answers always match the site.

## Tools

- `find_resources({ pain_point, limit? })` — matches for a described pain point, returned in two
  honestly-separated tiers: **graded** (tested, worksheet receipts, install command) and
  **scouted** (found + triaged, explicitly ungraded, no install command). Zero matches returns
  the scout methodology instead of a guess.
- `get_grade({ skill })` — one skill's full record: grade, per-dimension scores with reasons,
  worksheet URL; or the triage receipts + an ungraded notice for scouted entries. Not in the
  index at all → says so plainly.
- `list_index({ status? })` — the whole index, filterable by `graded` / `scouted`.
- `get_scout_methodology()` — the triage rubric and steps, so the calling agent can scout
  territory the index doesn't cover yet without lowering the honesty bar.

## Run it (local, stdio)

```bash
cd mcp
npm install
node server.js      # speaks MCP over stdio
```

### Add to Claude Code

```bash
claude mcp add skillproof -- node /absolute/path/to/Skillproof/mcp/server.js
```

### Add to Claude Desktop

In `claude_desktop_config.json` → `mcpServers`:

```json
{
  "mcpServers": {
    "skillproof": { "command": "node", "args": ["/absolute/path/to/Skillproof/mcp/server.js"] }
  }
}
```

Restart the host, then ask e.g. *"find me a skill for less generic frontend output"* — the model
will call `find_resources`. MCP hosts gate the first tool call behind a one-time user approval;
that's expected.

## Data source

By default the server reads the repo's local `docs/data/skills.json` (works today, even while
the repo is private). Once GitHub Pages is live, point it at the hosted copy so answers stay
current without pulling:

```bash
SKILLPROOF_DATA_URL="https://lucascashwell3-ai.github.io/skillproof/data/skills.json" node server.js
```

## Honesty rules (enforced in code)

- Graded answers always carry the worksheet URL — the receipts.
- Scouted answers are labeled `SCOUTED — NOT TESTED, NOT GRADED`, carry their triage receipts,
  and never include an install command.
- A skill missing from the index returns "no grade exists — do not infer one".

Independent tool · MIT · Grades and receipts: https://github.com/lucascashwell3-ai/Skillproof
