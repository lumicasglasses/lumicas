/* ===== LUMIC — cinematic dark scroll-video landing =====
 * 1) Hero: a fixed canvas scrubs through a frame sequence while feature
 *    captions run OVER it (synced to scroll). Cover-fit, dark cinematic grade.
 * 2) After the clip: normal dark sections scroll over the canvas and reveal
 *    on enter (IntersectionObserver). */

const FRAME_COUNT = 200;
const FRAME_PATH = (i) => `frames/frame_${String(i).padStart(4, "0")}.jpg`;
const WA_NUMBER = "972535422650";

const canvas = document.getElementById("frameCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const loader = document.getElementById("loader");
const loaderFill = document.getElementById("loaderFill");
const loaderPct = document.getElementById("loaderPct");

const images = new Array(FRAME_COUNT);
let loadedCount = 0;
let currentFrame = -1;

/* Weighty scrub state: the canvas lags toward the scroll-mapped frame (lerp),
   giving the heavy cinematic inertia of the reference instead of snapping. */
let targetFrame = 0;
let displayedFrame = 0;
let rafScrub = false;
const SMOOTH = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 0.16;

/* Technical HUD refs (frame counter, scroll %, portal halo) */
const hud = document.getElementById("heroHud");
const hudFrameEl = document.getElementById("hudFrame");
const hudPctEl = document.getElementById("hudPct");
const hudProgEl = document.getElementById("hudProg");
const heroPortal = document.getElementById("heroPortal");

/* Persistent site HUD (section index + scroll %, shown after the hero) */
const siteHud = document.getElementById("siteHud");
const shIdx = document.getElementById("shIdx");
const shName = document.getElementById("shName");
const shPct = document.getElementById("shPct");
const SITE_SECTIONS = [
  ["statement", "STATEMENT"], ["how", "PROCESS"], ["capabilities", "FEATURES"],
  ["exp1", "VOICE"], ["showcase", "EXPERIENCE"], ["specs", "SPECS"],
  ["box", "IN THE BOX"], ["faq", "FAQ"], ["order", "ORDER"],
];
function updateSiteHud() {
  if (!siteHud) return;
  const past = window.scrollY > window.innerHeight * 0.95;
  siteHud.classList.toggle("on", past);
  if (!past) return;
  const h = document.documentElement.scrollHeight - window.innerHeight;
  const pct = h > 0 ? Math.round((window.scrollY / h) * 100) : 0;
  if (shPct) shPct.textContent = String(pct).padStart(3, "0");
  const line = window.innerHeight * 0.4;
  let idx = 1, name = SITE_SECTIONS[0][1];
  SITE_SECTIONS.forEach(([id, label], i) => {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top <= line) { idx = i + 1; name = label; }
  });
  if (shIdx) shIdx.textContent = String(idx).padStart(2, "0");
  if (shName) shName.textContent = name;
}

/* ---------- Canvas sizing (cover-fit, retina-aware) ---------- */
const CANVAS_BG = "#f6f2ec";

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  currentFrame = -1;
  targetFrame = displayedFrame = frameForScroll();
  drawFrame(targetFrame);
  updateHud(targetFrame);
}

/* Cover-fit: fill the viewport, crop overflow. Product is centered with
   margin in every frame, so the crop never clips it; the dark vignette
   layers hide the cropped edges. */
function drawImageCover(img) {
  if (!img || !img.complete) return;
  const cw = canvas.width, ch = canvas.height;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.max(cw / iw, ch / ih);
  const w = iw * scale, h = ih * scale;
  const x = (cw - w) / 2, y = (ch - h) / 2;
  ctx.fillStyle = CANVAS_BG;
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, x, y, w, h);
}

function drawFrame(index) {
  index = Math.max(0, Math.min(FRAME_COUNT - 1, index));
  if (index === currentFrame) return;
  const img = images[index];
  if (img && img.complete) {
    drawImageCover(img);
    currentFrame = index;
  }
}

/* ---------- Weighty, smoothed scrub ----------
 * Lerp the displayed frame toward the scroll target every rAF for the heavy,
 * cinematic inertia of the reference. The loop parks itself once it catches up,
 * so it costs nothing when idle (reduced-motion → SMOOTH=1 = instant snap). */
