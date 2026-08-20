'use client';

import { useState, useRef, useEffect } from 'react';
import { distritos, concelhosPorDistrito, freguesiasPorConcelho } from '../lib/locations';

export default function LocationAutocomplete({ onChange, onLevels, placeholder = 'Distrito, concelho ou freguesia' }) {
  const [distrito, setDistrito] = useState(null);
  const [concelho, setConcelho] = useState(null);
  const [freguesia, setFreguesia] = useState(null);
  const [typed, setTyped] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function emitChange(d, c, f) {
    // O valor mais específico escolhido é o que usamos para pesquisar
    const value = f || c || d || '';
    onChange(value);
    if (onLevels) onLevels({ distrito: d, concelho: c, freguesia: f });
  }

  function currentList() {
    if (!distrito) return distritos;
    if (!concelho) return concelhosPorDistrito[distrito] || [];
    if (!freguesia) return freguesiasPorConcelho[concelho] || [];
    return [];
  }

  const suggestions = currentList().filter((item) =>
    typed === '' || item.toLowerCase().includes(typed.toLowerCase())
  );

  function handleSelect(item) {
    if (!distrito) {
      setDistrito(item);
      emitChange(item, null, null);
    } else if (!concelho) {
      setConcelho(item);
      emitChange(distrito, item, null);
    } else if (!freguesia) {
      setFreguesia(item);
      emitChange(distrito, concelho, item);
    }
    setTyped('');
    setOpen(true); // fica aberto para o próximo nível, se houver
  }

  function removeChip(level) {
    if (level === 'distrito') {
      setDistrito(null); setConcelho(null); setFreguesia(null);
      emitChange(null, null, null);
    } else if (level === 'concelho') {
      setConcelho(null); setFreguesia(null);
      emitChange(distrito, null, null);
    } else if (level === 'freguesia') {
      setFreguesia(null);
      emitChange(distrito, concelho, null);
    }
    setTyped('');
  }

  const noMoreLevels = distrito && concelho && (freguesia || !(freguesiasPorConcelho[concelho]?.length));

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
        border: '1px solid var(--line)', borderRadius: 5, padding: '6px 10px', background: 'var(--paper)',
        width: '100%', maxWidth: '100%', boxSizing: 'border-box',
      }}>
        {distrito && (
          <span onClick={() => removeChip('distrito')} style={chipStyle}>{distrito} ✕</span>
        )}
        {concelho && (
          <span onClick={() => removeChip('concelho')} style={chipStyle}>{concelho} ✕</span>
        )}
        {freguesia && (
          <span onClick={() => removeChip('freguesia')} style={chipStyle}>{freguesia} ✕</span>
        )}
        {!noMoreLevels && (
          <input
            type="text"
            value={typed}
            onChange={(e) => { setTyped(e.target.value); setOpen(true); onChange(e.target.value); }}
            onFocus={() => setOpen(true)}
            placeholder={distrito ? '' : placeholder}
            style={{ flex: 1, minWidth: 60, border: 'none', outline: 'none', padding: '8px 2px', fontSize: 16.5, boxSizing: 'border-box', maxWidth: '100%' }}
          />
        )}
        {!noMoreLevels && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-soft)',
              padding: '4px 2px', display: 'flex', alignItems: 'center', flexShrink: 0,
            }}
            aria-label="Mostrar todas as opções"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 20,
          background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 6,
          boxShadow: '0 6px 18px rgba(51,46,34,0.14)', maxHeight: 220, overflowY: 'auto',
        }}>
          {suggestions.map((item) => (
            <div
              key={item}
              onClick={() => handleSelect(item)}
              style={{ padding: '9px 14px', fontSize: 13.5, cursor: 'pointer' }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {item}
            </div>
          ))}
        </div>
      )}

      {open && typed !== '' && suggestions.length === 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 20,
          background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 6,
          boxShadow: '0 6px 18px rgba(51,46,34,0.14)', padding: '10px 14px',
        }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>
            Não encontrada na lista — escreve aqui, a pesquisa vai usar exatamente o que escreveres.
          </span>
        </div>
      )}
    </div>
  );
}

const chipStyle = {
  fontSize: 12.5, fontWeight: 500, background: 'var(--plaster)', borderRadius: 12,
  padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
};
