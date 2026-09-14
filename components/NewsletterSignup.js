'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Caixa simples para subscrever a newsletter semanal — pode ser colocada em
// qualquer página (ex: rodapé, página inicial).
export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    const { error } = await supabase.from('newsletter_subscribers').insert({ email: email.trim().toLowerCase() });
    if (error) {
      // Erro de "já existe" (email duplicado) também conta como sucesso do
      // ponto de vista da pessoa — já está subscrita.
      if (error.code === '23505') {
        setStatus('done');
      } else {
        setStatus('error');
      }
      return;
    }
    setStatus('done');
    setEmail('');
  }

  if (status === 'done') {
    return (
      <p style={{ fontSize: 13.5, color: 'var(--telha)', fontWeight: 600 }}>
        ✓ Subscrito! Já vai receber a nossa newsletter semanal.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="O seu email"
        style={{
          flex: 1, minWidth: 180, padding: '10px 14px', borderRadius: 6,
          border: '1px solid var(--line)', fontSize: 13.5,
        }}
      />
      <button type="submit" disabled={status === 'loading'} className="btn btn-primary" style={{ fontSize: 13.5 }}>
        {status === 'loading' ? 'A subscrever...' : 'Subscrever'}
      </button>
      {status === 'error' && (
        <p style={{ fontSize: 12, color: '#8a3b2a', width: '100%' }}>Não foi possível subscrever. Tente novamente.</p>
      )}
    </form>
  );
}
