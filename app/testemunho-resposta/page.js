'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../../components/Header';

function Content() {
  const params = useSearchParams();
  const estado = params.get('estado');

  let title = 'Obrigado!';
  let text = '';

  if (estado === 'sim') {
    title = 'Obrigado pela confiança! 💚';
    text = 'A sua opinião vai ajudar mais pessoas a conhecerem o More·ada. Muito obrigado.';
  } else if (estado === 'nao') {
    title = 'Sem problema!';
    text = 'Não vamos publicar a sua mensagem. Continuamos gratos pelo seu feedback.';
  } else {
    title = 'Este link já não é válido';
    text = 'Pode já ter sido usado antes, ou o link não está correto.';
  }

  return (
    <main id="main-content" className="wrap" style={{ maxWidth: 480, padding: '80px 32px', textAlign: 'center' }}>
      <h1 className="display" style={{ fontSize: 24, marginBottom: 12 }}>{title}</h1>
      <p style={{ fontSize: 14.5, color: 'var(--text-soft)' }}>{text}</p>
    </main>
  );
}

export default function TestemunhoRespostaPage() {
  return (
    <>
      <Header />
      <Suspense fallback={null}>
        <Content />
      </Suspense>
    </>
  );
}
