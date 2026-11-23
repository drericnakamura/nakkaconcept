// Brushing HUD — identical layout for every fairy (only the theme changes).
// Top-left: mouth map (mirror view). Top-centre: mission 1/4 + surfaces.
// Top-right corner: the 30 → 1 countdown ring. Driven only by phaseInfo(t).
'use strict';
const L = require('./lib');
const F = require('./fairy');
const { TAU, clamp, lerp, ease, rgba, glow, sparkle } = L;
const { QUADS, SURFACES, phaseInfo, BRUSH } = require('./timeline');

const THEMES = {
  bravi: { accent: '#FF7A57', accentDeep: '#D94F3C', accent2: '#F7C548', soft: '#FFE3D6', ink: '#3B2A57', pip: 'door', brush: '#2EA59B' },
  lumi: { accent: '#8C7BF0', accentDeep: '#5B47C9', accent2: '#FFD77A', soft: '#ECE7FF', ink: '#2E2457', pip: 'star', brush: '#8C7BF0' },
};

const CARD = { y: 52, h: 316, r: 46 };
const MOUTH = { x: 34, w: 318 };
const MID = { x: 366, w: 348 };
const TIMER = { cx: 882, cy: 210, R: 152 };

let baseCache = {};
function base(theme) {
  if (baseCache[theme.accent]) return baseCache[theme.accent];
  const c = L.makeCanvas(1080, 420), x = c.getContext('2d');
  const card = (cx, w) => {
    x.save();
    x.shadowColor = 'rgba(50,25,70,0.28)'; x.shadowBlur = 34; x.shadowOffsetY = 10;
    L.roundRect(x, cx, CARD.y, w, CARD.h, CARD.r);
    x.fillStyle = 'rgba(255,253,248,0.95)'; x.fill();
    x.restore();
    L.roundRect(x, cx, CARD.y, w, CARD.h, CARD.r);
    const g = x.createLinearGradient(0, CARD.y, 0, CARD.y + CARD.h);
    g.addColorStop(0, 'rgba(255,255,255,0.0)'); g.addColorStop(1, rgba(theme.soft, 0.55));
    x.fillStyle = g; x.fill();
    x.lineWidth = 4; x.strokeStyle = rgba(theme.accent, 0.3); x.stroke();
  };
  card(MOUTH.x, MOUTH.w);
  card(MID.x, MID.w);
  // timer disc
  x.save();
  x.shadowColor = 'rgba(50,25,70,0.3)'; x.shadowBlur = 34; x.shadowOffsetY = 10;
  x.beginPath(); x.arc(TIMER.cx, TIMER.cy, TIMER.R, 0, TAU); x.fillStyle = '#FFFDF8'; x.fill();
  x.restore();
  x.beginPath(); x.arc(TIMER.cx, TIMER.cy, TIMER.R, 0, TAU); x.lineWidth = 4; x.strokeStyle = rgba(theme.accent, 0.3); x.stroke();
  // ring track
  x.beginPath(); x.arc(TIMER.cx, TIMER.cy, TIMER.R - 32, 0, TAU);
  x.lineWidth = 30; x.strokeStyle = rgba(theme.accent, 0.14); x.stroke();
  baseCache[theme.accent] = c;
  return c;
}

// ---------------- mouth map ----------------
// teeth positions relative to mouth centre. x>0 = child's right (mirror view)
const TEETH = (() => {
  const xs = [-86, -55, -19, 19, 55, 86];
  const up = xs.map((x) => ({ x, y: -56 + Math.pow(Math.abs(x) / 86, 2) * 16, w: Math.abs(x) < 30 ? 34 : 30, h: Math.abs(x) < 30 ? 36 : 31, upper: true, right: x > 0 }));
  const lo = xs.map((x) => ({ x, y: 54 - Math.pow(Math.abs(x) / 86, 2) * 16, w: Math.abs(x) < 30 ? 31 : 29, h: Math.abs(x) < 30 ? 31 : 29, upper: false, right: x > 0 }));
  return [...up, ...lo];
})();
const qIndex = (tooth) => QUADS.findIndex((q) => q.upper === tooth.upper && q.right === tooth.right);
function quadCentre(q) {
  const ts = TEETH.filter((t) => t.upper === q.upper && t.right === q.right);
  return { x: ts.reduce((a, b) => a + b.x, 0) / ts.length, y: ts.reduce((a, b) => a + b.y, 0) / ts.length };
}

