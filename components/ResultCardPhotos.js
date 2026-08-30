'use client';

import { useState, useRef, useEffect } from 'react';

// Mostra as fotos de um imóvel dentro de um cartão de resultados.
// No computador, mantém o "mosaico" (foto grande + 2 pequenas) de sempre.
// No telemóvel, mostra uma foto de cada vez, com gesto de arrastar para
// mudar, e uma fila de números por baixo para saltar diretamente para
// uma foto específica — tal como já temos na ficha de cada imóvel.
//
// Importante: só desenha UMA das duas versões de cada vez (nunca as duas
// ao mesmo tempo, mesmo que uma fique escondida por CSS) — assim o
// telemóvel nunca chega a pedir as fotos extra do mosaico de computador,
// que nunca vai sequer mostrar.
export default function ResultCardPhotos({ photos, typology, district }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(null); // null = ainda não sabemos (primeira passagem, antes do browser estar disponível)
  const touchStartX = useRef(null);

  useEffect(() => {
    function checkSize() { setIsMobile(window.innerWidth <= 900); }
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const firstPhoto = photos[0]?.thumbnail_url || photos[0]?.url;

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0) setActiveIndex((i) => (i + 1) % photos.length);
      else setActiveIndex((i) => (i - 1 + photos.length) % photos.length);
    }
    touchStartX.current = null;
  }

  if (photos.length === 0) {
    return <div className="card-photo" style={{ height: 400 }} />;
  }

  // Enquanto ainda não sabemos o tamanho do ecrã (só acontece por um
  // instante, na primeira passagem), não desenha nenhuma das duas versões —
  // evita pedir fotos a mais por engano.
  if (isMobile === null) {
    return <div style={{ height: 400, background: 'var(--line)' }} />;
  }

  if (isMobile) {
    return (
      <div style={{ height: 400, position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[activeIndex].thumbnail_url || photos[activeIndex].url}
          alt={`Foto ${activeIndex + 1} de ${photos.length} do imóvel ${typology} em ${district}`}
          loading="lazy"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ width: '100%', height: '100%', objectFit: 'cover', touchAction: 'pan-y' }}
        />
        {photos.length > 1 && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', gap: 5,
              justifyContent: 'center', flexWrap: 'wrap', padding: '0 8px',
            }}
          >
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveIndex(i); }}
                aria-label={`Foto ${i + 1}`}
                style={{
                  width: 22, height: 22, borderRadius: '50%', fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
                  border: 'none', background: i === activeIndex ? '#fff' : 'rgba(255,255,255,0.35)',
                  color: i === activeIndex ? 'var(--ink)' : '#fff', flexShrink: 0,
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ height: 400, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {photos.length > 1 ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={firstPhoto} alt={`Foto principal do imóvel ${typology} em ${district}`} loading="lazy" style={{ width: '100%', flex: '1 1 0', minHeight: 0, objectFit: 'cover' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, height: 110, flexShrink: 0 }}>
            {[1, 2].map((offset) => {
              const photo = photos[offset % photos.length];
              const isLast = offset === 2;
              const remaining = photos.length - 3;
              return (
                <div key={offset} style={{ position: 'relative', overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.thumbnail_url || photo.url} alt={`Foto adicional do imóvel ${typology} em ${district}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {isLast && remaining > 0 && (
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600,
                    }}>
                      +{remaining}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={firstPhoto} alt={`Foto do imóvel ${typology} em ${district}`} loading="lazy" style={{ width: '100%', height: 400, objectFit: 'cover' }} />
      )}
    </div>
  );
}
