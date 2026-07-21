/* SKILLproof — matcher, index table, promptgen. No dependencies, no build step.
   Data contract: docs/data/skills.json (validated by scripts/validate_index.py). */
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

  /* ---------- rendering ---------- */

  function isStale(s) {
    try { return daysBetween(DATA.as_of, s.last_verified) > 90; } catch (e) { return false; }
  }

  function cardHTML(s) {
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
      '<a href="https://github.com/lucascashwell3-ai/Skillproof/blob/main/' + esc(s.evidence_url) +
      '" target="_blank" rel="noopener">Grading worksheet (the receipts) ↗</a>' +
      "<span>verified " + esc(s.last_verified) + " · rubric v" + esc(DATA.rubric_version) + "</span>" +
      "</div></div></article>";
  }

  function renderResults(list, headline) {
    var el = $("results");
    if (!list.length) {
      el.innerHTML =
        '<div class="results__head">' + esc(headline) + "</div>" +
        '<div class="empty"><b>No strong match in the graded set.</b> That doesn’t mean no such ' +
        "skill exists — it means we haven’t graded one for this yet. Browse the full index below, " +
        'or <a href="https://github.com/lucascashwell3-ai/Skillproof/issues" target="_blank" rel="noopener">nominate a skill</a> to grade next.</div>';
      return;
    }
    el.innerHTML = '<div class="results__head">' + esc(headline) + "</div>" +
      list.map(cardHTML).join("");
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
          "<td>" + esc(s.last_verified) + "</td>" +
          '<td><a href="https://github.com/lucascashwell3-ai/Skillproof/blob/main/' +
          esc(s.evidence_url) + '" target="_blank" rel="noopener">worksheet ↗</a></td></tr>';
      }).join("");
    $("idxTable").innerHTML =
      "<thead><tr><th>Skill</th><th>Grade</th><th>Score</th><th>What it does</th><th>Verified</th><th>Receipts</th></tr></thead>" +
      "<tbody>" + rows + "</tbody>";
  }

  function bindCopyButtons(scope) {
    scope.querySelectorAll(".copy[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        navigator.clipboard.writeText(btn.getAttribute("data-copy")).then(function () {
          btn.textContent = "Copied ✓";
          setTimeout(function () { btn.textContent = "Copy install"; }, 1600);
        });
      });
    });
  }

  /* ---------- matching ---------- */

  function gradeWeight(s) { return (s.score_total || 0) / 4; } // 0..6

  function matchByPainPoints() {
    var list = gradedSkills()
      .map(function (s) {
        var overlap = (s.pain_points || []).filter(function (p) { return picked.indexOf(p) >= 0; }).length;
        return { s: s, score: overlap * 10 + gradeWeight(s), overlap: overlap };
      })
      .filter(function (r) { return r.overlap > 0 && r.s.grade.charAt(0) !== "F"; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 5)
      .map(function (r) { return r.s; });
    var labels = DATA.pain_points
      .filter(function (p) { return picked.indexOf(p.id) >= 0; })
      .map(function (p) { return p.label.toLowerCase(); }).join(" + ");
    renderResults(list, "Your vetted stack — " + labels);
  }

  function matchByText(q) {
    var tokens = q.toLowerCase().split(/[^a-z0-9']+/).filter(function (t) { return t.length > 2; });
    if (!tokens.length) return;
    var kwIndex = {}; // pain id -> keywords
    DATA.pain_points.forEach(function (p) { kwIndex[p.id] = p.keywords.concat([p.label.toLowerCase()]); });
    var scored = gradedSkills().map(function (s) {
      var hay = [s.name, s.summary, s.category].join(" ").toLowerCase();
      var hits = 0;
      tokens.forEach(function (t) {
        if (hay.indexOf(t) >= 0) hits += 1;
        (s.pain_points || []).forEach(function (pid) {
          (kwIndex[pid] || []).forEach(function (kw) {
            if (kw.indexOf(t) >= 0 || t.indexOf(kw) >= 0) hits += 1.5;
          });
        });
      });
      return { s: s, hits: hits };
    }).filter(function (r) { return r.hits >= 1.5 && r.s.grade.charAt(0) !== "F"; })
      .sort(function (a, b) { return (b.hits + gradeWeight(b.s) / 10) - (a.hits + gradeWeight(a.s) / 10); })
      .slice(0, 5);
    renderResults(scored.map(function (r) { return r.s; }), 'Matches for “' + q + '”');
  }

  /* ---------- promptgen ---------- */

  function buildPrompt() {
    var compact = gradedSkills().map(function (s) {
      return {
        name: s.name, repo: s.repo_url, grade: s.grade, score: s.score_total + "/24",
        does: s.summary, pain_points: s.pain_points, install: s.install && s.install.command,
        safety: s.security_notes, verified: s.last_verified
      };
    });
    return [
      "You are my Claude-skill advisor, powered by the SKILLproof graded index (skillproof · rubric v" +
        DATA.rubric_version + ", data as of " + DATA.as_of + ").",
      "",
      "When I describe a pain point in my AI-coding workflow, recommend the best-fitting skill(s) from the graded index below — grades first, honesty always:",
      "- Only recommend from this list; if nothing fits, say so plainly rather than guessing.",
      "- Quote the grade and the one-line summary; give the install command when I ask.",
      "- Grades older than ~90 days may be stale; say so.",
      "- Fresh data + grading receipts: https://github.com/lucascashwell3-ai/Skillproof",
      "",
      "GRADED INDEX (JSON):",
      JSON.stringify(compact, null, 1)
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

  fetch("data/skills.json")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      DATA = d;
      var graded = gradedSkills().length;
      $("navCount").textContent = graded + " skills graded · " + d.as_of;
      $("honestyCount").innerHTML = "<b>Current coverage:</b> " + graded +
        " skill" + (graded === 1 ? "" : "s") + " graded so far — target 25. Small on purpose: " +
        "every entry costs a full grading run. No placeholder grades, ever.";

      // pain-point chips
      $("chips").innerHTML = d.pain_points.map(function (p) {
        return '<button class="chip" type="button" data-id="' + esc(p.id) + '">' + esc(p.label) + "</button>";
      }).join("");
      $("chips").querySelectorAll(".chip").forEach(function (chip) {
        chip.addEventListener("click", function () {
          var id = chip.getAttribute("data-id");
          var i = picked.indexOf(id);
          if (i >= 0) { picked.splice(i, 1); chip.classList.remove("is-on"); }
          else if (picked.length < 3) { picked.push(id); chip.classList.add("is-on"); }
          if (picked.length) matchByPainPoints();
          else $("results").innerHTML = "";
        });
      });

      $("goBtn").addEventListener("click", function () { var q = $("q").value.trim(); if (q) matchByText(q); });
      $("q").addEventListener("keydown", function (e) { if (e.key === "Enter") { var q = $("q").value.trim(); if (q) matchByText(q); } });

      renderIndexTable();

      $("genPrompt").addEventListener("click", function () {
        $("promptText").value = buildPrompt();
        $("promptPanel").hidden = false;
      });
      $("copyPrompt").addEventListener("click", function () {
        navigator.clipboard.writeText($("promptText").value).then(function () {
          $("copyStatus").textContent = "Copied — paste it into any Claude chat.";
        });
      });

      stars();
    })
    .catch(function (e) {
      $("results").innerHTML = '<div class="empty">Could not load the index (' + esc(e.message) + ").</div>";
    });
})();
