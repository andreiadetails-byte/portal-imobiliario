'use client';

import { useEffect } from 'react';

// Impede "Guardar imagem como..." (clique direito) e arrastar imagens para fora do site.
// Não impede capturas de ecrã — isso não é tecnicamente possível de bloquear num browser.
export default function ImageProtection() {
  useEffect(() => {
    function blockContextMenu(e) {
      if (e.target.tagName === 'IMG') e.preventDefault();
    }
    function blockDragStart(e) {
      if (e.target.tagName === 'IMG') e.preventDefault();
    }

    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('dragstart', blockDragStart);

    return () => {
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('dragstart', blockDragStart);
    };
  }, []);

  return null;
}
