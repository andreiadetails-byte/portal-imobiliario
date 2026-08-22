'use client';
import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
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
  const recaptchaRef = useRef(null);
  const recaptchaWidgetId = useRef(null);
  const loginRecaptchaRef = useRef(null);
  const loginRecaptchaWidgetId = useRef(null);
  const [recaptchaScriptReady, setRecaptchaScriptReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [accountType, setAccountType] = useState('particular');
  const [amiLicense, setAmiLicense] = useState('');
  const [phone, setPhone] = useState('');
  const [showPhonePublic, setShowPhonePublic] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recaptchaAlreadyOk, setRecaptchaAlreadyOk] = useState(false);

  useEffect(() => {
    const RECAPTCHA_VALID_HOURS = 24;
    const lastVerified = typeof window !== 'undefined' ? localStorage.getItem('morada_recaptcha_ok') : null;
    if (lastVerified && (Date.now() - Number(lastVerified)) < RECAPTCHA_VALID_HOURS * 60 * 60 * 1000) {
      setRecaptchaAlreadyOk(true);
    }
  }, []);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [signupEmailSent, setSignupEmailSent] = useState(false);

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

    // Só pede para confirmar "não sou um robô" uma vez por dia — depois de
    // confirmado, os logins seguintes nesse dia entram diretamente. Continua
    // a proteger contra tentativas automáticas em massa (que nunca teriam
    // essa confirmação guardada), sem incomodar quem entra várias vezes.
    const RECAPTCHA_VALID_HOURS = 24;
    const lastVerified = typeof window !== 'undefined' ? localStorage.getItem('morada_recaptcha_ok') : null;
    const stillValid = lastVerified && (Date.now() - Number(lastVerified)) < RECAPTCHA_VALID_HOURS * 60 * 60 * 1000;

    if (!stillValid) {
      const recaptchaToken = typeof window !== 'undefined' && window.grecaptcha && loginRecaptchaWidgetId.current !== null
        ? window.grecaptcha.getResponse(loginRecaptchaWidgetId.current)
        : '';
      if (!recaptchaToken) {
        setError('Confirme que não é um robô, marcando a caixa "Não sou um robô".');
        return;
      }

      setLoading(true);
      const verifyRes = await fetch('/api/verify-recaptcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: recaptchaToken }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        setError('Não foi possível confirmar que não é um robô. Tente novamente.');
        if (window.grecaptcha && loginRecaptchaWidgetId.current !== null) window.grecaptcha.reset(loginRecaptchaWidgetId.current);
        setLoading(false);
        return;
      }
      localStorage.setItem('morada_recaptcha_ok', String(Date.now()));
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      if (window.grecaptcha && loginRecaptchaWidgetId.current !== null) window.grecaptcha.reset(loginRecaptchaWidgetId.current);
      return;
    }
    if (data.user) {
      await supabase.from('profiles').update({ email: data.user.email }).eq('id', data.user.id);

      const { data: profile } = await supabase.from('profiles').select('account_type, subscription_status, subscription_paid_until, is_blocked, is_admin').eq('id', data.user.id).single();

      if (profile?.is_blocked) {
        await supabase.auth.signOut();
        setError('A sua conta foi bloqueada. Contacte o suporte se achar que isto é um engano.');
        return;
      }

      if (PAYMENT_INFO.subscriptionEnforced && profile?.account_type === 'agencia' && !profile?.is_admin) {
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

  // Quando a pessoa volta atrás para esta página (botão do browser), o
  // Chrome/Safari por vezes reaproveitam a página tal como estava guardada
  // em memória ("bfcache"), em vez de a carregarem de novo — e a caixa do
  // reCAPTCHA não sobrevive bem a isso. Isto deteta essa situação e força
  // a caixa a ser desenhada outra vez.
  useEffect(() => {
    function handlePageShow(event) {
      if (!event.persisted) return; // só nos interessa quando veio do cache
      if (window.grecaptcha) {
        recaptchaWidgetId.current = null;
        loginRecaptchaWidgetId.current = null;
        // Limpa o conteúdo antigo das caixas, para o Google não recusar
        // desenhar de novo com "já existe uma caixa aqui".
        if (recaptchaRef.current) recaptchaRef.current.innerHTML = '';
        if (loginRecaptchaRef.current) loginRecaptchaRef.current.innerHTML = '';
        setRecaptchaScriptReady(false);
        setTimeout(() => setRecaptchaScriptReady(true), 0);
      }
    }
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  // Desenha a caixa "Não sou um robô" à mão, só quando o formulário de registo
  // está mesmo visível — o Google não a encontra sozinho porque só existe depois
  // de a pessoa clicar em "Registar" (o site troca entre Login e Registar).
  useEffect(() => {
    if (mode !== 'signup' || !recaptchaScriptReady) return;
    if (recaptchaWidgetId.current !== null) return; // já desenhada, não repetir

    // Tenta desenhar a caixa repetidamente, de pouco em pouco tempo, até
    // conseguir — evita o caso em que o script do Google fica pronto antes
    // do sítio onde a caixa deve aparecer existir na página (não teria
    // mais nenhuma oportunidade de tentar outra vez, senão).
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (recaptchaWidgetId.current !== null) { clearInterval(interval); return; }
      if (recaptchaRef.current && window.grecaptcha && window.grecaptcha.render) {
        recaptchaWidgetId.current = window.grecaptcha.render(recaptchaRef.current, {
          sitekey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
        });
        clearInterval(interval);
      } else if (attempts > 40) { // desiste ao fim de ~10 segundos
        clearInterval(interval);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [mode, recaptchaScriptReady]);

  // O mesmo, mas para o formulário de login — protege contra alguém tentar
  // adivinhar passwords em massa (ataques de "força bruta").
  useEffect(() => {
    if (mode !== 'login' || !recaptchaScriptReady || recaptchaAlreadyOk) return;
    if (loginRecaptchaWidgetId.current !== null) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (loginRecaptchaWidgetId.current !== null) { clearInterval(interval); return; }
      if (loginRecaptchaRef.current && window.grecaptcha && window.grecaptcha.render) {
        loginRecaptchaWidgetId.current = window.grecaptcha.render(loginRecaptchaRef.current, {
          sitekey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
        });
        clearInterval(interval);
      } else if (attempts > 40) {
        clearInterval(interval);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [mode, recaptchaScriptReady, recaptchaAlreadyOk]);

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    if (accountType === 'agencia' && !amiLicense.trim()) {
      setError('Indique o número de licença AMI da sua agência.');
      return;
    }
    const recaptchaToken = typeof window !== 'undefined' && window.grecaptcha && recaptchaWidgetId.current !== null
      ? window.grecaptcha.getResponse(recaptchaWidgetId.current)
      : '';
    if (!recaptchaToken) {
      setError('Confirme que não é um robô, marcando a caixa "Não sou um robô".');
      return;
    }
    setLoading(true);
    const verifyRes = await fetch('/api/verify-recaptcha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: recaptchaToken }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      setError('Não foi possível confirmar que não é um robô. Tente novamente.');
      if (window.grecaptcha && recaptchaWidgetId.current !== null) window.grecaptcha.reset(recaptchaWidgetId.current);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, account_type: accountType } },
    });
    if (error) { setError(error.message); setLoading(false); if (window.grecaptcha && recaptchaWidgetId.current !== null) window.grecaptcha.reset(recaptchaWidgetId.current); return; }

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
        const ext = avatarFile.name.split('.').pop();
        const path = `avatars/${data.user.id}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('property-photos').upload(path, avatarFile, { upsert: true });
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('property-photos').getPublicUrl(path);
          avatar_url = publicUrlData.publicUrl;
        }
      }

      // Agências novas ficam com o primeiro mês grátis, sem precisar de pagar já.
      let freeMonthFields = {};
      if (PAYMENT_INFO.subscriptionEnforced && accountType === 'agencia') {
        const freeUntil = new Date();
        freeUntil.setMonth(freeUntil.getMonth() + 1);
        freeMonthFields = { subscription_status: 'active', subscription_paid_until: freeUntil.toISOString().slice(0, 10) };
      }

      await supabase.from('profiles').upsert({
        id: data.user.id,
        account_type: accountType,
        email: data.user.email,
        phone_real: phone || null,
        show_phone_public: showPhonePublic,
        ...(accountType === 'agencia' && { agency_license: amiLicense.trim() }),
        ...freeMonthFields,
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

    const isNewFreeAgency = PAYMENT_INFO.subscriptionEnforced && accountType === 'agencia';
    router.push(isNewFreeAgency ? '/dashboard?welcome=agencia' : '/dashboard');
  }

  return (
    <main id="main-content" style={{ maxWidth: 400, margin: '0 auto', padding: '60px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <LanguageSwitcher />
      </div>
      <Link href="/" className="logo" style={{ display: 'block', textAlign: 'center', marginBottom: 32 }}>
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

        {signupEmailSent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: 'var(--azulejo)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 16px',
            }}>
              ✉️
            </div>
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>Verifique o seu email</h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-soft)', marginBottom: 20 }}>
              Enviámos um link de confirmação para <b>{email}</b>. Clique nesse link para ativar a sua conta e poder entrar.
            </p>
            {PAYMENT_INFO.subscriptionEnforced && accountType === 'agencia' && (
              <div style={{ background: 'var(--plaster)', borderRadius: 8, padding: 16, marginBottom: 20, textAlign: 'left' }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>🎁 O seu primeiro mês é grátis</p>
                <p style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>
                  Depois de confirmar o email, tem acesso total ao painel durante 1 mês, sem qualquer custo.
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
            {!recaptchaAlreadyOk && <div ref={loginRecaptchaRef} style={{ marginBottom: 16 }} />}
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

            {accountType === 'agencia' && (
              <div className="field">
                <label htmlFor="ami-input">Licença AMI</label>
                <input
                  id="ami-input"
                  required
                  value={amiLicense}
                  onChange={(e) => setAmiLicense(e.target.value)}
                  placeholder="ex: 12345"
                />
                <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>
                  Número de licença AMI da sua agência (obrigatório em Portugal para mediação imobiliária).
                </span>
              </div>
            )}

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
              <label>Telemóvel <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>(opcional)</span></label>
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
            </div>
            {error && <p className="error-text">{error}</p>}
            <div ref={recaptchaRef} style={{ marginBottom: 16 }} />
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {t('login_signup_btn')}
            </button>
          </form>
        )}
      </div>

      <p style={{ textAlign: 'center', marginTop: 20 }}>
        <Link href="/" style={{ fontSize: 13, color: 'var(--text-soft)' }}>&larr; {t('login_back')}</Link>
      </p>
      <Script
        src="https://www.google.com/recaptcha/api.js?render=explicit"
        strategy="lazyOnload"
        onLoad={() => setRecaptchaScriptReady(true)}
      />
    </main>
  );
}
