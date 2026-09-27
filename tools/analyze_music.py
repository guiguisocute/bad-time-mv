#!/usr/bin/env python3
"""Analyse music.mp3 and write src/analysis.js for the MV engine.

Outputs a JS file (window.MV_ANALYSIS = {...}) so the player works from file://.
Requires: numpy, scipy, librosa, and an ffmpeg binary on PATH.

    python3 tools/analyze_music.py [music.mp3] [src/analysis.js]
"""
import json, subprocess, sys, tempfile, os
import numpy as np
import librosa

SRC = sys.argv[1] if len(sys.argv) > 1 else 'music.mp3'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'src/analysis.js'
SR = 22050

with tempfile.TemporaryDirectory() as td:
    wav = os.path.join(td, 'm.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-ac', '1', '-ar', str(SR), wav], check=True)
    y, sr = librosa.load(wav, sr=SR, mono=True)
dur = len(y) / sr

# ---------------------------------------------------------------- tempo grid
# Brute-force the constant 16th-note grid (period + phase) that best explains
# the onset envelope. The track is machine-tight so a single grid fits it all.
hop = 128
oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
ft = librosa.frames_to_time(np.arange(len(oenv)), sr=sr, hop_length=hop)
best = None
for bpm in np.arange(100, 140, 0.01):
    per = 60 / bpm / 4
    for ph in np.arange(0, per, 0.002):
        s = np.interp(np.arange(ph, dur - 1, per), ft, oenv).mean()
        if best is None or s > best[0]:
            best = (s, bpm, ph)
