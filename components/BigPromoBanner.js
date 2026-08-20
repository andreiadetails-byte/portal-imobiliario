'use client';

import { useLanguage } from '../lib/i18n';

function PromoItem({ title, sub }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0, padding: '0 60px',
    }}>
      <div className="logo" style={{ fontSize: 32, color: '#fff' }}>More<span style={{ color: 'var(--brass)' }}>&middot;</span>ada</div>
      <div>
        <div className="display" style={{ fontSize: 20, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{sub}</div>
      </div>
    </div>
  );
}

export default function BigPromoBanner() {
  const { t } = useLanguage();
  const title = t('home_promo_title');
  const sub = t('home_promo_sub');

  return (
    <div style={{
      height: 130, borderRadius: 10, overflow: 'hidden',
      background: 'linear-gradient(135deg, var(--telha) 0%, #3E4A32 100%)',
      display: 'flex', alignItems: 'center',
    }}>
      <div style={{ display: 'flex', width: 'max-content', animation: 'promo-scroll 14s linear infinite' }}>
        <PromoItem title={title} sub={sub} />
        <PromoItem title={title} sub={sub} />
        <PromoItem title={title} sub={sub} />
        <PromoItem title={title} sub={sub} />
      </div>
    </div>
  );
}
