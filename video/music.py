# Музыка для промо-ролика HUNDO — синтезируется кодом, без чужих сэмплов (нет вопросов с авторскими правами).
# 120 ударов в минуту: смена сцен ролика (3.5 с, 6.5 с, 10.5 с …) попадает точно в долю.
#   python3 music.py  →  public/music.wav
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
import wave, os

SR = 44100
DUR = 30.0
BEAT = 0.5
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)

def t_(d): return np.arange(int(SR * d)) / SR
def put(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR); j = min(N, i + len(sig))
    if i >= N: return
    s = sig[: j - i] * gain
    L[i:j] += s * np.sqrt(0.5 * (1 - pan)); R[i:j] += s * np.sqrt(0.5 * (1 + pan))
def lp(x, f, order=2): return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)
def note(n): return 440.0 * 2 ** ((n - 69) / 12)

# --- инструменты ---
def kick(g=1.0):
    t = t_(0.45); f = 48 + 110 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t * 7.5) + 0.25 * np.exp(-t * 300) * rng.standard_normal(len(t))) * g
def hat(open_=False):
    t = t_(0.25 if open_ else 0.06)
    return hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * (14 if open_ else 70))
def clap():
    t = t_(0.3); n = bp(rng.standard_normal(len(t)), 900, 3500)
    env = np.exp(-t * 18) + 0.6 * np.exp(-np.maximum(t - 0.012, 0) * 40) * (t > 0.012)
    return n * env
def tick():
    t = t_(0.03); return np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 220)
def saw(f, d, detune=0.0):
    t = t_(d); return 2 * ((t * f * (1 + detune)) % 1) - 1
def pad(notes, d):
    s = sum(saw(note(n), d, dt) for n in notes for dt in (-0.004, 0.0, 0.005))
    t = t_(d); env = np.minimum(1, t / 0.35) * np.minimum(1, (d - t) / 0.3)
    return lp(s, 1100) * env / (len(notes) * 3)
def bass(n, d):
    t = t_(d); f = note(n)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sign(np.sin(2 * np.pi * f * t))
    return lp(s, 420) * np.exp(-t * 5) * np.minimum(1, t / 0.005)
def whoosh(d=0.6):
    t = t_(d); n = rng.standard_normal(len(t)); out = np.zeros_like(n)
    for k in range(8):  # полоса фильтра ползёт вверх
        a, b = k * len(n) // 8, (k + 1) * len(n) // 8
        out[a:b] = bp(n, 300 + k * 600, 900 + k * 1400)[a:b]
    return out * (t / d) ** 2.2
def impact():
    t = t_(2.2)
    boom = np.sin(2 * np.pi * (38 + 60 * np.exp(-t * 10)) * t) * np.exp(-t * 2.2)
    return boom + 0.3 * lp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 4)

# аккорды по тактам (такт = 2 с): Am — F — C — G
CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
BASS = [45, 41, 36, 43]

# --- аранжировка ---
# 0–3.5 с: тиканье часов (отсчёт до экзамена) и тихий пэд
for k in range(14): put(tick(), k * 0.25, 0.22 if k % 4 == 0 else 0.12, pan=0.3 if k % 2 else -0.3)
put(pad(CH[0] + [69], 3.5), 0, 0.5)
put(whoosh(1.2), 3.5 - 1.2, 0.35)
put(impact(), 3.5, 0.9)

DROP, END = 3.5, 27.0
bar0 = DROP
b = 0
t = DROP
while t < END - 1e-6:
    beat_in_bar = int(round((t - bar0) / BEAT)) % 4
    chord = int((t - bar0) // 2.0) % 4
    put(kick(), t, 0.95)
    put(hat(), t + BEAT / 2, 0.18, pan=0.25)
    if t >= 6.5: put(hat(), t + BEAT * 0.75, 0.08, pan=-0.25)
    if t >= 6.5 and beat_in_bar in (1, 3): put(clap(), t, 0.32)
    for e in (0, 0.25):
        put(bass(BASS[chord] + (12 if (e and beat_in_bar == 3) else 0), 0.24), t + e, 0.42)
    if beat_in_bar == 0: put(pad(CH[chord], 2.0), t, 0.42)
    t += BEAT

for at in (6.5, 10.5, 14.5, 19.5, 24.0): put(whoosh(0.5), at - 0.5, 0.22)
# финал: удар и долгий аккорд
put(whoosh(0.9), END - 0.9, 0.3)
put(impact(), END, 1.0)
put(pad([45, 57, 60, 64, 69], 3.0), END, 0.55)
for k in range(6): put(tick(), END + 0.5 + k * 0.25, 0.06)

# --- сведение: лёгкая реверберация, мягкое ограничение, затухание ---
ir_t = t_(1.4); ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 4.5); ir /= np.abs(ir).sum() / 3
L = L + 0.22 * fftconvolve(L, ir)[:N]; R = R + 0.22 * fftconvolve(R, ir[::-1])[:N]
mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
fade = np.ones(N); fi = int(SR * 0.05); fo = int(SR * 1.6)
fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
mix *= fade[:, None]
mix *= 0.89 / np.abs(mix).max()

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "music.wav")
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("music.wav", DUR, "s")
