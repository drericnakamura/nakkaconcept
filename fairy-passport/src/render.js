// Worker: render frames [start, end) of one fairy and encode them to a segment.
//   node src/render.js <fairy> <start> <end> <out.mp4>
'use strict';
const { spawn } = require('child_process');
const L = require('./lib');
const { drawFrame } = require('./frame');
const { FPS, W, H } = require('./timeline');

const [id, s, e, out] = process.argv.slice(2);
const start = Number(s), end = Number(e);

const ff = spawn('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-tune', 'animation',
  '-profile:v', 'high', '-level', '4.2', '-g', '60', '-bf', '2', '-threads', '2',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-r', String(FPS), out,
], { stdio: ['pipe', 'inherit', 'inherit'] });

(async () => {
  const c = L.makeCanvas(W, H), x = c.getContext('2d');
  const t0 = Date.now();
  for (let f = start; f < end; f++) {
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    drawFrame(x, id, f / FPS);           // time comes ONLY from the frame number
    const buf = Buffer.from(c.data());
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((f - start) % 300 === 299) process.stderr.write(`[${id} ${start}-${end}] ${f + 1 - start}/${end - start} frames, ${((Date.now() - t0) / (f + 1 - start)).toFixed(0)} ms/frame\n`);
  }
  ff.stdin.end();
  ff.on('close', (code) => process.exit(code));
})();
