'use client';

import { useState, useEffect } from 'react';

// Mostra um número de telefone de forma diferente consoante o aparelho:
// - No telemóvel, é um link "tel:" normal — um toque já liga.
// - No computador, mostra só o número como texto normal (selecionável,
//   dá para copiar) — evita que o Windows tente abrir o Skype ou outra
//   aplicação sempre que se clica, o que costuma confundir mais do que ajudar.
export default function PhoneDisplay({ phone, style, className, children, onClick }) {
  const [isMobile, setIsMobile] = useState(null);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  if (!phone) return null;

  // Enquanto não sabemos ainda (primeiro instante), assume computador —
  // mais seguro do que arriscar abrir o Skype sem querer.
  if (isMobile) {
    return (
      <a href={`tel:${phone.replace(/\s+/g, '')}`} style={style} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <span
      style={style}
      className={className}
      title="Copie este número para ligar do seu telemóvel"
      onClick={onClick}
    >
      {children}
    </span>
  );
}