function drawTooth(ctx, tx, ty, w, h, upper, fill, stroke) {
  ctx.save();
  ctx.translate(tx, ty);
  if (!upper) ctx.scale(1, -1);
  // rounded tooth: flat-ish top at gum, rounded bite edge
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(w / 2, -h / 2);
  ctx.bezierCurveTo(w / 2 + 2, h * 0.1, w * 0.42, h / 2, 0, h / 2);
  ctx.bezierCurveTo(-w * 0.42, h / 2, -w / 2 - 2, h * 0.1, -w / 2, -h / 2);
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = stroke; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.ellipse(-w * 0.18, -h * 0.05, w * 0.09, h * 0.2, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawMouth(ctx, theme, t, info) {
  const cx = MOUTH.x + MOUTH.w / 2, cy = 176;
  const k = info.k, done = info.done;
  // active-quadrant halo
  if (!done) {
    const qc = quadCentre(QUADS[k]);
    const pulse = 0.75 + 0.25 * Math.sin(t * TAU * 0.9);
    glow(ctx, cx + qc.x, cy + qc.y, 120, theme.accent2, 0.55 * pulse, 'source-over');
  }
  // lips
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy, 132, 102, 0, 0, TAU);
  const lg = ctx.createLinearGradient(0, cy - 100, 0, cy + 100);
  lg.addColorStop(0, '#FF9FAF'); lg.addColorStop(1, '#F07C93');
  ctx.fillStyle = lg; ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = '#D35F7A'; ctx.stroke();
  // cavity
  ctx.beginPath(); ctx.ellipse(cx, cy, 114, 84, 0, 0, TAU);
  const cg = ctx.createRadialGradient(cx, cy, 10, cx, cy, 110);
  cg.addColorStop(0, '#5E1F3C'); cg.addColorStop(1, '#8A3556');
  ctx.fillStyle = cg; ctx.fill();
  ctx.save(); ctx.clip();
  // tongue
  ctx.beginPath(); ctx.ellipse(cx, cy + 44, 70, 34, 0, 0, TAU); ctx.fillStyle = '#F2909F'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx, cy + 20); ctx.lineTo(cx, cy + 50); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(200,90,110,0.6)'; ctx.stroke();
  // gums
  ctx.fillStyle = '#F7A3B4';
  ctx.beginPath(); ctx.ellipse(cx, cy - 80, 120, 30, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, cy + 80, 120, 30, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.restore();

  // teeth
  TEETH.forEach((tooth, i) => {
    const qi = qIndex(tooth);
    let fill = '#ECE6EE', stroke = '#C9BCD3';
    if (done || qi < k) { fill = '#FFFFFF'; stroke = '#BFD9E8'; }
    if (!done && qi === k) {
      fill = L.mixHex('#FFFFFF', theme.accent2, 0.55 + 0.2 * Math.sin(t * TAU * 0.9));
      stroke = theme.accentDeep;
    }
    // next quadrant blinks softly during the last 3 seconds
    if (!done && qi === k + 1 && info.remain < 3) {
      const b = 0.5 + 0.5 * Math.sin(t * TAU * 2);
      fill = L.mixHex('#ECE6EE', theme.accent2, 0.45 * b);
      stroke = L.mixHex('#C9BCD3', theme.accentDeep, b);
    }
    drawTooth(ctx, cx + tooth.x, cy + tooth.y, tooth.w, tooth.h, tooth.upper, fill, stroke);
    if (done || qi < k) {
      const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.9);
      sparkle(ctx, cx + tooth.x + 8, cy + tooth.y + (tooth.upper ? -6 : 6), 4 + tw * 4, 0, '#BFF3FF', tw, false);
    }
  });
  // midline (mirror view)
  ctx.save();
  ctx.setLineDash([6, 8]); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.moveTo(cx, cy - 88); ctx.lineTo(cx, cy + 88); ctx.stroke();
  ctx.restore();

  // the toothbrush glides from the old quadrant to the new one, then scrubs
  if (!done) {
    const cur = quadCentre(QUADS[k]);
    let p = { ...cur };
    const moveT = clamp(info.tp / 0.7);
    if (k > 0 && moveT < 1) {
      const prev = quadCentre(QUADS[k - 1]);
      const u = ease.inOut(moveT);
      p = { x: lerp(prev.x, cur.x, u), y: lerp(prev.y, cur.y, u) };
    }
    const scrub = Math.sin(t * TAU * 2.2) * 12;
    const q = QUADS[k];
    const dirX = q.right ? -1 : 1;           // handle points out of the mouth
    const dirY = q.upper ? 1 : -1;           // bristles face the teeth
    const s = 0.72;
    const ox = cx + p.x - dirX * 50 * s + scrub, oy = cy + p.y + (q.upper ? 34 : -34);
    ctx.save();
    ctx.translate(ox, oy); ctx.scale(dirX, dirY);
    F.drawToothbrush(ctx, 0, 0, s, 0, theme.brush, t, { glow: false });
    ctx.restore();
    // foam bubbles
    for (let i = 0; i < 6; i++) {
      const life = (t * 0.8 + i / 6) % 1;
      const bx2 = cx + p.x + Math.sin(i * 2.3 + t * 1.3) * 34;
      const by2 = cy + p.y + (q.upper ? 18 : -18) + (q.upper ? 1 : -1) * life * 22;
      ctx.beginPath(); ctx.arc(bx2, by2, 2.5 + (i % 3) * 1.8, 0, TAU);
      ctx.fillStyle = `rgba(255,255,255,${0.8 * Math.sin(life * Math.PI)})`; ctx.fill();
    }
  }
  // completion bursts on the finished quadrant
  if (info.k > 0 || done) {
    const prevK = done ? 3 : k - 1;
    const since = done ? info.tp : info.tp;
    if (since < 1.2) {
      const qc = quadCentre(QUADS[prevK]);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + 0.3;
        const r = 20 + ease.out(since / 1.2) * 90;
        sparkle(ctx, cx + qc.x + Math.cos(a) * r, cy + qc.y + Math.sin(a) * r * 0.8, 9 * (1 - since / 1.2), a, theme.accent2, 1 - since / 1.2);
      }
    }
  }
  // label
  const label = done ? 'ALL CLEAN!' : QUADS[k].label;
  const pop = done ? 1 : 1 + 0.18 * (1 - ease.out(clamp(info.tp / 0.45)));
  ctx.save();
  ctx.translate(cx, 330); ctx.scale(pop, pop);
  L.text(ctx, label, 0, 0, { size: 33, weight: 700, color: theme.ink, letterSpacing: 1 });
  ctx.restore();
}

