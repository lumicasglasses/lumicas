/* ===== LUMIC — scroll-driven frame sequence + captions-over-video + reveal =====
 * 1) Hero: the video scrubs while feature captions run OVER it (synced to scroll).
 * 2) After the clip: the last frame stays as a fixed background and the About/Order
 *    slides appear one-by-one.
 * Contain-fit (whole frame visible, cream bars that blend) — the floating glasses
 * are never cropped. */

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

/* ---------- Canvas sizing (contain-fit, retina-aware) ---------- */
const CANVAS_BG = "#e7e2d9"; // cream — matches the video wall so bars blend

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  currentFrame = -1;
  drawFrame(frameForScroll());
}

function drawImageContain(img) {
  if (!img || !img.complete) return;
  const cw = canvas.width, ch = canvas.height;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.min(cw / iw, ch / ih);
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
    drawImageContain(img);
    currentFrame = index;
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
      drawFrame(frameForScroll());
      fadeHero();
      updateHeroCaptions();
      updateReveal();
      ticking = false;
    });
  }
}

/* ---------- Hero progress, title fade, running feature captions ---------- */
const heroOverlay = document.querySelector(".hero-overlay");
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
  heroOverlay.style.opacity = Math.max(0, 1 - heroProgress() / CAPTION_START);
}

function updateHeroCaptions() {
  if (heroCaptions.length === 0) return;
  const p = heroProgress();
  let idx = -1;
  if (p >= CAPTION_START && p < 1) {
    const span = 1 - CAPTION_START;
    idx = Math.floor(((p - CAPTION_START) / span) * heroCaptions.length);
    if (idx >= heroCaptions.length) idx = heroCaptions.length - 1;
  }
  if (idx !== activeCaption) {
    heroCaptions.forEach((c, i) => c.classList.toggle("active", i === idx));
    activeCaption = idx;
  }
}

/* ---------- Preload ---------- */
function preload() {
  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = new Image();
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
  loader.classList.add("hidden");
  resizeCanvas();
  drawFrame(frameForScroll());
}

/* ---------- Sequential slide reveal ---------- */
const SEG = 0.9; // screens of scroll per slide
let revealSection, slides = [], dots = [], slideCount = 0, activeSlide = -1;

function setupReveal() {
  revealSection = document.getElementById("reveal");
  if (!revealSection) return;
  slides = [...revealSection.querySelectorAll(".slide")];
  slideCount = slides.length;
  revealSection.style.height = (slideCount * SEG + 1) * 100 + "vh";

  const dotsWrap = document.getElementById("revealDots");
  if (dotsWrap) {
    slides.forEach((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.addEventListener("click", () => scrollToSlide(i));
      dotsWrap.appendChild(b);
      dots.push(b);
    });
  }
  updateReveal();
}

function updateReveal() {
  if (!revealSection || slideCount === 0) return;
  const rect = revealSection.getBoundingClientRect();
  const total = revealSection.offsetHeight - window.innerHeight;
  const scrolled = Math.min(Math.max(-rect.top, 0), total);
  const progress = total > 0 ? scrolled / total : 0;
  let idx = Math.floor(progress * slideCount);
  if (idx >= slideCount) idx = slideCount - 1;
  if (idx < 0) idx = 0;
  if (idx !== activeSlide) {
    slides.forEach((s, i) => s.classList.toggle("active", i === idx));
    dots.forEach((d, i) => d.classList.toggle("on", i === idx));
    activeSlide = idx;
  }
}

function scrollToSlide(i) {
  if (!revealSection) return;
  const total = revealSection.offsetHeight - window.innerHeight;
  const sectionTop = revealSection.getBoundingClientRect().top + window.scrollY;
  const top = sectionTop + ((i + 0.5) / slideCount) * total;
  window.scrollTo({ top, behavior: "smooth" });
}

function scrollToHeroFeatures() {
  const section = document.getElementById("scrollVideo");
  if (!section) return;
  const total = section.offsetHeight - window.innerHeight;
  const sectionTop = section.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: sectionTop + (CAPTION_START + 0.04) * total, behavior: "smooth" });
}

function setupNav() {
  const map = {};
  slides.forEach((s, i) => { const k = s.dataset.slide; if (k) map[k] = i; });
  document.querySelectorAll(".nav-links a[data-target]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const t = a.dataset.target;
      if (t === "features") scrollToHeroFeatures();
      else scrollToSlide(map[t] || 0);
    });
  });
}

/* ---------- i18n + WhatsApp pre-fill ---------- */
function applyWhatsApp(dict) {
  const href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(dict.wa_msg || "")}`;
  const cta = document.getElementById("waCta");
  const phone = document.getElementById("waPhone");
  if (cta) cta.href = href;
  if (phone) phone.href = href;
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
  applyWhatsApp(dict);
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
    if (btn) applyLang(btn.dataset.lang);
  });
  applyLang(initial);
}

/* ---------- Init ---------- */
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", () => {
  if (revealSection) revealSection.style.height = (slideCount * SEG + 1) * 100 + "vh";
  activeSlide = -1;
  resizeCanvas();
  updateHeroCaptions();
  updateReveal();
});
document.getElementById("year").textContent = new Date().getFullYear();
setupLang();
resizeCanvas();
setupReveal();
setupNav();
fadeHero();
updateHeroCaptions();
preload();