function scrubLoop() {
  displayedFrame += (targetFrame - displayedFrame) * SMOOTH;
  if (Math.abs(targetFrame - displayedFrame) < 0.4) displayedFrame = targetFrame;
  const idx = Math.round(displayedFrame);
  drawFrame(idx);
  updateHud(idx);
  if (displayedFrame !== targetFrame) requestAnimationFrame(scrubLoop);
  else rafScrub = false;
}
function startScrub() {
  if (!rafScrub) { rafScrub = true; requestAnimationFrame(scrubLoop); }
}

/* ---------- Technical HUD: live frame counter, scroll %, portal intensity ---------- */
function updateHud(idx) {
  const p = heroProgress();
  if (hudFrameEl) hudFrameEl.textContent = String(Math.min(FRAME_COUNT, idx + 1)).padStart(3, "0");
  if (hudPctEl) hudPctEl.textContent = String(Math.round(p * 100)).padStart(2, "0");
  if (hudProgEl) hudProgEl.style.width = (Math.min(1, Math.max(0, p)) * 100).toFixed(1) + "%";
  if (heroPortal) {
    const fade = p < 0.93 ? 1 : Math.max(0, 1 - (p - 0.93) / 0.07);
    const inten = Math.sin(Math.min(Math.max(p, 0), 1) * Math.PI); // 0 → peak mid-scrub → 0
    heroPortal.style.setProperty("--portal", (inten * fade).toFixed(3));
  }
}

/* ---------- Scroll → frame mapping ---------- */
function frameForScroll() {
  const section = document.getElementById("scrollVideo");
  const rect = section.getBoundingClientRect();
  const total = section.offsetHeight - window.innerHeight;
  const scrolled = Math.min(Math.max(-rect.top, 0), total);
  const progress = total > 0 ? scrolled / total : 0;
  return Math.round(progress * (FRAME_COUNT - 1));
}

let ticking = false;
function onScroll() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(() => {
      targetFrame = frameForScroll();
      startScrub();
      fadeHero();
      updateHeroCaptions();
      updateNav();
      updateReveals();
      updateVideoPlayback();
      updateScrollProgress();
      updateActiveNav();
      updateMobileCta();
      updateSiteHud();
      maybeCountSpecs();
      ticking = false;
    });
  }
}

/* ---------- Hero progress, title fade, running captions ---------- */
const heroOverlay = document.querySelector(".hero-overlay");
const heroChips = document.getElementById("heroChips");
const heroGrades = [...document.querySelectorAll(".hero-grade")];
const heroCaptions = [...document.querySelectorAll(".hero-caption")];
let activeCaption = -1;
const CAPTION_START = 0.16;

function heroProgress() {
  const section = document.getElementById("scrollVideo");
  const total = section.offsetHeight - window.innerHeight;
  const scrolled = Math.min(Math.max(-section.getBoundingClientRect().top, 0), total);
  return total > 0 ? scrolled / total : 0;
}

function fadeHero() {
  const p = heroProgress();
  const o = Math.max(0, 1 - p / CAPTION_START);
  heroOverlay.style.opacity = o;
  if (heroChips) heroChips.style.opacity = o;
  // Fade the whole hero (canvas + grade) out as the dark sections take over,
  // so the fixed bright plate never bleeds behind the content.
  const fade = p < 0.93 ? 1 : Math.max(0, 1 - (p - 0.93) / 0.07);
  canvas.style.opacity = fade;
  heroGrades.forEach((g) => { g.style.opacity = fade; });
  if (hud) hud.style.opacity = fade;
}

function updateHeroCaptions() {
  if (heroCaptions.length === 0) return;
  const p = heroProgress();
  let idx = -1;
  if (p >= CAPTION_START && p < 0.98) {
    const span = 0.98 - CAPTION_START;
    idx = Math.floor(((p - CAPTION_START) / span) * heroCaptions.length);
    if (idx >= heroCaptions.length) idx = heroCaptions.length - 1;
  }
  if (idx !== activeCaption) {
    heroCaptions.forEach((c, i) => c.classList.toggle("active", i === idx));
    activeCaption = idx;
  }
}

