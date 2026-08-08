'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function AdItem({ ad }) {
  return (
    <a
      href={ad.link_url || '#'}
      target="_blank"
      rel="noopener noreferrer sponsored"
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', textDecoration: 'none',
        flexShrink: 0, minWidth: 260,
      }}
    >
      {ad.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ad.image_url}
          alt={ad.title}
          style={{ width: 130, height: 90, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 130, height: 90, borderRadius: 6, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--brass), #9C7A42)',
        }} />
      )}
      <div style={{ minWidth: 0 }}>
        <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-soft)' }}>Publicidade</span>
        <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 1 }}>{ad.title}</div>
      </div>
    </a>
  );
}

export default function AdBanner() {
  const [ads, setAds] = useState([]);

  useEffect(() => {
    supabase.from('ads').select('*').eq('active', true).then(({ data }) => {
      setAds(data || []);
    });
  }, []);

  if (ads.length === 0) return null;

  // Repete a lista para o movimento parecer contínuo, sem cortes visíveis.
  const track = [...ads, ...ads, ...ads];

  return (
    <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
      <div
        style={{
          display: 'flex',
          width: 'max-content',
          animation: `ad-scroll ${ads.length * 6}s linear infinite`,
        }}
      >
        {track.map((ad, i) => <AdItem key={`${ad.id}-${i}`} ad={ad} />)}
      </div>
    </div>
  );
}
