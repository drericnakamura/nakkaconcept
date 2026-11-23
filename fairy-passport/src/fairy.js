// Fairy rig shared by every Fairy Passport character. One skeleton, one face
// system, per-fairy palette + hair + wings + signature item. Origin = waist.
'use strict';
const L = require('./lib');
const { TAU, clamp, lerp, rgba, glow, sparkle } = L;

const SPECS = {
  bravi: {
    id: 'bravi', name: 'Bravi', power: 'Courage',
    skin: '#FFD9C4', skinShade: '#EDAE90', skinLine: '#C98468', cheek: '#FF8A8A',
    eye: '#3A2340',
    hair: '#FF7A57', hairShade: '#D9503D', hairLight: '#FFAA80', hairTip: '#FFD56E',
    outfit: '#2EA59B', outfitShade: '#1B7671', outfitLight: '#63CFC3', trim: '#F7C548',
    cape: '#FF6B66', capeShade: '#CF4552', boots: '#B9503F',
    wing: '#FFF7EA', wingEdge: '#F5A93A', wingTint: '#FFD38C',
    aura: '#FFC46A', accent: '#FF7A57', accent2: '#F7C548',
  },
  lumi: {
    id: 'lumi', name: 'Lumi', power: 'Light',
    skin: '#C98B68', skinShade: '#A86C4E', skinLine: '#7E4B35', cheek: '#FF8E9E',
    eye: '#2B1F45',
    hair: '#D9C8FF', hairShade: '#A48BE8', hairLight: '#F3ECFF', hairTip: '#FFFFFF',
    outfit: '#5B47C9', outfitShade: '#3A2C8F', outfitLight: '#8C7BF0', trim: '#FFD77A',
    cape: '#5B47C9', capeShade: '#3A2C8F', boots: '#FFD77A',
    wing: '#E6F0FF', wingEdge: '#B9A6FF', wingTint: '#BFE3FF',
    aura: '#B9C8FF', accent: '#8C7BF0', accent2: '#FFD77A',
  },
};

// natural blink: ~every 3–5 s, 0.16 s long. returns closure 0..1
function blinkAt(t, seed = 0) {
  const period = 3.6;
  const k = Math.floor((t + seed) / period);
  const start = k * period + L.hash(k * 31 + seed * 7) * 1.6 - seed;
  const d = t - start;
  if (d < 0 || d > 0.16) return 0;
  return Math.sin((d / 0.16) * Math.PI);
}

// ---------- signature items (also used by scenes and badges) ----------
function drawShield(ctx, x, y, w, h, o = {}) {
  const sp = SPECS.bravi;
  const sleep = o.sleep ?? 0;              // 0 = vivid, 1 = grey and sleepy
  const col = (c) => (sleep > 0 ? L.desat(L.mixHex(c, '#9aa3c7', sleep * 0.35), sleep * 0.85) : c);
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  if (o.glow) glow(ctx, 0, 0, Math.max(w, h) * 1.25, col(sp.accent2), o.glow * 0.9);
  if (o.ornate) { // little gold wings on the great shield
    for (const s of [-1, 1]) {
      ctx.save(); ctx.scale(s, 1);
      ctx.beginPath();
      ctx.moveTo(w * 0.42, -h * 0.28);
      ctx.bezierCurveTo(w * 0.95, -h * 0.62, w * 1.05, -h * 0.05, w * 0.72, h * 0.06);
      ctx.bezierCurveTo(w * 0.86, h * 0.1, w * 0.74, h * 0.3, w * 0.42, h * 0.12);
      ctx.closePath();
      const gw = ctx.createLinearGradient(w * 0.4, -h * 0.5, w, h * 0.2);
      gw.addColorStop(0, col('#FFE9A8')); gw.addColorStop(1, col('#E2A23A'));
      ctx.fillStyle = gw; ctx.fill();
      ctx.lineWidth = w * 0.025; ctx.strokeStyle = col('#B97A22'); ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 3; i++) { ctx.moveTo(w * (0.52 + i * 0.1), -h * (0.18 - i * 0.04)); ctx.quadraticCurveTo(w * (0.7 + i * 0.08), -h * (0.28 - i * 0.12), w * (0.84 + i * 0.03), -h * (0.1 - i * 0.12)); }
      ctx.strokeStyle = col('#C98B2C'); ctx.lineWidth = w * 0.018; ctx.stroke();
      ctx.restore();
    }
  }
  // rim
  L.shieldPath(ctx, 0, 0, w, h);
  const gr = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  gr.addColorStop(0, col('#FFE9A6')); gr.addColorStop(0.5, col('#F4B940')); gr.addColorStop(1, col('#C9862B'));
  ctx.fillStyle = gr; ctx.fill();
  ctx.lineWidth = Math.max(1.5, w * 0.03); ctx.strokeStyle = col('#9C5F1E'); ctx.stroke();
  // field
  L.shieldPath(ctx, 0, h * 0.02, w * 0.8, h * 0.8);
  const gf = ctx.createRadialGradient(-w * 0.15, -h * 0.2, w * 0.05, 0, 0, w * 0.6);
  gf.addColorStop(0, col('#FF9E86')); gf.addColorStop(0.6, col('#FF6B66')); gf.addColorStop(1, col('#D9444F'));
  ctx.fillStyle = gf; ctx.fill();
  // heart emblem
  L.heartPath(ctx, 0, h * 0.02, w * 0.22);
  const gh = ctx.createLinearGradient(0, -h * 0.2, 0, h * 0.25);
  gh.addColorStop(0, col('#FFF8EC')); gh.addColorStop(1, col('#FFD9B0'));
  ctx.fillStyle = gh; ctx.fill();
  ctx.lineWidth = Math.max(1, w * 0.025); ctx.strokeStyle = col('#F4B940'); ctx.stroke();
  // glossy highlight
  ctx.save();
  L.shieldPath(ctx, 0, h * 0.02, w * 0.8, h * 0.8); ctx.clip();
  ctx.globalAlpha = 0.28 * (1 - sleep * 0.7);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(-w * 0.2, -h * 0.26, w * 0.18, h * 0.08, -0.5, 0, TAU); ctx.fill();
  if (o.shine !== undefined) { // moving shine band 0..1
    const sx = lerp(-w, w, o.shine);
    ctx.globalAlpha = 0.45 * (1 - sleep);
    ctx.beginPath(); ctx.moveTo(sx - w * 0.12, -h); ctx.lineTo(sx + w * 0.04, -h); ctx.lineTo(sx - w * 0.2, h); ctx.lineTo(sx - w * 0.36, h); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  if (sleep > 0.05) { // dusty veil
    L.shieldPath(ctx, 0, 0, w, h);
    ctx.fillStyle = `rgba(150,160,190,${0.25 * sleep})`; ctx.fill();
  }
  ctx.restore();
}

