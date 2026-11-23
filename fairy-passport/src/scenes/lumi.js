// LUMI — The Four Lost Stars.
// The constellation is a little tooth; its four big stars sit where the four
// quadrants are on the mouth map (mirror view): top-right, top-left,
// bottom-left, bottom-right.
'use strict';
const L = require('../lib');
const F = require('../fairy');
const B = require('../badge');
const PR = require('../progress');
const { TAU, clamp, lerp, inv, ease, rgba, glow, sparkle, hash, rng } = L;
const { W, H, BRUSH } = require('../timeline');

const SP = F.SPECS.lumi;
const CC = { x: 540, y: 836, size: 600 };   // constellation centre + scale
const SLOT = B.CONSTELLATION.slots.map((s) => ({ x: CC.x + s.x * CC.size, y: CC.y + s.y * CC.size }));
// where each lost star is hiding
const HIDE = [
  { x: 900, y: 600 },    // 1: behind a little cloud (top right)
  { x: 190, y: 548 },    // 2: inside a pink nebula at the end of the trail (top left)
  { x: 300, y: 1500 },   // 3: inside the glowing cloud below the moon (bottom left)
  { x: SLOT[3].x, y: SLOT[3].y }, // 4: appears right in its empty place (bottom right)
];
const MOON = { x: 222, y: 1196, r: 112 };
const FOUND = [30, 60, 90, 120];

let C = null;
function init() {
  if (C) return C;
  C = {};
  C.sky = L.makeCanvas(W, H);
  {
    const x = C.sky.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#120F33'); g.addColorStop(0.3, '#251F66'); g.addColorStop(0.55, '#463A94');
    g.addColorStop(0.76, '#8A63AE'); g.addColorStop(0.9, '#D98FB3'); g.addColorStop(1, '#FFC6B0');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // milky way band
    x.save(); x.filter = 'blur(40px)';
    const R = rng(3);
    for (let i = 0; i < 40; i++) {
      const u = i / 40;
      const bx = lerp(-100, 1180, u), by = lerp(1150, 150, u) + (R() - 0.5) * 160;
      x.fillStyle = `rgba(${180 + R() * 60},${160 + R() * 50},255,${0.07 + R() * 0.06})`;
      x.beginPath(); x.ellipse(bx, by, 120 + R() * 80, 60 + R() * 40, -0.7, 0, TAU); x.fill();
    }
    x.restore();
    // static star field
    for (let i = 0; i < 320; i++) {
      const sx = R() * W, sy = R() * H * 0.85;
      const r = R() < 0.9 ? 0.8 + R() * 1.4 : 2 + R() * 1.5;
      x.fillStyle = `rgba(255,${235 + R() * 20},${210 + R() * 45},${0.35 + R() * 0.55})`;
      x.beginPath(); x.arc(sx, sy, r, 0, TAU); x.fill();
    }
    // distant hills with cosy windows
    const hill = (y0, amp, col, seed) => {
      x.beginPath(); x.moveTo(0, H);
      for (let px = 0; px <= W; px += 15) x.lineTo(px, y0 + Math.sin(px * 0.007 + seed) * amp + Math.sin(px * 0.019 + seed) * amp * 0.3);
      x.lineTo(W, H); x.closePath(); x.fillStyle = col; x.fill();
    };
    hill(1700, 40, '#5C3F8C', 1);
    hill(1760, 30, '#4A3279', 2.5);
    for (let i = 0; i < 9; i++) {
      const hx = 80 + i * 115 + R() * 40, hy = 1760 + Math.sin(hx * 0.019 + 2.5) * 9 + Math.sin(hx * 0.007 + 2.5) * 30;
      x.fillStyle = '#3B2766'; x.fillRect(hx - 14, hy - 18, 28, 22);
      x.beginPath(); x.moveTo(hx - 18, hy - 16); x.lineTo(hx, hy - 32); x.lineTo(hx + 18, hy - 16); x.fill();
      x.fillStyle = '#FFD98A'; x.fillRect(hx - 5, hy - 11, 9, 8);
      const gg = x.createRadialGradient(hx, hy - 7, 0, hx, hy - 7, 30); gg.addColorStop(0, 'rgba(255,210,130,0.35)'); gg.addColorStop(1, 'rgba(255,210,130,0)');
      x.fillStyle = gg; x.fillRect(hx - 30, hy - 37, 60, 60);
    }
  }
  // cloud sprites (night palette)
  C.cloud = (seed, w, tint) => {
    const R = rng(seed), h = w * 0.42;
    const c = L.makeCanvas(w + 60, h + 60), x = c.getContext('2d');
    x.translate(30, 30);
    x.beginPath();
    const n = 6;
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1);
      const px = w * 0.14 + u * w * 0.72, py = h * 0.66 - Math.sin(u * Math.PI) * h * 0.32, r = h * (0.24 + Math.sin(u * Math.PI) * 0.2 + R() * 0.06);
      x.moveTo(px + r, py); x.arc(px, py, r, 0, TAU);
    }
    x.rect(w * 0.12, h * 0.6, w * 0.76, h * 0.3);
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, tint[0]); g.addColorStop(1, tint[1]);
    x.fillStyle = g; x.fill();
    return c;
  };
  C.hideCloud = C.cloud(5, 230, ['#E9E2FF', '#A595E0']);
  C.glowCloud = C.cloud(9, 300, ['#FFE9F4', '#C9A0E0']);
  C.farClouds = [C.cloud(11, 420, ['#B7A3E6', '#7A62B8']), C.cloud(12, 360, ['#C8A6E0', '#8A68B8']), C.cloud(13, 480, ['#E2A9CC', '#A776B8'])];
  // cloud sea at the bottom
  C.sea = L.makeCanvas(W + 200, 420);
  {
    const x = C.sea.getContext('2d');
    const R = rng(44);
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 9; i++) {
        const px = i * 150 + R() * 60 + (row % 2) * 70, py = 120 + row * 95 + R() * 30, r = 90 + R() * 50;
        const g = x.createLinearGradient(0, py - r, 0, py + r);
        g.addColorStop(0, ['#E8D0F2', '#D7B9EC', '#C6A3E2'][row]); g.addColorStop(1, ['#B892D6', '#A27CC9', '#8E68B9'][row]);
        x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
      }
    }
  }
  return C;
}

