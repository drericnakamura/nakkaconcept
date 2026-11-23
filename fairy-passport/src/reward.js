// Reward sequence (the 5 s AFTER the 120 s of brushing — it never eats into
// brushing time). Same choreography for every fairy: the story resolves,
// the badge stamps in, the fairy celebrates.
'use strict';
const L = require('./lib');
const F = require('./fairy');
const B = require('./badge');
const { TAU, clamp, lerp, ease, rgba, glow, sparkle, hash } = L;

const BADGE_Y = 1150, BADGE_R = 240;

function drawRewardBack(ctx, id, tr) {
  const sp = F.SPECS[id];
  // soft firework bursts while the scene lights up
  [[0.25, 300, 640], [0.6, 800, 560], [1.0, 540, 480], [1.5, 220, 900], [1.9, 880, 860]].forEach(([t0, x, y], k) => {
    const u = (tr - t0) / 1.4;
    if (u < 0 || u > 1) return;
    const cols = id === 'lumi' ? ['#FFE7A0', '#BFE3FF', '#D9C8FF'] : ['#FFE08A', '#FF9FB5', '#9FE6D8'];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + k;
      const r = ease.out(u) * 150;
      sparkle(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r + u * u * 40, 11 * (1 - u), a, cols[i % 3], 1 - u);
    }
    glow(ctx, x, y, 160, cols[0], 0.5 * (1 - u));
  });
  // dim + rays behind the badge
  const dim = ease.sine(clamp((tr - 0.9) / 0.5));
  if (dim > 0) {
    ctx.save();
    ctx.fillStyle = id === 'lumi' ? `rgba(12,8,40,${0.5 * dim})` : `rgba(60,25,70,${0.42 * dim})`;
    ctx.fillRect(0, 0, 1080, 1920);
    ctx.globalCompositeOperation = 'lighter';
    const rays = 16;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * TAU + tr * 0.25;
      ctx.beginPath(); ctx.moveTo(540, BADGE_Y);
      ctx.arc(540, BADGE_Y, 1100, a, a + 0.11); ctx.closePath();
      const g = ctx.createRadialGradient(540, BADGE_Y, 0, 540, BADGE_Y, 900);
      g.addColorStop(0, rgba(id === 'lumi' ? '#CFC2FF' : '#FFE1A0', 0.32 * dim)); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fill();
    }
    ctx.restore();
    glow(ctx, 540, BADGE_Y, 520, sp.aura, 0.55 * dim);
  }
}

function drawRewardFront(ctx, id, tr) {
  const sp = F.SPECS[id];
  const b = B.BADGES[id];
  // badge stamps in
  const u = clamp((tr - 1.0) / 0.7);
  if (u > 0) {
    const s = ease.outBack(u);
    const wob = Math.sin(clamp(u) * Math.PI * 2) * 0.12 * (1 - u);
    const fl = Math.sin(tr * 1.6) * 8 * clamp((tr - 1.7) / 0.5);
    B.drawBadge(ctx, id, 540, BADGE_Y + fl, BADGE_R, { scale: s, rot: wob, t: tr, shine: (tr - 2.1) / 0.8 });
    // ring of sparkles
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU + tr * 0.5;
      const r = BADGE_R * (1.15 + 0.06 * Math.sin(tr * 3 + i));
      sparkle(ctx, 540 + Math.cos(a) * r, BADGE_Y + fl + Math.sin(a) * r, 7 + 5 * (0.5 + 0.5 * Math.sin(tr * 5 + i * 1.3)), a, sp.aura, u);
    }
    // stamp flash
    if (u < 1) glow(ctx, 540, BADGE_Y, 600, '#ffffff', 0.5 * (1 - u));
  }
  // title: "COURAGE BADGE" / "UNLOCKED!"
  const lines = [{ s: b.title, y: 1540, size: 84, t0: 1.45 }, { s: 'UNLOCKED!', y: 1640, size: 104, t0: 1.75 }];
  ctx.save();
  for (const ln of lines) {
    ctx.font = L.font(ln.size, 700);
    const chars = [...ln.s];
    const widths = chars.map((c) => ctx.measureText(c).width);
    const total = widths.reduce((a, c) => a + c, 0) + (chars.length - 1) * 3;
    let x = 540 - total / 2;
    chars.forEach((ch, i) => {
      const cu = clamp((tr - ln.t0 - i * 0.035) / 0.35);
      if (cu > 0 && ch !== ' ') {
        const sc = ease.outBack(cu);
        const bounce = Math.sin(tr * 4 - i * 0.5) * 4 * clamp((tr - 2.6) / 0.4);
        ctx.save();
        ctx.translate(x + widths[i] / 2, ln.y + bounce);
        ctx.scale(sc, sc);
        L.text(ctx, ch, 0, 0, { size: ln.size, weight: 700, color: '#FFFFFF', stroke: b.bandDeep, strokeW: ln.size * 0.2, shadow: 'rgba(30,10,40,0.45)', shadowBlur: 18, shadowY: 8 });
        ctx.restore();
      }
      x += widths[i] + 3;
    });
  }
  ctx.restore();
  // the fairy flies in and celebrates above the badge
  const fu = clamp((tr - 1.2) / 0.9);
  if (fu > 0) {
    const fx = lerp(1250, 540, ease.out(fu)), fy = lerp(560, 690, ease.out(fu)) - Math.abs(Math.sin(tr * 5)) * 14 * clamp((tr - 2.1) / 0.3);
    F.drawFairy(ctx, sp, { x: fx, y: fy, s: 0.98, t: tr + 200, facing: fu < 1 ? -1 : 1, expr: fu < 1 ? 'open' : 'joy', arms: fu < 1 ? { l: 'hold', r: 'reach' } : { l: 'up', r: 'cheer' }, look: { x: 0, y: 0 }, itemGlow: 1, flapSpeed: 1.4 });
  }
  // confetti (stars + hearts) drifting down
  if (tr > 1.0) {
    for (let i = 0; i < 46; i++) {
      const t0 = 1.0 + hash(i) * 1.6;
      const life = (tr - t0) / 3.2;
      if (life < 0 || life > 1) continue;
      const x = hash(i + 11) * 1080 + Math.sin(tr * 2 + i) * 30;
      const y = 380 + life * 1500;
      const r = 9 + hash(i + 5) * 9;
      const a = clamp((1 - life) * 3);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(tr * 2 + i);
      const col = (id === 'lumi' ? ['#FFE08A', '#CFC2FF', '#BFE3FF', '#FFFFFF'] : ['#FFE08A', '#FF8FA0', '#7FD3C4', '#FFFFFF'])[i % 4];
      if (i % 3 === 0) { L.heartPath(ctx, 0, 0, r * 0.8); ctx.fillStyle = col; ctx.fill(); }
      else L.chubbyStar(ctx, 0, 0, r, col, col, r * 0.25);
      ctx.restore();
    }
  }
}

module.exports = { drawRewardBack, drawRewardFront };