function drawWand(ctx, hx, hy, ang, len, t, glowAmt = 1) {
  const sp = SPECS.lumi;
  const tx = hx + Math.cos(ang) * len, ty = hy + Math.sin(ang) * len;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#B98A2E'; ctx.lineWidth = 7.5;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.strokeStyle = '#FFE08A'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
  glow(ctx, tx, ty, 70, sp.trim, 0.55 * glowAmt);
  glow(ctx, tx, ty, 30, '#ffffff', 0.5 * glowAmt);
  ctx.translate(tx, ty); ctx.rotate(Math.sin(t * 2.2) * 0.15);
  L.chubbyStar(ctx, 0, 0, 19, '#FFE48F', '#FFE48F', 6);
  L.starPath(ctx, 0, 0, 19 * 0.86, 19 * 0.47); ctx.lineWidth = 2; ctx.strokeStyle = '#E3A93A'; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.ellipse(-4, -5, 4, 2.5, -0.6, 0, TAU); ctx.fill();
  ctx.restore();
  sparkle(ctx, tx + Math.cos(t * 3) * 22, ty + Math.sin(t * 2.3) * 18, 7 + 3 * Math.sin(t * 5), t, sp.trim, 0.8 * glowAmt);
}

// cute star character (Lumi's lost stars)
function drawStarFace(ctx, x, y, R, o = {}) {
  const a = o.alpha ?? 1;
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  ctx.rotate(o.rot ?? 0);
  const s = o.scale ?? 1; ctx.scale(s, s);
  glow(ctx, 0, 0, R * 3.4, o.glowColor ?? '#FFE7A0', 0.55 * (o.glow ?? 1));
  glow(ctx, 0, 0, R * 1.6, '#ffffff', 0.35 * (o.glow ?? 1));
  L.chubbyStar(ctx, 0, 0, R, '#FFE68C', '#FFE68C', R * 0.3);
  ctx.save();
  L.starPath(ctx, 0, 0, R * 0.86, R * 0.47); ctx.lineJoin = 'round';
  ctx.lineWidth = R * 0.3; ctx.strokeStyle = '#FFE68C'; ctx.stroke();
  ctx.lineWidth = R * 0.07; ctx.strokeStyle = 'rgba(226,160,50,0.9)'; ctx.stroke();
  ctx.restore();
  // shading
  const g = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.05, 0, 0, R * 1.1);
  g.addColorStop(0, 'rgba(255,255,255,0.75)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(240,150,40,0.25)');
  L.starPath(ctx, 0, 0, R * 0.86, R * 0.47); ctx.fillStyle = g; ctx.fill();
  if (o.face !== false) {
    const ey = R * 0.02, ex = R * 0.2;
    const sleepy = o.sleepy ?? false;
    ctx.fillStyle = '#5A3A2A'; ctx.strokeStyle = '#5A3A2A'; ctx.lineCap = 'round';
    if (sleepy || o.joy) {
      ctx.lineWidth = R * 0.07;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        if (sleepy) { ctx.moveTo(sx * ex - R * 0.08, ey); ctx.quadraticCurveTo(sx * ex, ey + R * 0.08, sx * ex + R * 0.08, ey); }
        else { ctx.moveTo(sx * ex - R * 0.08, ey + R * 0.03); ctx.quadraticCurveTo(sx * ex, ey - R * 0.1, sx * ex + R * 0.08, ey + R * 0.03); }
        ctx.stroke();
      }
    } else {
      for (const sx of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(sx * ex, ey, R * 0.065, R * 0.09, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx * ex - R * 0.02, ey - R * 0.035, R * 0.025, 0, TAU); ctx.fill(); ctx.fillStyle = '#5A3A2A';
      }
    }
    ctx.lineWidth = R * 0.06;
    ctx.beginPath(); ctx.moveTo(-R * 0.1, R * 0.17); ctx.quadraticCurveTo(0, R * (o.joy ? 0.32 : 0.26), R * 0.1, R * 0.17); ctx.stroke();
    ctx.fillStyle = 'rgba(255,130,130,0.5)';
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * R * 0.36, R * 0.16, R * 0.08, R * 0.05, 0, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}

