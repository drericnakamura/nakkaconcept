// Fairy Passport badge system: one rosette layout for all seven fairies,
// with a per-fairy colourway and emblem. Used in the videos and exported as
// stand-alone artwork for the printed / digital passport.
'use strict';
const L = require('./lib');
const F = require('./fairy');
const { TAU, clamp, lerp, rgba, glow, sparkle } = L;

// Lumi's tooth-shaped constellation (unit coordinates, centre 0,0)
// slots follow the quadrant order: UR, UL, LL, LR
const CONSTELLATION = {
  slots: [{ x: 0.32, y: -0.3 }, { x: -0.32, y: -0.3 }, { x: -0.2, y: 0.42 }, { x: 0.2, y: 0.42 }],
  minor: [{ x: 0, y: -0.19 }, { x: 0.41, y: 0.03 }, { x: 0, y: 0.17 }, { x: -0.41, y: 0.03 }],
  // outline order: UL → top → UR → right → LR → crotch → LL → left → UL
  loop: [['s', 1], ['m', 0], ['s', 0], ['m', 1], ['s', 3], ['m', 2], ['s', 2], ['m', 3], ['s', 1]],
};

const BADGES = {
  bravi: {
    title: 'COURAGE BADGE', ring: 'BRAVI · COURAGE',
    band: '#FF6F61', bandDeep: '#C9434E', inner1: '#FFF3E3', inner2: '#FFC9A8', ribbon1: '#2EA59B', ribbon2: '#1B7671',
  },
  lumi: {
    title: 'STARLIGHT BADGE', ring: 'LUMI · LIGHT',
    band: '#6A55D8', bandDeep: '#3A2C8F', inner1: '#4B3FA0', inner2: '#1E1B4B', ribbon1: '#FFD77A', ribbon2: '#D9A43A',
  },
};

