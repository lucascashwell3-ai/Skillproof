#!/usr/bin/env python3
"""Render a Goldproof findings.json into a self-contained themed report.html.

    python3 render_report.py <findings.json> [-o report.html]

The optional HTML report output. The canonical artifacts remain report.md + findings.json;
this is the pretty view (cosmic-gold theme, fully self-contained, no external assets).
"""
import argparse
import html
import json
import sys

CONF = {"high": ("hi", "high"), "moderate": ("mod", "moderate"), "low": ("low", "low")}
TAGS = {
    "integrate-now": ("Integrate now", "⚙"),
    "skill-candidate": ("New skills to scaffold", "✦"),
    "behavior-change": ("Behavior changes (CLAUDE.md)", "📐"),
    "ignore": ("Considered & skipped", "◦"),
}
CSS = """
:root{--bg:#07070c;--ink:#e7e2d6;--ink-soft:#b7b2c0;--muted:#8a8598;--gold-shadow:#957C51;
--gold-mid:#B09D6B;--gold-hi:#CAB77D;--gold-accent:#DDB947;--gold-spark:#F6ECC9;
--glass:rgba(255,255,255,.035);--brd:rgba(202,183,125,.16);--brd-s:rgba(202,183,125,.32);
--mono:ui-monospace,"SF Mono","Cascadia Code",Menlo,Consolas,monospace;
--sans:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font-family:var(--sans);line-height:1.6;
-webkit-font-smoothing:antialiased;padding:clamp(20px,5vw,64px) clamp(16px,5vw,20px)}
body::before{content:"";position:fixed;inset:0;z-index:-1;background:
radial-gradient(120% 80% at 80% -10%,rgba(123,92,196,.20),transparent 55%),
radial-gradient(90% 60% at 10% 6%,rgba(221,185,71,.08),transparent 50%),
radial-gradient(1px 1px at 20% 30%,rgba(255,255,255,.5),transparent),
radial-gradient(1px 1px at 75% 60%,rgba(255,255,255,.35),transparent),
radial-gradient(1.3px 1.3px at 85% 22%,rgba(246,236,201,.6),transparent),
radial-gradient(1px 1px at 40% 80%,rgba(255,255,255,.4),transparent);
background-size:100% 100%,100% 100%,100% 100%,100% 100%,100% 100%,100% 100%}
.doc{max-width:900px;margin:0 auto}
.metal{background:linear-gradient(100deg,var(--gold-shadow),var(--gold-mid) 22%,var(--gold-hi) 38%,
var(--gold-spark) 48%,var(--gold-accent) 56%,var(--gold-hi) 70%,var(--gold-shadow));
-webkit-background-clip:text;background-clip:text;color:transparent}
header{border-bottom:1px solid var(--brd);padding-bottom:24px;margin-bottom:12px}
h1{font-size:clamp(1.6rem,4vw,2.4rem);letter-spacing:-.03em;font-weight:660;line-height:1.15}
.topic{color:var(--ink-soft);font-weight:500}
.meta{font-family:var(--mono);font-size:.78rem;color:var(--muted);line-height:1.9;margin-top:16px;
display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:2px 18px}
.meta b{color:var(--gold-hi);font-weight:600}
.note{font-size:.82rem;color:var(--muted);background:rgba(202,183,125,.05);border:1px solid var(--brd);
border-radius:12px;padding:14px 16px;margin:18px 0 6px;line-height:1.55}
.note b{color:var(--gold-hi)}
h2{font-size:1.15rem;letter-spacing:-.01em;margin:44px 0 4px;display:flex;align-items:center;gap:.5em}
h2 .ic{font-size:.9em}
h2 .ct{font-family:var(--mono);font-size:.7rem;color:var(--muted);margin-left:auto;font-weight:400;letter-spacing:.02em}
section{margin-top:8px}
.first{background:linear-gradient(180deg,rgba(221,185,71,.09),transparent);border:1px solid var(--brd);
border-radius:16px;padding:22px 24px;margin-top:14px}
.first ol{list-style:none;counter-reset:f;display:flex;flex-direction:column;gap:10px}
.first li{counter-increment:f;display:flex;gap:13px;align-items:baseline;color:var(--ink-soft);font-size:.95rem}
.first li::before{content:counter(f);font-family:var(--mono);font-size:.72rem;color:var(--gold-accent);
border:1px solid var(--brd);border-radius:6px;min-width:1.7em;height:1.7em;display:inline-grid;place-items:center;flex:none}
.first li .sc{margin-left:auto;font-family:var(--mono);font-size:.74rem;color:var(--muted);flex:none}
.f{background:var(--glass);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:18px 20px;margin-top:12px;
backdrop-filter:blur(8px)}
.f .top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:9px}
.chip{font-family:var(--mono);font-size:.66rem;padding:.24em .62em;border-radius:999px;font-weight:600;letter-spacing:.02em}
.chip.hi{color:#0c1a0e;background:linear-gradient(140deg,#b8e6b0,#7fd07a)}
.chip.mod{color:#1a140a;background:linear-gradient(140deg,var(--gold-spark),var(--gold-accent))}
.chip.low{color:var(--muted);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}
.chip.id{color:var(--gold-hi);background:rgba(202,183,125,.08);border:1px solid var(--brd);font-weight:500}
.chip.ie{margin-left:auto;color:var(--muted);background:transparent;font-size:.68rem;padding:.2em 0}
.claim{color:var(--ink);font-size:.98rem;line-height:1.5}
.claim code{font-family:var(--mono);font-size:.86em;color:var(--gold-hi);background:rgba(202,183,125,.09);padding:.08em .4em;border-radius:5px}
.src{font-family:var(--mono);font-size:.74rem;color:var(--muted);margin-top:10px}
.src a{color:var(--gold-hi);text-decoration:none;border-bottom:1px solid rgba(202,183,125,.3)}
.src .q{color:var(--ink-soft)}
.pay{margin-top:12px;background:#0a0a12;border:1px solid rgba(255,255,255,.07);border-radius:10px;
padding:12px 14px;font-family:var(--mono);font-size:.78rem;color:var(--ink-soft);white-space:pre-wrap;overflow-x:auto;line-height:1.5}
.pay .k{color:var(--gold-accent)}
.pay .cm{color:var(--muted)}
.add{color:#8fd08a}
footer{margin-top:48px;border-top:1px solid var(--brd);padding-top:20px;font-size:.8rem;color:var(--muted);line-height:1.8}
footer a{color:var(--gold-hi);text-decoration:none}
"""