function drawKey(ctx, x, y, s, rot = 0, glowAmt = 1) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  glow(ctx, 0, 0, 110, '#FFD45C', 0.55 * glowAmt);
  const gold = ctx.createLinearGradient(-40, -20, 60, 20);
  gold.addColorStop(0, '#FFF0B0'); gold.addColorStop(0.5, '#F6C341'); gold.addColorStop(1, '#C98A22');
  ctx.fillStyle = gold; ctx.strokeStyle = '#9A6418'; ctx.lineWidth = 3;
  // bow: ring with heart hole
  ctx.beginPath(); ctx.arc(-38, 0, 26, 0, TAU); ctx.fill(); ctx.stroke();
  L.heartPath(ctx, -38, 1, 10); ctx.fillStyle = '#FFF6DA'; ctx.fill();
  ctx.fillStyle = gold;
  // shaft
  L.roundRect(ctx, -14, -7, 70, 14, 7); ctx.fill(); ctx.stroke();
  // teeth
  L.roundRect(ctx, 34, 4, 10, 18, 3); ctx.fill(); ctx.stroke();
  L.roundRect(ctx, 48, 4, 8, 13, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath(); ctx.ellipse(-46, -10, 8, 4, -0.6, 0, TAU); ctx.fill();
  ctx.restore();
}