function drawConstellation(ctx, cx, cy, size, o = {}) {
  const lit = o.lit ?? [1, 1, 1, 1];          // per-slot brightness 0..1
  const lines = o.lines ?? 1;                  // outline drawn 0..1
  const P = (kind, i) => {
    const p = kind === 's' ? CONSTELLATION.slots[i] : CONSTELLATION.minor[i];
    return { x: cx + p.x * size, y: cy + p.y * size };
  };
  // faint guide
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (o.guide) {
    ctx.setLineDash([size * 0.012, size * 0.03]);
    ctx.lineWidth = size * 0.008; ctx.strokeStyle = `rgba(220,210,255,${o.guide})`;
    ctx.beginPath(); CONSTELLATION.loop.forEach(([k, i], j) => { const p = P(k, i); j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (lines > 0) {
    // progressive line drawing
    const segs = CONSTELLATION.loop.length - 1;
    const upto = lines * segs;
    ctx.beginPath();
    for (let j = 0; j < segs; j++) {
      if (j >= upto) break;
      const a = P(...CONSTELLATION.loop[j]), b = P(...CONSTELLATION.loop[j + 1]);
      const u = clamp(upto - j);
      ctx.moveTo(a.x, a.y); ctx.lineTo(lerp(a.x, b.x, u), lerp(a.y, b.y, u));
    }
    ctx.lineWidth = size * 0.03; ctx.strokeStyle = 'rgba(255,230,160,0.35)'; ctx.stroke();
    ctx.lineWidth = size * 0.011; ctx.strokeStyle = 'rgba(255,248,220,0.95)'; ctx.stroke();
  }
  ctx.restore();
  CONSTELLATION.minor.forEach((m, i) => {
    const p = P('m', i);
    sparkle(ctx, p.x, p.y, size * 0.028, 0, '#FFF3C4', 0.9, true);
  });
  if (o.slots !== false) {
    CONSTELLATION.slots.forEach((s, i) => {
      const p = P('s', i);
      if (lit[i] > 0) F.drawStarFace(ctx, p.x, p.y, size * 0.075, { scale: lit[i], glow: lit[i], face: o.faces ?? false, joy: true });
    });
  }
}

function drawBadge(ctx, id, cx, cy, R, o = {}) {
  const b = BADGES[id];
  const t = o.t ?? 0;
  ctx.save();
  ctx.translate(cx, cy);
  if (o.rot) ctx.rotate(o.rot);
  const s = o.scale ?? 1;
  ctx.scale(s, s);
  if (o.glow !== false) glow(ctx, 0, 0, R * 1.9, id === 'lumi' ? '#B9A6FF' : '#FFD27A', 0.6);
  // ribbons
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side, 1);
    ctx.beginPath();
    ctx.moveTo(R * 0.18, R * 0.55); ctx.lineTo(R * 0.62, R * 0.4);
    ctx.lineTo(R * 0.78, R * 1.42); ctx.lineTo(R * 0.58, R * 1.28); ctx.lineTo(R * 0.44, R * 1.5);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, R * 0.4, 0, R * 1.5); g.addColorStop(0, b.ribbon1); g.addColorStop(1, b.ribbon2);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = R * 0.018; ctx.strokeStyle = rgba('#2a1838', 0.35); ctx.stroke();
    ctx.restore();
  }
  // scalloped gold rosette
  const n = 26;
  ctx.beginPath();
  for (let i = 0; i <= n * 8; i++) {
    const a = (i / (n * 8)) * TAU;
    const r = R * (0.97 + 0.05 * Math.cos(a * n));
    i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  const gg = ctx.createLinearGradient(-R, -R, R, R);
  gg.addColorStop(0, '#FFF1B8'); gg.addColorStop(0.45, '#F6C24A'); gg.addColorStop(1, '#C9862B');
  ctx.fillStyle = gg; ctx.fill();
  ctx.lineWidth = R * 0.02; ctx.strokeStyle = '#9C5F1E'; ctx.stroke();
  // band
  ctx.beginPath(); ctx.arc(0, 0, R * 0.88, 0, TAU);
  const bg = ctx.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.1, 0, 0, R);
  bg.addColorStop(0, L.mixHex(b.band, '#ffffff', 0.2)); bg.addColorStop(1, b.bandDeep);
  ctx.fillStyle = bg; ctx.fill();
  ctx.lineWidth = R * 0.016; ctx.strokeStyle = '#FFE7A6'; ctx.stroke();
  // inner disc
  ctx.beginPath(); ctx.arc(0, 0, R * 0.64, 0, TAU);
  const ig = ctx.createRadialGradient(0, -R * 0.2, R * 0.05, 0, 0, R * 0.64);
  ig.addColorStop(0, b.inner1); ig.addColorStop(1, b.inner2);
  ctx.fillStyle = ig; ctx.fill();
  ctx.lineWidth = R * 0.03; ctx.strokeStyle = '#F6C24A'; ctx.stroke();
  // ring texts
  L.arcText(ctx, 'FAIRY PASSPORT', 0, 0, R * 0.76, -Math.PI / 2, { size: R * 0.105, weight: 700, color: '#FFF6E0', spacing: R * 0.012 });
  L.arcText(ctx, b.ring, 0, 0, R * 0.76, Math.PI / 2, { size: R * 0.1, weight: 700, color: '#FFF6E0', inward: true, spacing: R * 0.01 });
  for (const side of [-1, 1]) L.chubbyStar(ctx, side * R * 0.76, 0, R * 0.05, '#FFE08A', '#FFE08A', R * 0.015);
  // emblem
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, R * 0.62, 0, TAU); ctx.clip();
  if (id === 'bravi') {
    glow(ctx, 0, 0, R * 0.7, '#FFFFFF', 0.6);
    for (let i = 0; i < 12; i++) { // sunburst
      const a = (i / 12) * TAU + t * 0.2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R * 0.7, a, a + 0.14); ctx.closePath();
      ctx.fillStyle = 'rgba(255,200,140,0.25)'; ctx.fill();
    }
    F.drawShield(ctx, 0, R * 0.02, R * 0.56, R * 0.64, { ornate: true, glow: 0.3, shine: o.shine });
  } else {
    // night disc with tiny stars
    for (let i = 0; i < 26; i++) {
      const a = L.hash(i) * TAU, r = Math.sqrt(L.hash(i + 99)) * R * 0.6;
      ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * L.hash(i + 7)})`;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, R * 0.006 + R * 0.008 * L.hash(i + 3), 0, TAU); ctx.fill();
    }
    drawConstellation(ctx, 0, R * 0.02, R * 0.98, { lines: 1, faces: false });
  }
  ctx.restore();
  // gloss
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, R * 0.97, 0, TAU); ctx.clip();
  ctx.globalAlpha = 0.22; ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(-R * 0.35, -R * 0.55, R * 0.5, R * 0.2, -0.5, 0, TAU); ctx.fill();
  if (o.shine !== undefined && o.shine > -0.5 && o.shine < 1.5) {
    const sx = lerp(-R * 1.4, R * 1.4, o.shine);
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.moveTo(sx - R * 0.15, -R); ctx.lineTo(sx + R * 0.1, -R); ctx.lineTo(sx - R * 0.25, R); ctx.lineTo(sx - R * 0.5, R); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

module.exports = { drawBadge, drawConstellation, BADGES, CONSTELLATION };
