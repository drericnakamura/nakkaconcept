// Shared drawing + math helpers. Everything here is a pure function of its
// arguments so any frame can be rendered on its own (parallel rendering).
'use strict';
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');

const FONT_DIR = path.join(__dirname, '..', 'fonts');
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Fredoka-500.ttf'), 'Fredoka500');
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Fredoka-600.ttf'), 'Fredoka600');
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Fredoka-700.ttf'), 'Fredoka700');

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const smooth = (a, b, x) => { const t = inv(a, b, x); return t * t * (3 - 2 * t); };

const ease = {
  linear: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t) => {
    if (t <= 0) return 0; if (t >= 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1;
  },
  outQuad: (t) => 1 - (1 - t) * (1 - t),
};

// Deterministic hash → [0,1)
function hash(n) {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Smooth 1D value noise in [-1,1]
function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = hash(i * 7919 + seed * 131) * 2 - 1, b = hash((i + 1) * 7919 + seed * 131) * 2 - 1;
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}

// ---------- colour ----------
function hex2rgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex, a = 1) { const [r, g, b] = hex2rgb(hex); return `rgba(${r},${g},${b},${a})`; }
function mix(h1, h2, t, a = 1) {
  const c1 = hex2rgb(h1), c2 = hex2rgb(h2);
  const r = Math.round(lerp(c1[0], c2[0], t)), g = Math.round(lerp(c1[1], c2[1], t)), b = Math.round(lerp(c1[2], c2[2], t));
  return `rgba(${r},${g},${b},${a})`;
}
function mixHex(h1, h2, t) {
  const c1 = hex2rgb(h1), c2 = hex2rgb(h2);
  const c = [0, 1, 2].map((i) => Math.round(lerp(c1[i], c2[i], t)));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}
// desaturate toward a grey of same luminance, amount 0..1
function desat(hex, amt) {
  const [r, g, b] = hex2rgb(hex);
  const l = Math.round(0.3 * r + 0.59 * g + 0.11 * b);
  const lh = '#' + [l, l, l].map((v) => v.toString(16).padStart(2, '0')).join('');
  return mixHex(hex, lh, amt);
}

// ---------- canvases & sprites ----------
function makeCanvas(w, h) { return createCanvas(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h))); }

