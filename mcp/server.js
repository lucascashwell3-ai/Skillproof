#!/usr/bin/env node
/* ============================================================
   SKILLproof MCP server — the catalog as read-only tools,
   callable from any MCP host (Claude Desktop, Claude Code, Cursor…).
   Source of truth: docs/data/skills.json — the same file the site
   renders and scripts/validate_index.py gates.
   Honesty rules enforced here:
   - only PUBLISHED entries are served: status "graded", or
     "reviewed" with a review block. Being published means the full
     source was read at a pinned commit. Anything else in the data
     file is an internal pipeline state and is never returned —
     pipeline states are ours, not the calling agent's. (An earlier
     version served them labelled "SCOUTED — NOT TESTED"; agents
     read that as a warning about the whole catalog and told users
     to stay away. 2026-08-10.)
   - graded entries come back with grade + receipts (worksheet URL);
   - reviewed entries come back with does/touches/undo + limits
     verbatim, and are never called tested;
   - no match returns the scout methodology (read the source before
     recommending), never a guess.
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

const gradedBrief = (s, rubricVersion) => ({
  name: s.name,
  status: 'graded',
  grade: s.grade,
  score: `${s.score_total}/24`,
  rubric_version: rubricVersion,
  verdict: s.verdict,
  summary: s.summary,
  pain_points: s.pain_points,
  install: s.install?.command ?? null,
  install_notes: s.install?.notes ?? null,
  security_notes: s.security_notes ?? null,
  repo: s.repo_url,
  worksheet: `${REPO}/blob/main/${s.evidence_url}`,
  last_verified: s.last_verified,
});

const reviewedBrief = (s) => ({
  name: s.name,
  status: 'reviewed', // full source read at the pinned commit below — not installed, not run
  summary: s.summary,
  pain_points: s.pain_points,
  does: s.review?.does ?? null,
  touches: s.review?.touches ?? null,
  undo: s.review?.undo ?? null,
  limits: s.review?.limits ?? null, // pass along verbatim — it is the literally-true part
  source_sha: s.review?.source_sha ?? null,
  install: s.install?.command ?? null,
  install_notes: s.install?.notes ?? null,
  repo: s.repo_url,
});

const SCOUT_METHODOLOGY = {
  what_this_is: 'The Skillproof triage rubric — a fast honest screen for skills/libraries/resources that are NOT in the graded index. Triage is not a grade; a grade requires the full rubric run (install, 5 trigger probes, headline-job test, every line read).',
  steps: [
    '1. Search GitHub and community directories for candidates matching the pain point (resolve every candidate to a real URL; drop what you cannot open).',
    '2. Provenance: real repo, named author, stars/forks, created-when. Popularity is a signal, not a verdict.',
    '3. License: check the LICENSE file or API field. No license = usage rights unclear — report it plainly.',
    '4. Freshness: last real push. >6 months quiet on a fast-moving surface is a flag.',
    '5. Safety red flags: curl|bash, auto-running hooks, undisclosed network calls, credential/env access, obfuscated blobs. Hard flags exclude the candidate — named, with the reason.',
    '6. Read the source of anything you are about to recommend, and answer what-it-does / what-it-touches / how-to-undo from the code you read. Unread code gets a repo URL and an honest "the source has not been read" — never an install command.',
  ],
  full_rubric: `${REPO}/blob/main/grading/RUBRIC.md`,
  nominate: `${REPO}/issues`,
};

// ---- tools ----
const TOOLS = [
  {
    name: 'find_resources',
    description: 'Find skills/libraries/resources for an AI-usage pain point. Every entry returned had its full source read at a pinned commit before publication; graded entries were additionally installed and probed. Call when the user wants a skill/tool/resource to fix a described problem. The catalog is a curated starting shelf — an empty result means "not catalogued yet", and get_scout_methodology tells you how to search the wider ecosystem honestly.',
    inputSchema: {
      type: 'object',
      properties: {
        pain_point: { type: 'string', description: "The user's pain point in free text, e.g. 'my frontend output looks generic' or 'long sessions lose the plot'." },
        limit: { type: 'number', description: 'Max results per tier (default 5).' },
      },
      required: ['pain_point'],
    },
  },
  {
    name: 'get_grade',
    description: 'Get the full Skillproof record for one skill by name: grade, per-dimension scores with reasons, worksheet (receipts) URL — or, for source-reviewed entries, what it does / what it touches / how to undo it, read from the source at a pinned commit.',
    inputSchema: { type: 'object', properties: { skill: { type: 'string', description: 'Skill name or id (fuzzy match).' } }, required: ['skill'] },
  },
  {
    name: 'list_index',
    description: 'List the published Skillproof catalog. Optionally filter by status: "graded" (installed and probed) or "reviewed" (full source read at a pinned commit).',
    inputSchema: { type: 'object', properties: { status: { type: 'string', enum: ['graded', 'reviewed'] } } },
  },
  {
    name: 'get_scout_methodology',
    description: 'Get the Skillproof triage rubric and scouting steps, so you can honestly scout resources the index does not cover yet. Call when find_resources comes back empty for the pain point.',
    inputSchema: { type: 'object', properties: {} },
  },
];

async function handleTool(name, args = {}) {
  const data = await getData();
  // Published only: graded, or reviewed with the review block present. Everything
  // else in the file is an internal pipeline state and is never served.
  const skills = (data.skills || []).filter(
    (s) => s.status === 'graded' || (s.status === 'reviewed' && s.review)
  );
  const graded = skills.filter((s) => s.status === 'graded');
  const reviewed = skills.filter((s) => s.status === 'reviewed');
  const disclaimer = `Data as of ${data.as_of}. Every published entry had its full source read at a pinned commit. Reading is not running: only graded entries (installed + probed, worksheet on file) are called tested. Grades >90 days old are stale. Receipts: ${REPO}`;

  if (name === 'find_resources') {
    const tokens = tokenize(args.pain_point);
    if (!tokens.length) return { error: 'Describe the pain point in a few words.', disclaimer };
    const kwIndex = {};
    for (const p of data.pain_points || []) kwIndex[p.id] = [...(p.keywords || []), ...tokenize(p.label)];
    const limit = args.limit || 5;
    const rank = (list) => list
      .map((s) => ({ s, hits: matchScore(s, tokens, kwIndex) }))
      .filter((r) => r.hits >= 1.5)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit);
    const g = rank(graded.filter((s) => (s.grade || '').charAt(0) !== 'F'));
    const rv = rank(reviewed);
    const out = {
      pain_point: args.pain_point,
      graded_matches: g.map((r) => gradedBrief(r.s, data.rubric_version)),
      reviewed_matches: rv.map((r) => reviewedBrief(r.s)),
      disclaimer,
    };
    if (!g.length && !rv.length) {
      out.no_match = 'Not catalogued yet — the catalog is a curated starting shelf, and this means Skillproof has not covered the pain point, NOT that nothing exists. Search the wider ecosystem with get_scout_methodology, or nominate a candidate.';
      out.scout_methodology = SCOUT_METHODOLOGY;
    }
    return out;
  }

  if (name === 'get_grade') {
    const q = String(args.skill || '').toLowerCase();
    const hit = skills.find((s) => s.id === q)
      || skills.find((s) => s.name.toLowerCase() === q)
      || skills.find((s) => s.name.toLowerCase().includes(q) || q.includes(s.id));
    if (!hit) return { not_found: `'${args.skill}' is not in the published Skillproof catalog. No grade or review exists — do not infer one.`, nominate: `${REPO}/issues`, disclaimer };
    if (hit.status === 'graded') {
      return { ...gradedBrief(hit, data.rubric_version), scores: hit.scores, version_tested: hit.version_tested, disclaimer };
    }
    return { ...reviewedBrief(hit), disclaimer };
  }

  if (name === 'list_index') {
    const pick = args.status === 'graded' ? graded : args.status === 'reviewed' ? reviewed : skills;
    return {
      counts: { graded: graded.length, reviewed: reviewed.length },
      entries: pick.map((s) => (s.status === 'graded'
        ? { name: s.name, status: 'graded', grade: s.grade, score: `${s.score_total}/24`, summary: s.summary, worksheet: `${REPO}/blob/main/${s.evidence_url}` }
        : { name: s.name, status: 'reviewed', summary: s.summary, does: s.review?.does ?? null, repo: s.repo_url })),
      disclaimer,
    };
  }

  if (name === 'get_scout_methodology') return { ...SCOUT_METHODOLOGY, disclaimer };

  throw new Error(`Unknown tool: ${name}`);
}

// ---- MCP wiring ----
const server = new Server({ name: 'skillproof', version: '0.1.0' }, { capabilities: { tools: {} } });
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
