// QA helper: node src/stills.js bravi 0 12 30.5 ... → build/qa/<id>_<t>.png + contact sheet
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./lib');
const { drawFrame } = require('./frame');
const [id, ...ts] = process.argv.slice(2);
const out = path.join(__dirname, '..', 'build', 'qa');
fs.mkdirSync(out, { recursive: true });
const times = ts.map(Number);
const thumbs = [];
for (const t of times) {
  const c = L.makeCanvas(1080, 1920), x = c.getContext('2d');
  const t0 = Date.now();
  drawFrame(x, id, t);
  const ms = Date.now() - t0;
  fs.writeFileSync(path.join(out, `${id}_${t}.png`), c.toBuffer('image/png'));
  thumbs.push(c);
  console.log(`t=${t} ${ms}ms`);
}
const cols = Math.min(4, thumbs.length), rows = Math.ceil(thumbs.length / cols);
const tw = 360, th = 640;
const sheet = L.makeCanvas(cols * tw, rows * (th + 30)), s = sheet.getContext('2d');
s.fillStyle = '#222'; s.fillRect(0, 0, sheet.width, sheet.height);
thumbs.forEach((c, i) => {
  s.drawImage(c, (i % cols) * tw, Math.floor(i / cols) * (th + 30), tw, th);
  L.text(s, `t=${times[i]}`, (i % cols) * tw + tw / 2, Math.floor(i / cols) * (th + 30) + th + 15, { size: 20, color: '#fff' });
});
fs.writeFileSync(path.join(out, `${id}_sheet.png`), sheet.toBuffer('image/png'));
