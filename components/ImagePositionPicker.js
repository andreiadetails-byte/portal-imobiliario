'use client';

import { useRef, useState, useEffect } from 'react';

// Permite escolher qual a parte mais importante de uma imagem, clicando ou
// arrastando dentro de uma pré-visualização. Guarda a posição como
// percentagens (ex: "30% 70%"), usadas depois em object-position no CSS.
// A pré-visualização usa a mesma proporção (220x150) dos cartões no site,
// para o que se escolhe aqui corresponder ao que se vê depois.
export default function ImagePositionPicker({ imageUrl, value, onChange }) {
  const boxRef = useRef(null);
  const [dragging, setDragging] = useState(false);

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

  const [x, y] = parsePosition(value);

  function positionFromPoint(clientX, clientY) {
    const box = boxRef.current;
    if (!box) return null;
    const rect = box.getBoundingClientRect();
    let px = ((clientX - rect.left) / rect.width) * 100;
    let py = ((clientY - rect.top) / rect.height) * 100;
    px = Math.max(0, Math.min(100, px));
    py = Math.max(0, Math.min(100, py));
    return `${px.toFixed(0)}% ${py.toFixed(0)}%`;
  }

  function handlePointerDown(e) {
    e.preventDefault();
    setDragging(true);
    const pos = positionFromPoint(e.clientX, e.clientY);
    if (pos) onChange(pos);
  }

  // Usa listeners no window durante o arrastar, para continuar a funcionar
  // mesmo que o rato saia da caixa por um instante — mais fiável.
  useEffect(() => {
    if (!dragging) return undefined;

    function handleMove(e) {
      const pos = positionFromPoint(e.clientX, e.clientY);
      if (pos) onChange(pos);
    }
    function handleUp() {
      setDragging(false);
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, onChange]);

  if (!imageUrl) return null;

  return (
    <div>
      <div
        ref={boxRef}
        onPointerDown={handlePointerDown}
        style={{
          position: 'relative', width: 220, maxWidth: '100%', height: 150, borderRadius: 8, overflow: 'hidden',
          cursor: dragging ? 'grabbing' : 'crosshair', border: '1.5px solid var(--line)', userSelect: 'none', touchAction: 'none',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
        <div
          style={{
            position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)',
            width: 24, height: 24, borderRadius: '50%', border: '3px solid #fff',
            background: 'rgba(90,107,62,0.85)', boxShadow: '0 0 0 1.5px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
          }}
        />
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 6, maxWidth: 220 }}>
        Clica ou arrasta dentro da imagem para escolher a parte mais importante a mostrar.
      </p>
    </div>
  );
}
