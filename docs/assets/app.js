/* Skillproof workbench — improve-areas rail → catalog → build tray.
   Data contract: docs/data/skills.json (validated by scripts/validate_index.py).
   One flat catalog (tiers removed 2026-08-21): every entry is a real repo that
   passed the malice scan. Every claim on the page derives from a real field in
   the data — no fabricated commands or stats. */
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

    if (setupActive()) {
      S.pains.forEach(function (pid) {
        if ((it.pain_points || []).indexOf(pid) > -1) {
          out.pills.push(["fit", PAIN_SHORT[pid]]);
          out.score += 10;
        }
      });
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
      // the chip is a two-word category; the full label is the actual problem
      // sentence ("Answers are long and the next step is buried") — which is
      // what a user recognises. Keep the chip short, expose the sentence.
      b.title = p.label;
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
      : "Pick up to five — or describe it in your own words below.";
    if (S.applied) render();
    renderTray();
  }

  /* ---- plain-language route into the same eleven areas --------------------
     The chips are category names ("Token usage", "Code quality"); users think
     in symptoms ("long sessions get dumb"). This scores the sentence against
     each area's keyword list — the SAME index the catalog search already uses,
     so there is no second vocabulary to keep in sync — and ticks the winners. */
  function syncPainChips() {
    $$("#grpPain .chip").forEach(function (b) {
      b.setAttribute("aria-pressed", S.pains.indexOf(b.dataset.id) > -1 ? "true" : "false");
    });
  }

  function matchPains(text) {
    var tokens = tokenize(text);
    if (!tokens.length) return [];
    var idx = kwIndex();
    return DATA.pain_points.map(function (p) {
      var kws = idx[p.id] || [], s = 0;
      tokens.forEach(function (t) {
        for (var i = 0; i < kws.length; i++) {
          if (kwHit(kws[i], t)) { s++; return; }
        }
      });
      return { id: p.id, s: s };
    }).filter(function (r) { return r.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, 3)
      .map(function (r) { return r.id; });
  }

  function runSay() {
    var input = $("#painSay");
    var v = input.value.trim();
    if (!v) {
      // was: silently focus and return, which reads as a dead button
      $("#setupMsg").textContent = "Type what you’re trying to improve first — or tap an example below.";
      input.focus();
      return;
    }
    var hits = matchPains(v);
    if (!hits.length) {
      // Say what to do next, not just that it failed.
      $("#setupMsg").textContent = "No area matched those words — pick from the list, or try naming the symptom (“tests”, “docs”, “planning”).";
      input.classList.add("miss");
      setTimeout(function () { input.classList.remove("miss"); }, 1400);
      return;
    }
    S.pains = hits.slice(0, 5);
    syncPainChips();
    onSetupChange();
    $("#setupMsg").innerHTML = "Matched <b>" +
      hits.map(function (p) { return esc(PAIN_SHORT[p]); }).join(" &middot; ") +
      "</b> — change anything below, then sort.";
  }

  $("#painSayGo").addEventListener("click", runSay);
  $("#painSay").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); runSay(); }
  });
  $$("#setupEgs .eg").forEach(function (b) {
    b.addEventListener("click", function () {
      $("#painSay").value = b.textContent;
      runSay();
    });
  });

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
    var rows = [];

    var repoSlug = it.repo_url.replace(/^https:\/\/github\.com\//, "");
    rows.push(["Source", "From a public GitHub repo by " + esc(it.author) +
      ' · <a href="' + esc(it.repo_url) + '" target="_blank" rel="noopener">' + esc(repoSlug) + " ↗</a>"]);

    if (it.created || it.pushed) {
      rows.push(["Last updated",
        esc((it.created ? "Created " + mdY(it.created) + ". " : "") +
            (it.pushed ? "Last push " + mdY(it.pushed) + "." : ""))]);
    }
    if (it.signals) {
      rows.push(["Exposure", esc(it.signals.stars.toLocaleString() + " GitHub stars · " +
        (it.signals.forks || 0).toLocaleString() + " forks")]);
    }
    if (it.license) rows.push(["License", esc(it.license)]);

    /* Optional plain-language help: what it does, what it touches, how to
       undo it. Present where someone has written them; never invented. */
    if (it.does) rows.push(["What it does", esc(it.does)]);
    if ((it.touches || []).length) {
      rows.push(["Touches", it.touches.map(function (t) {
        return '<span class="touch">' + esc(t) + "</span>";
      }).join("")]);
    }
    if (it.undo) rows.push(["To undo it", esc(it.undo)]);

    var sec = it.checked
      ? "Scanned for malicious patterns" + (it.checked.date ? " on " + mdY(it.checked.date) : "") +
        " — none found. Read anything before you run it."
      : "Not yet scanned — read the source before installing.";
    rows.push(["Security", esc(sec)]);

    var asOf = (it.checked && it.checked.date) || (it.signals && it.signals.checked) || DATA.as_of;
    return '<div class="row-detail"><div class="rd-in">' +
      '<div class="rd-rows">' + rows.map(function (kv, i) {
        return '<div class="rd-row" style="animation-delay:' + (i * 40) + 'ms"><span class="rd-k">' + kv[0] +
          '</span><span class="rd-v">' + kv[1] + "</span></div>";
      }).join("") + "</div>" +
      '<div class="rd-actions">' +
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
    var tested = tierBadge(it);
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
        (isBlocked(it) ? "" :
          '<button class="add" type="button" data-add="' + it.id + '" data-state="' + (inTray ? "added" : "idle") + '" aria-label="' +
            (inTray ? "In tray" : "Add " + esc(it.name) + " to tray") + '">' +
            '<span class="add-fill" aria-hidden="true"></span>' +
            '<span class="ic" aria-hidden="true">' + (inTray ? CHECK : '<span class="plus"></span>') + "</span>" +
            '<span class="lbl">' + (inTray ? "In tray" : "Add") + "</span>" +
          "</button>") +
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
        var tested = tierBadge(it);
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
  /* Terminal: the known command where we have one, the repo to install from
     where we don't. One flat catalog — no tier labels in the plan. */
  function planText() {
    var lines = ["# skillproof install plan"];
    state.tray.forEach(function (id, i) {
      var it = byId[id];
      if (it.install && it.install.command) {
        lines.push("# " + (i + 1) + ". " + it.name);
        lines.push(it.install.command);
      } else {
        lines.push("# " + (i + 1) + ". " + it.name + " — install per its repo");
        lines.push("#    " + it.repo_url);
      }
    });
    return lines.join("\n");
  }
  /* Agent: a prompt you paste at your agent. */
  function agentPrompt() {
    var lines = ["Install this stack into my AI environment, one item at a time:"];
    state.tray.forEach(function (id, i) {
      var it = byId[id];
      if (it.install && it.install.command) {
        lines.push((i + 1) + ". " + it.name + " — run: " + it.install.command);
      } else {
        lines.push((i + 1) + ". " + it.name + " — fetch " + it.repo_url +
          ", read the README and source, then install per its instructions.");
      }
    });
    lines.push("");
    lines.push("Rules: install only these items. Read the source of each before installing. Show me each command before running it. Flag anything that wants network access, credentials, or writes outside the project.");
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

  function setCopyEnabled(on) {
    ["#copyPlan", "#copy"].forEach(function (sel) {
      var b = $(sel);
      if (!b) return;
      b.disabled = !on;
      b.setAttribute("aria-disabled", String(!on));
      b.title = on ? "" : "Add something to your tray first";
    });
  }
  function renderCmd() {
    var box = $("#cmdbox");
    if (!state.tray.length) {
      box.innerHTML = '<span class="muted">' +
        (state.mode === "agent" ? "# add items to build your agent prompt" : "# add items to build your install plan") +
        "</span>";
      box.dataset.cmd = "";
      setCopyEnabled(false);
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
      setCopyEnabled(true);
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
  /* Last line of defence. Flagged repos are removed from the catalog upstream
     (safety_skim quarantines them; the honesty gate blocks any that slip
     through), so this should never be true — but if bad data ever reaches the
     browser, it still cannot be added to a stack. */
  function isBlocked(it) {
    var rec = it && (it.checked || it.skim);
    return !!(rec && (rec.red_flags || []).length);
  }

  function addItem(id, srcBtn) {
    if (state.tray.indexOf(id) > -1) return;
    var it = byId[id];
    if (isBlocked(it)) return;
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

    $$("[data-copy]").forEach(function (btn) {
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

    /* prompt generator: panel is open by default (see boot), just wire copy */
    $("#copyPrompt").addEventListener("click", function () {
      try {
        if (navigator.clipboard) navigator.clipboard.writeText($("#promptText").value);
        toast("Copied");
        $("#copyPrompt").classList.add("done");
        setTimeout(function () { $("#copyPrompt").classList.remove("done"); }, 1600);
      } catch (err) {}
    });
  }

  /* Any place the page states the catalog size reads it from the data, so a
     stale hardcoded number can never contradict the catalog it is describing.
     (The tier badge/split machinery died with the tiers, 2026-08-21.) */
  function tierBadge() { return ""; }
  function syncCatalogCounts() {
    var n = DATA.skills.length;
    $$("[data-catalog-count]").forEach(function (el) { el.textContent = String(n); });
  }

  /* ======================= take-it-with-you (chooser + preview + card) =======================
     One selection drives three things: the preview window, the highlighted
     chooser row, and which install card is shown. It auto-advances so all three
     options get seen, but never at the cost of someone actually using it:
       - DWELL is 8.2s, not 5.2s. Scene 0's last line lands at ~3.9s, so the old
         interval left barely a second to read the payoff before it moved on.
       - hovering or focusing anywhere in the section pauses the clock — you
         can't have the panel swap out from under a cursor mid-copy.
       - clicking a row stops rotation for good. An explicit choice outranks
         a carousel. */
  var DWELL = 8200;

  function startDemo() {
    var demo = $("#demo");
    if (!demo) return;
    var section = $("#with-you") || demo;
    var scenes = $$(".demo-scene", demo);
    var picks = $$(".pick", demo);
    var ways = $$(".way[data-way]");
    var cur = 0, timer = null, locked = false, paused = false;

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
      picks.forEach(function (t, k) {
        t.setAttribute("aria-selected", k === i ? "true" : "false");
        t.classList.remove("timing");
      });
      ways.forEach(function (w) { w.classList.toggle("on", +w.dataset.way === i); });
    }

    /* the active row's hairline fills over exactly one dwell, so the rotation
       is something you can see coming rather than something that just happens */
    function markTiming() {
      if (locked || paused || RM.matches) return;
      var p = picks[cur];
      if (!p) return;
      p.style.setProperty("--dwell", DWELL + "ms");
      void p.offsetWidth;
      p.classList.add("timing");
    }
    function arm() {
      clearInterval(timer);
      if (locked) return;
      timer = setInterval(function () { show((cur + 1) % scenes.length); markTiming(); }, DWELL);
      markTiming();
    }

    syncCatalogCounts();
    show(0);

    // Wired before the reduced-motion return: rotation is optional, but the
    // chooser is the section's navigation and must work for everyone.
    picks.forEach(function (t, k) {
      t.addEventListener("click", function () {
        locked = true;                       // an explicit pick ends the rotation
        clearInterval(timer);
        show(k);
      });
    });

    // Reduced motion: show the first scene and stop. The old code returned
    // BEFORE show(0), so every scene stayed at opacity:0 and this whole section
    // rendered as an empty gap for anyone with "reduce motion" enabled.
    if (RM.matches) return;
    arm();

    function pause() {
      if (paused) return;
      paused = true;
      clearInterval(timer);
      picks.forEach(function (p) { p.classList.remove("timing"); });
    }
    function resume() {
      if (!paused) return;
      paused = false;
      arm();
    }
    // Scoped to the two things you can actually be mid-use of — the chooser and
    // the install card. Hovering the preview, or merely scrolling past with the
    // cursor somewhere in the section, must not freeze the rotation for good.
    [$(".carry-pick", demo), $(".ways", section)].forEach(function (zone) {
      if (!zone) return;
      zone.addEventListener("mouseenter", pause);
      zone.addEventListener("mouseleave", resume);
      zone.addEventListener("focusin", pause);
      zone.addEventListener("focusout", function (e) {
        if (!zone.contains(e.relatedTarget)) resume();
      });
    });
  }

  /* ======================= advisor prompt (real data only) =======================
     The prompt is instructions ONLY — it points the agent at the live catalog
     file instead of embedding entries inline. Pasting a thousand-line wall of
     JSON into a chat is both hostile to read and a waste of the user's
     context; a fetch keeps it current too. The download link in the card
     covers agents that can't fetch.

     The job it hands the agent is the product's job: pain point → find the
     right thing → get it working, with the user's yes before any write. The
     catalog is the starting shelf, the wider web is in bounds, and the finish
     line is "installed and confirmed working" — NOT a catalog reading. The
     prompt states what the catalog assures (checked for malicious code) and
     nothing self-defeating — an earlier tier-describing version made a fresh
     agent tell the user to avoid the whole site (2026-08-10). */
  var DATA_URL = "https://raw.githubusercontent.com/lucascashwell3-ai/Skillproof/main/docs/data/skills.json";

  function buildPrompt() {
    return [
      "You are my AI-setup upgrade agent, working the Skillproof method. When I describe a pain point or goal, find the right skill or tool for it and get it working in my setup. Finding it is the start — installed, integrated, and confirmed working is the finish.",
      "",
      "Start with the catalog: " + DATA_URL,
      "Every entry is a real GitHub repo that was checked for malicious code before listing and re-checked when its code changes. If the fetch fails, say so and ask me to attach the file — it downloads from the Skillproof site.",
      "",
      "The catalog is a starting shelf, not a boundary. If nothing in it fits my ask, search the wider ecosystem yourself — that is the normal next step, not a failure. Read the source of anything before recommending it, and answer three questions (what it does / what it touches / how to undo it) from the code you read, never from the README alone. If you can't read the source, hand me the repo URL and say the source hasn't been read — no install command for unread code.",
      "",
      "Once you have the one right thing (one recommendation, not a ranked list):",
      "1. Tell me what it does, what it touches, and how to undo it — one line each.",
      "2. Read my setup (global instructions, CLAUDE.md, installed skills, settings) and say plainly what will fight it — or that nothing will.",
      "3. Show me every change you propose in one plan, then get my yes before writing anything.",
      "4. Install it, confirm it actually triggers, and hand me the undo.",
      "",
      "Honesty rules: never invent stars, dates, licenses, or claims of testing. Never pipe a download into a shell.",
      "",
      "Catalog as of " + DATA.as_of + "."
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
    // Check ok BEFORE parsing. A 500 returning an HTML error page used to surface
    // as `Unexpected token 'e', "err" is not valid JSON` — which tells the user
    // nothing and misdiagnoses a server error as corrupt data.
    return fetch("data/skills.json").then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).catch(viaXHR);
  }

  loadData().then(function (d) {
    DATA = d;
    /* One flat catalog (Lucas, 2026-08-21): everything in the file is
       published. The only gate is upstream — the malice scan; anything
       flagged never reaches this file. */
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
    var promptEl = $("#promptText");
    if (promptEl) promptEl.value = buildPrompt();
    renderTray();
    window.addEventListener("resize", function () { moveGlide(); moveModeThumb(); moveSortThumb(); syncListHeight(); });
    setTimeout(function () { moveGlide(); moveModeThumb(); moveSortThumb(); syncListHeight(); }, 60);
  }).catch(function (e) {
    // Never show the raw exception: a JSON.parse message is meaningless to a user
    // and misleading to a developer. One sentence, one action.
    $("#catCount").textContent = "—";
    $("#list").innerHTML =
      '<div class="list-empty"><b>Could not load the catalog</b>' +
      "The catalog file didn’t load — usually a network blip." +
      '<div style="margin-top:14px"><button class="btn btn-primary btn-sm" type="button" id="retryLoad">Try again</button></div></div>';
    var rb = $("#retryLoad");
    if (rb) rb.addEventListener("click", function () { location.reload(); });
    if (window.console && console.warn) console.warn("Skillproof: catalog load failed —", e);
  });
})();
