'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AdBanner() {
  const [ads, setAds] = useState([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    supabase.from('ads').select('*').eq('active', true).then(({ data }) => {
      if (data && data.length > 0) {
        setIndex(Math.floor(Math.random() * data.length));
        setAds(data);
      }
    });
  }, []);

  useEffect(() => {
    if (ads.length < 2) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % ads.length);
        setVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(timer);
  }, [ads]);

  if (ads.length === 0) return null;
  const ad = ads[index];

  return (
    <a
      href={ad.link_url || '#'}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="card"
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: 10, textDecoration: 'none',
        opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease',
      }}
    >
      {ad.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ad.image_url} alt={ad.title} style={{ width: 130, height: 90, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />
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
