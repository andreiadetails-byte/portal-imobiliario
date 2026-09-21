import './globals.css';
import { Suspense } from 'react';
import { LanguageProvider } from '../lib/i18n';
import SupportAgentWidget from '../components/SupportAgentWidget';
import ImageProtection from '../components/ImageProtection';
import CookieConsent from '../components/CookieConsent';
import CompareBar from '../components/CompareBar';
import GoogleAnalytics from '../components/GoogleAnalytics';
import InstallPrompt from '../components/InstallPrompt';
import ScrollToTop from '../components/ScrollToTop';

export const metadata = {
  metadataBase: new URL('https://moreada.pt'),
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
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: 'More·ada',
    url: 'https://moreada.pt',
    logo: 'https://moreada.pt/icon-512.png',
    description: 'Portal imobiliário em Portugal — compre, arrende ou publique o seu imóvel diretamente, sem intermediários obrigatórios.',
    areaServed: { '@type': 'Country', name: 'Portugal' },
  };

  return (
    <html lang="pt-PT">
      <head>
        <script
          type="application/ld+json"
          // Escapa "<" para impedir que alguém consiga fechar esta tag
          // <script> à força, injetando código — mesma proteção já usada
          // nos dados estruturados de cada imóvel.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, '\\u003c') }}
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Saltar para o conteúdo</a>
        <LanguageProvider>
          <Suspense fallback={null}><ScrollToTop /></Suspense>
          {children}
          <SupportAgentWidget />
          <ImageProtection />
          <CookieConsent />
          <CompareBar />
          <GoogleAnalytics />
          <InstallPrompt />
        </LanguageProvider>
      </body>
    </html>
  );
}
