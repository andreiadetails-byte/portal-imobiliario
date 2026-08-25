import './globals.css';
import { LanguageProvider } from '../lib/i18n';
import SupportAgentWidget from '../components/SupportAgentWidget';
import ImageProtection from '../components/ImageProtection';
import CookieConsent from '../components/CookieConsent';
import CompareBar from '../components/CompareBar';
import GoogleAnalytics from '../components/GoogleAnalytics';
import InstallPrompt from '../components/InstallPrompt';
import Script from 'next/script';

export const metadata = {
  metadataBase: new URL('https://portalimobiliario.netlify.app'),
  title: { default: 'More·ada — Portal imobiliário Portugal', template: '%s' },
  description: 'Compre, arrende ou publique o seu imóvel diretamente em Portugal — sem intermediários obrigatórios. Milhares de imóveis, chat direto com anunciantes, simuladores de crédito e IMT.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'More·ada',
  },
  openGraph: {
    siteName: 'More·ada',
    locale: 'pt_PT',
    type: 'website',
    images: [{ url: '/hero.jpg', width: 1200, height: 630, alt: 'More·ada — Portal imobiliário Portugal' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'More·ada — Portal imobiliário Portugal',
    description: 'Compre, arrende ou publique o seu imóvel diretamente em Portugal — sem intermediários obrigatórios.',
    images: ['/hero.jpg'],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#5A6B49',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-PT">
      <body>
        <a href="#main-content" className="skip-link">Saltar para o conteúdo</a>
        <LanguageProvider>
          {children}
          <SupportAgentWidget />
          <ImageProtection />
          <CookieConsent />
          <CompareBar />
          <GoogleAnalytics />
          <InstallPrompt />
        </LanguageProvider>
        {/* TEMPORÁRIO — ferramenta de depuração visível no ecrã, para apanhar
            o motivo do problema de layout no telemóvel. Remover depois de resolvido. */}
        <Script src="https://cdn.jsdelivr.net/npm/eruda" strategy="afterInteractive" />
        <Script id="eruda-init" strategy="afterInteractive">
          {`if (typeof eruda !== 'undefined') eruda.init();`}
        </Script>
      </body>
    </html>
  );
}