function drawMoon(ctx, t) {
  const { x, y, r } = MOON;
  const phase3 = t >= 65 && t < 92;
  const yawn = t > 65 && t < 66.6;
  const talk = (t > 70 && t < 74.6);
  glow(ctx, x, y, r * 3.2, '#FFF1C9', 0.45);
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, '#FFFBEA'); g.addColorStop(0.7, '#FBE9B5'); g.addColorStop(1, '#EBCB86');
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  [[0.35, -0.35, 0.18], [-0.4, 0.4, 0.13], [0.45, 0.35, 0.1], [-0.1, -0.55, 0.08]].forEach(([dx, dy, rr]) => {
    ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, rr * r, 0, TAU); ctx.fillStyle = 'rgba(214,180,110,0.35)'; ctx.fill();
  });
  ctx.restore();
  // face
  const lookX = phase3 ? (t < 75 ? 0.7 : 0.15) : 0, lookY = phase3 && t >= 75 ? 0.6 : 0;
  ctx.strokeStyle = '#7A5A35'; ctx.fillStyle = '#7A5A35'; ctx.lineCap = 'round'; ctx.lineWidth = 6;
  const awake = phase3 || (t > 90 && t < 93);
  for (const s of [-1, 1]) {
    const ex = x + s * r * 0.3 + lookX * 8, ey = y - r * 0.05 + lookY * 6;
    if (!awake) { ctx.beginPath(); ctx.moveTo(ex - 14, ey); ctx.quadraticCurveTo(ex, ey + 10, ex + 14, ey); ctx.stroke(); }
    else {
      const bl = F.blinkAt(t, 2.2);
      ctx.beginPath(); ctx.ellipse(ex, ey, 9, 12 * (1 - bl * 0.9), 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - 3, ey - 4, 3.2, 0, TAU); ctx.fill(); ctx.fillStyle = '#7A5A35';
    }
  }
  glow(ctx, x - r * 0.48, y + r * 0.22, 26, '#FF9AA8', 0.5, 'source-over');
  glow(ctx, x + r * 0.48, y + r * 0.22, 26, '#FF9AA8', 0.5, 'source-over');
  if (yawn) {
    const m = Math.sin(clamp((t - 65) / 1.6) * Math.PI);
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.32, 12 + 6 * m, 6 + 20 * m, 0, 0, TAU); ctx.fillStyle = '#9A4B4B'; ctx.fill();
  } else if (talk) {
    const m = 0.5 + 0.5 * Math.abs(Math.sin(t * 9));
    ctx.beginPath(); ctx.ellipse(x + lookX * 6, y + r * 0.3, 8, 6 + m * 6, 0, 0, TAU); ctx.fillStyle = '#9A4B4B'; ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(x - 16, y + r * 0.26); ctx.quadraticCurveTo(x, y + r * 0.42, x + 16, y + r * 0.26); ctx.stroke();
  }
  ctx.restore();
  // whisper bubble with a secret sparkle
  if (t > 70 && t < 75.2) {
    const a = clamp((t - 70) / 0.4) * clamp((75.2 - t) / 0.6);
    const bx = x + r * 0.95, by = y - r * 0.95;
    ctx.save(); ctx.globalAlpha = a;
    ctx.translate(bx, by); const sc = ease.outBack(clamp((t - 70) / 0.5)); ctx.scale(sc, sc);
    L.roundRect(ctx, -58, -40, 116, 72, 36); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-30, 26); ctx.lineTo(-52, 52); ctx.lineTo(-6, 30); ctx.fill();
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-26 + i * 26, -4 + Math.sin(t * 6 + i) * 3, 7, 0, TAU); ctx.fillStyle = '#8C7BF0'; ctx.fill(); }
    ctx.restore();
  }
  // moonbeam pointing to the glowing cloud
  if (t > 75 && t < 91) {
    const a = clamp((t - 75) / 1.2) * clamp((91 - t) / 0.8);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath(); ctx.moveTo(x + 30, y + r * 0.8); ctx.lineTo(HIDE[2].x - 140, HIDE[2].y + 10); ctx.lineTo(HIDE[2].x + 160, HIDE[2].y + 10); ctx.lineTo(x + 70, y + r * 0.7); ctx.closePath();
    const bg = ctx.createLinearGradient(0, y, 0, HIDE[2].y);
    bg.addColorStop(0, `rgba(255,240,200,${0.22 * a})`); bg.addColorStop(1, `rgba(255,240,200,${0.04 * a})`);
    ctx.fillStyle = bg; ctx.fill();
    ctx.restore();
  }
}

