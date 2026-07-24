import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ResolvedLanguage } from "./localization";
import { pickString } from "./localization";

/** Light / Dark / System preference. Persisted via AppSettings.app_appearance. */
export type AppAppearance = "system" | "light" | "dark";

export const APP_APPEARANCE_KEY = "appAppearance";

export const APP_APPEARANCES: AppAppearance[] = ["system", "light", "dark"];

export type ResolvedAppearance = "light" | "dark";

export function appearanceLabel(
  appearance: AppAppearance,
  lang: ResolvedLanguage
): string {
  switch (appearance) {
    case "system":
      return pickString(lang, "System", "システム");
    case "light":
      return pickString(lang, "Light", "ライト");
    case "dark":
      return pickString(lang, "Dark", "ダーク");
  }
}

export function resolveAppearance(
  appearance: AppAppearance,
  prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
): ResolvedAppearance {
  if (appearance === "light") return "light";
  if (appearance === "dark") return "dark";
  return prefersDark ? "dark" : "light";
}

/** Apply CSS tokens + color-scheme. Optionally sync Tauri window chrome. */
export function applyAppearance(appearance: AppAppearance): ResolvedAppearance {
  const resolved = resolveAppearance(appearance);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;

  // Best-effort native window theme (fails outside Tauri / unsupported)
  void getCurrentWindow()
    .setTheme(appearance === "system" ? null : appearance)
    .catch(() => {});

  return resolved;
}

interface AppearanceContextValue {
  appearance: AppAppearance;
  setAppearance: (a: AppAppearance) => void;
  resolved: ResolvedAppearance;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({
  appearance,
  onAppearanceChange,
  children,
}: {
  appearance: AppAppearance;
  onAppearanceChange: (a: AppAppearance) => void;
  children: ReactNode;
}) {
  const resolved = useMemo(() => resolveAppearance(appearance), [appearance]);

  useEffect(() => {
    applyAppearance(appearance);

    if (appearance !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyAppearance("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [appearance]);

  const setAppearance = useCallback(
    (a: AppAppearance) => {
      onAppearanceChange(a);
    },
    [onAppearanceChange]
  );

  const value = useMemo(
    () => ({ appearance, setAppearance, resolved }),
    [appearance, setAppearance, resolved]
  );

  return (
    <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    throw new Error("useAppearance must be used within AppearanceProvider");
  }
  return ctx;
}
