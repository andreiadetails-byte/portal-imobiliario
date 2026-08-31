'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { distritos, concelhosPorDistrito, freguesiasPorConcelho } from '../lib/locations';

// Remove acentos e pequenas palavras de ligação ("de", "da", "do", "dos", "das", "e"),
// para que escrever "vila nova gaia" encontre "Vila Nova de Gaia" sem precisar de
// escrever a palavra "de".
const STOPWORDS = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
function normalize(text) {
  return text
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word && !STOPWORDS.has(word))
    .join(' ');
}
function matchesQuery(label, query) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;
  return normalize(label).includes(normalizedQuery);
}

export default function LocationAutocomplete({ onChange, onLevels, placeholder = 'Distrito, concelho ou freguesia', initialValue = '' }) {
  const [distrito, setDistrito] = useState(null);
  const [concelho, setConcelho] = useState(null);
  const [freguesia, setFreguesia] = useState(null);
  const [typed, setTyped] = useState(initialValue || '');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Se chegarmos a esta página já com uma localização escolhida (ex: vindos
  // da pesquisa da página inicial), mostra-a logo na caixa — sem isto, a
  // caixa aparecia vazia mesmo que a pesquisa já estivesse a ser aplicada,
  // o que confundia (parecia que a localização "não tinha pegado").
  useEffect(() => {
    if (initialValue) setTyped(initialValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function emitChange(d, c, f) {
    const value = f || c || d || '';
    onChange(value);
    if (onLevels) onLevels({ distrito: d, concelho: c, freguesia: f });
  }

  // Índice com TODOS os locais (distritos + concelhos + freguesias), para se poder
  // escrever diretamente "Vila Nova de Gaia" ou uma freguesia, sem escolher primeiro
  // o distrito. Cada entrada já sabe a que distrito/concelho pertence.
  const allLocations = useMemo(() => {
    const list = [];
    distritos.forEach((d) => {
      list.push({ label: d, level: 'distrito', distrito: d, concelho: null, freguesia: null });
      (concelhosPorDistrito[d] || []).forEach((c) => {
        list.push({ label: c, level: 'concelho', distrito: d, concelho: c, freguesia: null });
        (freguesiasPorConcelho[c] || []).forEach((f) => {
          list.push({ label: f, level: 'freguesia', distrito: d, concelho: c, freguesia: f });
        });
      });
    });
    return list;
  }, []);

  function currentList() {
    if (!distrito) return allLocations;
    if (!concelho) return (concelhosPorDistrito[distrito] || []).map((c) => ({ label: c, level: 'concelho' }));
    if (!freguesia) return (freguesiasPorConcelho[concelho] || []).map((f) => ({ label: f, level: 'freguesia' }));
    return [];
  }

  const LEVEL_ORDER = { distrito: 0, concelho: 1, freguesia: 2 };
  const suggestions = currentList()
    .filter((item) => matchesQuery(item.label, typed))
    .sort((a, b) => (LEVEL_ORDER[a.level] ?? 3) - (LEVEL_ORDER[b.level] ?? 3))
    .slice(0, 40);

  function handleSelect(item) {
    if (!distrito) {
      setDistrito(item.distrito || item.label);
      setConcelho(item.concelho || null);
      setFreguesia(item.freguesia || null);
      emitChange(item.distrito || item.label, item.concelho || null, item.freguesia || null);
      if (item.level !== 'distrito') { setTyped(''); setOpen(false); return; }
    } else if (!concelho) {
      setConcelho(item.label);
      emitChange(distrito, item.label, null);
    } else if (!freguesia) {
      setFreguesia(item.label);
      emitChange(distrito, concelho, item.label);
    }
    setTyped('');
    setOpen(true);
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
          boxShadow: '0 6px 18px rgba(51,46,34,0.14)', maxHeight: 260, overflowY: 'auto',
        }}>
          {suggestions.map((item, i) => (
            <div
              key={`${item.label}-${i}`}
              onClick={() => handleSelect(item)}
              style={{ padding: '9px 14px', fontSize: 13.5, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8 }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <span>{item.label}</span>
              {!distrito && (
                <span style={{ fontSize: 10.5, color: 'var(--text-soft)', flexShrink: 0 }}>
                  {item.level === 'distrito'
                    ? '(distrito)'
                    : item.level === 'concelho'
                      ? `(concelho, ${item.distrito})`
                      : `(freguesia, ${item.concelho})`}
                </span>
              )}
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
