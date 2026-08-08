'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AdBanner() {
  const [ad, setAd] = useState(null);

  useEffect(() => {
    supabase.from('ads').select('*').eq('active', true).then(({ data }) => {
      if (data && data.length > 0) {
        setAd(data[Math.floor(Math.random() * data.length)]);
      }
    });
  }, []);

  if (!ad) return null;

  return (
    <div style={{ overflow: 'hidden', position: 'relative', height: 110 }}>
      <div
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          display: 'flex', alignItems: 'center',
          animation: 'ad-slide-once 8s linear infinite',
        }}
      >
        <a
          href={ad.link_url || '#'}
          target="_blank"
          rel="noopener noreferrer sponsored"
          style={{ display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {ad.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ad.image_url} alt={ad.title} style={{ height: 96, maxWidth: 200, objectFit: 'contain', flexShrink: 0 }} />
          ) : null}
          <div>
            <span style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-soft)' }}>Publicidade</span>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{ad.title}</div>
          </div>
        </a>
      </div>
    </div>
  );
}
