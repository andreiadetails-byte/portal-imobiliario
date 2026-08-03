import './globals.css';

export const metadata = {
  title: 'Morada — Portal imobiliário',
  description: 'Compre, arrende ou publique o seu imóvel diretamente.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}
