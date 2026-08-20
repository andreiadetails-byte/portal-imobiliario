import Link from 'next/link';
import Header from '../components/Header';

export const metadata = {
  title: 'Página não encontrada',
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main-content" className="wrap" style={{ maxWidth: 560, padding: '80px 32px', textAlign: 'center' }}>
        <div className="display" style={{ fontSize: 72, fontWeight: 600, color: 'var(--azulejo)', marginBottom: 8 }}>404</div>
        <h1 className="display" style={{ fontSize: 24, marginBottom: 12 }}>Esta página não existe</h1>
        <p style={{ fontSize: 14.5, color: 'var(--text-soft)', marginBottom: 28 }}>
          O link pode estar errado, ou o anúncio que procura já não está disponível.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-primary">Ir para a página inicial</Link>
          <Link href="/results" className="btn">Ver imóveis</Link>
        </div>
      </main>
    </>
  );
}
