'use client';

import { useRef, useState } from 'react';

// Permite escolher qual a parte mais importante de uma imagem, clicando
// dentro de uma pré-visualização. Guarda a posição como percentagens
// (ex: "30% 70%"), usadas depois em object-position no CSS.
export default function ImagePositionPicker({ imageUrl, value, onChange }) {
  const boxRef = useRef(null);
  const [marker, setMarker] = useState(null); // posição visual imediata, para feedback instantâneo

  function parsePosition(pos) {
    if (!pos) return [50, 50];
    if (typeof pos === 'string' && pos.includes('%')) {
      const parts = pos.split(' ').map((p) => parseFloat(p));
      if (parts.length === 2 && !parts.some(Number.isNaN)) return parts;
    }
    const map = {
      top: [50, 0], bottom: [50, 100], left: [0, 50], right: [100, 50], center: [50, 50],
      'top left': [0, 0], 'top right': [100, 0], 'bottom left': [0, 100], 'bottom right': [100, 100],
    };
    return map[pos] || [50, 50];
  }

  const [x, y] = marker || parsePosition(value);

  function handleClick(e) {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    let px = ((e.clientX - rect.left) / rect.width) * 100;
    let py = ((e.clientY - rect.top) / rect.height) * 100;
    px = Math.max(0, Math.min(100, px));
    py = Math.max(0, Math.min(100, py));
    setMarker([px, py]);
    onChange(`${px.toFixed(0)}% ${py.toFixed(0)}%`);
  }

  if (!imageUrl) return null;

  return (
    <div>
      <div
        ref={boxRef}
        onClick={handleClick}
        style={{
          position: 'relative', width: 220, maxWidth: '100%', height: 150, borderRadius: 8, overflow: 'visible',
          cursor: 'crosshair', userSelect: 'none',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, borderRadius: 8, overflow: 'hidden', border: '1.5px solid var(--line)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${x}% ${y}%`, display: 'block', pointerEvents: 'none' }} />
        </div>
        <div
          style={{
            position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)',
            width: 24, height: 24, borderRadius: '50%', border: '3px solid #fff',
            background: 'rgba(90,107,62,0.85)', boxShadow: '0 0 0 1.5px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.4)',
            pointerEvents: 'none', zIndex: 2,
          }}
        />
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 6, maxWidth: 220 }}>
        Clica dentro da imagem para escolher a parte mais importante a mostrar.
      </p>
    </div>
  );
}
