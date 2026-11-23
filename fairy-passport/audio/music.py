"""Original score + sound effects + final mix, synthesised from scratch.

Every bar is exactly 2.5 s (Bravi: 4/4 at 96 BPM; Lumi: 3/4 at 72 BPM), so each
30 s brushing phase is exactly 12 bars and every musical phrase turns over on a
quadrant change. The music grows one layer per phase.

    python3 audio/music.py            → build/audio/<fairy>_{full,brush,reward}.wav
"""
import json, os
import numpy as np
import soundfile as sf
from scipy.signal import fftconvolve, lfilter, butter, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'build', 'audio')
SR = 48000
TOTAL = 125.0
BRUSH = 120.0
N = int(TOTAL * SR)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def T(d):
    return np.arange(int(d * SR)) / SR


class Bus:
    def __init__(self):
        self.x = np.zeros((2, N), np.float32)

    def add(self, sig, at, pan=0.0, gain=1.0):
        i = int(round(at * SR))
        if i >= N:
            return
        sig = np.asarray(sig, np.float32) * gain
        if sig.ndim == 1:
            l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
            sig = np.vstack([sig * l * 1.414, sig * r * 1.414])
        n = min(sig.shape[1], N - i)
        if i < 0:
            sig = sig[:, -i:]; n = min(sig.shape[1], N); i = 0
        self.x[:, i:i + n] += sig[:, :n]


rng = np.random.default_rng(7)

# ---------------- instruments ----------------

def music_box(f, vel=1.0, dur=2.6):
    t = T(dur)
    env = (1 - np.exp(-t / 0.002)) * np.exp(-t / 0.75)
    idx = 1.1 * np.exp(-t / 0.07)
    y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * 3.5 * f * t))
    y += 0.22 * np.sin(2 * np.pi * 4.02 * f * t) * np.exp(-t / 0.12)
    return y * env * vel


def celesta(f, vel=1.0, dur=2.8):
    t = T(dur)
    env = (1 - np.exp(-t / 0.003)) * np.exp(-t / 1.1)
    idx = 0.9 * np.exp(-t / 0.25)
    y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    y += 0.18 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.4)
    return y * env * vel


def harp(f, vel=1.0, dur=3.0):
    t = T(dur)
    y = np.zeros_like(t)
    for n in range(1, 11):
        fn = f * n * (1 + 0.0004 * n * n)
        if fn > 16000:
            break
        y += (1 / n ** 1.4) * np.sin(2 * np.pi * fn * t + n) * np.exp(-t * (0.9 + 0.55 * (n - 1)))
    return y * (1 - np.exp(-t / 0.002)) * vel


def pad(freqs, dur, vel=1.0, attack=0.9, release=1.3):
    t = T(dur + release)
    out = np.zeros((2, len(t)))
    env = np.minimum(1, t / attack) * np.where(t < dur, 1.0, np.exp(-(t - dur) / (release / 3)))
    for k, f in enumerate(freqs):
        for v, det in enumerate((-0.0035, 0.0, 0.0035)):
            ff = f * (1 + det + 0.0012 * np.sin(2 * np.pi * (0.21 + 0.07 * v) * t + k))
            ph = 2 * np.pi * np.cumsum(ff) / SR
            y = sum((1 / n) * np.exp(-(n - 1) / 2.6) * np.sin(n * ph) for n in range(1, 8))
            side = (v - 1) * 0.6
            out[0] += y * (1 - side) ; out[1] += y * (1 + side)
    return out * env * vel / (len(freqs) * 3)


def bass(f, vel=1.0, dur=2.4):
    t = T(dur)
    y = np.sin(2 * np.pi * f * t) + 0.28 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
    return y * (1 - np.exp(-t / 0.006)) * np.exp(-t / 1.3) * vel