// the magic toothbrush that "is" the child's brushing inside the story
function drawToothbrush(ctx, x, y, s, rot, color, t, o = {}) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  if (o.glow !== false) glow(ctx, 30, 0, 90, color, 0.35);
  // handle
  ctx.beginPath();
  ctx.moveTo(-70, -7); ctx.bezierCurveTo(-20, -9, 10, -6, 34, -5);
  ctx.lineTo(34, 6); ctx.bezierCurveTo(10, 7, -20, 10, -70, 9);
  ctx.quadraticCurveTo(-80, 1, -70, -7); ctx.closePath();
  const g = ctx.createLinearGradient(0, -8, 0, 10);
  g.addColorStop(0, L.mixHex(color, '#ffffff', 0.45)); g.addColorStop(1, color);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = L.mixHex(color, '#2a1838', 0.35); ctx.stroke();
  // head
  L.roundRect(ctx, 30, -8, 40, 15, 6); ctx.fillStyle = L.mixHex(color, '#ffffff', 0.2); ctx.fill(); ctx.stroke();
  // bristles
  for (let i = 0; i < 6; i++) {
    const bx = 34 + i * 6.2;
    L.roundRect(ctx, bx, -26, 5, 20, 2.4);
    ctx.fillStyle = i % 2 ? '#ffffff' : '#DDF3FF'; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(80,120,160,0.5)'; ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.ellipse(-30, -3, 22, 2.2, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

// ---------- the fairy ----------
// st: {x,y,s,t,facing,expr,arms:{l,r},look:{x,y},tilt,flapSpeed,itemGlow,aura,bob}
function drawFairy(ctx, spec, st) {
  const t = st.t;
  const s = st.s ?? 1;
  const facing = st.facing ?? 1;
  const bob = st.bob === false ? 0 : Math.sin(t * TAU * 0.55 + (st.bobPhase ?? 0)) * 7;
  ctx.save();
  ctx.translate(st.x, st.y + bob * s);
  ctx.scale(s * facing, s);
  ctx.rotate((st.tilt ?? 0) + Math.sin(t * 1.3) * 0.025);

  // aura
  glow(ctx, 0, -60, 230, spec.aura, 0.32 * (st.aura ?? 1));

  drawWings(ctx, spec, t, st.flapSpeed ?? 1);
  if (spec.id === 'bravi') drawCape(ctx, spec, t);
  if (spec.id === 'lumi') drawBackHairLumi(ctx, spec, t);
  if (spec.id === 'bravi') drawBackHairBravi(ctx, spec);

  // legs / feet
  drawLegs(ctx, spec, t);
  // body
  drawBody(ctx, spec, t);
  // arms (back arm first)
  const hands = handPositions(st, t);
  drawArm(ctx, spec, -1, hands.l);
  drawArm(ctx, spec, 1, hands.r);
  // head
  drawHead(ctx, spec, st, t);
  // items in front
  if (spec.id === 'bravi') {
    const h = hands.l;
    drawShield(ctx, h.x - 6, h.y + 10, 66, 76, { rot: -0.18 + (st.arms?.l === 'up' ? -0.3 : 0), glow: st.itemGlow ?? 0.3, shine: ((t * 0.25) % 1.6) });
  } else {
    const h = hands.r;
    const ang = st.arms?.r === 'point' || st.arms?.r === 'up' ? -1.15 : -1.35;
    drawWand(ctx, h.x, h.y, ang + Math.sin(t * 2) * 0.08, 74, t, st.itemGlow ?? 1);
  }
  // hand overlays (so fingers sit over items)
  for (const side of [-1, 1]) {
    const h = side < 0 ? hands.l : hands.r;
    ctx.beginPath(); ctx.arc(h.x, h.y, 10.5, 0, TAU);
    ctx.fillStyle = spec.skin; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = spec.skinLine; ctx.globalAlpha = 0.9; ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function handPositions(st, t) {
  const pose = (side, p) => {
    const w = Math.sin(t * 9) * 16;
    switch (p) {
      case 'up': return { x: side * 102, y: -112 + Math.sin(t * 6 + side) * 4 };
      case 'wave': return { x: side * (104 + w * 0.35), y: -100 + Math.abs(w) * 0.2 };
      case 'point': return { x: side * 98, y: -70 };
      case 'reach': return { x: side * 84, y: -36 };
      case 'hold': return { x: side * 54, y: -8 };
      case 'cheer': return { x: side * 100, y: -98 + Math.sin(t * 12) * 8 };
      case 'down':
      default: return { x: side * 48, y: 12 + Math.sin(t * 2 + side) * 2 };
    }
  };
  return { l: pose(-1, st.arms?.l ?? 'hold'), r: pose(1, st.arms?.r ?? 'down') };
}

function drawArm(ctx, spec, side, hand) {
  const sx = side * 30, sy = -36;
  const mx = (sx + hand.x) / 2 + side * 12, my = (sy + hand.y) / 2 + 10;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(mx, my, hand.x, hand.y);
  ctx.strokeStyle = spec.skinLine; ctx.lineWidth = 19; ctx.globalAlpha = 0.85; ctx.stroke(); ctx.globalAlpha = 1;
  ctx.strokeStyle = spec.skin; ctx.lineWidth = 14.5; ctx.stroke();
  // sleeve cap
  ctx.beginPath(); ctx.ellipse(sx, sy + 4, 15, 13, 0, 0, TAU);
  ctx.fillStyle = spec.id === 'lumi' ? spec.outfitLight : spec.outfitLight; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = spec.outfitShade; ctx.stroke();
  ctx.restore();
}

function drawWings(ctx, spec, t, speed) {
  const ph = t * TAU * 2.6 * speed;
  const flap = 0.5 + 0.5 * Math.sin(ph);           // 0..1
  ctx.save();
  ctx.translate(0, -34);
  glow(ctx, 0, -40, 200, spec.wingEdge, 0.18);
  const wingShape = (ang, len, wid, tail) => {
    ctx.save();
    ctx.rotate(ang);
    ctx.beginPath();
    if (spec.id === 'lumi' && tail) { // moth lower wing with curled tail
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(len * 0.3, -wid, len * 0.75, -wid * 0.7, len * 0.8, -wid * 0.1);
      ctx.bezierCurveTo(len * 0.95, wid * 0.4, len * 1.15, wid * 0.9, len * 1.02, wid * 1.2);
      ctx.bezierCurveTo(len * 0.8, wid * 0.9, len * 0.5, wid * 0.7, 0, 0);
    } else if (spec.id === 'lumi') { // rounded upper wing
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(len * 0.15, -wid * 1.1, len * 0.95, -wid * 1.25, len, -wid * 0.1);
      ctx.bezierCurveTo(len * 1.02, wid * 0.55, len * 0.4, wid * 0.75, 0, 0);
    } else { // dragonfly
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(len * 0.25, -wid, len * 0.9, -wid * 0.9, len, 0);
      ctx.bezierCurveTo(len * 0.9, wid * 0.8, len * 0.25, wid * 0.8, 0, 0);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, rgba(spec.wingTint, 0.95)); g.addColorStop(0.55, rgba(spec.wingTint, 0.62)); g.addColorStop(1, rgba(spec.wing, 0.5));
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = rgba(spec.wingEdge, 1); ctx.stroke();
    ctx.save(); ctx.clip(); glow(ctx, len * 0.75, 0, len * 0.5, '#ffffff', 0.35); ctx.restore();
    // veins
    ctx.globalAlpha = 0.45; ctx.lineWidth = 1.6; ctx.strokeStyle = spec.wingEdge;
    ctx.beginPath();
    ctx.moveTo(len * 0.05, 0); ctx.quadraticCurveTo(len * 0.5, -wid * 0.25, len * 0.92, -wid * 0.05);
    ctx.moveTo(len * 0.3, -wid * 0.12); ctx.lineTo(len * 0.55, -wid * 0.55);
    ctx.moveTo(len * 0.5, -wid * 0.18); ctx.lineTo(len * 0.78, wid * 0.35);
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (spec.id === 'lumi') { // glowing spots
      glow(ctx, len * (tail ? 0.7 : 0.6), tail ? wid * 0.2 : -wid * 0.35, wid * 0.9, '#FFE7A0', 0.5);
      ctx.fillStyle = 'rgba(255,240,190,0.9)';
      ctx.beginPath(); ctx.arc(len * (tail ? 0.7 : 0.6), tail ? wid * 0.2 : -wid * 0.35, wid * 0.13, 0, TAU); ctx.fill();
    } else {
      sparkle(ctx, len * 0.86, -wid * 0.12, 6, 0.3, spec.wingEdge, 0.8, false);
    }
    ctx.restore();
  };
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.scale(0.72 + 0.28 * flap, 1);
    const up = spec.id === 'lumi' ? [-0.5, 168, 74] : [-0.42, 176, 38];
    const lo = spec.id === 'lumi' ? [0.42, 122, 34] : [0.36, 134, 27];
    wingShape(up[0] - flap * 0.12, up[1], up[2], false);
    wingShape(lo[0] + flap * 0.1, lo[1], lo[2], true);
    ctx.restore();
  }
  ctx.restore();
}

function drawCape(ctx, spec, t) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-26, -46);
  ctx.lineTo(26, -46);
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    const x = lerp(58, -58, u);
    const y = 46 + Math.sin(t * 3.2 + u * 5) * 7 + (u - 0.5) * (u - 0.5) * 20;
    pts.push([x, y]);
  }
  ctx.quadraticCurveTo(50, -10, pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.quadraticCurveTo(-50, -10, -26, -46);
  ctx.closePath();
  const g = ctx.createLinearGradient(-50, 0, 50, 0);
  g.addColorStop(0, spec.capeShade); g.addColorStop(0.45, spec.cape); g.addColorStop(1, spec.capeShade);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#A8344A'; ctx.globalAlpha = 0.7; ctx.stroke();
  ctx.restore();
}

