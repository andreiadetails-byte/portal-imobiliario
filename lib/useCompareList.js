'use client';

import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'morada_compare_ids';
const MAX_COMPARE = 3;

// Guarda a lista de imóveis marcados para comparar no próprio browser da pessoa
// (não precisa de conta nem de gravar na base de dados — é só uma seleção temporária).
export function useCompareList() {
  const [ids, setIds] = useState([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setIds(Array.isArray(saved) ? saved : []);
    } catch {
      setIds([]);
    }
  }, []);

  const persist = useCallback((next) => {
    setIds(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('morada-compare-updated'));
  }, []);

  const toggle = useCallback((id) => {
    setIds((cur) => {
      const isIn = cur.includes(id);
      let next;
      if (isIn) {
        next = cur.filter((x) => x !== id);
      } else {
        if (cur.length >= MAX_COMPARE) {
          alert(`Só pode comparar até ${MAX_COMPARE} imóveis de cada vez. Remova um antes de adicionar outro.`);
          return cur;
        }
        next = [...cur, id];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event('morada-compare-updated'));
      return next;
    });
  }, []);

  const clear = useCallback(() => persist([]), [persist]);

  return { ids, toggle, clear, max: MAX_COMPARE };
}

// Versão só de leitura, para componentes que só precisam de saber o estado atual
// (ex: a barra flutuante), sem duplicar a lógica de alternar.
export function useCompareCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function read() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        setCount(Array.isArray(saved) ? saved.length : 0);
      } catch {
        setCount(0);
      }
    }
    read();
    window.addEventListener('morada-compare-updated', read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener('morada-compare-updated', read);
      window.removeEventListener('storage', read);
    };
  }, []);

  return count;
}

export function getCompareIds() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}
