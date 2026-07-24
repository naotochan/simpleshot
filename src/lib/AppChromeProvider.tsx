import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  getSettings,
  saveSettings,
  type AppSettings,
} from "./ipc";
import {
  LocalizationProvider,
  type AppLanguage,
} from "./localization";
import {
  AppearanceProvider,
  type AppAppearance,
} from "./appearance";

const DEFAULT_SETTINGS: AppSettings = {
  hotkeys: {
    screenshot: "Command+Shift+Space",
  },
  save_directory: "",
  image_format: "png",
  show_cursor: false,
  favorite_colors: [],
  app_language: "system",
  app_appearance: "system",
};

function normalizeLanguage(raw: string | undefined): AppLanguage {
  if (raw === "english" || raw === "japanese" || raw === "system") return raw;
  return "system";
}

function normalizeAppearance(raw: string | undefined): AppAppearance {
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

/**
 * Loads persisted language/appearance and injects providers for every window
 * (settings / editor / overlay each boot their own React root).
 */
export function AppChromeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...s,
          app_language: normalizeLanguage(s.app_language),
          app_appearance: normalizeAppearance(s.app_appearance),
        });
      })
      .catch(console.error)
      .finally(() => setReady(true));
  }, []);

  const persistPatch = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void saveSettings(next).catch(console.error);
      return next;
    });
  }, []);

  const setLanguage = useCallback(
    (lang: AppLanguage) => {
      void persistPatch({ app_language: lang });
    },
    [persistPatch]
  );

  const setAppearance = useCallback(
    (appearance: AppAppearance) => {
      void persistPatch({ app_appearance: appearance });
    },
    [persistPatch]
  );

  // Apply defaults even before settings load so first paint isn't unthemed
  if (!ready) {
    return (
      <LocalizationProvider language="system" onLanguageChange={setLanguage}>
        <AppearanceProvider appearance="system" onAppearanceChange={setAppearance}>
          {children}
        </AppearanceProvider>
      </LocalizationProvider>
    );
  }

  return (
    <LocalizationProvider
      language={normalizeLanguage(settings.app_language)}
      onLanguageChange={setLanguage}
    >
      <AppearanceProvider
        appearance={normalizeAppearance(settings.app_appearance)}
        onAppearanceChange={setAppearance}
      >
        {children}
      </AppearanceProvider>
    </LocalizationProvider>
  );
}

export { DEFAULT_SETTINGS };