def flute(f, dur, vel=1.0):
    t = T(dur + 0.25)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(1, np.maximum(0, (t - 0.25) / 0.3))
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    y = np.sin(ph) + 0.16 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)
    breath = lfilter([0.08], [1, -0.92], rng.standard_normal(len(t))) * 0.25
    env = np.minimum(1, t / 0.07) * np.where(t < dur, 1.0, np.exp(-(t - dur) / 0.08))
    return (y + breath) * env * vel


def noise_hit(dur, tau, hp=6000, lp=None, vel=1.0):
    t = T(dur)
    n = rng.standard_normal(len(t))
    sos = butter(2, hp, 'hp', fs=SR, output='sos') if lp is None else butter(2, [hp, lp], 'bp', fs=SR, output='sos')
    return sosfilt(sos, n) * np.exp(-t / tau) * vel


def shaker(vel=1.0):
    t = T(0.12)
    return noise_hit(0.12, 0.025, 5000, 12000, vel) * np.minimum(1, t / 0.008)


def tamb(vel=1.0):
    t = T(0.35)
    y = noise_hit(0.35, 0.08, 7000, None, 0.6)
    for f in (5400, 7300, 9100, 11200):
        y += 0.25 * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.09)
    return y * vel


def tock(vel=1.0):
    t = T(0.18)
    y = np.sin(2 * np.pi * 820 * t) * np.exp(-t / 0.028) + 0.5 * np.sin(2 * np.pi * 1630 * t) * np.exp(-t / 0.016)
    return y * vel


def shimmer(dur=1.6, base=2200, n=26, vel=1.0, seed=0, rise=False):
    r = np.random.default_rng(seed)
    out = np.zeros((2, int((dur + 1.2) * SR)))
    for k in range(n):
        at = (k / n) * dur if rise else r.uniform(0, dur)
        f = base * (2 ** (r.uniform(0, 2.2) if not rise else 2.2 * k / n + r.uniform(-0.1, 0.1)))
        s = celesta(f, 0.12 + 0.1 * r.random(), 1.1)
        i = int(at * SR); p = r.uniform(-0.8, 0.8)
        out[0, i:i + len(s)] += s * (1 - p) ; out[1, i:i + len(s)] += s * (1 + p)
    return out * vel * 0.5


def whoosh(dur=0.9, vel=1.0, up=True):
    t = T(dur)
    n = rng.standard_normal(len(t))
    y = np.zeros_like(n)
    # sweep a band-pass by processing in chunks
    chunks = 24
    L = len(n) // chunks
    for c in range(chunks):
        u = c / (chunks - 1)
        fc = 400 * (2 ** ((u if up else 1 - u) * 3.5))
        sos = butter(2, [fc * 0.7, min(fc * 1.6, 20000)], 'bp', fs=SR, output='sos')
        seg = sosfilt(sos, n[max(0, c * L - 2000):(c + 1) * L])[-L:]
        y[c * L:(c + 1) * L] = seg
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return y * env * vel


def swell(dur, vel=1.0):
    t = T(dur + 0.3)
    y = noise_hit(dur + 0.3, 10, 3000, 14000, 1.0)
    env = (np.clip(t / dur, 0, 1) ** 2.2) * np.where(t < dur, 1, np.exp(-(t - dur) / 0.08))
    return y * env * vel


def stone_crack(vel=1.0, seed=1):
    r = np.random.default_rng(seed)
    t = T(0.7)
    y = noise_hit(0.7, 0.045, 180, 2600, 1.0)
    y += 0.5 * np.sin(2 * np.pi * 70 * t) * np.exp(-t / 0.08)
    for k in range(6):                                  # little pebbles
        i = int(r.uniform(0.08, 0.55) * SR)
        c = noise_hit(0.05, 0.008, 1500, 6000, r.uniform(0.2, 0.5))
        y[i:i + len(c)] += c[:len(y) - i]
    return y * vel


def gate_clank(vel=1.0):
    t = T(0.9)
    y = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, a, d in ((182, 0.6, 0.35), (413, 0.5, 0.25), (761, 0.35, 0.18), (1130, 0.25, 0.12)))
    for k in range(5):                                  # chain rattle
        i = int((0.12 + k * 0.07) * SR)
        c = noise_hit(0.04, 0.01, 2500, 8000, 0.35)
        y[i:i + len(c)] += c
    return y * vel