def esc(s):
    return html.escape(str(s if s is not None else ""))


def render(data):
    run = data.get("run", {})
    findings = data.get("findings", [])
    by_id = {f["id"]: f for f in findings}
    src = run.get("sources", {})
    parts = []
    parts.append(f"""<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Goldproof report — {esc(run.get('topic',''))[:60]}</title><style>{CSS}</style></head>
<body><div class="doc"><header>
<h1><span class="metal">✦ Goldproof report</span></h1>
<p class="topic">{esc(run.get('topic',''))}</p>
<div class="meta">
<div>Stack&nbsp; <b>{esc(run.get('stack_context','—'))}</b></div>
<div>Sources&nbsp; Web <b>{esc(src.get('web',0))}</b> · YouTube <b>{esc(src.get('youtube',0))}</b> · X <b>{esc(src.get('x','off'))}</b></div>
<div>Backend&nbsp; <b>{esc(run.get('backend','local'))}</b> · Dry-run <b>{'yes' if run.get('dry_run',True) else 'no'}</b></div>
<div>Findings&nbsp; <b>{esc(run.get('counts',{}).get('kept',len(findings)))}</b> kept · <b>{esc(run.get('counts',{}).get('fabricated',0))}</b> fabricated</div>
<div>Generated&nbsp; <b>{esc(run.get('generated',''))}</b></div>
</div>""")
    for n in run.get("coverage_notes", []):
        parts.append(f'<div class="note">◦ {esc(n)}</div>')
    parts.append("</header>")

    # Do this first
    shortlist = data.get("do_this_first", [])
    if shortlist:
        parts.append('<h2><span class="ic">▶</span> Do this first</h2><section class="first"><ol>')
        for fid in shortlist:
            f = by_id.get(fid)
            if not f:
                continue
            parts.append(f'<li>{esc(f["claim"][:96])}{"…" if len(f["claim"])>96 else ""}'
                         f'<span class="sc">{f.get("priority","")}</span></li>')
        parts.append("</ol></section>")

    # Grouped by tag
    for tag, (title, ic) in TAGS.items():
        group = [f for f in findings if f.get("classification") == tag]
        if not group:
            continue
        parts.append(f'<h2><span class="ic">{ic}</span> {esc(title)}<span class="ct">{len(group)}</span></h2><section>')
        for f in group:
            cc, cl = CONF.get(f.get("confidence", "low"), ("low", "low"))
            s = f.get("source", {})
            ts = f" @ {esc(s['timestamp'])}" if s.get("timestamp") else ""
            parts.append('<div class="f"><div class="top">')
            parts.append(f'<span class="chip {cc}">{cl}</span>')
            parts.append(f'<span class="chip id">{esc(f.get("id",""))}</span>')
            parts.append(f'<span class="chip ie">impact {esc(f.get("impact","?"))} · effort {esc(f.get("effort","?"))} · ▲{f.get("priority","")}</span>')
            parts.append("</div>")
            parts.append(f'<div class="claim">{esc(f.get("claim",""))}</div>')
            if s.get("url"):
                parts.append(f'<div class="src">◦ {esc(s.get("title",""))}{ts} — '
                             f'<a href="{esc(s["url"])}">source</a> · '
                             f'<span class="q">“{esc((f.get("evidence_quote","") or "")[:120])}”</span></div>')
            parts.append(_payload(f))
            parts.append("</div>")
        parts.append("</section>")

    parts.append(f"""<footer>
Generated by <a href="../../README.md">Goldproof</a> — dry-run, X {esc(src.get('x','off'))}.
Every claim carries a source + confidence; unsourced findings are dropped, not guessed.<br>
Machine-readable: <a href="findings.json">findings.json</a> · full markdown: <a href="report.md">report.md</a><br>
<span style="color:var(--gold-hi)">✦</span> part of the -proof family — DATproof · Modelproof · Goldproof
</footer></div></body></html>""")
    return "".join(parts)