// ---------------- middle: mission + surfaces ----------------
function pipIcon(ctx, theme, x, y, state, frac, t, i) {
  // state: 'done' | 'active' | 'todo'
  ctx.save();
  ctx.translate(x, y);
  if (state === 'active') { const p = 1 + 0.06 * Math.sin(t * TAU * 1.1); ctx.scale(p, p); }
  if (theme.pip === 'star') {
    if (state === 'done') glow(ctx, 0, 0, 60, theme.accent2, 0.7);
    L.starPath(ctx, 0, 0, 29 * 0.86, 29 * 0.47); ctx.lineJoin = 'round';
    ctx.lineWidth = 9; ctx.strokeStyle = state === 'todo' ? '#E5E0EE' : state === 'done' ? '#FFD66B' : rgba(theme.accent2, 0.35); ctx.stroke();
    ctx.fillStyle = state === 'todo' ? '#E5E0EE' : state === 'done' ? '#FFD66B' : rgba(theme.accent2, 0.35); ctx.fill();
    if (state === 'active') {
      ctx.save();
      ctx.beginPath(); ctx.rect(-40, 34 - frac * 68, 80, 80); ctx.clip();
      L.starPath(ctx, 0, 0, 29 * 0.86, 29 * 0.47); ctx.lineWidth = 9; ctx.strokeStyle = '#FFD66B'; ctx.stroke(); ctx.fillStyle = '#FFD66B'; ctx.fill();
      ctx.restore();
    }
    L.starPath(ctx, 0, 0, 29 * 0.86, 29 * 0.47); ctx.lineWidth = 2.5; ctx.strokeStyle = state === 'todo' ? '#CFC6DE' : '#D69A2D'; ctx.stroke();
  } else {
    // little arched door
    const w = 44, h = 56;
    const door = () => { ctx.beginPath(); ctx.moveTo(-w / 2, h / 2); ctx.lineTo(-w / 2, -h / 2 + w / 2); ctx.arc(0, -h / 2 + w / 2, w / 2, Math.PI, 0); ctx.lineTo(w / 2, h / 2); ctx.closePath(); };
    if (state === 'done') {
      glow(ctx, 0, 0, 62, theme.accent2, 0.75);
      door(); ctx.fillStyle = '#FFE9A3'; ctx.fill();
      ctx.save(); door(); ctx.clip();
      ctx.beginPath(); ctx.moveTo(-w / 2, -h); ctx.lineTo(-w / 2 + 12, -h / 2 + 6); ctx.lineTo(-w / 2 + 12, h); ctx.lineTo(-w / 2, h);
      ctx.fillStyle = '#B9733E'; ctx.fill(); ctx.restore();
      door(); ctx.lineWidth = 4; ctx.strokeStyle = '#B9822A'; ctx.stroke();
    } else {
      door(); ctx.fillStyle = state === 'todo' ? '#E9E2EE' : '#E8C9A8'; ctx.fill();
      if (state === 'active') {
        ctx.save(); door(); ctx.clip();
        ctx.fillStyle = '#C9844B'; ctx.fillRect(-w, h / 2 - frac * h, w * 2, h * 2);
        ctx.restore();
      }
      door(); ctx.lineWidth = 4; ctx.strokeStyle = state === 'todo' ? '#CFC6DE' : '#9A5A2E'; ctx.stroke();
      ctx.beginPath(); ctx.arc(9, 6, 3.5, 0, TAU); ctx.fillStyle = state === 'todo' ? '#CFC6DE' : '#F7C548'; ctx.fill();
    }
  }
  ctx.restore();
}

