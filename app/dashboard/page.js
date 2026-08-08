'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import Header from '../../components/Header';
import { PAYMENT_INFO } from '../../lib/paymentInfo';

const STATUS_LABELS = {
  ativo: { label: 'Publicado', color: 'var(--telha)', bg: 'rgba(126,143,106,0.18)' },
  em_revisao: { label: 'Em revisão', color: '#8a6a1f', bg: 'var(--brass)' },
  rejeitado: { label: 'Rejeitado', color: '#8a3b2a', bg: 'rgba(138,59,42,0.12)' },
  desativado: { label: 'Desativado', color: 'var(--text-soft)', bg: 'var(--line)' },
  anulado_suporte: { label: 'Anulado pelo suporte', color: '#8a3b2a', bg: 'rgba(138,59,42,0.12)' },
  eliminado: { label: 'Eliminado', color: 'var(--text-soft)', bg: 'var(--line)' },
  vendido: { label: 'Vendido', color: 'var(--text-soft)', bg: 'var(--line)' },
  arrendado: { label: 'Arrendado', color: 'var(--text-soft)', bg: 'var(--line)' },
  expirado: { label: 'Expirado', color: 'var(--text-soft)', bg: 'var(--line)' },
};

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [properties, setProperties] = useState([]);
  const [leads, setLeads] = useState([]);
  const [supportThreads, setSupportThreads] = useState([]);
  const [replyText, setReplyText] = useState({});
  const [loading, setLoading] = useState(true);
  const [featuredModal, setFeaturedModal] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);

      if (PAYMENT_INFO.subscriptionEnforced && profileData?.account_type === 'agencia') {
        const isActive = profileData.subscription_status === 'active'
          && profileData.subscription_paid_until
          && new Date(profileData.subscription_paid_until) >= new Date();
        if (!isActive) { router.push('/assinatura'); return; }
      }

      const { data: propsData } = await supabase
        .from('properties')
        .select('*, property_photos(url, position)')
        .eq('owner_id', user.id)
        .neq('status', 'eliminado')
        .order('created_at', { ascending: false });
      setProperties(propsData || []);

      const { data: leadsData } = await supabase
        .from('leads').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(10);
      setLeads(leadsData || []);

      await loadSupport(user.id);

      setLoading(false);
    }
    load();
  }, [router]);

  async function loadSupport(uid) {
    const { data: requests } = await supabase
      .from('support_requests').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    const withReplies = await Promise.all((requests || []).map(async (r) => {
      const { data: replies } = await supabase
        .from('support_replies').select('*').eq('support_request_id', r.id).order('created_at', { ascending: true });
      // marca respostas do admin como lidas ao abrir o painel
      await supabase.from('support_replies').update({ read_by_user: true })
        .eq('support_request_id', r.id).eq('sender_role', 'admin').eq('read_by_user', false);
      return { ...r, replies: replies || [] };
    }));
    setSupportThreads(withReplies);
  }

  async function sendSupportReply(requestId) {
    const text = (replyText[requestId] || '').trim();
    if (!text) return;
    await supabase.from('support_replies').insert({ support_request_id: requestId, sender_role: 'user', message: text });
    setReplyText((cur) => ({ ...cur, [requestId]: '' }));
    loadSupport(userId);
  }

  async function markLeadReplied(leadId) {
    await supabase.from('leads').update({ status: 'respondido' }).eq('id', leadId);
    setLeads((cur) => cur.map((l) => (l.id === leadId ? { ...l, status: 'respondido' } : l)));
  }

  async function deleteProperty(id) {
    if (!confirm('Tem a certeza que quer apagar este anúncio? Esta ação não pode ser desfeita.')) return;
    await supabase.from('properties').update({ status: 'eliminado' }).eq('id', id);
    setProperties((cur) => cur.filter((p) => p.id !== id));
  }

  async function deactivateProperty(id) {
    await supabase.from('properties').update({ status: 'desativado' }).eq('id', id);
    setProperties((cur) => cur.map((p) => (p.id === id ? { ...p, status: 'desativado' } : p)));
  }

  async function reactivateProperty(id) {
    await supabase.from('properties').update({ status: 'em_revisao' }).eq('id', id);
    setProperties((cur) => cur.map((p) => (p.id === id ? { ...p, status: 'em_revisao' } : p)));
  }

  async function requestFeatured(id) {
    const currentFeaturedCount = properties.filter((p) => p.featured_status === 'pending' || p.featured_status === 'active').length;
    if (currentFeaturedCount >= 3) {
      alert('Só pode ter até 3 anúncios em destaque ao mesmo tempo. Termine ou aguarde que outro deixe de estar em destaque antes de pedir mais um.');
      setFeaturedModal(null);
      return;
    }
    await supabase.from('properties').update({
      featured_status: 'pending',
      featured_requested_at: new Date().toISOString(),
    }).eq('id', id);
    setProperties((cur) => cur.map((p) => (p.id === id ? { ...p, featured_status: 'pending' } : p)));
    setFeaturedModal(null);
  }

  if (loading) return (<><Header /><div className="wrap" style={{ padding: 60 }}>...</div></>);

  return (
    <>
      <Header />
    <div className="wrap" style={{ padding: '40px 32px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="display" style={{ fontSize: 28 }}>{t('dashboard_hi')}, {profile?.full_name || ''}</h1>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link href="/publish" className="btn btn-primary">{t('dashboard_new')}</Link>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 className="display" style={{ fontSize: 18 }}>{t('dashboard_my_listings')}</h2>
        <span style={{ fontSize: 12.5, color: properties.length >= 50 ? '#8a3b2a' : 'var(--text-soft)' }}>
          {properties.length}/50 anúncios
        </span>
      </div>
      {properties.length === 0 ? (
        <p className="empty-state">{t('dashboard_none_listings')}</p>
      ) : (
        <div className="card" style={{ marginBottom: 40 }}>
          {properties.map((p) => {
            const st = STATUS_LABELS[p.status] || { label: p.status, color: 'var(--text-soft)', bg: 'var(--line)' };
            const firstPhoto = p.property_photos?.sort((a, b) => a.position - b.position)[0]?.url;
            const isLocked = p.status === 'anulado_suporte' || p.status === 'eliminado';
            return (
              <div key={p.id} style={{ display: 'flex', gap: 14, padding: '14px 18px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
                {firstPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={firstPhoto} alt="" style={{ width: 64, height: 50, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 64, height: 50, borderRadius: 5, background: 'linear-gradient(135deg, var(--azulejo), #4A5A3C)', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b>{p.typology} · {p.address}</b>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: st.bg, color: st.color }}>
                      {st.label.toUpperCase()}
                    </span>
                    {p.featured_status === 'active' && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'var(--brass)', color: '#5C4E2A' }}>★ DESTAQUE</span>
                    )}
                    {p.featured_status === 'pending' && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'var(--line)', color: 'var(--text-soft)' }}>Pagamento pendente</span>
                    )}
                  </div>
                  <div className="meta">
                    {p.internal_reference && `Ref. ${p.internal_reference} · `}
                    {Number(p.price).toLocaleString('pt-PT')} € · Publicado em {new Date(p.created_at).toLocaleDateString('pt-PT')} · {p.views_count || 0} visualizações
                  </div>
                  {p.status === 'anulado_suporte' && p.cancellation_reason && (
                    <p style={{ fontSize: 12, color: '#8a3b2a', marginTop: 4 }}>Motivo: {p.cancellation_reason}</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                  {!isLocked && p.featured_status === 'none' && p.status === 'ativo' && (
                    <button onClick={() => setFeaturedModal(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--telha)' }}>
                      ★ Destacar
                    </button>
                  )}
                  {!isLocked && p.status === 'ativo' && (
                    <button onClick={() => deactivateProperty(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-soft)' }}>
                      Desativar
                    </button>
                  )}
                  {!isLocked && p.status === 'desativado' && (
                    <button onClick={() => reactivateProperty(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--telha)' }}>
                      Reativar
                    </button>
                  )}
                  {!isLocked && (
                    <Link href={`/publish?edit=${p.id}`} style={{ fontSize: 13, color: 'var(--telha)' }}>Editar</Link>
                  )}
                  <Link href={`/property/${p.id}`} style={{ fontSize: 13, color: 'var(--telha)' }}>{t('dashboard_view')}</Link>
                  <button onClick={() => deleteProperty(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#8a3b2a' }}>
                    Apagar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="display" style={{ fontSize: 18, marginBottom: 14 }}>{t('dashboard_recent_leads')}</h2>
      {leads.length === 0 ? (
        <p className="empty-state">{t('dashboard_none_leads')}</p>
      ) : (
        <div className="card" style={{ marginBottom: 40 }}>
          {leads.map((l) => (
            <div key={l.id} style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <b>{l.name}</b>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 12,
                               background: l.status === 'novo' ? 'rgba(126,143,106,0.18)' : 'var(--line)',
                               color: l.status === 'novo' ? 'var(--telha)' : 'var(--text-soft)' }}>
                  {l.status === 'novo' ? t('dashboard_new_status') : t('dashboard_done_status')}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: '4px 0' }}>{l.message}</p>
              {l.status === 'novo' && (
                <button onClick={() => markLeadReplied(l.id)} className="btn" style={{ fontSize: 12, padding: '6px 12px' }}>
                  {t('dashboard_mark_replied')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <h2 className="display" style={{ fontSize: 18, marginBottom: 14 }}>As minhas mensagens de suporte</h2>
      {supportThreads.length === 0 ? (
        <p className="empty-state">Ainda não enviou nenhuma mensagem de suporte.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {supportThreads.map((r) => (
            <div key={r.id} className="card" style={{ padding: 16 }}>
              <div className="meta" style={{ marginBottom: 8 }}>
                Conversa com a agente {r.agent_name} · {new Date(r.created_at).toLocaleDateString('pt-PT')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                <div style={{ alignSelf: 'flex-end', maxWidth: '80%', background: 'var(--telha)', color: '#fff', padding: '8px 12px', borderRadius: 10, fontSize: 13.5 }}>
                  {r.message}
                </div>
                {r.replies.map((rep) => (
                  <div
                    key={rep.id}
                    style={{
                      alignSelf: rep.sender_role === 'admin' ? 'flex-start' : 'flex-end',
                      maxWidth: '80%', padding: '8px 12px', borderRadius: 10, fontSize: 13.5,
                      background: rep.sender_role === 'admin' ? 'var(--plaster)' : 'var(--telha)',
                      color: rep.sender_role === 'admin' ? 'var(--ink)' : '#fff',
                    }}
                  >
                    {rep.message}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={replyText[r.id] || ''}
                  onChange={(e) => setReplyText((cur) => ({ ...cur, [r.id]: e.target.value }))}
                  placeholder="Escreva uma mensagem..."
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 20, border: '1px solid var(--line)', fontSize: 13 }}
                />
                <button onClick={() => sendSupportReply(r.id)} className="btn btn-primary" style={{ fontSize: 12.5 }}>Enviar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {featuredModal && (
      <div
        onClick={() => setFeaturedModal(null)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(51,46,34,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      >
        <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: 380, padding: 26 }}>
          <h3 className="display" style={{ fontSize: 19, marginBottom: 6 }}>★ Destacar anúncio</h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-soft)', marginBottom: 18 }}>
            Anúncios em destaque aparecem com mais visibilidade nos resultados de pesquisa.
          </p>

          <div style={{ background: 'var(--plaster)', borderRadius: 8, padding: 16, marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6 }}>
              <span>Ativação (pagamento único)</span><b>{PAYMENT_INFO.activationFee.toFixed(2)} €</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
              <span>Por dia em destaque</span><b>{PAYMENT_INFO.dailyFee.toFixed(2)} €</b>
            </div>
          </div>

          <p style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Pagamento por transferência bancária:</p>
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            <div><b>IBAN:</b> {PAYMENT_INFO.iban}</div>
            <div><b>Titular:</b> {PAYMENT_INFO.accountHolder}</div>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginBottom: 18 }}>
            Indique o número de referência <b>{featuredModal.slice(0, 8)}</b> na descrição da transferência.
            Depois de recebermos o pagamento, o destaque é ativado manualmente (normalmente em 1 dia útil).
          </p>

          <button onClick={() => requestFeatured(featuredModal)} className="btn btn-primary btn-block" style={{ marginBottom: 8 }}>
            Já fiz a transferência
          </button>
          <button onClick={() => setFeaturedModal(null)} className="btn btn-block">Cancelar</button>
        </div>
      </div>
    )}
    </>
  );
}
