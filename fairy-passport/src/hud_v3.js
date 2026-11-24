// HUD v3 (for alignment): occlusal "odontogram" map with a turquoise
// "brush here" signal shared by every fairy, and the tooth coach in side view.
// The countdown ring and mission row are the same as v2.
'use strict';
const L = require('./lib');
const T = require('./teeth');
const H1 = require('./hud');
const H2 = require('./hud_v2');
const { TAU, clamp, ease, rgba, sparkle } = L;
const { QUADS, STEPS, phaseInfo } = require('./timeline');
const { THEMES, MOUTH, MID } = H1;

// one colour for "brush here" in every Fairy Passport video
const HL = '#16BCC4', HL_DEEP = '#0A7C84';

function drawMap(ctx, theme, t, info) {
  const cx = MOUTH.x + MOUTH.w / 2, cy = 194;
  const done = info.done;
  ctx.save();
  L.roundRect(ctx, MOUTH.x + 4, 56, MOUTH.w - 8, 268, 40); ctx.clip();   // keep the spotlight inside the card
  if (done) {
    T.drawArchesTop(ctx, cx, cy, { k: 0.74, done: QUADS, t, spot: false });
  } else {
    const st = STEPS[info.step];
    T.drawArchesTop(ctx, cx, cy, {
      k: 0.74, quad: QUADS[info.k], group: st.teeth, surf: st.surf, hl: HL, hlDeep: HL_DEEP, t,
      done: QUADS.slice(0, info.k), brushColor: theme.accent,
    });
  }
  ctx.restore();
  const pop = done ? 1 : 1 + 0.18 * (1 - ease.out(clamp(info.tp / 0.45)));
  ctx.save(); ctx.translate(cx, 344); ctx.scale(pop, pop);
  L.text(ctx, done ? 'ALL CLEAN!' : QUADS[info.k].label, 0, 0, { size: 27, weight: 700, color: theme.ink, letterSpacing: 1 });
  ctx.restore();
}

function motionArrow(ctx, motion, x, y, col) {
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (motion === 'circles') { ctx.beginPath(); ctx.arc(x, y, 13, 0.3, TAU - 0.5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 13, y - 9); ctx.lineTo(x + 14, y + 3); ctx.lineTo(x + 3, y - 1); ctx.stroke(); }
  if (motion === 'updown') { ctx.beginPath(); ctx.moveTo(x, y - 17); ctx.lineTo(x, y + 17); ctx.moveTo(x - 7, y - 10); ctx.lineTo(x, y - 17); ctx.lineTo(x + 7, y - 10); ctx.moveTo(x - 7, y + 10); ctx.lineTo(x, y + 17); ctx.lineTo(x + 7, y + 10); ctx.stroke(); }
  if (motion === 'scrub') { ctx.beginPath(); ctx.moveTo(x - 24, y); ctx.lineTo(x + 24, y); ctx.moveTo(x - 17, y - 7); ctx.lineTo(x - 24, y); ctx.lineTo(x - 17, y + 7); ctx.moveTo(x + 17, y - 7); ctx.lineTo(x + 24, y); ctx.lineTo(x + 17, y + 7); ctx.stroke(); }
  ctx.restore();
}

function drawCoach(ctx, theme, t, info) {
  const cx = MID.x + MID.w / 2;
  const k = info.k, done = info.done;
  L.text(ctx, `MISSION ${done ? 4 : k + 1}/4`, MID.x + 30, 88, { size: 27, weight: 700, color: theme.accentDeep, align: 'left' });
  for (let i = 0; i < 4; i++) {
    const state = done || i < k ? 'done' : i === k ? 'active' : 'todo';
    ctx.save(); ctx.translate(MID.x + 222 + i * 32, 88); ctx.scale(0.48, 0.48);
    H1.pipIcon(ctx, theme, 0, 0, state, info.frac, t, i);
    ctx.restore();
  }
  const panel = { x: cx, y: 214, w: 304, h: 180 };
  ctx.save(); L.roundRect(ctx, panel.x - panel.w / 2, panel.y - panel.h / 2, panel.w, panel.h, 26); ctx.fillStyle = '#FFF6F8'; ctx.fill(); ctx.restore();
  if (done) {
    T.drawCoachProfile(ctx, panel.x, panel.y, { kind: 'molar', upper: false, surf: 'none', t, theme: { accent2: HL, brush: theme.accent }, clip: panel, scale: 0.6, brush: false });
    for (let i = 0; i < 6; i++) sparkle(ctx, cx + Math.cos(i * 1.3 + t) * 60, panel.y - 20 + Math.sin(i * 2 + t) * 40, 8, i, '#BFF3FF', 0.9);
    L.text(ctx, 'SPARKLING CLEAN!', cx, 330, { size: 25, weight: 700, color: theme.ink });
    return;
  }
  const st = STEPS[info.step];
  const q = QUADS[k];
  const kind = st.teeth === 'front' ? 'incisor' : 'molar';
  const surf = st.surf === 'all' ? 'outside' : st.surf;
  T.drawCoachProfile(ctx, panel.x, panel.y + (q.upper ? -6 : 10), { kind, upper: q.upper, surf, motion: st.motion, t, theme: { accent2: HL, brush: theme.accent }, clip: { w: panel.w, h: panel.h }, scale: 0.8 });
  const ax = surf === 'inside' ? cx + 118 : surf === 'top' ? cx + 100 : cx - 118;
  const ay = surf === 'top' ? panel.y - (q.upper ? -52 : 52) : panel.y;
  motionArrow(ctx, st.motion, ax, ay, HL_DEEP);
  if (st.surf === 'all') for (let i = 0; i < 5; i++) { const a = t * 2 + i * 1.26; sparkle(ctx, cx + Math.cos(a) * 70, panel.y + Math.sin(a) * 50, 7, a, '#BFF3FF', 0.9); }
  const pop = 1 + 0.2 * (1 - ease.out(clamp(info.ts / 0.4)));
  ctx.save(); ctx.translate(cx, 330); ctx.scale(pop, pop);
  L.text(ctx, st.label, 0, 0, { size: 25, weight: 700, color: theme.ink, letterSpacing: 0.5 });
  ctx.restore();
}

