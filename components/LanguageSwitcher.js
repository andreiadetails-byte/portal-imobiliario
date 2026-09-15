```jsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../lib/i18n';

const LANGUAGES = [
  { code: 'pt', label: 'PT', colors: ['#046A38', '#DA291C', '#FFCD00'] },
  { code: 'en', label: 'EN', colors: ['#012169', '#FFFFFF', '#C8102E'] },
  { code: 'es', label: 'ES', colors: ['#AA151B', '#F1BF00'] },
  { code: 'fr', label: 'FR', colors: ['#0055A4', '#FFFFFF', '#EF4135'] },
  { code: 'de', label: 'DE', colors: ['#000000', '#DD0000', '#FFCE00'] },
  { code: 'nl', label: 'NL', colors: ['#AE1C28', '#FFFFFF', '#21468B'] },
  { code: 'ru', label: 'RU', colors: ['#FFFFFF', '#0039A6', '#D52B1E'] },
  { code: 'it', label: 'IT', colors: ['#009246', '#FFFFFF', '#CE2B37'] },
  { code: 'pl', label: 'PL', colors: ['#FFFFFF', '#DC143C'] },
  { code: 'sv', label: 'SV', colors: ['#006AA7', '#FECC00'] },
  { code: 'uk', label: 'UA', colors: ['#0057B7', '#FFD700'] },
  { code: 'zh', label: '中文', colors: ['#DE2910', '#FFDE00'] },
  { code: 'ar', label: 'AR', colors: ['#006C35', '#FFFFFF', '#000000'] },
];

function Flag({ code }) {
  const common = {
    width: 22,
    height: 15,
    display: 'block',
    flexShrink: 0,
  };

  if (code === 'pt') {
    return (
      <svg viewBox="0 0 22 15" style={common} aria-hidden="true">
        <rect width="22" height="15" fill="#FFCD00" />
        <rect width="9" height="15" fill="#046A38" />
        <circle cx="9" cy="7.5" r="3.2" fill="#DA291C" />
        <circle cx="9" cy="7.5" r="2.1" fill="#FFCD00" />
      </svg>
    );
  }

  if (code === 'en') {
    return (
      <svg viewBox="0 0 22 15" style={common} aria-hidden="true">
        <rect width="22" height="15" fill="#012169" />
        <path d="M0 0L22 15M22 0L0 15" stroke="#FFF" strokeWidth="3" />
        <path d="M0 0L22 15M22 0L0 15" stroke="#C8102E" strokeWidth="1.3" />
        <path d="M11 0V15M0 7.5H22" stroke="#FFF" strokeWidth="5" />
        <path d="M11 0V15M0 7.5H22" stroke="#C8102E" strokeWidth="2.8" />
      </svg>
    );
  }

  if (code === 'es') {
    return (
      <svg viewBox="0 0 22 15" style={common} aria-hidden="true">
        <rect width="22" height="15" fill="#AA151B" />
        <rect y="3.75" width="22" height="7.5" fill="#F1BF00" />
      </svg>
    );
  }

  if (code === 'fr') {
    return (
      <svg viewBox="0 0 22 15" style={common} aria-hidden="true">
        <rect width="7.33" height="15" fill="#0055A4" />
        <rect x="7.33" width="7.34" height="15" fill="#FFF" />
        <rect x="14.67" width="7.33" height="15" fill="#EF4135" />
      </svg>
    );
  }

  if (code === 'de') {
    return (
      <svg viewBox="0 0 22 15" style={common} aria-hidden="true">
        <rect width="22" height="5" fill="#000" />
        <rect y="5" width="22" height="5" fill="#DD0000" />
        <rect y="10" width="22" height="5" fill="#FFCE00" />
      </svg>
    );
  }

  if (code === 'nl') {
    return (
      <svg viewBox="0 0 22 15" style={common} aria-hidden="true">
        <rect width="22" height="5" fill="#AE1C28" />
        <rect y="5" width="22" height="5" fill="#FFF" />
        <rect y="10" width="22" height="5" fill="#21468B" />
      </svg>
    );
  }

  if (code === 'ru') {
    return (
      <svg viewBox="0 0 22 15" style={common} aria-hidden="true">
        <rect width="22" height="5" fill="#FFF" />
        <rect y="5" width="22" height="5" fill="#0039A6" />
        <rect y="10" width="22" height="5" fill="#D52B1E" />
      </svg>
    );
  }

  if (code === 'it') {
    return (
      <svg viewBox="0 0 22 15" style={common} aria-hidden="true">
        <rect width="7.33" height="15" fill="#009246" />
        <rect x="7.33" width="7.34" height="15" fill="#FFF" />
        <rect x="14.67" width="7.33" height="15" fill="#CE2B37" />
      </svg>
    );
  }

  if (code === 'pl') {
    return (
      <svg viewBox="0 0 22 15" style={common} aria-hidden="true">
        <rect width="22" height="7.5" fill="#FFF" />
        <rect y="7.5" width="22" height="7.5" fill="#DC143C" />
      </svg>
    );
  }

  if (code === 'sv') {
    return (
      <svg viewBox="0 0 22 15" style={common} aria-hidden="true">
        <rect width="22" height="15" fill="#006AA7" />
        <rect x="6" width="3" height="15" fill="#FECC00" />
        <rect y="6" width="22" height="3" fill="#FECC00" />
      </svg>
    );
  }

  if (code === 'uk') {
    return (
      <svg viewBox="0 0 22 15" style={common} aria-hidden="true">
        <rect width="22" height="7.5" fill="#0057B7" />
        <rect y="7.5" width="22" height="7.5" fill="#FFD700" />
      </svg>
    );
  }

  if (code === 'zh') {
    return (
      <svg viewBox="0 0 22 15" style={common} aria-hidden="true">
        <rect width="22" height="15" fill="#DE2910" />
        <polygon points="4,2 4.7,4 6.8,4 5.1,5.2 5.7,7.2 4,6 2.3,7.2 2.9,5.2 1.2,4 3.3,4" fill="#FFDE00" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 22 15" style={common} aria-hidden="true">
      <rect width="22" height="15" fill="#006C35" />
      <rect y="4" width="22" height="2" fill="#FFF" />
      <rect y="9" width="22" height="2" fill="#FFF" />
    </svg>
  );
}

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
        <span className="lang-switcher-label">{current.label}</span>
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
                background: l.code === lang ? 'var(--plaster)' : 'transparent',
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
