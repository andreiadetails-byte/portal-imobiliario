'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';

export default function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (rating === 0) return;
    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('feedback').insert({
      user_id: user?.id || null,
      rating,
      comment: comment.trim() || null,
    });

    setSending(false);
    setSent(true);
  }

  return (
    <>
      <Header />
      <main id="main-content" className="wrap" style={{ maxWidth: 480, padding: '48px 32px 80px' }}>
        <BackButton fallback="/" />

        {sent ? (
          <div className="card" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🙏</div>
            <h1 className="display" style={{ fontSize: 22, marginBottom: 8 }}>Obrigada pela sua opinião!</h1>
            <p style={{ fontSize: 14, color: 'var(--text-soft)' }}>
              Cada resposta ajuda-nos a melhorar o More·ada.
            </p>
          </div>
        ) : (
          <>
            <h1 className="display" style={{ fontSize: 26, marginBottom: 8 }}>Como tem sido a sua experiência?</h1>
            <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 24 }}>
              A sua opinião ajuda-nos a tornar o More·ada melhor para todos.
            </p>

            <form onSubmit={handleSubmit} className="card" style={{ padding: 24 }}>
              <div className="field">
                <label>A sua avaliação</label>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      aria-label={`${star} estrelas`}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 34, padding: 2,
                        color: star <= (hoverRating || rating) ? 'var(--gold-strong)' : 'var(--line)',
                        transition: 'color 0.15s',
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Quer dizer-nos mais? <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>(opcional)</span></label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="O que gosta mais? O que podíamos melhorar?"
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={sending || rating === 0}>
                {sending ? 'A enviar...' : 'Enviar opinião'}
              </button>
            </form>
          </>
        )}
      </main>
    </>
  );
}
