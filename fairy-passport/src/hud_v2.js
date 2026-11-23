// HUD v2 (storyboard prototype): a coaching step every 5 seconds.
// Left: mouth map, only the teeth of the current step light up.
// Centre: the "tooth coach" — one big tooth in profile showing where the brush
// goes (cheek side / tongue side / on top) and how it moves.
// Right corner: the countdown ring cut into six 5 s segments; a gem lights at
// the end of every step.
'use strict';
const L = require('./lib');
const F = require('./fairy');
const H1 = require('./hud');
const { TAU, clamp, lerp, ease, rgba, glow, sparkle } = L;
const { QUADS, STEPS, phaseInfo } = require('./timeline');
const { THEMES, TIMER, MOUTH, MID } = H1;

const isBack = (tooth) => Math.abs(tooth.x) > 70;

function groupCentre(q, teeth) {
  const ts = H1.TEETH.filter((t) => t.upper === q.upper && t.right === q.right && (teeth === 'all' || (teeth === 'back') === isBack(t)));
  return { x: ts.reduce((a, b) => a + b.x, 0) / ts.length, y: ts.reduce((a, b) => a + b.y, 0) / ts.length };
}

function motionOffset(motion, t, amp = 1) {
  const w = t * TAU * 2.2;
  if (motion === 'updown') return { x: 0, y: Math.sin(w) * 9 * amp };
  if (motion === 'scrub') return { x: Math.sin(w) * 13 * amp, y: 0 };
  return { x: Math.cos(w) * 6 * amp, y: Math.sin(w) * 6 * amp };   // little circles
}

// ---------- mouth map ----------
function drawMouth(ctx, theme, t, info) {
  const cx = MOUTH.x + MOUTH.w / 2, cy = 176;
  const k = info.k, done = info.done;
  const st = done ? null : STEPS[info.step];
  const q = done ? null : QUADS[k];
  if (!done) {
    const gc = groupCentre(q, st.teeth);
    glow(ctx, cx + gc.x, cy + gc.y, st.teeth === 'all' ? 120 : 80, theme.accent2, 0.6 + 0.25 * Math.sin(t * TAU), 'source-over');
  }
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy, 132, 102, 0, 0, TAU);
  const lg = ctx.createLinearGradient(0, cy - 100, 0, cy + 100); lg.addColorStop(0, '#FF9FAF'); lg.addColorStop(1, '#F07C93');
  ctx.fillStyle = lg; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#D35F7A'; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy, 114, 84, 0, 0, TAU);
  const cg = ctx.createRadialGradient(cx, cy, 10, cx, cy, 110); cg.addColorStop(0, '#5E1F3C'); cg.addColorStop(1, '#8A3556');
  ctx.fillStyle = cg; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.beginPath(); ctx.ellipse(cx, cy + 44, 70, 34, 0, 0, TAU); ctx.fillStyle = '#F2909F'; ctx.fill();
  ctx.fillStyle = '#F7A3B4';
  ctx.beginPath(); ctx.ellipse(cx, cy - 80, 120, 30, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, cy + 80, 120, 30, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.restore();

  // brush: behind the teeth for "inside", on the biting edge for "top"
  const brush = () => {
    const gc = groupCentre(q, st.teeth === 'all' ? 'all' : st.teeth);
    const m = motionOffset(st.motion, t);
    const dirX = q.right ? -1 : 1, dirY = q.upper ? 1 : -1;
    const s = 0.66;
    let ox = cx + gc.x - dirX * 50 * s + m.x, oy = cy + gc.y + (q.upper ? 30 : -30) + m.y;
    if (st.surf === 'top') oy = cy + gc.y + (q.upper ? 20 : -20) + m.y;
    ctx.save();
    ctx.translate(ox, oy);
    if (st.motion === 'updown') { ctx.rotate(dirX * (q.upper ? -1 : 1) * 1.2); }
    ctx.scale(dirX, dirY);
    F.drawToothbrush(ctx, 0, 0, s, 0, theme.brush, t, { glow: false });
    ctx.restore();
  };
  if (!done && st.surf === 'inside') { ctx.save(); ctx.globalAlpha = 0.55; brush(); ctx.restore(); }

  H1.TEETH.forEach((tooth, i) => {
    const qi = H1.qIndex(tooth);
    let fill = '#ECE6EE', stroke = '#C9BCD3';
    if (done || qi < k) { fill = '#FFFFFF'; stroke = '#BFD9E8'; }
    if (!done && qi === k) {
      fill = '#F7F3F8'; stroke = '#B9AACB';
      if (st.teeth === 'all' || (st.teeth === 'back') === isBack(tooth)) {
        fill = L.mixHex('#FFFFFF', theme.accent2, 0.6 + 0.2 * Math.sin(t * TAU));
        stroke = theme.accentDeep;
      }
    }
    const w = isBack(tooth) ? tooth.w + 6 : tooth.w;
    H1.drawTooth(ctx, cx + tooth.x, cy + tooth.y, w, tooth.h, tooth.upper, fill, stroke);
  });
  ctx.save(); ctx.setLineDash([6, 8]); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.moveTo(cx, cy - 88); ctx.lineTo(cx, cy + 88); ctx.stroke(); ctx.restore();
  if (!done && st.surf !== 'inside') brush();
  L.text(ctx, done ? 'ALL CLEAN!' : q.label, cx, 330, { size: 33, weight: 700, color: theme.ink, letterSpacing: 1 });
}

