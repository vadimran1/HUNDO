/**
 * Передача картинки звуком — SSTV, режим Robot 36 (стандарт радиолюбителей).
 *
 * Картинка 320×240 превращается в звук: каждая строка — это тон, частота которого
 * плавно меняется от 1500 Гц (чёрный) до 2300 Гц (белый). Перед строкой — короткий
 * «щелчок» синхронизации 1200 Гц. Яркость (Y) идёт каждую строку, а цвет — через строку:
 * в чётных строках красная разность (Cr), в нечётных — синяя (Cb). Вся картинка — 36 секунд.
 *
 * Приёмник слушает микрофон, находит частоту звука в каждый момент и рисует строки
 * по мере приёма. Совместимо с обычными SSTV-программами (Robot36 для Android, MMSSTV).
 */

export const SSTV_W = 320;
export const SSTV_H = 240;
export const LINE_MS = 150;
const VIS_ROBOT36 = 8;

// длительности частей строки, мс
const SYNC = 9, PORCH = 3, Y_SCAN = 88, SEP = 4.5, PORCH2 = 1.5, C_SCAN = 44;
const Y_START = PORCH;                         // от конца синхроимпульса
const SEP_START = Y_START + Y_SCAN;            // 91
const C_START = SEP_START + SEP + PORCH2;      // 97
const LINE_END = C_START + C_SCAN;             // 141 (+9 мс синхро = 150)

const freqOf = (v: number) => 1500 + (Math.max(0, Math.min(255, v)) * 800) / 255;
const valOf = (f: number) => ((f - 1500) * 255) / 800;
const clamp8 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

/* ---------- передатчик ---------- */

/** RGBA 320×240 → звук (моно, значения −1…1). Длительность ≈ 37 с. */
export function encodeRobot36(rgba: Uint8ClampedArray, sampleRate: number): Float32Array {
  const N = SSTV_W * SSTV_H;
  const Y = new Float32Array(N), Cb = new Float32Array(N), Cr = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    Y[i] = 16 + 0.257 * r + 0.504 * g + 0.098 * b;
    Cb[i] = 128 - 0.148 * r - 0.291 * g + 0.439 * b;
    Cr[i] = 128 + 0.439 * r - 0.368 * g - 0.071 * b;
  }

  // список отрезков: [частота, длительность в мс]
  const seg: number[] = [];
  const tone = (f: number, ms: number) => { seg.push(f, ms); };
  tone(1900, 300); tone(1200, 10); tone(1900, 300);           // вступление
  tone(1200, 30);                                              // старт-бит VIS
  let ones = 0;
  for (let b = 0; b < 7; b++) { const bit = (VIS_ROBOT36 >> b) & 1; ones += bit; tone(bit ? 1100 : 1300, 30); }
  tone(ones % 2 ? 1100 : 1300, 30);                            // бит чётности
  tone(1200, 30);                                              // стоп-бит

  const py = Y_SCAN / SSTV_W, pc = C_SCAN / SSTV_W;
  for (let y = 0; y < SSTV_H; y++) {
    tone(1200, SYNC); tone(1500, PORCH);
    for (let x = 0; x < SSTV_W; x++) tone(freqOf(Y[y * SSTV_W + x]), py);
    const odd = y % 2 === 1;
    tone(odd ? 2300 : 1500, SEP); tone(1900, PORCH2);
    // цвет общий для пары строк: среднее по двум строкам
    const a = odd ? y - 1 : y, c = odd ? Cb : Cr;
    for (let x = 0; x < SSTV_W; x++) tone(freqOf((c[a * SSTV_W + x] + c[(a + 1) * SSTV_W + x]) / 2), pc);
  }

  let totalMs = 0;
  for (let i = 1; i < seg.length; i += 2) totalMs += seg[i];
  const pad = Math.round(0.3 * sampleRate);
  const out = new Float32Array(Math.ceil((totalMs / 1000) * sampleRate) + pad * 2);
  let phase = 0, pos = pad, end = pad;                         // end — дробная граница отрезка в отсчётах
  for (let i = 0; i < seg.length; i += 2) {
    end += (seg[i + 1] / 1000) * sampleRate;
    const step = (2 * Math.PI * seg[i]) / sampleRate;
    for (; pos < end && pos < out.length; pos++) { phase += step; out[pos] = Math.sin(phase); }
    if (phase > 1e4) phase %= 2 * Math.PI;
  }
  // плавное начало и конец, без щелчков
  const fade = Math.round(0.01 * sampleRate), last = pos;
  for (let i = 0; i < fade; i++) { out[pad + i] *= i / fade; out[last - 1 - i] *= i / fade; }
  for (let i = 0; i < out.length; i++) out[i] *= 0.85;
  return out;
}

