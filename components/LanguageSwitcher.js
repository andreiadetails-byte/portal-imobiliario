'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../lib/i18n';
import { FLAG_COMPONENTS } from './FlagIcons';

const LANGUAGES = [
  { code: 'pt', label: 'PT', flag: 'pt' },
  { code: 'en', label: 'EN', flag: 'gb' },
  { code: 'es', label: 'ES', flag: 'es' },
  { code: 'fr', label: 'FR', flag: 'fr' },
  { code: 'de', label: 'DE', flag: 'de' },
  { code: 'nl', label: 'NL', flag: 'nl' },
  { code: 'ru', label: 'RU', flag: 'ru' },
  { code: 'it', label: 'IT', flag: 'it' },
  { code: 'pl', label: 'PL', flag: 'pl' },
  { code: 'sv', label: 'SV', flag: 'se' },
  { code: 'uk', label: 'UA', flag: 'ua' },
  { code: 'zh', label: '中文', flag: 'cn' },
  { code: 'ar', label: 'AR', flag: 'sa' },
];

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  const CurrentFlag = FLAG_COMPONENTS[current.flag];

  return (
    <div ref={wrapRef} style={{ position: 'relative', marginRight: 12, flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Escolher idioma"
        className="lang-switcher-btn"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 500,
          padding: '6px 10px', border: '1px solid var(--line)', borderRadius: 5,
          background: 'var(--paper)', color: 'var(--text-soft)', cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {CurrentFlag && <CurrentFlag size={18} />}
        <span className="lang-switcher-label">{current.label}</span>
        <span style={{ fontSize: 9 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 200,
          background: '#fff', border: '1px solid var(--line)', borderRadius: 6,
          boxShadow: '0 6px 18px rgba(51,46,34,0.15)', minWidth: 130,
          maxHeight: '70vh', overflowY: 'auto',
        }}>
          {LANGUAGES.map((l) => {
            const Flag = FLAG_COMPONENTS[l.flag];
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => { setLang(l.code); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '9px 12px', border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: l.code === lang ? 'var(--plaster)' : '#fff',
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 12.5, color: '#332E22',
                }}
              >
                {Flag && <Flag size={18} />}
                {l.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
