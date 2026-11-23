// "It opens while you brush": shared helpers for missions that open or break
// a little more at every 5-second coaching step, with small continuous motion
// in between so something is always happening.
'use strict';
const L = require('./lib');
const { clamp, ease, rng, lerp } = L;

const BOUNDS = [5, 10, 15, 20, 25];

// eased count of completed steps inside a mission (0..5). tp = seconds into it
function level(tp, dur = 0.7, e = ease.outBack) {
  let s = 0;
  for (const b of BOUNDS) s += e(clamp((tp - b) / dur));
  return s;
}
// 0..1 for boundary i (0..4) — the jump that happens at (i+1)·5 s
function jump(tp, i, dur = 0.7, e = ease.outBack) { return e(clamp((tp - BOUNDS[i]) / dur)); }
// 0..1 building up during the 1.5 s before boundary i (the "it's about to go" wiggle)
function antic(tp, i, lead = 1.6) { const d = BOUNDS[i] - tp; return d > 0 && d < lead ? 1 - d / lead : 0; }
// which boundary comes next (0..4), or 5 when all are done
function nextStep(tp) { return BOUNDS.findIndex((b) => tp < b) === -1 ? 5 : BOUNDS.findIndex((b) => tp < b); }

// jittered tiling of a rectangle into cols×rows quads (shared corners, so they fit)
function tiles(seed, x0, y0, w, h, cols, rows, jit = 0.55) {
  const R = rng(seed);
  const P = [];
  for (let j = 0; j <= rows; j++) {
    P.push([]);
    for (let i = 0; i <= cols; i++) {
      const edge = i === 0 || j === 0 || i === cols || j === rows;
      P[j].push({ x: x0 + (w * i) / cols + (edge ? 0 : (R() - 0.5) * (w / cols) * jit), y: y0 + (h * j) / rows + (edge ? 0 : (R() - 0.5) * (h / rows) * jit) });
    }
  }
  const out = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const poly = [P[j][i], P[j][i + 1], P[j + 1][i + 1], P[j + 1][i]];
    out.push({ poly, cx: poly.reduce((a, p) => a + p.x, 0) / 4, cy: poly.reduce((a, p) => a + p.y, 0) / 4, r: R() });
  }
  return out;
}

// branching crack lines from a point, returned as polylines with their own seed
function crack(seed, x, y, ang, len, depth = 2) {
  const R = rng(seed);
  const lines = [];
  const grow = (sx, sy, a, l, d) => {
    const pts = [{ x: sx, y: sy }];
    const n = 5;
    let cx = sx, cy = sy;
    for (let k = 0; k < n; k++) {
      a += (R() - 0.5) * 0.8;
      cx += Math.cos(a) * l / n; cy += Math.sin(a) * l / n;
      pts.push({ x: cx, y: cy });
      if (d > 0 && k === 2 && R() > 0.3) grow(cx, cy, a + (R() > 0.5 ? 0.9 : -0.9), l * 0.5, d - 1);
    }
    lines.push(pts);
  };
  grow(x, y, ang, len, depth);
  return lines;
}
// draw polylines up to fraction u of their length
function strokePartial(ctx, lines, u) {
  if (u <= 0) return;
  ctx.beginPath();
  for (const pts of lines) {
    const n = pts.length - 1, upto = u * n;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let k = 0; k < n; k++) {
      if (k >= upto) break;
      const f = clamp(upto - k);
      ctx.lineTo(lerp(pts[k].x, pts[k + 1].x, f), lerp(pts[k].y, pts[k + 1].y, f));
    }
  }
  ctx.stroke();
}
function polyPath(ctx, poly, dx = 0, dy = 0) {
  ctx.beginPath(); poly.forEach((p, i) => (i ? ctx.lineTo(p.x + dx, p.y + dy) : ctx.moveTo(p.x + dx, p.y + dy))); ctx.closePath();
}

module.exports = { BOUNDS, level, jump, antic, nextStep, tiles, crack, strokePartial, polyPath };