def ice_crack(vel=1.0, seed=5):
    r = np.random.default_rng(seed)
    t = T(0.8)
    y = noise_hit(0.8, 0.02, 4500, None, 1.0)
    for k in range(5):
        f = r.uniform(2400, 5200)
        y += 0.25 * np.sin(2 * np.pi * f * t + k) * np.exp(-t / r.uniform(0.05, 0.2))
    return y * vel


def lock_pop(vel=1.0):
    t = T(0.6)
    y = noise_hit(0.6, 0.006, 3000, 9000, 0.8)
    y += sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, a, d in ((2210, 0.5, 0.12), (3120, 0.35, 0.08), (4730, 0.25, 0.05)))
    return y * vel


def rustle(vel=1.0):
    t = T(0.6)
    y = noise_hit(0.6, 0.25, 1200, 5200, 1.0) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * t)) * np.sin(np.pi * np.clip(t / 0.6, 0, 1))
    return y * vel


def mission_sound(sfx, fairy, ph, at, key, i):
    """One small sound per step, matching what opens on screen."""
    if fairy == 'bravi':
        if ph == 0:   # a heart-lock pops and the door creaks a little
            sfx.add(lock_pop(0.32), at, 0.3); sfx.add(swell(0.5, 0.05), at + 0.05, 0.2)
        elif ph == 1:  # a vine lets go and blooms
            sfx.add(rustle(0.22), at - 0.05, -0.3); sfx.add(celesta(mtof(key + 24 + i), 0.2, 1.2), at + 0.35, -0.2)
        elif ph == 2:  # a piece of stone cracks off
            sfx.add(stone_crack(0.38, 10 + i), at, -0.2)
        else:          # the portcullis rises a notch
            sfx.add(gate_clank(0.28), at, 0.25)
    else:
        if ph == 0:   # a puff of cloud floats away
            sfx.add(whoosh(0.7, 0.08, True), at - 0.05, 0.4); sfx.add(celesta(mtof(key + 26), 0.18, 1.0), at + 0.25, 0.4)
        elif ph == 1:  # a new crack in the ice
            sfx.add(ice_crack(0.3, 20 + i), at, -0.4)
        elif ph == 2:  # a petal opens
            for j, m in enumerate((key + 12, key + 16, key + 19)):
                sfx.add(harp(mtof(m + i), 0.22), at + j * 0.07, -0.3)
        else:          # a firefly snaps a point onto the star
            sfx.add(celesta(mtof(key + 24 + (i * 2) % 7), 0.28, 1.2), at, 0.2); sfx.add(shimmer(0.6, 2600, 8, 0.5, seed=300 + i), at + 0.05)


# ---------------- reverb ----------------

def make_ir(rt=2.2, seed=3):
    r = np.random.default_rng(seed)
    t = T(rt)
    ir = np.zeros((2, len(t)))
    for ch in range(2):
        n = r.standard_normal(len(t))
        n = lfilter([0.35], [1, -0.65], n)          # darker tail
        ir[ch] = n * np.exp(-t / (rt / 6.9))
        for k in range(8):                           # early reflections
            i = int(r.uniform(0.008, 0.07) * SR)
            ir[ch, i] += r.uniform(0.2, 0.5) * (1 if r.random() > 0.5 else -1)
    ir /= np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))
    return ir


IR = make_ir()


def reverb(x, wet):
    y = np.vstack([fftconvolve(x[0], IR[0])[:N], fftconvolve(x[1], IR[1])[:N]])
    return x * (1 - wet * 0.35) + y * wet


