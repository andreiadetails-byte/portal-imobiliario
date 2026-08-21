'use client';

import { useRouter } from 'next/navigation';
import { useCompareList } from '../lib/useCompareList';

export default function CompareBar() {
  const router = useRouter();
  const { ids, clear } = useCompareList();
  const count = ids.length;

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
      <button
        onClick={clear}
        aria-label="Cancelar comparação"
        title="Cancelar comparação"
        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, opacity: 0.8, padding: 4 }}
      >
        ✕
      </button>
    </div>
  );
}
