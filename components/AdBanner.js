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
    <a
      href={ad.link_url || '#'}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="card"
      style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none' }}
    >
      {ad.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ad.image_url} alt={ad.title} style={{ width: '100%', height: 170, objectFit: 'cover' }} />
      ) : (
        <div style={{
          height: 170, background: 'linear-gradient(135deg, var(--brass), #9C7A42)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5C4E2A', fontWeight: 600, padding: 16, textAlign: 'center',
        }}>
          {ad.title}
        </div>
      )}
      <div style={{ padding: '10px 14px' }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-soft)' }}>Publicidade</span>
        <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>{ad.title}</div>
      </div>
    </a>
  );
}
