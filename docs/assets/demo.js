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
      title: "claude — 96×28",
      lines: [
        { t: "banner", html: '<b>✻</b> Welcome to <b>Claude Code</b>! <span class="dim">/help for help · cwd: ~/projects/app</span>' },
        { t: "sub", html: 'What do you want your AI to do better? Not sure? Tell me what you use AI for, or say “look”.' },
        { t: "you", type: true, html: "not sure honestly — the answers are always way too long" },
        { t: "tool", html: 'Read(<span class="y">CLAUDE.md</span>, <span class="y">~/.claude/skills/</span>) <span class="dim">· read-only</span>' },
        { t: "sub", html: '1. Add <span class="ok">caveman</span> — Type /caveman, and your AI answers in far fewer words' },
        { t: "sub", html: '2. Add <span class="ok">show-me</span> — Your AI shows long answers as one page you can scan' },
        { t: "ask", html: 'One clash: your rule <span class="warn">“always explain your reasoning in full”</span> would cancel caveman. Soften that rule to “explain when asked”? Backup first<br><span class="opt">❯ 1. Go</span> &nbsp; 2. Skip the rule change &nbsp; 3. No' },
        { t: "tool", html: 'Edit(CLAUDE.md) <span class="dim">· 1 line, backed up</span> &nbsp; <span class="ok">✓</span>' },
        { t: "tool", html: 'Installed. <span class="ok">caveman</span> · <span class="ok">show-me</span> → ~/.claude/skills/ <span class="dim">· undo: move both folders out</span>' },
        { t: "you", type: true, html: "why is my checkout page slow?" },
        { t: "sub", html: 'Two reasons, biggest first: full-size product images, then a font that blocks the page. Fix the images?' }
      ]
    },
    cli: {
      title: "zsh — 96×28",
      lines: [
        { t: "sh", type: true, html: "for f in SKILL.md references/…; do curl -fsSL --create-dirs …/skills/skillproof/$f -o ~/.claude/skills/skillproof/$f; done" },
        { t: "out", html: '<span class="ok">✓</span> SKILL.md · consent.md · conflict-patterns.md · install-paths.md · finding.md · security.md <span class="dim">— 6 files, nothing piped to a shell</span>' },
        { t: "sh", type: true, html: "claude" },
        { t: "banner", html: '<b>✻</b> Welcome to <b>Claude Code</b>! <span class="dim">skill loaded: skillproof</span>' },
        { t: "you", type: true, html: "make my pages look less generic" },
        { t: "tool", html: 'Skillproof: <span class="ok">frontend-design</span> fits — your older design skill covers half of what frontend-design does' },
        { t: "sub", html: 'Plan: swap design-old for frontend-design and keep your two personal lines in the new one' },
        { t: "ask", html: 'Go? design-old is backed up first<br><span class="opt">❯ 1. Go</span> &nbsp; 2. Show me the lines &nbsp; 3. No' },
        { t: "tool", html: 'Installed. <span class="ok">frontend-design</span> — Your AI now designs pages with a clear visual direction <span class="dim">· 1 backup</span>' }
      ]
    },
    mcp: {
      title: "zsh — 96×28",
      lines: [
        { t: "sh", type: true, html: "claude mcp add skillproof -- node mcp/server.js" },
        { t: "out", html: '<span class="ok">✓</span> skillproof is now a tool in every session' },
        { t: "sh", type: true, html: "claude" },
        { t: "you", type: true, html: "find me a skill so my emails stop sounding like AI" },
        { t: "tool", html: 'skillproof.find_resources(<span class="y">“sounds like AI”</span>)' },
        { t: "sub", html: '<span class="ok">humanizer</span> — Say “humanize this” on any draft, and your AI rewrites the draft in a plain human voice' },
        { t: "ask", html: 'Install humanizer? I read its files first<br><span class="opt">❯ 1. Yes</span> &nbsp; 2. Show me the source &nbsp; 3. Not now' },
        { t: "tool", html: 'Installed. <span class="ok">humanizer</span> → ~/.claude/skills/ <span class="dim">· undo: move the folder out</span>' }
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

  // keep: on first load the page already shows this session's opening lines
  // (they're in the markup so the terminal is never empty without the script).
  // Continue typing after them instead of wiping and retyping them.
  function play(method, keep) {
    clearTimers();
    var script = SCRIPTS[method];
    var kept = keep ? body.querySelectorAll(".tln.show").length : 0;
    if (kept !== body.children.length || kept > script.lines.length) kept = 0;
    if (!kept) {
      body.innerHTML = "";
      body.scrollTop = 0;
    }
    title.textContent = script.title;
    for (var d = 0; d < dots.length; d++) dots[d].classList.toggle("on", ORDER[d] === method);

    var els = script.lines.map(function (l, n) {
      if (n < kept) return body.children[n];
      var div = document.createElement("div");
      div.className = "tln " + l.t;
      body.appendChild(div);
      return div;
    });

    if (reduced) {
      script.lines.forEach(function (l, i) {
        if (i < kept) return;
        els[i].innerHTML = l.html;
        els[i].classList.add("show");
      });
      follow();
      scheduleNext(9000);
      return;
    }

    var i = kept;
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
    var prev = current;
    current = method;
    tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t.dataset.m === method)); });
    var fwd = ORDER.indexOf(method) >= ORDER.indexOf(prev);
    panes.forEach(function (p) {
      var on = p.dataset.pane === method;
      p.classList.remove("from-l", "from-r");
      if (on && fromUser) p.classList.add(fwd ? "from-r" : "from-l");
      p.classList.toggle("on", on);
      if (on) p.removeAttribute("hidden"); else p.setAttribute("hidden", "");
    });
    if (reduced) { play(method); return; }
    var dir = ORDER.indexOf(method) >= ORDER.indexOf(prev) ? "l" : "r";
    body.classList.add("swap-" + dir);
    clearTimers();
    later(function () {
      body.classList.remove("swap-l", "swap-r");
      // arrive from the opposite side, one frame later
      body.classList.add("swap-" + (dir === "l" ? "r" : "l"));
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          body.classList.remove("swap-l", "swap-r");
          play(method);
        });
      });
    }, 310);
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () { setMethod(t.dataset.m, true); });
  });

  // (pointer-follow beam removed 2026-08-21 — restarting the loop on
  // pointerleave read as a glitch; the beam just orbits continuously now)

  play(current, true);
})();