function drawBackHairBravi(ctx, spec) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -104, 80, 72, 0, Math.PI * 0.95, Math.PI * 2.05);
  ctx.bezierCurveTo(84, -70, 76, -52, 58, -56);
  ctx.lineTo(-58, -56);
  ctx.bezierCurveTo(-76, -52, -84, -70, -80, -98);
  ctx.closePath();
  ctx.fillStyle = spec.hairShade; ctx.fill();
  ctx.restore();
}

function drawBackHairLumi(ctx, spec, t) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-76, -118);
  ctx.bezierCurveTo(-96, -60, -92, -10, -84 + Math.sin(t * 1.5) * 3, 18);
  // wavy bottom
  const n = 6;
  for (let i = 0; i < n; i++) {
    const x0 = lerp(-84, 84, i / n), x1 = lerp(-84, 84, (i + 1) / n);
    ctx.quadraticCurveTo((x0 + x1) / 2, 40 + Math.sin(t * 1.8 + i) * 4, x1, 18 + (i % 2 ? 0 : 6));
  }
  ctx.bezierCurveTo(92, -10, 96, -60, 76, -118);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -120, 0, 40);
  g.addColorStop(0, spec.hairShade); g.addColorStop(1, L.mixHex(spec.hairShade, spec.outfit, 0.25));
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
}

