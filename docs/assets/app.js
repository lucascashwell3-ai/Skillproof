/* SKILLproof — matcher, index table, tools section, promptgen. No dependencies, no build step.
   Data contract: docs/data/skills.json (validated by scripts/validate_index.py).
   Two honesty tiers everywhere: graded (tested, receipts) vs scouted (found + triaged, NO grade). */
(function () {
  "use strict";

  var DATA = null;
  var picked = []; // selected pain-point ids, max 3

  var GRADE_CLASS = { A: "a", B: "b", C: "c", D: "d", F: "f" };
  var DIM_LABELS = {
    triggering: "Triggering",
    effectiveness: "Does the job",
    docs_install: "Docs & install",
    maintenance: "Maintained",
    safety: "Safety"
  };
  var TRIAGE_LABELS = { provenance: "Provenance", license: "License", freshness: "Freshness", safety: "Safety skim" };
  var REPO = "https://github.com/lucascashwell3-ai/Skillproof";

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function gradeClass(g) { return GRADE_CLASS[(g || "F").charAt(0)] || "f"; }
  function daysBetween(a, b) { return Math.round((new Date(a) - new Date(b)) / 86400000); }

  function gradedSkills() {
    return (DATA.skills || []).filter(function (s) { return s.status === "graded"; });
  }
  function scoutedSkills() {
    return (DATA.skills || []).filter(function (s) { return s.status === "scouted"; });
  }

  /* ---------- matching (same algorithm as mcp/server.js — keep in sync) ---------- */

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
  function kwIndex() {
    var idx = {};
    (DATA.pain_points || []).forEach(function (p) {
      idx[p.id] = (p.keywords || []).concat(tokenize(p.label));
    });
    return idx;
  }
  function matchScore(entry, tokens, idx) {
    var hay = " " + [entry.name, entry.summary, entry.category].join(" ").toLowerCase() + " ";
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
  function overlapScore(entry) {
    return (entry.pain_points || []).filter(function (p) { return picked.indexOf(p) >= 0; }).length;
  }

  // Combined matcher: chips and/or free text. Returns {graded:[], scouted:[]}.
  function runMatch(q) {
    var tokens = tokenize(q);
    var idx = kwIndex();
    var useChips = picked.length > 0;
    var useText = tokens.length > 0;
    if (!useChips && !useText) return null;

    function rank(list, isGraded) {
      return list.map(function (s) {
        var score = 0, relevant = false;
        if (useChips) {
          var ov = overlapScore(s);
          if (ov > 0) { score += ov * 10; relevant = true; }
        }
        if (useText) {
          var hits = matchScore(s, tokens, idx);
          if (hits >= 1.5) { score += hits; relevant = true; }
        }
        if (isGraded) score += (s.score_total || 0) / 40; // tiny tiebreaker, never a rank-maker
        return { s: s, score: score, relevant: relevant };
      }).filter(function (r) {
        return r.relevant && (!isGraded || (r.s.grade || "").charAt(0) !== "F");
      }).sort(function (a, b) { return b.score - a.score; })
        .slice(0, 5)
        .map(function (r) { return r.s; });
    }
    return { graded: rank(gradedSkills(), true), scouted: rank(scoutedSkills(), false) };
  }

  function headline(q) {
    var parts = [];
    if (picked.length) {
      parts.push(DATA.pain_points.filter(function (p) { return picked.indexOf(p.id) >= 0; })
        .map(function (p) { return p.label.toLowerCase(); }).join(" + "));
    }
    if (q) parts.push("“" + q + "”");
    return "Your matches — " + parts.join(" · ");
  }

  /* ---------- rendering ---------- */

  function isStale(s) {
    try { return daysBetween(DATA.as_of, s.last_verified) > 90; } catch (e) { return false; }
  }

  function gradedCardHTML(s) {
    var g = esc(s.grade);
    var bars = Object.keys(DIM_LABELS).map(function (k) {
      var d = (s.scores || {})[k] || {};
      var pct = Math.max(0, Math.min(4, d.score || 0)) * 25;
      return '<div class="bar"><div class="bar__label">' + DIM_LABELS[k] +
        " · " + (d.score != null ? d.score : "–") + "/4</div>" +
        '<div class="bar__track"><div class="bar__fill" style="width:' + pct + '%"></div></div>' +
        '<div class="bar__why">' + esc(d.note || "") + "</div></div>";
    }).join("");
    var installCmd = s.install && s.install.command ? s.install.command : "";
    return '<article class="card">' +
      '<div><div class="grade grade--' + gradeClass(s.grade) + '">' + g +
      '<span class="grade__sub">' + esc(s.score_total) + "/24</span></div></div>" +
      "<div>" +
      '<div class="card__name">' + esc(s.name) +
      ' <span class="card__cat">' + esc(s.category) + "</span>" +
      (isStale(s) ? ' <span class="card__stale">stale — re-verify pending</span>' : "") +
      "</div>" +
      '<p class="card__verdict">' + esc(s.verdict || s.summary) + "</p>" +
      '<div class="bars">' + bars + "</div>" +
      '<div class="card__foot">' +
      (installCmd
        ? '<span class="install"><code>' + esc(installCmd) + "</code></span>" +
          '<button class="copy" type="button" data-copy="' + esc(installCmd) + '">Copy install</button>'
        : "") +
      "</div>" +
      '<div class="card__links" style="margin-top:10px">' +
      '<a href="' + esc(s.repo_url) + '" target="_blank" rel="noopener">Repo ↗</a>' +
      '<a href="' + REPO + '/blob/main/' + esc(s.evidence_url) +
      '" target="_blank" rel="noopener">Grading worksheet (the receipts) ↗</a>' +
      "<span>verified " + esc(s.last_verified) + " · rubric v" + esc(DATA.rubric_version) + "</span>" +
      "</div></div></article>";
  }

  function scoutedCardHTML(s) {
    var receipts = Object.keys(TRIAGE_LABELS).map(function (k) {
      var v = (s.triage || {})[k];
      if (!v) return "";
      return '<div class="receipt"><span class="receipt__k">' + TRIAGE_LABELS[k] + "</span>" +
        '<span class="receipt__v">' + esc(v) + "</span></div>";
    }).join("");
    return '<article class="scard">' +
      '<div class="scard__head">' +
      '<span class="scard__badge">scouted · ungraded</span>' +
      '<span class="scard__name">' + esc(s.name) + "</span>" +
      '<span class="card__cat">' + esc(s.category) + "</span>" +
      "</div>" +
      '<p class="card__verdict">' + esc(s.summary) + "</p>" +
      '<div class="receipts">' + receipts + "</div>" +
      '<div class="card__links" style="margin-top:12px">' +
      '<a href="' + esc(s.repo_url) + '" target="_blank" rel="noopener">Repo ↗</a>' +
      "<span>found + triaged " + esc(s.scouted_on) + " — never installed, never probed. No grade by design.</span>" +
      "</div></article>";
  }

  function renderResults(res, head) {
    var el = $("results");
    if (!res || (!res.graded.length && !res.scouted.length)) {
      el.innerHTML =
        '<div class="results__head">' + esc(head) + "</div>" +
        '<div class="empty"><b>No match in the index yet.</b> That doesn’t mean no such tool ' +
        "exists — it means we haven’t graded or scouted one for this. Two honest next steps: " +
        'run the <a href="#tools">scout</a> on it (it searches the live ecosystem with the same ' +
        'triage rubric), or <a href="' + REPO + '/issues" target="_blank" rel="noopener">nominate a skill</a> to grade next.</div>';
      return;
    }
    var html = '<div class="results__head">' + esc(head) + "</div>";
    if (res.graded.length) {
      html += '<div class="tier">Graded — tested, with receipts</div>' +
        res.graded.map(gradedCardHTML).join("");
    }
    if (res.scouted.length) {
      html += '<div class="tier">Scouted — found + triaged, not tested</div>' +
        res.scouted.map(scoutedCardHTML).join("");
    }
    if (!res.graded.length) {
      html += '<p class="tier__note">Nothing graded for this yet — the scouted leads above are ' +
        "leads, not recommendations. Want one graded? " +
        '<a href="' + REPO + '/issues" target="_blank" rel="noopener">Nominate it.</a></p>';
    }
    el.innerHTML = html;
    bindCopyButtons(el);
  }

  function renderIndexTable() {
    var rows = gradedSkills()
      .slice()
      .sort(function (a, b) { return b.score_total - a.score_total; })
      .map(function (s) {
        return "<tr><td>" + esc(s.name) + "</td>" +
          '<td class="g g--' + gradeClass(s.grade) + '">' + esc(s.grade) + "</td>" +
          "<td>" + esc(s.score_total) + "/24</td>" +
          "<td>" + esc(s.summary) + "</td>" +
          '<td class="td-date">' + esc(s.last_verified) + "</td>" +
          '<td><a href="' + REPO + '/blob/main/' +
          esc(s.evidence_url) + '" target="_blank" rel="noopener">worksheet ↗</a></td></tr>';
      }).join("");
    $("idxTable").innerHTML =
      "<thead><tr><th>Skill</th><th>Grade</th><th>Score</th><th>What it does</th><th>Verified</th><th>Receipts</th></tr></thead>" +
      "<tbody>" + rows + "</tbody>";
  }

  function renderScoutedTable() {
    var rows = scoutedSkills().map(function (s) {
      return "<tr><td><a href=\"" + esc(s.repo_url) + '" target="_blank" rel="noopener">' + esc(s.name) + "</a></td>" +
        "<td>" + esc(s.summary) + "</td>" +
        "<td>" + esc((s.triage || {}).license || "—") + "</td>" +
        '<td class="td-date">' + esc(s.scouted_on) + "</td></tr>";
    }).join("");
    $("scoutTable").innerHTML =
      "<thead><tr><th>Resource</th><th>What it is</th><th>License</th><th>Triaged</th></tr></thead>" +
      "<tbody>" + rows + "</tbody>";
  }

  function bindCopyButtons(scope) {
    scope.querySelectorAll(".copy[data-copy]").forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      var original = btn.textContent;
      btn.addEventListener("click", function () {
        navigator.clipboard.writeText(btn.getAttribute("data-copy")).then(function () {
          btn.textContent = "Copied ✓";
          setTimeout(function () { btn.textContent = original; }, 1600);
        });
      });
    });
  }

  /* ---------- promptgen ---------- */

  function buildPrompt() {
    var graded = gradedSkills().map(function (s) {
      return {
        name: s.name, repo: s.repo_url, grade: s.grade, score: s.score_total + "/24",
        does: s.summary, pain_points: s.pain_points, install: s.install && s.install.command,
        safety: s.security_notes, verified: s.last_verified
      };
    });
    var scouted = scoutedSkills().map(function (s) {
      return {
        name: s.name, repo: s.repo_url, status: "SCOUTED — NOT TESTED, NOT GRADED",
        does: s.summary, pain_points: s.pain_points, triage: s.triage, scouted_on: s.scouted_on
      };
    });
    return [
      "You are my Claude-skill advisor and scout, powered by the SKILLproof index (rubric v" +
        DATA.rubric_version + ", data as of " + DATA.as_of + ").",
      "",
      "When I describe a pain point in my AI setup (frontend design output, AI coding, AI workflows, agent tooling), respond in this order — grades first, honesty always:",
      "1. GRADED matches (list below): quote the grade, the one-line summary, and the worksheet link. Give the install command when I ask.",
      "2. SCOUTED matches (list below): present as leads, never recommendations — say plainly they were found and triaged but never tested. No install commands for these.",
      "3. Nothing fits? Say so, then (only if I ask) scout the live ecosystem yourself with the triage rubric: verify the repo is real, check license, check last-push freshness, skim for safety red flags (curl|bash, auto-run hooks, undisclosed network calls, credential access). Report those four receipts per candidate. Never install anything; never invent stars, dates, or licenses.",
      "- Never present a scouted or freshly-found item with grade-like language. SKILLproof grades come only from the full published rubric run.",
      "- Grades older than ~90 days may be stale; say so.",
      "- Fresh data + every grading worksheet: " + REPO,
      "",
      "GRADED INDEX (tested, receipts on file):",
      JSON.stringify(graded, null, 1),
      "",
      "SCOUTED — found + triaged only, NO grades:",
      JSON.stringify(scouted, null, 1)
    ].join("\n");
  }

  /* ---------- starfield (quiet; disabled for reduced motion via CSS) ---------- */

  function stars() {
    var c = $("stars");
    if (!c || !c.getContext) return;
    var ctx = c.getContext("2d"), pts = [], n = 90;
    function size() {
      c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio;
    }
    size(); addEventListener("resize", size);
    for (var i = 0; i < n; i++) {
      pts.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.3, tw: Math.random() * Math.PI * 2, sp: 0.15 + Math.random() * 0.5 });
    }
    var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function frame(t) {
      ctx.clearRect(0, 0, c.width, c.height);
      pts.forEach(function (p) {
        var a = reduced ? 0.5 : 0.28 + 0.32 * Math.abs(Math.sin(p.tw + t * 0.0004 * p.sp));
        ctx.fillStyle = "rgba(242,193,78," + a * 0.5 + ")";
        ctx.beginPath();
        ctx.arc(p.x * c.width, p.y * c.height, p.r * devicePixelRatio, 0, 7);
        ctx.fill();
      });
      if (!reduced) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- boot ---------- */

  function refreshMatches() {
    var q = $("q").value.trim();
    var res = runMatch(q);
    if (!res) { $("results").innerHTML = ""; return; }
    renderResults(res, headline(q));
  }

  // fetch() cannot read file:// URLs — use XHR for local double-click previews, fetch otherwise
  function loadData() {
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
    return fetch("data/skills.json").then(function (r) { return r.json(); })
      .catch(viaXHR);
  }

  loadData()
    .then(function (d) {
      DATA = d;
      var graded = gradedSkills().length;
      var scouted = scoutedSkills().length;
      // date lives in its own span so mobile can drop it instead of mid-truncating
      $("navCount").innerHTML = graded + " graded · " + scouted + " scouted" +
        '<span class="nav__date"> · ' + esc(d.as_of) + "</span>";
      $("honestyCount").innerHTML = "<b>Current coverage:</b> " + graded +
        " skill" + (graded === 1 ? "" : "s") + " graded (target 25) and " + scouted +
        " resources scouted-but-ungraded. Small on purpose: every grade costs a full test run. " +
        "No placeholder grades, ever — the scouted tier exists precisely so we never have to fake one.";

      // pain-point chips
      $("chips").innerHTML = d.pain_points.map(function (p) {
        return '<button class="chip" type="button" data-id="' + esc(p.id) + '" aria-pressed="false">' + esc(p.label) + "</button>";
      }).join("");
      $("chips").querySelectorAll(".chip").forEach(function (chip) {
        chip.addEventListener("click", function () {
          var id = chip.getAttribute("data-id");
          var i = picked.indexOf(id);
          if (i >= 0) { picked.splice(i, 1); chip.classList.remove("is-on"); chip.setAttribute("aria-pressed", "false"); }
          else if (picked.length < 3) { picked.push(id); chip.classList.add("is-on"); chip.setAttribute("aria-pressed", "true"); }
          refreshMatches();
        });
      });

      $("goBtn").addEventListener("click", refreshMatches);
      $("q").addEventListener("keydown", function (e) { if (e.key === "Enter") refreshMatches(); });

      renderIndexTable();
      renderScoutedTable();

      $("genPrompt").addEventListener("click", function () {
        $("promptText").value = buildPrompt();
        $("promptPanel").hidden = false;
      });
      $("copyPrompt").addEventListener("click", function () {
        navigator.clipboard.writeText($("promptText").value).then(function () {
          $("copyStatus").textContent = "Copied — paste it into any Claude chat.";
        });
      });

      bindCopyButtons(document);
      stars();
    })
    .catch(function (e) {
      $("results").innerHTML = '<div class="empty">Could not load the index (' + esc(e.message) + ").</div>";
    });
})();
