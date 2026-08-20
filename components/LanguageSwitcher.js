'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../lib/i18n';

const LANGUAGES = [
  { code: 'pt', label: 'PT', flag: 'pt' },
  { code: 'en', label: 'EN', flag: 'gb' },
  { code: 'es', label: 'ES', flag: 'es' },
  { code: 'fr', label: 'FR', flag: 'fr' },
  { code: 'de', label: 'DE', flag: 'de' },
  { code: 'nl', label: 'NL', flag: 'nl' },
  { code: 'ru', label: 'RU', flag: 'ru' },
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
        <img src={`https://flagcdn.com/w20/${current.flag}.png`} alt="" width={18} height={13} style={{ display: 'block', borderRadius: 2, flexShrink: 0 }} />
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
              <img src={`https://flagcdn.com/w20/${l.flag}.png`} alt="" width={18} height={13} style={{ display: 'block', borderRadius: 2, flexShrink: 0 }} />
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
