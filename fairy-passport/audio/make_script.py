"""Turns the approved storyboard into the narration script.

    python3 audio/make_script.py        → audio/script.json

One short cue at the start of every 5-second step (it must end before the
next step), the closing line of step 6 before the countdown, then "Three!",
"Two!", "One!" exactly on the 3-2-1 ticks at :27, :28 and :29.
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sb = json.load(open(os.path.join(ROOT, 'storyboard', 'storyboard_v3.json'), encoding='utf-8'))


def tts_text(s):
    s = s.replace('…', '...').replace(' — ', ', ').replace('—', ', ')
    return re.sub(r'\s+', ' ', s).strip()


script = {'_note': 'Generated from storyboard/storyboard_v3.json by audio/make_script.py. at = start in seconds; max = longest the take may last.'}
for f in sb['fairies']:
    lines = []
    for q, quad in enumerate(f['quadrants']):
        for b, beat in enumerate(quad['beats']):
            t0 = q * 30 + b * 5
            vo = beat['vo']
            if b == 5:
                vo = re.split(r'…|\.\.\.', vo)[0].strip().rstrip(',') + '!'
                lines.append({'at': round(t0 + 0.25, 2), 'max': 1.65, 'phase': q + 1, 'step': 6, 'sentences': [tts_text(vo)]})
                for n, word in enumerate(['Three!', 'Two!', 'One!']):
                    lines.append({'at': round(q * 30 + 27 + n + 0.02, 2), 'max': 0.85, 'phase': q + 1, 'step': 'count', 'sentences': [word]})
                continue
            start = t0 + (0.35 if b == 0 else 0.2)
            lines.append({'at': round(start, 2), 'max': round(t0 + 5 - start - 0.12, 2), 'phase': q + 1, 'step': b + 1, 'sentences': [tts_text(vo)]})
    lines.append({'at': 120.3, 'max': 4.55, 'phase': 'reward', 'sentences': [tts_text(s) for s in re.split(r'(?<=!)\s+', f['reward']['vo']) if s]})
    script[f['id']] = lines
json.dump(script, open(os.path.join(ROOT, 'audio', 'script.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print({k: len(v) for k, v in script.items() if k != '_note'})
