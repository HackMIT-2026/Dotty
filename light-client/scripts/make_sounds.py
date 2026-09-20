"""
Synthesises Dotty's sound effects and background music, so there are no third-party audio files or licences.
Writes 16-bit mono WAVs into assets/sounds/.

    python3 -m venv .venv && .venv/bin/pip install numpy
    .venv/bin/python scripts/make_sounds.py
"""
import wave
from pathlib import Path

import numpy as np

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'sounds'
SR = 22050


def note(freq, dur, vol=0.5, kind='bell', sr=SR):
    t = np.arange(int(sr * dur)) / sr
    if kind == 'bell':  # music box: a few partials that die away at different speeds
        w = (np.sin(2 * np.pi * freq * t) * np.exp(-t * 5.5)
             + 0.35 * np.sin(2 * np.pi * freq * 2.01 * t) * np.exp(-t * 9)
             + 0.15 * np.sin(2 * np.pi * freq * 3.98 * t) * np.exp(-t * 14))
    elif kind == 'pluck':  # marimba-like: a warm tone that stops quickly
        w = (np.sin(2 * np.pi * freq * t) + 0.5 * np.sin(2 * np.pi * freq * 3.0 * t) * np.exp(-t * 30)) * np.exp(-t * 11)
    elif kind == 'pop':  # a quick blip
        w = np.sin(2 * np.pi * (freq * (1 + 0.6 * np.exp(-t * 40))) * t) * np.exp(-t * 22)
    else:  # soft pad
        w = (np.sin(2 * np.pi * freq * t) + 0.4 * np.sin(2 * np.pi * freq * 2 * t)) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    attack = np.clip(t / 0.004, 0, 1)
    return w * attack * vol


def mix(parts, total, sr=SR):
    buf = np.zeros(int(sr * total))
    for start, sig in parts:
        i = int(start * sr)
        end = min(len(buf), i + len(sig))
        buf[i:end] += sig[: end - i]
    return buf


def save(name, data, gain=0.85, sr=SR):
    peak = np.max(np.abs(data)) or 1
    pcm = (data / peak * gain * 32767).astype(np.int16)
    with wave.open(str(OUT / name), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sr)
        f.writeframes(pcm.tobytes())
    print(name, f'{len(pcm) / sr:.1f}s', f'{(OUT / name).stat().st_size // 1024} KB')


# note frequencies (C major pentatonic, plus a few extras)
C4, D4, E4, G4, A4 = 261.63, 293.66, 329.63, 392.0, 440.0
C5, D5, E5, G5, A5, C6 = 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5

# ---- effects: four styles the child can pick from, six sounds each (see EFFECT_STYLES in src/lib/sounds.ts)
rng = np.random.default_rng(7)


def click(dur=0.05, vol=0.5, sr=SR):
    """A tiny burst of noise, the 'knock' at the start of a wood-block sound."""
    n = int(sr * dur)
    t = np.arange(n) / sr
    return rng.standard_normal(n) * np.exp(-t * 90) * vol


def voice(kind, freq, dur, vol=0.6):
    t = np.arange(int(SR * dur)) / SR
    if kind == 'square':  # 8-bit: a hollow square wave that stops quickly
        w = np.sign(np.sin(2 * np.pi * freq * t)) * np.exp(-t * 14)
    elif kind == 'glock':  # glockenspiel: bright, ringing partials
        w = (np.sin(2 * np.pi * freq * t) + 0.5 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t * 6)
             + 0.25 * np.sin(2 * np.pi * freq * 5.4 * t) * np.exp(-t * 10)) * np.exp(-t * 4)
    elif kind == 'wood':  # wood block: a short low knock
        w = np.sin(2 * np.pi * freq * t) * np.exp(-t * 38)
    else:
        return note(freq, dur, vol, kind)
    return w * np.clip(t / 0.003, 0, 1) * vol