function drawLegs(ctx, spec, t) {
  ctx.save();
  ctx.lineCap = 'round';
  if (spec.id === 'bravi') {
    for (const side of [-1, 1]) {
      const sw = Math.sin(t * 2.2 + side) * 4;
      ctx.beginPath(); ctx.moveTo(side * 14, 28); ctx.lineTo(side * 16 + sw, 64);
      ctx.strokeStyle = spec.skinLine; ctx.lineWidth = 17; ctx.stroke();
      ctx.strokeStyle = spec.skin; ctx.lineWidth = 13; ctx.stroke();
      // boot
      ctx.beginPath(); ctx.ellipse(side * 18 + sw, 72, 14, 11, side * 0.25, 0, TAU);
      ctx.fillStyle = spec.boots; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#7E3427'; ctx.stroke();
      ctx.fillStyle = spec.trim; L.roundRect(ctx, side * 16 + sw - 10, 58, 20, 6, 3); ctx.fill();
    }
  } else {
    for (const side of [-1, 1]) {
      const sw = Math.sin(t * 2.2 + side) * 3;
      ctx.beginPath(); ctx.ellipse(side * 18 + sw, 82, 13, 9, side * 0.2, 0, TAU);
      ctx.fillStyle = spec.boots; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#C7953A'; ctx.stroke();
    }
  }
  ctx.restore();
}

function drawBody(ctx, spec, t) {
  ctx.save();
  if (spec.id === 'bravi') {
    // tunic
    ctx.beginPath();
    ctx.moveTo(-28, -46);
    ctx.quadraticCurveTo(0, -52, 28, -46);
    ctx.quadraticCurveTo(40, -10, 50, 30);
    ctx.quadraticCurveTo(0, 44, -50, 30);
    ctx.quadraticCurveTo(-40, -10, -28, -46);
    ctx.closePath();
    const g = ctx.createLinearGradient(-50, -40, 50, 40);
    g.addColorStop(0, spec.outfitLight); g.addColorStop(0.45, spec.outfit); g.addColorStop(1, spec.outfitShade);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#155E5A'; ctx.stroke();
    // hem trim
    ctx.beginPath(); ctx.moveTo(-50, 30); ctx.quadraticCurveTo(0, 44, 50, 30);
    ctx.lineWidth = 6; ctx.strokeStyle = spec.trim; ctx.stroke();
    // belt with heart buckle
    ctx.beginPath(); ctx.moveTo(-38, -4); ctx.quadraticCurveTo(0, 4, 38, -4);
    ctx.lineWidth = 9; ctx.strokeStyle = '#F2B83A'; ctx.stroke();
    L.heartPath(ctx, 0, 0, 9); ctx.fillStyle = '#FF6B66'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#B9452F'; ctx.stroke();
    // collar
    ctx.beginPath(); ctx.moveTo(-20, -48); ctx.quadraticCurveTo(0, -30, 20, -48);
    ctx.lineWidth = 5; ctx.strokeStyle = spec.trim; ctx.stroke();
  } else {
    // starry gown
    ctx.beginPath();
    ctx.moveTo(-26, -46);
    ctx.quadraticCurveTo(0, -52, 26, -46);
    ctx.quadraticCurveTo(44, 10, 62, 64);
    const n = 6;
    for (let i = 0; i < n; i++) {
      const x0 = lerp(62, -62, i / n), x1 = lerp(62, -62, (i + 1) / n);
      ctx.quadraticCurveTo((x0 + x1) / 2, 84 + Math.sin(t * 2 + i) * 2, x1, 66);
    }
    ctx.quadraticCurveTo(-44, 10, -26, -46);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -46, 0, 80);
    g.addColorStop(0, spec.outfitShade); g.addColorStop(0.55, spec.outfit); g.addColorStop(1, spec.outfitLight);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#2A1F6E'; ctx.stroke();
    // glowing hem
    ctx.save(); ctx.clip();
    glow(ctx, 0, 84, 90, '#CFC2FF', 0.6);
    // tiny stars on the dress
    const pts = [[-22, -8], [14, -22], [28, 22], [-34, 40], [4, 46], [40, 54], [-12, 18]];
    pts.forEach(([x, y], i) => {
      const tw = 0.6 + 0.4 * Math.sin(t * 3 + i * 1.7);
      sparkle(ctx, x, y, 4.5 + tw * 2, 0, '#FFE7A0', 0.9 * tw, false);
    });
    ctx.restore();
    // sash
    ctx.beginPath(); ctx.moveTo(-34, -6); ctx.quadraticCurveTo(0, 4, 34, -6);
    ctx.lineWidth = 7; ctx.strokeStyle = spec.trim; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-18, -48); ctx.quadraticCurveTo(0, -34, 18, -48);
    ctx.lineWidth = 4; ctx.strokeStyle = spec.trim; ctx.stroke();
  }
  ctx.restore();
}