def _payload(f):
    p = f.get("payload") or {}
    tag = f.get("classification")
    if tag == "integrate-now":
        cmd = p.get("command") or p.get("change") or ""
        tgt = p.get("target", "")
        note = p.get("note", "")
        body = ""
        if cmd:
            body += f'<span class="cm"># {esc(tgt)}</span>\n<span class="k">$</span> {esc(cmd)}'
        if note:
            body += f'\n<span class="cm"># {esc(note)}</span>'
        return f'<div class="pay">{body}</div>' if body else ""
    if tag == "skill-candidate":
        sm = p.get("skill_md", "")
        path = p.get("suggested_path", "")
        why = p.get("why_skill", "")
        head = f'<span class="cm"># why a skill: {esc(why)}</span>\n' if why else ""
        return (f'<div class="pay">{head}<span class="cm"># {esc(path)}</span>\n' + _diff_lines(sm) + "</div>") if sm else ""
    if tag == "behavior-change":
        diff = p.get("diff", "")
        tgt = p.get("target", "")
        return (f'<div class="pay"><span class="cm"># → {esc(tgt)}</span>\n' + _diff_lines(diff) + "</div>") if diff else ""
    return ""


def _diff_lines(text):
    out = []
    for line in text.split("\n"):
        e = esc(line)
        if line.startswith("+"):
            out.append(f'<span class="add">{e}</span>')
        else:
            out.append(e)
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("findings")
    ap.add_argument("-o", "--out")
    args = ap.parse_args()
    with open(args.findings) as fh:
        data = json.load(fh)
    out = render(data)
    if args.out:
        with open(args.out, "w") as fh:
            fh.write(out)
        print(f"wrote {args.out} ({len(out)} bytes)")
    else:
        sys.stdout.write(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
