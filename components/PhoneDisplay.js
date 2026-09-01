'use client';

import { useState, useEffect } from 'react';

// Mostra sempre o texto normal (ex: "Chamar") primeiro. Só depois de se
// clicar é que:
// - No telemóvel, liga diretamente (como antes).
// - No computador, revela o número por baixo do botão, e copia-o para a
//   área de transferência — sem tentar abrir o Skype nem nada assim.
export default function PhoneDisplay({ phone, style, className, children, onClick }) {
  const [isMobile, setIsMobile] = useState(null);
  const [revealed, setRevealed] = useState(false);
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

  async function handleClick(e) {
    onClick?.(e);
    setRevealed(true);
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Se a cópia automática falhar, o número já fica visível na mesma,
      // e a pessoa pode selecioná-lo à mão.
    }
  }

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" onClick={handleClick} style={{ ...style, border: style?.border || 'none', cursor: 'pointer' }} className={className}>
        {revealed ? `📞 ${phone}` : children}
      </button>
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
