# SKILLproof MCP server

The Skillproof catalog, callable from any MCP host (Claude Desktop, Claude Code,
Cursor, …) mid-workflow. Read-only, no auth, no side effects. It reads the **same
`docs/data/skills.json`** the website renders and the honesty gate
(`scripts/validate_index.py`) validates. One flat catalog: every entry was scanned
for malicious code before listing and re-scanned whenever its code changes.

## Tools

- `find_resources({ pain_point, limit? })` — matches for a described pain point, best
  matches first. Zero matches returns the scout methodology instead of a guess — the
  catalog is a starting shelf, and "not catalogued yet" never means "nothing exists."
- `get_skill({ skill })` — one entry's full record: summary, repo, stars, license,
  install command where known, and the date of its malice scan. Not in the catalog
  at all → says so plainly.
- `list_catalog({ category? })` — the whole catalog, optionally filtered by category.
- `get_scout_methodology()` — how to search the wider ecosystem honestly, including the rule
  that unread code gets a repo URL and a plain "the source has not been read," never an
  install command.

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

- Every answer states what the catalog assures: scanned for malicious patterns before
  listing and re-checked when the code changes.
- No entry is ever called tested, graded, or verified.
- The calling agent is told to read the source of anything before installing it.
- A skill missing from the catalog says so plainly — nothing is inferred.

Independent tool · MIT · Source: https://github.com/lucascashwell3-ai/Skillproof
