// Compose one frame: story layer → HUD layer → reward layer → film finish.
'use strict';
const L = require('./lib');
// v2 coaching HUD (one step every 5 s) is the default; FP_HUD=v1 brings back the first cut
const { drawHUD } = process.env.FP_HUD === 'v1' ? require('./hud') : process.env.FP_HUD === 'v3' ? require('./hud_v3') : require('./hud_v2');
const { BRUSH } = require('./timeline');
const SCENES = { bravi: require('./scenes/bravi'), lumi: null };
let reward = null;

function scene(id) {
  if (!SCENES[id]) SCENES[id] = require(`./scenes/${id}`);
  return SCENES[id];
}

function drawFrame(ctx, id, t) {
  ctx.save();
  scene(id).draw(ctx, t);
  ctx.restore();
  if (t >= BRUSH) {
    if (!reward) reward = require('./reward');
    reward.drawRewardBack(ctx, id, t - BRUSH);
  }
  L.finishFrame(ctx, 1080, 1920, id === 'lumi' ? '#0d0826' : '#3a1f45', id === 'lumi' ? 0.38 : 0.22);
  drawHUD(ctx, id, t);
  if (t >= BRUSH) reward.drawRewardFront(ctx, id, t - BRUSH);
}

module.exports = { drawFrame };
