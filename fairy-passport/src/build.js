// Orchestrator: render all segments in parallel, then mux picture + sound + captions.
//   node src/build.js [bravi|lumi ...]
// Needs build/audio/<fairy>_{brush,reward,full}.wav and narration.json (audio/*.py).
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execFileSync } = require('child_process');
const { FPS, BRUSH, REWARD } = require('./timeline');

const ROOT = path.join(__dirname, '..');
const SEG = path.join(ROOT, 'build', 'segments');
const AUD = path.join(ROOT, 'build', 'audio');
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(SEG, { recursive: true });

const TITLES = {
  bravi: { slug: 'FairyPassport_Bravi_TheCastleOfCourage', title: 'Fairy Passport — Bravi: The Castle of Courage' },
  lumi: { slug: 'FairyPassport_Lumi_TheFourLostStars', title: 'Fairy Passport — Lumi: The Four Lost Stars' },
};
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['bravi', 'lumi'];
const B = BRUSH * FPS, R = (BRUSH + REWARD) * FPS;
const ranges = [[0, 900], [900, 1800], [1800, 2700], [2700, 3600], [3600, R]];

function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${cmd} exited ${c}`))));
  });
}

async function pool(jobs, n) {
  const q = jobs.slice();
  await Promise.all(Array.from({ length: n }, async () => { while (q.length) await q.shift()(); }));
}

const ts = (s) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60, r = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(r).padStart(3, '0')}`;
};
function srt(caps, from, to) {
  return caps.filter((c) => c.start >= from - 1e-6 && c.start < to)
    .map((c, i) => `${i + 1}\n${ts(c.start - from)} --> ${ts(Math.min(c.end + 0.25, to) - from)}\n${c.text}\n`).join('\n');
}

(async () => {
  const t0 = Date.now();
  const jobs = [];
  for (const id of ids) {
    ranges.forEach(([a, b], i) => {
      const out = path.join(SEG, `${id}_${i}.mp4`);
      jobs.push(() => run('node', [path.join(__dirname, 'render.js'), id, String(a), String(b), out]));
    });
  }
  await pool(jobs, Math.max(2, Math.min(4, os.cpus().length)));
  console.log(`rendered in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

  const nar = JSON.parse(fs.readFileSync(path.join(AUD, 'narration.json'), 'utf8'));
  for (const id of ids) {
    const dir = path.join(OUT, id);
    fs.mkdirSync(dir, { recursive: true });
    const { slug, title } = TITLES[id];
    const caps = nar[id].flatMap((l) => l.captions);
    const lists = {
      brush: [0, 1, 2, 3], reward: [4], full: [0, 1, 2, 3, 4],
    };
    const meta = {
      brush: { name: `${slug}_brushing_120s`, a: `${id}_brush.wav`, from: 0, to: BRUSH, desc: '120 s brushing sequence: 4 × 30 s quadrants (top right, top left, bottom left, bottom right).' },
      reward: { name: `${slug}_reward_5s`, a: `${id}_reward.wav`, from: BRUSH, to: BRUSH + REWARD, desc: '5 s reward sequence — plays after brushing, never takes brushing time.' },
      full: { name: `${slug}_full_125s`, a: `${id}_full.wav`, from: 0, to: BRUSH + REWARD, desc: '120 s brushing + 5 s reward, back to back.' },
    };
    for (const k of Object.keys(lists)) {
      const m = meta[k];
      const list = path.join(SEG, `${id}_${k}.txt`);
      fs.writeFileSync(list, lists[k].map((i) => `file '${path.join(SEG, `${id}_${i}.mp4`)}'`).join('\n') + '\n');
      const srtPath = path.join(dir, `${m.name}.en.srt`);
      fs.writeFileSync(srtPath, srt(caps, m.from, m.to));
      const mp4 = path.join(dir, `${m.name}.mp4`);
      await run('ffmpeg', ['-y', '-loglevel', 'error',
        '-f', 'concat', '-safe', '0', '-i', list,
        '-i', path.join(AUD, m.a), '-i', srtPath,
        '-map', '0:v', '-map', '1:a', '-map', '2:s',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
        '-c:s', 'mov_text', '-metadata:s:s:0', 'language=eng', '-disposition:s:0', '0',
        '-metadata', `title=${title}`, '-metadata', `comment=${m.desc}`,
        '-movflags', '+faststart', mp4]);
      const probe = execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames,width,height,r_frame_rate', '-of', 'csv=p=0', mp4]).toString().trim();
      const adur = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=duration', '-of', 'csv=p=0', mp4]).toString().trim();
      const size = (fs.statSync(mp4).size / 1e6).toFixed(1);
      console.log(`${path.basename(mp4)}  video ${probe}  audio ${adur}s  ${size} MB`);
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
