// BRAVI — The Castle of Courage.
// Four doors = four quadrants, laid out like the mouth map (mirror view):
// tower doors on top (right first), castle gates at the bottom.
'use strict';
const L = require('../lib');
const F = require('../fairy');
const PR = require('../progress');
const { TAU, clamp, lerp, inv, ease, rgba, glow, sparkle, hash, rng } = L;
const { W, H, BRUSH } = require('../timeline');

const SP = F.SPECS.bravi;
const RES = 1.5;  // cached castle layers are drawn at 1.5× so close-ups stay crisp

// ---------------- geometry (world = 1080×1920) ----------------
const GROUND = 1650;
const TOWER_L = { x0: 128, x1: 332, top: 700, apex: { x: 230, y: 420 } };
const TOWER_R = { x0: 748, x1: 952, top: 700, apex: { x: 850, y: 420 } };
const KEEP = { x0: 300, x1: 780, top: 1080 };
const CTOWER = { x0: 448, x1: 632, top: 770, apex: { x: 540, y: 520 } };
const DOORS = [
  { id: 'UR', x: 850, by: 994, w: 106, h: 152, double: false, open: 30 },
  { id: 'UL', x: 230, by: 994, w: 106, h: 152, double: false, open: 60 },
  { id: 'LL', x: 424, by: GROUND, w: 132, h: 200, double: true, open: 90 },
  { id: 'LR', x: 656, by: GROUND, w: 132, h: 200, double: true, open: 120 },
];
DOORS.forEach((d) => { d.lock = { x: d.x, y: d.by - d.h * 0.42 }; });
const WINDOWS = [
  { x: 230, y: 1200, w: 46, h: 70 }, { x: 850, y: 1200, w: 46, h: 70 },
  { x: 230, y: 1410, w: 46, h: 70 }, { x: 850, y: 1410, w: 46, h: 70 },
  { x: 404, y: 1210, w: 50, h: 74 }, { x: 676, y: 1210, w: 50, h: 74 },
  { x: 540, y: 1150, w: 54, h: 80 },
];
const ROUND_WIN = { x: 540, y: 900, r: 44 };

// ---------------- cached layers ----------------
let C = null;
function init() {
  if (C) return C;
  C = {};
  // sky
  C.sky = L.makeCanvas(W, H);
  {
    const x = C.sky.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#A9B8F5'); g.addColorStop(0.32, '#CFC4F7'); g.addColorStop(0.56, '#FFCFDD'); g.addColorStop(0.78, '#FFE2C9'); g.addColorStop(1, '#FFF1D9');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // sun bloom behind the castle
    const s = x.createRadialGradient(540, 760, 20, 540, 760, 760);
    s.addColorStop(0, 'rgba(255,248,220,0.95)'); s.addColorStop(0.25, 'rgba(255,232,190,0.55)'); s.addColorStop(1, 'rgba(255,220,200,0)');
    x.fillStyle = s; x.fillRect(0, 0, W, H);
  }
  // clouds (sprites)
  C.clouds = [0, 1, 2, 3, 4].map((i) => cloudSprite(i));
  // far hills (world-size with margin, parallax)
  C.hills = L.makeCanvas(W + 400, 900);
  {
    const x = C.hills.getContext('2d');
    x.translate(200, -1100); // world y 1100..2000
    const ridge = (y0, amp, col1, col2, seed, freq) => {
      x.beginPath(); x.moveTo(-200, 2000);
      for (let px = -200; px <= W + 200; px += 20) x.lineTo(px, y0 + Math.sin(px * freq + seed) * amp + Math.sin(px * freq * 2.7 + seed * 2) * amp * 0.35);
      x.lineTo(W + 200, 2000); x.closePath();
      const g = x.createLinearGradient(0, y0 - amp, 0, y0 + 300); g.addColorStop(0, col1); g.addColorStop(1, col2);
      x.fillStyle = g; x.fill();
    };
    ridge(1330, 60, '#C9BDF0', '#E7D9F5', 1, 0.006);
    ridge(1420, 50, '#B6DDC4', '#D8EED6', 3, 0.008);
    // little distant trees
    const R = rng(7);
    for (let i = 0; i < 26; i++) {
      const px = -150 + R() * (W + 300), py = 1440 + R() * 120;
      x.fillStyle = R() > 0.5 ? '#9FD0A8' : '#8CC39C';
      x.beginPath(); x.ellipse(px, py, 16 + R() * 10, 24 + R() * 14, 0, 0, TAU); x.fill();
    }
  }
  // castle (static stone parts) at RES
  C.castle = L.makeCanvas(W * RES, H * RES);
  { const x = C.castle.getContext('2d'); x.scale(RES, RES); drawCastleStatic(x); }
  // front ground
  C.ground = L.makeCanvas(W * RES, 420 * RES);
  { const x = C.ground.getContext('2d'); x.scale(RES, RES); x.translate(0, -1500); drawGround(x); }
  return C;
}

function cloudSprite(i) {
  const R = rng(100 + i);
  const w = 360 + R() * 220, h = 170;
  const c = L.makeCanvas(w + 80, h + 80), x = c.getContext('2d');
  x.translate(40, 40);
  const puffs = [];
  const n = 6 + Math.floor(R() * 3);
  for (let k = 0; k < n; k++) {
    const u = k / (n - 1);
    puffs.push({ x: 50 + u * (w - 100), y: h - 50 - Math.sin(u * Math.PI) * (40 + R() * 40), r: 40 + Math.sin(u * Math.PI) * 40 + R() * 16 });
  }
  const path = () => { x.beginPath(); puffs.forEach((p) => { x.moveTo(p.x + p.r, p.y); x.arc(p.x, p.y, p.r, 0, TAU); }); x.rect(40, h - 60, w - 80, 50); };
  path();
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.7, '#FFF1F3'); g.addColorStop(1, '#F3D9EC');
  x.fillStyle = g; x.fill();
  return c;
}

// ---------------- castle drawing ----------------
function stoneWall(x, x0, y0, x1, y1, seed, cyl = true) {
  x.save();
  x.beginPath(); x.rect(x0, y0, x1 - x0, y1 - y0); x.clip();
  const g = x.createLinearGradient(x0, 0, x1, 0);
  if (cyl) { g.addColorStop(0, '#FFF3E6'); g.addColorStop(0.35, '#F8E4D2'); g.addColorStop(1, '#DDBBA6'); }
  else { g.addColorStop(0, '#FBE9D9'); g.addColorStop(1, '#EDCFBB'); }
  x.fillStyle = g; x.fillRect(x0, y0, x1 - x0, y1 - y0);
  // soft bricks
  const R = rng(seed);
  x.lineWidth = 2.2; x.strokeStyle = 'rgba(190,140,120,0.32)';
  const bh = 34;
  for (let row = 0, y = y0 + 8; y < y1; row++, y += bh) {
    let bx = x0 - (row % 2 ? 28 : 0) - R() * 10;
    while (bx < x1) {
      const bw = 52 + R() * 26;
      L.roundRect(x, bx + 3, y + 3, bw - 6, bh - 6, 9);
      if (R() > 0.35) x.stroke();
      if (R() > 0.86) { x.fillStyle = 'rgba(255,255,255,0.25)'; x.fill(); }
      bx += bw;
    }
  }
  // ambient occlusion at the base
  const ao = x.createLinearGradient(0, y1 - 160, 0, y1);
  ao.addColorStop(0, 'rgba(160,110,140,0)'); ao.addColorStop(1, 'rgba(160,110,140,0.25)');
  x.fillStyle = ao; x.fillRect(x0, y1 - 160, x1 - x0, 160);
  x.restore();
  x.lineWidth = 3; x.strokeStyle = 'rgba(170,115,100,0.55)'; x.strokeRect(x0, y0, x1 - x0, y1 - y0);
}

