'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import { PAYMENT_INFO } from '../../lib/paymentInfo';

export default function AssinaturaPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { router.push('/login'); return; }
      setUser(currentUser);

      const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
      setProfile(data);
      setLoading(false);

      if (data && data.subscription_status === 'active' && data.subscription_paid_until && new Date(data.subscription_paid_until) >= new Date()) {
        router.push('/dashboard');
      }
    }
    load();
  }, [router]);

  async function requestPayment() {
    setError('');
    if (!proofFile) {
      setError('Por favor, anexe o comprovativo da transferência.');
      return;
    }
    setSubmitting(true);

    const ext = proofFile.name.split('.').pop();
    const path = `${user.id}/comprovativo-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('property-photos').upload(path, proofFile, { upsert: true });

    if (uploadError) {
      setError('Não foi possível enviar o comprovativo. Tente outra vez.');
      setSubmitting(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('property-photos').getPublicUrl(path);

    await supabase.from('profiles').update({
      subscription_status: 'pending',
      subscription_requested_at: new Date().toISOString(),
      subscription_proof_url: publicUrlData.publicUrl,
    }).eq('id', user.id);

    setProfile((cur) => ({ ...cur, subscription_status: 'pending', subscription_proof_url: publicUrlData.publicUrl }));
    setSubmitting(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) return (<><Header /><div className="wrap" style={{ padding: 60 }}>...</div></>);

  function renewalBlock() {
    return (
      <>
        <div style={{ background: 'var(--plaster)', borderRadius: 8, padding: 16, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span>{t('sub_monthly_fee')}</span><b>{PAYMENT_INFO.subscriptionFee.toFixed(2)} €/mês</b>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-soft)', marginTop: 6 }}>
            Até {PAYMENT_INFO.subscriptionListingsLimit} anúncios ativos. Sem fidelização — cancele quando quiser, sem multas.
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--telha)', fontWeight: 600, marginTop: 6 }}>
            🎁 O primeiro mês é sempre gratuito — só paga a partir do segundo.
          </div>
        </div>

        <p style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{t('sub_bank_transfer')}</p>
        <div style={{ fontSize: 13, marginBottom: 6 }}>
          <div><b>IBAN:</b> {PAYMENT_INFO.iban}</div>
          <div><b>BIC/SWIFT:</b> {PAYMENT_INFO.bic}</div>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginBottom: 18 }}>
          Indique o seu nome ou email na descrição da transferência, para identificarmos o pagamento.
        </p>

        <div className="field">
          <label>{t('sub_proof_of_transfer')} <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{t('sub_image_or_pdf')}</span></label>
          <label
            htmlFor="proof-input"
            className="btn"
            style={{ display: 'block', textAlign: 'center', cursor: 'pointer', marginBottom: 10 }}
          >
            {proofFile ? `📄 ${proofFile.name}` : 'Clique para anexar o comprovativo'}
          </label>
          <input id="proof-input" type="file" accept="image/*,.pdf" onChange={(e) => setProofFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button onClick={requestPayment} className="btn btn-primary btn-block" style={{ marginBottom: 8 }} disabled={submitting}>
          {submitting ? 'A enviar...' : 'Já fiz a transferência'}
        </button>
        <button onClick={handleLogout} className="btn btn-block">{t('sub_logout')}</button>
      </>
    );
  }

  const paidUntil = profile?.subscription_paid_until ? new Date(profile.subscription_paid_until) : null;
  const daysLeft = paidUntil ? Math.ceil((paidUntil - new Date()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <>
      <Header />
      <div className="wrap" style={{ maxWidth: 480, paddingTop: 60, paddingBottom: 80 }}>
        <BackButton fallback="/dashboard" />
        <div className="card" style={{ padding: 30 }}>
          <h1 className="display" style={{ fontSize: 24, marginBottom: 8 }}>{t('sub_agency_title')}</h1>

          {profile?.subscription_status === 'pending' ? (
            <>
              <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 20 }}>
                Recebemos o seu comprovativo. Assim que confirmarmos o pagamento, a sua conta é ativada — normalmente em 1 dia útil.
              </p>
              <div style={{ background: 'var(--plaster)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 13, marginBottom: 4 }}><b>IBAN:</b> {PAYMENT_INFO.iban}</div>
                <div style={{ fontSize: 13 }}><b>BIC/SWIFT:</b> {PAYMENT_INFO.bic}</div>
              </div>
              <button onClick={handleLogout} className="btn btn-block">{t('sub_logout')}</button>
            </>
          ) : profile?.subscription_status === 'expired' ? (
            <>
              <p style={{ fontSize: 14, color: '#8a3b2a', marginBottom: 20 }}>
                A sua assinatura expirou. Renove para voltar a ter acesso ao seu painel e aos seus anúncios.
              </p>
              {renewalBlock()}
            </>
          ) : profile?.subscription_status === 'active' && daysLeft !== null && daysLeft <= 2 ? (
            <>
              <p style={{ fontSize: 14, color: '#8a6a1f', marginBottom: 20 }}>
                {daysLeft <= 0
                  ? 'A sua assinatura termina hoje. Renove já para não perder o acesso.'
                  : `A sua assinatura termina em ${daysLeft} dia${daysLeft === 1 ? '' : 's'} (${paidUntil.toLocaleDateString('pt-PT')}). Renove para continuar sem interrupções.`}
              </p>
              {renewalBlock()}
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 20 }}>
                Como conta de agência, é necessária uma subscrição ativa para aceder ao painel e publicar imóveis. O seu primeiro mês gratuito já terminou.
              </p>
              {renewalBlock()}
            </>
          )}
        </div>
      </div>
    </>
  );
}