function drawMid(ctx, theme, t, info) {
  const cx = MID.x + MID.w / 2;
  const k = info.k, done = info.done;
  L.text(ctx, 'MISSION', cx, 92, { size: 26, weight: 600, color: rgba(theme.ink, 0.6), letterSpacing: 4 });
  const n = done ? 4 : k + 1;
  const pop = 1 + 0.3 * (1 - ease.outBack(clamp(info.tp / 0.5)));
  ctx.save(); ctx.translate(cx, 142); ctx.scale(pop, pop);
  L.text(ctx, `${n}/4`, 0, 0, { size: 66, weight: 700, color: theme.accentDeep });
  ctx.restore();
  for (let i = 0; i < 4; i++) {
    const state = done || i < k ? 'done' : i === k ? 'active' : 'todo';
    pipIcon(ctx, theme, cx + (i - 1.5) * 78, 216, state, info.frac, t, i);
    // pop burst when a pip completes
    if (state === 'done' && ((!done && i === k - 1) || (done && i === 3)) && info.tp < 0.9) {
      const u = info.tp / 0.9;
      for (let j = 0; j < 8; j++) {
        const a = (j / 8) * TAU;
        sparkle(ctx, cx + (i - 1.5) * 78 + Math.cos(a) * (16 + u * 46), 216 + Math.sin(a) * (16 + u * 46), 7 * (1 - u), a, theme.accent2, 1 - u);
      }
    }
  }
  // surfaces: outside → inside → tops, 10 s each
  for (let i = 0; i < 3; i++) {
    const px = cx + (i - 1) * 112, py = 304;
    const active = !done && info.surf === i;
    const past = done || (!done && info.surf > i);
    const since = info.tp - i * 10;
    const pop2 = active ? 1.06 + 0.1 * (1 - ease.out(clamp(since / 0.4))) : 1;
    ctx.save(); ctx.translate(px, py); ctx.scale(pop2, pop2);
    L.roundRect(ctx, -52, -24, 104, 48, 24);
    ctx.fillStyle = active ? theme.accent : past ? rgba(theme.accent, 0.18) : 'rgba(120,100,150,0.10)'; ctx.fill();
    if (active) { // 10-second fill inside the pill
      ctx.save(); L.roundRect(ctx, -52, -24, 104, 48, 24); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(-52, -24, 104 * clamp(since / 10), 48);
      ctx.restore();
    }
    L.text(ctx, SURFACES[i], 0, 1, { size: 22, weight: 700, color: active ? '#ffffff' : past ? theme.accentDeep : rgba(theme.ink, 0.45), letterSpacing: 0.5 });
    ctx.restore();
  }
}