/** Звук → WAV-файл (16 бит, моно) — чтобы отправить картинку голосовым сообщением */
export function toWav(samples: Float32Array, sampleRate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2), v = new DataView(buf);
  const s = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true); s(8, "WAVE"); s(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  s(36, "data"); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
  return new Blob([buf], { type: "audio/wav" });
}

/* ---------- приёмник ---------- */

/** Фильтр низких частот второго порядка (RBJ) */
class Biquad {
  private b0: number; private b1: number; private b2: number; private a1: number; private a2: number;
  private x1 = 0; private x2 = 0; private y1 = 0; private y2 = 0;
  constructor(fs: number, fc: number, q: number) {
    const w = (2 * Math.PI * fc) / fs, c = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al;
    this.b0 = (1 - c) / 2 / a0; this.b1 = (1 - c) / a0; this.b2 = this.b0; this.a1 = (-2 * c) / a0; this.a2 = (1 - al) / a0;
  }
  run(x: number) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

export type RxState =
  | { kind: "idle" }                                  // жду сигнал
  | { kind: "rx"; row: number }                       // принимаю
  | { kind: "done" }                                  // картинка принята
  | { kind: "lost"; row: number }                     // сигнал пропал на середине
  | { kind: "mode"; code: number };                   // другой режим SSTV — не умею

export type RxEvents = {
  /** обновились строки картинки (rgba — весь кадр 320×240) */
  onRows?: (from: number, to: number, rgba: Uint8ClampedArray) => void;
  onState?: (s: RxState) => void;
  /** раз в ~60 мс: основная частота и громкость — для индикатора */
  onLevel?: (freq: number, level: number) => void;
};

const RING = 1 << 19;                                 // ~10 с при 48 кГц
const MASK = RING - 1;

export class Robot36Decoder {
  readonly rgba = new Uint8ClampedArray(SSTV_W * SSTV_H * 4);
  private fs: number;
  private ev: RxEvents;
  private freq = new Float32Array(RING);              // мгновенная частота по отсчётам
  private n = 0;                                      // номер текущего отсчёта
  // демодулятор: перенос на 1900 Гц и фильтрация
  private or = 1; private oi = 0; private cw: number; private sw: number;
  private fI = [] as Biquad[]; private fQ = [] as Biquad[];
  private pI = 0; private pQ = 0;
  // поиск синхроимпульсов
  private inSync = false; private syncStart = 0; private exitRun = 0; private exitAt = 0;
  private readonly enterF = 1350; private readonly exitF = 1420;
  private lastCand = -1;
  // приём строк
  private receiving = false; private done = false;
  private lastSync = 0; private period: number; private row = 0; private virtualRun = 0; private rowShift = 0;
  private queue: { at: number; row: number }[] = [];
  private Yrows: (Uint8ClampedArray | null)[] = Array(SSTV_H).fill(null);
  private Cr: (Uint8ClampedArray | null)[] = Array(SSTV_H / 2).fill(null);
  private Cb: (Uint8ClampedArray | null)[] = Array(SSTV_H / 2).fill(null);
  // индикатор
  private lvlSum = 0; private lvlF = 0; private lvlN = 0; private ampAvg = 0;

  constructor(sampleRate: number, ev: RxEvents = {}) {
    this.fs = sampleRate; this.ev = ev;
    const w = (2 * Math.PI * 1900) / sampleRate;
    this.cw = Math.cos(w); this.sw = Math.sin(w);
    for (const q of [0.5412, 1.3066]) { this.fI.push(new Biquad(sampleRate, 1100, q)); this.fQ.push(new Biquad(sampleRate, 1100, q)); }
    this.period = (LINE_MS / 1000) * sampleRate;
    for (let i = 3; i < this.rgba.length; i += 4) this.rgba[i] = 255;
  }

  private ms(x: number) { return (x / 1000) * this.fs; }