// ---------- choreography ----------
const CAM = [
  { t: 0, x: 540, y: 960, z: 1.0 },
  { t: 2.4, x: 560, y: 900, z: 1.05 },
  { t: 5.4, x: 760, y: 640, z: 1.6 },
  { t: 31.0, x: 740, y: 640, z: 1.6 },
  { t: 35.6, x: 300, y: 620, z: 1.7 },
  { t: 61.3, x: 300, y: 640, z: 1.7 },
  { t: 64.4, x: 360, y: 1280, z: 1.5 },
  { t: 91.0, x: 360, y: 1280, z: 1.5 },
  { t: 94.2, x: 612, y: 800, z: 1.6 },
  { t: 120.0, x: 612, y: 800, z: 1.6 },
  { t: 121.3, x: 540, y: 1000, z: 1.0 },
];

// sparkling trail of phase 2: from star 1 to the nebula
function trailPoint(u) {
  const a = { x: SLOT[0].x - 30, y: SLOT[0].y - 40 }, b = HIDE[1];
  return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) - Math.sin(u * Math.PI) * 130 + Math.sin(u * TAU * 1.5) * 30 };
}
const trailU = (t) => ease.sine(clamp((t - 30.8) / 4.2));   // the trail draws itself in ~4 s

const LUMI_PATH = [
  { t: 0, x: -150, y: 1500 },
  { t: 3.6, x: 610, y: 860, via: { x: 160, y: 900 }, e: ease.out },
  { t: 31.2, x: 610, y: 860 },
];
function lumiPos(t) {
  if (t <= 31.2) return L.pathAt(LUMI_PATH, t);
  if (t < 60.4) { // follow the head of the trail
    const h = trailPoint(trailU(t));
    const settle = clamp((t - 31.2) / 2.2);
    const target = { x: h.x + 165, y: h.y + 150 };
    const start = { x: 610, y: 860 };
    const e = ease.inOut(settle);
    return { x: lerp(start.x, target.x, e), y: lerp(start.y, target.y, e) };
  }
  const end2 = { x: trailPoint(1).x + 165, y: trailPoint(1).y + 150 };
  const P = [
    { t: 60.4, x: end2.x, y: end2.y },
    { t: 61.4, x: end2.x, y: end2.y },
    { t: 64.4, x: 470, y: 1250, via: { x: 520, y: 900 } },
    { t: 91.3, x: 470, y: 1250 },
    { t: 94.3, x: 830, y: 1160, via: { x: 700, y: 1000 } },
    { t: 120.15, x: 830, y: 1160 },
    { t: 121.0, x: 1260, y: 760, via: { x: 1000, y: 900 } },
  ];
  return L.pathAt(P, t);
}

function lumiState(t) {
  const p = lumiPos(t);
  const k = Math.min(3, Math.floor(t / 30)), tp = t - k * 30;
  let facing = 1;
  if (t > 31.2 && t < 61.4) facing = -1;
  if (t >= 61.4 && t < 94.3) facing = -1;
  if (t >= 94.3) facing = -1;
  let expr = 'smile', arms = { l: 'down', r: 'hold' }, look = { x: 1, y: 0 }, tilt = 0;
  const flying = t < 3.6 || (t > 61.4 && t < 64.4) || (t > 91.3 && t < 94.3) || t > 120.1;
  if (flying) { expr = 'open'; tilt = facing * 0.12; arms = { l: 'reach', r: 'hold' }; }
  if (k > 0 && tp < 1.6) { expr = 'joy'; arms = { l: 'up', r: 'up' }; }
  else if (!flying) {
    if (tp > 4 && tp < 6.4) { arms.r = 'point'; expr = 'open'; }
    else if (tp > 9 && tp < 11.4) { arms.l = 'wave'; look = { x: 0, y: 0.2 }; }
    else if (tp > 15 && tp < 17.2) { arms = { l: 'up', r: 'up' }; expr = 'open'; look = { x: 0, y: 0 }; }
    else if (tp > 21 && tp < 23.5) { arms.r = 'point'; }
    else if (tp > 26.6) { expr = 'wow'; arms.r = 'point'; }
  }
  if (k === 2 && tp > 10 && tp < 14.8) { look = { x: 1, y: 0 }; expr = 'wow'; } // listening to the moon's secret
  const sb = tp % 5;
  if (!flying && tp > 4.9 && sb < 0.9 && !(k > 0 && tp < 1.6)) { expr = 'joy'; arms = { l: 'wave', r: 'up' }; }
  if (t >= BRUSH) { expr = 'joy'; arms = { l: 'up', r: 'up' }; }
  if (look.x !== 0) {
    const tgt = k === 2 ? (tp < 15 ? MOON : HIDE[2]) : k === 1 ? trailPoint(trailU(t)) : k === 3 ? SLOT[3] : HIDE[0];
    look = { x: (tgt.x > p.x ? 1 : -1) * facing * 0.9, y: tgt.y > p.y + 40 ? 0.7 : tgt.y < p.y - 80 ? -0.5 : 0 };
  }
  return { x: p.x, y: p.y, s: 0.8, t, facing, expr, arms, look, tilt, itemGlow: 1 };
}

