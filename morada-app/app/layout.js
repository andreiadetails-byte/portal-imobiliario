import './globals.css';
import { LanguageProvider } from '../lib/i18n';

export const metadata = {
  title: 'Morada — Portal imobiliário',
  description: 'Compre, arrende ou publique o seu imóvel diretamente.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-PT">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
