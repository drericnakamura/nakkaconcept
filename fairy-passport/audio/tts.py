"""Narration with Kokoro-82M (Apache-2.0, runs offline on CPU).

    python3 audio/tts.py --models /path/to/kokoro-dir

Writes build/audio/<fairy>_line<k>.wav (48 kHz mono) and build/audio/narration.json
with exact sentence timings for captions. To use a studio take instead (e.g. an
ElevenLabs voice), drop a WAV with the same name into build/audio/ and pass
--keep-existing: timings are then re-measured from the file you supplied.
"""
import argparse, json, os, re
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'build', 'audio')
SR = 48000

# pronunciation fixes, applied to the phoneme string
NAMES = {'bɹˈævi': 'bɹˈɑːvi'}           # Bravi → "BRAH-vee"


def trim(x, sr, thr=0.012, pad=0.03):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(pad * sr)); b = min(len(x), idx[-1] + int(pad * 2 * sr))
    return x[a:b]


def synth(k, tok, text, voice, speed):
    ph = tok.phonemize(text, 'en-us')
    for a, b in NAMES.items():
        ph = ph.replace(a, b)
    y, sr = k.create(ph, voice=voice, speed=speed, lang='en-us', is_phonemes=True)
    y = trim(np.asarray(y, dtype=np.float32), sr)
    y = resample_poly(y, SR, sr).astype(np.float32)
    return y


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--models', required=False, default=os.environ.get('KOKORO_DIR', ''))
    ap.add_argument('--voice', default='af_heart')
    ap.add_argument('--speed', type=float, default=0.96)
    ap.add_argument('--keep-existing', action='store_true')
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    script = json.load(open(os.path.join(ROOT, 'audio', 'script.json')))
    k = tok = None
    timing = {}
    for fairy in ('bravi', 'lumi'):
        timing[fairy] = []
        for li, line in enumerate(script[fairy]):
            path = os.path.join(OUT, f'{fairy}_line{li}.wav')
            reward = line['phase'] == 'reward'
            if args.keep_existing and os.path.exists(path):
                y, _ = sf.read(path, dtype='float32')
                dur = len(y) / SR
                # captions spread by character count when the take came from elsewhere
                n = sum(len(s) for s in line['sentences'])
                caps, c = [], 0.0
                for s in line['sentences']:
                    d = dur * len(s) / n
                    caps.append({'start': round(line['at'] + c, 3), 'end': round(line['at'] + c + d, 3), 'text': s}); c += d
                timing[fairy].append({'at': line['at'], 'dur': dur, 'file': os.path.basename(path), 'captions': caps})
                continue
            if k is None:
                from kokoro_onnx import Kokoro
                from kokoro_onnx.tokenizer import Tokenizer
                k = Kokoro(os.path.join(args.models, 'kokoro-v1.0.onnx'), os.path.join(args.models, 'voices-v1.0.bin'))
                tok = Tokenizer()
            speed = args.speed * (1.06 if reward else 1.0)
            limit = line.get('max') or (125 - line['at'] - 0.15 if reward else 24.0)
            while True:
                parts, caps, t = [], [], 0.0
                for si, s in enumerate(line['sentences']):
                    y = synth(k, tok, s, args.voice, speed)
                    caps.append({'start': round(line['at'] + t, 3), 'end': round(line['at'] + t + len(y) / SR, 3), 'text': s})
                    parts.append(y); t += len(y) / SR
                    if si < len(line['sentences']) - 1:
                        gap = 0.38 if s.endswith('...') else 0.24
                        parts.append(np.zeros(int(gap * SR), np.float32)); t += gap
                y = np.concatenate(parts)
                dur = len(y) / SR
                if dur <= limit or speed > 1.2:
                    break
                speed *= 1.03
            if dur > limit:
                print(f'  ! {fairy} line{li} is {dur:.2f}s, window {limit:.2f}s — shorten the text')
            peak = np.max(np.abs(y)) + 1e-9
            y = (y / peak * 0.89).astype(np.float32)
            sf.write(path, y, SR, subtype='FLOAT')
            timing[fairy].append({'at': line['at'], 'dur': round(dur, 3), 'speed': round(speed, 3), 'file': os.path.basename(path), 'captions': caps})
            print(f'{fairy} line{li}: {dur:.2f}s at {line["at"]}s (speed {speed:.2f})')
    json.dump(timing, open(os.path.join(OUT, 'narration.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
