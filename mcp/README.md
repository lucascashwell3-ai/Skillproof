# SKILLproof MCP server

The Skillproof catalog, callable from any MCP host (Claude Desktop, Claude Code,
Cursor, …) mid-workflow. Read-only, no auth, no side effects. It reads the **same
`docs/data/skills.json`** the website renders and the honesty gate
(`scripts/validate_index.py`) validates — and serves **published entries only**: every one had
its full source read at a pinned commit before listing. Internal pipeline states (candidates
awaiting review) are never returned.

## Tools

- `find_resources({ pain_point, limit? })` — matches for a described pain point: **graded**
  (installed + probed, worksheet receipts) and **reviewed** (full source read at a pinned
  commit; what it does / touches / how to undo it, install command included). Zero matches
  returns the scout methodology instead of a guess — the catalog is a starting shelf, and
  "not catalogued yet" never means "nothing exists."
- `get_grade({ skill })` — one skill's full record: grade, per-dimension scores with reasons,
  worksheet URL; or the review's does/touches/undo + limits for reviewed entries. Not in the
  catalog at all → says so plainly.
- `list_index({ status? })` — the published catalog, filterable by `graded` / `reviewed`.
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

- Only published entries are served — graded, or reviewed with a review block. Pipeline states
  never leave the data file.
- Graded answers always carry the worksheet URL — the receipts.
- Reviewed answers carry does/touches/undo, `limits` verbatim, and the pinned commit — and are
  never called tested. Reading is not running.
- A skill missing from the catalog returns "no grade or review exists — do not infer one".

Independent tool · MIT · Grades and receipts: https://github.com/lucascashwell3-ai/Skillproof
