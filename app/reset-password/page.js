'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('A palavra-passe precisa de pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As palavras-passe não coincidem.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => router.push('/login'), 2000);
  }

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: '60px 24px' }}>
      <Link href="/" className="logo" style={{ display: 'block', textAlign: 'center', marginBottom: 32 }}>
        More<span>&middot;</span>ada
      </Link>

      <div className="card" style={{ padding: 32 }}>
        <h2 style={{ fontSize: 18, marginBottom: 6 }}>Definir nova palavra-passe</h2>

        {done ? (
          <p style={{ fontSize: 14, color: 'var(--text-soft)' }}>
            Palavra-passe atualizada! A redirecionar para o login...
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 16 }}>
              Escolha uma nova palavra-passe para a sua conta.
            </p>
            <div className="field">
              <label>Nova palavra-passe</label>
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="field">
              <label>Confirmar palavra-passe</label>
              <input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'A guardar...' : 'Guardar nova palavra-passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