// ---------- tooth coach ----------
function coachTooth(ctx, x, y, kind, t) {
  // friendly tooth, crown up. kind 'back' = molar (wide, two roots), 'front' = incisor
  const w = kind === 'front' ? 62 : 92, h = kind === 'front' ? 120 : 108;
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath();
  if (kind === 'front') {
    ctx.moveTo(-w / 2, -h * 0.42);
    ctx.quadraticCurveTo(-w / 2, -h / 2, -w * 0.2, -h / 2); ctx.lineTo(w * 0.2, -h / 2); ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h * 0.42);
    ctx.bezierCurveTo(w * 0.52, -h * 0.05, w * 0.3, h * 0.1, w * 0.2, h * 0.3);
    ctx.quadraticCurveTo(w * 0.1, h / 2, 0, h / 2); ctx.quadraticCurveTo(-w * 0.1, h / 2, -w * 0.2, h * 0.3);
    ctx.bezierCurveTo(-w * 0.3, h * 0.1, -w * 0.52, -h * 0.05, -w / 2, -h * 0.42);
  } else {
    L.toothPath(ctx, 0, 0, w, h);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#E6EEF6');
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#9DB3C8'; ctx.stroke();
  // face
  const fy = kind === 'front' ? -h * 0.2 : -h * 0.12;
  ctx.fillStyle = '#3A2340';
  const bl = F.blinkAt(t, 0.7);
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * w * 0.16, fy, 4.5, 6 * (1 - bl * 0.9), 0, 0, TAU); ctx.fill(); }
  ctx.lineWidth = 3; ctx.strokeStyle = '#3A2340'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-8, fy + 12); ctx.quadraticCurveTo(0, fy + 19, 8, fy + 12); ctx.stroke();
  glow(ctx, -w * 0.3, fy + 10, 12, '#FF9AA8', 0.5, 'source-over'); glow(ctx, w * 0.3, fy + 10, 12, '#FF9AA8', 0.5, 'source-over');
  ctx.restore();
  return { w, h };
}

