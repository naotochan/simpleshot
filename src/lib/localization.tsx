import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** User-facing language preference. Persisted via AppSettings.app_language. */
export type AppLanguage = "system" | "english" | "japanese";

export type ResolvedLanguage = "english" | "japanese";

export const APP_LANGUAGE_KEY = "appLanguage";

export const APP_LANGUAGES: AppLanguage[] = ["system", "english", "japanese"];

/** Picker labels stay bilingual so either speaker can find the control. */
export function languagePickerLabel(lang: AppLanguage): string {
  switch (lang) {
    case "system":
      return "System / システム";
    case "english":
      return "English";
    case "japanese":
      return "日本語";
  }
}

export function resolveLanguage(
  language: AppLanguage,
  preferredLanguages: readonly string[] = navigator.languages ?? [navigator.language]
): ResolvedLanguage {
  switch (language) {
    case "english":
      return "english";
    case "japanese":
      return "japanese";
    case "system": {
      const pref = preferredLanguages[0] ?? "en";
      return pref.toLowerCase().startsWith("ja") ? "japanese" : "english";
    }
  }
}

export function pickString(
  resolved: ResolvedLanguage,
  english: string,
  japanese: string
): string {
  return resolved === "japanese" ? japanese : english;
}

interface LocalizationContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  resolved: ResolvedLanguage;
  t: (english: string, japanese: string) => string;
}

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

export function LocalizationProvider({
  language: controlledLanguage,
  onLanguageChange,
  children,
}: {
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  children: ReactNode;
}) {
  const resolved = useMemo(() => resolveLanguage(controlledLanguage), [controlledLanguage]);

  const t = useCallback(
    (english: string, japanese: string) => pickString(resolved, english, japanese),
    [resolved]
  );

  const value = useMemo(
    () => ({
      language: controlledLanguage,
      setLanguage: onLanguageChange,
      resolved,
      t,
    }),
    [controlledLanguage, onLanguageChange, resolved, t]
  );

  return (
    <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>
  );
}

/** Test / story helper with local state (defaults to Japanese to match prior UI). */
export function LocalizationProviderStandalone({
  initialLanguage = "japanese",
  children,
}: {
  initialLanguage?: AppLanguage;
  children: ReactNode;
}) {
  const [language, setLanguage] = useState<AppLanguage>(initialLanguage);
  return (
    <LocalizationProvider language={language} onLanguageChange={setLanguage}>
      {children}
    </LocalizationProvider>
  );
}

export function useLocalization(): LocalizationContextValue {
  const ctx = useContext(LocalizationContext);
  if (!ctx) {
    throw new Error("useLocalization must be used within LocalizationProvider");
  }
  return ctx;
}
