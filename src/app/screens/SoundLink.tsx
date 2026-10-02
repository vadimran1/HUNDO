import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, FileAudio, ImagePlus, Mic, Play, Square, X } from "lucide-react";
import { useUI } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { encodeRobot36, toWav, Robot36Decoder, SSTV_W, SSTV_H, LINE_MS, type RxState } from "@/lib/sstv";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { cn } from "@/lib/utils";

/**
 * «Звуковой канал» — секретный экран: открывается пятью быстрыми нажатиями на логотип HUNDO.
 * Один телефон проигрывает картинку звуком (SSTV, режим Robot 36), другой слушает микрофоном
 * и рисует её строка за строкой.
 */
const TX_RATE = 44100;
const LEAD_S = 0.3;            // тишина перед сигналом (см. encodeRobot36)
const HEADER_S = 0.91;         // вступление и код режима

async function saveBlob(blob: Blob, name: string) {
  const file = new File([blob], name, { type: blob.type });
  // на телефоне — «Поделиться» (сохранить в фото, отправить в мессенджер), на компьютере — скачивание
  if (navigator.canShare?.({ files: [file] }) && matchMedia("(pointer:coarse)").matches) {
    try { await navigator.share({ files: [file] }); return; } catch { /* отменили — скачаем */ }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function SoundLink() {
  const [tab, setTab] = useState<"tx" | "rx">("tx");
  const t = useT();
  const close = () => useUI.setState({ overlay: null });
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, []);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
      className="fixed inset-0 z-[60] overflow-y-auto bg-bg pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="mx-auto max-w-[560px] px-4 pb-10">
        <div className="flex items-center gap-3 pt-4 pb-1">
          <span className="font-mono text-[12px] tracking-[.08em] text-fg-3 uppercase">
            <b className="font-bold text-fg">{t("Звуковой канал", "Sound link")}</b> · SSTV Robot 36
          </span>
          <span className="flex-1" />
          <button aria-label={t("Закрыть", "Close")} onClick={close} className="grid size-9 place-items-center rounded-xl text-fg-3 hover:bg-bg-2 hover:text-fg"><X className="size-5" /></button>
        </div>
        <h2 className="mt-3 mb-1.5 font-display text-[clamp(24px,7vw,32px)] leading-[1.1] font-bold tracking-[-.02em]">{t("Картинка через звук", "Pictures over sound")}</h2>
        <p className="mb-5 text-[14px] text-fg-2">{t(
          "Один телефон играет картинку звуком, другой слушает микрофоном и рисует её строка за строкой — как космонавты на МКС передают фото радиолюбителям.",
          "One phone plays a picture as sound, the other listens with its microphone and draws it line by line — the way ISS crews send photos to radio amateurs.")}</p>
        <Segmented id="sound-tab" value={tab} onChange={v => setTab(v)} items={[["tx", t("Передать", "Send")], ["rx", t("Принять", "Receive")]]} />
        <div className="mt-5">{tab === "tx" ? <Sender /> : <Receiver />}</div>
      </div>
    </motion.div>
  );
}

/* ---------- экран с картинкой 320×240 и бегущей строкой ---------- */
function Screen({ canvasRef, line, empty }: { canvasRef: React.RefObject<HTMLCanvasElement | null>; line: number | null; empty?: React.ReactNode }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line-2 bg-[#0a0a0a]">
      <canvas ref={canvasRef} width={SSTV_W} height={SSTV_H} className="block size-full [image-rendering:pixelated]" />
      {line !== null && line >= 0 && line < SSTV_H && (
        <div className="pointer-events-none absolute inset-x-0 h-[2px] bg-[#f5f5f5] shadow-[0_0_12px_#f5f5f5]" style={{ top: `${(line / SSTV_H) * 100}%` }} />
      )}
      {empty && <div className="absolute inset-0 grid place-items-center p-6 text-center text-[14px] text-[#9e9e9e]">{empty}</div>}
    </div>
  );
}

