'use client';

import { createContext, useContext, useState } from 'react';
import { t, type Lang, type Translations } from '@/lib/i18n';

interface LangContextValue {
  lang: Lang;
  tr: Translations;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue>({
  lang: 'en',
  tr: t.en,
  setLang: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  return (
    <LangContext value={{ lang, tr: t[lang], setLang }}>
      {children}
    </LangContext>
  );
}

export function useLang() {
  return useContext(LangContext);
}
