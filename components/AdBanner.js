'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Anúncio "vitrine" próprio — aparece misturado com os anúncios reais, para
// nunca deixar o espaço vazio, e também serve de convite a quem queira
// anunciar aqui.
const HOUSE_AD = {
  id: 'house-ad',
  title: 'Este espaço publicitário pode ser seu',
  link_url: '/contacto',
  image_url: null,
  isHouseAd: true,
};

export default function AdBanner({ animated = true }) {
  const [ad, setAd] = useState(null);

  useEffect(() => {
    supabase.from('ads').select('*').eq('active', true).then(({ data }) => {
      // O anúncio "vitrine" entra sempre no sorteio, junto dos reais — assim,
      // de vez em quando aparece mesmo havendo publicidade paga ativa.
      const pool = [...(data || []), HOUSE_AD];
      setAd(pool[Math.floor(Math.random() * pool.length)]);
    });
  }, []);

  if (!ad) return null;

  return (
    <div style={{ overflow: 'hidden', position: 'relative', height: 150 }}>
      <div
        style={{
          position: animated ? 'absolute' : 'relative',
          top: 0, left: 0, width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: animated ? 'flex-start' : 'center',
          animation: animated ? 'ad-slide-once 16s linear infinite' : 'none',
        }}
      >
        <a
          href={ad.link_url || '#'}
          target={ad.isHouseAd ? '_self' : '_blank'}
          rel="noopener noreferrer sponsored"
          style={{ display: 'flex', alignItems: 'center', gap: 20, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {ad.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ad.image_url} alt={ad.title} style={{ height: 130, maxWidth: 270, objectFit: 'contain', flexShrink: 0 }} />
          ) : ad.isHouseAd ? (
            <div style={{
              height: 130, width: 130, borderRadius: 10, flexShrink: 0, border: '2px dashed var(--line)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, color: 'var(--text-soft)',
            }}>
              📢
            </div>
          ) : null}
          <div>
            <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-soft)' }}>
              {ad.isHouseAd ? 'Anuncie aqui' : 'Publicidade'}
            </span>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{ad.title}</div>
            {ad.isHouseAd && (
              <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 2 }}>Fale connosco para colocar aqui o seu anúncio →</div>
            )}
          </div>
        </a>
      </div>
    </div>
  );
}
