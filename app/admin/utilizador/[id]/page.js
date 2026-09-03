'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabaseClient';
import Header from '../../../../components/Header';
import { accountTypeLabel, isProfessionalAccount } from '../../../../lib/accountTypes';

const STATUS_LABELS = {
  ativo: { label: 'Publicado', color: 'var(--telha)', bg: 'rgba(126,143,106,0.18)' },
  em_revisao: { label: 'Em revisão', color: '#8a6a1f', bg: 'var(--brass)' },
  rejeitado: { label: 'Rejeitado', color: '#8a3b2a', bg: 'rgba(138,59,42,0.12)' },
  desativado: { label: 'Desativado', color: 'var(--text-soft)', bg: 'var(--line)' },
  anulado_suporte: { label: 'Anulado pelo suporte', color: '#8a3b2a', bg: 'rgba(138,59,42,0.12)' },
  eliminado: { label: 'Eliminado pelo utilizador', color: 'var(--text-soft)', bg: 'var(--line)' },
  vendido: { label: 'Vendido', color: 'var(--text-soft)', bg: 'var(--line)' },
  arrendado: { label: 'Arrendado', color: 'var(--text-soft)', bg: 'var(--line)' },
  expirado: { label: 'Expirado', color: 'var(--text-soft)', bg: 'var(--line)' },
};

