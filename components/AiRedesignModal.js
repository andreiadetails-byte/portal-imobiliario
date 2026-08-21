'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const SUGGESTIONS = [
  'Pintar as paredes de branco',
  'Estilo moderno e minimalista',
  'Remodelar a cozinha',
  'Adicionar mobília de sala de estar',
];

export default function AiRedesignModal({ photoUrl, onClose }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultImage, setResultImage] = useState(null);
  const [remaining, setRemaining] = useState(null);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Precisa de ter sessão iniciada para usar esta funcionalidade.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/ai-redesign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, imageUrl: photoUrl, prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Não foi possível gerar a imagem.');
      } else {
        setResultImage(data.image);
        setRemaining(data.remaining);
      }
    } catch (err) {
      setError('Não foi possível ligar ao serviço. Tente novamente.');
    }
    setLoading(false);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(20,17,12,0.75)', zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 24 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 className="display" style={{ fontSize: 19 }}>Redesenhar com IA</h3>
          <button onClick={onClose} aria-label="Fechar" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        {!resultImage ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 14 }}>
              Descreva a alteração que gostaria de ver simulada nesta foto — pintura, mobília, remodelação, etc.
            </p>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="Foto original do imóvel" style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 14 }} />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPrompt(s)}
                  style={{
                    fontSize: 11.5, padding: '5px 10px', borderRadius: 12, border: '1px solid var(--line)',
                    background: 'var(--plaster)', color: 'var(--text-soft)', cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: pintar as paredes de cinza claro e trocar o sofá por um em tecido bege"
              rows={3}
              style={{ width: '100%', padding: 12, borderRadius: 6, border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }}
            />

            {error && <p className="error-text" style={{ marginBottom: 10 }}>{error}</p>}

            <button
              type="button"
              onClick={handleGenerate}
              className="btn btn-primary btn-block"
              disabled={loading || !prompt.trim()}
            >
              {loading ? 'A gerar imagem...' : 'Gerar simulação'}
            </button>
            <p style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 8, textAlign: 'center' }}>
              Tem direito a 10 imagens grátis por mês.
            </p>
          </>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resultImage} alt="Simulação gerada por IA" style={{ width: '100%', borderRadius: 8, marginBottom: 10 }} />
            <div style={{
              background: 'var(--plaster)', borderRadius: 6, padding: '8px 12px', marginBottom: 14,
              fontSize: 12, color: 'var(--text-soft)', textAlign: 'center',
            }}>
              ⚠️ Simulação gerada por IA — não é a imagem real do imóvel
            </div>
            {remaining != null && (
              <p style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 14, textAlign: 'center' }}>
                Ainda tem {remaining} {remaining === 1 ? 'imagem' : 'imagens'} grátis este mês.
              </p>
            )}
            <button
              type="button"
              onClick={() => { setResultImage(null); setPrompt(''); }}
              className="btn btn-block"
            >
              Fazer outra simulação
            </button>
          </>
        )}
      </div>
    </div>
  );
}
