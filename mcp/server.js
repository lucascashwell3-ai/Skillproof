#!/usr/bin/env node
/* ============================================================
   SKILLproof MCP server — the catalog as read-only tools,
   callable from any MCP host (Claude Desktop, Claude Code, Cursor…).
   Source of truth: docs/data/skills.json — the same file the site
   renders and scripts/validate_index.py gates.

   One flat catalog (tiers removed 2026-08-21). The promise served
   here is exactly the site's: every entry was scanned for malicious
   patterns before listing — scanned, not endorsed, no warranty.
   Never state or imply an entry was tested, graded, or reviewed.
   ============================================================ */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DATA = path.join(HERE, '..', 'docs', 'data', 'skills.json');
const DATA_URL = process.env.SKILLPROOF_DATA_URL || null; // set once GitHub Pages is live
const REPO = 'https://github.com/lucascashwell3-ai/Skillproof';

// ---- data (local file is the default truth; URL override for the hosted copy; cache ~15min) ----
let cache = { at: 0, data: null };
async function getData() {
  const now = Date.now();
  if (cache.data && now - cache.at < 900_000) return cache.data;
  let data;
  if (DATA_URL) {
    const res = await fetch(DATA_URL, { headers: { 'cache-control': 'no-cache' } });
    if (!res.ok) throw new Error(`Could not fetch skill data (${res.status}) from ${DATA_URL}`);
    data = await res.json();
  } else {
    data = JSON.parse(await readFile(LOCAL_DATA, 'utf8'));
  }
  cache = { at: now, data };
  return data;
}

// ---- matching (same algorithm as the site's matcher in docs/assets/app.js) ----
const STOP = new Set(['and', 'the', 'for', 'with', 'that', 'this', 'are', 'but', 'not', 'you',
  'your', 'its', 'out', 'get', 'too', 'very', 'when', 'how', 'what', 'all', 'can', 'like',
  'look', 'looks', 'make', 'makes', 'feel', 'feels', 'keep', 'keeps', 'into', 'from', 'they',
  'them', 'then', 'than', 'have', 'has', 'had', 'will', 'just', 'really', 'been', 'was',
  'were', 'our', 'any', 'every', 'some', 'more', 'most', 'less', 'off', 'own', 'use',
  'using', 'used', 'want', 'need', 'needs', 'always', 'never', 'still', 'about']);
