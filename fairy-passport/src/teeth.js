// Draft (for alignment): anatomical primary teeth for the HUD.
// - drawMouthFront: open mouth, 20 primary teeth (A–E per quadrant) with real
//   crown shapes, perspective along the arch and scalloped gums.
// - drawArchesTop: both arches seen from above (occlusal), odontogram style.
// - drawCoachProfile: one molar or incisor in side view with cheek/lip on the
//   outside and tongue/palate on the inside, brush at the right spot.
'use strict';
const L = require('./lib');
const F = require('./fairy');
const { TAU, clamp, lerp, rgba, glow, sparkle } = L;

const ENAMEL = { hi: '#FFFFFF', mid: '#F4F7FB', lo: '#DCE4EE', neck: '#F3E7D3', line: '#9FB0C4' };
const GUM = { fill: '#F39AB0', deep: '#E07A95', line: '#C9607E', papilla: '#F7B3C4' };

// ---------- crown outlines in labial view ----------
// local coords: cervical line at y=0, crown grows to +h. x<0 is mesial (toward the midline).
function crownPath(ctx, type, w, h, lower) {
  const hw = w / 2;
  ctx.beginPath();
  if (type === 'A' || type === 'B') {
    const rm = (type === 'A' ? 0.12 : 0.16) * w, rd = (type === 'A' ? 0.16 : 0.34) * w;
    ctx.moveTo(-hw * 0.78, 0);
    ctx.bezierCurveTo(-hw * 0.92, h * 0.12, -hw, h * 0.28, -hw, h * 0.48);
    ctx.lineTo(-hw, h - rm); ctx.quadraticCurveTo(-hw, h, -hw + rm, h);
    ctx.lineTo(hw - rd, h); ctx.quadraticCurveTo(hw, h, hw, h - rd);
    ctx.lineTo(hw, h * 0.48);
    ctx.bezierCurveTo(hw, h * 0.28, hw * 0.92, h * 0.12, hw * 0.78, 0);
  } else if (type === 'C') {
    ctx.moveTo(-hw * 0.74, 0);
    ctx.bezierCurveTo(-hw * 0.95, h * 0.15, -hw, h * 0.35, -hw * 0.98, h * 0.6);
    ctx.lineTo(-hw * 0.2, h * 0.94); ctx.quadraticCurveTo(hw * 0.06, h * 1.04, hw * 0.24, h * 0.92);
    ctx.lineTo(hw, h * 0.66);
    ctx.bezierCurveTo(hw, h * 0.4, hw * 0.95, h * 0.15, hw * 0.74, 0);
  } else {
    // molars: cervical bulge, then cusps along the occlusal outline
    const cusps = type === 'D' ? 2 : lower ? 3 : 2;
    ctx.moveTo(-hw * 0.8, 0);
    ctx.bezierCurveTo(-hw * 1.08, h * 0.12, -hw * 1.02, h * 0.4, -hw * 0.98, h * 0.7);
    for (let i = 0; i < cusps; i++) {
      const x0 = -hw * 0.98 + (i * 1.96 * hw) / cusps, x1 = x0 + (1.96 * hw) / cusps;
      ctx.bezierCurveTo(x0 + (x1 - x0) * 0.05, h * 1.02, x0 + (x1 - x0) * 0.8, h * 1.04, x1, h * (i === cusps - 1 ? 0.72 : 0.86));
    }
    ctx.bezierCurveTo(hw * 1.02, h * 0.4, hw * 1.06, h * 0.12, hw * 0.8, 0);
  }
  ctx.closePath();
}

function enamelFill(ctx, w, h, tint, tintAmt) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  const c = (hex) => (tint ? L.mixHex(hex, tint, tintAmt) : hex);
  g.addColorStop(0, c(ENAMEL.neck)); g.addColorStop(0.25, c(ENAMEL.mid)); g.addColorStop(0.8, c(ENAMEL.hi)); g.addColorStop(1, c('#E9F2FB'));
  return g;
}