// a found star flies from its hiding spot to its slot
function starPos(i, t) {
  const t0 = FOUND[i];
  const u = clamp((t - t0 - 0.25) / 1.4);
  const a = HIDE[i], b = SLOT[i];
  const e = ease.inOut(u);
  const lift = i === 3 ? 0 : Math.sin(e * Math.PI) * (i === 2 ? 160 : 90);
  return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e) - lift, u };
}

const BRUSH_PATH = [
  { t: 3.4, x: 1200, y: 900 },
  { t: 5.2, x: HIDE[0].x - 90, y: HIDE[0].y + 120, e: ease.out },
  { t: 30.4, x: HIDE[0].x - 90, y: HIDE[0].y + 120 },
];
function brushPos(t) {
  if (t < 30.4) return L.pathAt(BRUSH_PATH, t);
  if (t < 31.4) { const a = L.pathAt(BRUSH_PATH, 30.4), h = trailPoint(0); const u = ease.inOut(clamp((t - 30.4) / 1)); return { x: lerp(a.x, h.x - 40, u), y: lerp(a.y, h.y + 40, u) }; }
  if (t < 60.6) { const h = trailPoint(trailU(t)); const u = clamp((t - 33) / 2); return { x: h.x + lerp(-40, 92, u), y: h.y + lerp(40, 104, u) }; }
  const P = [
    { t: 60.6, x: trailPoint(1).x + 92, y: trailPoint(1).y + 104 },
    { t: 64.6, x: HIDE[2].x + 150, y: HIDE[2].y + 20, via: { x: 120, y: 1100 } },
    { t: 90.4, x: HIDE[2].x + 150, y: HIDE[2].y + 20 },
    { t: 93.0, x: SLOT[3].x + 110, y: SLOT[3].y + 70, via: { x: 560, y: 1300 } },
    { t: 120.0, x: SLOT[3].x + 110, y: SLOT[3].y + 70 },
    { t: 121.0, x: 1250, y: 700 },
  ];
  return L.pathAt(P, t);
}

function drawMagicBrush(ctx, t) {
  if (t < 3.4 || t > 121) return;
  const p = brushPos(t);
  const k = Math.min(3, Math.floor(t / 30)), tp = t - k * 30;
  const painting = k === 1 && t > 31.4 && t < 35;
  const settled = painting || !(t < 5.2 || (tp < 3 && k > 0) || t > 120);
  const scrub = settled ? Math.sin(t * TAU * 2.2) * 14 : 0;
  const tgt = k === 0 ? HIDE[0] : k === 2 ? HIDE[2] : k === 3 ? SLOT[3] : trailPoint(trailU(t));
  const faceLeft = p.x > tgt.x;
  if (settled && !painting) {
    for (let i = 0; i < 10; i++) {
      const life = (t * 0.9 + i / 10) % 1;
      const x = lerp(p.x, tgt.x, life) + Math.sin(life * 9 + i) * 14;
      const y = lerp(p.y - 20, tgt.y, life) - Math.sin(life * Math.PI) * 30;
      sparkle(ctx, x, y, 7 * Math.sin(life * Math.PI), i, '#FFE7A0', 0.9 * Math.sin(life * Math.PI));
    }
  }
  ctx.save();
  ctx.translate(p.x + scrub, p.y);
  ctx.scale(faceLeft ? -1 : 1, 1);
  ctx.rotate(-0.4);
  F.drawToothbrush(ctx, 0, 0, 0.95, 0, '#8C7BF0', t);
  ctx.restore();
}


// ---------- missions that open while you brush ----------
// 1 · the little cloud parts, one puff every 5 s
const PUFFS = [
  { dx: -24, dy: -50, r: 46, a: -2.2, step: 0 }, { dx: 40, dy: -42, r: 44, a: -0.8, step: 1 },
  { dx: -64, dy: 10, r: 50, a: Math.PI, step: 2 }, { dx: 60, dy: 20, r: 48, a: 0.1, step: 3 },
  { dx: 0, dy: 14, r: 42, a: -1.6, step: 4 }, { dx: -34, dy: 54, r: 46, a: 2.3, step: 5 }, { dx: 32, dy: 58, r: 42, a: 0.9, step: 5 },
];
function drawCloudPuffs(ctx, t) {
  const S = { x: HIDE[0].x + 20, y: HIDE[0].y - 20 };
  const lv = PR.level(t, 0.9, ease.out);
  if (t < 30) {
    glow(ctx, S.x, S.y, 80 + lv * 30, '#FFE7A0', 0.25 + 0.13 * lv);
    F.drawStarFace(ctx, S.x, S.y + Math.sin(t * 2) * 4, 42, { rot: Math.sin(t) * 0.2, sleepy: lv < 3.5, glow: 0.3 + lv * 0.14, alpha: 0.45 + 0.11 * lv });
  }
  for (const p of PUFFS) {
    const leave = p.step < 5 ? PR.jump(t, p.step, 1.3, ease.out) : ease.out(clamp((t - 30) / 1.3));
    if (leave >= 1) continue;
    const an = p.step < 5 ? PR.antic(t, p.step) : clamp((t - 28.4) / 1.6);
    const wob = Math.sin(t * 1.3 + p.dx) * 4 + Math.sin(t * 34 + p.dy) * 3 * an;
    const x = S.x + p.dx + Math.cos(p.a) * 150 * leave + wob, y = S.y + p.dy + Math.sin(p.a) * 150 * leave;
    const r = p.r * (1 + 0.35 * leave);
    ctx.save(); ctx.globalAlpha = 1 - leave;
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, '#F7F3FF'); g.addColorStop(0.7, '#D9D0F7'); g.addColorStop(1, '#A898E0');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.arc(x + r * 0.55, y + r * 0.2, r * 0.6, 0, TAU); ctx.arc(x - r * 0.55, y + r * 0.25, r * 0.55, 0, TAU); ctx.fill();
    ctx.restore();
    if (leave > 0 && leave < 0.7) for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + Math.sin(k * 2 + t) * r, y + Math.cos(k * 3) * r * 0.6 - leave * 40, 4 + k % 3 * 2, 0, TAU); ctx.fillStyle = `rgba(220,240,255,${0.8 * (1 - leave / 0.7)})`; ctx.fill(); }
  }
}

