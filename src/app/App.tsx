import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { useApp, useUI, type Tab } from "@/lib/store";
import { checkServer } from "@/lib/ai";
import { applyLook } from "@/lib/fx";
import { TopBar, TabBar, ScreenTransition, UpdateToast, TABS } from "./Shell";
import { SheetHost } from "./sheets/Sheets";
import { Onboarding } from "./screens/Onboarding";
import { HomeScreen } from "./screens/Home";
import { TrainScreen } from "./screens/Train";
import { VariantScreen } from "./screens/Variant";
import { ChatScreen } from "./screens/Chat";
import { StatsScreen } from "./screens/Stats";

const SCREENS: Record<Tab, () => React.ReactElement> = {
  home: HomeScreen, train: TrainScreen, variant: VariantScreen, chat: ChatScreen, stats: StatsScreen,
};

export function App() {
  const onboarded = useApp(s => s.onboarded);
  const theme = useApp(s => s.theme);
  const accent = useApp(s => s.accent);
  const provider = useApp(s => s.settings.provider);
  const tab = useUI(s => s.tab);
  const Screen = SCREENS[tab];

  useEffect(() => { applyLook(theme, accent); }, [theme, accent]);
  useEffect(() => {
    const m = matchMedia("(prefers-color-scheme: dark)");
    const f = () => applyLook(useApp.getState().theme, useApp.getState().accent);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  useEffect(() => { if (provider === "server") checkServer(); }, [provider]);
  useEffect(() => {
    const f = () => { if (document.visibilityState === "visible" && useApp.getState().settings.provider === "server") checkServer(); };
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, []);
  // ярлыки с иконки приложения: /app/#variant, /app/#chat, /app/#train
  useEffect(() => {
    const h = location.hash.slice(1) as Tab;
    if (useApp.getState().onboarded && TABS.some(t => t.id === h)) useUI.setState({ tab: h });
    if (useApp.getState().onboarded) useApp.getState().touchStreak();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      {!onboarded ? <Onboarding /> : (
        <>
          <TopBar />
          <main className="mx-auto max-w-[560px] px-4 pb-[110px]">
            <ScreenTransition id={tab}><Screen /></ScreenTransition>
          </main>
          <TabBar />
        </>
      )}
      <SheetHost />
      <UpdateToast />
    </MotionConfig>
  );
}
