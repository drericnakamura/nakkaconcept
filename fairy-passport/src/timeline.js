// The brushing clock. Everything that must be exact lives here and is derived
// from the frame number only — never from animation state.
'use strict';

const FPS = 30;
const PHASE = 30;          // seconds per quadrant
const BRUSH = 120;         // brushing sequence, seconds (exactly 3600 frames)
const REWARD = 5;          // separate reward sequence, seconds (150 frames)
const TOTAL = BRUSH + REWARD;
const W = 1080, H = 1920;

// Order follows the dental quadrants 1→2→3→4. "Right" is the child's own right.
// The on-screen mouth is drawn as a MIRROR view, so the child's right side is on
// the right of the screen — the same side they see in the bathroom mirror.
const QUADS = [
  { id: 'UR', upper: true, right: true, label: 'TOP · RIGHT' },
  { id: 'UL', upper: true, right: false, label: 'TOP · LEFT' },
  { id: 'LL', upper: false, right: false, label: 'BOTTOM · LEFT' },
  { id: 'LR', upper: false, right: true, label: 'BOTTOM · RIGHT' },
];
const SURFACES = ['OUTSIDE', 'INSIDE', 'TOPS'];  // 10 s each inside every 30 s phase

function phaseInfo(t) {
  if (t >= BRUSH) {
    return { k: 4, done: true, tp: t - BRUSH, remain: 0, secs: 0, surf: -1, frac: 1 };
  }
  const k = Math.min(3, Math.floor(t / PHASE + 1e-9));
  const tp = t - k * PHASE;
  const remain = PHASE - tp;
  // ceil: shows 30 for the first second, 1 for the last; never pauses or jumps
  const secs = Math.min(30, Math.max(1, Math.ceil(remain - 1e-6)));
  const surf = Math.min(2, Math.floor(tp / 10 + 1e-9));
  return { k, done: false, tp, remain, secs, surf, frac: tp / PHASE };
}

module.exports = { FPS, PHASE, BRUSH, REWARD, TOTAL, W, H, QUADS, SURFACES, phaseInfo };
