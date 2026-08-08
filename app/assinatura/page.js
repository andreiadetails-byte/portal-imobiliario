'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/Header';
import { PAYMENT_INFO } from '../../lib/paymentInfo';

export default function AssinaturaPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
    await supabase.from('profiles').update({
      subscription_status: 'pending',
      subscription_requested_at: new Date().toISOString(),
    }).eq('id', user.id);
    setProfile((cur) => ({ ...cur, subscription_status: 'pending' }));
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
            <span>Mensalidade</span><b>{PAYMENT_INFO.subscriptionFee.toFixed(2)} €/mês</b>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-soft)', marginTop: 6 }}>
            Até {PAYMENT_INFO.subscriptionListingsLimit} anúncios ativos. Sem fidelização — cancele quando quiser, sem multas.
          </div>
        </div>

        <p style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Pagamento por transferência bancária:</p>
        <div style={{ fontSize: 13, marginBottom: 6 }}>
          <div><b>IBAN:</b> {PAYMENT_INFO.iban}</div>
          <div><b>Titular:</b> {PAYMENT_INFO.accountHolder}</div>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginBottom: 18 }}>
          Indique o seu nome ou email na descrição da transferência, para identificarmos o pagamento.
        </p>

        <button onClick={requestPayment} className="btn btn-primary btn-block" style={{ marginBottom: 8 }}>
          Já fiz a transferência
        </button>
        <button onClick={handleLogout} className="btn btn-block">Terminar sessão</button>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="wrap" style={{ maxWidth: 480, padding: '60px 32px 80px' }}>
        <div className="card" style={{ padding: 30 }}>
          <h1 className="display" style={{ fontSize: 24, marginBottom: 8 }}>Assinatura de agência</h1>

          {profile?.subscription_status === 'pending' ? (
            <>
              <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 20 }}>
                Recebemos o seu pedido. Assim que confirmarmos o pagamento, a sua conta é ativada — normalmente em 1 dia útil.
              </p>
              <div style={{ background: 'var(--plaster)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 13, marginBottom: 4 }}><b>IBAN:</b> {PAYMENT_INFO.iban}</div>
                <div style={{ fontSize: 13 }}><b>Titular:</b> {PAYMENT_INFO.accountHolder}</div>
              </div>
              <button onClick={handleLogout} className="btn btn-block">Terminar sessão</button>
            </>
          ) : profile?.subscription_status === 'expired' ? (
            <>
              <p style={{ fontSize: 14, color: '#8a3b2a', marginBottom: 20 }}>
                A sua assinatura expirou. Renove para voltar a ter acesso ao seu painel e aos seus anúncios.
              </p>
              {renewalBlock()}
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 20 }}>
                Como conta de agência, é necessária uma subscrição para aceder ao painel e publicar imóveis.
              </p>
              {renewalBlock()}
            </>
          )}
        </div>
      </div>
    </>
  );
}