/* ---------- Nav scrolled state ---------- */
const nav = document.getElementById("nav");
function updateNav() {
  nav.classList.toggle("scrolled", window.scrollY > window.innerHeight * 0.6);
}

/* ---------- Polish: progress bar, active nav, mobile CTA, count-up ---------- */
function updateScrollProgress() {
  const bar = document.getElementById("scrollBar");
  if (!bar) return;
  const h = document.documentElement.scrollHeight - window.innerHeight;
  bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
}

function updateActiveNav() {
  const line = window.innerHeight * 0.35;
  const map = [
    ["order", document.getElementById("order")],
    ["capabilities", document.getElementById("capabilities")],
    ["features", document.getElementById("scrollVideo")],
  ];
  let active = "features";
  for (const [t, el] of map) {
    if (el && el.getBoundingClientRect().top <= line) { active = t; break; }
  }
  document.querySelectorAll(".nav-links a[data-target]").forEach((a) =>
    a.classList.toggle("active", a.dataset.target === active));
}

function updateMobileCta() {
  const cta = document.getElementById("mobileCta");
  if (!cta) return;
  const order = document.getElementById("order");
  const pastHero = window.scrollY > window.innerHeight * 0.9;
  const orderInView = order && order.getBoundingClientRect().top < window.innerHeight * 0.85;
  cta.classList.toggle("show", pastHero && !orderInView);
}

let specsCounted = false;
function maybeCountSpecs() {
  if (specsCounted) return;
  const specs = document.getElementById("specs");
  if (!specs) return;
  const r = specs.getBoundingClientRect();
  if (r.top > window.innerHeight * 0.85 || r.bottom < 0) return;
  specsCounted = true;
  document.querySelectorAll(".spec .num").forEach((el) => {
    const to = parseInt(el.dataset.to, 10) || 0;
    const dur = 1100, start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick); else el.textContent = to;
    };
    requestAnimationFrame(tick);
  });
}

/* ---------- Feel: cursor glow (+state), magnetic buttons, card tilt ---------- */
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hoverFine = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

function setupCursorGlow() {
  const g = document.getElementById("cursorGlow");
  if (!g || !hoverFine()) return;
  let shown = false;
  window.addEventListener("pointermove", (e) => {
    g.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
    if (!shown) { g.style.opacity = "1"; shown = true; }
  }, { passive: true });
  document.addEventListener("mouseleave", () => { g.style.opacity = "0"; shown = false; });
  // hot state over interactive elements
  document.addEventListener("pointerover", (e) => {
    if (e.target.closest("a, button, input, [data-magnetic], .cap-card, summary")) g.classList.add("hot");
  });
  document.addEventListener("pointerout", (e) => {
    if (e.target.closest("a, button, input, [data-magnetic], .cap-card, summary")) g.classList.remove("hot");
  });
}