function drawCoach(ctx, theme, t, info) {
  const cx = MID.x + MID.w / 2;
  const k = info.k, done = info.done;
  // mission row
  L.text(ctx, `MISSION ${done ? 4 : k + 1}/4`, MID.x + 30, 92, { size: 27, weight: 700, color: theme.accentDeep, align: 'left' });
  ctx.save(); ctx.translate(0, 0);
  for (let i = 0; i < 4; i++) {
    const state = done || i < k ? 'done' : i === k ? 'active' : 'todo';
    ctx.save(); ctx.translate(MID.x + 222 + i * 32, 92); ctx.scale(0.48, 0.48);
    H1.pipIcon(ctx, theme, 0, 0, state, info.frac, t, i);
    ctx.restore();
  }
  ctx.restore();
  if (done) {
    coachTooth(ctx, cx, 205, 'back', t);
    for (let i = 0; i < 6; i++) sparkle(ctx, cx + Math.cos(i + t) * 70, 205 + Math.sin(i * 2 + t) * 50, 8, i, '#BFF3FF', 0.8);
    L.text(ctx, 'SPARKLING CLEAN!', cx, 318, { size: 27, weight: 700, color: theme.ink });
    return;
  }
  const st = STEPS[info.step];
  const kind = st.teeth === 'front' ? 'front' : 'back';
  const ty = 220;
  // context: cheek on the outside (left), tongue on the inside (right)
  ctx.save();
  ctx.beginPath(); ctx.moveTo(cx - 118, ty - 62); ctx.quadraticCurveTo(cx - 150, ty, cx - 118, ty + 58);
  ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.strokeStyle = st.surf === 'outside' ? '#FFB3C1' : '#F3E3EA'; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx + 112, ty + 26, 28, 40, -0.3, 0, TAU); ctx.fillStyle = st.surf === 'inside' ? '#F59AAB' : '#F6E2E9'; ctx.fill();
  ctx.restore();
  const brushAt = () => {
    const m = motionOffset(st.motion, t, 1.1);
    const sz = 0.78;
    ctx.save();
    if (st.surf === 'outside' || st.surf === 'all') {      // cheek side, bristles pointing at the tooth
      ctx.translate(cx - 66 + m.x, ty + 4 + m.y); ctx.rotate(Math.PI / 2); ctx.scale(-1, 1);
    } else if (st.surf === 'inside') {                     // tongue side
      ctx.translate(cx + (kind === 'front' ? 50 : 64) + m.x, ty + 4 + m.y); ctx.rotate(Math.PI / 2);
    } else {                                               // on top, bristles down
      ctx.translate(cx - 50 + m.x, ty - 70 + m.y); ctx.scale(1, -1);
    }
    F.drawToothbrush(ctx, 0, 0, sz, 0, theme.brush, t, { glow: false });
    ctx.restore();
  };
  coachTooth(ctx, cx, ty, kind, t);
  brushAt();
  // bubbles where the bristles are
  for (let i = 0; i < 5; i++) {
    const life = (t * 0.9 + i / 5) % 1;
    const bx = cx + (st.surf === 'inside' ? 44 : st.surf === 'top' ? Math.sin(i * 2 + t) * 30 : -44) + Math.sin(i * 3 + t * 2) * 8;
    const by = ty + (st.surf === 'top' ? -60 : -10) - life * 30;
    ctx.beginPath(); ctx.arc(bx, by, 3 + (i % 3) * 2, 0, TAU); ctx.fillStyle = `rgba(190,235,255,${0.85 * Math.sin(life * Math.PI)})`; ctx.fill();
  }
  // motion arrows
  ctx.save(); ctx.strokeStyle = rgba(theme.accent, 0.85); ctx.lineWidth = 4; ctx.lineCap = 'round';
  const ax = cx + (st.surf === 'inside' ? 120 : st.surf === 'top' ? 118 : -120), ay = st.surf === 'top' ? ty - 50 : ty - 60;
  if (st.motion === 'circles') { ctx.beginPath(); ctx.arc(ax, ay, 14, 0.3, TAU - 0.4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ax + 14, ay - 8); ctx.lineTo(ax + 15, ay + 3); ctx.lineTo(ax + 5, ay - 1); ctx.stroke(); }
  if (st.motion === 'updown') { ctx.beginPath(); ctx.moveTo(ax, ay - 18); ctx.lineTo(ax, ay + 18); ctx.moveTo(ax - 7, ay - 11); ctx.lineTo(ax, ay - 18); ctx.lineTo(ax + 7, ay - 11); ctx.moveTo(ax - 7, ay + 11); ctx.lineTo(ax, ay + 18); ctx.lineTo(ax + 7, ay + 11); ctx.stroke(); }
  if (st.motion === 'scrub') { ctx.beginPath(); ctx.moveTo(ax - 26, ay); ctx.lineTo(ax + 26, ay); ctx.moveTo(ax - 19, ay - 7); ctx.lineTo(ax - 26, ay); ctx.lineTo(ax - 19, ay + 7); ctx.moveTo(ax + 19, ay - 7); ctx.lineTo(ax + 26, ay); ctx.lineTo(ax + 19, ay + 7); ctx.stroke(); }
  ctx.restore();
  const pop = 1 + 0.2 * (1 - ease.out(clamp(info.ts / 0.4)));
  ctx.save(); ctx.translate(cx, 326); ctx.scale(pop, pop);
  L.text(ctx, st.label, 0, 0, { size: 25, weight: 700, color: theme.ink, letterSpacing: 0.5 });
  ctx.restore();
}

