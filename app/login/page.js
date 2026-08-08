'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { PAYMENT_INFO } from '../../lib/paymentInfo';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [accountType, setAccountType] = useState('particular');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  async function handleForgotPassword(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setForgotSent(true);
  }

  function handleAvatarSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (data.user) {
      await supabase.from('profiles').update({ email: data.user.email }).eq('id', data.user.id);

      const { data: profile } = await supabase.from('profiles').select('account_type, subscription_status, subscription_paid_until').eq('id', data.user.id).single();
      if (PAYMENT_INFO.subscriptionEnforced && profile?.account_type === 'agencia') {
        const isActive = profile.subscription_status === 'active'
          && profile.subscription_paid_until
          && new Date(profile.subscription_paid_until) >= new Date();
        if (!isActive) {
          if (profile.subscription_status === 'active') {
            await supabase.from('profiles').update({ subscription_status: 'expired' }).eq('id', data.user.id);
          }
          router.push('/assinatura');
          return;
        }
      }
    }
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
      let avatar_url = null;
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `avatars/${data.user.id}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('property-photos').upload(path, avatarFile, { upsert: true });
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('property-photos').getPublicUrl(path);
          avatar_url = publicUrlData.publicUrl;
        }
      }
      await supabase.from('profiles').update({
        account_type: accountType,
        email: data.user.email,
        ...(PAYMENT_INFO.subscriptionEnforced && accountType === 'agencia' && { subscription_status: 'pending' }),
        ...(avatar_url && { avatar_url }),
      }).eq('id', data.user.id);
    }
    setLoading(false);
    router.push(PAYMENT_INFO.subscriptionEnforced && accountType === 'agencia' ? '/assinatura' : '/dashboard');
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
        {!forgotMode && (
          <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--line)', marginBottom: 20 }}>
            <button
              onClick={() => { setMode('login'); setEmail(''); setPassword(''); setError(''); }}
              style={{ background: 'none', border: 'none', padding: '0 0 12px', fontWeight: 600, cursor: 'pointer',
                       color: mode === 'login' ? 'var(--ink)' : 'var(--text-soft)',
                       borderBottom: mode === 'login' ? '2px solid var(--telha)' : '2px solid transparent' }}>
              {t('login_login')}
            </button>
            <button
              onClick={() => { setMode('signup'); setEmail(''); setPassword(''); setError(''); }}
              style={{ background: 'none', border: 'none', padding: '0 0 12px', fontWeight: 600, cursor: 'pointer',
                       color: mode === 'signup' ? 'var(--ink)' : 'var(--text-soft)',
                       borderBottom: mode === 'signup' ? '2px solid var(--telha)' : '2px solid transparent' }}>
              {t('login_signup')}
            </button>
          </div>
        )}

        {forgotMode ? (
          <div>
            <h2 style={{ fontSize: 17, marginBottom: 6 }}>Recuperar palavra-passe</h2>
            {forgotSent ? (
              <p style={{ fontSize: 13.5, color: 'var(--text-soft)' }}>
                Se existir uma conta com esse email, vai receber um link para definir uma nova palavra-passe.
              </p>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <p style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 14 }}>
                  Indique o email da sua conta e enviamos-lhe um link para repor a palavra-passe.
                </p>
                <div className="field">
                  <label>{t('login_email')}</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                {error && <p className="error-text">{error}</p>}
                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                  {loading ? 'A enviar...' : 'Enviar link de recuperação'}
                </button>
              </form>
            )}
            <button
              onClick={() => { setForgotMode(false); setForgotSent(false); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--telha)', fontSize: 13, cursor: 'pointer', marginTop: 14 }}
            >
              &larr; Voltar a entrar
            </button>
          </div>
        ) : mode === 'login' ? (
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
            <button
              type="button"
              onClick={() => { setForgotMode(true); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--telha)', fontSize: 12.5, cursor: 'pointer', marginTop: 12, display: 'block' }}
            >
              Esqueceu-se da palavra-passe?
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
              <label>Foto de perfil <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>(opcional)</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {avatarPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                )}
                <label htmlFor="avatar-input" className="btn" style={{ fontSize: 13, cursor: 'pointer' }}>
                  {avatarFile ? 'Trocar foto' : 'Escolher foto'}
                </label>
                <input id="avatar-input" type="file" accept="image/*" onChange={handleAvatarSelect} style={{ display: 'none' }} />
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 6 }}>
                Aparece junto dos seus anúncios nos resultados de pesquisa.
              </p>
            </div>

            <div className="field">
              <label>{t('login_name')}</label>
              <input type="text" required autoComplete="off" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="field">
              <label>{t('login_email')}</label>
              <input type="email" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>{t('login_pw_min')}</label>
              <input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
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