function setupMagnetic() {
  if (!hoverFine() || reduceMotion()) return;
  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width / 2);
      const my = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${mx * 0.22}px, ${my * 0.3}px)`;
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
}

function setupCardTilt() {
  if (!hoverFine() || reduceMotion()) return;
  const grid = document.querySelector(".cap-grid");
  if (!grid) return;
  const cards = [...grid.querySelectorAll(".cap-card")];
  cards.forEach((c) => {
    if (!c.querySelector(".glare")) { const s = document.createElement("span"); s.className = "glare"; c.appendChild(s); }
    c.addEventListener("pointerleave", () => { c.style.transform = ""; });
  });
  const MAX = 7;
  grid.addEventListener("pointermove", (e) => {
    const card = e.target.closest(".cap-card");
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    card.style.transform = `translateY(-6px) rotateY(${(px - 0.5) * MAX * 2}deg) rotateX(${-(py - 0.5) * MAX * 2}deg)`;
    card.style.setProperty("--gx", (px * 100) + "%");
    card.style.setProperty("--gy", (py * 100) + "%");
  }, { passive: true });
}

/* ---------- Kinetic headings: per-word rise + statement line-mask ---------- */
function splitWords(el) {
  if (reduceMotion()) return;
  const text = el.textContent;
  el.textContent = "";
  let i = 0;
  for (const part of text.split(/(\s+)/)) {
    if (part === "") continue;
    if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(part)); continue; }
    const w = document.createElement("span"); w.className = "w";
    const inner = document.createElement("span"); inner.className = "w-i";
    inner.textContent = part; inner.style.transitionDelay = (i * 0.05) + "s";
    w.appendChild(inner); el.appendChild(w); i++;
  }
}
function lineMaskBlock(el) {
  if (reduceMotion()) return;
  el.innerHTML = `<span class="lm"><span class="lm-i">${el.innerHTML}</span></span>`;
}
function applyHeadingFx() {
  document.querySelectorAll("[data-split]").forEach(splitWords);
  document.querySelectorAll("[data-split-block]").forEach(lineMaskBlock);
}

/* ---------- WebGL iridescent showpiece (mouse-reactive flowing light) ----------
 * Self-contained: its own canvas/context, never touches the hero canvas. Falls
 * back to the CSS gradient if WebGL is unavailable or reduced-motion is set.
 * Renders only while the section is on screen. */
function setupShowcase() {
  const canvas = document.getElementById("glCanvas");
  if (!canvas || reduceMotion()) return;
  let gl;
  try { gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl"); } catch (e) {}
  if (!gl) return;

  const VS = "attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }";
  const FS = [
    "precision highp float;",
    "uniform float t; uniform vec2 r; uniform vec2 m;",
    "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }",
    "float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);",
    "  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x), mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x), u.y); }",
    "float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; } return v; }",
    "void main(){",
    "  vec2 uv = gl_FragCoord.xy / r.xy;",
    "  float asp = r.x / r.y;",
    "  vec2 p = vec2(uv.x*asp, uv.y);",
    "  vec2 mo = vec2(m.x*asp, m.y);",
    "  float tt = t*0.05;",
    "  vec2 q = vec2(fbm(p*2.0 + tt), fbm(p*2.0 - tt + 5.2));",
    "  vec2 warp = p*3.0 + q*1.7;",
    "  float md = distance(p, mo);",
    "  warp += (p - mo) * 0.5 / (md*md + 0.25);",
    "  float n = fbm(warp + vec2(tt*1.2, -tt));",
    "  vec3 navy = vec3(0.015,0.025,0.055);",
    "  vec3 blue = vec3(0.18,0.55,1.0);",
    "  vec3 amber = vec3(1.0,0.6,0.0);",
    "  vec3 col = mix(navy, blue, smoothstep(0.15,0.65,n));",
    "  col = mix(col, amber, smoothstep(0.62,0.96,n)*0.75);",
    "  float band = sin(n*10.0 + tt*3.0)*0.5+0.5;",
    "  col += band*0.05*vec3(0.4,0.6,1.0);",
    "  col *= 1.0 - 0.45*distance(uv, vec2(0.5));",
    "  gl_FragColor = vec4(col, 1.0);",
    "}",
  ].join("\n");

  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn("shader:", gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  const v = compile(gl.VERTEX_SHADER, VS), f = compile(gl.FRAGMENT_SHADER, FS);
  if (!v || !f) return;
  const prog = gl.createProgram(); gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn("link:", gl.getProgramInfoLog(prog)); return; }
  gl.useProgram(prog);

  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aLoc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  const uT = gl.getUniformLocation(prog, "t"), uR = gl.getUniformLocation(prog, "r"), uM = gl.getUniformLocation(prog, "m");

  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  function resize() {
    const w = Math.max(1, Math.floor(canvas.clientWidth * DPR));
    const h = Math.max(1, Math.floor(canvas.clientHeight * DPR));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  let mx = 0.5, my = 0.55, tmx = 0.5, tmy = 0.55;
  window.addEventListener("pointermove", (e) => {
    const rc = canvas.getBoundingClientRect();
    tmx = (e.clientX - rc.left) / rc.width;
    tmy = 1.0 - (e.clientY - rc.top) / rc.height;
  }, { passive: true });

  let t0 = null;
  function frame(now) {
    requestAnimationFrame(frame);
    const rc = canvas.getBoundingClientRect();
    if (rc.bottom < 0 || rc.top > window.innerHeight) return; // render only when visible
    resize();
    if (t0 === null) t0 = now;
    mx += (tmx - mx) * 0.06; my += (tmy - my) * 0.06;
    gl.uniform1f(uT, (now - t0) / 1000);
    gl.uniform2f(uR, canvas.width, canvas.height);
    gl.uniform2f(uM, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  requestAnimationFrame(frame);
}

function buildMarquee(dict) {
  const track = document.getElementById("marqueeTrack");
  if (!track) return;
  const items = (dict && dict.marquee) || [];
  if (!items.length) return;
  const half = items.map((t) =>
    `<span class="marquee-item">${t}<span class="marquee-dot">✦</span></span>`).join("");
  track.innerHTML = half + half; // duplicate so the -50% loop is seamless
}

/* ---------- Paint brush trail that follows the cursor ----------
 * A full-screen canvas (multiply-blended like ink on paper) draws a thick,
 * tapering orange brush stroke along the pointer path. Slow moves paint
 * fatter; the whole trail dissolves each frame so it trails and fades. Desktop
 * / fine-pointer only; disabled for touch + reduced-motion. */
function setupBrush() {
  const c = document.getElementById("brushTrail");
  if (!c || !hoverFine() || reduceMotion()) return;
  const x = c.getContext("2d");
  let w, h, dpr;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = c.width = Math.floor(window.innerWidth * dpr);
    h = c.height = Math.floor(window.innerHeight * dpr);
    c.style.width = window.innerWidth + "px";
    c.style.height = window.innerHeight + "px";
  }
  size();
  window.addEventListener("resize", size);

  const css = getComputedStyle(document.documentElement);
  const COL = (css.getPropertyValue("--accent").trim() || "#ef6c2e");

  // Keep the recent pointer path; redraw a FULLY OPAQUE stroke each frame. The
  // tail disappears by tapering its WIDTH to a point (never by going
  // transparent), and old points drop off by age so the brush follows + shrinks
  // when you stop. No alpha fade anywhere → solid orange at all times.
  const pts = [];
  const LIFE = 620;          // ms a point stays in the trail
  const MAXW = 50;           // head width (css px)
  window.addEventListener("pointermove", (e) => {
    pts.push({ x: e.clientX * dpr, y: e.clientY * dpr, t: performance.now() });
    if (pts.length > 140) pts.shift();
  }, { passive: true });

  function frame(now) {
    requestAnimationFrame(frame);
    x.clearRect(0, 0, w, h);
    while (pts.length && now - pts[0].t > LIFE) pts.shift();
    if (pts.length < 2) return;
    x.lineCap = "round"; x.lineJoin = "round"; x.strokeStyle = COL;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const f = i / (pts.length - 1);          // 0 = old tail → 1 = head (cursor)
      x.lineWidth = Math.max(2.5 * dpr, MAXW * dpr * f);
      x.beginPath();
      x.moveTo(a.x, a.y);
      x.lineTo(b.x, b.y);
      x.stroke();
    }
  }
  requestAnimationFrame(frame);
}

/* ---------- Preload ---------- */
function preload() {
  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = new Image();
    img.decoding = "async";
    if (i === 0) img.fetchPriority = "high";
    img.onload = img.onerror = () => {
      loadedCount++;
      const pct = Math.round((loadedCount / FRAME_COUNT) * 100);
      loaderFill.style.width = pct + "%";
      loaderPct.textContent = pct + "%";
      if (i === 0) drawFrame(0);
      if (loadedCount === FRAME_COUNT) onAllLoaded();
    };
    img.src = FRAME_PATH(i + 1);
    images[i] = img;
  }
}

function onAllLoaded() {
  document.body.classList.add("loaded"); // triggers loader clip-wipe + hero entrance
  loader.classList.add("hidden");
  resizeCanvas();
  drawFrame(frameForScroll());
}

/* ---------- Reveal on scroll ----------
 * Scroll-driven (not IntersectionObserver) so it can't get stuck invisible if
 * IO callbacks are throttled. <html> gets .reveal-on so that, with JS off, the
 * CSS leaves content fully visible. */
let revealEls = [];
function setupReveals() {
  document.documentElement.classList.add("reveal-on");
  revealEls = [...document.querySelectorAll(".reveal")];
  updateReveals();
}
function updateReveals() {
  if (!revealEls.length) return;
  const trigger = window.innerHeight * 0.88;
  let pending = false;
  for (const el of revealEls) {
    if (el.classList.contains("in")) continue;
    if (el.getBoundingClientRect().top < trigger) el.classList.add("in");
    else pending = true;
  }
  if (!pending) revealEls = revealEls.filter((el) => !el.classList.contains("in"));
}

/* ---------- Feature video playback ----------
 * Each clip plays ONLY while it's in view and pauses + rewinds when it leaves,
 * so you always catch it from the start. Sound is always on — but browsers
 * block audio until the first user interaction, so clips start muted and
 * unmute on the first gesture (click / tap / key), then stay unmuted. Only the
 * clip currently in view plays. */
let videoItems = [];
let wantSound = false;
function updateVideoPlayback() {
  if (!videoItems.length) return;
  const vh = window.innerHeight;
  let active = null, best = 0;
  for (const v of videoItems) {
    const r = v.getBoundingClientRect();
    const vis = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    const ratio = r.height ? vis / r.height : 0;
    if (ratio > 0.5 && ratio > best) { best = ratio; active = v; }
  }
  for (const v of videoItems) {
    if (v === active) {
      if (v.muted !== !wantSound) v.muted = !wantSound;
      if (v.paused) {
        const p = v.play();
        if (p && p.catch) p.catch(() => { v.muted = true; v.play().catch(() => {}); });
      }
    } else if (!v.paused) {
      v.pause();
      v.currentTime = 0;
    }
  }
}
function setupVideoPlayback() {
  videoItems = [...document.querySelectorAll(".feature-media video")];
  if (!videoItems.length) return;
  videoItems.forEach((v) => { v.muted = true; v.pause(); });
  const unlock = () => {
    if (wantSound) return;
    wantSound = true;
    updateVideoPlayback();
    ["pointerdown", "keydown", "touchstart"].forEach((e) => document.removeEventListener(e, unlock));
  };
  ["pointerdown", "keydown", "touchstart"].forEach((e) => document.addEventListener(e, unlock, { passive: true }));
  updateVideoPlayback();
}

/* ---------- Smooth nav scrolling ---------- */
function scrollToHeroFeatures() {
  const section = document.getElementById("scrollVideo");
  if (!section) return;
  const total = section.offsetHeight - window.innerHeight;
  const sectionTop = section.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: sectionTop + (CAPTION_START + 0.04) * total, behavior: "smooth" });
}

function setupNav() {
  document.querySelectorAll(".nav-links a[data-target], #mobileCta[data-target], .hero-cta a[data-target]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const t = a.dataset.target;
      if (t === "features") { scrollToHeroFeatures(); return; }
      const el = document.getElementById(t);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 64;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    });
  });
}

/* ---------- Mobile hamburger menu ---------- */
function setupMobileMenu() {
  const toggle = document.getElementById("navToggle");
  const panel = document.getElementById("navPanel");
  const backdrop = document.getElementById("navBackdrop");
  const navEl = document.getElementById("nav");
  if (!toggle || !panel) return;
  const close = () => {
    panel.classList.remove("open"); navEl.classList.remove("menu-open");
    document.body.classList.remove("nav-locked"); toggle.setAttribute("aria-expanded", "false");
    if (backdrop) backdrop.hidden = true;
  };
  const open = () => {
    panel.classList.add("open"); navEl.classList.add("menu-open");
    document.body.classList.add("nav-locked"); toggle.setAttribute("aria-expanded", "true");
    if (backdrop) backdrop.hidden = false;
  };
  toggle.addEventListener("click", () => (panel.classList.contains("open") ? close() : open()));
  if (backdrop) backdrop.addEventListener("click", close);
  panel.querySelectorAll(".nav-links a, .lang-switch button").forEach((el) => el.addEventListener("click", close));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  window.addEventListener("resize", () => { if (window.innerWidth > 640) close(); });
}

/* ---------- i18n + WhatsApp pre-fill ---------- */
function applyWhatsApp(dict) {
  const href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(dict.wa_msg || "")}`;
  ["waDirect", "waFoot"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.href = href;
  });
}

