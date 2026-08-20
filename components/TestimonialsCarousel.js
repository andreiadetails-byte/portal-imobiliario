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
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 10, padding: '32px 30px',
      background: 'linear-gradient(135deg, var(--azulejo) 0%, var(--telha) 100%)',
      height: 260, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center',
    }}>
      <span style={{
        position: 'absolute', top: -18, left: 14, fontFamily: 'Fraunces, serif', fontSize: 130,
        color: 'rgba(255,255,255,0.12)', lineHeight: 1, userSelect: 'none',
      }}>
        &ldquo;
      </span>

      <div style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.35s ease', position: 'relative' }}>
        <p className="display" style={{ fontSize: 18, lineHeight: 1.5, marginBottom: 16, color: '#fff' }}>
          {t.texto}
        </p>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#fff' }}>{t.nome}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{t.papel}</div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 20, position: 'relative' }}>
        {TESTEMUNHOS.map((_, i) => (
          <span
            key={i}
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i === index ? '#fff' : 'rgba(255,255,255,0.35)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