function crenellations(x, x0, x1, y, mw = 40, gap = 26, mh = 38) {
  const n = Math.floor((x1 - x0 + gap) / (mw + gap));
  const total = n * mw + (n - 1) * gap, start = x0 + (x1 - x0 - total) / 2;
  for (let i = 0; i < n; i++) {
    const mx = start + i * (mw + gap);
    L.roundRect(x, mx, y - mh, mw, mh + 8, 6);
    const g = x.createLinearGradient(mx, 0, mx + mw, 0); g.addColorStop(0, '#FFF3E6'); g.addColorStop(1, '#E7C9B4');
    x.fillStyle = g; x.fill(); x.lineWidth = 3; x.strokeStyle = 'rgba(170,115,100,0.55)'; x.stroke();
  }
}

function roof(x, tw, apex, base) {
  const ox = 22;
  x.save();
  x.beginPath();
  x.moveTo(tw.x0 - ox, base);
  x.quadraticCurveTo((tw.x0 + apex.x) / 2 - 10, (base + apex.y) / 2 + 30, apex.x, apex.y);
  x.quadraticCurveTo((tw.x1 + apex.x) / 2 + 10, (base + apex.y) / 2 + 30, tw.x1 + ox, base);
  x.quadraticCurveTo(apex.x, base + 34, tw.x0 - ox, base);
  x.closePath();
  const g = x.createLinearGradient(tw.x0, 0, tw.x1, 0);
  g.addColorStop(0, '#FF8FA0'); g.addColorStop(0.4, '#F06A86'); g.addColorStop(1, '#B9436A');
  x.fillStyle = g; x.fill();
  x.save(); x.clip();
  // scale tiles
  x.lineWidth = 2.5; x.strokeStyle = 'rgba(150,40,80,0.28)';
  for (let row = 0, y = apex.y + 30; y < base + 40; row++, y += 26) {
    for (let px = tw.x0 - 40 + (row % 2) * 14; px < tw.x1 + 40; px += 28) {
      x.beginPath(); x.arc(px, y, 14, 0.15, Math.PI - 0.15); x.stroke();
    }
  }
  // rim light
  x.globalAlpha = 0.35; x.fillStyle = '#FFE7EC';
  x.beginPath(); x.moveTo(apex.x - 4, apex.y + 10); x.quadraticCurveTo(tw.x0 + 20, base - 80, tw.x0 - 10, base); x.lineTo(tw.x0 + 18, base); x.quadraticCurveTo(tw.x0 + 40, base - 90, apex.x - 4, apex.y + 10); x.fill();
  x.restore();
  x.lineWidth = 3.5; x.strokeStyle = '#9C3458'; x.stroke();
  // finial
  x.beginPath(); x.moveTo(apex.x, apex.y + 4); x.lineTo(apex.x, apex.y - 70); x.lineWidth = 5; x.strokeStyle = '#B98A2E'; x.stroke();
  x.beginPath(); x.arc(apex.x, apex.y - 4, 10, 0, TAU); x.fillStyle = '#F7C548'; x.fill(); x.lineWidth = 2.5; x.strokeStyle = '#B98A2E'; x.stroke();
  x.restore();
}

function archPath(x, cx, by, w, h) {
  x.beginPath();
  x.moveTo(cx - w / 2, by);
  x.lineTo(cx - w / 2, by - h + w / 2);
  x.arc(cx, by - h + w / 2, w / 2, Math.PI, 0);
  x.lineTo(cx + w / 2, by);
  x.closePath();
}

function drawCastleStatic(x) {
  // central tower (behind keep)
  stoneWall(x, CTOWER.x0, CTOWER.top, CTOWER.x1, KEEP.top + 10, 31);
  crenellations(x, CTOWER.x0 - 6, CTOWER.x1 + 6, CTOWER.top, 34, 22, 30);
  roof(x, { x0: CTOWER.x0 + 10, x1: CTOWER.x1 - 10 }, CTOWER.apex, CTOWER.top - 30);
  // round heart window frame
  x.beginPath(); x.arc(ROUND_WIN.x, ROUND_WIN.y, ROUND_WIN.r + 12, 0, TAU); x.fillStyle = '#E9CBB4'; x.fill();
  x.lineWidth = 3; x.strokeStyle = 'rgba(170,115,100,0.7)'; x.stroke();
  windowGlass(x, ROUND_WIN.x, ROUND_WIN.y, 0, 0, true);
  // keep
  stoneWall(x, KEEP.x0, KEEP.top, KEEP.x1, GROUND, 41, false);
  crenellations(x, KEEP.x0, KEEP.x1, KEEP.top);
  // towers
  for (const [tw, seed] of [[TOWER_L, 51], [TOWER_R, 61]]) {
    stoneWall(x, tw.x0, tw.top, tw.x1, GROUND, seed);
    // corbel band under the roof
    x.fillStyle = '#EED3BF'; L.roundRect(x, tw.x0 - 10, tw.top - 4, tw.x1 - tw.x0 + 20, 26, 8); x.fill();
    x.lineWidth = 3; x.strokeStyle = 'rgba(170,115,100,0.55)'; x.stroke();
    roof(x, tw, tw.apex, tw.top - 4);
    // balcony under the tower door
    const d = tw === TOWER_L ? DOORS[1] : DOORS[0];
    L.roundRect(x, d.x - 92, d.by - 4, 184, 22, 9); x.fillStyle = '#E9CBB4'; x.fill(); x.stroke();
    for (let i = -3; i <= 3; i++) { L.roundRect(x, d.x + i * 24 - 5, d.by + 16, 10, 22, 4); x.fillStyle = '#E2C0A8'; x.fill(); }
  }
  // door frames + dark recesses
  for (const d of DOORS) {
    archPath(x, d.x, d.by, d.w + 30, d.h + 18);
    x.fillStyle = '#E3BFA6'; x.fill(); x.lineWidth = 3; x.strokeStyle = 'rgba(160,100,85,0.7)'; x.stroke();
    // voussoirs
    x.save(); archPath(x, d.x, d.by, d.w + 30, d.h + 18); x.clip();
    x.lineWidth = 2; x.strokeStyle = 'rgba(160,100,85,0.45)';
    const cy = d.by - d.h + d.w / 2;
    for (let a = Math.PI; a <= TAU + 0.01; a += Math.PI / 7) { x.beginPath(); x.moveTo(d.x + Math.cos(a) * d.w / 2, cy + Math.sin(a) * d.w / 2); x.lineTo(d.x + Math.cos(a) * (d.w / 2 + 20), cy + Math.sin(a) * (d.w / 2 + 20)); x.stroke(); }
    x.restore();
    archPath(x, d.x, d.by, d.w, d.h); x.fillStyle = '#4A2A3C'; x.fill();
  }
  // windows
  for (const w of WINDOWS) {
    archPath(x, w.x, w.y + w.h / 2, w.w + 16, w.h + 12); x.fillStyle = '#E3BFA6'; x.fill(); x.lineWidth = 2.5; x.strokeStyle = 'rgba(160,100,85,0.7)'; x.stroke();
    windowGlass(x, w.x, w.y, w.w, w.h, false);
    // flower box
    L.roundRect(x, w.x - w.w / 2 - 10, w.y + w.h / 2 + 2, w.w + 20, 14, 5); x.fillStyle = '#C9844B'; x.fill();
    const R = rng(w.x * 3 + w.y);
    for (let i = 0; i < 5; i++) { x.fillStyle = ['#FF8FA0', '#FFD06B', '#FFFFFF'][i % 3]; x.beginPath(); x.arc(w.x - w.w / 2 - 4 + i * (w.w + 8) / 4, w.y + w.h / 2 + R() * 4 - 1, 6, 0, TAU); x.fill(); }
  }
  // climbing vines
  const vine = (vx, y0, y1, seed) => {
    const R = rng(seed);
    x.lineWidth = 4; x.strokeStyle = '#6FAE6B'; x.beginPath(); x.moveTo(vx, y1);
    for (let y = y1; y > y0; y -= 30) x.lineTo(vx + Math.sin(y * 0.05 + seed) * 12, y);
    x.stroke();
    for (let y = y1; y > y0; y -= 22) {
      const lx = vx + Math.sin(y * 0.05 + seed) * 12;
      x.fillStyle = R() > 0.5 ? '#86C97E' : '#9BD98F';
      x.beginPath(); x.ellipse(lx + (R() - 0.5) * 24, y, 11, 6, R() * 3, 0, TAU); x.fill();
      if (R() > 0.82) { x.fillStyle = '#FF9FB5'; x.beginPath(); x.arc(lx + 8, y - 4, 5, 0, TAU); x.fill(); }
    }
  };
  vine(142, 1180, GROUND, 3); vine(318, 1320, GROUND, 5); vine(940, 1250, GROUND, 7); vine(764, 1380, GROUND, 9);
  vine(300 + 18, 1480, GROUND, 11); vine(780 - 18, 1460, GROUND, 13);
}