/* ---------- Order form → WhatsApp with the customer's details ---------- */
function setupOrderForm() {
  const form = document.getElementById("orderForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const lang = document.documentElement.lang || "he";
    const dict = (window.LUMIC_I18N || {})[lang] || {};
    const first = document.getElementById("ofFirst");
    const last = document.getElementById("ofLast");
    const email = document.getElementById("ofEmail");
    const phone = document.getElementById("ofPhone");
    const note = document.getElementById("ofNote");
    const fields = [first, last, email, phone];
    fields.forEach((x) => x.classList.remove("invalid"));

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    const phoneOk = phone.value.replace(/\D/g, "").length >= 7;
    let ok = true;
    if (!first.value.trim()) { first.classList.add("invalid"); ok = false; }
    if (!last.value.trim()) { last.classList.add("invalid"); ok = false; }
    if (!emailOk) { email.classList.add("invalid"); ok = false; }
    if (!phoneOk) { phone.classList.add("invalid"); ok = false; }

    if (!ok) {
      if (note) { note.textContent = dict.order_invalid || "Please fill in all fields."; note.classList.add("err"); }
      const bad = fields.find((x) => x.classList.contains("invalid"));
      if (bad) bad.focus();
      return;
    }
    if (note) { note.classList.remove("err"); note.textContent = dict.order_note || ""; }

    const msg = (dict.wa_tpl || "")
      .replace("{first}", first.value.trim())
      .replace("{last}", last.value.trim())
      .replace("{email}", email.value.trim())
      .replace("{phone}", phone.value.trim());
    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
    const w = window.open(url, "_blank");
    if (!w) location.href = url;
  });
}

