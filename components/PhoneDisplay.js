'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

// Mostra sempre o texto normal (ex: "Chamar") primeiro. Só depois de se
// clicar é que:
// - No telemóvel, liga diretamente (como antes).
// - No computador, revela o número por baixo do botão, e copia-o para a
//   área de transferência — sem tentar abrir o Skype nem nada assim.
//
// Se vier "propertyId" e "ownerId", também regista a tentativa de chamada
// como um lead — assim o anunciante (e o admin) fica a saber que alguém
// tentou ligar, mesmo sem preencher nenhum formulário.
export default function PhoneDisplay({ phone, style, className, children, onClick, propertyId, ownerId }) {
  const [isMobile, setIsMobile] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  if (!phone) return null;

  function logCallLead() {
    if (!propertyId || !ownerId) return;
    supabase.from('leads').insert({
      property_id: propertyId,
      owner_id: ownerId,
      name: 'Alguém, por telefone',
      email: '',
      phone: '',
      message: 'Tentou ligar através do botão "Chamar" no anúncio (sem preencher formulário).',
      status: 'novo',
    }).then(({ error }) => {
      if (error) console.error('Erro ao registar tentativa de chamada:', error);
    });
  }

  if (isMobile) {
    return (
      <a
        href={`tel:${phone.replace(/\s+/g, '')}`}
        style={style}
        className={className}
        onClick={(e) => { onClick?.(e); logCallLead(); }}
      >
        {children}
      </a>
    );
  }

  async function handleClick(e) {
    onClick?.(e);
    setRevealed(true);
    logCallLead();
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