# ---------------- compositions ----------------
# chord = (bass midi, pad voicing, arp tones)
BRAVI = {
    'beats': 4, 'beat': 0.625,
    'chords': {
        'C': (48, [60, 64, 67], [60, 64, 67]), 'G': (43, [59, 62, 67], [55, 59, 62]), 'Am': (45, [60, 64, 69], [57, 60, 64]),
        'F': (41, [60, 65, 69], [53, 57, 60]), 'Em': (40, [59, 64, 67], [52, 55, 59]),
    },
    'prog': ['C', 'G', 'Am', 'F', 'C', 'Em', 'F', 'G', 'Am', 'F', 'C', 'G'],
    # (bar, beat, beats, midi)
    'melody': [
        (0, 0, 1, 76), (0, 1, 1, 79), (0, 2, 1.5, 84), (0, 3.5, 0.5, 83),
        (1, 0, 1, 79), (1, 1, 1, 74), (1, 2, 2, 79),
        (2, 0, 1, 76), (2, 1, 1, 81), (2, 2, 1, 79), (2, 3, 1, 76),
        (3, 0, 1.5, 77), (3, 1.5, 0.5, 76), (3, 2, 2, 72),
        (4, 0, 0.5, 72), (4, 0.5, 0.5, 74), (4, 1, 1, 76), (4, 2, 1, 79), (4, 3, 1, 76),
        (5, 0, 1, 79), (5, 1, 1, 83), (5, 2, 2, 79),
        (6, 0, 1, 81), (6, 1, 1, 77), (6, 2, 1, 81), (6, 3, 1, 84),
        (7, 0, 3, 83), (7, 3, 1, 74),
        (8, 0, 1, 76), (8, 1, 0.5, 77), (8, 1.5, 0.5, 76), (8, 2, 2, 72),
        (9, 0, 1, 77), (9, 1, 0.5, 79), (9, 1.5, 0.5, 77), (9, 2, 2, 76),
        (10, 0, 1, 79), (10, 1, 1, 76), (10, 2, 1, 74), (10, 3, 1, 76),
        (11, 0, 2, 74),
    ],
    'key_root': 72,
}
LUMI = {
    'beats': 3, 'beat': 2.5 / 3,
    'chords': {
        'F': (41, [57, 60, 65], [53, 60, 65, 69]), 'Dm': (38, [57, 62, 65], [50, 57, 62, 65]), 'Bb': (46, [58, 62, 65], [46, 53, 58, 62]),
        'C': (48, [55, 60, 64], [48, 55, 60, 64]), 'Am': (45, [57, 60, 64], [45, 52, 57, 60]),
    },
    'prog': ['F', 'Dm', 'Bb', 'C', 'F', 'Am', 'Bb', 'C', 'Dm', 'Bb', 'F', 'C'],
    'melody': [
        (0, 0, 1, 81), (0, 1, 1, 84), (0, 2, 1, 81),
        (1, 0, 2, 77), (1, 2, 1, 74),
        (2, 0, 1, 74), (2, 1, 1, 77), (2, 2, 1, 82),
        (3, 0, 2, 79), (3, 2, 1, 76),
        (4, 0, 1, 77), (4, 1, 1, 81), (4, 2, 1, 84),
        (5, 0, 2, 84), (5, 2, 1, 81),
        (6, 0, 1, 82), (6, 1, 1, 81), (6, 2, 1, 79),
        (7, 0, 3, 79),
        (8, 0, 1, 77), (8, 1, 1, 81), (8, 2, 1, 86),
        (9, 0, 2, 86), (9, 2, 1, 82),
        (10, 0, 1, 81), (10, 1, 1, 79), (10, 2, 1, 77),
        (11, 0, 2, 79),
    ],
    'key_root': 77,
}


