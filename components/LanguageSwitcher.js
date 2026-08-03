'use client';

import { useLanguage } from '../lib/i18n';

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      style={{
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 500,
        padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 5,
        background: 'var(--paper)', color: 'var(--text-soft)', cursor: 'pointer', marginRight: 12,
      }}
    >
      <option value="pt">PT</option>
      <option value="en">EN</option>
      <option value="es">ES</option>
    </select>
  );
}