const tokenize = (q) => String(q || '').toLowerCase().split(/[^a-z0-9']+/)
  .filter((t) => t.length > 2 && !STOP.has(t));

// exact word, plural-tolerant, or substring only when both sides are substantial
const kwHit = (kw, t) =>
  kw === t || kw === `${t}s` || t === `${kw}s` ||
  (t.length >= 4 && kw.length >= 4 && (kw.includes(t) || t.includes(kw)));

function matchScore(entry, tokens, kwIndex) {
  const hay = ` ${[entry.name, entry.summary, entry.category].join(' ').toLowerCase()} `;
  let hits = 0;
  for (const t of tokens) {
    if (new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(hay)) hits += 1;
    for (const pid of entry.pain_points || []) {
      if ((kwIndex[pid] || []).some((kw) => kwHit(kw, t))) { hits += 1.5; break; }
    }
  }
  return hits;
}

// One brief per entry — same fields for everyone; optional fields only when present.
const brief = (s) => {
  const out = {
    name: s.name,
    summary: s.summary,
    category: s.category,
    pain_points: s.pain_points,
    repo: s.repo_url,
    stars: s.signals?.stars ?? null,
    last_push: s.pushed ?? null,
    license: s.license ?? null,
    checked: s.checked?.date
      ? `Scanned for malicious patterns on ${s.checked.date} — scanned, not endorsed. Read the source before installing.`
      : 'Not yet scanned — read the source before installing.',
  };
  if (s.install?.command) out.install = s.install.command;
  if (s.install?.notes) out.install_notes = s.install.notes;
  if (s.does) out.does = s.does;
  if (s.touches) out.touches = s.touches;
  if (s.undo) out.undo = s.undo;
  return out;
};

const SCOUT_METHODOLOGY = {
  what_this_is: 'How to honestly scout skills/resources the catalog does not cover yet.',
  steps: [
    '1. Search GitHub and community directories for candidates matching the pain point (resolve every candidate to a real URL; drop what you cannot open).',
    '2. Provenance: real repo, named author, stars/forks, created-when. Popularity is a signal, not a verdict.',
    '3. License: check the LICENSE file or API field. No license = usage rights unclear — report it plainly.',
    '4. Freshness: last real push. >6 months quiet on a fast-moving area is a flag.',
    '5. Safety red flags: curl|bash, auto-running hooks, undisclosed network calls, credential/env access, obfuscated blobs. Hard flags exclude the candidate — named, with the reason.',
    '6. Read the source of anything you are about to recommend, and answer what-it-does / what-it-touches / how-to-undo from the code you read. Unread code gets a repo URL and an honest "the source has not been read" — never an install command.',
  ],
  nominate: `${REPO}/issues`,
};

// ---- tools ----
const TOOLS = [
  {
    name: 'find_resources',
    description: 'Find skills/libraries/resources for an AI-usage pain point. Every entry was scanned for malicious patterns before listing — scanned, not endorsed. Call when the user wants a skill/tool/resource to fix a described problem. The catalog is a starting shelf — an empty result means "not catalogued yet", and get_scout_methodology tells you how to search the wider ecosystem honestly.',
    inputSchema: {
      type: 'object',
      properties: {
        pain_point: { type: 'string', description: "The user's pain point in free text, e.g. 'my frontend output looks generic' or 'long sessions lose the plot'." },
        limit: { type: 'number', description: 'Max results (default 5).' },
      },
      required: ['pain_point'],
    },
  },
  {
    name: 'get_skill',
    description: 'Get the full Skillproof record for one catalog entry by name: summary, repo, stars, license, install command where known, and the date of its malice scan.',
    inputSchema: { type: 'object', properties: { skill: { type: 'string', description: 'Skill name or id (fuzzy match).' } }, required: ['skill'] },
  },
  {
    name: 'list_catalog',
    description: 'List the Skillproof catalog — one flat list, optionally filtered by category.',
    inputSchema: { type: 'object', properties: { category: { type: 'string', description: 'e.g. "frontend", "testing", "library"' } } },
  },
  {
    name: 'get_scout_methodology',
    description: 'Get the Skillproof scouting steps, so you can honestly scout resources the catalog does not cover yet. Call when find_resources comes back empty for the pain point.',
    inputSchema: { type: 'object', properties: {} },
  },
];

async function handleTool(name, args = {}) {
  const data = await getData();
  const skills = data.skills || [];
  const disclaimer = `Data as of ${data.as_of}. Every entry was scanned for malicious patterns before listing — scanned, not endorsed, provided as-is with no warranty. Never call an entry tested or verified. Read the source of anything before installing it. ${REPO}`;

  if (name === 'find_resources') {
    const tokens = tokenize(args.pain_point);
    if (!tokens.length) return { error: 'Describe the pain point in a few words.', disclaimer };
    const kwIndex = {};
    for (const p of data.pain_points || []) kwIndex[p.id] = [...(p.keywords || []), ...tokenize(p.label)];
    const limit = args.limit || 5;
    const matches = skills
      .map((s) => ({ s, hits: matchScore(s, tokens, kwIndex) }))
      .filter((r) => r.hits >= 1.5)
      .sort((a, b) => (b.hits - a.hits) || ((b.s.signals?.stars ?? 0) - (a.s.signals?.stars ?? 0)))
      .slice(0, limit);
    const out = { pain_point: args.pain_point, matches: matches.map((r) => brief(r.s)), disclaimer };
    if (!matches.length) {
      out.no_match = 'Not catalogued yet — the catalog is a starting shelf, and this means Skillproof has not covered the pain point, NOT that nothing exists. Search the wider ecosystem with get_scout_methodology, or nominate a candidate.';
      out.scout_methodology = SCOUT_METHODOLOGY;
    }
    return out;
  }

  if (name === 'get_skill') {
    const q = String(args.skill || '').toLowerCase();
    const hit = skills.find((s) => s.id === q)
      || skills.find((s) => s.name.toLowerCase() === q)
      || skills.find((s) => s.name.toLowerCase().includes(q) || q.includes(s.id));
    if (!hit) return { not_found: `'${args.skill}' is not in the Skillproof catalog.`, nominate: `${REPO}/issues`, disclaimer };
    return { ...brief(hit), disclaimer };
  }

  if (name === 'list_catalog') {
    const pick = args.category ? skills.filter((s) => s.category === args.category) : skills;
    return {
      count: pick.length,
      entries: pick.map((s) => ({ name: s.name, category: s.category, summary: s.summary, repo: s.repo_url, stars: s.signals?.stars ?? null })),
      disclaimer,
    };
  }

  if (name === 'get_scout_methodology') return { ...SCOUT_METHODOLOGY, disclaimer };

  throw new Error(`Unknown tool: ${name}`);
}

// ---- MCP wiring ----
const server = new Server({ name: 'skillproof', version: '0.2.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    const out = await handleTool(req.params.name, req.params.arguments || {});
    return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] };
  } catch (e) {
    return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
  }
});

await server.connect(new StdioServerTransport());
