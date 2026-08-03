'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [accountType, setAccountType] = useState('particular');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push('/dashboard');
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) { setError(error.message); setLoading(false); return; }

    if (data.user) {
      await supabase.from('profiles').update({ account_type: accountType }).eq('id', data.user.id);
    }
    setLoading(false);
    router.push('/dashboard');
  }

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: '60px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <LanguageSwitcher />
      </div>
      <div className="logo" style={{ textAlign: 'center', marginBottom: 32 }}>
        more<span>&middot;</span>ada
      </div>

      <div className="card" style={{ padding: 32 }}>
        <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--line)', marginBottom: 20 }}>
          <button
            onClick={() => setMode('login')}
            style={{ background: 'none', border: 'none', padding: '0 0 12px', fontWeight: 600, cursor: 'pointer',
                     color: mode === 'login' ? 'var(--ink)' : 'var(--text-soft)',
                     borderBottom: mode === 'login' ? '2px solid var(--telha)' : '2px solid transparent' }}>
            {t('login_login')}
          </button>
          <button
            onClick={() => setMode('signup')}
            style={{ background: 'none', border: 'none', padding: '0 0 12px', fontWeight: 600, cursor: 'pointer',
                     color: mode === 'signup' ? 'var(--ink)' : 'var(--text-soft)',
                     borderBottom: mode === 'signup' ? '2px solid var(--telha)' : '2px solid transparent' }}>
            {t('login_signup')}
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="field">
              <label>{t('login_email')}</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>{t('login_pw')}</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {t('login_login')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <div className="field">
              <label>{t('login_account_type')}</label>
              <select value={accountType} onChange={(e) => setAccountType(e.target.value)}>
                <option value="particular">{t('login_individual')}</option>
                <option value="agencia">{t('login_agency')}</option>
              </select>
            </div>
            <div className="field">
              <label>{t('login_name')}</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="field">
              <label>{t('login_email')}</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>{t('login_pw_min')}</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {t('login_signup_btn')}
            </button>
          </form>
        )}
      </div>

      <p style={{ textAlign: 'center', marginTop: 20 }}>
        <Link href="/" style={{ fontSize: 13, color: 'var(--text-soft)' }}>&larr; {t('login_back')}</Link>
      </p>
    </div>
  );
}
