/* =========================================================================
   Skillproof hero — canvas ASCII particle field
   Ported from the approved prototype (design/direction-lab/skillproof/hero/
   b-particle-assembly.html) with owner edits: a four-pointed AI sparkle-glyph
   default formation (one large + two small companion stars), tools/wrench +
   question-mark morphs, rebalanced layout, a title exclusion zone for
   ambient glyphs, and a scroll dissolve wired to the real #bench element
   instead of a mocked workbench.
   Perf: rAF + IntersectionObserver/visibilitychange gated (two independent
   flags, resynced from scratch on every signal — no stale-read freeze).
   No backdrop-filter, no fixed-attachment, no blend-mode on the canvas.
   ========================================================================= */
(function(){
  "use strict";

  var wrap = document.getElementById('fieldWrap');
  var canvas = document.getElementById('field');
  if(!wrap || !canvas) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
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

  // shared normalized bounding box every formation generator fits inside —
  // keeps scale consistent across morphs
  var NORM_H = 1.14;
  var NORM_W = 0.96;

  function rand(a,b){ return a + Math.random()*(b-a); }
  function pick(arr){ return arr[(Math.random()*arr.length)|0]; }

  // ---- formation primitives ----------------------------------------------
  // outline (superellipse ring, pow=2 -> circle, higher pow -> rounded square)
  function ringOutline(cx,cy,hw,hh,pow,count){
    var out = [];
    for(var i=0;i<count;i++){
      var a = i/count*Math.PI*2;
      var c = Math.cos(a), s = Math.sin(a);
      var x = (c<0?-1:1) * Math.pow(Math.abs(c),2/pow) * hw;
      var y = (s<0?-1:1) * Math.pow(Math.abs(s),2/pow) * hh;
      out.push({x:cx+x, y:cy+y});
    }
    return out;
  }
  function discFill(cx,cy,r,count){
    var out = [];
    for(var i=0;i<count;i++){
      var rad = r*Math.sqrt(Math.random());
      var ang = Math.random()*Math.PI*2;
      out.push({x:cx+rad*Math.cos(ang), y:cy+rad*Math.sin(ang)});
    }
    return out;
  }
  function rectFill(cx,cy,w,h,count){
    var out = [];
    for(var i=0;i<count;i++){
      out.push({x:cx+(Math.random()*2-1)*w/2, y:cy+(Math.random()*2-1)*h/2});
    }
    return out;
  }
  function rectFillRot(cx,cy,w,h,deg,count){
    var r = deg*Math.PI/180, c = Math.cos(r), s = Math.sin(r);
    var out = [];
    for(var i=0;i<count;i++){
      var lx = (Math.random()*2-1)*w/2, ly = (Math.random()*2-1)*h/2;
      out.push({x:cx+(lx*c-ly*s), y:cy+(lx*s+ly*c)});
    }
    return out;
  }
  function lineSeg(x1,y1,x2,y2,count,jitter){
    var out = [];
    var dx = x2-x1, dy = y2-y1;
    var len = Math.sqrt(dx*dx+dy*dy) || 1;
    var nx = -dy/len, ny = dx/len;
    for(var i=0;i<count;i++){
      var t = count<=1 ? 0 : i/(count-1);
      var j = jitter ? (Math.random()*2-1)*jitter : 0;
      out.push({x:x1+dx*t+nx*j, y:y1+dy*t+ny*j});
    }
    return out;
  }
  function arc(cx,cy,r,a0deg,a1deg,count,jitter){
    var out = [];
    for(var i=0;i<count;i++){
      var t = count<=1 ? 0 : i/(count-1);
      var a = (a0deg + (a1deg-a0deg)*t) * Math.PI/180;
      var j = jitter ? (Math.random()*2-1)*jitter : 0;
      out.push({x:cx+(r+j)*Math.cos(a), y:cy+(r+j)*Math.sin(a)});
    }
    return out;
  }
  function grille(cx,cy,w,h,bars,count){
    var out = [];
    for(var i=0;i<count;i++){
      var bar = Math.floor(Math.random()*bars);
      var bx = cx - w/2 + (bar+0.5)*(w/bars);
      var by = cy + (Math.random()*2-1)*(h/2);
      out.push({x:bx+(Math.random()*2-1)*(w/bars)*0.12, y:by});
    }
    return out;
  }

  // Four-pointed "AI sparkle" mark (the standard ✦ glyph: points up/down/
  // left/right, edges curving in toward the center between each point) —
  // the hero's default resting formation. Densely filled (not just an
  // outline) so the silhouette reads solid within ~1s. Built from one large
  // star plus two small companion stars offset top-right and bottom-left,
  // like a cluster of sparkles.
  function starFill(cx, cy, R, rot, minFrac, pow, count){
    var out = [];
    for(var i=0;i<count;i++){
      var a = Math.random()*Math.PI*2;
      var lobe = Math.pow(Math.abs(Math.cos(2*(a-rot))), pow);
      var rmax = R * (minFrac + (1-minFrac)*lobe);
      // exponent < 0.5 biases samples outward: silhouette edge stays crisp
      // at low particle-per-area density (uniform fill read as speckle)
      var r = rmax*Math.pow(Math.random(), 0.36);
      out.push({x:cx+r*Math.cos(a), y:cy+r*Math.sin(a)});
    }
    return out;
  }
  function sparkleFormation(n){
    var mainN = Math.round(n*0.74);
    var comp1N = Math.round(n*0.14);
    var comp2N = n - mainN - comp1N;
    var pts = [];
    // large four-pointed star, centered — kept compact (R 0.30) and sharply
    // pinched so its particle density matches the small companions; at the
    // old R 0.40 / soft pinch the main star had ~4x less density per area
    // than the companions and read as speckle while they read as stars
    pts = pts.concat(starFill(0, 0, 0.30, 0, 0.10, 2.4, mainN));
    // small companion star, top-right
    pts = pts.concat(starFill(0.30, -0.34, 0.11, 0.15, 0.14, 2.4, comp1N));
    // small companion star, bottom-left
    pts = pts.concat(starFill(-0.30, 0.34, 0.11, -0.2, 0.14, 2.4, comp2N));
    return pts;
  }

  // "Get skills" morph -> wrench (clear open jaw + straight handle, diagonal)
  function wrenchFormation(n){
    var jawN = Math.round(n*0.30);
    var handleN = n - jawN;
    var pts = [];
    // open jaw: a "C" arc at the far tip, opening away from the handle
    pts = pts.concat(arc(-0.28,-0.42, 0.13, 281, 551, jawN, 0.02));
    // straight handle running diagonally down to the opposite corner
    pts = pts.concat(lineSeg(-0.18,-0.32, 0.34,0.46, handleN, 0.032));
    return pts;
  }

  // "Install to your agent" morph -> up-arrow inside a circle (approved, unchanged)
  function installFormation(n){
    var pts = [];
    var circleN = Math.round(n*0.55);
    for(var i=0;i<circleN;i++){
      var a = i/circleN*Math.PI*2;
      pts.push({x:0.42*Math.cos(a), y:0.42*Math.sin(a)});
    }
    var shaftN = Math.round(n*0.22);
    for(var j=0;j<shaftN;j++){
      var t = j/shaftN;
      pts.push({x:0, y:0.22 - t*0.40});
    }
    var headN = n - circleN - shaftN;
    var leftN = Math.floor(headN/2), rightN = headN - leftN;
    for(var k=0;k<leftN;k++){
      var u = k/leftN;
      pts.push({x:-0.16*u, y:-0.18 + 0.16*u});
    }
    for(var m=0;m<rightN;m++){
      var u2 = m/rightN;
      pts.push({x:0.16*u2, y:-0.18 + 0.16*u2});
    }
    return pts;
  }

  // "How it works" morph -> question mark: rounded hook + stem + a dot,
  // clearly separated so it reads as "?" at a glance
  function questionFormation(n){
    var hookN = Math.round(n*0.52);
    var stemN = Math.round(n*0.28);
    var dotN  = Math.max(10, n - hookN - stemN);
    var pts = [];
    // hook sweeps upper-left -> top -> right side -> lower-right, leaving
    // the gap open at lower-left (where a real "?" curls empty before the
    // stem), instead of wrapping the left side like the old version did
    pts = pts.concat(arc(0.00,-0.34, 0.22, 200, 420, hookN, 0.012));
    pts = pts.concat(lineSeg(0.11,-0.15, 0.00,0.10, stemN, 0.012));
    pts = pts.concat(discFill(0.02, 0.33, 0.055, dotN));
    return pts;
  }

  var FORMATIONS = {
    sparkle: sparkleFormation,
    wrench: wrenchFormation,
    install: installFormation,
    question: questionFormation
  };

  var N = 0; // glyph count, set on resize
  var particles = [];
  var currentFormationKey = 'sparkle';
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
      size: rand(11, 15)
    };
  }

  function computeCount(){
    var area = W*H;
    var target = Math.round(area / 3200);
    return Math.max(160, Math.min(600, target));
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
    var gen = FORMATIONS[key];
    var box = getVisualBox();
    var cx = box.cx, cy = box.cy;

    // uniform scale (true proportions, no stretching): whichever budget —
    // viewport-height share, or the zone's own width — is more constraining
    // wins. Formation is centered in its half and sized slightly larger than
    // the original pass so the two halves meet without a dead center gap.
    var hBudget = Math.min(box.h*0.94, H*0.66);
    var wBudget = box.w*0.94;
    var scale = Math.min(hBudget/NORM_H, wBudget/NORM_W);

    var count = Math.min(particles.length, Math.max(80, Math.round(particles.length*0.94)));
    targetPts = gen(count).map(function(pt){
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
  }
  function onPointerLeave(){ pointer.active = false; pointer.x=-9999; pointer.y=-9999; }

  wrap.addEventListener('mousemove', onPointerMove, {passive:true});
  wrap.addEventListener('mouseleave', onPointerLeave, {passive:true});
  wrap.addEventListener('touchmove', onPointerMove, {passive:true});
  wrap.addEventListener('touchend', onPointerLeave, {passive:true});

  var FORCE_RADIUS = 130;
  var FORCE_STRENGTH = 2600;

  function step(t){
    if(!running) return;
    lastT = t;

    ctx.clearRect(0,0,W,H);

    for(var i=0;i<particles.length;i++){
      var p = particles[i];

      var ax, ay;
      if(p.tx !== null){
        ax = p.tx + p.disperseX*dissolveT;
        ay = p.ty + p.disperseY*dissolveT;
      } else {
        var tsec = t/1000;
        ax = p.hx + Math.sin(tsec*p.driftSpeed + p.driftSeed) * p.driftAmp;
        ay = p.hy + Math.cos(tsec*p.driftSpeed*0.8 + p.driftSeed) * p.driftAmp;
      }

      var k = p.tx !== null ? 0.022 : 0.006;
      var damp = 0.84;
      var fx = (ax - p.x) * k;
      var fy = (ay - p.y) * k;

      if(pointer.active){
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

      var fsize = p.isFormation ? p.size*1.8 : p.size;
      ctx.font = (p.isFormation ? '700 ' : '500 ') + fsize + 'px "JetBrains Mono", monospace';
      var formAlpha = 0.95 * (1 - dissolveT*0.92);
      ctx.fillStyle = p.isFormation ? hexAlpha(p.color, formAlpha) : restingInk(p);
      ctx.fillText(p.glyph, p.x, p.y);
    }

    rafId = requestAnimationFrame(step);
  }

  function restingInk(p){
    if(p.accent) return hexAlpha(p.color, 0.5);
    return p.glyph.length > 1 ? 'rgba(107,101,145,.34)' : 'rgba(154,149,184,.55)';
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
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ isVisible = e.isIntersecting; });
    syncRunning();
  }, {threshold: 0.01});
  io.observe(wrap);

  document.addEventListener('visibilitychange', function(){
    isHidden = document.hidden;
    syncRunning();
  });

  var resizeTimer;
  window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function(){
      layout();
      if(reduced) renderStatic();
    }, 120);
  }, {passive:true});

  // ---- hero button hover -> micro formation ------------------------------
  var HOVER_MAP = { bench:'wrench', carry:'install', how:'question' };
  var hoverButtons = document.querySelectorAll('.hero-ctas [data-form]');
  hoverButtons.forEach(function(btn){
    var key = btn.getAttribute('data-form');
    var micro = HOVER_MAP[key];
    function enter(){
      if(micro) applyFormation(micro, reduced);
      if(reduced) renderStatic();
    }
    function leave(){
      applyFormation('sparkle', reduced);
      if(reduced) renderStatic();
    }
    btn.addEventListener('mouseenter', enter);
    btn.addEventListener('focus', enter);
    btn.addEventListener('mouseleave', leave);
    btn.addEventListener('blur', leave);
  });

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

  // ---- init ---------------------------------------------------------------
  layout();
  if(reduced){
    renderStatic();
    if(benchEl){ benchEl.style.opacity = ''; benchEl.style.transform = ''; }
  } else {
    start();
    applyScroll();
  }
})();