const glowCache = new Map();
// soft round light sprite, tinted
function glowSprite(color) {
  if (glowCache.has(color)) return glowCache.get(color);
  const S = 256, c = makeCanvas(S, S), x = c.getContext('2d');
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, rgba(color, 1));
  g.addColorStop(0.18, rgba(color, 0.55));
  g.addColorStop(0.45, rgba(color, 0.16));
  g.addColorStop(1, rgba(color, 0));
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  glowCache.set(color, c);
  return c;
}
function glow(ctx, x, y, r, color, alpha = 1, mode = 'lighter') {
  if (alpha <= 0.002 || r <= 0.5) return;
  const s = glowSprite(color);
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = clamp(alpha);
  ctx.drawImage(s, x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

// 4-point twinkle sparkle
function sparkle(ctx, x, y, r, rot, color, alpha = 1, withGlow = true) {
  if (alpha <= 0.002 || r <= 0.3) return;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  if (withGlow) glow(ctx, 0, 0, r * 2.4, color, alpha * 0.55);
  ctx.globalAlpha = clamp(alpha);
  ctx.fillStyle = '#ffffff';
  const k = r * 0.22;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(k, -k, r, 0);
  ctx.quadraticCurveTo(k, k, 0, r);
  ctx.quadraticCurveTo(-k, k, -r, 0);
  ctx.quadraticCurveTo(-k, -k, 0, -r);
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function starPath(ctx, x, y, R, r, n = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 === 0 ? R : r;
    const a = rot + (i * Math.PI) / n;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
// soft, chubby star (rounded points) — drawn by fill + same-colour round stroke
function chubbyStar(ctx, x, y, R, fill, stroke, lw) {
  starPath(ctx, x, y, R * 0.86, R * 0.47);
  ctx.lineJoin = 'round';
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = lw ?? R * 0.28; ctx.strokeStyle = stroke ?? fill; ctx.stroke();
}

function heartPath(ctx, x, y, s) {
  // heart centred at (x,y), width ≈ 2s
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.95);
  ctx.bezierCurveTo(x - s * 1.25, y + s * 0.1, x - s * 1.05, y - s * 0.95, x - s * 0.5, y - s * 0.95);
  ctx.bezierCurveTo(x - s * 0.18, y - s * 0.95, x, y - s * 0.7, x, y - s * 0.45);
  ctx.bezierCurveTo(x, y - s * 0.7, x + s * 0.18, y - s * 0.95, x + s * 0.5, y - s * 0.95);
  ctx.bezierCurveTo(x + s * 1.05, y - s * 0.95, x + s * 1.25, y + s * 0.1, x, y + s * 0.95);
  ctx.closePath();
}

// friendly molar silhouette centred at (x,y), w wide, h tall
function toothPath(ctx, x, y, w, h) {
  const l = x - w / 2, r = x + w / 2, t = y - h / 2, b = y + h / 2;
  ctx.beginPath();
  ctx.moveTo(x, t + h * 0.12);
  ctx.bezierCurveTo(x - w * 0.12, t - h * 0.02, l + w * 0.05, t - h * 0.04, l, t + h * 0.2);
  ctx.bezierCurveTo(l - w * 0.04, t + h * 0.42, l + w * 0.1, t + h * 0.6, l + w * 0.14, b - h * 0.08);
  ctx.bezierCurveTo(l + w * 0.17, b + h * 0.03, l + w * 0.36, b + h * 0.03, l + w * 0.38, b - h * 0.12);
  ctx.bezierCurveTo(l + w * 0.41, b - h * 0.3, x - w * 0.06, b - h * 0.4, x, b - h * 0.4);
  ctx.bezierCurveTo(x + w * 0.06, b - h * 0.4, r - w * 0.41, b - h * 0.3, r - w * 0.38, b - h * 0.12);
  ctx.bezierCurveTo(r - w * 0.36, b + h * 0.03, r - w * 0.17, b + h * 0.03, r - w * 0.14, b - h * 0.08);
  ctx.bezierCurveTo(r - w * 0.1, t + h * 0.6, r + w * 0.04, t + h * 0.42, r, t + h * 0.2);
  ctx.bezierCurveTo(r - w * 0.05, t - h * 0.04, x + w * 0.12, t - h * 0.02, x, t + h * 0.12);
  ctx.closePath();
}

// Heater-style shield centred at (x,y): width w, height h
function shieldPath(ctx, x, y, w, h) {
  const l = x - w / 2, r = x + w / 2, t = y - h / 2, b = y + h / 2;
  ctx.beginPath();
  ctx.moveTo(l, t + h * 0.08);
  ctx.quadraticCurveTo(x, t - h * 0.06, r, t + h * 0.08);
  ctx.bezierCurveTo(r, t + h * 0.55, r - w * 0.1, b - h * 0.18, x, b);
  ctx.bezierCurveTo(l + w * 0.1, b - h * 0.18, l, t + h * 0.55, l, t + h * 0.08);
  ctx.closePath();
}

// ---------- text ----------
function font(size, weight = 700) { return `${size}px Fredoka${weight}`; }
function text(ctx, str, x, y, o = {}) {
  const size = o.size ?? 40;
  ctx.save();
  ctx.font = font(size, o.weight ?? 700);
  ctx.textAlign = o.align ?? 'center';
  ctx.textBaseline = o.baseline ?? 'middle';
  if (o.letterSpacing) ctx.letterSpacing = `${o.letterSpacing}px`;
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.shadowBlur ?? 12; ctx.shadowOffsetY = o.shadowY ?? 4; }
  if (o.stroke) {
    ctx.lineJoin = 'round'; ctx.lineWidth = o.strokeW ?? size * 0.16; ctx.strokeStyle = o.stroke;
    ctx.strokeText(str, x, y);
    ctx.shadowColor = 'transparent';
  }
  ctx.fillStyle = o.color ?? '#3b2a57';
  ctx.fillText(str, x, y);
  ctx.restore();
}
// text along a circle arc (for badges). centreAngle in radians (-PI/2 = top)
function arcText(ctx, str, cx, cy, radius, centreAngle, o = {}) {
  const size = o.size ?? 40;
  ctx.save();
  ctx.font = font(size, o.weight ?? 700);
  ctx.fillStyle = o.color ?? '#fff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const spacing = o.spacing ?? size * 0.08;
  const widths = [...str].map((ch) => ctx.measureText(ch).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  const inward = o.inward ?? false; // text reads along bottom arc when inward=true
  let ang = centreAngle + (inward ? 1 : -1) * (total / 2) / radius;
  [...str].forEach((ch, i) => {
    const w = widths[i];
    const a = ang + (inward ? -1 : 1) * (w - spacing) / 2 / radius;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    ctx.rotate(a + (inward ? -Math.PI / 2 : Math.PI / 2));
    if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.strokeW ?? size * 0.14; ctx.strokeStyle = o.stroke; ctx.strokeText(ch, 0, 0); }
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    ang += (inward ? -1 : 1) * w / radius;
  });
  ctx.restore();
}

// ---------- camera ----------
// cam: {x,y,z} world point at screen centre and zoom. p = parallax factor.
function applyCam(ctx, cam, p = 1, W = 1080, H = 1920) {
  const z = 1 + (cam.z - 1) * p;
  const cx = W / 2 + (cam.x - W / 2) * p, cy = H / 2 + (cam.y - H / 2) * p;
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-cx, -cy);
}
// keep the view inside the world rectangle
function clampCam(cam, W = 1080, H = 1920) {
  const hw = W / 2 / cam.z, hh = H / 2 / cam.z;
  return { x: clamp(cam.x, hw, W - hw), y: clamp(cam.y, hh, H - hh), z: cam.z };
}
// keyframed camera: keys = [{t, x, y, z}], eased between neighbours
function camAt(keys, t, e = ease.inOut) {
  if (t <= keys[0].t) return { ...keys[0] };
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b.t) {
      const u = e(inv(a.t, b.t, t));
      return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z, b.z, u) };
    }
  }
  return { ...keys[keys.length - 1] };
}
// generic keyframe for points [{t,x,y}] with easing
function pathAt(keys, t, e = ease.inOut) {
  if (t <= keys[0].t) return { x: keys[0].x, y: keys[0].y };
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b.t) {
      const u = (b.e ?? e)(inv(a.t, b.t, t));
      if (b.via) { // quadratic bezier through control point
        const q = b.via, m = 1 - u;
        return { x: m * m * a.x + 2 * m * u * q.x + u * u * b.x, y: m * m * a.y + 2 * m * u * q.y + u * u * b.y };
      }
      return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
    }
  }
  const l = keys[keys.length - 1];
  return { x: l.x, y: l.y };
}

