// Export clean, transparent artwork for the Fairy Passport (print + digital):
//   <id>_character.png   — hero pose, 1600×2000, transparent
//   <id>_badge.png       — collectible badge, 1600×1600, transparent
//   <id>_badge_frames/   — 90-frame badge-unlock animation with alpha (→ WebM)
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./lib');
const F = require('./fairy');
const B = require('./badge');
const { TAU, clamp, ease, glow, sparkle } = L;

const out = path.join(__dirname, '..', 'build', 'assets');
fs.mkdirSync(out, { recursive: true });
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['bravi', 'lumi'];

for (const id of ids) {
  const sp = F.SPECS[id];
  // character
  {
    const c = L.makeCanvas(1600, 2000), x = c.getContext('2d');
    F.drawFairy(x, sp, { x: 800, y: 1250, s: 4.2, t: 0.35, bob: false, expr: 'smile', arms: id === 'bravi' ? { l: 'hold', r: 'wave' } : { l: 'down', r: 'point' }, look: { x: 0, y: 0 }, itemGlow: 0.6 });
    fs.writeFileSync(path.join(out, `${id}_character.png`), c.toBuffer('image/png'));
  }
  // badge
  {
    const c = L.makeCanvas(1600, 1600), x = c.getContext('2d');
    B.drawBadge(x, id, 800, 660, 520, { glow: false });
    fs.writeFileSync(path.join(out, `${id}_badge.png`), c.toBuffer('image/png'));
  }
  // badge unlock animation, 3 s @ 30 fps, transparent
  if (process.env.FRAMES !== '0') {
    const dir = path.join(out, `${id}_badge_frames`);
    fs.mkdirSync(dir, { recursive: true });
    for (let f = 0; f < 90; f++) {
      const t = f / 30;
      const c = L.makeCanvas(1080, 1080), x = c.getContext('2d');
      const u = clamp((t - 0.15) / 0.7);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU + t * 0.6;
        const r = 380 + 30 * Math.sin(t * 3 + i);
        sparkle(x, 540 + Math.cos(a) * r, 470 + Math.sin(a) * r, 10 + 6 * Math.sin(t * 5 + i), a, sp.aura, u);
      }
      if (u > 0) B.drawBadge(x, id, 540, 470, 330, { scale: ease.outBack(u), rot: Math.sin(u * TAU) * 0.12 * (1 - u), t, shine: (t - 1.2) / 0.8 });
      if (u > 0 && u < 1) glow(x, 540, 470, 520, '#ffffff', 0.5 * (1 - u));
      fs.writeFileSync(path.join(dir, `f${String(f).padStart(3, '0')}.png`), c.toBuffer('image/png'));
    }
  }
  console.log('assets:', id);
}