export default function AdminUserPage() {
  const { id } = useParams();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState(null);
  const [properties, setProperties] = useState([]);
  const [subUntil, setSubUntil] = useState('');
  const [subIndefinite, setSubIndefinite] = useState(false);
  const [savingSub, setSavingSub] = useState(false);
  const [subSaved, setSubSaved] = useState(false);

  useEffect(() => {
    async function checkAndLoad() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: myProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
      if (!myProfile?.is_admin) { setChecking(false); return; }
      setAllowed(true);

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', id).single();
      setProfile(profileData);
      if (profileData?.subscription_paid_until) {
        const isFarFuture = new Date(profileData.subscription_paid_until) > new Date('2090-01-01');
        setSubIndefinite(isFarFuture);
        setSubUntil(isFarFuture ? '' : profileData.subscription_paid_until);
      }

      // Sem filtro de estado — o administrador vê tudo, incluindo desativados, anulados e eliminados
      const { data: propsData } = await supabase
        .from('properties')
        .select('*, property_photos(url, position)')
        .eq('owner_id', id)
        .order('created_at', { ascending: false });
      setProperties(propsData || []);

      setChecking(false);
    }
    checkAndLoad();
  }, [id, router]);

  async function saveSubscription() {
    if (!subIndefinite && !subUntil) {
      alert('Escolha uma data, ou marque "sem data definida (até novas indicações)".');
      return;
    }
    setSavingSub(true);
    const paidUntil = subIndefinite ? '2099-12-31' : subUntil;
    const { error } = await supabase.from('profiles').update({
      subscription_status: 'active',
      subscription_paid_until: paidUntil,
    }).eq('id', profile.id);
    setSavingSub(false);
    if (error) {
      alert(`Não foi possível guardar: ${error.message}`);
      return;
    }
    setProfile((cur) => ({ ...cur, subscription_status: 'active', subscription_paid_until: paidUntil }));
    setSubSaved(true);
    setTimeout(() => setSubSaved(false), 2500);
  }

  async function cancelProperty(propObj) {
    const reason = prompt('Motivo da anulação (visível ao anunciante):');
    if (!reason) return;
    await supabase.from('properties').update({ status: 'anulado_suporte', cancellation_reason: reason }).eq('id', propObj.id);
    await supabase.from('notifications').insert({
      user_id: profile.id,
      message: `⚑ Aviso do Morada: o seu anúncio "${propObj.typology} · ${propObj.address}" foi anulado. Motivo: ${reason}`,
      link: '/dashboard',
    });
    setProperties((cur) => cur.map((p) => (p.id === propObj.id ? { ...p, status: 'anulado_suporte', cancellation_reason: reason } : p)));
  }

  if (checking) return (<><Header /><div className="wrap" style={{ padding: 60 }}>A verificar acesso...</div></>);
  if (!allowed) return (<><Header /><div className="wrap" style={{ padding: 60 }}>Esta página é só para administradores.</div></>);
  if (!profile) return (<><Header /><div className="wrap" style={{ padding: 60 }}>Utilizador não encontrado.</div></>);

  return (
    <>
      <Header />
      <main id="main-content" className="wrap" style={{ padding: '40px 32px 80px' }}>
        <Link href="/admin" style={{ fontSize: 13, color: 'var(--telha)' }}>&larr; Voltar ao admin</Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '18px 0 28px' }}>
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" loading="lazy" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: 'var(--azulejo)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 600,
            }}>
              {(profile.agency_name || profile.full_name || '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="display" style={{ fontSize: 24 }}>{profile.agency_name || profile.full_name}</h1>
            <div className="meta">
              {accountTypeLabel(profile.account_type)}
              {profile.agency_license && ` · ${profile.agency_license}`} · {properties.length} imóveis no total
            </div>
          </div>
        </div>

        {isProfessionalAccount(profile.account_type) && (
          <div className="card" style={{ padding: 20, marginBottom: 28 }}>
            <h2 className="display" style={{ fontSize: 17, marginBottom: 12 }}>💳 Mensalidade / oferta</h2>
            <div style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 14 }}>
              Estado atual: <b>{profile.subscription_status === 'active' ? 'Ativa' : profile.subscription_status || 'Sem informação'}</b>
              {profile.subscription_paid_until && (
                <> · paga até{' '}
                  <b>
                    {new Date(profile.subscription_paid_until) > new Date('2090-01-01')
                      ? 'sem data definida (até novas indicações)'
                      : new Date(profile.subscription_paid_until).toLocaleDateString('pt-PT')}
                  </b>
                </>
              )}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={subIndefinite} onChange={(e) => setSubIndefinite(e.target.checked)} />
              Sem data definida (fica ativo até se indicar o contrário)
            </label>

            {!subIndefinite && (
              <div className="field" style={{ maxWidth: 220, marginBottom: 12 }}>
                <label htmlFor="sub-until-input">Pago/oferecido até</label>
                <input id="sub-until-input" type="date" value={subUntil} onChange={(e) => setSubUntil(e.target.value)} />
              </div>
            )}

            <button onClick={saveSubscription} disabled={savingSub} className="btn btn-primary" style={{ fontSize: 13 }}>
              {savingSub ? 'A guardar...' : 'Guardar'}
            </button>
            {subSaved && <span style={{ fontSize: 12.5, color: 'var(--telha)', marginLeft: 10 }}>✓ Guardado</span>}
          </div>
        )}

        {properties.length === 0 && <p className="empty-state">Este utilizador ainda não publicou nenhum imóvel.</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {properties.map((p) => {
            const st = STATUS_LABELS[p.status] || { label: p.status, color: 'var(--text-soft)', bg: 'var(--line)' };
            const firstPhoto = p.property_photos?.sort((a, b) => a.position - b.position)[0]?.url;
            return (
              <div key={p.id} className="card" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <Link href={`/property/${p.id}`} style={{ flexShrink: 0 }}>
                  {firstPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={firstPhoto} alt={`Foto do imóvel ${p.title || p.typology}`} loading="lazy" style={{ width: 72, height: 56, objectFit: 'cover', borderRadius: 5, display: 'block' }} />
                  ) : (
                    <div style={{ width: 72, height: 56, borderRadius: 5, background: 'linear-gradient(135deg, var(--azulejo), #4A5A3C)' }} />
                  )}
                </Link>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b>{p.typology} · {p.address}</b>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: st.bg, color: st.color }}>
                      {st.label.toUpperCase()}
                    </span>
                  </div>
                  <div className="meta">
                    {Number(p.price).toLocaleString('pt-PT')} € · Publicado em {new Date(p.created_at).toLocaleDateString('pt-PT')}
                  </div>
                  {p.cancellation_reason && (
                    <p style={{ fontSize: 12, color: '#8a3b2a', marginTop: 4 }}>Motivo da anulação: {p.cancellation_reason}</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <a href={`/property/${p.id}`} target="_blank" rel="noopener noreferrer" className="btn" style={{ fontSize: 13 }}>Ver anúncio</a>
                  {p.status === 'ativo' && (
                    <button onClick={() => cancelProperty(p)} className="btn" style={{ fontSize: 13, borderColor: '#8a3b2a', color: '#8a3b2a' }}>
                      Anular
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