// ---------- segmented ring ----------
function drawRing(ctx, theme, t, info, id) {
  const { cx, cy, R } = TIMER;
  const rr = R - 32;
  const done = info.done;
  const last3 = !done && info.remain < 3;
  const pulse = last3 ? 1 + 0.035 * Math.sin(t * TAU * 2) : 1;
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(pulse, pulse); ctx.translate(-cx, -cy);
  const gap = 0.07;
  const remain = done ? 0 : info.remain;
  for (let s = 0; s < 6; s++) {
    // segment s covers remaining time (30-5(s+1), 30-5s]; drawn from its start angle
    const hi = 30 - 5 * s, lo = hi - 5;
    const a0 = -Math.PI / 2 + TAU * (lo / 30) + gap / 2;
    const fullA1 = -Math.PI / 2 + TAU * (hi / 30) - gap / 2;
    const r = clamp((remain - lo) / 5);
    if (r <= 0) continue;
    const a1 = lerp(a0, fullA1, r);
    ctx.beginPath(); ctx.arc(cx, cy, rr, a0, a1);
    ctx.lineCap = 'round'; ctx.lineWidth = 28;
    ctx.strokeStyle = last3 ? '#FF9A3D' : s % 2 ? theme.accent : L.mixHex(theme.accent, theme.accent2, 0.45);
    ctx.stroke();
  }
  // gems at the end of each step
  for (let s = 0; s < 6; s++) {
    const a = -Math.PI / 2 + TAU * ((30 - 5 * (s + 1)) / 30);
    const gx = cx + Math.cos(a) * rr, gy = cy + Math.sin(a) * rr;
    const doneStep = done || (info.tp >= 5 * (s + 1));
    const since = done ? 9 : info.tp - 5 * (s + 1);
    const sc = doneStep ? 1 + 0.6 * (1 - ease.outBack(clamp(since / 0.5))) : 0.8;
    ctx.save(); ctx.translate(gx, gy); ctx.scale(sc, sc);
    if (doneStep) glow(ctx, 0, 0, 34, theme.accent2, 0.8);
    if (id === 'lumi') L.chubbyStar(ctx, 0, 0, 13, doneStep ? '#FFD66B' : '#E9E4F2', doneStep ? '#FFD66B' : '#E9E4F2', 4);
    else { L.heartPath(ctx, 0, 1, 11); ctx.fillStyle = doneStep ? '#FF6B66' : '#EFE6EA'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = doneStep ? '#F7C548' : '#D9CCD6'; ctx.stroke(); }
    ctx.restore();
    if (doneStep && since < 0.8) for (let j = 0; j < 7; j++) { const aa = (j / 7) * TAU; const u = since / 0.8; sparkle(ctx, gx + Math.cos(aa) * (10 + u * 40), gy + Math.sin(aa) * (10 + u * 40), 7 * (1 - u), aa, theme.accent2, 1 - u); }
  }
  if (done) {
    ctx.save(); ctx.translate(cx, cy - 8);
    ctx.beginPath(); ctx.moveTo(-42, 4); ctx.lineTo(-12, 34); ctx.lineTo(46, -30);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 26; ctx.strokeStyle = '#2FBF8F'; ctx.stroke();
    ctx.restore();
    L.text(ctx, 'DONE!', cx, cy + 66, { size: 32, weight: 700, color: '#2FBF8F', letterSpacing: 2 });
  } else {
    L.text(ctx, String(info.secs), cx, cy - 6, { size: 120, weight: 700, color: last3 ? '#E0632F' : theme.ink });
    L.text(ctx, 'seconds', cx, cy + 64, { size: 24, weight: 600, color: rgba(theme.ink, 0.55) });
  }
  ctx.restore();
}

function drawHUD(ctx, id, t) {
  const theme = THEMES[id];
  const info = phaseInfo(t);
  ctx.drawImage(H1.base(theme), 0, 0);
  drawMouth(ctx, theme, t, info);
  drawCoach(ctx, theme, t, info);
  drawRing(ctx, theme, t, info, id);
}

module.exports = { drawHUD };