// 2 · the second star is frozen in an ice crystal; one crack every 5 s
const CRYSTAL = { rx: 66, ry: 82 };
const CRACKS = [0, 1, 2, 3, 4].map((i) => {
  const a = -Math.PI / 2 + (i * TAU) / 5 + 0.3;
  return PR.crack(400 + i * 13, Math.cos(a) * 58, Math.sin(a) * 70, a + Math.PI, 58, 2);
});
function crystalPath(ctx, x, y, s = 1) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i * TAU) / 6; const px = x + Math.cos(a) * CRYSTAL.rx * s, py = y + Math.sin(a) * CRYSTAL.ry * s; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath();
}
function drawCrystal(ctx, t) {
  const c = HIDE[1];
  const tp = t - 30;
  const appear = ease.outBack(clamp((t - 33.2) / 0.8));
  if (appear <= 0) return;
  const lv = PR.level(tp, 0.6, ease.out);
  const shatter = clamp((t - 60) / 1.2);
  let shake = 0; for (let i = 0; i < 5; i++) shake = Math.max(shake, PR.antic(tp, i));
  shake = Math.max(shake, clamp((tp - 28.4) / 1.6));
  const x = c.x + Math.sin(t * 40) * 2.5 * shake * (t < 60 ? 1 : 0), y = c.y + Math.sin(t * 1.4) * 5;
  glow(ctx, x, y, (90 + lv * 26) * appear, '#FFE7A0', 0.2 + 0.12 * lv);
  if (t < 60) F.drawStarFace(ctx, x, y, 32 * appear, { sleepy: lv < 3.5, glow: 0.3 + lv * 0.14, alpha: 0.55 + 0.09 * lv });
  if (shatter <= 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(appear, appear); ctx.translate(-x, -y);
    crystalPath(ctx, x, y);
    const g = ctx.createLinearGradient(x - 60, y - 80, x + 60, y + 80);
    g.addColorStop(0, 'rgba(225,245,255,0.62)'); g.addColorStop(0.5, 'rgba(170,215,255,0.38)'); g.addColorStop(1, 'rgba(150,170,255,0.55)');
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(235,250,255,0.95)'; ctx.stroke();
    // facets
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i * TAU) / 6; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * CRYSTAL.rx, y + Math.sin(a) * CRYSTAL.ry); ctx.lineTo(x + Math.cos(a) * 28, y + Math.sin(a) * 34); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(x - 26, y - 40, 9, 22, 0.5, 0, TAU); ctx.fill();
    // cracks grow at every step
    ctx.save(); ctx.translate(x, y);
    CRACKS.forEach((lines, i) => {
      const u = PR.jump(tp, i, 0.5, ease.out);
      if (u <= 0) return;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(90,120,190,0.5)'; PR.strokePartial(ctx, lines, u);
      ctx.lineWidth = 2.2; ctx.strokeStyle = 'rgba(255,255,255,0.95)'; PR.strokePartial(ctx, lines, u);
      const fresh = tp - (i + 1) * 5;
      if (fresh >= 0 && fresh < 0.8) {
        const p0 = lines[lines.length - 1][0];
        for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU; sparkle(ctx, p0.x + Math.cos(a) * (8 + fresh * 70), p0.y + Math.sin(a) * (8 + fresh * 70), 8 * (1 - fresh / 0.8), a, '#CFF3FF', 1 - fresh / 0.8); }
      }
    });
    ctx.restore();
    ctx.restore();
  } else {
    // shatter: six shards fly away
    for (let i = 0; i < 6; i++) {
      const a0 = -Math.PI / 2 + (i * TAU) / 6, a1 = a0 + TAU / 6, am = (a0 + a1) / 2;
      const d = ease.out(shatter) * 160;
      ctx.save(); ctx.globalAlpha = 1 - shatter;
      ctx.translate(x + Math.cos(am) * d, y + Math.sin(am) * d); ctx.rotate(shatter * (i % 2 ? 2 : -2));
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a0) * CRYSTAL.rx, Math.sin(a0) * CRYSTAL.ry); ctx.lineTo(Math.cos(a1) * CRYSTAL.rx, Math.sin(a1) * CRYSTAL.ry); ctx.closePath();
      ctx.fillStyle = 'rgba(200,235,255,0.6)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(240,252,255,0.95)'; ctx.stroke();
      ctx.restore();
    }
  }
}