// one tooth, labial view. (x, y) = centre of the cervical line. side = +1 right, −1 left.
function drawLabialTooth(ctx, x, y, type, upper, side, w, h, st = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(side * (st.squash ?? 1), upper ? 1 : -1);
  crownPath(ctx, type, w, h, !upper);
  ctx.fillStyle = enamelFill(ctx, w, h, st.tint, st.tintAmt ?? 0);
  ctx.fill();
  // labial highlight + soft lobes
  ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath(); ctx.ellipse(-w * 0.12, h * 0.48, w * 0.1, h * 0.26, 0.1, 0, TAU); ctx.fill();
  if (type === 'D' || type === 'E') { ctx.strokeStyle = 'rgba(150,170,195,0.45)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, h * 0.95); ctx.lineTo(0, h * 0.55); ctx.stroke(); }
  ctx.restore();
  crownPath(ctx, type, w, h, !upper);
  ctx.lineWidth = st.lineW ?? 2; ctx.strokeStyle = st.stroke ?? ENAMEL.line; ctx.stroke();
  ctx.restore();
}

// primary dentition layout for a front view of an open mouth (per side, from the midline)
const FRONT = {
  upper: [
    { t: 'A', x: 16, w: 31, h: 40, y: -68 }, { t: 'B', x: 42, w: 23, h: 35, y: -66 }, { t: 'C', x: 63, w: 21, h: 36, y: -61 },
    { t: 'D', x: 81, w: 22, h: 28, y: -55, sq: 0.9 }, { t: 'E', x: 97, w: 20, h: 25, y: -47, sq: 0.82 },
  ],
  lower: [
    { t: 'A', x: 11, w: 21, h: 31, y: 68 }, { t: 'B', x: 31, w: 19, h: 30, y: 66 }, { t: 'C', x: 50, w: 19, h: 32, y: 62 },
    { t: 'D', x: 70, w: 22, h: 26, y: 56, sq: 0.9 }, { t: 'E', x: 88, w: 21, h: 24, y: 48, sq: 0.82 },
  ],
};
const isBackType = (t) => t === 'D' || t === 'E';

function gumBand(ctx, cx, cy, teeth, upper, outerY) {
  // gum from the cavity edge down to a scalloped margin around every cervix
  const pts = [];
  for (const side of [-1, 1]) for (const tt of teeth) pts.push({ x: cx + side * tt.x, y: cy + tt.y, w: tt.w * (tt.sq ?? 1) });
  pts.sort((a, b) => a.x - b.x);
  const dir = upper ? 1 : -1;
  ctx.beginPath();
  ctx.moveTo(cx - 140, cy + outerY);
  ctx.lineTo(pts[0].x - pts[0].w * 0.6, pts[0].y + dir * 4);
  pts.forEach((p, i) => {
    // zenith of the margin over the tooth centre, papilla tip between teeth
    ctx.quadraticCurveTo(p.x, p.y - dir * 6, p.x + p.w * 0.5, p.y + dir * 3);
    const n = pts[i + 1];
    if (n) ctx.quadraticCurveTo((p.x + p.w * 0.5 + n.x - n.w * 0.5) / 2, (p.y + n.y) / 2 + dir * 9, n.x - n.w * 0.5, n.y + dir * 3);
  });
  ctx.lineTo(cx + 140, cy + outerY);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, cy + outerY, 0, cy + (upper ? -40 : 40));
  g.addColorStop(0, GUM.deep); g.addColorStop(1, GUM.papilla);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = GUM.line; ctx.stroke();
}