// ---------------- timer ----------------
function drawTimer(ctx, theme, t, info) {
  const { cx, cy, R } = TIMER;
  const rr = R - 32;
  const done = info.done;
  const last3 = !done && info.remain < 3;
  const pulse = last3 ? 1 + 0.035 * Math.sin(t * TAU * 2) : 1;
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(pulse, pulse); ctx.translate(-cx, -cy);
  const frac = done ? 1 : info.remain / 30;
  // ring
  const a0 = -Math.PI / 2, a1 = a0 + TAU * frac;
  const g = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  const c1 = last3 ? '#FFC23D' : theme.accent2, c2 = last3 ? '#FF8A3D' : theme.accent;
  g.addColorStop(0, done ? '#FFD66B' : c1); g.addColorStop(1, done ? '#F5A623' : c2);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, rr, a0, a1); ctx.lineWidth = 30; ctx.strokeStyle = g; ctx.stroke();
  // inner highlight on the ring
  ctx.beginPath(); ctx.arc(cx, cy, rr - 6, a0, a1); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.stroke();
  // leading sparkle
  if (!done) {
    const hx = cx + Math.cos(a1) * rr, hy = cy + Math.sin(a1) * rr;
    sparkle(ctx, hx, hy, 15 + 3 * Math.sin(t * 8), t * 2, '#FFF4C2', 1);
  }
  // phase-start flash
  const flash = done ? clamp(1 - info.tp / 0.8) : clamp(1 - info.tp / 0.6);
  if (flash > 0 && (info.k > 0 || done)) glow(ctx, cx, cy, R * 1.5, theme.accent2, 0.6 * flash);
  if (done) {
    // big check mark
    const u = ease.outBack(clamp(info.tp / 0.6));
    ctx.save(); ctx.translate(cx, cy - 8); ctx.scale(u, u);
    ctx.beginPath(); ctx.moveTo(-42, 4); ctx.lineTo(-12, 34); ctx.lineTo(46, -30);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = 26; ctx.strokeStyle = '#2FBF8F'; ctx.stroke();
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.stroke();
    ctx.restore();
    L.text(ctx, 'DONE!', cx, cy + 66, { size: 32, weight: 700, color: '#2FBF8F', letterSpacing: 2 });
  } else {
    const pop = 1 + 0.22 * (1 - ease.out(clamp((info.tp % 1) / 0.25))) * (info.secs >= 28 || info.secs <= 3 ? 1 : 0.35);
    ctx.save(); ctx.translate(cx, cy - 6); ctx.scale(pop, pop);
    L.text(ctx, String(info.secs), 0, 0, { size: 132, weight: 700, color: last3 ? '#E0632F' : theme.ink });
    ctx.restore();
    L.text(ctx, 'seconds', cx, cy + 70, { size: 26, weight: 600, color: rgba(theme.ink, 0.55), letterSpacing: 1 });
  }
  ctx.restore();
}

function drawHUD(ctx, themeId, t) {
  const theme = THEMES[themeId];
  const info = phaseInfo(t);
  ctx.save();
  ctx.drawImage(base(theme), 0, 0);
  drawMouth(ctx, theme, t, info);
  drawMid(ctx, theme, t, info);
  drawTimer(ctx, theme, t, info);
  ctx.restore();
}

module.exports = { drawHUD, THEMES, TIMER };