function windowGlass(x, cx, cy, w, h, round) {
  x.save();
  if (round) { x.beginPath(); x.arc(cx, cy, ROUND_WIN.r, 0, TAU); }
  else archPath(x, cx, cy + h / 2, w, h);
  const g = x.createLinearGradient(0, cy - 40, 0, cy + 40);
  g.addColorStop(0, '#6E5FA8'); g.addColorStop(1, '#3E2F6E');
  x.fillStyle = g; x.fill();
  x.lineWidth = 3; x.strokeStyle = '#B98A6A'; x.stroke();
  x.clip();
  x.strokeStyle = 'rgba(255,230,200,0.6)'; x.lineWidth = 3;
  if (round) { L.heartPath(x, cx, cy + 2, 18); x.stroke(); }
  else { x.beginPath(); x.moveTo(cx, cy - h / 2); x.lineTo(cx, cy + h / 2); x.moveTo(cx - w / 2, cy + 6); x.lineTo(cx + w / 2, cy + 6); x.stroke(); }
  x.fillStyle = 'rgba(255,255,255,0.22)';
  x.beginPath(); x.ellipse(cx - (round ? 14 : w * 0.2), cy - (round ? 14 : h * 0.2), round ? 10 : 6, round ? 6 : 12, -0.5, 0, TAU); x.fill();
  x.restore();
}

function drawGround(x) {
  // hill
  x.beginPath(); x.moveTo(-20, 1920);
  x.lineTo(-20, 1660);
  x.bezierCurveTo(200, 1620, 360, 1640, 540, 1638);
  x.bezierCurveTo(720, 1640, 880, 1620, 1100, 1660);
  x.lineTo(1100, 1920); x.closePath();
  const g = x.createLinearGradient(0, 1620, 0, 1920); g.addColorStop(0, '#A9E09A'); g.addColorStop(1, '#6CBF7C');
  x.fillStyle = g; x.fill();
  // path to the gates
  x.beginPath();
  x.moveTo(372, 1648); x.lineTo(708, 1648);
  x.bezierCurveTo(740, 1740, 650, 1820, 700, 1940); x.lineTo(380, 1940);
  x.bezierCurveTo(430, 1820, 340, 1740, 372, 1648);
  x.closePath();
  const pg = x.createLinearGradient(0, 1648, 0, 1920); pg.addColorStop(0, '#F6E2C8'); pg.addColorStop(1, '#EBCDA8');
  x.fillStyle = pg; x.fill();
  const R = rng(77);
  for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(200,160,120,0.35)'; x.beginPath(); x.ellipse(400 + R() * 290, 1670 + R() * 240, 10 + R() * 12, 5 + R() * 5, 0, 0, TAU); x.fill(); }
  // bushes along the castle base
  const bush = (bx, by, s, c1, c2) => {
    x.beginPath();
    [[-0.6, 0.1, 0.55], [-0.2, -0.25, 0.7], [0.3, -0.15, 0.62], [0.65, 0.12, 0.5]].forEach(([dx, dy, r]) => { x.moveTo(bx + dx * s + r * s, by + dy * s); x.arc(bx + dx * s, by + dy * s, r * s, 0, TAU); });
    const gg = x.createLinearGradient(0, by - s, 0, by + s * 0.6); gg.addColorStop(0, c1); gg.addColorStop(1, c2);
    x.fillStyle = gg; x.fill();
  };
  bush(70, 1662, 80, '#8FD68A', '#58A86A'); bush(1010, 1662, 84, '#8FD68A', '#58A86A');
  bush(290, 1672, 52, '#9EE095', '#62B371'); bush(790, 1672, 52, '#9EE095', '#62B371');
  // flowers
  for (let i = 0; i < 70; i++) {
    const fx = R() * 1080, fy = 1680 + R() * 230;
    if (fx > 360 && fx < 720 && fy < 1900) continue;
    x.fillStyle = ['#FF9FB5', '#FFD06B', '#FFFFFF', '#C9B6FF'][i % 4];
    for (let p = 0; p < 5; p++) { const a = (p / 5) * TAU; x.beginPath(); x.arc(fx + Math.cos(a) * 6, fy + Math.sin(a) * 6, 5, 0, TAU); x.fill(); }
    x.fillStyle = '#FFB13D'; x.beginPath(); x.arc(fx, fy, 4, 0, TAU); x.fill();
  }
  // grass tufts
  x.strokeStyle = '#5FAE6E'; x.lineWidth = 3; x.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const gx = R() * 1080, gy = 1670 + R() * 250;
    x.beginPath(); x.moveTo(gx, gy); x.quadraticCurveTo(gx + 3, gy - 10, gx + 6, gy - 18); x.moveTo(gx + 4, gy); x.quadraticCurveTo(gx + 2, gy - 8, gx - 4, gy - 14); x.stroke();
  }
}

