/* Skillproof workbench — improve-areas rail → catalog → build tray.
   Data contract: docs/data/skills.json (validated by scripts/validate_index.py).
   Honesty rules: every claim on the page derives from a real field in the data.
   Tested entries carry receipts; everything else is scouted and the install
   plan says so — no fabricated grades, commands, or stats. */
(function () {
  "use strict";

  var RM = window.matchMedia("(prefers-reduced-motion: reduce)");
  var REPO = "https://github.com/lucascashwell3-ai/Skillproof";
  var DATA = null;

  var FACETS = [
    { k: "all",     label: "All" },
    { k: "skill",   label: "Skills" },
    { k: "library", label: "Libraries" }
  ];
  var MODES = [
    { id: "terminal", label: "Terminal" },
    { id: "agent",    label: "Ask your agent" }
  ];
  var SORTS = [
    { id: "match", label: "Best match" },
    { id: "stars", label: "★ Stars" }
  ];

  var S = { pains: [], applied: false };
  var state = { q: "", facet: "all", tray: [], cursor: -1, mode: "terminal", explain: true, sort: "match", open: null };
  var byId = {};
  var PAIN_LBL = {};   // id -> full label (used in search keywords)
  var PAIN_SHORT = {}; // id -> short chip label

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function hi(text, q) {
    if (!q) return esc(text);
    var i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
  }
  function kindOf(s) { return s.category === "library" ? "library" : "skill"; }
  function stars(s) { return (s.signals && s.signals.stars) || 0; }
  function fmtNum(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
    return String(n);
  }
  function icon(kind) { return '<svg><use href="#i-' + kind + '"/></svg>'; }
  var CHECK = '<svg class="checkmark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

  function toast(msg) {
    var t = $("#toast");
    t.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' + esc(msg);
    t.classList.add("on");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("on"); }, 2300);
  }

  /* ======================= ripple + magnetic ======================= */
  document.addEventListener("pointerdown", function (e) {
    var b = e.target.closest(".btn, .facet, .add, .copy, .chip, .seg, .editbtn");
    if (!b || RM.matches) return;
    var r = b.getBoundingClientRect();
    var s = document.createElement("span");
    s.className = "ripple";
    var d = Math.max(r.width, r.height) * 2.4;
    s.style.width = s.style.height = d + "px";
    s.style.left = (e.clientX - r.left) + "px";
    s.style.top = (e.clientY - r.top) + "px";
    b.appendChild(s);
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 660);
  });
  function wireMagnetic(el) {
    el.addEventListener("pointermove", function (e) {
      if (RM.matches) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", ((e.clientX - (r.left + r.width / 2)) * 0.13).toFixed(1) + "px");
      el.style.setProperty("--my", ((e.clientY - (r.top + r.height / 2)) * 0.20).toFixed(1) + "px");
    });
    el.addEventListener("pointerleave", function () {
      el.style.setProperty("--mx", "0px");
      el.style.setProperty("--my", "0px");
    });
  }
  $$("[data-magnetic]").forEach(wireMagnetic);

  /* ======================= matcher (same algorithm as mcp/server.js — keep in sync) ======================= */
  var STOP = {};
  ["and", "the", "for", "with", "that", "this", "are", "but", "not", "you", "your", "its",
    "out", "get", "too", "very", "when", "how", "what", "all", "can", "like", "look", "looks",
    "make", "makes", "feel", "feels", "keep", "keeps", "into", "from", "they", "them", "then",
    "than", "have", "has", "had", "will", "just", "really", "been", "was", "were", "our",
    "any", "every", "some", "more", "most", "less", "off", "own", "use", "using", "used",
    "want", "need", "needs", "always", "never", "still", "about"
  ].forEach(function (w) { STOP[w] = 1; });

  function tokenize(q) {
    return String(q || "").toLowerCase().split(/[^a-z0-9']+/).filter(function (t) {
      return t.length > 2 && !STOP[t];
    });
  }
  function kwHit(kw, t) {
    return kw === t || kw === t + "s" || t === kw + "s" ||
      (t.length >= 4 && kw.length >= 4 && (kw.indexOf(t) >= 0 || t.indexOf(kw) >= 0));
  }
  var KW_IDX = null;
  function kwIndex() {
    if (KW_IDX) return KW_IDX;
    KW_IDX = {};
    (DATA.pain_points || []).forEach(function (p) {
      KW_IDX[p.id] = (p.keywords || []).concat(tokenize(p.label)).concat(tokenize(p.short || ""));
    });
    return KW_IDX;
  }
  function textHits(entry, tokens) {
    var idx = kwIndex();
    var hay = " " + [entry.name, entry.summary, entry.author, entry.category].join(" ").toLowerCase() + " ";
    var hits = 0;
    tokens.forEach(function (t) {
      var safe = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp("\\b" + safe).test(hay)) hits += 1;
      (entry.pain_points || []).forEach(function (pid) {
        for (var i = 0; i < (idx[pid] || []).length; i++) {
          if (kwHit(idx[pid][i], t)) { hits += 1.5; return; }
        }
      });
    });
    return hits;
  }

  /* ======================= honest evaluation ======================= */
  function setupActive() { return S.applied && S.pains.length; }

  /* pills are capped at 2 and every string names a real data field */
  function evaluate(it) {
    var out = { pills: [], score: 0 };
    var tr = it.triage || {};

    if (setupActive()) {
      S.pains.forEach(function (pid) {
        if ((it.pain_points || []).indexOf(pid) > -1) {
          out.pills.push(["fit", PAIN_SHORT[pid]]);
          out.score += 10;
        }
      });
    }
    if (it.status === "graded") out.score += 1;
    if (tr.license && /^no /i.test(tr.license)) {
      out.pills.push(["bad", "No license — usage rights unclear"]);
      out.score -= 2;
    }
    out.pills = out.pills.slice(0, 2);
    return out;
  }

  function matches(it) {
    if (state.facet !== "all" && kindOf(it) !== state.facet) return false;
    var q = state.q.trim();
    if (!q) return true;
    var tokens = tokenize(q);
    if (!tokens.length) {
      return (it.name + " " + it.summary).toLowerCase().indexOf(q.toLowerCase()) > -1;
    }
    return textHits(it, tokens) >= 1;
  }

  function counts() {
    var c = { all: 0, skill: 0, library: 0 };
    DATA.skills.forEach(function (it) {
      var facetSave = state.facet;
      state.facet = "all";
      var ok = matches(it);
      state.facet = facetSave;
      if (ok) { c.all++; c[kindOf(it)]++; }
    });
    return c;
  }

  /* ======================= setup rail ======================= */
  var TICK = '<span class="tick"><svg viewBox="0 0 16 16" fill="none"><path d="M4 8.2l2.6 2.6L12 5.4" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';

  function buildPainChips() {
    var mount = $("#grpPain");
    DATA.pain_points.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.dataset.id = p.id;
      b.setAttribute("aria-pressed", "false");
      b.innerHTML = TICK + "<span>" + esc(p.short || p.label) + "</span>";
      b.addEventListener("click", function () {
        var i = S.pains.indexOf(p.id);
        if (i > -1) { S.pains.splice(i, 1); b.setAttribute("aria-pressed", "false"); }
        else if (S.pains.length < 5) { S.pains.push(p.id); b.setAttribute("aria-pressed", "true"); }
        else { toast("Five max — remove one first"); return; }
        onSetupChange();
      });
      mount.appendChild(b);
    });
  }

  function onSetupChange() {
    $("#applySetup").disabled = !S.pains.length;
    $("#setupMsg").textContent = S.pains.length
      ? S.pains.length + " of 5 picked"
      : "Pick up to five.";
    if (S.applied) render();
    renderTray();
  }

  $("#applySetup").addEventListener("click", function () {
    if (!S.pains.length) return;
    S.applied = true;
    renderSummary();
    $("#setup").classList.add("collapsed");
    render(); renderTray();
    toast("Catalog sorted");
  });
  $("#editSetup").addEventListener("click", function () {
    $("#setup").classList.remove("collapsed");
  });
  function renderSummary() {
    $("#sumPills").innerHTML = S.pains.map(function (pid) {
      return '<span class="sum-pill"><i></i>' + esc(PAIN_SHORT[pid]) + "</span>";
    }).join("");
  }

  /* ======================= facets ======================= */
  var facetsEl, glide;
  function buildFacets() {
    facetsEl = $("#facets"); glide = $("#glide");
    FACETS.forEach(function (t) {
      var b = document.createElement("button");
      b.className = "facet"; b.type = "button"; b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(t.k === state.facet));
      b.dataset.k = t.k;
      b.innerHTML = t.label + ' <span class="cnt"></span>';
      b.addEventListener("click", function () { state.facet = t.k; state.cursor = -1; render(); });
      facetsEl.appendChild(b);
    });
  }
  function moveGlide() {
    var a = facetsEl.querySelector('.facet[aria-selected="true"]');
    if (!a) return;
    glide.style.width = a.offsetWidth + "px";
    glide.style.transform = "translate(" + a.offsetLeft + "px," + (a.offsetTop - 2) + "px)";
  }

  /* ======================= render catalog ======================= */
  /* expanded detail: slim labeled rows, one as-of tag, high-level security line.
     (The one-line blurb expands to the full description via CSS on .row.open.) */
  function mdY(iso) { // "2026-07-24" -> "7/24/2026", "2026-02" -> "2/2026"
    if (!iso) return "";
    var p = iso.split("-");
    if (p.length === 3) return (+p[1]) + "/" + (+p[2]) + "/" + p[0];
    if (p.length === 2) return (+p[1]) + "/" + p[0];
    return iso;
  }
  function detailHTML(it) {
    var tr = it.triage || {};
    var rows = [];

    var repoSlug = it.repo_url.replace(/^https:\/\/github\.com\//, "");
    rows.push(["Source", "From a public GitHub repo by " + esc(it.author) +
      ' · <a href="' + esc(it.repo_url) + '" target="_blank" rel="noopener">' + esc(repoSlug) + " ↗</a>"]);

    var created = (tr.provenance || "").match(/created (\d{4}-\d{2})/);
    var pushed = (tr.freshness || "").match(/Last push (\d{4}-\d{2}-\d{2})/);
    if (created || pushed) {
      rows.push(["Last updated",
        esc((created ? "Created " + mdY(created[1]) + ". " : "") +
            (pushed ? "Last push " + mdY(pushed[1]) + "." : ""))]);
    }
    if (it.signals) {
      rows.push(["Exposure", esc(it.signals.stars.toLocaleString() + " GitHub stars · " +
        (it.signals.forks || 0).toLocaleString() + " forks")]);
    }
    if (tr.license) rows.push(["License", esc(tr.license.split("—")[0].trim().replace(/\.$/, ""))]);

    var sec;
    if (it.status === "graded") {
      sec = "Tested by Skillproof — installed, probed, and every line of source read. Graded " +
        it.grade + " (" + it.score_total + "/24).";
    } else if (it.skim && !(it.skim.red_flags || []).length) {
      sec = "Automatically screened for known malicious patterns — none found. Not yet hand-tested by Skillproof; review the source before installing.";
    } else if (it.skim) {
      sec = "Flagged by our automated screen — held from recommendations until reviewed.";
    } else {
      sec = "Not yet screened — review the source before installing.";
    }
    rows.push(["Security", esc(sec)]);

    var worksheet = it.status === "graded" && it.evidence_url
      ? '<a class="btn btn-ghost btn-sm" href="' + REPO + "/blob/main/" + esc(it.evidence_url) + '" target="_blank" rel="noopener">Test worksheet ↗</a>'
      : "";
    var asOf = (it.skim && it.skim.date) || (it.signals && it.signals.checked) || DATA.as_of;
    return '<div class="row-detail"><div class="rd-in">' +
      '<div class="rd-rows">' + rows.map(function (kv, i) {
        return '<div class="rd-row" style="animation-delay:' + (i * 40) + 'ms"><span class="rd-k">' + kv[0] +
          '</span><span class="rd-v">' + kv[1] + "</span></div>";
      }).join("") + "</div>" +
      '<div class="rd-actions">' +
        worksheet +
        '<span class="rd-asof">As of ' + esc(mdY(asOf)) + "</span>" +
      "</div>" +
    "</div></div>";
  }

  function rowHTML(it, ev, q, i) {
    var kind = kindOf(it);
    var inTray = state.tray.indexOf(it.id) > -1;
    var pills = ev.pills.length
      ? '<div class="reasons">' + ev.pills.map(function (b, k) {
          return '<span class="rz ' + b[0] + '" style="animation-delay:' + (k * 40) + 'ms"><i></i>' + esc(b[1]) + "</span>";
        }).join("") + "</div>"
      : "";
    var tested = it.status === "graded" ? '<span class="tag tested">Tested ✓</span>' : "";
    var sig = it.signals && it.signals.stars
      ? '<span class="row-stars" title="' + it.signals.stars.toLocaleString() + " stars · " +
        (it.signals.forks || 0).toLocaleString() + " forks on GitHub, checked " + esc(it.signals.checked) + '">★ ' +
        fmtNum(it.signals.stars) + "</span>"
      : "";
    var open = state.open === it.id;
    return '<div class="row t-' + kind + (inTray ? " in-tray" : "") + (open ? " open" : "") + (i === state.cursor ? " cursor" : "") +
      '" data-id="' + it.id + '" draggable="true" role="option" aria-selected="' + (i === state.cursor) + '" aria-expanded="' + open + '">' +
      '<span class="tico">' + icon(kind) + "</span>" +
      '<div class="row-body">' +
        '<div class="row-top"><span class="row-name">' + hi(it.name, q) + "</span>" + tested + sig + "</div>" +
        '<div class="row-blurb">' + hi(it.summary, q) + "</div>" + pills +
        detailHTML(it) +
      "</div>" +
      '<div class="row-right">' +
        '<span class="chev" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></span>' +
        '<button class="add" type="button" data-add="' + it.id + '" data-state="' + (inTray ? "added" : "idle") + '" aria-label="' +
          (inTray ? "In tray" : "Add " + esc(it.name) + " to tray") + '">' +
          '<span class="add-fill" aria-hidden="true"></span>' +
          '<span class="ic" aria-hidden="true">' + (inTray ? CHECK : '<span class="plus"></span>') + "</span>" +
          '<span class="lbl">' + (inTray ? "In tray" : "Add") + "</span>" +
        "</button>" +
      "</div>" +
    "</div>";
  }

  function render() {
    var list = $("#list"), q = state.q.trim();
    var c = counts();
    $$(".facet", facetsEl).forEach(function (b) {
      b.setAttribute("aria-selected", String(b.dataset.k === state.facet));
      b.querySelector(".cnt").textContent = c[b.dataset.k] || 0;
    });
    moveGlide();
    $("#clearQ").classList.toggle("on", !!q);

    var res = DATA.skills.filter(matches).map(function (it, i) { return { it: it, ev: evaluate(it), i: i }; });
    /* best match: pain-point fit first, stars break ties; stars: pure exposure order */
    res.sort(function (a, b) {
      if (state.sort === "stars") return (stars(b.it) - stars(a.it)) || (a.i - b.i);
      return (b.ev.score - a.ev.score) || (stars(b.it) - stars(a.it)) || (a.i - b.i);
    });
    $("#catCount").textContent = res.length;

    var bar = $("#rankbar");
    if (state.sort === "stars") {
      bar.hidden = false;
      $("#rankmsg").innerHTML = "Sorted by <b>GitHub stars</b>";
    } else if (setupActive()) {
      bar.hidden = false;
      $("#rankmsg").innerHTML = "Sorted for <b>" +
        S.pains.map(function (p) { return esc(PAIN_SHORT[p]); }).join(" · ") + "</b>";
    } else {
      bar.hidden = true;
    }

    if (!res.length) {
      list.innerHTML = '<div class="list-empty"><b>No matches for "' + esc(q) + '"</b>' +
        'No match here ≠ no tool exists — <a href="#with-you">take the scout with you</a> and search the live ecosystem.</div>';
      return;
    }
    list.innerHTML = res.map(function (r, idx) { return rowHTML(r.it, r.ev, q, idx); }).join("");
  }

  /* ======================= tray ======================= */
  function overlaps() {
    var groups = {}, out = [];
    state.tray.forEach(function (id) {
      var it = byId[id];
      (it.pain_points || []).forEach(function (p) {
        (groups[p] = groups[p] || []).push(it);
      });
    });
    Object.keys(groups).forEach(function (k) {
      if (groups[k].length > 1) out.push({ pain: k, items: groups[k] });
    });
    return out;
  }

  function renderTray() {
    var wrap = $("#trayList");
    $("#trayCount").textContent = state.tray.length;

    var ov = overlaps();
    var flagged = {};
    ov.forEach(function (g) { g.items.forEach(function (i) { flagged[i.id] = 1; }); });

    if (!state.tray.length) {
      wrap.innerHTML = '<div class="tray-empty">' +
        '<span class="drop-ring"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg></span>' +
        "<b>Your tray is empty</b><p>Add or drag items from the catalog.</p></div>";
    } else {
      wrap.innerHTML = state.tray.map(function (id) {
        var it = byId[id], kind = kindOf(it);
        var tested = it.status === "graded" ? '<span class="tag tested">Tested ✓</span>' : "";
        return '<div class="titem t-' + kind + (flagged[id] ? " flag" : "") + '" data-id="' + id + '" draggable="true">' +
          '<span class="grip" aria-hidden="true"><svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor"><circle cx="2" cy="2" r="1.3"/><circle cx="6" cy="2" r="1.3"/><circle cx="2" cy="7" r="1.3"/><circle cx="6" cy="7" r="1.3"/><circle cx="2" cy="12" r="1.3"/><circle cx="6" cy="12" r="1.3"/></svg></span>' +
          '<span class="tico tico-sm">' + icon(kind) + "</span>" +
          '<div class="titem-body"><div class="titem-name">' + esc(it.name) + " " + tested + "</div>" +
          '<div class="titem-eff">' + esc(it.summary) + "</div></div>" +
          '<button class="rm" type="button" data-rm="' + id + '" aria-label="Remove ' + esc(it.name) + '">' +
            '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        "</div>";
      }).join("");
    }

    var WARN = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.6L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
    var notes = ov.map(function (g) {
      var names = g.items.map(function (i) { return "<b>" + esc(i.name) + "</b>"; }).join(" and ");
      return '<div class="flag-note">' + WARN + "<p>" + names + " overlap on <b>" +
        esc(PAIN_SHORT[g.pain].toLowerCase()) + "</b> — start with one.</p></div>";
    });
    $("#flags").innerHTML = notes.join("");

    var painSet = [];
    state.tray.forEach(function (id) {
      (byId[id].pain_points || []).forEach(function (p) {
        if (painSet.indexOf(p) < 0) painSet.push(p);
      });
    });
    var eff = $("#effect");
    if (!painSet.length) {
      eff.innerHTML = '<p class="effect-none">Add items to see what your stack covers.</p>';
    } else {
      eff.innerHTML = '<div class="caps">' + painSet.map(function (p, i) {
        return '<span class="cap" style="animation-delay:' + (i * 34) + 'ms"><i></i>' + esc(PAIN_SHORT[p]) + "</span>";
      }).join("") + "</div>";
    }
    wrap.classList.toggle("scrolls", wrap.scrollHeight > wrap.clientHeight + 2);
    renderCmd();
  }

  /* ======================= install plan — two modes ======================= */
  /* Terminal: real commands for tested entries, review-first links for scouted. */
  function planText() {
    var lines = ["# skillproof install plan"];
    state.tray.forEach(function (id, i) {
      var it = byId[id];
      if (it.status === "graded" && it.install && it.install.command) {
        lines.push("# " + (i + 1) + ". " + it.name + " — tested by Skillproof");
        lines.push(it.install.command);
      } else {
        lines.push("# " + (i + 1) + ". " + it.name + " — not tested by us: review, then install per its README");
        lines.push("#    " + it.repo_url);
      }
    });
    return lines.join("\n");
  }
  /* Agent: a prompt you paste at your agent; honest about tested vs not. */
  function agentPrompt() {
    var lines = ["Install this stack into my AI environment, one item at a time:"];
    state.tray.forEach(function (id, i) {
      var it = byId[id];
      if (it.status === "graded" && it.install && it.install.command) {
        lines.push((i + 1) + ". " + it.name + " (tested by Skillproof) — run: " + it.install.command);
      } else {
        lines.push((i + 1) + ". " + it.name + " (listed but not tested by Skillproof) — fetch " + it.repo_url +
          ", read the README and source, then install per its instructions.");
      }
    });
    lines.push("");
    lines.push("Rules: install only these items. Show me each command before running it. Flag anything that wants network access, credentials, or writes outside the project.");
    if (state.explain) {
      lines.push("Before each install, explain in 2-3 sentences what the item does, then ask me one short question to confirm I know when I'd use it.");
    }
    return lines.join("\n");
  }
  function activePlan() { return state.mode === "agent" ? agentPrompt() : planText(); }

  var modeWrap, modeThumb;
  function buildModes() {
    modeWrap = $("#grpMode"); modeThumb = $("#modeThumb");
    MODES.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "seg"; b.dataset.id = o.id; b.textContent = o.label;
      b.setAttribute("aria-pressed", String(o.id === state.mode));
      b.addEventListener("click", function () {
        state.mode = o.id;
        $$(".seg", modeWrap).forEach(function (s) { s.setAttribute("aria-pressed", String(s.dataset.id === o.id)); });
        moveModeThumb();
        $("#explainWrap").hidden = state.mode !== "agent";
        $("#copyPlanLbl").textContent = state.mode === "agent" ? "Copy agent prompt" : "Copy install plan";
        renderCmd();
      });
      modeWrap.appendChild(b);
    });
    $("#explainChk").addEventListener("change", function (e) {
      state.explain = e.target.checked;
      renderCmd();
    });
  }
  function moveModeThumb() {
    var a = modeWrap.querySelector('.seg[aria-pressed="true"]');
    if (!a) { modeThumb.classList.remove("on"); return; }
    modeThumb.classList.add("on");
    modeThumb.style.width = a.offsetWidth + "px";
    modeThumb.style.transform = "translateX(" + a.offsetLeft + "px)";
  }

  var sortWrap, sortThumb;
  function buildSort() {
    sortWrap = $("#grpSort"); sortThumb = $("#sortThumb");
    SORTS.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "seg"; b.dataset.id = o.id; b.textContent = o.label;
      b.setAttribute("aria-pressed", String(o.id === state.sort));
      b.addEventListener("click", function () {
        state.sort = o.id;
        $$(".seg", sortWrap).forEach(function (s) { s.setAttribute("aria-pressed", String(s.dataset.id === o.id)); });
        moveSortThumb();
        state.cursor = -1;
        render();
      });
      sortWrap.appendChild(b);
    });
  }
  function moveSortThumb() {
    var a = sortWrap.querySelector('.seg[aria-pressed="true"]');
    if (!a) { sortThumb.classList.remove("on"); return; }
    sortThumb.classList.add("on");
    sortThumb.style.width = a.offsetWidth + "px";
    sortThumb.style.transform = "translateX(" + a.offsetLeft + "px)";
  }

  /* When the tray column grows (agent prompt, many items), the catalog list's
     height cap left dead space under its fade mask. Track the tray: the list
     cap becomes max(its own cap, whatever fills the panel to the tray's height). */
  function syncListHeight() {
    var list = $("#list");
    if (!list) return;
    var twoCol = window.matchMedia("(min-width: 1241px)").matches;
    if (!twoCol) { list.style.maxHeight = ""; return; }
    var panel = list.closest(".panel");
    var tray = $("#tray");
    var cap = Math.min(window.innerHeight * 0.74, 940);
    var chrome = (list.getBoundingClientRect().top - panel.getBoundingClientRect().top) + 13;
    list.style.maxHeight = Math.max(cap, tray.offsetHeight - chrome) + "px";
  }

  function renderCmd() {
    var box = $("#cmdbox");
    if (!state.tray.length) {
      box.innerHTML = '<span class="muted">' +
        (state.mode === "agent" ? "# add items to build your agent prompt" : "# add items to build your install plan") +
        "</span>";
      box.dataset.cmd = "";
    } else {
      var txt = activePlan();
      var html = txt.split("\n").map(function (l) {
        if (l.charAt(0) === "#") return '<span class="muted">' + esc(l) + "</span>";
        if (state.mode === "agent") {
          return /^\d+\./.test(l)
            ? '<span class="p">' + esc(l) + "</span>"
            : '<span class="f">' + esc(l) + "</span>";
        }
        return esc(l).replace(/^(\S+)/, '<span class="k">$1</span>');
      }).join("<br>");
      box.innerHTML = html;
      box.dataset.cmd = txt;
    }
    requestAnimationFrame(syncListHeight);
  }

  /* ======================= add / remove ======================= */
  function flyTo(srcEl, item, done) {
    if (RM.matches || !srcEl) { done(); return; }
    var s = srcEl.getBoundingClientRect();
    var trayR = $("#tray").getBoundingClientRect();
    var f = document.createElement("div");
    f.className = "flier t-" + kindOf(item);
    f.innerHTML = '<span class="tico tico-sm">' + icon(kindOf(item)) + "</span>" + esc(item.name);
    document.body.appendChild(f);
    var fr = f.getBoundingClientRect();
    var x0 = s.left, y0 = s.top + s.height / 2 - fr.height / 2;
    var x1 = trayR.left + trayR.width / 2 - fr.width / 2;
    var y1 = trayR.top + 62;
    f.style.left = "0px"; f.style.top = "0px";
    var anim = f.animate([
      { transform: "translate(" + x0 + "px," + y0 + "px) scale(.86)", opacity: 0 },
      { transform: "translate(" + ((x0 + x1) / 2) + "px," + (Math.min(y0, y1) - 50) + "px) scale(1.06)", opacity: 1, offset: .45 },
      { transform: "translate(" + x1 + "px," + y1 + "px) scale(.7)", opacity: 0 }
    ], { duration: 600, easing: "cubic-bezier(.34,.9,.3,1)" });
    anim.onfinish = function () { f.remove(); done(); };
  }
  function addItem(id, srcBtn) {
    if (state.tray.indexOf(id) > -1) return;
    var it = byId[id];
    var btn = srcBtn || $('[data-add="' + id + '"]');
    if (btn) {
      btn.dataset.state = "added";
      var ic = btn.querySelector(".ic"); if (ic) ic.innerHTML = CHECK;
      var lbl = btn.querySelector(".lbl"); if (lbl) lbl.textContent = "In tray";
      btn.setAttribute("aria-label", "In tray");
      var row = btn.closest(".row"); if (row) row.classList.add("in-tray");
    }
    var push = function () {
      state.tray.push(id);
      renderTray();
      var el = $("#trayList").querySelector('[data-id="' + id + '"]');
      if (el && !RM.matches) el.classList.add("enter");
      var c = $("#trayCount"); c.classList.add("bump");
      setTimeout(function () { c.classList.remove("bump"); }, 260);
    };
    flyTo(btn && btn.closest(".row") ? btn.closest(".row").querySelector(".tico") : null, it, push);
  }
  function removeItem(id) {
    var el = $("#trayList").querySelector('[data-id="' + id + '"]');
    var finish = function () {
      state.tray = state.tray.filter(function (x) { return x !== id; });
      renderTray(); render();
    };
    if (el && !RM.matches) { el.classList.add("leaving"); setTimeout(finish, 240); } else finish();
  }

  /* ======================= events ======================= */
  function wireEvents() {
    /* Add button adds; anywhere else on the row toggles the detail popout.
       Links inside the open detail behave as links. */
    $("#list").addEventListener("click", function (e) {
      var a = e.target.closest("[data-add]");
      if (a) { if (a.dataset.state !== "added") addItem(a.dataset.add, a); return; }
      if (e.target.closest(".row-detail a")) return;
      if (e.target.closest(".row-detail")) return;
      var row = e.target.closest(".row");
      if (!row) return;
      var id = row.dataset.id;
      if (state.open === id) {
        state.open = null;
        row.classList.remove("open");
        row.setAttribute("aria-expanded", "false");
      } else {
        var prev = $("#list").querySelector(".row.open");
        if (prev) { prev.classList.remove("open"); prev.setAttribute("aria-expanded", "false"); }
        state.open = id;
        row.classList.add("open");
        row.setAttribute("aria-expanded", "true");
      }
    });
    $("#trayList").addEventListener("click", function (e) {
      var r = e.target.closest("[data-rm]");
      if (r) removeItem(r.dataset.rm);
    });

    var qi = $("#q");
    qi.addEventListener("input", function () { state.q = qi.value; state.cursor = -1; render(); });
    qi.addEventListener("keydown", function (e) {
      var rows = $$(".row");
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!rows.length) return;
        state.cursor = e.key === "ArrowDown"
          ? Math.min(rows.length - 1, state.cursor + 1)
          : Math.max(0, state.cursor - 1);
        render();
        var cur = $(".row.cursor");
        if (cur) cur.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        var cur2 = $(".row.cursor");
        if (cur2) {
          e.preventDefault();
          var b = cur2.querySelector(".add");
          if (b.dataset.state !== "added") addItem(cur2.dataset.id, b);
        }
      } else if (e.key === "Escape") {
        qi.value = ""; state.q = ""; state.cursor = -1; render();
      }
    });
    $("#list").addEventListener("scroll", function () {
      $("#list").classList.toggle("scrolled", $("#list").scrollTop > 6);
    });
    $("#clearQ").addEventListener("click", function () {
      qi.value = ""; state.q = ""; state.cursor = -1; render(); qi.focus();
    });
    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); qi.focus(); qi.select();
      }
    });
    $("#clearTray").addEventListener("click", function () {
      if (!state.tray.length) return;
      state.tray = []; renderTray(); render(); toast("Tray cleared");
    });

    function copyPlanNow(btn) {
      var txt = $("#cmdbox").dataset.cmd || "";
      if (!txt) { toast("Add something to the tray first"); return; }
      try { if (navigator.clipboard) navigator.clipboard.writeText(txt); } catch (err) {}
      toast(state.mode === "agent" ? "Agent prompt copied — paste it at your agent" : "Install plan copied — paste it in your terminal");
      if (btn) {
        btn.classList.add("done");
        setTimeout(function () { btn.classList.remove("done"); }, 1800);
      }
    }
    $("#copyPlan").addEventListener("click", function () { copyPlanNow(null); });
    $("#copy").addEventListener("click", function () { copyPlanNow($("#copy")); });

    $$(".copy[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        try { if (navigator.clipboard) navigator.clipboard.writeText(btn.getAttribute("data-copy")); } catch (err) {}
        btn.classList.add("done");
        toast("Copied");
        setTimeout(function () { btn.classList.remove("done"); }, 1600);
      });
    });

    /* drag & drop */
    var dragId = null, dragFrom = null;
    document.addEventListener("dragstart", function (e) {
      var row = e.target.closest && e.target.closest(".row");
      var ti = e.target.closest && e.target.closest(".titem");
      if (row) { dragId = row.dataset.id; dragFrom = "cat"; row.classList.add("dragging"); }
      else if (ti) { dragId = ti.dataset.id; dragFrom = "tray"; ti.classList.add("dragging"); }
      else return;
      try { e.dataTransfer.setData("text/plain", dragId); e.dataTransfer.effectAllowed = "copyMove"; } catch (err) {}
    });
    document.addEventListener("dragend", function () {
      $$(".dragging").forEach(function (el) { el.classList.remove("dragging"); });
      $("#tray").classList.remove("dragover");
      dragId = null; dragFrom = null;
    });
    var trayEl = $("#tray");
    trayEl.addEventListener("dragover", function (e) {
      if (!dragId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = dragFrom === "cat" ? "copy" : "move";
      if (dragFrom === "cat") trayEl.classList.add("dragover");
      if (dragFrom === "tray") {
        var over = e.target.closest(".titem");
        if (over && over.dataset.id !== dragId) {
          var from = state.tray.indexOf(dragId), to = state.tray.indexOf(over.dataset.id);
          if (from > -1 && to > -1) {
            state.tray.splice(to, 0, state.tray.splice(from, 1)[0]);
            renderTray();
          }
        }
      }
    });
    trayEl.addEventListener("dragleave", function (e) {
      if (!trayEl.contains(e.relatedTarget)) trayEl.classList.remove("dragover");
    });
    trayEl.addEventListener("drop", function (e) {
      e.preventDefault();
      trayEl.classList.remove("dragover");
      if (dragFrom === "cat" && dragId) {
        var b = $('[data-add="' + dragId + '"]');
        addItem(dragId, b);
        render();
      }
    });

    /* prompt generator */
    $("#genPrompt").addEventListener("click", function () {
      $("#promptText").value = buildPrompt();
      $("#promptPanel").classList.add("open");
    });
    $("#copyPrompt").addEventListener("click", function () {
      try {
        if (navigator.clipboard) navigator.clipboard.writeText($("#promptText").value);
        $("#copyStatus").textContent = "Copied — paste it into any Claude chat.";
      } catch (err) {}
    });
  }

  /* ======================= take-it-with-you demo (rotates 3 scenes) ======================= */
  function startDemo() {
    var demo = $("#demo");
    if (!demo || RM.matches) return; // reduced motion: static first scene, no cycling
    var scenes = $$(".demo-scene", demo);
    var tabs = $$(".demo-tabs span", demo);
    var ways = $$(".way[data-way]");
    var cur = 0;
    function show(i) {
      cur = i;
      scenes.forEach(function (s, k) {
        s.classList.remove("on");
        if (k === i) {
          // reflow so the typing/pop keyframes restart each cycle
          void s.offsetWidth;
          s.classList.add("on");
        }
      });
      tabs.forEach(function (t, k) { t.classList.toggle("on", k === i); });
      ways.forEach(function (w) { w.classList.toggle("demo-live", +w.dataset.way === i); });
    }
    var timer;
    function arm() {
      clearInterval(timer);
      timer = setInterval(function () { show((cur + 1) % scenes.length); }, 5200);
    }
    show(0); arm();
    tabs.forEach(function (t, k) {
      t.addEventListener("click", function () { show(k); arm(); }); // manual pick restarts the clock
    });
  }

  /* ======================= advisor prompt (real data only) ======================= */
  function buildPrompt() {
    var graded = DATA.skills.filter(function (s) { return s.status === "graded"; }).map(function (s) {
      return {
        name: s.name, repo: s.repo_url, grade: s.grade, score: s.score_total + "/24",
        does: s.summary, pain_points: s.pain_points, install: s.install && s.install.command,
        safety: s.security_notes, verified: s.last_verified
      };
    });
    var scouted = DATA.skills.filter(function (s) { return s.status === "scouted"; }).map(function (s) {
      return {
        name: s.name, repo: s.repo_url, status: "SCOUTED — NOT TESTED, NOT GRADED",
        does: s.summary, pain_points: s.pain_points, triage: s.triage, scouted_on: s.scouted_on
      };
    });
    return [
      "You are my AI-environment upgrade advisor and scout, powered by the Skillproof catalog (rubric v" +
        DATA.rubric_version + ", data as of " + DATA.as_of + ").",
      "",
      "When I describe a pain point, weakness, or goal in my AI setup (frontend design output, AI coding, AI workflows, agent tooling), respond in this order — honesty always:",
      "1. TESTED matches (list below): quote the grade, the one-line summary, and the worksheet link. Give the install command when I ask.",
      "2. SCOUTED matches (list below): present as leads, never recommendations — say plainly they were found and triaged but never tested. No install commands for these.",
      "3. Nothing fits? Say so, then (only if I ask) scout the live ecosystem yourself with the triage rubric: verify the repo is real, check license, check last-push freshness, skim for safety red flags (curl|bash, auto-run hooks, undisclosed network calls, credential access). Report those four receipts per candidate. Never install anything; never invent stars, dates, or licenses.",
      "- Never present a scouted or freshly-found item with grade-like language. Skillproof grades come only from the full published rubric run.",
      "- Grades older than ~90 days may be stale; say so.",
      "- Fresh data + every grading worksheet: " + REPO,
      "",
      "TESTED INDEX (installed, probed, receipts on file):",
      JSON.stringify(graded, null, 1),
      "",
      "SCOUTED — found + triaged only, NO grades:",
      JSON.stringify(scouted, null, 1)
    ].join("\n");
  }

  /* ======================= boot ======================= */
  function loadData() {
    if (window.SKILLPROOF_DATA) return Promise.resolve(window.SKILLPROOF_DATA);
    function viaXHR() {
      return new Promise(function (resolve, reject) {
        var x = new XMLHttpRequest();
        x.open("GET", "data/skills.json");
        x.onload = function () {
          try { resolve(JSON.parse(x.responseText)); } catch (e) { reject(e); }
        };
        x.onerror = function () { reject(new Error("could not load data/skills.json")); };
        x.send();
      });
    }
    if (location.protocol === "file:") return viaXHR();
    return fetch("data/skills.json").then(function (r) { return r.json(); }).catch(viaXHR);
  }

  loadData().then(function (d) {
    DATA = d;
    d.skills.forEach(function (s) { byId[s.id] = s; });
    d.pain_points.forEach(function (p) {
      PAIN_LBL[p.id] = p.label;
      PAIN_SHORT[p.id] = p.short || p.label;
    });

    $("#footAsOf").textContent = "Catalog as of " + d.as_of + ".";

    buildPainChips();
    buildFacets();
    buildModes();
    buildSort();
    wireEvents();
    startDemo();
    onSetupChange();
    render();
    renderTray();
    window.addEventListener("resize", function () { moveGlide(); moveModeThumb(); moveSortThumb(); syncListHeight(); });
    setTimeout(function () { moveGlide(); moveModeThumb(); moveSortThumb(); syncListHeight(); }, 60);
  }).catch(function (e) {
    $("#list").innerHTML = '<div class="list-empty"><b>Could not load the catalog</b>' + esc(e.message) + "</div>";
  });
})();
