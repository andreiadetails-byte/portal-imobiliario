'use client';

import { useState, useEffect } from 'react';

// Mostra um número de telefone de forma diferente consoante o aparelho:
// - No telemóvel, é um link "tel:" normal — um toque já liga.
// - No computador, ao clicar copia o número para a área de transferência
//   (com uma pequena confirmação visual) — mais útil do que abrir o Skype
//   ou não fazer nada de todo.
export default function PhoneDisplay({ phone, style, className, children, onClick }) {
  const [isMobile, setIsMobile] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  if (!phone) return null;

  if (isMobile) {
    return (
      <a href={`tel:${phone.replace(/\s+/g, '')}`} style={style} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }

  async function handleCopy(e) {
    onClick?.(e);
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Se a cópia automática falhar por algum motivo, pelo menos o número
      // já estava visível como texto normal, e a pessoa pode selecioná-lo à mão.
    }
  }

  return (
    <span
      style={{ ...style, position: 'relative', cursor: 'pointer' }}
      className={className}
      title="Clique para copiar o número"
      onClick={handleCopy}
    >
      {children}
      {copied && (
        <span style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6,
          background: 'var(--ink)', color: '#fff', fontSize: 11.5, fontWeight: 600, padding: '4px 10px',
          borderRadius: 6, whiteSpace: 'nowrap', zIndex: 10,
        }}>
          ✓ Número copiado!
        </span>
      )}
    </span>
  );
}