// 3 · a cloud-flower under the moon opens one petal every 5 s
const PETALS = [{ a: -2.45, step: 0 }, { a: -0.7, step: 1 }, { a: -2.0, step: 2 }, { a: -1.15, step: 3 }, { a: -1.57, step: 4 }];
function drawCloudFlower(ctx, t) {
  const h = HIDE[2];
  const tp = t - 60;
  const lv = t < 60 ? 0 : PR.level(tp, 1.0, ease.outBack);
  const free = t >= 90;
  const after = t > 90 ? clamp(1 - (t - 92) / 2) : 1;
  const base = { x: h.x, y: h.y + 46 };
  glow(ctx, h.x, h.y - 10, 120 + lv * 34, '#FFE7A0', (0.15 + 0.14 * lv) * after);
  if (t < 90) F.drawStarFace(ctx, h.x, h.y - 40 + Math.sin(t * 2) * 4, 40, { sleepy: lv < 3.5, glow: 0.3 + lv * 0.14, alpha: 0.45 + 0.11 * lv });
  ctx.save(); ctx.globalAlpha = Math.max(0.4, after);
  // cloud cushion
  const g0 = ctx.createLinearGradient(0, base.y - 30, 0, base.y + 40); g0.addColorStop(0, '#FFE9F4'); g0.addColorStop(1, '#C9A0E0');
  ctx.fillStyle = g0;
  ctx.beginPath(); ctx.ellipse(base.x, base.y + 16, 190, 48, 0, 0, TAU); ctx.arc(base.x - 115, base.y, 56, 0, TAU); ctx.arc(base.x + 115, base.y, 56, 0, TAU); ctx.arc(base.x, base.y - 4, 62, 0, TAU); ctx.fill();
  let shake = 0; for (let i = 0; i < 5; i++) shake = Math.max(shake, PR.antic(tp, i));
  for (const p of PETALS) {
    const open = free ? 1 : (t < 60 ? 0 : PR.jump(tp, p.step, 1.0, ease.outBack));
    const closedA = -Math.PI / 2 + (p.a + Math.PI / 2) * 0.28;
    const openA = p.a + (p.a < -1.57 ? -0.55 : p.a > -1.57 ? 0.55 : 0);
    let a = lerp(closedA, openA, open) + Math.sin(t * 36 + p.a * 5) * 0.03 * shake;
    const len = lerp(112, 96, open);
    const dropC = p.step === 4 ? open : 0; // the middle petal folds down
    if (p.step === 4) a = -Math.PI / 2;
    ctx.save(); ctx.translate(base.x, base.y - 10); ctx.rotate(a + Math.PI / 2);
    if (p.step === 4) { const sh = 1 - 0.75 * open; ctx.scale(sh, sh); }
    ctx.globalAlpha = Math.max(0.4, after) * (1 - 0.85 * dropC);
    const g = ctx.createLinearGradient(0, 0, 0, -len * 1.3); g.addColorStop(0, '#D9A6EC'); g.addColorStop(0.6, '#F6D8F2'); g.addColorStop(1, '#FFF4FB');
    ctx.beginPath(); ctx.ellipse(0, -len * 0.62, 48, len * 0.66, 0, 0, TAU); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 3.5; ctx.strokeStyle = '#B57ACB'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -len * 0.15); ctx.quadraticCurveTo(6, -len * 0.6, 0, -len * 1.1); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(181,122,203,0.5)'; ctx.stroke();
    ctx.restore();
    const fresh = tp - (p.step + 1) * 5;
    if (fresh >= 0 && fresh < 0.8 && t < 90) { const tipx = base.x + Math.cos(a) * len * 1.1, tipy = base.y - 10 + Math.sin(a) * len * 1.1; for (let k = 0; k < 6; k++) { const aa = (k / 6) * TAU; sparkle(ctx, tipx + Math.cos(aa) * (8 + fresh * 50), tipy + Math.sin(aa) * (8 + fresh * 50), 7 * (1 - fresh / 0.8), aa, '#FFE7A0', 1 - fresh / 0.8); } }
  }
  ctx.restore();
}