function drawHead(ctx, spec, st, t) {
  const hx = 0, hy = -102;
  ctx.save();
  // ears (pointy fairy ears)
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 62, -116);
    ctx.quadraticCurveTo(side * 98, -132, side * 100, -126);
    ctx.quadraticCurveTo(side * 90, -98, side * 62, -86);
    ctx.closePath();
    ctx.fillStyle = spec.skin; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = spec.skinLine; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(side * 70, -110); ctx.quadraticCurveTo(side * 86, -118, side * 90, -120);
    ctx.lineWidth = 3; ctx.strokeStyle = spec.skinShade; ctx.stroke();
  }
  // face
  ctx.beginPath(); ctx.ellipse(hx, hy, 70, 65, 0, 0, TAU);
  const g = ctx.createRadialGradient(hx - 22, hy - 26, 8, hx, hy, 78);
  g.addColorStop(0, L.mixHex(spec.skin, '#ffffff', 0.35)); g.addColorStop(0.55, spec.skin); g.addColorStop(1, spec.skinShade);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = spec.skinLine; ctx.stroke();

  // cheeks
  for (const side of [-1, 1]) glow(ctx, side * 42, -76, 26, spec.cheek, 0.55, 'source-over');

  const expr = st.expr ?? 'smile';
  const lk = st.look ?? { x: 0, y: 0 };
  const blink = Math.max(st.blink ?? 0, blinkAt(t, spec.id === 'lumi' ? 1.3 : 0));
  // eyes
  ctx.fillStyle = spec.eye; ctx.strokeStyle = spec.eye; ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const ex = side * 25 + lk.x * 3, ey = -96 + lk.y * 3;
    if (expr === 'joy') {
      ctx.lineWidth = 5.5;
      ctx.beginPath(); ctx.moveTo(ex - 11, ey + 4); ctx.quadraticCurveTo(ex, ey - 12, ex + 11, ey + 4); ctx.stroke();
    } else if (blink > 0.8) {
      ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.moveTo(ex - 11, ey + 1); ctx.quadraticCurveTo(ex, ey + 7, ex + 11, ey + 1); ctx.stroke();
    } else {
      const big = expr === 'wow' ? 1.12 : 1;
      const ry = 16 * big * (1 - blink * 0.85);
      ctx.beginPath(); ctx.ellipse(ex, ey, 12 * big, ry, 0, 0, TAU); ctx.fill();
      if (blink < 0.5) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(ex - 4, ey - 6 * (ry / 16), 4.8, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(ex + 4, ey + 5 * (ry / 16), 2.3, 0, TAU); ctx.fill();
        ctx.fillStyle = spec.eye;
      }
    }
  }
  // brows
  ctx.lineWidth = spec.id === 'bravi' ? 5 : 3.5; ctx.strokeStyle = spec.id === 'bravi' ? spec.hairShade : L.mixHex(spec.hairShade, '#4a3a7a', 0.4);
  const lift = expr === 'wow' ? -6 : expr === 'joy' ? -3 : 0;
  for (const side of [-1, 1]) {
    const bx = side * 26, by = -122 + lift;
    const tiltIn = spec.id === 'bravi' && expr === 'determined' ? 4 : 0;
    ctx.beginPath(); ctx.moveTo(bx - side * 10, by + tiltIn); ctx.quadraticCurveTo(bx, by - 5, bx + side * 10, by + 2); ctx.stroke();
  }
  // nose
  ctx.beginPath(); ctx.arc(0, -78, 3.5, 0.2, Math.PI - 0.2);
  ctx.lineWidth = 2.5; ctx.strokeStyle = spec.skinLine; ctx.stroke();
  // mouth
  ctx.lineWidth = 4; ctx.strokeStyle = spec.eye;
  if (expr === 'open' || expr === 'joy') {
    ctx.beginPath();
    ctx.moveTo(-15, -66); ctx.quadraticCurveTo(0, -63, 15, -66);
    ctx.quadraticCurveTo(12, -44, 0, -44); ctx.quadraticCurveTo(-12, -44, -15, -66);
    ctx.closePath();
    ctx.fillStyle = '#8E2F45'; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-15, -68, 30, 6);           // little teeth
    ctx.fillStyle = '#FF8C9A'; ctx.beginPath(); ctx.ellipse(0, -45, 9, 6, 0, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.lineWidth = 3; ctx.stroke();
  } else if (expr === 'wow') {
    ctx.beginPath(); ctx.ellipse(0, -60, 7.5, 9.5, 0, 0, TAU); ctx.fillStyle = '#8E2F45'; ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(-13, -66); ctx.quadraticCurveTo(0, -54, 13, -66); ctx.stroke();
  }
  // front hair
  if (spec.id === 'bravi') drawFrontHairBravi(ctx, spec, t); else drawFrontHairLumi(ctx, spec, t);
  ctx.restore();
}

