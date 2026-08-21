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
        { t: "you", type: true, html: "I’m building an app — my frontend looks bad and the answers are always way too long" },
        { t: "tool", html: 'Skillproof: two pain points, two skills. Searching…' },
        { t: "sub", html: 'Design → <span class="ok">impeccable</span> <span class="dim">(★ 4.3k, source read — clean)</span> · Long answers → <span class="ok">terse-mode</span> <span class="dim">(★ 1.2k, clean)</span>' },
        { t: "tool", html: 'Read(<span class="y">CLAUDE.md</span>, <span class="y">~/.claude/skills/</span>)' },
        { t: "sub", html: 'one clash: your rule <span class="warn">“always explain your reasoning in full”</span> would cancel terse-mode' },
        { t: "ask", html: 'Install both and soften that rule to “explain when asked”? Backup first<br><span class="opt">❯ 1. Yes</span> &nbsp; 2. Install only, leave the rule &nbsp; 3. No' },
        { t: "tool", html: 'Edit(CLAUDE.md) <span class="dim">· 1 line</span> &nbsp; <span class="ok">✓</span>' },
        { t: "tool", html: 'Installed <span class="ok">impeccable</span>, <span class="ok">terse-mode</span> → ~/.claude/skills/ &nbsp; <span class="ok">✓ verified</span>' },
        { t: "you", type: true, html: "redo the settings page" },
        { t: "sub", html: 'On it — one screen, real spacing, and I’ll keep the notes short.' }
      ]
    },
    cli: {
      title: "zsh — 96×28",
      lines: [
        { t: "sh", type: true, html: "for f in SKILL.md references/…; do curl -fsSL --create-dirs …/skills/skillproof/$f -o ~/.claude/skills/skillproof/$f; done" },
        { t: "out", html: '<span class="ok">✓</span> SKILL.md · consent.md · conflict-patterns.md · install-paths.md · finding.md · security.md <span class="dim">— 6 files, nothing piped to a shell</span>' },
        { t: "sh", type: true, html: "claude" },
        { t: "banner", html: '<b>✻</b> Welcome to <b>Claude Code</b>! <span class="dim">skill loaded: skillproof</span>' },
        { t: "you", type: true, html: "make my agent better at frontend design" },
        { t: "tool", html: 'Skillproof: found <span class="ok">impeccable</span> <span class="dim">(★ 4.3k, source read — clean)</span>' },
        { t: "sub", html: 'Your setup has an older design skill and a global style rule that would clash' },
        { t: "ask", html: 'Retire ~/.claude/skills/design-old and relax the style rule? Backups first<br><span class="opt">❯ 1. Yes, both</span> &nbsp; 2. Show me each &nbsp; 3. No' },
        { t: "tool", html: 'Done <span class="dim">· 2 edits, 2 backups</span> &nbsp; <span class="ok">✓ verified</span> — one design skill loads now, not two fighting' }
      ]
    },
    mcp: {
      title: "zsh — 96×28",
      lines: [
        { t: "sh", type: true, html: "claude mcp add skillproof -- node mcp/server.js" },
        { t: "out", html: '<span class="ok">✓</span> skillproof is now a tool in every session' },
        { t: "sh", type: true, html: "claude" },
        { t: "you", type: true, html: "audit my setup — what’s conflicting?" },
        { t: "tool", html: 'skillproof.audit() <span class="dim">· read 4 files</span>' },
        { t: "sub", html: '<span class="warn">2 findings:</span> a duplicated memory rule; a skill your CLAUDE.md quietly overrides' },
        { t: "ask", html: 'Fix them? I’ll show each edit before touching anything<br><span class="opt">❯ 1. Show me</span> &nbsp; 2. Fix both &nbsp; 3. Not now' },
        { t: "tool", html: 'Edit 1 of 2 <span class="dim">· merge the duplicate rule into one line</span> &nbsp; <span class="dim">Approve?</span>' }
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

  play(current);
})();
