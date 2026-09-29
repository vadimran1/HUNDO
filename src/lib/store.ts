import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AccentId, Exam, Provider } from "./data";
import type { SubjectId } from "./tasks";

export type Settings = { provider: Provider; base: string; model: string; key: string };
export type ChatMsg = { role: "user" | "assistant"; content: string };
export type VTask = { n: number; type: "short" | "open"; topic: string; q: string; answer: string; alt: string[]; max: number; exp: string };
export type VResult = { score: number; feedback?: string };
export type Variant = {
  subj: SubjectId; exam: Exam; created: number; tasks: VTask[];
  given: Record<number, string>; results: Record<number, VResult>; done: boolean;
};

type Data = {
  onboarded: boolean;
  exam: Exam;
  subjects: SubjectId[];
  examDate: string;
  theme: "" | "light" | "dark";
  accent: AccentId;
  settings: Settings;
  stats: Record<string, { done: number; correct: number }>;
  answered: Record<string, boolean>;
  streak: { days: number; last: string };
  chat: ChatMsg[];
  weakAI: { subj: SubjectId; topic: string }[];
  variant: Variant | null;
};

type Actions = {
  patch: (p: Partial<Data>) => void;
  touchStreak: () => void;
  record: (subj: SubjectId, ok: boolean, taskId?: string) => void;
  addWeak: (subj: SubjectId, topic: string) => void;
  resetStats: () => void;
};

export const defaultSettings = (): Settings => ({ provider: "server", base: "/api", model: "", key: "" });

const initial: Data = {
  onboarded: false,
  exam: "ЕГЭ",
  subjects: ["hist", "soc"],
  examDate: "2027-05-27",
  theme: "",
  accent: "mono",
  settings: defaultSettings(),
  stats: {},
  answered: {},
  streak: { days: 0, last: "" },
  chat: [],
  weakAI: [],
  variant: null,
};

const today = () => new Date().toISOString().slice(0, 10);

export const useApp = create<Data & Actions>()(
  persist(
    (set, get) => ({
      ...initial,
      patch: p => set(p),
      touchStreak: () => {
        const { streak } = get();
        if (streak.last === today()) return;
        const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
        set({ streak: { days: streak.last === y ? streak.days + 1 : 1, last: today() } });
      },
      record: (subj, ok, taskId) => {
        const stats = { ...get().stats };
        const s = { ...(stats[subj] || { done: 0, correct: 0 }) };
        s.done++; if (ok) s.correct++;
        stats[subj] = s;
        set({ stats, ...(taskId ? { answered: { ...get().answered, [taskId]: ok } } : {}) });
        get().touchStreak();
      },
      addWeak: (subj, topic) => {
        const w = get().weakAI;
        if (!w.some(x => x.subj === subj && x.topic === topic)) set({ weakAI: [...w, { subj, topic }] });
      },
      resetStats: () => set({ stats: {}, answered: {}, weakAI: [], streak: { days: 0, last: "" } }),
    }),
    {
      name: "sotka",
      version: 1,
      partialize: ({ patch, touchStreak, record, addWeak, resetStats, ...data }) => data,
    },
  ),
);

/** Состояние интерфейса, которое не нужно сохранять */
export type Tab = "home" | "train" | "variant" | "chat" | "stats";
export type SheetId = "settings" | "about" | "paste" | "plan" | "sources" | null;

export const useUI = create<{
  tab: Tab; dir: number; sheet: SheetId; pendingChat: string; onbStep: number;
  go: (t: Tab) => void; openSheet: (s: SheetId) => void; askInChat: (text: string) => void;
}>()((set, get) => ({
  tab: "home", dir: 1, sheet: null, pendingChat: "", onbStep: 0,
  go: t => {
    const order: Tab[] = ["home", "train", "variant", "chat", "stats"];
    const dir = order.indexOf(t) >= order.indexOf(get().tab) ? 1 : -1;
    if (t === get().tab) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    set({ tab: t, dir });
    window.scrollTo(0, 0);
  },
  openSheet: s => set({ sheet: s }),
  askInChat: text => { set({ pendingChat: text, sheet: null }); get().go("chat"); },
}));
