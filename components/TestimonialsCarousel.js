'use client';

import { useEffect, useState } from 'react';

const TESTEMUNHOS = [
  { nome: 'Rita Marques', papel: 'Vendeu um apartamento em Lisboa', texto: 'Publiquei o meu anúncio e em duas semanas já tinha visitas marcadas. Muito mais simples do que esperava.' },
  { nome: 'João Castro', papel: 'Arrendou uma casa no Porto', texto: 'Gostei de poder falar diretamente com o senhorio pelo chat, sem intermediários. Processo rápido e claro.' },
  { nome: 'Ana Ferreira', papel: 'Comprou uma moradia em Cascais', texto: 'O simulador de crédito e de IMT ajudaram-me a perceber logo os custos todos, sem surpresas.' },
  { nome: 'Miguel Santos', papel: 'Agência imobiliária', texto: 'A gestão de leads e do chat num único painel poupa-nos imenso tempo todos os dias.' },
];

export default function TestimonialsCarousel() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % TESTEMUNHOS.length);
        setVisible(true);
      }, 350);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const t = TESTEMUNHOS[index];

  return (
    <div className="card" style={{ padding: 28, textAlign: 'center' }}>
      <div style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.35s ease', minHeight: 96 }}>
        <p className="display" style={{ fontSize: 17, lineHeight: 1.5, marginBottom: 14 }}>
          &ldquo;{t.texto}&rdquo;
        </p>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.nome}</div>
        <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>{t.papel}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 18 }}>
        {TESTEMUNHOS.map((_, i) => (
          <span
            key={i}
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i === index ? 'var(--telha)' : 'var(--line)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