_, bpm, phase = best
bpm = round(bpm, 2)
s16 = 60 / bpm / 4
# Pick the downbeat: try all 16 sixteenth positions and keep the one where the
# 700-1500 Hz onsets line up best with the main riff rhythm over the song.
bar_len = s16 * 16
RIFF = [0, 1, 2, 4, 7, 9, 11, 13, 14, 15]
tmpl = np.zeros(16); tmpl[RIFF] = 1
_S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
_f = librosa.fft_frequencies(sr=sr, n_fft=2048)
_t = librosa.frames_to_time(np.arange(_S.shape[1]), sr=sr, hop_length=hop)
_L = np.log1p(_S[(_f >= 700) & (_f < 1500)] * 10)
_d = np.diff(_L, axis=1, prepend=_L[:, :1]); _d[_d < 0] = 0; _d = _d.mean(0)
def _riff_score(off):
    nb = int((dur - off) // bar_len)
    v = np.array([_d[(_t >= off + i * s16 - 0.015) & (_t < off + i * s16 + 0.045)].max(initial=0)
                  for i in range(nb * 16)]).reshape(nb, 16)
    c = [np.corrcoef(v[b], tmpl)[0, 1] for b in range(nb) if v[b].std() > 0]
    return np.mean(sorted(c)[-8:])  # the riff only plays in some bars
cands = [phase + k * s16 for k in range(16)]
offset = round(max(cands, key=_riff_score), 3)
nbars = int(round((dur - offset) / bar_len))
nslots = nbars * 16

# --------------------------------------------------------------- band fluxes
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
sft = librosa.frames_to_time(np.arange(S.shape[1]), sr=sr, hop_length=hop)
L = np.log1p(S * 10)

def flux(lo, hi):
    m = (freqs >= lo) & (freqs < hi)
    d = np.diff(L[m], axis=1, prepend=L[m][:, :1])
    d[d < 0] = 0
    return d.mean(0)

def per_slot(f):
    return np.array([f[(sft >= offset + i * s16 - 0.015) & (sft < offset + i * s16 + 0.045)].max(initial=0)
                     for i in range(nslots)])

def local_norm(v, win_bars=4):
    out = np.zeros_like(v)
    for b in range(nbars):
        w = v[max(0, b - win_bars // 2) * 16:min(nbars, b + win_bars // 2) * 16]
        lo, hi = np.percentile(w, 20), np.percentile(w, 97)
        out[b * 16:(b + 1) * 16] = np.clip((v[b * 16:(b + 1) * 16] - lo) / (hi - lo + 1e-9), 0, 1)
    return out

full = local_norm(per_slot(flux(30, 11000)))
low = local_norm(per_slot(flux(30, 150)))
mid = local_norm(per_slot(flux(250, 2000)))
high = local_norm(per_slot(flux(2000, 8000)))

# riff detection: correlate each bar with the main riff rhythm
mf = per_slot(flux(700, 1500)).reshape(nbars, 16)
riff_corr = [float(np.corrcoef(mf[b], tmpl)[0, 1]) for b in range(nbars)]

# ---------------------------------------------------------------- envelopes
ehop = 512
rms = librosa.feature.rms(y=y, hop_length=ehop)[0]
et = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=ehop)
E = np.abs(librosa.stft(y, n_fft=2048, hop_length=ehop)) ** 2
ef = librosa.fft_frequencies(sr=sr, n_fft=2048)
def band_env(lo, hi):
    m = (ef >= lo) & (ef < hi)
    return E[m].sum(0)
FPS = 60
tt = np.arange(0, dur, 1 / FPS)
def env(v, db=False):
    v = np.interp(tt, et, v)
    if db:
        v = 10 * np.log10(v + 1e-9)
        v = (v - np.percentile(v, 2)) / (np.percentile(v, 99.5) - np.percentile(v, 2))
    else:
        v = v / np.percentile(v, 99.5)
    return np.clip(v, 0, 1)
env_rms = env(rms)
env_low = env(band_env(20, 150), db=True)
env_high = env(band_env(2500, 11000), db=True)

# ---------------------------------------------------------------- sections
# Boundaries found from the bar-level self-similarity matrix + band energies
# (see README). Bars are 2 s long at 120 BPM.
bar_rms = [float(rms[(et >= offset + b * bar_len) & (et < offset + (b + 1) * bar_len)].mean()) for b in range(nbars)]
SECTIONS = [
    ('intro',   0,  4, 'dry riff'),
    ('build',   4,  8, 'riff + bass, sub swell on bar 7'),
    ('dropA',   8, 16, 'full band enters'),
    ('blue',   16, 20, 'rising arpeggio variation'),
    ('gravity',20, 24, 'A reprise'),
    ('cannonB',24, 32, 'high-energy lead'),
    ('climax', 32, 40, 'high-energy lead repeat'),
    ('counter',40, 48, 'breakdown: highs cut, bass heavy'),
    ('frenzy', 48, 56, 'breakdown variation, riser on 54-55'),
    ('final',  56, 72, 'offbeat stabs, long 16-bar phase, build on 70-71'),
    ('outro',  72, nbars, 'dry riff returns'),
]
mx = max(bar_rms)
sections = [dict(name=n, bar0=a, bar1=b, note=d, energy=round(float(np.mean(bar_rms[a:b]) / mx), 3))
            for n, a, b, d in SECTIONS]

q = lambda a, k=2: [round(float(x), k) for x in a]
data = dict(
    bpm=bpm, offset=offset, sixteenth=round(s16, 6), barLength=round(bar_len, 6),
    duration=round(dur, 3), bars=nbars, riffSlots=RIFF,
    riffCorr=q(riff_corr), barRms=q(np.array(bar_rms) / mx, 3), sections=sections,
    slots=dict(full=q(full), low=q(low), mid=q(mid), high=q(high)),
    envFps=FPS, env=dict(rms=q(env_rms, 3), low=q(env_low, 3), high=q(env_high, 3)),
)
os.makedirs(os.path.dirname(OUT) or '.', exist_ok=True)
with open(OUT, 'w') as f:
    f.write('// Generated by tools/analyze_music.py - do not edit by hand.\n')
    f.write('window.MV_ANALYSIS = ')
    json.dump(data, f, separators=(',', ':'))
    f.write(';\n')
print(f'bpm={bpm} offset={offset}s bars={nbars} duration={dur:.2f}s -> {OUT}')