// paper grain + vignette overlay (cached)
let grainC = null, vignC = null;
function finishFrame(ctx, W = 1080, H = 1920, vignetteColor = '#2a1838', vAmt = 0.32) {
  if (!grainC) {
    grainC = makeCanvas(W / 2, H / 2);
    const g = grainC.getContext('2d');
    const img = g.createImageData(W / 2, H / 2);
    const R = rng(1234);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (R() - 0.5) * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  const key = vignetteColor + vAmt;
  if (!vignC || vignC.key !== key) {
    vignC = makeCanvas(W, H); vignC.key = key;
    const v = vignC.getContext('2d');
    const gr = v.createRadialGradient(W / 2, H * 0.52, H * 0.28, W / 2, H * 0.52, H * 0.78);
    gr.addColorStop(0, rgba(vignetteColor, 0)); gr.addColorStop(1, rgba(vignetteColor, vAmt));
    v.fillStyle = gr; v.fillRect(0, 0, W, H);
  }
  ctx.save();
  ctx.drawImage(vignC, 0, 0);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.07;
  ctx.drawImage(grainC, 0, 0, W, H);
  ctx.restore();
}

module.exports = {
  TAU, clamp, lerp, inv, smooth, ease, hash, rng, noise1,
  hex2rgb, rgba, mix, mixHex, desat,
  makeCanvas, glowSprite, glow, sparkle, roundRect, starPath, chubbyStar, heartPath, toothPath, shieldPath,
  font, text, arcText, applyCam, clampCam, camAt, pathAt, finishFrame,
};
