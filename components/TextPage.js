'use client';

import { useRouter } from 'next/navigation';
import Header from './Header';
import { useLanguage } from '../lib/i18n';

export default function TextPage({ title, children }) {
  const router = useRouter();
  const { t } = useLanguage();

  function handleBack() {
    // Em modo app instalada (PWA), não há seta de "voltar" do browser —
    // por isso precisamos de um botão próprio. Usa o histórico se houver
    // (para voltar exatamente onde a pessoa estava), ou vai à página inicial
    // se tiver chegado aqui diretamente (ex: por um link partilhado).
    if (window.history.length > 1) router.back();
    else router.push('/');
  }

  return (
    <>
      <Header />
      <main id="main-content" className="wrap" style={{ maxWidth: 720, padding: '48px 32px 80px' }}>
        <button
          onClick={handleBack}
          className="btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, marginBottom: 20, padding: '9px 16px' }}
        >
          {t('back_to_previous_page')}
        </button>
        <h1 className="display" style={{ fontSize: 30, marginBottom: 24 }}>{title}</h1>
        <div style={{ fontSize: 14.5, color: 'var(--text-soft)', lineHeight: 1.7 }}>
          {children}
        </div>
      </main>
    </>
  );
}
