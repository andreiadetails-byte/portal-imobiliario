'use client';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../lib/i18n';

const LANGUAGES = [
  { code: 'pt', label: 'PT', flag: '🇵🇹' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'de', label: 'DE', flag: '🇩🇪' },
  { code: 'it', label: 'IT', flag: '🇮🇹' },
  { code: 'nl', label: 'NL', flag: '🇳🇱' },
  { code: 'pl', label: 'PL', flag: '🇵🇱' },
  { code: 'ro', label: 'RO', flag: '🇷🇴' },
  { code: 'uk', label: 'UK', flag: '🇺🇦' },
  { code: 'ru', label: 'RU', flag: '🇷🇺' },
  { code: 'zh', label: 'ZH', flag: '🇨🇳' },
  { code: 'ja', label: 'JA', flag: '🇯🇵' },
];

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        className="lang-switcher-btn btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Escolher idioma"
        aria-expanded={open}
        style={{ padding: '8px 10px', gap: 6, minWidth: 0, borderColor: 'var(--line)' }}
      >
        <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>{current.flag}</span>
        <span className="lang-switcher-label" style={{ fontSize: 12, fontWeight: 600 }}>{current.label}</span>
        <span aria-hidden="true" style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 100,
          minWidth: 170, maxHeight: 360, overflowY: 'auto', padding: 6,
          background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8,
          boxShadow: '0 12px 30px rgba(51,46,34,0.18)',
        }}>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => { setLang(l.code); setOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', border: 0, borderRadius: 6, cursor: 'pointer',
                background: l.code === lang ? 'rgba(102,116,86,0.12)' : 'transparent',
                color: 'var(--ink)', textAlign: 'left', fontFamily: 'Inter, sans-serif',
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>{l.flag}</span>
              <span style={{ fontSize: 13, fontWeight: l.code === lang ? 700 : 500 }}>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
