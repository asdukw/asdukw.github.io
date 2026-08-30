import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Lang } from "@/lib/posts";
import { dictionaries, type Dict } from "./dictionaries";

const STORAGE_KEY = "site.lang";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: Dict;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "en" || stored === "zh" ? stored : "zh";
  } catch {
    return "zh";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage failures
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next = prev === "zh" ? "en" : "zh";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore storage failures
      }
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(
    () => ({ lang, setLang, toggleLang, t: dictionaries[lang] }),
    [lang, setLang, toggleLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLang must be used within a LanguageProvider");
  }
  return ctx;
}