STYLES = {
    # the original: round bubbles and music-box bells
    'bubbles': dict(v='pop', tap=[(0, 880)], select=[(0, 660), (0.05, 990)], pop=[(0, 500)], open=[(0, 392), (0.07, 523.25), (0.14, 659.25)],
                    success=[(0, C5), (0.09, E5), (0.18, G5), (0.27, C6)], coin=[(0, 1318.5), (0.08, 1760)], succ_voice='bell'),
    # soft chimes: gentle glockenspiel
    'chimes': dict(v='glock', tap=[(0, 1174.7)], select=[(0, 1046.5), (0.06, 1318.5)], pop=[(0, 880)], open=[(0, 784), (0.1, 987.8), (0.2, 1174.7)],
                   success=[(0, C5), (0.11, E5), (0.22, G5), (0.33, C6), (0.44, E5 * 2)], coin=[(0, 1568), (0.09, 2093)], succ_voice='glock'),
    # retro game: square-wave blips
    'retro': dict(v='square', tap=[(0, 660)], select=[(0, 520), (0.06, 780)], pop=[(0, 440)], open=[(0, 330), (0.07, 440), (0.14, 660)],
                  success=[(0, 523), (0.08, 659), (0.16, 784), (0.24, 1047), (0.32, 784), (0.4, 1047)], coin=[(0, 988), (0.07, 1319)], succ_voice='square'),
    # wood: warm knocks
    'wood': dict(v='wood', tap=[(0, 520)], select=[(0, 420), (0.07, 560)], pop=[(0, 350)], open=[(0, 300), (0.09, 380), (0.18, 470)],
                 success=[(0, 392), (0.12, 494), (0.24, 587), (0.36, 784)], coin=[(0, 700), (0.08, 950)], succ_voice='wood'),
}
LENGTHS = dict(tap=0.16, select=0.3, pop=0.2, open=0.6, success=1.1, coin=0.7)
NOTE_LEN = dict(tap=0.12, select=0.16, pop=0.18, open=0.3, success=0.5, coin=0.4)

for style, cfg in STYLES.items():
    for sfx in ('tap', 'select', 'pop', 'open', 'success', 'coin'):
        kind = cfg['succ_voice'] if sfx in ('success', 'coin') else cfg['v']
        parts = []
        for start, freq in cfg[sfx]:
            sig = voice(kind, freq, NOTE_LEN[sfx] * (1.6 if kind in ('bell', 'glock') else 1), 0.6)
            if kind == 'wood':
                sig = sig.copy()
                k = click(0.04, 0.35)
                sig[: len(k)] += k
            parts.append((start, sig))
        save(f'sfx-{style}-{sfx}.wav', mix(parts, LENGTHS[sfx]))