// 4 · the last star is built point by point; a firefly brings one every 5 s
const PIECE_FROM = [0, 1, 2, 3, 4].map((i) => { const a = -2.6 + i * 1.25 + L.hash(i) * 0.4; return { x: SLOT[3].x + Math.cos(a) * 340, y: SLOT[3].y + Math.sin(a) * 300 }; });
function starPoint(ctx, x, y, i, s = 1, alpha = 1) {
  const a = -Math.PI / 2 + (i * TAU) / 5;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(14, -13); ctx.lineTo(14, 13); ctx.closePath();
  ctx.lineJoin = 'round'; ctx.lineWidth = 9; ctx.strokeStyle = '#FFE68C'; ctx.stroke(); ctx.fillStyle = '#FFE68C'; ctx.fill();
  ctx.restore();
}
function drawStarPieces(ctx, t) {
  const S = SLOT[3];
  const tp = t - 90;
  const fadeOut = clamp(1 - (t - 120.05) / 0.3);
  if (fadeOut <= 0) return;
  // core
  const core = ease.outBack(clamp((t - 91) / 0.8));
  glow(ctx, S.x, S.y, (60 + PR.level(tp) * 20) * core, '#FFE7A0', 0.5 * core * fadeOut);
  ctx.save(); ctx.globalAlpha = fadeOut; ctx.beginPath(); ctx.arc(S.x, S.y, 17 * core, 0, TAU); ctx.fillStyle = '#FFE68C'; ctx.fill(); ctx.restore();
  for (let i = 0; i < 5; i++) {
    const arrive = 95 + i * 5;
    const u = clamp((t - (arrive - 3.6)) / 3.6);
    if (u <= 0) continue;
    const a = -Math.PI / 2 + (i * TAU) / 5;
    const dest = { x: S.x, y: S.y };
    if (u < 1) {
      const e = ease.inOut(u), f = PIECE_FROM[i];
      const x = lerp(f.x, dest.x, e) + Math.sin(u * 9 + i) * 26 * (1 - u), y = lerp(f.y, dest.y, e) - Math.sin(u * Math.PI) * 60;
      // firefly carrying the piece
      for (let j = 1; j < 8; j++) { const uu = clamp(u - j * 0.02); const ee = ease.inOut(uu); sparkle(ctx, lerp(f.x, dest.x, ee) + Math.sin(uu * 9 + i) * 26 * (1 - uu), lerp(f.y, dest.y, ee) - Math.sin(uu * Math.PI) * 60, 6 * (1 - j / 8), j, '#FFF3C4', 1 - j / 8); }
      glow(ctx, x, y, 50, '#FFF3C4', 0.8);
      starPoint(ctx, x, y, i, 0.7);
    } else {
      const pop = 1 + 0.4 * (1 - ease.out(clamp((t - arrive) / 0.4)));
      starPoint(ctx, dest.x, dest.y, i, pop, fadeOut);
      const fresh = t - arrive;
      if (fresh < 0.8) for (let k = 0; k < 7; k++) { const aa = (k / 7) * TAU; sparkle(ctx, dest.x + Math.cos(a) * 30 + Math.cos(aa) * (6 + fresh * 50), dest.y + Math.sin(a) * 30 + Math.sin(aa) * (6 + fresh * 50), 7 * (1 - fresh / 0.8), aa, '#FFE7A0', 1 - fresh / 0.8); }
    }
  }
}

