'use client';

import { useEffect, useRef, useState } from 'react';

// Só "liga" o que está lá dentro quando a pessoa se aproxima dessa parte da
// página, fazendo scroll — em vez de carregar logo tudo ao abrir a página.
// Ideal para coisas pesadas que não são a primeira coisa que se vê (como um
// mapa), para a página abrir mais depressa.
export default function LazyMount({ children, placeholderHeight = 300 }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (visible || !ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' } // começa a carregar um pouco antes de chegar mesmo lá, para não haver espera visível
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref}>
      {visible ? children : <div style={{ height: placeholderHeight }} />}
    </div>
  );
}
