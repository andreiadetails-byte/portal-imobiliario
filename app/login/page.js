'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import { isPasswordValid, PASSWORD_RULES_TEXT } from '../../lib/passwordRules';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { PAYMENT_INFO } from '../../lib/paymentInfo';
import { isProfessionalAccount } from '../../lib/accountTypes';
import { compressImageFile } from '../../lib/imageCompression';
import { migrateLocalFavoritesToAccount } from '../../lib/localFavorites';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [accountType, setAccountType] = useState('particular');
  const [couponCode, setCouponCode] = useState('');
  const [showCoupon, setShowCoupon] = useState(false);
  const [amiLicense, setAmiLicense] = useState('');
  const [phone, setPhone] = useState('');
  const [showPhonePublic, setShowPhonePublic] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [signupEmailSent, setSignupEmailSent] = useState(false);
  const [signupFreeMonths, setSignupFreeMonths] = useState(1);

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
      // Só aceita mesmo formatos de imagem normais — nunca SVG (pode conter
      // código escondido lá dentro) nem qualquer outro tipo de ficheiro.
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('Só são aceites imagens JPG, PNG ou WEBP.');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  }

  async function handleGoogleLogin() {
    setError('');
    // Guarda as escolhas feitas (tipo de conta, cupão) antes de sair para o
    // Google — como o Google nos traz de volta diretamente, sem passar pelo
    // resto do formulário, isto é a única forma de as recuperar depois.
    if (mode === 'signup' && typeof window !== 'undefined') {
      window.localStorage.setItem('morada_pending_signup', JSON.stringify({
        accountType,
        couponCode: couponCode.trim(),
      }));
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.user) {
      await migrateLocalFavoritesToAccount(supabase, data.user.id);
      await supabase.from('profiles').update({ email: data.user.email }).eq('id', data.user.id);

      const { data: profile } = await supabase.from('profiles').select('account_type, subscription_status, subscription_paid_until, is_blocked, is_admin').eq('id', data.user.id).single();

      if (profile?.is_blocked) {
        await supabase.auth.signOut();
        setError('A sua conta foi bloqueada. Contacte o suporte se achar que isto é um engano.');
        return;
      }

      if (PAYMENT_INFO.subscriptionEnforced && isProfessionalAccount(profile?.account_type) && !profile?.is_admin) {
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
    router.push('/');
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    if (isProfessionalAccount(accountType) && accountType !== 'promotor' && !amiLicense.trim()) {
      setError('Indique o número de licença AMI.');
      return;
    }
    if (!isPasswordValid(password)) {
      setError(PASSWORD_RULES_TEXT);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, account_type: accountType } },
    });
    if (error) { setError(error.message); setLoading(false); return; }

    // O Supabase não devolve um erro claro quando o email já existe (por segurança,
    // para não revelar quais emails já têm conta) — em vez disso, devolve uma resposta
    // de "sucesso" mas com uma lista de identidades vazia. É assim que detetamos isto.
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError('Já existe uma conta registada com este email. Se é sua, experimente entrar em vez de criar uma nova conta.');
      setLoading(false);
      return;
    }

    if (data.user) {
      let avatar_url = null;
      if (avatarFile) {
        const compressedAvatar = await compressImageFile(avatarFile);
        const ext = compressedAvatar.name.split('.').pop();
        const path = `avatars/${data.user.id}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('property-photos').upload(path, compressedAvatar, { upsert: true, cacheControl: '31536000' });
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('property-photos').getPublicUrl(path);
          avatar_url = publicUrlData.publicUrl;
        }
      }

      // Agências novas ficam com o primeiro mês grátis, sem precisar de pagar já.
      // Um cupão válido (verificado e registado no servidor, para não poder
      // ser usado repetidamente com o mesmo email) pode dar meses extra.
      let couponMonths = 0;
      if (couponCode.trim()) {
        try {
          const couponRes = await fetch('/api/redeem-coupon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, couponCode: couponCode.trim() }),
          });
          const couponData = await couponRes.json();
          couponMonths = couponData.months || 0;
        } catch (err) {
          // Se a verificação do cupão falhar por algum motivo, segue em
          // frente sem o benefício extra — nunca bloqueia o registo em si.
        }
      }

      let signupFreeMonthsValue = 1;
      if (PAYMENT_INFO.subscriptionEnforced && isProfessionalAccount(accountType)) {
        try {
          const trialRes = await fetch('/api/activate-free-trial', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id, accountType, couponMonths }),
          });
          const trialData = await trialRes.json();
          if (trialData.months) signupFreeMonthsValue = trialData.months;
        } catch (err) {
          // Se isto falhar, a conta continua criada — o admin pode
          // confirmar a subscrição manualmente mais tarde.
        }
        setSignupFreeMonths(signupFreeMonthsValue);
      }

      await supabase.from('profiles').upsert({
        id: data.user.id,
        account_type: accountType,
        email: data.user.email,
        phone_real: phone || null,
        show_phone_public: showPhonePublic,
        ...(isProfessionalAccount(accountType) && accountType !== 'promotor' && { agency_license: amiLicense.trim() }),
        ...(avatar_url && { avatar_url }),
      }, { onConflict: 'id' });
    }
    setLoading(false);

    // Se o Supabase exigir confirmação por email, ainda não há sessão iniciada —
    // é preciso avisar claramente, ou a pessoa acha que o botão não fez nada.
    if (!data.session) {
      setSignupEmailSent(true);
      return;
    }

    await migrateLocalFavoritesToAccount(supabase, data.user.id);

    const isNewFreeAgency = PAYMENT_INFO.subscriptionEnforced && isProfessionalAccount(accountType);
    router.push(isNewFreeAgency ? '/dashboard?welcome=agencia' : '/dashboard');
  }

  return (
    <main id="main-content" style={{ maxWidth: 400, margin: '0 auto', padding: '60px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <LanguageSwitcher />
      </div>
      <Link href="/" className="logo" style={{ display: 'block', textAlign: 'center', marginBottom: 32, color: '#fff' }}>
        More<span>&middot;</span>ada
      </Link>

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

        {!forgotMode && !signupEmailSent && (
          <>
            {mode === 'signup' && (
              <>
                <div className="field">
                  <label>{t('login_account_type')}</label>
                  <select value={accountType} onChange={(e) => setAccountType(e.target.value)}>
                    <option value="particular">{t('login_particular_opt')}</option>
                    <option value="agencia">{t('login_agency_opt')}</option>
                    <option value="consultor">{t('login_consultant_opt')}</option>
                    <option value="promotor">{t('login_developer_opt')}</option>
                  </select>
                </div>
                {isProfessionalAccount(accountType) && (
                  <div className="field">
                    {!showCoupon ? (
                      <button
                        type="button"
                        onClick={() => setShowCoupon(true)}
                        style={{ fontSize: 12.5, color: 'var(--telha)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        🎟️ Tenho um cupão de oferta
                      </button>
                    ) : (
                      <>
                        <label htmlFor="coupon-input-google">Código do cupão</label>
                        <input
                          id="coupon-input-google"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="ex: MOREADA3"
                          style={{ textTransform: 'uppercase' }}
                        />
                      </>
                    )}
                  </div>
                )}
                <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginBottom: 14 }}>
                  Escolhido acima? Continua com o Google abaixo, ou preenche o formulário completo mais em baixo.
                </p>
              </>
            )}
            <button
              type="button"
              onClick={handleGoogleLogin}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '11px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--paper)',
                fontSize: 14, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer', marginBottom: 16,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
                <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
              </svg>
              {t('login_google')}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 18px', color: 'var(--text-soft)', fontSize: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              {t('login_or')}
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            </div>
          </>
        )}

        {signupEmailSent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: 'var(--azulejo)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 16px',
            }}>
              ✉️
            </div>
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>{t('login_verify_email')}</h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-soft)', marginBottom: 20 }}>
              Enviámos um link de confirmação para <b>{email}</b>. Clique nesse link para ativar a sua conta e poder entrar.
            </p>
            {PAYMENT_INFO.subscriptionEnforced && isProfessionalAccount(accountType) && (
              <div style={{ background: 'var(--plaster)', borderRadius: 8, padding: 16, marginBottom: 20, textAlign: 'left' }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  🎁 {signupFreeMonths === 1 ? 'O seu primeiro mês é grátis' : `Tem ${signupFreeMonths} meses grátis`}
                </p>
                <p style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>
                  Depois de confirmar o email, tem acesso total ao painel durante {signupFreeMonths === 1 ? '1 mês' : `${signupFreeMonths} meses`}, sem qualquer custo.
                  Passado esse período, a mensalidade é de {PAYMENT_INFO.subscriptionFee.toFixed(2)} €/mês, por transferência bancária.
                </p>
              </div>
            )}
            <button
              onClick={() => { setSignupEmailSent(false); setMode('login'); }}
              className="btn btn-block"
            >
              &larr; Voltar a entrar
            </button>
          </div>
        ) : forgotMode ? (
          <div>
            <h2 style={{ fontSize: 17, marginBottom: 6 }}>{t('login_recover_password')}</h2>
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
                  <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                {error && <p className="error-text">{error}</p>}
                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                  {loading ? t('login_sending') : t('login_send_recovery_link')}
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
              <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>{t('login_pw')}</label>
              <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
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
              {t('login_forgot_password')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <div className="field">
              <label>{t('login_account_type')}</label>
              <select value={accountType} onChange={(e) => setAccountType(e.target.value)}>
                <option value="particular">{t('login_particular_opt')}</option>
                <option value="agencia">{t('login_agency_opt')}</option>
                <option value="consultor">{t('login_consultant_opt')}</option>
                <option value="promotor">{t('login_developer_opt')}</option>
              </select>
            </div>

            {isProfessionalAccount(accountType) && accountType !== 'promotor' && (
              <div className="field">
                <label htmlFor="ami-input">{t('login_ami_license')}</label>
                <input
                  id="ami-input"
                  required
                  value={amiLicense}
                  onChange={(e) => setAmiLicense(e.target.value)}
                  placeholder="ex: 12345"
                />
                <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>
                  Número de licença AMI (obrigatório em Portugal para mediação imobiliária).
                </span>
              </div>
            )}

            {isProfessionalAccount(accountType) && (
              <div className="field">
                {!showCoupon ? (
                  <button
                    type="button"
                    onClick={() => setShowCoupon(true)}
                    style={{ fontSize: 12.5, color: 'var(--telha)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    🎟️ Tenho um cupão de oferta
                  </button>
                ) : (
                  <>
                    <label htmlFor="coupon-input">Código do cupão</label>
                    <input
                      id="coupon-input"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="ex: MOREADA3"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </>
                )}
              </div>
            )}

            <div className="field">
              <label>{t('login_profile_photo')} <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{t('login_optional')}</span></label>
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
              <label>{t('login_mobile_phone')} <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{t('login_optional')}</span></label>
              <input type="tel" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="912 345 678" />
              {phone && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowPhonePublic(true)}
                    className="btn"
                    style={{
                      fontSize: 12.5, flex: 1,
                      background: showPhonePublic ? 'var(--azulejo)' : 'transparent',
                      color: showPhonePublic ? '#fff' : 'var(--ink)',
                      borderColor: showPhonePublic ? 'var(--azulejo)' : 'var(--line)',
                    }}
                  >
                    Aparecer nos anúncios
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPhonePublic(false)}
                    className="btn"
                    style={{
                      fontSize: 12.5, flex: 1,
                      background: !showPhonePublic ? 'var(--azulejo)' : 'transparent',
                      color: !showPhonePublic ? '#fff' : 'var(--ink)',
                      borderColor: !showPhonePublic ? 'var(--azulejo)' : 'var(--line)',
                    }}
                  >
                    Não aparecer nos anúncios
                  </button>
                </div>
              )}
            </div>
            <div className="field">
              <label>{t('login_pw_min')}</label>
              <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <span className="hint" style={{ fontSize: 11.5, color: 'var(--text-soft)' }}>{t('login_password_hint')}</span>
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
    </main>
  );
}
