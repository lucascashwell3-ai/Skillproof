/* =====================================================================
   The living terminal + installer tabs.
   One selection drives both: pick an install method and the terminal
   plays that method's session, abridged. Untouched, it tours all three
   and the dots in the bar show where it is; the first click ends the
   tour and the terminal follows the user.
   Sessions are representative transcripts of the skill's real six-phase
   behaviour (find → read → name conflicts → show edits → consent →
   prove + undo) — kept honest: nothing here claims an execution that
   didn't happen; the flows mirror the skill's documented behaviour.
   ===================================================================== */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var SCRIPTS = {
    prompt: {
      title: "skillproof — paste the prompt",
      lines: [
        { t: "you", type: true, html: "my agent writes tests that pass but don’t test anything" },
        { t: "sp", html: 'Found <span class="ok">test-honesty</span> — source-read, clean. Before installing, I read your setup.' },
        { t: "sp", html: '<span class="warn">Conflict:</span> CLAUDE.md line 41 says “never block on failing tests.” It will fight the new skill.' },
        { t: "sp", html: 'May I soften line 41? <span class="dim">(backup first — undo: restore CLAUDE.md.bak)</span>' },
        { t: "you", type: true, html: "yes" },
        { t: "sp", html: '<span class="ok">✓ Edited, confirmed, backed up.</span> <span class="ok">✓ Installed test-honesty.</span>' },
        { t: "sp", html: "Try it: ask for a test — it should now refuse to fake one." }
      ]
    },
    cli: {
      title: "skillproof — install the skill",
      lines: [
        { t: "sh", type: true, html: "for f in SKILL.md references/…; do curl -fsSL --create-dirs …; done" },
        { t: "out", html: '✓ 7 files → ~/.claude/skills/skillproof/ <span class="dim">— nothing piped to a shell</span>' },
        { t: "you", type: true, html: "make my agent better at frontend design" },
        { t: "sp", html: 'Found <span class="ok">impeccable</span>. Your setup: 2 conflicts — a global style rule and an older design skill.' },
        { t: "sp", html: "Here is each edit, one at a time. Nothing happens without your yes." },
        { t: "you", type: true, html: "go ahead on both" },
        { t: "sp", html: '<span class="ok">✓ Done, verified, undo ready.</span> Your agent now loads one design skill, not two fighting.' }
      ]
    },
    mcp: {
      title: "skillproof — as an MCP server",
      lines: [
        { t: "sh", type: true, html: "claude mcp add skillproof -- node mcp/server.js" },
        { t: "out", html: "✓ skillproof available as a tool in every session" },
        { t: "you", type: true, html: "audit my setup — what’s conflicting?" },
        { t: "sp", html: 'Read 4 files. <span class="warn">2 findings:</span> duplicate memory rules; a skill your CLAUDE.md overrides silently.' },
        { t: "sp", html: "Want fixes? I’ll show each edit and ask before touching anything." },
        { t: "you", type: true, html: "show me" },
        { t: "sp", html: '<span class="hi">Edit 1 of 2:</span> merge the duplicate rule into one line. <span class="dim">Approve?</span>' }
      ]
    }
  };
  var ORDER = ["prompt", "cli", "mcp"];

  var body = document.getElementById("termBody");
  var title = document.getElementById("termTitle");
  var dotsWrap = document.getElementById("termDots");
  if (!body || !title || !dotsWrap) return;
  var dots = dotsWrap.children;
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".inst-tab"));
  var panes = Array.prototype.slice.call(document.querySelectorAll(".inst-pane"));

  var current = "prompt";
  var timers = [];
  var userDrove = false;

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  // keep the newest line in view — long sessions finish typing below the
  // terminal's fixed height otherwise, clipped and unseen
  function follow() { body.scrollTop = body.scrollHeight; }

  function typeLine(el, text, done) {
    if (reduced) { el.textContent = text; el.classList.add("show"); done(); return; }
    var caret = document.createElement("span");
    caret.className = "tcaret";
    el.classList.add("show");
    el.appendChild(caret);
    var i = 0;
    (function tick() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i);
        el.appendChild(caret);
        i++;
        timers.push(setTimeout(tick, 24 + Math.random() * 30));
      } else {
        later(function () { if (caret.parentNode) caret.parentNode.removeChild(caret); done(); }, 260);
      }
    })();
  }

  function play(method) {
    clearTimers();
    var script = SCRIPTS[method];
    body.innerHTML = "";
    body.scrollTop = 0;
    title.textContent = script.title;
    for (var d = 0; d < dots.length; d++) dots[d].classList.toggle("on", ORDER[d] === method);

    var els = script.lines.map(function (l) {
      var div = document.createElement("div");
      div.className = "tln " + l.t;
      body.appendChild(div);
      return div;
    });

    if (reduced) {
      script.lines.forEach(function (l, i) {
        els[i].innerHTML = l.html;
        els[i].classList.add("show");
      });
      follow();
      scheduleNext(9000);
      return;
    }

    var i = 0;
    (function next() {
      if (i >= script.lines.length) { scheduleNext(4200); return; }
      var l = script.lines[i], el = els[i];
      i++;
      if (l.type) {
        var tmp = document.createElement("div");
        tmp.innerHTML = l.html;
        later(function () {
          typeLine(el, tmp.textContent, function () { follow(); later(next, 300); });
        }, 350);
      } else {
        later(function () {
          el.innerHTML = l.html;
          el.classList.add("show");
          follow();
          later(next, 780);
        }, 350);
      }
    })();
  }

  function scheduleNext(ms) {
    if (userDrove) return;
    later(function () {
      var idx = (ORDER.indexOf(current) + 1) % ORDER.length;
      setMethod(ORDER[idx], false);
    }, ms);
  }

  function setMethod(method, fromUser) {
    if (fromUser) userDrove = true;
    current = method;
    tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t.dataset.m === method)); });
    panes.forEach(function (p) {
      var on = p.dataset.pane === method;
      p.classList.toggle("on", on);
      if (on) p.removeAttribute("hidden"); else p.setAttribute("hidden", "");
    });
    if (reduced) { play(method); return; }
    body.classList.add("swap");
    clearTimers();
    later(function () {
      body.classList.remove("swap");
      play(method);
    }, 350);
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () { setMethod(t.dataset.m, true); });
  });

  play(current);
})();