// ---------------- dynamic pieces ----------------
function flag(ctx, apex, t, col) {
  const px = apex.x, py = apex.y - 66;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(px, py);
  const n = 10;
  for (let i = 1; i <= n; i++) { const u = i / n; ctx.lineTo(px + u * 78, py + 6 + Math.sin(t * 4 - u * 4) * 6 * u - u * 2); }
  for (let i = n; i >= 0; i--) { const u = i / n; ctx.lineTo(px + u * 78, py + 6 + 32 * (1 - u * 0.9) + Math.sin(t * 4 - u * 4) * 6 * u); }
  ctx.closePath();
  ctx.fillStyle = col; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(140,40,60,0.6)'; ctx.stroke();
  ctx.restore();
}

function banner(ctx, t) {
  const bx = 540, by = 1300, bw = 74, bh = 150;
  ctx.save();
  ctx.fillStyle = '#B98A2E'; L.roundRect(ctx, bx - bw / 2 - 10, by - 8, bw + 20, 10, 5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(bx - bw / 2, by);
  ctx.lineTo(bx + bw / 2, by);
  const sw = Math.sin(t * 1.6) * 4;
  ctx.lineTo(bx + bw / 2 + sw, by + bh); ctx.lineTo(bx + sw, by + bh - 26); ctx.lineTo(bx - bw / 2 + sw, by + bh); ctx.closePath();
  const g = ctx.createLinearGradient(bx - bw / 2, 0, bx + bw / 2, 0); g.addColorStop(0, '#FF7F7A'); g.addColorStop(1, '#D9445A');
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#A8344A'; ctx.stroke();
  L.heartPath(ctx, bx + sw * 0.5, by + 56, 17); ctx.fillStyle = '#F7C548'; ctx.fill();
  ctx.restore();
}

function archLen(d) { return 2 * (d.h - d.w / 2) + Math.PI * d.w / 2; }

// one door, all states. progress 0..1 while it is the active mission.
function drawDoor(ctx, d, t, active, progress) {
  const openU = ease.outBack(clamp((t - d.open) / 1.0));
  const opened = t >= d.open;
  const since = t - d.open;
  const tp = t - (d.open - 30);
  // top-right door creaks open a little more at every step (one heart-lock pops each time)
  const ajar = d.id === 'UR' ? (opened ? 5 : (tp > 0 ? PR.level(tp, 0.8, ease.out) : 0)) / 5 : 0;
  const kAjar = 1 - 0.36 * ajar + (d.id === 'UR' && !opened ? Math.sin(t * 9) * 0.006 * ajar : 0);
  ctx.save();
  // warm interior once open (or peeking through the gap)
  const inner = opened ? clamp(since / 0.3) : ajar * 0.9;
  if (inner > 0) {
    archPath(ctx, d.x, d.by, d.w, d.h);
    const g = ctx.createLinearGradient(0, d.by - d.h, 0, d.by);
    g.addColorStop(0, '#FFF6D8'); g.addColorStop(1, '#FFC25A');
    ctx.fillStyle = g; ctx.globalAlpha = inner; ctx.fill(); ctx.globalAlpha = 1;
    glow(ctx, d.x, d.by - d.h * 0.45, d.h * 1.25, '#FFD76E', 0.55 * (opened ? clamp(since / 0.4) : ajar * 0.8));
  }
  // door leaves
  const leaves = d.double ? [{ hinge: d.x - d.w / 2, w: d.w / 2, dir: 1 }, { hinge: d.x + d.w / 2, w: d.w / 2, dir: -1 }] : [{ hinge: d.x - d.w / 2, w: d.w, dir: 1 }];
  ctx.save();
  archPath(ctx, d.x, d.by, d.w, d.h); ctx.clip();
  for (const lf of leaves) {
    const k = opened ? clamp(lerp(kAjar, 0.14, openU), 0.08, 1) : kAjar;  // visible width fraction
    const lw = lf.w * k;
    const x0 = lf.dir > 0 ? lf.hinge : lf.hinge - lw;
    const g = ctx.createLinearGradient(x0, 0, x0 + lw, 0);
    const dark = opened ? 0.25 * openU : 0;
    g.addColorStop(0, L.mixHex('#C98650', '#5a3020', dark)); g.addColorStop(1, L.mixHex('#9C5A33', '#4a2416', dark));
    ctx.fillStyle = g; ctx.fillRect(x0, d.by - d.h - 10, lw, d.h + 10);
    // planks
    ctx.strokeStyle = 'rgba(90,45,25,0.45)'; ctx.lineWidth = 2.5;
    const np = Math.max(1, Math.round(lf.w / 26));
    for (let i = 1; i < np; i++) { const px = x0 + (lw * i) / np; ctx.beginPath(); ctx.moveTo(px, d.by - d.h); ctx.lineTo(px, d.by); ctx.stroke(); }
    // gold bands
    ctx.fillStyle = '#E8B04A';
    for (const fy of [0.3, 0.78]) ctx.fillRect(x0, d.by - d.h * fy - 5, lw, 10);
    ctx.fillStyle = '#B9822A';
    for (const fy of [0.3, 0.78]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x0 + lw * (0.2 + i * 0.3), d.by - d.h * fy, 2.6, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
  archPath(ctx, d.x, d.by, d.w, d.h); ctx.lineWidth = 4; ctx.strokeStyle = '#6E3A26'; ctx.stroke();

  // light rays pouring out after opening
  if (opened && since < 4) {
    const a = clamp(since / 0.3) * clamp((4 - since) / 1.5);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const ang = -Math.PI / 2 + (i - 4) * 0.28 + Math.sin(t * 0.8 + i) * 0.04;
      const len = d.h * (1.6 + 0.4 * Math.sin(i * 3.1 + t * 2));
      ctx.beginPath(); ctx.moveTo(d.x, d.by - d.h * 0.45);
      ctx.lineTo(d.x + Math.cos(ang - 0.07) * len, d.by - d.h * 0.45 + Math.sin(ang - 0.07) * len);
      ctx.lineTo(d.x + Math.cos(ang + 0.07) * len, d.by - d.h * 0.45 + Math.sin(ang + 0.07) * len);
      ctx.closePath();
      const rg = ctx.createRadialGradient(d.x, d.by - d.h * 0.45, 0, d.x, d.by - d.h * 0.45, len);
      rg.addColorStop(0, `rgba(255,230,160,${0.35 * a})`); rg.addColorStop(1, 'rgba(255,230,160,0)');
      ctx.fillStyle = rg; ctx.fill();
    }
    ctx.restore();
  }

  // lock medallion + magic seal (until opened)
  const lk = d.lock;
  const pop = opened ? since : -1;
  if (!opened || pop < 0.6) {
    const s = opened ? 1 + ease.out(pop / 0.6) * 0.9 : 1;
    const a = opened ? 1 - pop / 0.6 : 1;
    ctx.save();
    ctx.globalAlpha = a;
    // seal ring
    ctx.save(); ctx.translate(lk.x, lk.y); ctx.rotate(t * 0.4);
    ctx.setLineDash([10, 12]); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(170,150,255,0.65)';
    ctx.beginPath(); ctx.arc(0, 0, d.w * 0.42 * s, 0, TAU); ctx.stroke();
    ctx.restore();
    glow(ctx, lk.x, lk.y, 70 * s, active ? '#FFD76E' : '#B9A6FF', active ? 0.55 + 0.45 * progress : 0.35);
    ctx.beginPath(); ctx.arc(lk.x, lk.y, 22 * s, 0, TAU);
    const lg = ctx.createLinearGradient(lk.x - 20, lk.y - 20, lk.x + 20, lk.y + 20); lg.addColorStop(0, '#FFF0B0'); lg.addColorStop(1, '#D9962E');
    ctx.fillStyle = lg; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#9A6418'; ctx.stroke();
    L.heartPath(ctx, lk.x, lk.y - 2 * s, 8 * s); ctx.fillStyle = '#5A2E2A'; ctx.fill();
    ctx.restore();
  }
  if (d.id === 'UR') drawHeartLocks(ctx, d, t, tp, kAjar, opened, since);
  if (d.id === 'UL') drawVines(ctx, d, t, tp, opened, since);
  if (d.id === 'LR') drawPortcullis(ctx, d, t);
  ctx.restore();
}


// ----- mission mechanics: something opens a little more at every step -----
// 1 · five little heart-locks on the edge of the top-right door; one pops off every 5 s
function drawHeartLocks(ctx, d, t, tp, kAjar, opened, since) {
  if (opened && since > 1) return;
  const edge = d.x - d.w / 2 + d.w * kAjar;
  for (let i = 0; i < 5; i++) {
    const y = d.by - d.h * (0.62 - i * 0.12);
    const j = tp > 0 ? PR.jump(tp, i, 1.0, ease.out) : 0;
    const an = tp > 0 ? PR.antic(tp, i) : 0;
    const shake = Math.sin(t * 38 + i) * 2.5 * an;
    const fly = opened ? 1 : j;
    if (fly >= 1 && (tp - (i + 1) * 5) > 1.0 && !opened) continue;
    const x = edge + shake + fly * 46, yy = y - fly * 70 + fly * fly * 40;
    ctx.save();
    ctx.globalAlpha = 1 - fly;
    ctx.translate(x, yy); ctx.rotate(fly * 2.2 + shake * 0.02);
    ctx.beginPath(); ctx.arc(0, -10, 7, Math.PI, 0); ctx.lineWidth = 3.5; ctx.strokeStyle = '#B98A2E'; ctx.stroke();
    L.heartPath(ctx, 0, 1, 10); ctx.fillStyle = '#F7C548'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#A8742A'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, TAU); ctx.fillStyle = '#7A4A20'; ctx.fill();
    ctx.restore();
    if (j > 0 && j < 1) for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; sparkle(ctx, edge + Math.cos(a) * (12 + j * 40), y + Math.sin(a) * (12 + j * 40), 8 * (1 - j), a, '#FFE08A', 1 - j); }
    if (an > 0) glow(ctx, edge, y, 26, '#FFE08A', 0.6 * an);
  }
  // light leaking through the gap
  if (tp > 0 && !opened) {
    const aj = PR.level(tp, 0.8, ease.out) / 5;
    if (aj > 0) glow(ctx, edge + 4, d.by - d.h * 0.45, 70 + aj * 60, '#FFE6A0', 0.35 + 0.4 * aj);
  }
}

// 2 · flowering vines hold the top-left door; one strand lets go every 5 s
const VINES = [
  { a: [-1, 0.16], b: [1, 0.58], c: [0, 0.1] },
  { a: [1, 0.12], b: [-1, 0.64], c: [0, 0.24] },
  { a: [-1, 0.46], b: [1, 0.86], c: [0.1, 0.5] },
  { a: [1, 0.42], b: [-1, 0.92], c: [-0.1, 0.46] },
  { a: [-0.2, 1.08], b: [0.15, 0.04], c: [0.5, 0.55] },
];
function vinePoint(d, v, u, t, i, shake) {
  const P = (q) => ({ x: d.x + q[0] * (d.w / 2 + 16), y: d.by - q[1] * d.h });
  const A = P(v.a), B = P(v.b), Cc = P(v.c);
  Cc.x += Math.sin(t * 1.6 + i) * 6 + shake; Cc.y += Math.cos(t * 1.3 + i) * 4;
  const m = 1 - u;
  return { x: m * m * A.x + 2 * m * u * Cc.x + u * u * B.x, y: m * m * A.y + 2 * m * u * Cc.y + u * u * B.y };
}
function drawVines(ctx, d, t, tp, opened, since) {
  if (opened && since > 0.8) return;
  const fade = opened ? 1 - since / 0.8 : 1;
  VINES.forEach((v, i) => {
    const j = tp > 0 ? PR.jump(tp, i, 1.1, ease.inOut) : 0;
    const an = tp > 0 ? PR.antic(tp, i) : 0;
    const shake = Math.sin(t * 30 + i) * 5 * an;
    const vis = 1 - j;
    ctx.save(); ctx.globalAlpha = fade;
    if (vis > 0.01) {
      const N = 24;
      ctx.beginPath();
      for (let k = 0; k <= N; k++) { const q = vinePoint(d, v, (k / N) * vis, t, i, shake); k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = 10; ctx.strokeStyle = '#3F7D45'; ctx.stroke();
      ctx.lineWidth = 6; ctx.strokeStyle = '#6DB866'; ctx.stroke();
      for (let k = 1; k < 9; k++) {
        const u = k / 9;
        if (u > vis) break;
        const q = vinePoint(d, v, u, t, i, shake), q2 = vinePoint(d, v, u + 0.01, t, i, shake);
        const ang = Math.atan2(q2.y - q.y, q2.x - q.x) + (k % 2 ? 1.2 : -1.2);
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(ang);
        ctx.beginPath(); ctx.ellipse(9, 0, 10, 5, 0, 0, TAU); ctx.fillStyle = k % 3 ? '#7FCB72' : '#5FAE5A'; ctx.fill();
        ctx.restore();
        if (k % 3 === 1) { ctx.beginPath(); ctx.arc(q.x, q.y, 4, 0, TAU); ctx.fillStyle = '#E58BA8'; ctx.fill(); }
      }
    }
    // when a strand lets go, a flower blooms where it was anchored
    if (j > 0) {
      const q = vinePoint(d, v, 0, t, i, 0);
      const s = ease.outBack(clamp(j * 1.3));
      ctx.translate(q.x, q.y); ctx.scale(s, s);
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + i; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 8, Math.sin(a) * 8, 8, 5.5, a, 0, TAU); ctx.fillStyle = '#FF9FB8'; ctx.fill(); }
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fillStyle = '#FFD15C'; ctx.fill();
    }
    ctx.restore();
    if (j > 0 && j < 1) { const q = vinePoint(d, v, vis, t, i, 0); sparkle(ctx, q.x, q.y, 14 * (1 - j), t, '#C8FFB0', 1 - j); }
  });
}

