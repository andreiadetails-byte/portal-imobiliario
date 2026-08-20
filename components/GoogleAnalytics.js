'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

const STORAGE_KEY = 'morada_cookie_consent';
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Só carrega o Google Analytics depois de a pessoa aceitar os cookies (não
// essenciais) — nunca antes, e nunca se rejeitar. Fica sempre a "ouvir" se a
// escolha mudar, para começar a carregar assim que aceitar, sem precisar de
// atualizar a página.
export default function GoogleAnalytics() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    function checkConsent() {
      setConsented(localStorage.getItem(STORAGE_KEY) === 'accepted');
    }
    checkConsent();
    window.addEventListener('morada-cookie-consent-changed', checkConsent);
    return () => window.removeEventListener('morada-cookie-consent-changed', checkConsent);
  }, []);

  if (!GA_ID || !consented) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
