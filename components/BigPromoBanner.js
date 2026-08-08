'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const SELF_PROMO = {
  isSelfPromo: true,
  title: 'Nunca foi tão fácil vender e comprar',
  subtitle: 'O melhor portal para si',
};

export default function BigPromoBanner() {
  const [slides, setSlides] = useState([SELF_PROMO]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    supabase.from('ads').select('*').eq('active', true).then(({ data }) => {
      if (data && data.length > 0) setSlides([SELF_PROMO, ...data]);
    });
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % slides.length);
        setVisible(true);
      }, 400);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides]);

  const slide = slides[index];

  const content = slide.isSelfPromo ? (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, flexWrap: 'wrap',
      height: '100%', textAlign: 'center', padding: '0 24px',
    }}>
      <div className="logo" style={{ fontSize: 36, color: '#fff' }}>more<span style={{ color: 'var(--brass)' }}>&middot;</span>ada</div>
      <div>
        <div className="display" style={{ fontSize: 22, color: '#fff', fontWeight: 600 }}>{slide.title}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{slide.subtitle}</div>
      </div>
    </div>
  ) : (
    <a
      href={slide.link_url || '#'}
      target="_blank"
      rel="noopener noreferrer sponsored"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, height: '100%',
        textDecoration: 'none', padding: '0 24px',
      }}
    >
      {slide.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slide.image_url} alt={slide.title} style={{ maxHeight: 70, maxWidth: 160, objectFit: 'contain' }} />
      )}
      <div>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.6)' }}>Publicidade</span>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>{slide.title}</div>
      </div>
    </a>
  );

  return (
    <div style={{
      height: 130, borderRadius: 10, overflow: 'hidden',
      background: 'linear-gradient(135deg, var(--telha) 0%, #3E4A32 100%)',
      opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease',
    }}>
      {content}
    </div>
  );
}