// 4 · the portcullis of the last gate rises a notch every 5 s
function drawPortcullis(ctx, d, t) {
  const tp = t - 90;
  const lv = tp > 0 ? PR.level(tp, 0.8, ease.outBack) : 0;
  let up = 0.15 * lv;
  if (t >= 120) up = lerp(0.75, 1.08, ease.inOut(clamp((t - 120) / 0.6)));
  if (t < 120 && lv > 0) glow(ctx, d.x, d.by - d.h * 0.35, 70 + lv * 22, '#FFE6A0', 0.1 * lv);
  const an = tp > 0 && t < 120 ? Math.max(...[0, 1, 2, 3, 4].map((i) => PR.antic(tp, i))) : 0;
  const shake = Math.sin(t * 40) * 1.5 * an;
  const off = up * d.h + shake;
  ctx.save();
  archPath(ctx, d.x, d.by, d.w + 12, d.h + 8); ctx.clip();
  ctx.translate(0, -off);
  ctx.strokeStyle = '#6B5547'; ctx.lineCap = 'round';
  for (let x = d.x - d.w / 2; x <= d.x + d.w / 2 + 1; x += d.w / 6) {
    ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x, d.by - d.h - 10); ctx.lineTo(x, d.by - 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 5, d.by - 10); ctx.lineTo(x, d.by + 6); ctx.lineTo(x + 5, d.by - 10); ctx.fillStyle = '#E8B04A'; ctx.fill();
  }
  for (let y = d.by - 20; y > d.by - d.h - 10; y -= d.h / 5) {
    ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(d.x - d.w / 2 - 4, y); ctx.lineTo(d.x + d.w / 2 + 4, y); ctx.stroke();
    for (let x = d.x - d.w / 2; x <= d.x + d.w / 2 + 1; x += d.w / 6) { ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fillStyle = '#E8B04A'; ctx.fill(); }
  }
  ctx.restore();
  // a puff of sparkles under the bars at every notch
  if (tp > 0) for (let i = 0; i < 5; i++) {
    const j = PR.jump(tp, i, 0.8, ease.out);
    if (j <= 0 || j >= 1) continue;
    for (let k = 0; k < 6; k++) sparkle(ctx, d.x - d.w / 2 + (k + 0.5) * d.w / 6, d.by - off + 6 - j * 20, 7 * (1 - j), k, '#FFE08A', 1 - j);
  }
}

