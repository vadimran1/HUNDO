# Энергичный бит для ролика HUNDO — синтезируется кодом (без чужих сэмплов).
# 150 BPM: доля 0.4 с = 12 кадров видео при 30 fps, такт 1.6 с. 20 тактов = 32 с.
# Структура совпадает с Hype.tsx: интро → разгон → пауза → дроп 1 → брейк → дроп 2 → финал.
#   python3 hype_music.py  →  public/hype.wav
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
import wave, os

SR = 44100
BEAT = 0.4
BAR = 4 * BEAT
DUR = 20 * BAR
N = int(SR * DUR)
rng = np.random.default_rng(150)

drums = np.zeros((N, 2)); music = np.zeros((N, 2)); fx = np.zeros((N, 2))

def T(d): return np.arange(int(SR * d)) / SR
def put(bus, sig, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    if i >= N or i + len(sig) <= 0: return
    a = max(0, -i); i = max(0, i); j = min(N, i + len(sig) - a)
    s = sig[a:a + j - i] * gain
    if s.ndim == 1:
        bus[i:j, 0] += s * np.sqrt(0.5 * (1 - pan)); bus[i:j, 1] += s * np.sqrt(0.5 * (1 + pan))
    else:
        bus[i:j] += s
def sos(kind, f, order=2): return butter(order, f, kind, fs=SR, output="sos")
def lp(x, f, o=2): return sosfilt(sos("low", f, o), x, axis=0)
def hp(x, f, o=2): return sosfilt(sos("high", f, o), x, axis=0)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x, axis=0)
def mtof(n): return 440.0 * 2 ** ((n - 69) / 12)
def noise(d): return rng.standard_normal(int(SR * d))

# ---------- инструменты ----------
def bl_saw(f, d, cut=9000):
    """Пила без алиасинга: сумма гармоник до `cut` Гц"""
    t = T(d); out = np.zeros_like(t); k = 1
    while k * f < cut:
        out += np.sin(2 * np.pi * k * f * t + k * 0.37) / k; k += 1
    return out * 0.6
def supersaw(notes, d, detunes=(-0.012, -0.006, 0, 0.006, 0.012)):
    L = np.zeros(int(SR * d)); R = np.zeros(int(SR * d))
    for n in notes:
        for i, dt in enumerate(detunes):
            s = bl_saw(mtof(n) * (1 + dt), d)
            p = (i / (len(detunes) - 1)) * 2 - 1
            L += s * np.sqrt(0.5 * (1 - p * 0.8)); R += s * np.sqrt(0.5 * (1 + p * 0.8))
    k = len(notes) * len(detunes)
    return np.stack([L, R], 1) / k

def kick():
    t = T(0.42); f = 46 + 140 * np.exp(-t * 38) + 30 * np.exp(-t * 9)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6.5)
    click = hp(noise(0.42), 2500) * np.exp(-t * 420) * 0.5
    return np.tanh((body + click) * 2.2) * 0.9
def snare():
    t = T(0.28)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 28)
    n = bp(noise(0.28), 1200, 7000) * np.exp(-t * 16)
    return np.tanh((tone * 0.6 + n) * 1.6) * 0.8
def clap():
    t = T(0.32); n = bp(noise(0.32), 900, 5000); env = np.zeros_like(t)
    for o in (0, 0.009, 0.018): env += np.exp(-np.maximum(t - o, 0) * 55) * (t >= o)
    env += 0.5 * np.exp(-t * 11)
    return n * env * 0.7
def hat(open_=False):
    d = 0.22 if open_ else 0.05; t = T(d)
    return hp(noise(d), 8000, 4) * np.exp(-t * (13 if open_ else 80))
def crash(d=1.6):
    t = T(d); return hp(noise(d), 4500) * np.exp(-t * 2.6) * 0.6
def impact(d=2.4):
    t = T(d)
    boom = np.sin(2 * np.pi * (34 + 80 * np.exp(-t * 9)) * t) * np.exp(-t * 2.0)
    return np.tanh(boom * 1.5) + 0.35 * lp(noise(d), 1800) * np.exp(-t * 5)
def riser(d):
    t = T(d); x = t / d
    n = noise(d); out = np.zeros_like(n); seg = 16
    for k in range(seg):
        a, b = k * len(n) // seg, (k + 1) * len(n) // seg
        lo = 300 + 6000 * (k / seg) ** 1.6
        out[a:b] = bp(n, lo, min(lo * 2.2, 18000))[a:b]
    tone = np.sin(2 * np.pi * np.cumsum(180 + 1400 * x ** 2) / SR) * 0.25
    return (out * 0.8 + tone) * x ** 1.8
