'use client';

import { createContext, useContext, useState } from 'react';
import { t, type Lang, type Translations } from '@/lib/i18n';

interface LangContextValue {
  lang: Lang;
  tr: Translations;
  toggle: () => void;
}

const LANG_CYCLE: Lang[] = ['en', 'es', 'pt', 'ja'];

const LangContext = createContext<LangContextValue>({
  lang: 'en',
  tr: t.en,
  toggle: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  const toggle = () => setLang(l => LANG_CYCLE[(LANG_CYCLE.indexOf(l) + 1) % LANG_CYCLE.length]);
  return (
    <LangContext value={{ lang, tr: t[lang], toggle }}>
      {children}
    </LangContext>
  );
}

export function useLang() {
  return useContext(LangContext);
}
