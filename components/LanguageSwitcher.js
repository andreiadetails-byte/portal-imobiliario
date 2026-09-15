```jsx
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

const FLAG_COLORS = {
  pt: ['#046A38', '#FFFFFF', '#DA291C'],
  en: ['#012169', '#FFFFFF', '#C8102E'],
  es: ['#AA151B', '#F1BF00', '#AA151B'],
  fr: ['#0055A4', '#FFFFFF', '#EF4135'],
  de: ['#000000', '#DD0000', '#FFCE00'],
  nl: ['#AE1C28', '#FFFFFF', '#21468B'],
  ru: ['#FFFFFF', '#0039A6', '#D52B1E'],
  it: ['#009246', '#FFFFFF', '#CE2B37'],
  pl: ['#FFFFFF', '#DC143C'],
  sv: ['#006AA7', '#FECC00'],
  uk: ['#0057B7', '#FFD700'],
  zh: ['#DE2910', '#FFDE00'],
  ar: ['#007A3D', '#FFFFFF', '#000000'],
};

function Flag({ code }) {
  const colors = FLAG_COLORS[code] || ['#667055', '#FFFFFF', '#667055'];

  return (
    <span
      aria-hidden="true"
      style={{
        width: 22,
        height: 15,
        display: 'inline-flex',
        flexShrink: 0,
        overflow: 'hidden',
        borderRadius: 2,
        border: '1px solid rgba(51,46,34,0.16)',
        background: '#fff',
        boxSizing: 'border-box',
      }}
    >
      <svg
        viewBox="0 0 3 2"
        width="22"
        height="15"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {code === 'pt' && (
          <>
            <rect width="1.2" height="2" fill="#046A38" />
            <rect x="1.2" width="1.8" height="2" fill="#DA291C" />
            <circle cx="1.2" cy="1" r=".32" fill="#F9D616" stroke="#8B5E00" strokeWidth=".04" />
          </>
        )}

        {code === 'en' && (
          <>
            <rect width="3" height="2" fill="#012169" />
            <path d="M0 0L3 2M3 0L0 2" stroke="#FFFFFF" strokeWidth=".42" />
            <path d="M0 0L3 2M3 0L0 2" stroke="#C8102E" strokeWidth=".18" />
            <path d="M1.5 0V2M0 1H3" stroke="#FFFFFF" strokeWidth=".65" />
            <path d="M1.5 0V2M0 1H3" stroke="#C8102E" strokeWidth=".35" />
          </>
        )}

        {code === 'es' && (
          <>
            <rect width="3" height=".5" fill="#AA151B" />
            <rect y=".5" width="3" height="1" fill="#F1BF00" />
            <rect y="1.5" width="3" height=".5" fill="#AA151B" />
          </>
        )}

        {code === 'fr' && (
          <>
            <rect width="1" height="2" fill="#0055A4" />
            <rect x="1" width="1" height="2" fill="#FFFFFF" />
            <rect x="2" width="1" height="2" fill="#EF4135" />
          </>
        )}

        {code === 'de' && (
          <>
            <rect width="3" height=".666" fill="#000000" />
            <rect y=".666" width="3" height=".667" fill="#DD0000" />
            <rect y="1.333" width="3" height=".667" fill="#FFCE00" />
          </>
        )}

        {code === 'nl' && (
          <>
            <rect width="3" height=".666" fill="#AE1C28" />
            <rect y=".666" width="3" height=".667" fill="#FFFFFF" />
            <rect y="1.333" width="3" height=".667" fill="#21468B" />
          </>
        )}

        {code === 'ru' && (
          <>
            <rect width="3" height=".666" fill="#FFFFFF" />
            <rect y=".666" width="3" height=".667" fill="#0039A6" />
            <rect y="1.333" width="3" height=".667" fill="#D52B1E" />
          </>
        )}

        {code === 'it' && (
          <>
            <rect width="1" height="2" fill="#009246" />
            <rect x="1" width="1" height="2" fill="#FFFFFF" />
            <rect x="2" width="1" height="2" fill="#CE2B37" />
          </>
        )}

        {code === 'pl' && (
          <>
            <rect width="3" height="1" fill="#FFFFFF" />
            <rect y="1" width="3" height="1" fill="#DC143C" />
          </>
        )}

        {code === 'sv' && (
          <>
            <rect width="3" height="2" fill="#006AA7" />
            <rect x=".9" width=".35" height="2" fill="#FECC00" />
            <rect y=".82" width="3" height=".35" fill="#FECC00" />
          </>
        )}

        {code === 'uk' && (
          <>
            <rect width="3" height="1" fill="#0057B7" />
            <rect y="1" width="3" height="1" fill="#FFD700" />
          </>
        )}

        {code === 'zh' && (
          <>
            <rect width="3" height="2" fill="#DE2910" />
            <circle cx=".55" cy=".5" r=".22" fill="#FFDE00" />
          </>
        )}

        {code === 'ar' && (
          <>
            <rect width="3" height=".666" fill="#007A3D" />
            <rect y=".666" width="3" height=".667" fill="#FFFFFF" />
            <rect y="1.333" width="3" height=".667" fill="#000000" />
            <polygon points=".45,1 .7,.92 .78,1 .7,1.08" fill="#CE1126" />
          </>
        )}
      </svg>
    </span>
  );
}

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const current =
    LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        marginRight: 12,
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Escolher idioma"
        className="lang-switcher-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 12,
          fontWeight: 500,
          padding: '6px 10px',
          border: '1px solid var(--line)',
          borderRadius: 5,
          background: 'var(--paper)',
          color: 'var(--text-soft)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <Flag code={current.code} />

        <span className="lang-switcher-label">
          {current.label}
        </span>

        <span style={{ fontSize: 9 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            zIndex: 200,
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: 6,
            boxShadow: '0 6px 18px rgba(51,46,34,0.15)',
            minWidth: 130,
            overflow: 'hidden',
          }}
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '9px 12px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                background:
                  l.code === lang
                    ? 'var(--plaster)'
                    : 'transparent',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 12.5,
                color: 'var(--ink)',
              }}
            >
              <Flag code={l.code} />
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```