/* ---------- передатчик ---------- */
function Sender() {
  const t = useT();
  const canvas = useRef<HTMLCanvasElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [wav, setWav] = useState<Blob | null>(null);
  const [line, setLine] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);

  const stop = () => { audio.current?.pause(); setPlaying(false); setLine(null); };
  useEffect(() => () => { audio.current?.pause(); if (audio.current?.src) URL.revokeObjectURL(audio.current.src); }, []);

  const encode = () => {
    const c = canvas.current!.getContext("2d")!;
    const samples = encodeRobot36(c.getImageData(0, 0, SSTV_W, SSTV_H).data, TX_RATE);
    setWav(toWav(samples, TX_RATE));
  };

  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true); stop();
    try {
      const bmp = await createImageBitmap(f);
      const c = canvas.current!.getContext("2d")!;
      // заполняем кадр 4:3 целиком, лишнее обрезаем по краям
      const s = Math.max(SSTV_W / bmp.width, SSTV_H / bmp.height), w = bmp.width * s, h = bmp.height * s;
      c.fillStyle = "#000"; c.fillRect(0, 0, SSTV_W, SSTV_H);
      c.drawImage(bmp, (SSTV_W - w) / 2, (SSTV_H - h) / 2, w, h);
      encode();
    } finally { setBusy(false); if (file.current) file.current.value = ""; }
  };

  const testCard = () => {
    stop();
    const c = canvas.current!.getContext("2d")!;
    const bars = ["#f5f5f5", "#ffe600", "#00e5ff", "#1fc77e", "#ff3df2", "#ff3b30", "#3d5afe", "#0a0a0a"];
    bars.forEach((b, i) => { c.fillStyle = b; c.fillRect(i * 40, 0, 40, 150); });
    const g = c.createLinearGradient(0, 0, SSTV_W, 0); g.addColorStop(0, "#000"); g.addColorStop(1, "#fff");
    c.fillStyle = g; c.fillRect(0, 150, SSTV_W, 20);
    c.fillStyle = "#0a0a0a"; c.fillRect(0, 170, SSTV_W, 70);
    c.fillStyle = "#f5f5f5"; c.font = "900 44px Unbounded, Arial Black, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("HUNDO", SSTV_W / 2, 206);
    c.fillStyle = "#0a0a0a"; c.beginPath(); c.roundRect(110, 40, 100, 70, 14); c.fill();
    c.fillStyle = "#f5f5f5"; c.font = "900 34px Unbounded, Arial Black, sans-serif"; c.fillText("100", SSTV_W / 2, 76);
    encode();
  };

  const play = async () => {
    if (!wav) return;
    if (playing) return stop();
    if (audio.current?.src) URL.revokeObjectURL(audio.current.src);
    // через <audio>, а не Web Audio: так звук идёт даже при беззвучном режиме iPhone
    const a = new Audio(URL.createObjectURL(wav));
    audio.current = a;
    a.onended = () => { setPlaying(false); setLine(null); };
    await a.play();
    setPlaying(true);
    const tick = () => {
      if (audio.current !== a || a.paused) return;
      setLine(Math.floor((a.currentTime - LEAD_S - HEADER_S) / (LINE_MS / 1000)));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  return (
    <>
      <Screen canvasRef={canvas} line={line} empty={!wav && !busy ? t("Выберите фото или тестовую картинку", "Pick a photo or the test card") : undefined} />
      <input ref={file} type="file" accept="image/*" className="hidden" onChange={e => pick(e.target.files?.[0])} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => file.current?.click()} disabled={playing}><ImagePlus className="size-4" /> {t("Фото", "Photo")}</Button>
        <Button variant="outline" onClick={testCard} disabled={playing}>{t("Тестовая картинка", "Test card")}</Button>
      </div>
      <Button size="lg" className="mt-2 w-full" disabled={!wav} onClick={play}>
        {playing ? <><Square className="size-4" /> {t("Остановить", "Stop")}</> : <><Play className="size-4" /> {t("Передать звуком · 37 с", "Send as sound · 37 s")}</>}
      </Button>
      {playing && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${Math.max(0, Math.min(1, ((line ?? 0) + 1) / SSTV_H)) * 100}%` }} />
        </div>
      )}
      <Button variant="ghost" size="sm" className="mt-2" disabled={!wav} onClick={() => wav && saveBlob(wav, "hundo-sstv.wav")}>
        <Download className="size-4" /> {t("Сохранить звук (.wav)", "Save the sound (.wav)")}
      </Button>
      <ul className="mt-4 grid gap-1.5 text-[13px] leading-snug text-fg-3">
        <li>• {t("Сделайте громкость на максимум и держите телефоны в 10–30 см друг от друга.", "Turn the volume all the way up and keep the phones 10–30 cm apart.")}</li>
        <li>• {t("В комнате должно быть тихо: голоса и эхо дают полоски на картинке.", "Keep the room quiet: voices and echo show up as streaks.")}</li>
        <li>• {t("Принимают не только HUNDO, но и любые SSTV-программы — режим Robot 36.", "Any SSTV app can receive it too — the mode is Robot 36.")}</li>
      </ul>
    </>
  );
}

/* ---------- приёмник ---------- */
const WORKLET = `class HundoTap extends AudioWorkletProcessor {
  constructor(){ super(); this.buf = new Float32Array(2048); this.n = 0; }
  process(inputs){ const ch = inputs[0] && inputs[0][0];
    if (ch) for (let i = 0; i < ch.length; i++) { this.buf[this.n++] = ch[i]; if (this.n === 2048) { this.port.postMessage(this.buf.slice(0)); this.n = 0; } }
    return true; } }
registerProcessor('hundo-tap', HundoTap);`;

type Mic = { ctx: AudioContext; stream: MediaStream };

function Receiver() {
  const t = useT();
  const canvas = useRef<HTMLCanvasElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const mic = useRef<Mic | null>(null);
  const dec = useRef<Robot36Decoder | null>(null);
  const frame = useRef(0);
  const [state, setState] = useState<RxState>({ kind: "idle" });
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState({ f: 1900, a: 0 });
  const [rows, setRows] = useState(0);
  const [err, setErr] = useState("");
  const [fileBusy, setFileBusy] = useState(false);

  const draw = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const d = dec.current, c = canvas.current?.getContext("2d");
      if (d && c) c.putImageData(new ImageData(d.rgba, SSTV_W, SSTV_H), 0, 0);
    });
  };
  const makeDecoder = (rate: number) => {
    const d = new Robot36Decoder(rate, {
      onRows: (_a, b) => { setRows(r => Math.max(r, b + 1)); draw(); },
      onState: s => { setState(s); if (s.kind === "idle") setRows(0); },
      onLevel: (f, a) => setLevel({ f, a }),
    });
    dec.current = d;
    draw();
    return d;
  };

  const stopMic = () => {
    const m = mic.current; mic.current = null;
    m?.stream.getTracks().forEach(tr => tr.stop());
    m?.ctx.close().catch(() => {});
    setListening(false);
  };
  useEffect(() => () => { stopMic(); cancelAnimationFrame(frame.current); }, []);

  const listen = async () => {
    if (listening) return stopMic();
    setErr("");
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      // шумоподавление и автоусиление «съедают» тоны — выключаем
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      await ctx.resume();
      mic.current = { ctx, stream };
      const d = makeDecoder(ctx.sampleRate);
      const src = ctx.createMediaStreamSource(stream);
      const mute = ctx.createGain(); mute.gain.value = 0; mute.connect(ctx.destination);
      if (ctx.audioWorklet) {
        const url = URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" }));
        await ctx.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);
        const node = new AudioWorkletNode(ctx, "hundo-tap");
        node.port.onmessage = e => d.push(e.data as Float32Array);
        src.connect(node); node.connect(mute);
      } else {
        const node = ctx.createScriptProcessor(4096, 1, 1);
        node.onaudioprocess = e => d.push(e.inputBuffer.getChannelData(0).slice(0));
        src.connect(node); node.connect(mute);
      }
      setListening(true);
    } catch (e) {
      stopMic();
      const name = (e as Error)?.name;
      setErr(name === "NotAllowedError"
        ? t("Нет доступа к микрофону. Разрешите его для этого сайта в настройках браузера или телефона.", "No microphone access. Allow it for this site in your browser or phone settings.")
        : t("Не получилось включить микрофон.", "Couldn't start the microphone.") + (name ? ` (${name})` : ""));
    }
  };

  // запись с сигналом (например, голосовое сообщение) — декодируем без микрофона
  const openFile = async (f?: File) => {
    if (!f) return;
    stopMic(); setErr(""); setFileBusy(true);
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const buf = await ctx.decodeAudioData(await f.arrayBuffer());
      ctx.close().catch(() => {});
      const d = makeDecoder(buf.sampleRate), x = buf.getChannelData(0);
      const step = Math.round(buf.sampleRate * 0.5);
      // по полсекунды за кадр — картинка проявляется на глазах, но быстрее, чем в реальном времени
      for (let i = 0; i < x.length; i += step) {
        d.push(x.subarray(i, i + step));
        await new Promise(r => setTimeout(r, 0));
      }
    } catch {
      setErr(t("Не получилось прочитать запись. Подойдёт WAV, MP3 или M4A.", "Couldn't read the recording. WAV, MP3 or M4A will work."));
    } finally { setFileBusy(false); if (file.current) file.current.value = ""; }
  };

  const save = () => canvas.current?.toBlob(b => b && saveBlob(b, "hundo-sstv.png"), "image/png");

  const status = state.kind === "rx" ? t(`Принимаю: строка ${state.row + 1} из ${SSTV_H}`, `Receiving: line ${state.row + 1} of ${SSTV_H}`)
    : state.kind === "done" ? t("Картинка принята", "Picture received")
    : state.kind === "lost" ? t(`Сигнал пропал на строке ${state.row + 1}`, `Signal lost at line ${state.row + 1}`)
    : state.kind === "mode" ? t(`Это другой режим SSTV (код ${state.code}). HUNDO понимает Robot 36.`, `That's another SSTV mode (code ${state.code}). HUNDO understands Robot 36.`)
    : listening ? t("Жду сигнал…", "Waiting for a signal…") : fileBusy ? t("Читаю запись…", "Reading the recording…") : t("Нажмите «Слушать»", "Press “Listen”");
  // где сейчас частота: 1100–2300 Гц; 1200 — синхроимпульс, 1500–2300 — от чёрного к белому
  const pos = Math.max(0, Math.min(1, (level.f - 1100) / 1200));
  const loud = Math.min(1, level.a * 8);

  return (
    <>
      <Screen canvasRef={canvas} line={state.kind === "rx" ? state.row + 1 : null}
        empty={!rows && !listening && !fileBusy ? t("Здесь появится картинка", "The picture will appear here") : undefined} />
      <div className="mt-3 flex items-center gap-2.5 text-[13.5px]">
        <span className={cn("size-2 flex-none rounded-full", listening ? "bg-accent [animation:blink_1s_steps(2)_infinite]" : "bg-line-2")} />
        <span className="min-w-0 flex-1 text-fg-2">{status}</span>
      </div>
      <AnimatePresence>
        {listening && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3 grid gap-1.5">
              <div className="relative h-7 overflow-hidden rounded-lg bg-bg-2">
                <div className="absolute inset-y-0 bg-line-2" style={{ left: `${(400 / 1200) * 100}%`, width: `${(800 / 1200) * 100}%` }} />
                <div className="absolute inset-y-0 w-[3px] -translate-x-1/2 bg-accent transition-[left] duration-75" style={{ left: `${pos * 100}%`, opacity: 0.25 + loud * 0.75 }} />
              </div>
              <div className="flex justify-between font-mono text-[10.5px] text-fg-3"><span>1100</span><span>1200 sync</span><span>1500 {t("чёрный", "black")}</span><span>2300 {t("белый", "white")}</span></div>
              <div className="h-1 overflow-hidden rounded-full bg-line"><div className="h-full bg-fg transition-[width] duration-75" style={{ width: `${loud * 100}%` }} /></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Button size="lg" className="mt-3 w-full" onClick={listen} disabled={fileBusy}>
        {listening ? <><Square className="size-4" /> {t("Остановить", "Stop")}</> : <><Mic className="size-4" /> {t("Слушать", "Listen")}</>}
      </Button>
      <input ref={file} type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.opus" className="hidden" onChange={e => openFile(e.target.files?.[0])} />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => file.current?.click()} disabled={fileBusy}><FileAudio className="size-4" /> {t("Из записи", "From a recording")}</Button>
        <Button variant="outline" onClick={save} disabled={!rows}><Download className="size-4" /> {t("Сохранить", "Save")}</Button>
      </div>
      {listening && (state.kind === "done" || state.kind === "lost") && (
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => dec.current?.reset()}>{t("Принять ещё одну", "Receive another one")}</Button>
      )}
      {err && <div className="hatch mt-3 rounded-xl border border-line-2 px-4 py-3 text-[13.5px]">{err}</div>}
      <p className="mt-4 text-[13px] leading-snug text-fg-3">{t(
        "Нажмите «Слушать» и поднесите телефон к динамику другого. Приём начинается сам, когда слышен сигнал; можно подключиться и с середины передачи.",
        "Press “Listen” and hold the phone next to the other one's speaker. Reception starts by itself when the signal is heard; you can even join halfway through.")}</p>
    </>
  );
}