// ---------- wide layout: one big map card + the ring ----------
const WIDE = { x: 34, y: 52, w: 680, h: 316, r: 46 };
const baseWide = {};
function wideBase(theme) {
  if (baseWide[theme.accent]) return baseWide[theme.accent];
  const c = L.makeCanvas(1080, 420), x = c.getContext('2d');
  x.drawImage(H1.base(theme), 0, 0);                   // keeps the timer disc
  x.clearRect(0, 0, 730, 420);
  x.save(); x.shadowColor = 'rgba(50,25,70,0.28)'; x.shadowBlur = 34; x.shadowOffsetY = 10;
  L.roundRect(x, WIDE.x, WIDE.y, WIDE.w, WIDE.h, WIDE.r); x.fillStyle = 'rgba(255,253,248,0.96)'; x.fill(); x.restore();
  L.roundRect(x, WIDE.x, WIDE.y, WIDE.w, WIDE.h, WIDE.r); x.lineWidth = 4; x.strokeStyle = rgba(theme.accent, 0.3); x.stroke();
  // soft divider between map and text
  x.beginPath(); x.moveTo(392, 84); x.lineTo(392, 336); x.lineWidth = 2; x.strokeStyle = rgba(theme.ink, 0.08); x.stroke();
  baseWide[theme.accent] = c;
  return c;
}
const MOTION_WORD = { circles: 'little circles', updown: 'up and down', scrub: 'back and forth' };
const SURF_WORD = { outside: 'OUTSIDE', inside: 'INSIDE', top: 'ON TOP', all: 'ALL OVER' };
const TEETH_WORD = { back: 'BACK TEETH', front: 'FRONT TEETH', all: 'EVERY TOOTH' };
function drawWide(ctx, theme, t, info) {
  const done = info.done;
  // map
  ctx.save(); L.roundRect(ctx, WIDE.x + 4, WIDE.y + 4, 352, WIDE.h - 8, 42); ctx.clip();
  const mcx = WIDE.x + 180, mcy = WIDE.y + WIDE.h / 2;
  if (done) T.drawArchesTop(ctx, mcx, mcy, { k: 0.98, done: QUADS, t, spot: false });
  else {
    const st = STEPS[info.step];
    T.drawArchesTop(ctx, mcx, mcy, { k: 0.98, quad: QUADS[info.k], group: st.teeth, surf: st.surf, hl: HL, hlDeep: HL_DEEP, t, done: QUADS.slice(0, info.k), brushColor: theme.accent });
  }
  ctx.restore();
  // text column
  const x0 = 418, cx = 560;
  L.text(ctx, `MISSION ${done ? 4 : info.k + 1}/4`, x0, 96, { size: 26, weight: 700, color: theme.accentDeep, align: 'left' });
  for (let i = 0; i < 4; i++) {
    const state = done || i < info.k ? 'done' : i === info.k ? 'active' : 'todo';
    ctx.save(); ctx.translate(x0 + 184 + i * 28, 96); ctx.scale(0.42, 0.42); H1.pipIcon(ctx, theme, 0, 0, state, info.frac, t, i); ctx.restore();
  }
  if (done) {
    L.text(ctx, 'ALL CLEAN!', cx, 200, { size: 46, weight: 700, color: theme.ink });
    L.text(ctx, 'sparkling smile', cx, 250, { size: 26, weight: 600, color: HL_DEEP });
    return;
  }
  const st = STEPS[info.step];
  const pop = 1 + 0.16 * (1 - ease.out(clamp(info.ts / 0.4)));
  L.text(ctx, QUADS[info.k].label, x0, 148, { size: 24, weight: 700, color: rgba(theme.ink, 0.55), align: 'left', letterSpacing: 1 });
  ctx.save(); ctx.translate(x0, 0);
  ctx.save(); ctx.translate(0, 198); ctx.scale(pop, pop);
  L.text(ctx, st.surf === 'all' ? 'SPARKLE' : TEETH_WORD[st.teeth], 0, 0, { size: 40, weight: 700, color: theme.ink, align: 'left' });
  ctx.restore();
  ctx.save(); ctx.translate(0, 248); ctx.scale(pop, pop);
  L.text(ctx, st.surf === 'all' ? 'FINISH' : SURF_WORD[st.surf], 0, 0, { size: 40, weight: 700, color: HL_DEEP, align: 'left' });
  ctx.restore();
  ctx.restore();
  // how to move the brush
  motionArrow(ctx, st.motion, x0 + 20, 310, HL_DEEP);
  L.text(ctx, MOTION_WORD[st.motion], x0 + 50, 311, { size: 24, weight: 600, color: rgba(theme.ink, 0.7), align: 'left' });
}

function drawHUD(ctx, id, t) {
  const theme = THEMES[id];
  const info = phaseInfo(t);
  if (process.env.FP_HUD_LAYOUT === 'cards') {
    ctx.drawImage(H1.base(theme), 0, 0);
    drawMap(ctx, theme, t, info);
    drawCoach(ctx, theme, t, info);
  } else {
    ctx.drawImage(wideBase(theme), 0, 0);
    drawWide(ctx, theme, t, info);
  }
  H2.drawRing(ctx, theme, t, info, id);
}

module.exports = { drawHUD, HL, HL_DEEP };
