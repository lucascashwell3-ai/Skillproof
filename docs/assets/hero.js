/* =========================================================================
   Skillproof hero — canvas ASCII particle field
   Ported from the approved prototype (design/direction-lab/skillproof/hero/
   b-particle-assembly.html). Shapes are rasterized from drawn icon geometry
   and pixel-sampled (see "shape sampling"), so each formation matches its
   button icon by construction: robot head at rest, wrench / install / "?" on
   hover. Plus a title exclusion zone for ambient glyphs and a scroll dissolve
   wired to the real #bench element.
   Perf: rAF + IntersectionObserver/visibilitychange gated (two independent
   flags, resynced from scratch on every signal — no stale-read freeze).
   No backdrop-filter, no fixed-attachment, no blend-mode on the canvas.
   ========================================================================= */
(function(){
  "use strict";

  var wrap = document.getElementById('fieldWrap');
  var canvas = document.getElementById('field');
  if(!wrap || !canvas) return;
  // canvas 2D can be absent (very old browser) or refused (hardened/enterprise
  // profiles, some privacy extensions). Bail to the centered-title fallback
  // rather than throwing halfway through setup and leaving a dead half-hero.
  var ctx = canvas.getContext && canvas.getContext('2d');
  if(!ctx){ wrap.classList.add('no-field'); return; }
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // capped at 1.5, not 2: the canvas is cleared and refilled every frame, so
  // pixel count is the single biggest cost here. At DPR 2 a 1440x900 hero is a
  // 4.6-megapixel per-frame repaint; 1.5 cuts that ~44% with no visible loss on
  // glyphs this small.
  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var W = 0, H = 0;
  var running = false;
  var lastT = 0;

  // ---- glyph vocabulary -------------------------------------------------
  var NOISE_GLYPHS = ['.',':','+','*','#','o','/','\\','|','(',')'];
  var WORD_FRAGMENTS = ['skill','vet','fit','stack','proof','ready','trust','install'];
  // dense ASCII-only glyphs — used once a particle joins a formation, so the
  // shape reads as a solid mark at a glance instead of a scattered blob
  var FORMATION_GLYPHS = ['#','*','+','o'];
  var COLORS = ['#6D5BF6','#06B6D4','#EC4899','#10B981','#3B82F6'];


  function rand(a,b){ return a + Math.random()*(b-a); }
  function pick(arr){ return arr[(Math.random()*arr.length)|0]; }

  // ---- shape sampling ----------------------------------------------------
  // Formations are not hand-authored point clouds. Every shape is DRAWN with
  // the same geometry its button icon uses, rasterized to an offscreen bitmap,
  // and sampled for opaque pixels. What the particles spell is what the icon
  // looks like, by construction — no parametric guesswork.
  var SHEET = 128;
  var shapeCache = {};

  function roundRectPath(o, x, y, w, h, r){
    o.beginPath();
    if(o.roundRect){ o.roundRect(x, y, w, h, r); return; }
    o.moveTo(x+r, y);
    o.arcTo(x+w, y,   x+w, y+h, r);
    o.arcTo(x+w, y+h, x,   y+h, r);
    o.arcTo(x,   y+h, x,   y,   r);
    o.arcTo(x,   y,   x+w, y,   r);
    o.closePath();
  }

  function rasterize(draw){
    var off = document.createElement('canvas');
    off.width = off.height = SHEET;
    var o = off.getContext('2d');
    o.fillStyle = '#000'; o.strokeStyle = '#000';
    o.lineCap = 'round'; o.lineJoin = 'round';
    draw(o);
    var d = o.getImageData(0, 0, SHEET, SHEET).data;
    var hits = [], minX = SHEET, minY = SHEET, maxX = 0, maxY = 0;
    for(var y=0;y<SHEET;y++){
      for(var x=0;x<SHEET;x++){
        if(d[(y*SHEET+x)*4+3] > 128){
          hits.push(x, y);
          if(x<minX) minX=x; if(x>maxX) maxX=x;
          if(y<minY) minY=y; if(y>maxY) maxY=y;
        }
      }
    }
    // uniform normalize: longest axis spans 1.0, shape centered on origin
    var span = Math.max(1, Math.max(maxX-minX, maxY-minY));
    var ox = (minX+maxX)/2, oy = (minY+maxY)/2;
    var pts = [];
    for(var i=0;i<hits.length;i+=2){
      pts.push({ x:(hits[i]-ox)/span, y:(hits[i+1]-oy)/span });
    }
    return pts;
  }

  function sampleShape(key, n){
    var pool = shapeCache[key] || (shapeCache[key] = rasterize(SHAPES[key]));
    var out = [], len = pool.length;
    if(!len) return out;
    // stride-sample the (row-major) pool so coverage stays even, with a
    // sub-pixel jitter so the result never reads as a scanline grid
    var step = len/n, jit = 0.4/SHEET;
    for(var k=0;k<n;k++){
      var p = pool[Math.min(len-1, Math.floor(k*step + Math.random()*step))];
      out.push({ x:p.x + rand(-jit,jit), y:p.y + rand(-jit,jit) });
    }
    return out;
  }

  // ---- the shapes (drawn at 128x128) -------------------------------------
  var SHAPES = {
    // default: a robot head — thick outline + solid features. Outline (not a
    // filled silhouette) concentrates every particle on the contour, so the
    // shape reads at a glance instead of dissolving into a blob.
    robot: function(o){
      // thinner outline spends fewer particles on the contour, leaving more
      // for the features — at ~600 particles a fat outline starves the eyes
      o.lineWidth = 6.5;
      // squarer head (r14, not r21) — a soft-cornered oval reads as a pumpkin
      roundRectPath(o, 25, 33, 78, 67, 14); o.stroke();
      o.lineWidth = 6;                                               // antenna
      o.beginPath(); o.moveTo(64, 33); o.lineTo(64, 17); o.stroke();
      o.beginPath(); o.arc(64, 11, 7, 0, Math.PI*2); o.fill();
      roundRectPath(o, 4, 55, 15, 23, 4); o.fill();                  // ears, held
      roundRectPath(o, 109, 55, 15, 23, 4); o.fill();                // clear of the head
      o.beginPath(); o.arc(48, 60, 10, 0, Math.PI*2); o.fill();      // solid eyes
      o.beginPath(); o.arc(80, 60, 10, 0, Math.PI*2); o.fill();
      o.lineWidth = 5;                                               // grille mouth
      roundRectPath(o, 45, 79, 38, 14, 5); o.stroke();
      o.beginPath(); o.moveTo(57.6, 79); o.lineTo(57.6, 93);
      o.moveTo(70.3, 79); o.lineTo(70.3, 93); o.lineWidth = 4; o.stroke();
    },
    // "Get skills" -> a single double-open-ended wrench on the diagonal
    wrench: function(o){
      o.save();
      o.translate(64, 64); o.rotate(-Math.PI/4);
      o.fillRect(-32, -5, 64, 10);                                   // handle
      o.beginPath(); o.arc(-34, 0, 17, 0, Math.PI*2); o.fill();      // heads
      o.beginPath(); o.arc(34, 0, 17, 0, Math.PI*2); o.fill();
      // open jaws: a deep V cut out of each head, so the tool reads as a
      // wrench rather than a dumbbell
      o.globalCompositeOperation = 'destination-out';
      o.beginPath(); o.moveTo(-30,0); o.lineTo(-56,-13); o.lineTo(-56,13); o.closePath(); o.fill();
      o.beginPath(); o.moveTo(30,0);  o.lineTo(56,-13);  o.lineTo(56,13);  o.closePath(); o.fill();
      o.restore();
    },
    // "Install to your agent" -> up-arrow in a circle (approved, unchanged)
    install: function(o){
      o.lineWidth = 8;
      o.beginPath(); o.arc(64, 64, 40, 0, Math.PI*2); o.stroke();
      o.beginPath(); o.moveTo(64, 88); o.lineTo(64, 42); o.stroke();
      o.beginPath(); o.moveTo(46, 60); o.lineTo(64, 41); o.lineTo(82, 60); o.stroke();
    },
    // "How it works" -> the literal "?" glyph in the same font/weight the
    // button icon renders, so the morph matches the icon exactly
    question: function(o){
      o.textAlign = 'center'; o.textBaseline = 'middle';
      o.font = '700 116px "JetBrains Mono", ui-monospace, monospace';
      o.fillText('?', 64, 62);
    }
  };

  var N = 0; // glyph count, set on resize
  var particles = [];
  var currentFormationKey = 'robot';
  var targetPts = [];
  // 0..1 scroll-driven release amount — see the scroll dissolve block below
  var dissolveT = 0;

  // exclusion zone (padded rect around the title/subline/buttons block) —
  // no ambient glyph "home" position is allowed to land inside it, so the
  // title always sits on clean aurora
  var exclZone = null; // {l,t,r,b} in field-wrap-local px
  var EXCL_PAD = 40;

  function computeExclusionZone(){
    var panel = document.querySelector('.hero-panel');
    if(!panel){ exclZone = null; return; }
    var wrapRect = wrap.getBoundingClientRect();
    var pr = panel.getBoundingClientRect();
    exclZone = {
      l: (pr.left - wrapRect.left) - EXCL_PAD,
      t: (pr.top  - wrapRect.top)  - EXCL_PAD,
      r: (pr.right - wrapRect.left) + EXCL_PAD,
      b: (pr.bottom - wrapRect.top) + EXCL_PAD
    };
  }
  function inExclusionZone(x,y){
    if(!exclZone) return false;
    return x > exclZone.l && x < exclZone.r && y > exclZone.t && y < exclZone.b;
  }
  function randomHome(){
    var x, y, tries = 0;
    do {
      x = rand(0, W); y = rand(0, H); tries++;
    } while(inExclusionZone(x,y) && tries < 20);
    return {x:x, y:y};
  }

  function makeParticle(i){
    var isWord = (i % 6 === 0);
    return {
      hx: 0, hy: 0,
      x: 0, y: 0,
      vx: 0, vy: 0,
      tx: null, ty: null,
      glyph: isWord ? pick(WORD_FRAGMENTS) : pick(NOISE_GLYPHS),
      color: pick(COLORS),
      isFormation: false,
      accent: isWord && Math.random() < 0.16,
      driftSeed: Math.random()*1000,
      driftSpeed: isWord ? rand(0.05, 0.13) : rand(0.15, 0.4),
      driftAmp: isWord ? rand(10, 20) : rand(6, 16),
      // scroll-release drift vector (upward-biased) — used once dissolveT>0
      disperseX: rand(-160, 160),
      disperseY: rand(-220, -40),
      size: Math.round(rand(11, 15))
    };
  }

  function computeCount(){
    var area = W*H;
    var target = Math.round(area / 1600);
    return Math.max(260, Math.min(900, target));
  }

  var firstLoad = true;
  function layout(){
    var rect = wrap.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W*DPR);
    canvas.height = Math.round(H*DPR);
    canvas.style.width = W+'px';
    canvas.style.height = H+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);

    computeExclusionZone();

    var newN = computeCount();
    if(Math.abs(newN - N) > 40 || particles.length === 0){
      N = newN;
      particles = [];
      for(var i=0;i<N;i++) particles.push(makeParticle(i));
    }

    for(var j=0;j<particles.length;j++){
      var p = particles[j];
      var home = randomHome();
      p.hx = home.x; p.hy = home.y;
      if(p.x === 0 && p.y === 0){ p.x = p.hx; p.y = p.hy; }
    }

    applyFormation(currentFormationKey, !firstLoad);
    firstLoad = false;
  }

  // the open half (.hero-visual, an empty layout anchor) — the formation
  // lives entirely inside it, so nothing ever occludes the shape
  var visualEl = document.querySelector('.hero-visual');
  function getVisualBox(){
    var wrapRect = wrap.getBoundingClientRect();
    var vr = visualEl.getBoundingClientRect();
    return {
      cx: (vr.left - wrapRect.left) + vr.width/2,
      cy: (vr.top  - wrapRect.top)  + vr.height/2,
      w: vr.width, h: vr.height
    };
  }

  function applyFormation(key, instant){
    currentFormationKey = key;
    wake(2600); // let an assembly or morph converge at full frame rate
    var box = getVisualBox();
    var cx = box.cx, cy = box.cy;

    // shapes normalize to a 1.0 longest axis, so one uniform scale fits any
    // of them into whichever budget is tighter: the visual half, or a share
    // of viewport height.
    var scale = Math.min(box.h*0.92, H*0.62, box.w*0.92);

    var count = Math.min(particles.length, Math.max(80, Math.round(particles.length*0.94)));
    targetPts = sampleShape(key, count).map(function(pt){
      return { x: cx + pt.x*scale, y: cy + pt.y*scale };
    });

    for(var i=0;i<particles.length;i++) particles[i].isFormation = false;

    var used = new Array(particles.length).fill(false);
    for(var k=0;k<targetPts.length;k++){
      var tgt = targetPts[k];
      var best=-1, bestD=Infinity;
      for(var m=0;m<particles.length;m++){
        if(used[m]) continue;
        var p = particles[m];
        var dx=p.hx-tgt.x, dy=p.hy-tgt.y;
        var d=dx*dx+dy*dy;
        if(d<bestD){bestD=d;best=m;}
      }
      if(best>=0){
        used[best]=true;
        particles[best].tx = tgt.x;
        particles[best].ty = tgt.y;
        particles[best].isFormation = true;
        particles[best].color = pick(COLORS);
        particles[best].glyph = pick(FORMATION_GLYPHS);
        if(instant){ particles[best].x = tgt.x; particles[best].y = tgt.y; }
      }
    }
    for(var n=0;n<particles.length;n++){
      if(!used[n]){
        particles[n].tx = null; particles[n].ty = null;
        particles[n].glyph = (n % 6 === 0) ? pick(WORD_FRAGMENTS) : pick(NOISE_GLYPHS);
      }
    }
  }

  // ---- pointer force -----------------------------------------------------
  var pointer = { x:-9999, y:-9999, active:false };
  function onPointerMove(e){
    var rect = canvas.getBoundingClientRect();
    var cx, cy;
    if(e.touches && e.touches[0]){ cx=e.touches[0].clientX; cy=e.touches[0].clientY; }
    else { cx=e.clientX; cy=e.clientY; }
    pointer.x = cx - rect.left;
    pointer.y = cy - rect.top;
    pointer.active = true;
    pointer.moveAt = now();
    // NOTE: moving the cursor deliberately does NOT cancel the intro cycle.
    // The hero wrap is the full viewport, so any mouse twitch in the first six
    // seconds used to kill the intro before it ever played — which is exactly
    // what happened in practice: nobody ever saw it. Pushing particles around
    // and watching the shapes cycle coexist fine. Only real intent cancels:
    // hovering a CTA, focusing one, or scrolling away.
    wake(700);
  }
  function onPointerLeave(){ pointer.active = false; pointer.x=-9999; pointer.y=-9999; }

  wrap.addEventListener('mousemove', onPointerMove, {passive:true});
  wrap.addEventListener('mouseleave', onPointerLeave, {passive:true});
  wrap.addEventListener('touchmove', onPointerMove, {passive:true});
  wrap.addEventListener('touchend', onPointerLeave, {passive:true});

  var FORCE_RADIUS = 130;
  var FORCE_STRENGTH = 2600;

  // ---- sleep when nothing is happening -------------------------------------
  // A hero nobody is touching costs nothing: once the particles stop moving we
  // paint one last frame and cancel the animation loop entirely (0% CPU), so an
  // idle tab drains no battery. Any real activity — pointer, hover morph,
  // scroll, resize — calls wake() and the loop restarts at full 60fps.
  //
  // Crucially the field is STILL when asleep rather than crawling: a slow
  // low-frame-rate drift reads as jank, whereas a static field reads as a
  // finished composition. Ambient drift therefore only runs while awake.
  // A cursor resting inside the hero is not interaction — without this, parking
  // the mouse over the field (very common while reading) would hold the loop
  // awake forever, since mouseleave never fires.
  var POINTER_IDLE_MS = 1200;
  var SETTLE_SPEED = 0.05;  // px/frame below which a particle counts as parked
  var SETTLE_FRAMES = 30;   // consecutive calm frames before we sleep
  var calmFrames = 0;
  var activeUntil = 0;
  function now(){ return window.performance ? performance.now() : Date.now(); }
  function wake(ms){
    activeUntil = now() + (ms || 900);
    calmFrames = 0;
    if(!running && !reduced) start();
  }

  function step(t){
    if(!running) return;
    var pointerLive = pointer.active && (t - (pointer.moveAt || 0)) < POINTER_IDLE_MS;
    var awake = t < activeUntil || pointerLive || dissolveT > 0.001;
    // capped so a long throttled frame can't make the spring step unstable;
    // cap stays high (200ms) so heavily rAF-throttled embedded browsers
    // still converge in wall-clock time (k*fscale max ~0.26, damp^12 — stable)
    var dt = Math.min(200, t - (lastT || t)) || 16.67;
    lastT = t;

    ctx.clearRect(0,0,W,H);
    var lastFont = '';
    var maxSpeed = 0;

    for(var i=0;i<particles.length;i++){
      var p = particles[i];

      var ax, ay;
      if(p.tx !== null){
        ax = p.tx + p.disperseX*dissolveT;
        ay = p.ty + p.disperseY*dissolveT;
      } else if(awake){
        var tsec = t/1000;
        ax = p.hx + Math.sin(tsec*p.driftSpeed + p.driftSeed) * p.driftAmp;
        ay = p.hy + Math.cos(tsec*p.driftSpeed*0.8 + p.driftSeed) * p.driftAmp;
      } else {
        ax = p.hx; ay = p.hy;   // parked: lets the spring actually converge
      }

      // frame-rate independent: forces and damping are normalized to a 60fps
      // frame so convergence takes the same wall-clock time in throttled
      // embedded browsers (~10-15fps) as in native 60fps Chrome
      var fscale = dt / 16.67;
      var k = (p.tx !== null ? 0.022 : 0.006) * fscale;
      var damp = Math.pow(0.84, fscale);
      var fx = (ax - p.x) * k;
      var fy = (ay - p.y) * k;

      if(pointerLive){
        var dx = p.x - pointer.x, dy = p.y - pointer.y;
        var dist2 = dx*dx+dy*dy;
        var r2 = FORCE_RADIUS*FORCE_RADIUS;
        if(dist2 < r2){
          var dist = Math.max(8, Math.sqrt(dist2));
          var force = (1 - dist/FORCE_RADIUS) * FORCE_STRENGTH / (dist*dist);
          fx += (dx/dist) * force;
          fy += (dy/dist) * force;
        }
      }

      p.vx = (p.vx + fx) * damp;
      p.vy = (p.vy + fy) * damp;
      p.x += p.vx;
      p.y += p.vy;
      var sp = Math.abs(p.vx) + Math.abs(p.vy);
      if(sp > maxSpeed) maxSpeed = sp;

      // sizes are whole pixels, so this resolves to a handful of distinct font
      // strings — assigning ctx.font re-parses it every time, so skip repeats
      var fsize = p.isFormation ? p.size*1.8 : p.size;
      var font = (p.isFormation ? '700 ' : '500 ') + fsize + 'px "JetBrains Mono", monospace';
      if(font !== lastFont){ ctx.font = font; lastFont = font; }
      var formAlpha = 0.95 * (1 - dissolveT*0.92);
      ctx.fillStyle = p.isFormation ? hexAlpha(p.color, formAlpha) : restingInk(p);
      ctx.fillText(p.glyph, p.x, p.y);
    }

    // everything has come to rest and nothing is asking for motion -> sleep
    if(!awake && maxSpeed < SETTLE_SPEED){
      if(++calmFrames >= SETTLE_FRAMES){ stop(); return; }
    } else if(awake){
      calmFrames = 0;
    }

    rafId = requestAnimationFrame(step);
  }

  function restingInk(p){
    if(p.accent) return hexAlpha(p.color, 0.5);
    return p.glyph.length > 1 ? 'rgba(107,101,145,.42)' : 'rgba(154,149,184,.62)';
  }
  function hexAlpha(hex, a){
    var c = hex.replace('#','');
    var r=parseInt(c.substring(0,2),16), g=parseInt(c.substring(2,4),16), b=parseInt(c.substring(4,6),16);
    return 'rgba('+r+','+g+','+b+','+a+')';
  }

  var rafId = null;
  function start(){
    if(running || reduced) return;
    running = true;
    lastT = 0;
    rafId = requestAnimationFrame(step);
  }
  function stop(){
    running = false;
    if(rafId) cancelAnimationFrame(rafId);
  }

  // static render for reduced motion: draw the assembled formation once,
  // no drift/force, dissolve stays inert, content stays fully visible
  function renderStatic(){
    ctx.clearRect(0,0,W,H);
    for(var i=0;i<particles.length;i++){
      var p = particles[i];
      var x = p.isFormation ? p.tx : p.hx;
      var y = p.isFormation ? p.ty : p.hy;
      var fsize = p.isFormation ? p.size*1.8 : p.size;
      ctx.font = (p.isFormation ? '700 ' : '500 ') + fsize + 'px "JetBrains Mono", monospace';
      ctx.fillStyle = p.isFormation ? hexAlpha(p.color, 0.95) : restingInk(p);
      ctx.fillText(p.glyph, x, y);
    }
  }

  // ---- visibility / perf gating -------------------------------------------
  // Two independent flags, resynced from scratch on every signal — avoids a
  // stale read of one signal permanently wedging the loop off. isHidden
  // starts optimistic (false) and only ever changes on a real
  // 'visibilitychange' event, never a one-off document.hidden read at setup.
  var isVisible = true, isHidden = false;
  function syncRunning(){
    if(reduced) return;
    if(isVisible && !isHidden) start(); else stop();
  }
  // Feature-detected, not assumed. Without this guard a browser lacking
  // IntersectionObserver threw here and took the WHOLE hero down — blank canvas,
  // no particles, no morphs. The observer is an optimisation (don't animate
  // offscreen), so its absence must cost a little battery, never the visual.
  if(window.IntersectionObserver){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ isVisible = e.isIntersecting; });
      syncRunning();
    }, {threshold: 0.01});
    io.observe(wrap);
  }

  document.addEventListener('visibilitychange', function(){
    isHidden = document.hidden;
    syncRunning();
  });

  var resizeTimer;
  window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function(){
      wake(1200);
      layout();
      if(reduced) renderStatic();
    }, 120);
  }, {passive:true});

  // ---- hero button hover -> micro formation ------------------------------
  var HOVER_MAP = { bench:'wrench', carry:'install', how:'question' };
  // slice, not NodeList.forEach — the latter is missing on older engines and
  // would throw here, taking the rest of the hero down with it
  var hoverButtons = Array.prototype.slice.call(document.querySelectorAll('.hero-ctas [data-form]'));
  hoverButtons.forEach(function(btn){
    var key = btn.getAttribute('data-form');
    var micro = HOVER_MAP[key];
    function enter(){
      cancelIntro();
      if(!micro) return;
      if(reduced) return swapReduced(micro);
      applyFormation(micro, false);
    }
    function leave(){
      if(reduced) return swapReduced('robot');
      applyFormation('robot', false);
    }
    btn.addEventListener('mouseenter', enter);
    btn.addEventListener('focus', enter);
    btn.addEventListener('mouseleave', leave);
    btn.addEventListener('blur', leave);
  });

  // Reduced motion still deserves a transition — it just can't be travel. The
  // shape swaps behind an opacity cross-fade (see the reduced-motion block in
  // styles.css, which re-enables opacity transitions for #field): no particle
  // movement, but no jump cut either.
  var swapTimer = null;
  function swapReduced(key){
    clearTimeout(swapTimer);
    canvas.style.opacity = '0';
    swapTimer = setTimeout(function(){
      applyFormation(key, true);
      renderStatic();
      canvas.style.opacity = '1';
    }, 190);
  }

  // ---- intro cycle --------------------------------------------------------
  // Runs ONCE, a second or so after the robot lands: the field steps through
  // each button's shape, pulsing that button as it forms, then returns to the
  // robot and goes back to sleep. It teaches what the three buttons do without
  // the user having to discover the hover — and unlike a permanent loop it
  // costs nothing after the first few seconds.
  //
  // Any real interaction cancels it immediately: a canned animation must never
  // fight someone who has started using the page.
  var introTimers = [];
  var introSpent = false;
  function cancelIntro(){
    if(!introTimers.length) return;
    introTimers.forEach(clearTimeout);
    introTimers = [];
    introSpent = true;
  }
  function pulseButton(formKey){
    var b = document.querySelector('.hero-ctas [data-form="' + formKey + '"]');
    if(!b) return;
    b.classList.remove('hint');
    void b.offsetWidth;          // restart the animation if it's mid-flight
    b.classList.add('hint');
    setTimeout(function(){ b.classList.remove('hint'); }, 900);
  }
  function runIntro(){
    if(reduced || introSpent) return;
    introSpent = true;
    // starts sooner (the robot has landed by ~1.2s) and holds each shape 1.4s,
    // long enough to read the form and glance at the button pulsing with it
    [ { at: 1500, shape: 'wrench',   btn: 'bench' },
      { at: 2900, shape: 'install',  btn: 'carry' },
      { at: 4300, shape: 'question', btn: 'how'   },
      { at: 5700, shape: 'robot',    btn: null    }
    ].forEach(function(beat){
      introTimers.push(setTimeout(function(){
        applyFormation(beat.shape);
        if(beat.btn) pulseButton(beat.btn);
      }, beat.at));
    });
  }

  // ---- scroll dissolve: hero formation releases into the real workbench ---
  // rAF-throttled, transform/opacity only. As the hero scrolls up, the
  // formation's particles drift off their targets (upward bias) and fade,
  // the field parallaxes up + fades, and the real #bench element crossfades
  // in on the same progress value — one continuous motion into real page
  // structure, not a mocked panel. Tightened vs. the prototype (smaller
  // scroll distance + higher base opacity) so less empty aurora shows
  // between hero release and the workbench arriving. Fully skipped under
  // reduced motion — content stays at rest and fully visible.
  var heroContentEl = document.querySelector('.hero-content');
  var benchEl = document.getElementById('bench');
  var scrollTicking = false;
  function applyScroll(){
    if(reduced) return;   // the dissolve is travel — exactly what reduce-motion opts out of
    if(window.scrollY > 40) cancelIntro();
    wake(600); // scrolling drives the dissolve — needs full frame rate
    scrollTicking = false;
    if(reduced) return;
    var rect = wrap.getBoundingClientRect();
    var vh = window.innerHeight || 800;
    var raw = -rect.top / (vh*0.62);
    var p = Math.max(0, Math.min(1, raw));
    dissolveT = p*p*(3-2*p); // smoothstep

    canvas.style.transform = 'translate3d(0,' + (-dissolveT*70) + 'px,0)';
    canvas.style.opacity = String(1 - dissolveT*0.92);
    if(heroContentEl){
      heroContentEl.style.transform = 'translate3d(0,' + (-dissolveT*44) + 'px,0)';
      heroContentEl.style.opacity = String(1 - dissolveT*0.9);
    }
    if(benchEl){
      benchEl.style.transform = 'translate3d(0,' + ((1-dissolveT)*18) + 'px,0)';
      benchEl.style.opacity = String(0.4 + dissolveT*0.6);
    }
  }
  window.addEventListener('scroll', function(){
    if(!scrollTicking){ scrollTicking = true; requestAnimationFrame(applyScroll); }
  }, {passive:true});

  // The "?" formation is sampled from a real JetBrains Mono glyph; if the
  // webfont lands after first paint the cached sample is the fallback face,
  // so drop it and re-fit once fonts are actually ready.
  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(function(){
      delete shapeCache.question;
      if(currentFormationKey === 'question') applyFormation('question', true);
    });
  }

  // ---- init ---------------------------------------------------------------
  // Everything above degrades on its own; this is the last line of defence. If
  // the field can't be built at all on some machine we've never seen, the hero
  // must still look deliberate — .no-field centers the title over the aurora
  // instead of leaving an empty right half that reads as a broken page.
  try {
    layout();
    if(reduced){
      renderStatic();
      if(benchEl){ benchEl.style.opacity = ''; benchEl.style.transform = ''; }
    } else {
      start();
      applyScroll();
      runIntro();
    }
  } catch(err){
    stop();
    wrap.classList.add('no-field');
    if(window.console && console.warn) console.warn('Skillproof hero: field disabled —', err);
  }
})();
