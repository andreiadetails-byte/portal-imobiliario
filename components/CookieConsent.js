'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'morada_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : 'accepted';
    if (!saved) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    window.dispatchEvent(new Event('morada-cookie-consent-changed'));
    setVisible(false);
  }

  function reject() {
    // Regista a escolha, mas o site continua a usar apenas os cookies essenciais
    // (sessão de login, preferências) — nunca analíticos/publicidade sem consentimento.
    localStorage.setItem(STORAGE_KEY, 'rejected');
    window.dispatchEvent(new Event('morada-cookie-consent-changed'));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 300,
      background: 'var(--ink)', color: '#fff', padding: '16px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap',
      boxShadow: '0 -4px 16px rgba(0,0,0,0.15)',
    }}>
      <p style={{ fontSize: 13, margin: 0, maxWidth: 560, lineHeight: 1.5 }}>
        Usamos cookies essenciais para o site funcionar (sessão, preferências). Não usamos cookies de publicidade ou análise sem a sua autorização.{' '}
        <Link href="/cookies" style={{ color: 'var(--brass)', textDecoration: 'underline' }}>Saber mais</Link>
      </p>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={reject}
          className="btn"
          style={{ fontSize: 13, borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }}
        >
          Só essenciais
        </button>
        <button
          onClick={accept}
          className="btn btn-primary"
          style={{ fontSize: 13 }}
        >
          Aceitar tudo
        </button>
      </div>
    </div>
  );
}
