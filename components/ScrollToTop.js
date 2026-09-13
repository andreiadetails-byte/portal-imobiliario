'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Garante que, sempre que se navega para uma página nova (incluindo ao
// clicar num botão do menu inferior no telemóvel, mesmo estando já numa
// página semelhante), o ecrã sobe logo para o topo — em vez de ficar a
// meio ou no fundo, como por vezes acontece com a navegação do Next.js
// ou com a posição de scroll "lembrada" pelo navegador.
export default function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, searchParams]);

  return null;
}
