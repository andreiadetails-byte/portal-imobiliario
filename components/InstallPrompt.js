'use client';

import { useEffect, useState } from 'react';

// Mostra um pequeno aviso a sugerir instalar o site como app, quando o
// telemóvel (normalmente Android/Chrome) permite isso. No iPhone, o Safari
// não dá este aviso automático — lá, a pessoa tem de usar "Partilhar" →
// "Adicionar ao ecrã principal" à mão, não há forma de evitar isso.
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const alreadyDismissed = localStorage.getItem('morada_install_dismissed');
    if (alreadyDismissed) { setDismissed(true); }

    // O Chrome só considera o site "instalável" se houver um service worker
    // registado — sem isto, o aviso de instalação nunca aparece sozinho.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Se falhar, não faz mal — o site continua a funcionar normalmente,
        // só não vai mostrar o aviso automático de instalação.
      });
    }

    function handler(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  }

  function dismiss() {
    localStorage.setItem('morada_install_dismissed', '1');
    setVisible(false);
  }

  if (!visible || dismissed) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 74, left: 16, right: 16, zIndex: 240,
      background: 'var(--ink)', color: '#fff', borderRadius: 10, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
      maxWidth: 420, margin: '0 auto',
    }}>
      <span style={{ fontSize: 13.5, flex: 1 }}>Instala o More·ada no teu telemóvel, para acesso rápido.</span>
      <button onClick={install} className="btn btn-primary" style={{ fontSize: 12.5, padding: '7px 14px', flexShrink: 0 }}>
        Instalar
      </button>
      <button onClick={dismiss} aria-label="Fechar" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>
        ✕
      </button>
    </div>
  );
}
