'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from '../lib/i18n';

// Botão de "voltar" reutilizável — necessário porque, em modo app instalada
// (PWA), não existe a seta de voltar do browser.
export default function BackButton({ fallback = '/' }) {
  const router = useRouter();
  const { t } = useLanguage();

  function handleBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push(fallback);
  }

  return (
    <button
      onClick={handleBack}
      className="btn"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, marginBottom: 20, padding: '9px 16px' }}
    >
      {t('back_to_previous_page')}
    </button>
  );
}