// st: { quad: {upper,right} | null, group: 'back'|'front'|'all', done: [quadrant objects], accent, accentDeep }
function drawMouthFront(ctx, cx, cy, st = {}) {
  ctx.save();
  // lips + cavity
  ctx.beginPath(); ctx.ellipse(cx, cy, 136, 106, 0, 0, TAU);
  const lg = ctx.createLinearGradient(0, cy - 100, 0, cy + 100); lg.addColorStop(0, '#F59AAA'); lg.addColorStop(1, '#E8798F');
  ctx.fillStyle = lg; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#C95A74'; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy, 120, 90, 0, 0, TAU);
  const cg = ctx.createRadialGradient(cx, cy + 10, 10, cx, cy, 120); cg.addColorStop(0, '#4E1631'); cg.addColorStop(1, '#7E2C4D');
  ctx.fillStyle = cg; ctx.fill();
  ctx.save(); ctx.clip();
  // uvula + soft palate shadow, tongue
  ctx.beginPath(); ctx.ellipse(cx, cy - 18, 9, 13, 0, 0, TAU); ctx.fillStyle = '#C5506F'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, cy + 40, 78, 40, 0, 0, TAU);
  const tg = ctx.createLinearGradient(0, cy + 10, 0, cy + 70); tg.addColorStop(0, '#F4A0AE'); tg.addColorStop(1, '#E27C90');
  ctx.fillStyle = tg; ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx, cy + 14); ctx.quadraticCurveTo(cx + 2, cy + 36, cx, cy + 58); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(180,80,100,0.5)'; ctx.stroke();
  // teeth
  for (const arch of ['upper', 'lower']) {
    const upper = arch === 'upper';
    const list = FRONT[arch];
    // back to front so the incisors overlap the molars
    for (let i = list.length - 1; i >= 0; i--) {
      const tt = list[i];
      for (const side of [-1, 1]) {
        const inQuad = st.quad && st.quad.upper === upper && st.quad.right === (side > 0);
        const inGroup = inQuad && (st.group === 'all' || (st.group === 'back') === isBackType(tt.t));
        const doneQ = (st.done || []).some((q) => q.upper === upper && q.right === (side > 0));
        const tint = inGroup ? (st.accent2 || '#FFC94D') : null;
        if (inGroup) glow(ctx, cx + side * tt.x, cy + tt.y + (upper ? 1 : -1) * tt.h * 0.5, tt.w * 1.6, st.accent2 || '#FFC94D', 0.55, 'source-over');
        drawLabialTooth(ctx, cx + side * tt.x, cy + tt.y, tt.t, upper, side, tt.w, tt.h, {
          squash: tt.sq, tint: tint || (doneQ ? null : null), tintAmt: inGroup ? 0.5 : 0,
          stroke: inGroup ? (st.accentDeep || '#D94F3C') : undefined, lineW: inGroup ? 3 : 2,
        });
        if (doneQ) sparkle(ctx, cx + side * tt.x + 4, cy + tt.y + (upper ? 1 : -1) * tt.h * 0.55, 4, 0, '#BFF3FF', 0.9, false);
      }
    }
    gumBand(ctx, cx, cy, list, upper, upper ? -95 : 95);
  }
  ctx.restore();
  ctx.restore();
}

// ---------- occlusal view (odontogram style) ----------
function occlusalShape(ctx, type, s, lower) {
  ctx.beginPath();
  if (type === 'A' || type === 'B') { L.roundRect(ctx, -s * 0.5, -s * 0.2, s, s * 0.4, s * 0.18); return 'edge'; }
  if (type === 'C') { ctx.moveTo(0, -s * 0.42); ctx.quadraticCurveTo(s * 0.45, -s * 0.1, s * 0.3, s * 0.28); ctx.quadraticCurveTo(0, s * 0.45, -s * 0.3, s * 0.28); ctx.quadraticCurveTo(-s * 0.45, -s * 0.1, 0, -s * 0.42); ctx.closePath(); return 'cusp'; }
  L.roundRect(ctx, -s * 0.5, -s * 0.46, s, s * 0.92, s * 0.3); return 'molar';
}
function archTeeth(cx, cy, upper, k = 1) {
  const types = ['A', 'B', 'C', 'D', 'E'], sizes = [21, 18, 19, 27, 31].map((v) => v * k);
  const RX = 108 * k, RY = 80 * k;
  const apexY = upper ? cy - 124 * k : cy + 124 * k, centreY = upper ? apexY + RY : apexY - RY;
  const out = [];
  for (const side of [-1, 1]) {
    let d = 3 * k;
    types.forEach((ty, i) => {
      d += sizes[i] / 2 + 2 * k;
      const a = d / ((RX + RY) / 2);
      const x = cx + side * RX * Math.sin(a), y = centreY + (upper ? -1 : 1) * RY * Math.cos(a);
      const rot = Math.atan2(y - centreY, x - cx) - Math.PI / 2;      // local +y = outward (cheek / lip side)
      out.push({ ty, s: sizes[i], side, x, y, rot, centreY, upper, nx: Math.cos(rot + Math.PI / 2), ny: Math.sin(rot + Math.PI / 2) });
      d += sizes[i] / 2 + 2 * k;
    });
  }
  return out;
}