# ---- music: four short songs the child can pick from. Each loops without a click. Rendered at 16 kHz to stay small.
MSR = 16000
NOTES = {'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.0, 'A4': 440.0, 'B4': 493.88,
         'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.0, 'B5': 987.77, 'C6': 1046.5}
f = lambda n: NOTES[n]


def song(name, bpm, beats, melody, chords, kind, mel_len=1.8, mel_vol=0.55, pad_vol=0.16, chord_beats=8, bass=None):
    """melody: (beat, note, length); chords: (beat, [notes]); `kind` is the melody's voice."""
    beat = 60 / bpm
    parts = []
    for b, n, ln in melody:
        parts.append((b * beat, note(f(n), ln * beat * mel_len, mel_vol, kind, sr=MSR)))
    for b, ns in chords:
        for n in ns:
            parts.append((b * beat, note(f(n) / 2, chord_beats * beat, pad_vol, 'pad', sr=MSR)))
    if bass:
        for b, n in bass:
            parts.append((b * beat, note(f(n) / 2, beat * 0.9, 0.3, 'pop', sr=MSR)))
    data = mix(parts, beats * beat, sr=MSR)
    fade = int(0.05 * MSR)
    data[:fade] *= np.linspace(0, 1, fade)
    data[-fade:] *= np.linspace(1, 0, fade)
    save(name, data, gain=0.7, sr=MSR)


# 1. Bubble Pond: slow music box
song('song-pond.wav', 76, 32,
     [(0, 'E5', 1), (1, 'G5', 1), (2, 'A5', 1.5), (3.5, 'G5', .5), (4, 'E5', 1), (5, 'D5', 1), (6, 'C5', 2),
      (8, 'D5', 1), (9, 'E5', 1), (10, 'G5', 1.5), (11.5, 'E5', .5), (12, 'D5', 1), (13, 'C5', 1), (14, 'D5', 2),
      (16, 'E5', 1), (17, 'G5', 1), (18, 'C6', 1.5), (19.5, 'A5', .5), (20, 'G5', 1), (21, 'E5', 1), (22, 'G5', 2),
      (24, 'A5', 1), (25, 'G5', 1), (26, 'E5', 1.5), (27.5, 'D5', .5), (28, 'C5', 2), (30, 'D5', 1), (31, 'C5', 1)],
     [(0, ['C4', 'E4', 'G4']), (8, ['A4', 'C4', 'E4']), (16, ['C4', 'E4', 'G4']), (24, ['G4', 'D4', 'B4'])], 'bell')

# 2. Sunny Skip: bouncy and bright
song('song-sunny.wav', 118, 32,
     [(0, 'C5', .5), (.5, 'E5', .5), (1, 'G5', 1), (2, 'E5', .5), (2.5, 'G5', .5), (3, 'C6', 1),
      (4, 'A5', .5), (4.5, 'G5', .5), (5, 'E5', 1), (6, 'D5', .5), (6.5, 'E5', .5), (7, 'C5', 1),
      (8, 'D5', .5), (8.5, 'F5', .5), (9, 'A5', 1), (10, 'F5', .5), (10.5, 'A5', .5), (11, 'C6', 1),
      (12, 'B5', .5), (12.5, 'A5', .5), (13, 'G5', 1), (14, 'E5', .5), (14.5, 'D5', .5), (15, 'C5', 1),
      (16, 'C5', .5), (16.5, 'E5', .5), (17, 'G5', 1), (18, 'E5', .5), (18.5, 'G5', .5), (19, 'C6', 1),
      (20, 'A5', .5), (20.5, 'G5', .5), (21, 'E5', 1), (22, 'G5', .5), (22.5, 'A5', .5), (23, 'G5', 1),
      (24, 'F5', .5), (24.5, 'E5', .5), (25, 'D5', 1), (26, 'E5', .5), (26.5, 'D5', .5), (27, 'C5', 1),
      (28, 'D5', 1), (29, 'G5', 1), (30, 'C5', 2)],
     [(0, ['C4', 'E4', 'G4']), (8, ['F4', 'A4', 'C5']), (16, ['C4', 'E4', 'G4']), (24, ['G4', 'B4', 'D5'])], 'pluck',
     mel_len=1.0, mel_vol=0.6, pad_vol=0.12, chord_beats=8,
     bass=[(b, n) for b in range(0, 32, 2) for n in [['C4', 'F4', 'C4', 'G4'][(b // 8)]]])

# 3. Sleepy Stars: a slow lullaby
song('song-stars.wav', 56, 32,
     [(0, 'G5', 2), (2, 'E5', 1), (3, 'D5', 1), (4, 'C5', 3), (8, 'E5', 2), (10, 'D5', 1), (11, 'C5', 1), (12, 'A4', 3),
      (16, 'G5', 2), (18, 'A5', 1), (19, 'G5', 1), (20, 'E5', 3), (24, 'D5', 2), (26, 'E5', 1), (27, 'D5', 1), (28, 'C5', 3)],
     [(0, ['C4', 'G4', 'E5']), (8, ['A4', 'C4', 'E4']), (16, ['C4', 'G4', 'E5']), (24, ['G4', 'D4', 'B4'])], 'bell',
     mel_len=2.4, mel_vol=0.5, pad_vol=0.24)

# 4. Candy Dance: playful marimba
song('song-candy.wav', 132, 32,
     [(0, 'G5', .5), (.5, 'G5', .5), (1, 'E5', .5), (1.5, 'G5', .5), (2, 'A5', 1), (3, 'G5', 1),
      (4, 'F5', .5), (4.5, 'F5', .5), (5, 'D5', .5), (5.5, 'F5', .5), (6, 'G5', 1), (7, 'E5', 1),
      (8, 'E5', .5), (8.5, 'G5', .5), (9, 'C6', 1), (10, 'B5', .5), (10.5, 'A5', .5), (11, 'G5', 1),
      (12, 'A5', .5), (12.5, 'G5', .5), (13, 'F5', .5), (13.5, 'E5', .5), (14, 'D5', 1), (15, 'C5', 1),
      (16, 'G5', .5), (16.5, 'G5', .5), (17, 'E5', .5), (17.5, 'G5', .5), (18, 'A5', 1), (19, 'C6', 1),
      (20, 'B5', .5), (20.5, 'A5', .5), (21, 'G5', .5), (21.5, 'F5', .5), (22, 'E5', 1), (23, 'D5', 1),
      (24, 'C5', .5), (24.5, 'D5', .5), (25, 'E5', .5), (25.5, 'F5', .5), (26, 'G5', 1), (27, 'E5', 1),
      (28, 'D5', 1), (29, 'F5', 1), (30, 'E5', 1), (31, 'C5', 1)],
     [(0, ['C4', 'E4', 'G4']), (8, ['C4', 'E4', 'G4']), (16, ['F4', 'A4', 'C5']), (24, ['G4', 'B4', 'D5'])], 'pluck',
     mel_len=0.9, mel_vol=0.62, pad_vol=0.1,
     bass=[(b, n) for b in range(0, 32) for n in [['C4', 'G4'][b % 2]]])