function draw(ctx, t) {
  init();
  const cam = L.clampCam(L.camAt(CAM, t));
  const k = Math.min(3, Math.floor(t / 30)), tp = t - k * 30;
  // sky (slight parallax)
  ctx.save(); L.applyCam(ctx, cam, 0.15); ctx.drawImage(C.sky, 0, 0); ctx.restore();
  // twinkling stars
  ctx.save(); L.applyCam(ctx, cam, 0.3);
  const allBright = clamp((t - 120.3) / 0.8);
  for (let i = 0; i < 70; i++) {
    const x = hash(i * 3) * W, y = hash(i * 3 + 1) * H * 0.8;
    const tw = 0.5 + 0.5 * Math.sin(t * (1 + hash(i) * 2) + i);
    sparkle(ctx, x, y, (3 + hash(i + 7) * 5) * (0.6 + tw * 0.6) * (1 + allBright * 0.6), 0, '#FFF3D0', (0.35 + tw * 0.55) * (1 + allBright), false);
  }
  // shooting stars
  [7.5, 22.8, 46.5, 71.2, 99.4, 112.5, 120.4, 121.1].forEach((t0, i) => {
    const u = (t - t0) / 0.9;
    if (u < 0 || u > 1) return;
    const x0 = 200 + hash(i * 5) * 700, y0 = 150 + hash(i * 5 + 1) * 300;
    const x = x0 + u * 420, y = y0 + u * 200;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x - 160, y - 76, x, y); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(255,250,230,${0.9 * Math.sin(u * Math.PI)})`);
    ctx.strokeStyle = g; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 160, y - 76); ctx.lineTo(x, y); ctx.stroke();
    ctx.restore();
    glow(ctx, x, y, 30, '#FFFFFF', Math.sin(u * Math.PI));
  });
  ctx.restore();
  // far drifting clouds
  ctx.save(); L.applyCam(ctx, cam, 0.5);
  [[0, -100, 1240, 6], [1, 600, 1360, 4], [2, 200, 1460, 5]].forEach(([i, x0, y, v]) => {
    const x = ((x0 + t * v + 500) % (W + 900)) - 500;
    ctx.globalAlpha = 0.85; ctx.drawImage(C.farClouds[i], x, y);
  });
  ctx.restore();

  // ----- main layer -----
  ctx.save();
  L.applyCam(ctx, cam, 1);
  drawMoon(ctx, t);
  // constellation guide + lines (lines complete at 2:00)
  const lineU = clamp((t - 120.2) / 1.1);
  B.drawConstellation(ctx, CC.x, CC.y, CC.size, { lit: [0, 0, 0, 0], lines: lineU, guide: 0.32, slots: false });
  // empty slots pulse softly; the current one glows brighter
  SLOT.forEach((s, i) => {
    if (t >= FOUND[i] + 1.5) return;
    const cur = i === k && t < FOUND[i];
    const pulse = 0.5 + 0.5 * Math.sin(t * TAU * 0.8 + i);
    ctx.save();
    ctx.setLineDash([8, 10]); ctx.lineWidth = 4;
    ctx.strokeStyle = cur ? `rgba(255,231,160,${0.6 + 0.4 * pulse})` : 'rgba(210,200,255,0.4)';
    L.starPath(ctx, s.x, s.y, 46, 24); ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();
    if (cur) glow(ctx, s.x, s.y, 90, '#FFE7A0', 0.25 + 0.25 * pulse);
  });
  if (t > 90 && t < 121) drawStarPieces(ctx, t);
  if (t < 33) drawCloudPuffs(ctx, t);
  if (t > 30.5 && t < 63) {
    const head = trailU(t);
    const fade = t > 60 ? clamp(1 - (t - 60) / 3) : 1;
    const neb = HIDE[1];
    const nebA = clamp((t - 31) / 3) * fade;
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * TAU + t * 0.25;
      glow(ctx, neb.x + Math.cos(a) * 54, neb.y + Math.sin(a) * 34, 120, j % 2 ? '#FF9FD0' : '#B9A6FF', 0.22 * nebA);
    }
    const N = 60;
    for (let i = 0; i < N; i++) {
      const u = (i / N) * head;
      const p = trailPoint(u);
      const tw = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.3);
      sparkle(ctx, p.x + Math.sin(i * 2.7) * 8, p.y + Math.cos(i * 1.9) * 8, (4 + tw * 5), i, '#FFE7A0', (0.45 + 0.5 * tw) * fade);
    }
    if (head < 1) { const hp = trailPoint(head); glow(ctx, hp.x, hp.y, 70, '#FFF3C4', 0.8); sparkle(ctx, hp.x, hp.y, 18 + 4 * Math.sin(t * 8), t * 2, '#FFE7A0', 1); }
  }
  if (t > 30.5 && t < 61.5) drawCrystal(ctx, t);
  if (t > 55 && t < 94) drawCloudFlower(ctx, t);
  // found stars: fly home, then twinkle in their place
  for (let i = 0; i < 4; i++) {
    if (t < FOUND[i]) continue;
    const sp = starPos(i, t);
    const settled = sp.u >= 1;
    const burst = clamp(1 - (t - FOUND[i]) / 1.2);
    if (burst > 0) {
      const h = HIDE[i];
      glow(ctx, h.x, h.y, 260, '#FFE7A0', 0.9 * burst);
      for (let j = 0; j < 12; j++) { const a = (j / 12) * TAU; const r = 30 + (1 - burst) * 170; sparkle(ctx, h.x + Math.cos(a) * r, h.y + Math.sin(a) * r, 12 * burst, a, '#FFE7A0', burst); }
    }
    if (!settled) {
      for (let j = 1; j < 12; j++) { const q = starPos(i, t - j * 0.05); sparkle(ctx, q.x, q.y, 10 * (1 - j / 12), j, '#FFE7A0', 1 - j / 12); }
    }
    const tw = 1 + 0.06 * Math.sin(t * 3 + i * 2);
    const scale = i === 3 ? ease.outBack(clamp((t - 120) / 0.6)) : 1;
    const land = settled ? clamp(1 - (t - FOUND[i] - 1.65) / 0.5) : 0;
    if (settled && land > 0) glow(ctx, sp.x, sp.y, 160, '#FFFFFF', 0.6 * land);
    F.drawStarFace(ctx, sp.x, sp.y, 40, { scale: tw * scale * (1 + 0.25 * land), joy: !settled || i === 3 || land > 0, rot: settled ? Math.sin(t * 1.2 + i) * 0.08 : (t - FOUND[i]) * 4 });
  }
  // cloud sea in front
  ctx.drawImage(C.sea, -100 + Math.sin(t * 0.2) * 30, 1560);
  // brush and Lumi
  drawMagicBrush(ctx, t);
  const st = lumiState(t);
  for (let i = 1; i < 14; i++) {
    const q = lumiPos(t - i * 0.07);
    if (Math.hypot(q.x - st.x, q.y - st.y) < 4) continue;
    sparkle(ctx, q.x + Math.sin(i * 1.7) * 10, q.y - 30 + Math.cos(i * 2.3) * 10, 10 * (1 - i / 14), i, '#D9C8FF', 1 - i / 14);
  }
  if (t < 121.0) F.drawFairy(ctx, SP, st);
  // fireflies of light
  for (let i = 0; i < 20; i++) {
    const x = (hash(i + 3) * 1200 + t * (6 + hash(i) * 8)) % 1200 - 60;
    const y = 400 + hash(i + 9) * 1200 + Math.sin(t * 0.6 + i) * 40;
    glow(ctx, x, y, 12, '#FFF3C4', 0.3 + 0.3 * Math.sin(t * 1.5 + i * 2));
  }
  ctx.restore();
}

module.exports = { draw, init };