def reverse_cymbal(d):
    return crash(d)[::-1] * 0.9
def downlifter(d=1.4):
    t = T(d); x = t / d; n = noise(d); out = np.zeros_like(n); seg = 12
    for k in range(seg):
        a, b = k * len(n) // seg, (k + 1) * len(n) // seg
        lo = 6000 * (1 - k / seg) ** 2 + 200
        out[a:b] = bp(n, lo, min(lo * 2.5, 18000))[a:b]
    return out * (1 - x) ** 1.5 * 0.5

# аккорды по тактам: Am — F — C — G
CHORDS = [[57, 60, 64, 69], [53, 57, 60, 65], [55, 60, 64, 67], [55, 59, 62, 67]]
ROOTS = [33, 29, 36, 31]
print("синтезирую тембры…")
STAB = [lp(supersaw([n + 12 for n in c], 0.22), 5200) * np.exp(-T(0.22) * 9)[:, None] for c in CHORDS]
PAD = []
for c in CHORDS:
    p = lp(supersaw(c + [c[0] - 12], BAR), 1400)
    env = np.minimum(1, T(BAR) / 0.25) * np.minimum(1, (BAR - T(BAR)) / 0.15)
    PAD.append(p * env[:, None])
def bass_note(root, d):
    t = T(d); f = mtof(root)
    sub = np.sin(2 * np.pi * f * t)
    reese = bl_saw(f * 2 * 0.996, d, 1800) + bl_saw(f * 2 * 1.004, d, 1800)
    s = sub * 0.9 + lp(reese, 700) * 0.55
    env = np.minimum(1, t / 0.004) * np.minimum(1, (d - t) / 0.01)
    return np.tanh(s * 1.4) * env
BASS = [bass_note(r, BEAT) for r in ROOTS]
def arp_note(n, d=BEAT / 4):
    t = T(d); f = mtof(n); s = np.zeros_like(t)
    for k in range(1, 12, 2):
        if k * f < 7000: s += np.sin(2 * np.pi * k * f * t) / k
    return lp(s, 3800) * np.exp(-t * 18)

# ---------- аранжировка ----------
def bar_t(b): return b * BAR
def chord_of(b): return b % 4

# 1) Интро, такты 0–1: «удар» на каждое слово (каждые 2 доли), тихие хэты
for i in range(4):
    at = i * 2 * BEAT
    put(drums, kick(), at, 1.0); put(drums, clap(), at, 0.6)
    put(music, STAB[i % 4], at, 0.9); put(fx, impact(1.2), at, 0.35)
for k in range(16): put(drums, hat(), k * BEAT / 2, 0.12 if k % 2 else 0.2, pan=0.3)
put(music, lp(PAD[0], 600), 0, 0.5); put(music, lp(PAD[3], 600), BAR, 0.5)

# 2) Разгон, такты 2–3
b2 = bar_t(2)
for k in range(4):  # по доле: бочка + малый
    put(drums, kick(), b2 + k * BEAT, 0.95); put(drums, snare(), b2 + k * BEAT, 0.55 + 0.05 * k)
    put(music, STAB[(k + 2) % 4], b2 + k * BEAT, 0.55)
b3 = bar_t(3)
for k in range(4):  # по полдоли
    put(drums, snare(), b3 + k * BEAT / 2, 0.7); put(drums, kick(), b3 + k * BEAT / 2, 0.6)
for k in range(3):  # отсчёт «3, 2, 1» — триоли
    at = b3 + 2 * BEAT + k * BEAT / 3
    put(drums, snare(), at, 0.85); put(drums, kick(), at, 0.8); put(music, STAB[3], at, 0.5)
put(fx, riser(2 * BAR - BEAT), b2, 0.55)
# пауза 6.0–6.4 с: только обратная тарелка
put(fx, reverse_cymbal(BEAT), b3 + 3 * BEAT, 0.9)