function drawFrontHairBravi(ctx, spec, t) {
  ctx.save();
  // flame tuft on top
  const sway = Math.sin(t * 2.4) * 5;
  ctx.beginPath();
  ctx.moveTo(-22, -160);
  ctx.bezierCurveTo(-26, -196, 4 + sway, -214, 18 + sway, -226);
  ctx.bezierCurveTo(12 + sway, -206, 30, -190, 24, -160);
  ctx.closePath();
  const gt = ctx.createLinearGradient(0, -160, sway, -226);
  gt.addColorStop(0, spec.hair); gt.addColorStop(0.7, spec.hairLight); gt.addColorStop(1, spec.hairTip);
  ctx.fillStyle = gt; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = spec.hairShade; ctx.stroke();
  // fringe
  ctx.beginPath();
  ctx.moveTo(-74, -96);
  ctx.bezierCurveTo(-82, -150, -40, -176, 0, -174);
  ctx.bezierCurveTo(40, -176, 82, -150, 74, -96);
  // spiky-soft fringe edge, right → left
  const tips = [[62, -112], [50, -128], [40, -112], [24, -134], [12, -116], [-6, -138], [-18, -116], [-36, -134], [-46, -112], [-60, -126]];
  let px = 74, py = -96;
  for (let i = 0; i < tips.length; i++) {
    const [x, y] = tips[i];
    ctx.quadraticCurveTo((px + x) / 2, (py + y) / 2 + (i % 2 ? -6 : 6), x, y);
    px = x; py = y;
  }
  ctx.quadraticCurveTo(-70, -112, -74, -96);
  ctx.closePath();
  const g = ctx.createLinearGradient(-60, -170, 60, -100);
  g.addColorStop(0, spec.hairLight); g.addColorStop(0.5, spec.hair); g.addColorStop(1, spec.hairShade);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#B8402F'; ctx.stroke();
  // shine
  ctx.globalAlpha = 0.5; ctx.lineCap = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = '#FFD2B0';
  ctx.beginPath(); ctx.moveTo(-40, -160); ctx.quadraticCurveTo(-10, -170, 18, -164); ctx.stroke();
  ctx.globalAlpha = 1;
  // gold heart clip
  L.heartPath(ctx, 50, -150, 11);
  ctx.fillStyle = spec.trim; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#B9822A'; ctx.stroke();
  sparkle(ctx, 56, -158, 6 + 2 * Math.sin(t * 4), 0, '#FFE7A0', 0.9, false);
  ctx.restore();
}

function drawFrontHairLumi(ctx, spec, t) {
  ctx.save();
  // side locks
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 64, -120);
    ctx.bezierCurveTo(side * 86, -80, side * 70 + Math.sin(t * 1.7 + side) * 4, -40, side * 80, -6);
    ctx.bezierCurveTo(side * 66, -20, side * 56, -60, side * 54, -100);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -120, 0, 0);
    g.addColorStop(0, spec.hair); g.addColorStop(1, spec.hairShade);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#8A70D6'; ctx.stroke();
  }
  // soft swept fringe
  ctx.beginPath();
  ctx.moveTo(-72, -94);
  ctx.bezierCurveTo(-84, -150, -40, -178, 4, -176);
  ctx.bezierCurveTo(48, -176, 86, -146, 72, -92);
  ctx.bezierCurveTo(60, -112, 40, -126, 16, -128);
  ctx.bezierCurveTo(30, -118, 34, -108, 30, -100);
  ctx.bezierCurveTo(12, -122, -24, -132, -44, -118);
  ctx.bezierCurveTo(-56, -112, -66, -104, -72, -94);
  ctx.closePath();
  const g = ctx.createLinearGradient(-60, -175, 60, -100);
  g.addColorStop(0, spec.hairLight); g.addColorStop(0.55, spec.hair); g.addColorStop(1, spec.hairShade);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#8A70D6'; ctx.stroke();
  ctx.globalAlpha = 0.6; ctx.lineCap = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(-36, -162); ctx.quadraticCurveTo(-6, -172, 22, -166); ctx.stroke();
  ctx.globalAlpha = 1;
  // crescent moon clip
  ctx.save();
  ctx.translate(-50, -150); ctx.rotate(-0.5);
  glow(ctx, 0, 0, 40, spec.trim, 0.5);
  ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.arc(6, -4, 12, 0, TAU, true);
  ctx.fillStyle = spec.trim; ctx.fill('evenodd');
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const a = t * 2 + i * 2.1;
    sparkle(ctx, -20 + i * 30, -168 + (i % 2) * 18, 4 + 2.5 * Math.sin(a), 0, '#FFFFFF', 0.5 + 0.5 * Math.sin(a), false);
  }
  ctx.restore();
}

module.exports = { SPECS, drawFairy, drawShield, drawWand, drawStarFace, drawKey, drawToothbrush, blinkAt };