def compose(fairy, mus, sfx):
    S = BRAVI if fairy == 'bravi' else LUMI
    beat, nb = S['beat'], S['beats']
    bar = beat * nb
    assert abs(bar - 2.5) < 1e-9
    for ph in range(4):
        for b in range(12):
            t0 = ph * 30 + b * bar
            name = S['prog'][b]
            bm, voicing, arp = S['chords'][name]
            # pad (louder later)
            mus.add(pad([mtof(m) for m in voicing], bar * 0.98, 0.55 + 0.12 * ph), t0, 0, 1.0)
            # bass
            mus.add(bass(mtof(bm), 0.42), t0, -0.1)
            if fairy == 'bravi' and ph >= 1:
                mus.add(bass(mtof(bm), 0.28), t0 + 2 * beat, -0.1)
            # arpeggios from phase 2
            if ph >= 1:
                if fairy == 'bravi':
                    pat = [arp[0] + 12, arp[1] + 12, arp[2] + 12, arp[0] + 24, arp[2] + 12, arp[1] + 12, arp[2] + 12, arp[0] + 24]
                    for i, m in enumerate(pat):
                        mus.add(harp(mtof(m), 0.12 + 0.02 * ph), t0 + i * beat / 2, 0.35 if i % 2 else 0.2)
                else:
                    pat = [arp[0] + 12, arp[1] + 12, arp[2] + 12, arp[3] + 12, arp[2] + 12, arp[1] + 12]
                    for i, m in enumerate(pat):
                        mus.add(harp(mtof(m), 0.13 + 0.02 * ph), t0 + i * beat / 2, 0.3 if i % 2 else 0.15)
            elif fairy == 'lumi':
                mus.add(harp(mtof(arp[0] + 12), 0.16), t0, 0.2)
            # percussion (Bravi, gentle) from phase 3
            if fairy == 'bravi' and ph >= 2:
                for i in range(8):
                    mus.add(shaker(0.05 + (0.02 if i % 2 == 0 else 0)), t0 + i * beat / 2, 0.45)
                if ph == 3:
                    for i in (1, 3):
                        mus.add(tamb(0.05), t0 + i * beat, -0.4)
        # melody
        for (b, bt, ln, m) in S['melody']:
            if ph == 0 and 4 <= b < 8:
                continue                              # leave phrase B quiet in phase 1
            at = ph * 30 + b * bar + bt * beat
            if ph == 0:
                mus.add(music_box(mtof(m), 0.32), at, 0.15)
            elif ph == 1:
                mus.add(celesta(mtof(m), 0.34), at, 0.1)
            elif ph == 2:
                mus.add(flute(mtof(m - 12), ln * beat * 0.95, 0.2), at, -0.15)
                if bt == 0:
                    mus.add(music_box(mtof(m + 12), 0.12), at, 0.4)
            else:
                mus.add(music_box(mtof(m), 0.3), at, 0.15)
                mus.add(celesta(mtof(m + 12), 0.12), at, -0.2)
        # phase 1, phrase B: tiny twinkles instead of melody
        if ph == 0:
            for b in range(4, 8):
                mus.add(music_box(mtof(S['key_root'] + 19 + (b % 2) * 3), 0.12), b * bar + beat * (nb - 1), 0.5)
    # lead-in run into the reward (last bar)
    root = S['key_root']
    run = [root - 5, root - 1, root + 2, root + 7, root + 11, root + 14] if fairy == 'bravi' else [root - 5, root - 1, root + 2, root + 7, root + 11, root + 14]
    for i, m in enumerate(run):
        mus.add(harp(mtof(m), 0.18), 117.5 + 1.0 + i * 0.16, 0.2)
    # reward: big resolving chord + fanfare
    tonic = 'C' if fairy == 'bravi' else 'F'
    bm, voicing, arp = S['chords'][tonic]
    mus.add(pad([mtof(m) for m in voicing + [voicing[0] + 12]], 4.4, 1.0, attack=0.25, release=0.8), 120.02, 0, 1.0)
    mus.add(bass(mtof(bm), 0.5, 4.0), 120.02, 0)
    r = S['key_root']
    fan = [r, r + 4, r + 7, r + 12, r + 16, r + 19, r + 24] if fairy == 'bravi' else [r, r + 4, r + 7, r + 12, r + 16, r + 19, r + 24]
    for i, m in enumerate(fan):
        mus.add(celesta(mtof(m), 0.3), 120.95 + i * 0.07, (i / 6 - 0.5) * 0.8)
    motif = [(0, r + 4), (0.4, r + 7), (0.8, r + 12)] if fairy == 'bravi' else [(0, r + 4), (0.5, r + 7), (1.0, r + 12)]
    for d, m in motif:
        mus.add(music_box(mtof(m), 0.34), 122.2 + d, 0.1)
    # gentle fade at the very end
    fade = np.ones(N); i0 = int(124.2 * SR); fade[i0:] = np.linspace(1, 0, N - i0) ** 1.5
    mus.x *= fade

    # ---------- sound effects ----------
    key = S['key_root']
    for ph in range(4):
        for i, s in enumerate((5, 10, 15, 20, 25)):          # every step: gem on the ring + the mission's own sound
            sfx.add(celesta(mtof(key + 19 + (i % 2) * 5), 0.3, 1.4), ph * 30 + s, 0.3)
            mission_sound(sfx, fairy, ph, ph * 30 + s, key, i)
        for s in (27, 28, 29):                               # 3-2-1 before switching
            sfx.add(tock(0.32 if s < 29 else 0.42), ph * 30 + s, -0.25)
    for tq in (30, 60, 90, 120):                             # mission complete
        at = tq + 0.0
        for i, m in enumerate([key, key + 4, key + 7, key + 12]):
            sfx.add(celesta(mtof(m + 12), 0.4, 2.0), at + i * 0.075, (i - 1.5) * 0.3)
        sfx.add(shimmer(1.3, 2600, 22, 0.8, seed=tq), at + 0.08)
        if fairy == 'bravi':
            sfx.add(whoosh(0.7, 0.18, True), at - 0.35, 0)
            sfx.add(bass(mtof(36), 0.35, 1.5), at, 0)          # warm "whoomp" as the door opens
        else:
            sfx.add(shimmer(1.4, 1800, 18, 0.7, seed=tq + 1, rise=True), at + 0.25)
    for tq in (3.0, 31.3, 61.4, 91.3, 120.4):               # fairy flights
        sfx.add(whoosh(1.1, 0.09, True), tq - 0.2, 0.3)
    if fairy == 'bravi':
        sfx.add(shimmer(2.0, 2000, 20, 0.5, seed=11), 0.2)
        # key turning in the lock
        sfx.add(tock(0.2), 59.6, -0.2); sfx.add(tock(0.16), 59.78, -0.2)
        sfx.add(swell(1.4, 0.12), 88.6, 0)                   # shield breaking free
        sfx.add(stone_crack(0.5), 90.0, 0); sfx.add(stone_crack(0.35, 3), 90.12, -0.4); sfx.add(stone_crack(0.3, 4), 90.22, 0.4)
        sfx.add(gate_clank(0.35), 120.0, 0.2)                # portcullis goes all the way up
        sfx.add(shimmer(1.6, 1600, 24, 0.7, seed=90, rise=True), 89.2)
        sfx.add(shimmer(2.2, 2200, 30, 0.6, seed=120), 120.3)  # castle lights up
    else:
        sfx.add(shimmer(2.0, 2400, 20, 0.5, seed=12), 0.2)
        for i in range(3):                                   # the moon's whisper
            sfx.add(celesta(mtof(key + 24 + i * 2), 0.12, 1.0), 70.2 + i * 0.18, -0.5)
        sfx.add(ice_crack(0.55), 60.0, -0.2); sfx.add(ice_crack(0.4, 9), 60.1, 0.3)   # crystal shatters
        for i in range(8):
            sfx.add(celesta(mtof(key + 31 + (i * 5) % 12), 0.12, 0.9), 60.05 + i * 0.045, (i % 3 - 1) * 0.6)
        sfx.add(shimmer(2.4, 1800, 34, 0.7, seed=121, rise=True), 120.2)  # constellation lines
    # badge unlock fanfare
    sfx.add(swell(0.9, 0.12), 0.0 + 120.1, 0)
    for i, m in enumerate([key + 12, key + 16, key + 19, key + 24]):
        sfx.add(music_box(mtof(m), 0.32, 2.0), 121.0 + i * 0.06, (i - 1.5) * 0.4)
    sfx.add(shimmer(1.8, 3000, 30, 0.8, seed=999), 121.05)


