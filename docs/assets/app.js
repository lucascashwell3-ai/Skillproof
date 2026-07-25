/* Skillproof workbench — setup rail → catalog → build tray.
   Data contract: docs/data/skills.json (validated by scripts/validate_index.py).
   Honesty rules: every reason pill derives from a real field in the data.
   Two tiers everywhere: graded (tested, receipts) vs scouted (found + triaged, NO grade). */
(function () {
  "use strict";

  var RM = window.matchMedia("(prefers-reduced-motion: reduce)");
  var REPO = "https://github.com/lucascashwell3-ai/Skillproof";
  var DATA = null;

  /* Environments: drives the install-plan target + an honest ecosystem note.
     The catalog is Claude-ecosystem; entries are untested elsewhere and rows say so. */
  var ENVS = [
    { id: "claude-code",    label: "Claude Code",    native: true },
    { id: "claude-desktop", label: "Claude Desktop", native: false },
    { id: "cursor",         label: "Cursor",         native: false },
    { id: "other",          label: "Other agent",    native: false }
  ];
  var ENV_LBL = {};
  ENVS.forEach(function (e) { ENV_LBL[e.id] = e.label; });

  var TRUST = [
    { id: "all",    label: "Everything" },
    { id: "graded", label: "Graded only" }
  ];

  var FACETS = [
    { k: "all",     label: "All" },
    { k: "skill",   label: "Skills" },
    { k: "library", label: "Libraries" }
  ];

  /* setup state (S) + view state */
  var S = { env: null, pains: [], trust: "all", applied: false };
  var state = { q: "", facet: "all", tray: [], cursor: -1 };
  var byId = {};
  var PAIN_LBL = {};

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
      KW_IDX[p.id] = (p.keywords || []).concat(tokenize(p.label));
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
  function setupActive() { return S.applied && S.env && S.pains.length; }

  /* every string below names a real data field or a real user tap */
  function evaluate(it) {
    var out = { fit: [], good: [], note: [], bad: [], score: 0, belowBar: false };
    var tr = it.triage || {};

    if (setupActive()) {
      S.pains.forEach(function (pid) {
        if ((it.pain_points || []).indexOf(pid) > -1) {
          out.fit.push("Targets: " + PAIN_LBL[pid].toLowerCase());
          out.score += 10;
        }
      });
      if (S.env && S.env !== "claude-code") {
        out.note.push("Claude-ecosystem catalog — check the repo for " + ENV_LBL[S.env] + " support");
      }
      if (S.trust === "graded" && it.status !== "graded") out.belowBar = true;
    }

    if (it.status === "graded") {
      out.good.push("Tested & graded " + it.grade + " · " + it.score_total + "/24 — receipts on file");
      out.score += 1;
    } else if (it.status === "scouted") {
      out.note.push("Scouted, ungraded — found + triaged, never installed");
    }
    if (tr.license && /^no /i.test(tr.license)) {
      out.bad.push("No license detected — usage rights unclear");
      out.score -= 2;
    }
    if (tr.freshness && /quiet/i.test(tr.freshness)) {
      var m = tr.freshness.match(/~[^.]*quiet/i);
      out.note.push(m ? "Repo " + m[0].toLowerCase() : "Repo has gone quiet");
      out.score -= 1;
    }
    if (tr.freshness && /actively maintained/i.test(tr.freshness)) {
      out.good.push("Actively maintained");
      out.score += 1;
    }
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

  function buildEnvChips() {
    var mount = $("#grpEnv");
    ENVS.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.dataset.id = o.id;
      b.setAttribute("aria-pressed", "false");
      b.innerHTML = TICK + "<span>" + o.label + "</span>";
      b.addEventListener("click", function () {
        S.env = (S.env === o.id) ? null : o.id;
        $$(".chip", mount).forEach(function (c) { c.setAttribute("aria-pressed", String(c.dataset.id === S.env)); });
        onSetupChange();
      });
      mount.appendChild(b);
    });
  }
  function buildPainChips() {
    var mount = $("#grpPain");
    DATA.pain_points.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.dataset.id = p.id;
      b.setAttribute("aria-pressed", "false");
      b.innerHTML = TICK + "<span>" + esc(p.label) + "</span>";
      b.addEventListener("click", function () {
        var i = S.pains.indexOf(p.id);
        if (i > -1) { S.pains.splice(i, 1); b.setAttribute("aria-pressed", "false"); }
        else if (S.pains.length < 3) { S.pains.push(p.id); b.setAttribute("aria-pressed", "true"); }
        else { toast("Three pain points max — remove one first"); return; }
        onSetupChange();
      });
      mount.appendChild(b);
    });
  }
  var trustWrap, trustThumb;
  function buildTrust() {
    trustWrap = $("#grpTrust"); trustThumb = $("#trustThumb");
    TRUST.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "seg"; b.dataset.id = o.id; b.textContent = o.label;
      b.setAttribute("aria-pressed", String(o.id === S.trust));
      b.addEventListener("click", function () {
        S.trust = o.id;
        $$(".seg", trustWrap).forEach(function (s) { s.setAttribute("aria-pressed", String(s.dataset.id === o.id)); });
        moveThumb();
        onSetupChange();
      });
      trustWrap.appendChild(b);
    });
  }
  function moveThumb() {
    var a = trustWrap.querySelector('.seg[aria-pressed="true"]');
    if (!a) { trustThumb.classList.remove("on"); return; }
    trustThumb.classList.add("on");
    trustThumb.style.width = a.offsetWidth + "px";
    trustThumb.style.transform = "translateX(" + a.offsetLeft + "px)";
  }

  function setCount() { return (S.env ? 1 : 0) + (S.pains.length ? 1 : 0); }

  function onSetupChange() {
    var n = setCount();
    $("#setupStep").innerHTML = "<b>" + n + "</b>/2 set";
    $("#nEnv").classList.toggle("done", !!S.env);
    $("#nPain").classList.toggle("done", !!S.pains.length);
    $("#applySetup").disabled = n < 2;
    $("#setupMsg").textContent = n < 2
      ? "Pick where you run AI + at least one pain point."
      : "Ready — this rail folds to one line.";
    if (S.applied) { render(); }
    renderTray();
  }

  $("#applySetup").addEventListener("click", function () {
    if (setCount() < 2) return;
    S.applied = true;
    renderSummary();
    $("#setup").classList.add("collapsed");
    render(); renderTray();
    toast("Catalog ranked for your setup");
  });
  $("#editSetup").addEventListener("click", function () {
    $("#setup").classList.remove("collapsed");
    setTimeout(moveThumb, 20);
  });
  function renderSummary() {
    var parts = ['<span class="sum-pill"><i></i>' + esc(ENV_LBL[S.env]) + "</span>"];
    S.pains.forEach(function (pid) {
      parts.push('<span class="sum-pill"><i></i>' + esc(PAIN_LBL[pid]) + "</span>");
    });
    var html = parts.join('<span class="sum-sep">·</span>');
    if (S.trust === "graded") {
      html += '<span class="sum-sep">·</span><span class="sum-pill trust"><i></i>graded only</span>';
    }
    $("#sumPills").innerHTML = html;
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
  function rowHTML(it, ev, q, i) {
    var kind = kindOf(it);
    var inTray = state.tray.indexOf(it.id) > -1;
    var bits = [];
    ev.bad.forEach(function (t) { bits.push(["bad", t]); });
    ev.fit.forEach(function (t) { bits.push(["fit", t]); });
    ev.good.forEach(function (t) { bits.push(["good", t]); });
    ev.note.forEach(function (t) { bits.push(["note", t]); });
    bits = bits.slice(0, 3);
    var rz = bits.length
      ? '<div class="reasons">' + bits.map(function (b, k) {
          return '<span class="rz ' + b[0] + '" style="animation-delay:' + (k * 40) + 'ms"><i></i>' + esc(b[1]) + "</span>";
        }).join("") + "</div>"
      : "";
    var statusTag = it.status === "graded"
      ? '<span class="tag graded">graded ' + esc(it.grade) + "</span>"
      : '<span class="tag scouted">scouted</span>';
    return '<div class="row t-' + kind + (inTray ? " in-tray" : "") + (ev.belowBar ? " below-bar" : "") + (i === state.cursor ? " cursor" : "") +
      '" data-id="' + it.id + '" draggable="true" role="option" aria-selected="' + (i === state.cursor) + '">' +
      '<span class="tico">' + icon(kind) + "</span>" +
      '<div class="row-body">' +
        '<div class="row-top"><span class="row-name">' + hi(it.name, q) + "</span>" +
        '<span class="tag kind">' + kind + "</span>" + statusTag + "</div>" +
        '<div class="row-blurb">' + hi(it.summary, q) + "</div>" + rz +
      "</div>" +
      '<div class="row-right">' +
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
    if (setupActive()) {
      res.sort(function (a, b) { return (b.ev.score - a.ev.score) || (a.i - b.i); });
    }
    var fits = res.filter(function (r) { return !r.ev.belowBar; });
    var below = res.filter(function (r) { return r.ev.belowBar; });

    $("#catCount").textContent = res.length;
    $("#catMeta").textContent = q ? 'filtering "' + q + '"' : "real entries · no filler";

    var bar = $("#rankbar"), msg = $("#rankmsg");
    if (setupActive()) {
      bar.classList.remove("idle");
      msg.innerHTML = "Ranked for <b>" + esc(ENV_LBL[S.env]) + " · " +
        S.pains.map(function (p) { return esc(PAIN_LBL[p]); }).join(" · ") + "</b>" +
        (below.length ? " — " + below.length + " below your trust bar (shown, not hidden)" : "");
    } else {
      bar.classList.add("idle");
      msg.textContent = "Unranked — set your setup above and every row gets a reason.";
    }

    if (!res.length) {
      list.innerHTML = '<div class="list-empty"><b>No matches for "' + esc(q) + '"</b>' +
        'The catalog is small on purpose. No match ≠ no tool exists — <a href="#with-you">take the scout with you</a> and search the live ecosystem.</div>';
      return;
    }
    var idx = 0;
    var html = fits.map(function (r) { return rowHTML(r.it, r.ev, q, idx++); }).join("");
    if (below.length) {
      html += '<div class="split"><span class="dot"></span>Below your trust bar — scouted, ungraded (' + below.length + ")</div>";
      html += below.map(function (r) { return rowHTML(r.it, r.ev, q, idx++); }).join("");
    }
    list.innerHTML = html;
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
    $("#trayMeta").textContent = state.tray.length ? "drag to reorder" : "drop items here";

    var ov = overlaps();
    var flagged = {};
    ov.forEach(function (g) { g.items.forEach(function (i) { flagged[i.id] = 1; }); });

    if (!state.tray.length) {
      wrap.innerHTML = '<div class="tray-empty">' +
        '<span class="drop-ring"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg></span>' +
        "<b>Your tray is empty</b><p>Add or drag items from the catalog. Overlaps and your install plan appear here.</p></div>";
    } else {
      wrap.innerHTML = state.tray.map(function (id) {
        var it = byId[id], kind = kindOf(it);
        var statusTag = it.status === "graded"
          ? '<span class="tag graded">graded ' + esc(it.grade) + "</span>"
          : '<span class="tag scouted">scouted</span>';
        return '<div class="titem t-' + kind + (flagged[id] ? " flag" : "") + '" data-id="' + id + '" draggable="true">' +
          '<span class="grip" aria-hidden="true"><svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor"><circle cx="2" cy="2" r="1.3"/><circle cx="6" cy="2" r="1.3"/><circle cx="2" cy="7" r="1.3"/><circle cx="6" cy="7" r="1.3"/><circle cx="2" cy="12" r="1.3"/><circle cx="6" cy="12" r="1.3"/></svg></span>' +
          '<span class="tico tico-sm">' + icon(kind) + "</span>" +
          '<div class="titem-body"><div class="titem-name">' + esc(it.name) + " " + statusTag + "</div>" +
          '<div class="titem-eff">' + esc(it.summary) + "</div></div>" +
          '<button class="rm" type="button" data-rm="' + id + '" aria-label="Remove ' + esc(it.name) + '">' +
            '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        "</div>";
      }).join("");
    }

    var WARN = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.6L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
    var notes = ov.map(function (g) {
      var names = g.items.map(function (i) { return "<b>" + esc(i.name) + "</b>"; }).join(" and ");
      return '<div class="flag-note">' + WARN + "<p>" + names + " both target <b>" +
        esc(PAIN_LBL[g.pain].toLowerCase()) + "</b>. Expect overlap — start with one.</p></div>";
    });
    var scoutedPicked = state.tray.filter(function (id) { return byId[id].status === "scouted"; });
    if (scoutedPicked.length) {
      notes.push('<div class="flag-note setup">' + WARN + "<p><b>" + scoutedPicked.length + " of your picks " +
        (scoutedPicked.length === 1 ? "is" : "are") + " scouted-only</b> — found and triaged, never tested by us. Read the source before installing.</p></div>");
    }
    $("#flags").innerHTML = notes.join("");

    var painSet = [];
    state.tray.forEach(function (id) {
      (byId[id].pain_points || []).forEach(function (p) {
        if (painSet.indexOf(p) < 0) painSet.push(p);
      });
    });
    var eff = $("#effect");
    if (!painSet.length) {
      eff.innerHTML = '<p class="effect-none">Nothing in the tray yet. Add items on the left to see what your stack covers.</p>';
    } else {
      eff.innerHTML = '<div class="caps">' + painSet.map(function (p, i) {
        return '<span class="cap" style="animation-delay:' + (i * 34) + 'ms"><i></i>' + esc(PAIN_LBL[p]) + "</span>";
      }).join("") + "</div>";
    }
    wrap.classList.toggle("scrolls", wrap.scrollHeight > wrap.clientHeight + 2);
    renderCmd();
  }

  /* install plan: real commands for graded entries, review-first links for scouted */
  function planText() {
    var lines = ["# skillproof install plan — target: " + (S.env ? ENV_LBL[S.env] : "Claude Code (default)")];
    if (S.env && S.env !== "claude-code") {
      lines.push("# catalog is Claude-ecosystem — check each repo for " + ENV_LBL[S.env] + " support");
    }
    state.tray.forEach(function (id, i) {
      var it = byId[id];
      if (it.status === "graded" && it.install && it.install.command) {
        lines.push("# " + (i + 1) + ". " + it.name + " — tested, graded " + it.grade + " (" + it.score_total + "/24)");
        lines.push(it.install.command);
      } else {
        lines.push("# " + (i + 1) + ". " + it.name + " — scouted, ungraded: review before installing");
        lines.push("#    " + it.repo_url);
      }
    });
    return lines.join("\n");
  }
  function renderCmd() {
    var box = $("#cmdbox"), copyBtn = $("#copy"), fs = $("#fromSetup");
    if (S.env) {
      fs.className = "from-setup";
      fs.innerHTML = "<i></i>target: " + esc(ENV_LBL[S.env]) + " — from your setup";
    } else {
      fs.className = "from-setup unset";
      fs.innerHTML = "<i></i>no environment set — defaulting to Claude Code";
    }
    if (!state.tray.length) {
      box.innerHTML = '<span class="muted"># add items to build your install plan</span>';
      box.dataset.cmd = "";
    } else {
      var html = planText().split("\n").map(function (l) {
        if (l.charAt(0) === "#") {
          return /https?:\/\//.test(l)
            ? '<span class="muted"># </span><span class="p">' + esc(l.replace(/^#\s+/, "")) + "</span>"
            : '<span class="muted">' + esc(l) + "</span>";
        }
        return esc(l).replace(/^(\S+)/, '<span class="k">$1</span>');
      }).join("<br>");
      box.innerHTML = html;
      box.dataset.cmd = planText();
    }
    box.appendChild(copyBtn);
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
    $("#list").addEventListener("click", function (e) {
      var a = e.target.closest("[data-add]");
      if (a) { if (a.dataset.state !== "added") addItem(a.dataset.add, a); return; }
      var row = e.target.closest(".row");
      if (row) {
        var b = row.querySelector(".add");
        if (b && b.dataset.state !== "added") addItem(row.dataset.id, b);
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
    $("#navk").addEventListener("click", function () {
      qi.focus(); qi.scrollIntoView({ block: "center" });
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
      toast("Install plan copied — paste it in your terminal");
      if (btn) {
        btn.classList.add("done");
        setTimeout(function () { btn.classList.remove("done"); }, 1800);
      }
    }
    $("#copyPlan").addEventListener("click", function () { copyPlanNow(null); });
    $("#copy").addEventListener("click", function () { copyPlanNow($("#copy")); });

    /* generic copy buttons (take-it-with-you commands) */
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
  // fetch() cannot read file:// URLs — use XHR for local double-click previews
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
    d.pain_points.forEach(function (p) { PAIN_LBL[p.id] = p.label; });

    var g = d.skills.filter(function (s) { return s.status === "graded"; }).length;
    var sc = d.skills.filter(function (s) { return s.status === "scouted"; }).length;
    $("#navMeta").textContent = g + " graded · " + sc + " scouted";
    $("#honestyLine").textContent = "Real catalog — " + g + " tested & graded, " + sc +
      " scouted & ungraded. Small on purpose: every listing costs a real check.";
    $("#footAsOf").textContent = "Catalog as of " + d.as_of + " · rubric v" + d.rubric_version +
      " · recommendations are advisory; review any resource before installing it.";

    buildEnvChips();
    buildPainChips();
    buildTrust();
    buildFacets();
    wireEvents();
    onSetupChange();
    render();
    renderTray();
    window.addEventListener("resize", function () { moveGlide(); moveThumb(); });
    setTimeout(function () { moveGlide(); moveThumb(); }, 60);
  }).catch(function (e) {
    $("#list").innerHTML = '<div class="list-empty"><b>Could not load the catalog</b>' + esc(e.message) + "</div>";
  });
})();
