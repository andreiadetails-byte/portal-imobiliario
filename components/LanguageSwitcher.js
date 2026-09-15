'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../lib/i18n';

const LANGUAGES = [
  { code: 'pt', label: 'PT', flag: '🇵🇹' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'de', label: 'DE', flag: '🇩🇪' },
  { code: 'nl', label: 'NL', flag: '🇳🇱' },
  { code: 'ru', label: 'RU', flag: '🇷🇺' },
  { code: 'it', label: 'IT', flag: '🇮🇹' },
  { code: 'pl', label: 'PL', flag: '🇵🇱' },
  { code: 'sv', label: 'SV', flag: '🇸🇪' },
  { code: 'uk', label: 'UA', flag: '🇺🇦' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ar', label: 'AR', flag: '🇸🇦' },
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{current.flag}</span>
        <span className="lang-switcher-label">{current.label}</span>
        <span style={{ fontSize: 9 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 200,
          background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 6,
          boxShadow: '0 6px 18px rgba(51,46,34,0.15)', minWidth: 130, overflow: 'hidden',
        }}>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => { setLang(l.code); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '9px 12px', border: 'none', cursor: 'pointer', textAlign: 'left',
                background: l.code === lang ? 'var(--plaster)' : 'transparent',
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 12.5, color: 'var(--ink)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{l.flag}</span>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
