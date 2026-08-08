'use client';

function PromoItem() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0, padding: '0 60px',
    }}>
      <div className="logo" style={{ fontSize: 32, color: '#fff' }}>more<span style={{ color: 'var(--brass)' }}>&middot;</span>ada</div>
      <div>
        <div className="display" style={{ fontSize: 20, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>Nunca foi tão fácil vender e comprar</div>
        <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>O melhor portal para si</div>
      </div>
    </div>
  );
}

export default function BigPromoBanner() {
  return (
    <div style={{
      height: 130, borderRadius: 10, overflow: 'hidden',
      background: 'linear-gradient(135deg, var(--telha) 0%, #3E4A32 100%)',
      display: 'flex', alignItems: 'center',
    }}>
      <div style={{ display: 'flex', width: 'max-content', animation: 'promo-scroll 14s linear infinite' }}>
        <PromoItem />
        <PromoItem />
        <PromoItem />
        <PromoItem />
      </div>
    </div>
  );
}