# 3) Дроп 1 (такты 4–11) и дроп 2 (14–17)
def drop_bar(b, arp=False, extra=False):
    at = bar_t(b); c = chord_of(b)
    for k in range(4):
        t0 = at + k * BEAT
        put(drums, kick(), t0, 1.0)
        if k in (1, 3): put(drums, clap(), t0, 0.75); put(drums, snare(), t0, 0.35)
        for s in range(4):
            put(drums, hat(), t0 + s * BEAT / 4, (0.15 if s == 2 else 0.07), pan=0.25 if s % 2 else -0.25)
        put(drums, hat(True), t0 + BEAT / 2, 0.16, pan=-0.2)
        # бас: восьмые с октавой на «и»
        put(music, BASS[c][: int(SR * BEAT / 2)], t0, 0.75)
        put(music, bass_note(ROOTS[c] + 12, BEAT / 2), t0 + BEAT / 2, 0.45)
    for pos in (0, 0.75, 1.5, 2.5, 3.0, 3.5):  # синкопированные аккорды
        put(music, STAB[c], at + pos * BEAT, 0.6)
    if arp:
        tones = CHORDS[c] + [CHORDS[c][1] + 12, CHORDS[c][2] + 12]
        for s in range(16):
            put(music, arp_note(tones[s % len(tones)] + 12), at + s * BEAT / 4, 0.16, pan=0.35 if s % 2 else -0.35)
    if extra:
        put(drums, hat(True), at + 3.75 * BEAT, 0.2)
    put(fx, crash(), at, 0.35 if b in (4, 14) else 0.16)

for b in range(4, 12): drop_bar(b, arp=b >= 8)
put(fx, impact(), bar_t(4), 0.9)
put(fx, impact(1.4), bar_t(8) + 6 * BEAT, 0.45)   # счёт «4/5» в варианте
for k in range(1, 6): put(music, STAB[0], bar_t(8) + k * BEAT, 0.3)  # отметки ✓/✗ на долю

# 4) Брейк, такты 12–13: пэд, половинный ритм, затем дробь к дропу
put(fx, downlifter(), bar_t(12), 0.6)
put(music, PAD[0], bar_t(12), 0.55); put(music, PAD[1], bar_t(13), 0.55)
put(drums, kick(), bar_t(12), 0.8); put(drums, clap(), bar_t(12) + 2 * BEAT, 0.5)
for k in (1, 2, 3): put(music, STAB[0], bar_t(12) + k * BEAT, 0.4)   # всплывают «1–5», Enter, RU/EN
for k in range(4): put(drums, snare(), bar_t(13) + k * BEAT / 2, 0.45 + 0.05 * k)
for k in range(8): put(drums, snare(), bar_t(13) + 2 * BEAT + k * BEAT / 4, 0.6 + 0.03 * k)
put(fx, riser(BAR), bar_t(13), 0.55)

for b in range(14, 18): drop_bar(b, arp=True, extra=True)
put(fx, impact(), bar_t(14), 1.0)

# 5) Финал, такты 18–19
put(fx, impact(3.2), bar_t(18), 1.0); put(fx, crash(3.0), bar_t(18), 0.5)
put(drums, kick(), bar_t(18), 1.0)
fin = lp(supersaw([45, 57, 60, 64, 69], 2 * BAR), 2200) * (np.exp(-T(2 * BAR) * 0.9))[:, None]
put(music, fin, bar_t(18), 0.9)
for k in range(1, 4): put(music, STAB[0], bar_t(18) + k * BEAT * 1.5, 0.5 / k)

# ---------- сведение ----------
# «насос»: бас и синты приседают на каждую бочку в дропах
duck = np.ones(N)
for b in list(range(4, 12)) + list(range(14, 19)):
    for k in range(4):
        i = int((bar_t(b) + k * BEAT) * SR); n = int(BEAT * SR)
        tt = np.arange(n) / SR
        duck[i:i + n] = np.minimum(duck[i:i + n], 1 - 0.75 * np.exp(-tt / 0.07))
music *= duck[:, None]

ir_t = T(1.6); ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3.5); ir /= np.abs(ir).sum() / 2.5
wet = np.stack([fftconvolve(music[:, 0] + fx[:, 0] * 0.5, ir)[:N], fftconvolve(music[:, 1] + fx[:, 1] * 0.5, ir[::-1])[:N]], 1)
mix = drums * 1.0 + music * 0.9 + fx * 0.7 + wet * 0.12
mix = hp(mix, 28)
# мягкая сатурация: сначала приводим пики к 1, потом лёгкий tanh — без «каши»
for name, bus in (("барабаны", drums), ("музыка", music), ("эффекты", fx)):
    seg = bus[int(8 * SR):int(12 * SR)]
    print(f"  {name}: RMS {20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9):.1f} dB")
mix /= np.percentile(np.abs(mix), 99.95)
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
fo = int(SR * 0.6); mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
mix *= 0.92 / np.abs(mix).max()

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "hype.wav")
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("hype.wav", DUR, "s")