function applyLang(lang) {
  const dict = (window.LUMIC_I18N || {})[lang];
  if (!dict) return;
  document.documentElement.lang = lang;
  document.documentElement.dir = dict.dir || "ltr";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key] == null) return;
    if (el.tagName === "META") el.setAttribute("content", dict[key]);
    else el.textContent = dict[key];
  });
  // Rich strings that contain accent <span class="hl"> markup
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (dict[key] != null) el.innerHTML = dict[key];
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    const key = el.getAttribute("data-i18n-ph");
    if (dict[key] != null) el.setAttribute("placeholder", dict[key]);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    if (dict[key] != null) el.setAttribute("aria-label", dict[key]);
  });
  applyWhatsApp(dict);
  buildMarquee(dict);
  applyHeadingFx();
  document.querySelectorAll("#langSwitch button").forEach((b) => {
    b.classList.toggle("active", b.dataset.lang === lang);
  });
  try { localStorage.setItem("lumic_lang", lang); } catch (e) {}
}

function setupLang() {
  const supported = Object.keys(window.LUMIC_I18N || {});
  const fallback = document.documentElement.lang || supported[0];
  let saved = null;
  try { saved = localStorage.getItem("lumic_lang"); } catch (e) {}
  const initial = supported.includes(saved) ? saved : fallback;
  const sw = document.getElementById("langSwitch");
  if (sw) sw.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-lang]");
    if (!btn) return;
    // View Transitions API for an app-like cross-fade on language swap
    if (document.startViewTransition && !reduceMotion()) document.startViewTransition(() => applyLang(btn.dataset.lang));
    else applyLang(btn.dataset.lang);
  });
  applyLang(initial);
}

/* ---------- Init ---------- */
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", () => {
  resizeCanvas();
  updateHeroCaptions();
  updateReveals();
});
document.getElementById("year").textContent = new Date().getFullYear();
setupLang();
resizeCanvas();
setupReveals();
setupNav();
setupMobileMenu();
setupOrderForm();
setupVideoPlayback();
setupCursorGlow();
setupBrush();
setupMagnetic();
setupCardTilt();
setupShowcase();
fadeHero();
updateHeroCaptions();
updateNav();
updateScrollProgress();
updateActiveNav();
updateMobileCta();
updateSiteHud();
preload();
