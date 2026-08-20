import './globals.css';
import { LanguageProvider } from '../lib/i18n';
import SupportAgentWidget from '../components/SupportAgentWidget';
import ImageProtection from '../components/ImageProtection';
import CookieConsent from '../components/CookieConsent';
import CompareBar from '../components/CompareBar';

export const metadata = {
  metadataBase: new URL('https://portalimobiliario.netlify.app'),
  title: { default: 'More·ada — Portal imobiliário Portugal', template: '%s' },
  description: 'Compre, arrende ou publique o seu imóvel diretamente em Portugal — sem intermediários obrigatórios. Milhares de imóveis, chat direto com anunciantes, simuladores de crédito e IMT.',
  openGraph: {
    siteName: 'More·ada',
    locale: 'pt_PT',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
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
        </LanguageProvider>
      </body>
    </html>
  );
}
