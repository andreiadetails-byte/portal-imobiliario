'use client';

import { useRouter } from 'next/navigation';
import { useCompareCount } from '../lib/useCompareList';

export default function CompareBar() {
  const router = useRouter();
  const count = useCompareCount();

  if (count === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 250,
      background: 'var(--ink)', color: '#fff', padding: '14px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap',
      boxShadow: '0 -4px 16px rgba(0,0,0,0.18)',
    }}>
      <span style={{ fontSize: 13.5 }}>
        {count === 1 ? '1 imóvel selecionado' : `${count} imóveis selecionados`} para comparar
      </span>
      <button
        onClick={() => router.push('/comparar')}
        disabled={count < 2}
        className="btn btn-primary"
        style={{ fontSize: 13, opacity: count < 2 ? 0.5 : 1, cursor: count < 2 ? 'not-allowed' : 'pointer' }}
      >
        {count < 2 ? 'Escolha mais 1 para comparar' : 'Comparar agora →'}
      </button>
    </div>
  );
}