def loudness(x):
    try:
        import pyloudnorm as pyln
        return pyln.Meter(SR).integrated_loudness(x.T)
    except Exception:
        return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9) - 0.7


def main():
    os.makedirs(OUT, exist_ok=True)
    nar = json.load(open(os.path.join(OUT, 'narration.json')))
    for fairy in ('bravi', 'lumi'):
        mus, sfx, voc = Bus(), Bus(), Bus()
        compose(fairy, mus, sfx)
        mono = np.zeros(N, np.float32)
        for ln in nar[fairy]:
            y, sr = sf.read(os.path.join(OUT, ln['file']), dtype='float32')
            if y.ndim > 1:
                y = y.mean(axis=1)
            voc.add(y, ln['at'], 0.0, 1.0)
            i = int(ln['at'] * SR); mono[i:i + len(y)] += np.abs(y[:max(0, N - i)])
        # ducking: music −12 dB under the narrator, smooth attack/release
        env = (mono > 0.02).astype(np.float32)
        a_att, a_rel = np.exp(-64 / (0.08 * SR)), np.exp(-64 / (0.7 * SR))   # per 64-sample block
        g = np.zeros(N, np.float32); s = 0.0
        for i in range(0, N, 64):
            v = env[i:i + 64].max()
            s = (a_att if v > s else a_rel) * s + (1 - (a_att if v > s else a_rel)) * v
            g[i:i + 64] = s
        duck = 1 - 0.6 * g
        # each layer is set to its own loudness so the narrator always leads:
        # voice −16 LUFS, music bed −25 LUFS (ducked further under speech), effects −24 LUFS
        voice = reverb(voc.x, 0.06)
        voice *= 10 ** ((-16 - loudness(voice)) / 20)
        music = reverb(mus.x, 0.5)
        music *= 10 ** ((-23 - loudness(music)) / 20)
        music *= duck
        effects = reverb(sfx.x, 0.3)
        effects *= 10 ** ((-24 - loudness(effects)) / 20)
        mix = (music + effects + voice) * 10 ** (0.5 / 20)
        music, effects, voice = (b * 10 ** (0.5 / 20) for b in (music, effects, voice))
        lu = 0.0                      # stems below are written at their final level
        ceil = 0.89
        mix = np.where(np.abs(mix) > ceil * 0.8, np.sign(mix) * (ceil * 0.8 + (ceil * 0.2) * np.tanh((np.abs(mix) - ceil * 0.8) / (ceil * 0.2))), mix)
        mix = mix.astype(np.float32)
        b = int(BRUSH * SR)
        brush = mix[:, :b].copy(); f = int(0.04 * SR); brush[:, -f:] *= np.linspace(1, 0, f)
        reward = mix[:, b:].copy(); f2 = int(0.004 * SR); reward[:, :f2] *= np.linspace(0, 1, f2)
        sf.write(os.path.join(OUT, f'{fairy}_full.wav'), mix.T, SR, subtype='PCM_24')
        sf.write(os.path.join(OUT, f'{fairy}_brush.wav'), brush.T, SR, subtype='PCM_24')
        sf.write(os.path.join(OUT, f'{fairy}_reward.wav'), reward.T, SR, subtype='PCM_24')
        # stems for future re-edits
        for name, bus in (('music', music), ('sfx', effects), ('voice', voice)):
            sf.write(os.path.join(OUT, f'{fairy}_stem_{name}.wav'), (bus).T.astype(np.float32), SR, subtype='PCM_24')
        print(f'{fairy}: {mix.shape[1] / SR:.3f}s  mix {loudness(mix):.1f} LUFS  peak {np.max(np.abs(mix)):.3f}')


if __name__ == '__main__':
    main()