function pointOnArch(d, u) {
  const r = d.w / 2 + 8, side = d.h - d.w / 2;
  const len = 2 * side + Math.PI * r;
  let s = u * len;
  if (s < side) return { x: d.x - r, y: d.by - s };
  s -= side;
  if (s < Math.PI * r) { const a = Math.PI + s / r; return { x: d.x + Math.cos(a) * r, y: d.by - side + Math.sin(a) * r }; }
  s -= Math.PI * r;
  return { x: d.x + r, y: d.by - side + s };
}

// ---------------- choreography ----------------
const CAM = [
  { t: 0, x: 540, y: 1000, z: 1.0 },
  { t: 2.6, x: 560, y: 990, z: 1.04 },
  { t: 5.6, x: 770, y: 885, z: 1.85 },
  { t: 30.9, x: 770, y: 885, z: 1.85 },
  { t: 34.2, x: 310, y: 885, z: 1.85 },
  { t: 61.1, x: 310, y: 885, z: 1.85 },
  { t: 64.6, x: 500, y: 1308, z: 1.7 },
  { t: 90.9, x: 500, y: 1308, z: 1.7 },
  { t: 94.0, x: 700, y: 1308, z: 1.7 },
  { t: 120.0, x: 700, y: 1308, z: 1.7 },
  { t: 121.3, x: 540, y: 1080, z: 1.0 },
];

const BRAVI_PATH = [
  { t: 0, x: -160, y: 1300 },
  { t: 3.4, x: 690, y: 940, via: { x: 260, y: 640 }, e: ease.out },
  { t: 31.2, x: 690, y: 940 },
  { t: 34.6, x: 392, y: 940, via: { x: 540, y: 720 } },
  { t: 61.3, x: 392, y: 940 },
  { t: 64.4, x: 655, y: 1336, via: { x: 600, y: 1060 } },
  { t: 91.2, x: 655, y: 1336 },
  { t: 94.2, x: 808, y: 1392, via: { x: 700, y: 1250 } },
  { t: 120.15, x: 808, y: 1392 },
  { t: 121.0, x: 1260, y: 980, via: { x: 900, y: 1200 } },
];

function braviState(t) {
  const p = L.pathAt(BRAVI_PATH, t);
  let facing = 1;
  if (t >= 31.2) facing = -1;
  const k = Math.min(3, Math.floor(t / 30)), tp = t - k * 30;
  const target = DOORS[Math.min(3, k)].lock;
  let expr = 'smile', arms = { l: 'hold', r: 'down' }, look = { x: 1, y: 0 }, tilt = 0;
  const flying = (t < 3.4) || (t > 31.2 && t < 34.6) || (t > 61.3 && t < 64.4) || (t > 91.2 && t < 94.2) || t > 120.1;
  if (flying) { expr = 'open'; tilt = facing * 0.12; arms = { l: 'hold', r: 'reach' }; }
  if (k > 0 && tp < 1.6) { expr = 'joy'; arms = { l: 'up', r: 'cheer' }; }
  else if (!flying) {
    if (tp > 4 && tp < 6.2) { arms.r = 'point'; expr = 'open'; }
    else if (tp > 9 && tp < 11.4) { arms.r = 'wave'; look = { x: 0, y: 0.2 }; }
    else if (tp > 15 && tp < 17.2) { arms = { l: 'up', r: 'cheer' }; expr = 'open'; look = { x: 0, y: 0 }; }
    else if (tp > 21 && tp < 23) { expr = 'determined'; arms.r = 'reach'; }
    else if (tp > 26.6) { expr = 'wow'; arms.r = 'reach'; }
  }
  // a little celebration every time a step completes (every 5 s)
  const sb = tp % 5;
  if (!flying && tp > 4.9 && sb < 0.9 && !(k > 0 && tp < 1.6)) { expr = 'joy'; arms = { l: 'hold', r: 'cheer' }; }
  if (t >= BRUSH) { expr = 'joy'; arms = { l: 'up', r: 'cheer' }; }
  // look toward the active target (in local space facing handles the flip)
  if (look.x !== 0) look = { x: (target.x > p.x ? 1 : -1) * facing * 0.9, y: target.y > p.y + 40 ? 0.6 : 0 };
  return { x: p.x, y: p.y, s: 0.72, t, facing, expr, arms, look, tilt, itemGlow: 0.25 + (k >= 3 ? 0.4 : 0) };
}

// key: out of door 1, flies to door 2, turns in its lock at exactly 1:00
const KEY_PATH = [
  { t: 30.1, x: 850, y: 930 },
  { t: 31.2, x: 820, y: 820, e: ease.out },
  { t: 34.4, x: 318, y: 836, via: { x: 560, y: 640 } },
  { t: 58.6, x: 318, y: 836 },
  { t: 59.55, x: 248, y: DOORS[1].lock.y, e: ease.inOut },
];
function drawGoldenKey(ctx, t) {
  if (t < 30.1 || t >= 60.15) return;
  const p = L.pathAt(KEY_PATH, t);
  const hover = t > 34.4 && t < 58.6 ? Math.sin(t * 2.2) * 10 : 0;
  const appear = ease.outBack(clamp((t - 30.1) / 0.6));
  let rot = Math.sin(t * 1.7) * 0.25 - 0.2;
  if (t > 58.6) rot = lerp(rot, 0, clamp((t - 58.6) / 0.6));
  if (t > 59.55) rot = ease.inOut(clamp((t - 59.55) / 0.4)) * (Math.PI / 2);
  // sparkle trail
  for (let i = 1; i < 14; i++) {
    const tb = t - i * 0.06;
    if (tb < 30.1) break;
    const q = L.pathAt(KEY_PATH, tb);
    sparkle(ctx, q.x - 30 + Math.sin(i * 2.1) * 6, q.y + Math.cos(i * 1.7) * 6, 9 * (1 - i / 14), i, '#FFE08A', (1 - i / 14) * 0.9);
  }
  F.drawKey(ctx, p.x, p.y + hover, 0.62 * appear, rot, 1);
}