  reset() {
    this.receiving = false; this.done = false; this.queue = []; this.row = 0; this.virtualRun = 0; this.lastCand = -1;
    this.Yrows.fill(null); this.Cr.fill(null); this.Cb.fill(null);
    for (let i = 0; i < this.rgba.length; i += 4) { this.rgba[i] = this.rgba[i + 1] = this.rgba[i + 2] = 0; }
    this.ev.onRows?.(0, SSTV_H - 1, this.rgba);
    this.ev.onState?.({ kind: "idle" });
  }

  push(x: Float32Array) {
    const fs = this.fs, k = fs / (2 * Math.PI);
    for (let i = 0; i < x.length; i++) {
      const s = x[i];
      // гетеродин: e^{−jωt}
      const nr = this.or * this.cw + this.oi * this.sw, ni = this.oi * this.cw - this.or * this.sw;
      this.or = nr; this.oi = ni;
      let I = s * nr, Q = s * ni;
      I = this.fI[1].run(this.fI[0].run(I)); Q = this.fQ[1].run(this.fQ[0].run(Q));
      // мгновенная частота = скорость поворота фазы
      const re = I * this.pI + Q * this.pQ, im = Q * this.pI - I * this.pQ;
      this.pI = I; this.pQ = Q;
      const f = 1900 + Math.atan2(im, re) * k;
      const n = this.n;
      this.freq[n & MASK] = f;
      const amp = I * I + Q * Q;
      this.ampAvg += (amp - this.ampAvg) * 0.0005;
      this.lvlSum += Math.abs(s); this.lvlF += f; this.lvlN++;
      this.detectSync(n, f, amp);
      this.n = n + 1;
      if (this.receiving) this.tick();
    }
    if (this.lvlN > fs * 0.06) {
      this.ev.onLevel?.(this.lvlF / this.lvlN, this.lvlSum / this.lvlN);
      this.lvlSum = this.lvlF = this.lvlN = 0;
    }
    if ((this.n & 0x3ff) < x.length) { const m = Math.hypot(this.or, this.oi); this.or /= m; this.oi /= m; }
  }

  /** Отрезки 1200 Гц: короткие (9 мс) — синхроимпульс строки, длинный (~310 мс) — заголовок VIS */
  private detectSync(n: number, f: number, amp: number) {
    const quiet = amp < this.ampAvg * 0.05;
    if (!this.inSync) {
      if (f < this.enterF && f > 900 && !quiet) { this.inSync = true; this.syncStart = n; this.exitRun = 0; }
      return;
    }
    if (f > this.exitF || quiet) {
      if (this.exitRun === 0) this.exitAt = n;
      if (++this.exitRun >= this.ms(1.5)) {
        this.inSync = false;
        const len = this.exitAt - this.syncStart;
        if (len >= this.ms(5) && len <= this.ms(14)) this.onSync(this.exitAt);
        else if (len >= this.ms(270) && len <= this.ms(350)) this.onVis(this.syncStart, this.exitAt);
      }
    } else this.exitRun = 0;
  }

  private avg(a: number, b: number) {
    let s = 0, c = 0;
    const i0 = Math.max(Math.round(a), this.n - RING + 1), i1 = Math.round(b);
    for (let i = i0; i < i1; i++) { s += this.freq[i & MASK]; c++; }
    return c ? s / c : 1900;
  }

  private onVis(start: number, end: number) {
    let code = 0, ones = 0;
    for (let b = 0; b < 8; b++) {
      const c = start + this.ms(30 + 30 * b + 15);
      const bit = this.avg(c - this.ms(8), c + this.ms(8)) < 1200 ? 1 : 0;
      if (b < 7) code |= bit << b;
      ones += bit;
    }
    if (ones % 2) return;                                         // не сошлась чётность — это был не VIS
    if (code !== VIS_ROBOT36) { this.ev.onState?.({ kind: "mode", code }); return; }
    // конец длинного отрезка = конец синхроимпульса первой строки
    this.startRx(end, 0);
  }

  private startRx(at: number, row: number) {
    this.reset();
    this.receiving = true; this.lastSync = at; this.row = row; this.period = this.ms(LINE_MS); this.rowShift = 0;
    this.queue.push({ at, row });
    this.ev.onState?.({ kind: "rx", row });
  }

