'use client';

import { useRef, useState, useCallback } from 'react';

// Permite escolher qual a parte mais importante de uma imagem, clicando ou
// arrastando dentro de uma pré-visualização. Guarda a posição como
// percentagens (ex: "30% 70%"), usadas depois em object-position no CSS.
export default function ImagePositionPicker({ imageUrl, value, onChange }) {
  const boxRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  // Extrai as percentagens do valor guardado (ex: "30% 70%" -> [30, 70]).
  // Aceita também valores antigos tipo "top", "center", "bottom left", etc.
  function parsePosition(pos) {
    if (!pos) return [50, 50];
    if (pos.includes('%')) {
      const parts = pos.split(' ').map((p) => parseFloat(p));
      if (parts.length === 2 && !parts.some(Number.isNaN)) return parts;
    }
    const map = {
      top: [50, 0], bottom: [50, 100], left: [0, 50], right: [100, 50], center: [50, 50],
      'top left': [0, 0], 'top right': [100, 0], 'bottom left': [0, 100], 'bottom right': [100, 100],
    };
    return map[pos] || [50, 50];
  }

  const [x, y] = parsePosition(value);

  const updateFromEvent = useCallback((clientX, clientY) => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    let px = ((clientX - rect.left) / rect.width) * 100;
    let py = ((clientY - rect.top) / rect.height) * 100;
    px = Math.max(0, Math.min(100, px));
    py = Math.max(0, Math.min(100, py));
    onChange(`${px.toFixed(0)}% ${py.toFixed(0)}%`);
  }, [onChange]);

  function handleDown(e) {
    setDragging(true);
    const point = e.touches ? e.touches[0] : e;
    updateFromEvent(point.clientX, point.clientY);
  }

  function handleMove(e) {
    if (!dragging) return;
    const point = e.touches ? e.touches[0] : e;
    updateFromEvent(point.clientX, point.clientY);
  }

  function handleUp() {
    setDragging(false);
  }

  if (!imageUrl) return null;

  return (
    <div>
      <div
        ref={boxRef}
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={handleUp}
        onMouseLeave={handleUp}
        onTouchStart={handleDown}
        onTouchMove={handleMove}
        onTouchEnd={handleUp}
        style={{
          position: 'relative', width: '100%', height: 180, borderRadius: 8, overflow: 'hidden',
          cursor: dragging ? 'grabbing' : 'crosshair', border: '1.5px solid var(--line)', userSelect: 'none', touchAction: 'none',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
        <div
          style={{
            position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)',
            width: 26, height: 26, borderRadius: '50%', border: '3px solid #fff',
            background: 'rgba(90,107,62,0.85)', boxShadow: '0 0 0 1.5px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
          }}
        />
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 6 }}>
        Clica ou arrasta dentro da imagem para escolher a parte mais importante a mostrar.
      </p>
    </div>
  );
}