// st: { quad:{upper,right}, group:'back'|'front'|'all', surf:'outside'|'inside'|'top'|'all',
//       hl: highlight colour, hlDeep: darker shade, spot: dim the rest, t, brush: brush colour }
function drawArchesTop(ctx, cx, cy, st = {}) {
  const k = st.k ?? 1;
  const hl = st.hl || '#19C2C9', hlDeep = st.hlDeep || '#0B7F86';
  const active = [];
  for (const upper of [true, false]) {
    const teeth = archTeeth(cx, cy, upper, k);
    const cY = teeth[0].centreY;
    // palate (upper) or tongue (lower) inside the horseshoe
    ctx.beginPath(); ctx.ellipse(cx, cY + (upper ? -6 : 6) * k, 66 * k, 46 * k, 0, 0, TAU); ctx.fillStyle = upper ? '#F7C3CE' : '#F29AAA'; ctx.fill();
    if (upper) { ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(200,110,140,0.4)'; for (let j = -2; j <= 2; j++) { ctx.beginPath(); ctx.moveTo(cx + j * 13 * k - 12 * k, cY - (20 - Math.abs(j) * 5) * k); ctx.quadraticCurveTo(cx + j * 13 * k, cY - (28 - Math.abs(j) * 5) * k, cx + j * 13 * k + 12 * k, cY - (20 - Math.abs(j) * 5) * k); ctx.stroke(); } }
    else { ctx.beginPath(); ctx.moveTo(cx, cY - 30 * k); ctx.lineTo(cx, cY + 24 * k); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(190,90,110,0.45)'; ctx.stroke(); }
    // gum horseshoe
    const path = [...teeth.filter((t) => t.side < 0).reverse(), ...teeth.filter((t) => t.side > 0)];
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); path.forEach((t, i) => (i ? ctx.lineTo(t.x, t.y) : ctx.moveTo(t.x, t.y)));
    ctx.lineWidth = 48 * k; ctx.strokeStyle = GUM.line; ctx.stroke();
    ctx.lineWidth = 44 * k; ctx.strokeStyle = GUM.fill; ctx.stroke();
    ctx.restore();
    for (const t of teeth) {
      const inQuad = st.quad && st.quad.upper === upper && st.quad.right === (t.side > 0);
      const inGroup = inQuad && (st.group === 'all' || (st.group === 'back') === isBackType(t.ty));
      if (inGroup) active.push(t);
      const done = (st.done || []).some((q) => q.upper === upper && q.right === (t.side > 0));
      ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.rot);
      const kind = occlusalShape(ctx, t.ty, t.s, !upper);
      ctx.fillStyle = '#FBFCFE'; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = ENAMEL.line; ctx.stroke();
      if (kind === 'molar') {
        ctx.strokeStyle = 'rgba(130,150,180,0.75)'; ctx.lineWidth = 1.4;
        const q = t.s * 0.22;
        ctx.beginPath(); ctx.moveTo(-q, 0); ctx.lineTo(q, 0); ctx.moveTo(-q, 0); ctx.lineTo(-q * 1.5, -q); ctx.moveTo(-q, 0); ctx.lineTo(-q * 1.5, q); ctx.moveTo(q, 0); ctx.lineTo(q * 1.5, -q); ctx.moveTo(q, 0); ctx.lineTo(q * 1.5, q); ctx.stroke();
      }
      ctx.restore();
      if (done) sparkle(ctx, t.x + 4, t.y - 4, 4 * k, 0, '#BFF3FF', 0.9, false);
    }
  }
  if (!active.length) return;
  const t = st.t ?? 0;
  const pulse = 0.5 + 0.5 * Math.sin(t * TAU * 1.2);
  const gcx = active.reduce((a, b) => a + b.x, 0) / active.length, gcy = active.reduce((a, b) => a + b.y, 0) / active.length;
  // spotlight: everything else fades back
  if (st.spot !== false) {
    const g = ctx.createRadialGradient(gcx, gcy, 46 * k, gcx, gcy, 120 * k);
    g.addColorStop(0, 'rgba(255,253,248,0)'); g.addColorStop(1, 'rgba(255,253,248,0.5)');
    ctx.fillStyle = g; ctx.fillRect(cx - 400, cy - 400, 800, 800);
  }
  glow(ctx, gcx, gcy, 70 * k, hl, 0.35 + 0.2 * pulse, 'source-over');
  // the surface to brush
  const ordered = active.slice().sort((a, b) => (a.side * (a.x - cx)) - (b.side * (b.x - cx)));
  const band = (sign) => {
    const pts = ordered.map((tt) => { const off = sign * (tt.ty === 'A' || tt.ty === 'B' ? tt.s * 0.3 : tt.s * 0.52) + sign * 7 * k; return { x: tt.x + tt.nx * off, y: tt.y + tt.ny * off }; });
    const line = () => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); if (pts.length === 1) ctx.lineTo(pts[0].x + 0.1, pts[0].y); };
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    line(); ctx.lineWidth = 17 * k; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
    line(); ctx.lineWidth = 11 * k; ctx.strokeStyle = hl; ctx.stroke();
    line(); ctx.lineWidth = 3.5 * k; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.stroke();
    ctx.restore();
    return pts;
  };
  let target = { x: gcx, y: gcy }, tang = 0, outward = { x: 0, y: 0 };
  const mid = ordered[Math.floor((ordered.length - 1) / 2)];
  tang = mid.rot; outward = { x: mid.nx, y: mid.ny };
  const fillTeeth = () => {
    for (const tt of active) {
      ctx.save(); ctx.translate(tt.x, tt.y); ctx.rotate(tt.rot);
      occlusalShape(ctx, tt.ty, tt.s, !tt.upper);
      ctx.fillStyle = L.mixHex('#FFFFFF', hl, 0.55 + 0.15 * pulse); ctx.fill();
      ctx.lineWidth = 2.5 * k; ctx.strokeStyle = hlDeep; ctx.stroke();
      ctx.restore();
    }
  };
  if (st.surf === 'outside' || st.surf === 'inside') {
    const sign = st.surf === 'outside' ? 1 : -1;
    for (const tt of active) { ctx.save(); ctx.translate(tt.x, tt.y); ctx.rotate(tt.rot); occlusalShape(ctx, tt.ty, tt.s, !tt.upper); ctx.lineWidth = 2.5 * k; ctx.strokeStyle = hlDeep; ctx.stroke(); ctx.restore(); }
    const pts = band(sign);
    const pm = pts[Math.floor((pts.length - 1) / 2)];
    target = { x: pm.x + outward.x * sign * 12 * k, y: pm.y + outward.y * sign * 12 * k };
    outward = { x: outward.x * sign, y: outward.y * sign };
  } else {
    fillTeeth();
    if (st.surf === 'all') { band(1); band(-1); }
  }
  // the brush sits right on the part being brushed, bristles toward the teeth
  if (st.brush !== false) {
    const w = t * TAU * 2.2;
    const scrub = st.surf === 'top' ? Math.sin(w) * 6 * k : Math.sin(w) * 4 * k;
    ctx.save();
    ctx.translate(target.x + Math.cos(tang) * scrub, target.y + Math.sin(tang) * scrub);
    ctx.rotate(tang);
    if (st.surf === 'top' || st.surf === 'all') { ctx.globalAlpha = 0.95; }
    // local: x along the arch, +y outward; bristles must point inward (−y) for outside, outward for inside
    const s2 = 0.52 * k;
    ctx.scale(s2, (st.surf === 'inside' ? -1 : 1) * s2);
    ctx.translate(-50, 22);
    F.drawToothbrush(ctx, 0, 0, 1, 0, st.brushColor || '#2EA59B', t, { glow: false });
    ctx.restore();
  }
}

