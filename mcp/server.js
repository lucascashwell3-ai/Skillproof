#!/usr/bin/env node
/* ============================================================
   SKILLproof MCP server — the rating agency for Claude skills,
   callable from any MCP host (Claude Desktop, Claude Code, Cursor…).
   Read-only. Source of truth: docs/data/skills.json — the same
   file the site renders and scripts/validate_index.py gates.
   Honesty rules enforced here:
   - graded entries come back with grade + receipts (worksheet URL);
   - scouted entries come back explicitly "scouted, ungraded" with
     their triage receipts — never anything grade-shaped;
   - no match returns the scout methodology, never a guess.
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

const scoutedBrief = (s) => ({
  name: s.name,
  status: 'SCOUTED — NOT TESTED, NOT GRADED',
  summary: s.summary,
  pain_points: s.pain_points,
  repo: s.repo_url,
  triage: s.triage, // provenance / license / freshness / safety, verified on scouted_on
  scouted_on: s.scouted_on,
  note: 'Found and triaged only. No install command is given for ungraded resources — read it yourself before use, or nominate it for grading.',
});

const SCOUT_METHODOLOGY = {
  what_this_is: 'The Skillproof triage rubric — a fast honest screen for skills/libraries/resources that are NOT in the graded index. Triage is not a grade; a grade requires the full rubric run (install, 5 trigger probes, headline-job test, every line read).',
  steps: [
    '1. Search GitHub and community directories for candidates matching the pain point (resolve every candidate to a real URL; drop what you cannot open).',
    '2. Provenance: real repo, named author, stars/forks, created-when. Popularity is a signal, not a verdict.',
    '3. License: check the LICENSE file or API field. No license = usage rights unclear — report it plainly.',
    '4. Freshness: last real push. >6 months quiet on a fast-moving surface is a flag.',
    '5. Safety red flags (skim README + file tree only): curl|bash, auto-running hooks, undisclosed network calls, credential/env access, obfuscated blobs. Hard flags exclude the candidate — named, with the reason.',
    '6. Report graded and scouted findings separately; never use grade-like language for scouted items; never install anything.',
  ],
  full_rubric: `${REPO}/blob/main/grading/RUBRIC.md`,
  nominate: `${REPO}/issues`,
};

// ---- tools ----
const TOOLS = [
  {
    name: 'find_resources',
    description: 'Find vetted skills/libraries/resources for an AI-usage pain point (frontend design, AI coding, AI workflows, agent tooling). Returns GRADED matches (tested, receipted, install command) separately from SCOUTED matches (found + triaged, ungraded). Call when the user wants a skill/tool/resource to fix a described problem.',
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
    description: 'Get the full Skillproof record for one skill by name: grade, per-dimension scores with reasons, worksheet (receipts) URL — or, for scouted entries, the triage receipts and an explicit ungraded notice.',
    inputSchema: { type: 'object', properties: { skill: { type: 'string', description: 'Skill name or id (fuzzy match).' } }, required: ['skill'] },
  },
  {
    name: 'list_index',
    description: 'List the whole Skillproof index. Optionally filter by status: "graded" (tested) or "scouted" (found + triaged, ungraded).',
    inputSchema: { type: 'object', properties: { status: { type: 'string', enum: ['graded', 'scouted'] } } },
  },
  {
    name: 'get_scout_methodology',
    description: 'Get the Skillproof triage rubric and scouting steps, so you can honestly scout resources the index does not cover yet. Call when find_resources comes back empty for the pain point.',
    inputSchema: { type: 'object', properties: {} },
  },
];

async function handleTool(name, args = {}) {
  const data = await getData();
  const skills = data.skills || [];
  const graded = skills.filter((s) => s.status === 'graded');
  const scouted = skills.filter((s) => s.status === 'scouted');
  const disclaimer = `Data as of ${data.as_of}, rubric v${data.rubric_version}. Grades are real test results with worksheets; scouted entries are found-and-triaged only and carry NO grade. Grades >90 days old are stale. Receipts: ${REPO}`;

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
    const sc = rank(scouted);
    const out = {
      pain_point: args.pain_point,
      graded_matches: g.map((r) => gradedBrief(r.s, data.rubric_version)),
      scouted_matches: sc.map((r) => scoutedBrief(r.s)),
      disclaimer,
    };
    if (!g.length && !sc.length) {
      out.no_match = 'No match in the index — that means Skillproof has not graded or scouted one for this yet, NOT that none exists. Use get_scout_methodology to scout honestly, or nominate a candidate.';
      out.scout_methodology = SCOUT_METHODOLOGY;
    } else if (!g.length) {
      out.note = 'Only scouted (ungraded) matches exist for this pain point so far. Treat them as leads, not recommendations.';
    }
    return out;
  }

  if (name === 'get_grade') {
    const q = String(args.skill || '').toLowerCase();
    const hit = skills.find((s) => s.id === q)
      || skills.find((s) => s.name.toLowerCase() === q)
      || skills.find((s) => s.name.toLowerCase().includes(q) || q.includes(s.id));
    if (!hit) return { not_found: `'${args.skill}' is not in the Skillproof index (neither graded nor scouted). No grade exists — do not infer one.`, nominate: `${REPO}/issues`, disclaimer };
    if (hit.status === 'graded') {
      return { ...gradedBrief(hit, data.rubric_version), scores: hit.scores, version_tested: hit.version_tested, disclaimer };
    }
    return { ...scoutedBrief(hit), disclaimer };
  }

  if (name === 'list_index') {
    const pick = args.status === 'graded' ? graded : args.status === 'scouted' ? scouted : skills;
    return {
      counts: { graded: graded.length, scouted: scouted.length },
      entries: pick.map((s) => (s.status === 'graded'
        ? { name: s.name, status: 'graded', grade: s.grade, score: `${s.score_total}/24`, summary: s.summary, worksheet: `${REPO}/blob/main/${s.evidence_url}` }
        : { name: s.name, status: 'scouted (ungraded)', summary: s.summary, repo: s.repo_url })),
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