// The great Courage Shield: revealed at 1:00, brushed back to life 1:00–1:30
const SHIELD_PATH = [
  { t: 60.3, x: 230, y: 930 },
  { t: 61.5, x: 236, y: 840, e: ease.out },
  { t: 64.6, x: 430, y: 1312, via: { x: 330, y: 1010 } },
  { t: 90.6, x: 430, y: 1312 },
  { t: 93.6, x: 540, y: 1232, via: { x: 470, y: 1180 } },
  { t: 120.0, x: 540, y: 1232 },
  { t: 121.2, x: 540, y: 1000 },
];
// The Courage Shield is trapped in a stone crust; every 5 s a piece cracks off
const CRUST = (() => {
  const tl = PR.tiles(907, -78, -92, 156, 186, 3, 4, 0.6);
  const order = tl.map((c, i) => i).sort((a, b) => tl[a].r - tl[b].r);
  order.forEach((ci, n) => { tl[ci].fall = n < 10 ? 60 + 5 * (Math.floor(n / 2) + 1) : 90; });
  return tl;
})();
function crustFill(ctx, c) {
  const g = ctx.createLinearGradient(c.cx - 40, c.cy - 40, c.cx + 40, c.cy + 40);
  g.addColorStop(0, '#C2B6AC'); g.addColorStop(1, '#8F837A');
  ctx.fillStyle = g; ctx.fill();
  const R = rng(Math.floor(c.r * 1e6));
  for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(c.cx + (R() - 0.5) * 40, c.cy + (R() - 0.5) * 40, 1.5 + R() * 3, 0, TAU); ctx.fillStyle = 'rgba(90,75,65,0.35)'; ctx.fill(); }
}
function drawCourageShield(ctx, t) {
  if (t < 60.3) return;
  const p = L.pathAt(SHIELD_PATH, t);
  const appear = ease.outBack(clamp((t - 60.3) / 1.1));
  const tp = t - 60;
  const lv = t < 90 ? PR.level(tp, 0.9, ease.out) : 5;
  const wake = t < 90 ? lv / 5 * 0.7 : 0.7 + 0.3 * clamp((t - 90) / 0.6);
  const sleep = 1 - wake;
  const hover = Math.sin(t * 1.9) * 9;
  const s = appear;
  const cx = p.x, cy = p.y + hover;
  const burst = t >= 90 ? clamp(1 - (t - 90) / 1.6) : 0;
  if (burst > 0) {
    glow(ctx, cx, cy, 420, '#FFE08A', 0.9 * burst);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU, r = 60 + (1 - burst) * 260;
      sparkle(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 14 * burst, a, '#FFE08A', burst);
    }
    const lk = DOORS[2].lock;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = burst;
    ctx.lineCap = 'round'; ctx.lineWidth = 26; ctx.strokeStyle = 'rgba(255,220,120,0.5)';
    ctx.beginPath(); ctx.moveTo(cx, cy + 60); ctx.lineTo(lk.x, lk.y); ctx.stroke();
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke();
    ctx.restore();
  }
  // gentle zzz until it is mostly free
  if (lv < 3.5 && t > 61.5) {
    for (let i = 0; i < 3; i++) {
      const life = ((t * 0.35 + i / 3) % 1);
      L.text(ctx, 'z', cx + 70 + life * 40 + i * 6, cy - 70 - life * 70, { size: 26 + i * 6, weight: 700, color: `rgba(140,150,210,${(1 - life) * (1 - lv / 3.5)})` });
    }
  }
  // the shield underneath gets brighter as the crust comes off
  if (lv > 0) glow(ctx, cx, cy, 160 + lv * 20, '#FFE08A', 0.12 * lv);
  F.drawShield(ctx, cx, cy, 150 * s, 172 * s, { ornate: true, sleep, glow: 0.15 + wake * 0.9, shine: t > 90 ? ((t * 0.35) % 1.6) : undefined });
  // crust pieces: crack lines appear first, then the piece breaks off and falls
  const shake = (() => { let a = 0; for (let i = 0; i < 5; i++) a = Math.max(a, PR.antic(tp, i)); return t < 90 ? Math.max(a, clamp((tp - 28.4) / 1.6)) : 0; })();
  ctx.save();
  ctx.translate(cx + Math.sin(t * 41) * 2.2 * shake, cy);
  ctx.scale(s, s);
  for (const c of CRUST) {
    const since = t - c.fall;
    if (since >= 1.2) continue;
    const u = clamp(since / 1.2);
    ctx.save();
    if (u <= 0) { L.shieldPath(ctx, 0, 0, 158, 180); ctx.clip(); }
    const dx = (c.cx) * 0.6 * u, dy = 260 * u * u;
    ctx.translate(c.cx + dx, c.cy + dy); ctx.rotate((c.r - 0.5) * 2.4 * u); ctx.translate(-c.cx, -c.cy);
    ctx.globalAlpha = 1 - u;
    PR.polyPath(ctx, c.poly);
    if (u > 0) { ctx.save(); L.shieldPath(ctx, 0, 0, 158, 180); ctx.clip(); PR.polyPath(ctx, c.poly); crustFill(ctx, c); ctx.restore(); }
    else crustFill(ctx, c);
    const crackA = clamp((t - (c.fall - 4)) / 3);
    PR.polyPath(ctx, c.poly);
    ctx.lineWidth = 2 + crackA * 2.5; ctx.strokeStyle = `rgba(70,55,48,${0.25 + 0.6 * crackA})`; ctx.stroke();
    if (crackA > 0 && u <= 0) { ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(255,230,150,${0.6 * crackA})`; ctx.stroke(); }
    ctx.restore();
    if (u > 0 && u < 0.6) for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + c.r * 5; sparkle(ctx, c.cx + Math.cos(a) * (10 + u * 60), c.cy + Math.sin(a) * (10 + u * 60), 9 * (1 - u / 0.6), a, '#FFE08A', 1 - u / 0.6); }
  }
  ctx.restore();
}

// the magic toothbrush = the child's brushing inside the story
const BRUSH_PATH = [
  { t: 3.2, x: 1150, y: 1000 },
  { t: 5.0, x: DOORS[0].lock.x - 70, y: DOORS[0].lock.y + 70, e: ease.out },
  { t: 30.4, x: DOORS[0].lock.x - 70, y: DOORS[0].lock.y + 70 },
  { t: 32.6, x: DOORS[1].lock.x + 70, y: DOORS[1].lock.y + 70, via: { x: 540, y: 760 } },
  { t: 61.6, x: DOORS[1].lock.x + 70, y: DOORS[1].lock.y + 70 },
  { t: 64.8, x: 318, y: 1418, via: { x: 300, y: 1100 } },
  { t: 90.4, x: 318, y: 1418 },
  { t: 92.8, x: DOORS[3].lock.x + 80, y: DOORS[3].lock.y + 40, via: { x: 620, y: 1380 } },
  { t: 120.0, x: DOORS[3].lock.x + 80, y: DOORS[3].lock.y + 40 },
  { t: 121.0, x: 1200, y: 900 },
];
function drawMagicBrush(ctx, t) {
  if (t < 3.2 || t > 121) return;
  const p = L.pathAt(BRUSH_PATH, t);
  const k = Math.min(3, Math.floor(t / 30)), tp = t - k * 30;
  const settled = !(t < 5 || (tp < 3 && k > 0) || t > 120);
  const scrub = settled ? Math.sin(t * TAU * 2.2) * 16 : 0;
  const facingLeft = p.x > (k === 2 ? 430 : DOORS[k].lock.x);
  // sparkles flowing from the brush to its target
  if (settled) {
    const tgt = k === 2 ? { x: 430, y: 1312 } : DOORS[k].lock;
    for (let i = 0; i < 10; i++) {
      const life = (t * 0.9 + i / 10) % 1;
      const x = lerp(p.x, tgt.x, life) + Math.sin(life * 9 + i) * 14;
      const y = lerp(p.y - 20, tgt.y, life) - Math.sin(life * Math.PI) * 30;
      sparkle(ctx, x, y, 7 * Math.sin(life * Math.PI), i, '#BFF3FF', 0.9 * Math.sin(life * Math.PI));
    }
    for (let i = 0; i < 6; i++) { // foam bubbles
      const life = (t * 0.7 + i / 6) % 1;
      ctx.beginPath(); ctx.arc(p.x + (facingLeft ? -40 : 40) + Math.sin(i * 3 + t) * 20, p.y - 20 - life * 50, 3 + (i % 3) * 2, 0, TAU);
      ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - life)})`; ctx.fill();
    }
  }
  ctx.save();
  ctx.translate(p.x + scrub, p.y);
  ctx.scale(facingLeft ? -1 : 1, 1);
  ctx.rotate(-0.35 + (settled ? Math.sin(t * TAU * 2.2) * 0.05 : 0));
  F.drawToothbrush(ctx, 0, 0, 0.95, 0, '#2EA59B', t);
  ctx.restore();
}