// ---------- side view of one tooth for the coach ----------
// kind 'molar' | 'incisor'; upper flips it (crown down); surf 'outside'|'inside'|'top'
function profilePath(ctx, kind) {
  ctx.beginPath();
  if (kind === 'molar') { // lower primary molar, mesial view: buccal left, lingual right
    ctx.moveTo(-30, 0);
    ctx.bezierCurveTo(-46, -6, -50, -26, -44, -44);       // buccal cervical bulge
    ctx.quadraticCurveTo(-38, -62, -26, -64);              // buccal cusp
    ctx.quadraticCurveTo(-12, -58, -4, -48);               // into the central fossa
    ctx.quadraticCurveTo(8, -60, 22, -62);                 // lingual cusp
    ctx.quadraticCurveTo(38, -60, 42, -40);
    ctx.bezierCurveTo(46, -22, 42, -6, 30, 0);
    // root
    ctx.bezierCurveTo(30, 30, 18, 62, 10, 74); ctx.quadraticCurveTo(0, 78, -8, 74);
    ctx.bezierCurveTo(-18, 62, -30, 30, -30, 0);
  } else { // incisor, mesial view: labial left (convex), lingual right (concave with cingulum)
    ctx.moveTo(-14, 0);
    ctx.bezierCurveTo(-24, -20, -18, -60, -4, -84);       // labial face
    ctx.quadraticCurveTo(0, -88, 4, -82);                  // incisal edge
    ctx.bezierCurveTo(4, -60, 2, -38, 10, -26);            // lingual fossa (concave)
    ctx.bezierCurveTo(20, -18, 18, -6, 14, 0);             // cingulum
    ctx.bezierCurveTo(12, 30, 6, 66, 0, 82); ctx.bezierCurveTo(-6, 66, -12, 30, -14, 0);
  }
  ctx.closePath();
}
function drawCoachProfile(ctx, cx, cy, st) {
  const { kind, upper, surf, t = 0, theme = {} } = st;
  const accent2 = theme.accent2 || '#F7C548', brushCol = theme.brush || '#2EA59B';
  const M = kind === 'molar';
  const flip = upper ? -1 : 1;      // drawn as a lower tooth, mirrored for the upper arch
  ctx.save(); ctx.translate(cx, cy);
  if (st.clip) { L.roundRect(ctx, -st.clip.w / 2, -st.clip.h / 2, st.clip.w, st.clip.h, 26); ctx.clip(); }
  ctx.scale(st.scale ?? 1, (st.scale ?? 1) * flip); ctx.translate(0, 18);
  // cheek / lip wall and vestibule on the outside (left)
  ctx.beginPath(); ctx.moveTo(-140, -130); ctx.bezierCurveTo(-96, -90, -92, 10, -86, 60); ctx.quadraticCurveTo(-80, 104, -62, 96); ctx.lineTo(-62, 140); ctx.lineTo(-140, 140); ctx.closePath();
  const cg = ctx.createLinearGradient(-140, 0, -80, 0); cg.addColorStop(0, '#F08DA2'); cg.addColorStop(1, surf === 'outside' ? '#FFC2CF' : '#F7CFD9');
  ctx.fillStyle = cg; ctx.fill();
  // tongue (lower) or palate (upper) on the inside (right)
  if (upper) { ctx.beginPath(); ctx.moveTo(62, 96); ctx.bezierCurveTo(80, 60, 112, 40, 150, 34); ctx.lineTo(150, 140); ctx.lineTo(62, 140); ctx.closePath(); }
  else { ctx.beginPath(); ctx.moveTo(62, 100); ctx.bezierCurveTo(70, 20, 120, -36, 150, -30); ctx.lineTo(150, 140); ctx.lineTo(62, 140); ctx.closePath(); }
  const tg = ctx.createLinearGradient(60, 0, 150, 0); tg.addColorStop(0, surf === 'inside' ? '#FFB3C2' : '#F7C9D3'); tg.addColorStop(1, '#EE8FA4');
  ctx.fillStyle = tg; ctx.fill();
  // tooth
  profilePath(ctx, kind);
  const g = ctx.createLinearGradient(0, M ? -64 : -88, 0, 80);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.4, '#F1F5FA'); g.addColorStop(0.52, '#F1E4CF'); g.addColorStop(1, '#E8D5B5');
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = ENAMEL.line; ctx.stroke();
  if (M) { ctx.beginPath(); ctx.moveTo(-4, -48); ctx.lineTo(-4, -40); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(130,150,180,0.7)'; ctx.stroke(); }
  // surface to brush, glowing
  ctx.save(); profilePath(ctx, kind); ctx.clip();
  ctx.globalCompositeOperation = 'source-atop';
  const gx = surf === 'outside' ? -40 : surf === 'inside' ? 40 : 0, gy = surf === 'top' ? (M ? -64 : -86) : (M ? -30 : -40);
  glow(ctx, gx, gy, M ? 46 : 40, accent2, 0.95, 'source-atop');
  ctx.restore();
  // gum: hugs the neck on both sides, covers the root
  ctx.beginPath();
  const n = M ? 31 : 15;
  const gw = M ? 56 : 44;
  ctx.moveTo(-gw - 4, 240); ctx.bezierCurveTo(-gw - 2, 120, -gw - 2, 40, -gw + 2, 18);
  ctx.bezierCurveTo(-gw + 4, 4, -n - 14, -4, -n - 6, -6); ctx.quadraticCurveTo(-n + 1, -8, -n, 2);
  ctx.quadraticCurveTo(0, 12, n, 2); ctx.quadraticCurveTo(n - 1, -8, n + 6, -6);
  ctx.bezierCurveTo(n + 14, -4, gw - 4, 4, gw - 2, 18); ctx.bezierCurveTo(gw + 2, 40, gw + 2, 120, gw + 4, 240); ctx.closePath();
  const gg = ctx.createLinearGradient(0, -8, 0, 120); gg.addColorStop(0, '#F7A9BB'); gg.addColorStop(1, '#E8849C');
  ctx.globalAlpha = 0.93; ctx.fillStyle = gg; ctx.fill(); ctx.globalAlpha = 1;
  ctx.lineWidth = 2.5; ctx.strokeStyle = GUM.line; ctx.stroke();
  ctx.save(); ctx.globalAlpha = 0.22; ctx.beginPath(); ctx.rect(-70, 4, 140, 140); ctx.clip(); profilePath(ctx, kind); ctx.fillStyle = '#FFF6EA'; ctx.fill(); ctx.restore();
  // toothbrush
  if (st.brush === false) { ctx.restore(); return; }
  const w = t * TAU * 2.2;
  const s = 0.74;
  ctx.save();
  if (surf === 'outside' || surf === 'inside') {
    const sx = surf === 'outside' ? 1 : -1;            // mirror for the inside
    ctx.scale(sx, 1);
    if (kind === 'incisor' && surf === 'inside') {
      // front teeth, inside: brush held upright on the tongue side, up-and-down
      ctx.translate(-16 - 26 * s, -50 - 52 * s + Math.sin(w) * 8); ctx.rotate(Math.PI / 2); ctx.scale(s, s);
    } else {
      const tx = M ? -46 : -22, ty = M ? -18 : -26;          // bristle tips on the cervical third
      const m = { x: Math.cos(w) * 3, y: Math.sin(w) * 3 };  // little circles
      ctx.translate(tx - 43 * s / 0.78 + m.x, ty + 14.3 * s / 0.78 + m.y); ctx.rotate(-Math.PI / 4); ctx.scale(s, -s);
    }
  } else {
    ctx.translate(-52 * s + Math.sin(w) * 10, (M ? -66 : -90) - 26 * s); ctx.scale(s, -s);
  }
  F.drawToothbrush(ctx, 0, 0, 1, 0, brushCol, t, { glow: false });
  ctx.restore();
  ctx.restore();
}


module.exports = { drawMouthFront, drawArchesTop, drawCoachProfile, drawLabialTooth, FRONT };