  private onSync(at: number) {
    if (this.done && at - this.lastSync > this.ms(2000)) this.done = false;
    if (!this.receiving) {
      if (this.done) return;
      // без заголовка: начинаем, когда два синхроимпульса идут ровно через 150 мс
      if (this.lastCand >= 0 && Math.abs(at - this.lastCand - this.ms(LINE_MS)) < this.ms(4)) {
        const first = this.lastCand;
        this.startRx(first, 0);
        this.lastSync = first;
        this.acceptSync(at);
      }
      this.lastCand = at;
      return;
    }
    const expect = this.lastSync + this.period, err = at - expect;
    if (Math.abs(err) < this.ms(12)) {
      // Подстраиваемся под часы передатчика (они немного расходятся с нашими), но мягко:
      // шум и эхо сдвигают отдельный синхроимпульс, а начало строки должно идти ровно.
      const p0 = this.ms(LINE_MS), settled = this.row >= 4;
      if (settled) this.period += err * 0.04;
      else if (Math.abs(at - this.lastSync - p0) < p0 * 0.01) this.period += (at - this.lastSync - this.period) * 0.3;
      this.period = Math.min(p0 * 1.01, Math.max(p0 * 0.99, this.period));
      this.acceptSync(settled ? expect + err * 0.25 : at);
    }
  }

  private acceptSync(at: number) {
    this.lastSync = at; this.row++; this.virtualRun = 0;
    if (this.row < SSTV_H) this.queue.push({ at, row: this.row });
  }

  private tick() {
    // строка пропущена (шум заглушил синхроимпульс) — достраиваем её по времени
    if (this.n > this.lastSync + this.period + this.ms(14)) {
      const at = this.lastSync + this.period, run = this.virtualRun + 1;
      if (run > 12) { this.receiving = false; this.queue = []; this.ev.onState?.({ kind: "lost", row: this.row }); return; }
      this.acceptSync(at);
      this.virtualRun = run;                                      // acceptSync обнуляет счётчик — возвращаем
    }
    while (this.queue.length && this.n > this.queue[0].at + this.ms(LINE_END + 1)) {
      const { at, row } = this.queue.shift()!;
      this.decodeLine(at, row);
      if (row + this.rowShift >= SSTV_H - 1 || row >= SSTV_H - 1) {
        this.receiving = false; this.done = true; this.queue = [];
        this.ev.onState?.({ kind: "done" });
        return;
      }
    }
  }

  private decodeLine(at: number, row0: number) {
    const sep = this.avg(at + this.ms(SEP_START + 0.5), at + this.ms(SEP_START + SEP - 0.5));
    const odd = sep > 1900;
    // первая строка без заголовка могла оказаться нечётной — сдвигаем нумерацию
    if (row0 === 0 && odd) this.rowShift = 1;
    const row = row0 + this.rowShift;
    if (row >= SSTV_H) return;
    const y = new Uint8ClampedArray(SSTV_W), c = new Uint8ClampedArray(SSTV_W);
    const py = this.ms(Y_SCAN / SSTV_W), pc = this.ms(C_SCAN / SSTV_W);
    const y0 = at + this.ms(Y_START), c0 = at + this.ms(C_START);
    for (let x = 0; x < SSTV_W; x++) {
      y[x] = clamp8(valOf(this.avg(y0 + x * py, y0 + (x + 1) * py)));
      c[x] = clamp8(valOf(this.avg(c0 + x * pc, c0 + (x + 1) * pc)));
    }
    this.Yrows[row] = y;
    const pair = row >> 1;
    if (odd) this.Cb[pair] = c; else this.Cr[pair] = c;
    this.paint(pair);
    this.ev.onState?.({ kind: "rx", row });
  }

  private paint(pair: number) {
    const cr = this.Cr[pair], cb = this.Cb[pair];
    for (const r of [pair * 2, pair * 2 + 1]) {
      const y = this.Yrows[r];
      if (!y) continue;
      for (let x = 0; x < SSTV_W; x++) {
        const Y = 1.164 * (y[x] - 16), R = (cr ? cr[x] : 128) - 128, B = (cb ? cb[x] : 128) - 128;
        const o = (r * SSTV_W + x) * 4;
        this.rgba[o] = clamp8(Y + 1.596 * R);
        this.rgba[o + 1] = clamp8(Y - 0.813 * R - 0.391 * B);
        this.rgba[o + 2] = clamp8(Y + 2.018 * B);
      }
    }
    this.ev.onRows?.(pair * 2, pair * 2 + 1, this.rgba);
  }
}