// ---------------- frame ----------------
function draw(ctx, t) {
  init();
  const cam = L.clampCam(L.camAt(CAM, t));
  // sky
  ctx.drawImage(C.sky, 0, 0);
  // drifting clouds (parallax)
  ctx.save(); L.applyCam(ctx, cam, 0.25);
  [[0, 120, 420, 7], [1, 640, 300, 5], [2, -80, 760, 6], [3, 700, 620, 4], [4, 260, 180, 8]].forEach(([i, x0, y, v]) => {
    const spr = C.clouds[i];
    const x = ((x0 + t * v + 400) % (W + 800)) - 400;
    ctx.globalAlpha = 0.92; ctx.drawImage(spr, x, y);
  });
  ctx.restore();
  // hills
  ctx.save(); L.applyCam(ctx, cam, 0.6); ctx.drawImage(C.hills, -200, 1100); ctx.restore();

  // castle world layer
  ctx.save();
  L.applyCam(ctx, cam, 1);
  // tower flags
  flag(ctx, TOWER_L.apex, t, '#FF7F7A'); flag(ctx, TOWER_R.apex, t + 0.7, '#FFC14D'); flag(ctx, CTOWER.apex, t + 1.3, '#7FD3C4');
  ctx.drawImage(C.castle, 0, 0, W, H);
  // windows light up during the final mission, then all at once at 2:00
  const LIT = [95, 100, 95, 100, 105, 105, 110];
  const lit = (i) => clamp((t - LIT[i]) / 0.6);
  WINDOWS.forEach((w, i) => {
    const a = Math.max(lit(i), clamp((t - 120.2) / 0.5));
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    archPath(ctx, w.x, w.y + w.h / 2, w.w, w.h);
    const g = ctx.createLinearGradient(0, w.y - w.h / 2, 0, w.y + w.h / 2); g.addColorStop(0, '#FFF4C8'); g.addColorStop(1, '#FFB648');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(200,130,60,0.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(w.x, w.y - w.h / 2); ctx.lineTo(w.x, w.y + w.h / 2); ctx.moveTo(w.x - w.w / 2, w.y + 6); ctx.lineTo(w.x + w.w / 2, w.y + 6); ctx.stroke();
    ctx.restore();
    glow(ctx, w.x, w.y, 90, '#FFD27A', 0.5 * a);
  });
  const heartWin = clamp((t - 120.4) / 0.6);
  if (heartWin > 0) {
    ctx.save(); ctx.globalAlpha = heartWin;
    ctx.beginPath(); ctx.arc(ROUND_WIN.x, ROUND_WIN.y, ROUND_WIN.r, 0, TAU); ctx.fillStyle = '#FFE9A8'; ctx.fill();
    L.heartPath(ctx, ROUND_WIN.x, ROUND_WIN.y + 2, 22); ctx.fillStyle = '#FF6B66'; ctx.fill();
    ctx.restore();
    glow(ctx, ROUND_WIN.x, ROUND_WIN.y, 200, '#FFD27A', 0.8 * heartWin);
  }
  banner(ctx, t);
  // doors
  DOORS.forEach((d, i) => {
    const active = t >= (d.open - 30) && t < d.open;
    const progress = active ? clamp((t - (d.open - 30)) / 30) : 0;
    drawDoor(ctx, d, t, active, progress);
  });
  drawCourageShield(ctx, t);
  drawGoldenKey(ctx, t);
  // castle "starts glowing" in the last mission: sparkles climb the walls
  if (t > 90) {
    const n = Math.floor(lerp(4, 30, clamp((t - 90) / 30)));
    for (let i = 0; i < n; i++) {
      const life = (t * 0.25 + hash(i * 13)) % 1;
      const x = 160 + hash(i * 3) * 760, y = 1600 - life * 900;
      sparkle(ctx, x, y, 6 + 4 * Math.sin(life * Math.PI), i, '#FFE08A', Math.sin(life * Math.PI) * 0.8);
    }
  }
  ctx.drawImage(C.ground, 0, 1500, W, 420);
  // floating motes
  for (let i = 0; i < 24; i++) {
    const x = (hash(i) * 1200 + t * (8 + hash(i + 50) * 10)) % 1200 - 60;
    const y = 500 + hash(i + 9) * 1300 + Math.sin(t * 0.7 + i) * 30;
    const a = 0.35 + 0.35 * Math.sin(t * 1.3 + i * 2);
    glow(ctx, x, y, 14, '#FFF3C4', a);
  }
  drawMagicBrush(ctx, t);
  // Bravi + sparkle trail
  const st = braviState(t);
  for (let i = 1; i < 12; i++) {
    const tb = t - i * 0.07;
    const q = L.pathAt(BRAVI_PATH, tb);
    const moving = Math.hypot(q.x - st.x, q.y - st.y) > 4;
    if (!moving) continue;
    sparkle(ctx, q.x + Math.sin(i * 1.7) * 10, q.y - 30 + Math.cos(i * 2.3) * 10, 10 * (1 - i / 12), i, SP.aura, (1 - i / 12));
  }
  if (t < 121.0) F.drawFairy(ctx, SP, st);
  ctx.restore();

}

module.exports = { draw, init, DOORS };
