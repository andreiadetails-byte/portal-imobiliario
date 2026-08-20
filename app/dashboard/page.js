'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import Header from '../../components/Header';
import ViewsChart from '../../components/ViewsChart';
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

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWelcomeAgency = searchParams.get('welcome') === 'agencia';
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [properties, setProperties] = useState([]);
  const [leads, setLeads] = useState([]);
  const [supportThreads, setSupportThreads] = useState([]);
  const [replyText, setReplyText] = useState({});
  const [loading, setLoading] = useState(true);
  const [featuredModal, setFeaturedModal] = useState(null);
  const [viewsChartId, setViewsChartId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalProperties, setTotalProperties] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);

      if (PAYMENT_INFO.subscriptionEnforced && profileData?.account_type === 'agencia' && !profileData?.is_admin) {
        const isActive = profileData.subscription_status === 'active'
          && profileData.subscription_paid_until
          && new Date(profileData.subscription_paid_until) >= new Date();
        if (!isActive) { router.push('/assinatura'); return; }
      }

      await loadProperties(user.id);

      const { data: leadsData } = await supabase
        .from('leads').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(10);
      setLeads(leadsData || []);

      await loadSupport(user.id);

      setLoading(false);
    }
    load();
  }, [router]);

  async function loadProperties(uid) {
    const { data: propsData, count } = await supabase
      .from('properties')
      .select('*, property_photos(url, position)', { count: 'exact' })
      .eq('owner_id', uid)
      .order('created_at', { ascending: false });
    setProperties(propsData || []);
    setTotalProperties(count || 0);

    const activeOnly = (propsData || []).filter((p) => p.status !== 'eliminado').length;
    setActiveCount(activeOnly);
  }

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
    if (!confirm('Tem a certeza que quer apagar este anúncio? Pode voltar a publicá-lo mais tarde, se mudar de ideias.')) return;
    await supabase.from('properties').update({ status: 'eliminado' }).eq('id', id);
    setProperties((cur) => cur.map((p) => (p.id === id ? { ...p, status: 'eliminado' } : p)));
    setActiveCount((cur) => Math.max(0, cur - 1));
  }

  async function republishProperty(id) {
    const limit = profile?.account_type === 'agencia' ? 50 : 5;
    if (!profile?.is_admin && activeCount >= limit) {
      alert(`Já tem ${limit} anúncios ativos, que é o limite da sua conta. Apague ou desative outro anúncio primeiro.`);
      return;
    }
    await supabase.from('properties').update({ status: 'ativo' }).eq('id', id);
    setProperties((cur) => cur.map((p) => (p.id === id ? { ...p, status: 'ativo' } : p)));
    setActiveCount((cur) => cur + 1);
  }

  async function deactivateProperty(id) {
    await supabase.from('properties').update({ status: 'desativado' }).eq('id', id);
    setProperties((cur) => cur.map((p) => (p.id === id ? { ...p, status: 'desativado' } : p)));
  }

  async function reactivateProperty(id) {
    await supabase.from('properties').update({ status: 'em_revisao' }).eq('id', id);
    setProperties((cur) => cur.map((p) => (p.id === id ? { ...p, status: 'em_revisao' } : p)));
  }

  async function cancelFeatured(id) {
    await supabase.from('properties').update({ featured_status: 'none' }).eq('id', id);
    setProperties((cur) => cur.map((p) => (p.id === id ? { ...p, featured_status: 'none' } : p)));
  }

  async function countFeatured() {
    const { count } = await supabase
      .from('properties').select('id', { count: 'exact', head: true })
      .eq('owner_id', userId).in('featured_status', ['pending', 'active']);
    return count || 0;
  }

  async function toggleFeaturedButtonClick(id) {
    if (!profile?.is_admin && (await countFeatured()) >= 3) {
      alert('Só pode ter até 3 anúncios em destaque ao mesmo tempo. Tem de anular o destaque de um deles antes de destacar outro.');
      return;
    }
    if (PAYMENT_INFO.featuredEnforced && !profile?.is_admin) {
      setFeaturedModal(id);
      return;
    }
    // Destaque grátis por agora (ou administradora, sempre): ativa logo, sem pedir pagamento.
    await supabase.from('properties').update({
      featured_status: 'active',
      featured_activated_at: new Date().toISOString(),
    }).eq('id', id);
    setProperties((cur) => cur.map((p) => (p.id === id ? { ...p, featured_status: 'active' } : p)));
  }

  async function requestFeatured(id) {
    if ((await countFeatured()) >= 3) {
      alert('Só pode ter até 3 anúncios em destaque ao mesmo tempo. Tem de anular o destaque de um deles antes de destacar outro.');
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
    <main id="main-content" className="wrap" style={{ padding: '40px 32px 80px' }}>
      {isWelcomeAgency && !welcomeDismissed && (
        <div style={{
          background: 'linear-gradient(135deg, var(--telha) 0%, #3E4A32 100%)', borderRadius: 10,
          padding: '20px 24px', marginBottom: 28, color: '#fff', position: 'relative',
        }}>
          <button
            onClick={() => setWelcomeDismissed(true)}
            aria-label="Fechar aviso"
            style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}
          >
            ✕
          </button>
          <div className="display" style={{ fontSize: 19, fontWeight: 600, marginBottom: 6 }}>
            🎁 Bem-vinda! O seu primeiro mês é grátis
          </div>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.9)', maxWidth: 560 }}>
            Como conta de agência, tem acesso total ao painel durante 1 mês, sem qualquer custo. Depois desse período,
            a mensalidade é de {PAYMENT_INFO.subscriptionFee.toFixed(2)} €/mês, com pagamento por transferência bancária.
            Vai receber um aviso antes de o mês grátis terminar.
          </p>
        </div>
      )}

      <h1 className="display" style={{ fontSize: 28, marginBottom: 32 }}>{t('dashboard_hi')}, {profile?.full_name || ''}</h1>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 className="display" style={{ fontSize: 18 }}>{t('dashboard_my_listings')}</h2>
        {profile?.is_admin ? (
          <span style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>{activeCount} anúncios · sem limite</span>
        ) : (
          <span style={{ fontSize: 12.5, color: activeCount >= (profile?.account_type === 'agencia' ? 50 : 5) ? '#8a3b2a' : 'var(--text-soft)' }}>
            {activeCount}/{profile?.account_type === 'agencia' ? 50 : 5} anúncios
          </span>
        )}
      </div>
      {properties.length === 0 ? (
        <p className="empty-state">{t('dashboard_none_listings')}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 40, alignItems: 'start' }}>
          {[
            { key: 'pendente', title: 'Pendentes (em revisão)', match: (p) => p.status === 'em_revisao' },
            { key: 'ativo', title: 'Publicados', match: (p) => ['ativo', 'desativado', 'vendido', 'arrendado', 'expirado'].includes(p.status) },
            { key: 'eliminado', title: 'Eliminados', match: (p) => p.status === 'eliminado' },
            { key: 'outros', title: 'Recusados ou anulados', match: (p) => ['rejeitado', 'anulado_suporte'].includes(p.status) },
          ].map(({ key, title, match }) => {
            const group = properties.filter(match);
            if (group.length === 0) return null;
            return (
              <div key={key}>
                <h2 className="display" style={{ fontSize: 15, marginBottom: 10, color: 'var(--text-soft)' }}>
                  {title} <span style={{ fontWeight: 400 }}>({group.length})</span>
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {group.map((p) => {
                    const st = STATUS_LABELS[p.status] || { label: p.status, color: 'var(--text-soft)', bg: 'var(--line)' };
                    const firstPhoto = p.property_photos?.sort((a, b) => a.position - b.position)[0]?.url;
                    const isLocked = p.status === 'anulado_suporte' || p.status === 'eliminado';
                    return (
                      <div key={p.id} className="card" style={{ padding: 12, display: 'flex', gap: 10 }}>
                        <Link href={`/property/${p.id}`} style={{ flexShrink: 0 }}>
                          {firstPhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={firstPhoto} alt={`Foto do anúncio ${p.title || p.typology}`} loading="lazy" style={{ width: 64, height: 50, objectFit: 'cover', borderRadius: 5, display: 'block' }} />
                          ) : (
                            <div style={{ width: 64, height: 50, borderRadius: 5, background: 'linear-gradient(135deg, var(--azulejo), #4A5A3C)' }} />
                          )}
                        </Link>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                            <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: st.bg, color: st.color }}>
                              {st.label.toUpperCase()}
                            </span>
                            {p.featured_status === 'active' && <span style={{ fontSize: 11 }}>★</span>}
                          </div>
                          <b style={{ fontSize: 12.5, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.typology} · {p.address}</b>
                          <div className="meta" style={{ marginTop: 1, marginBottom: 0, fontSize: 11 }}>
                            {Number(p.price).toLocaleString('pt-PT')} €
                          </div>
                          {p.status === 'anulado_suporte' && p.cancellation_reason && (
                            <p style={{ fontSize: 10.5, color: '#8a3b2a', marginTop: 2, marginBottom: 0 }}>Motivo: {p.cancellation_reason}</p>
                          )}

                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                            {!isLocked && p.featured_status === 'none' && p.status === 'ativo' && (
                              <button onClick={() => toggleFeaturedButtonClick(p.id)} className="btn" style={{ fontSize: 10.5, padding: '4px 9px' }}>
                                Destacar
                              </button>
                            )}
                            {(p.featured_status === 'active' || p.featured_status === 'pending') && (
                              <button onClick={() => cancelFeatured(p.id)} className="btn" style={{ fontSize: 10.5, padding: '4px 9px' }}>
                                Anular destaque
                              </button>
                            )}
                            {!isLocked && p.status === 'ativo' && (
                              <button onClick={() => deactivateProperty(p.id)} className="btn" style={{ fontSize: 10.5, padding: '4px 9px' }}>
                                Desativar
                              </button>
                            )}
                            {!isLocked && p.status === 'desativado' && (
                              <button onClick={() => reactivateProperty(p.id)} className="btn" style={{ fontSize: 10.5, padding: '4px 9px' }}>
                                Reativar
                              </button>
                            )}
                            {p.status === 'eliminado' && (
                              <button onClick={() => republishProperty(p.id)} className="btn" style={{ fontSize: 10.5, padding: '4px 9px' }}>
                                Republicar
                              </button>
                            )}
                            {p.status !== 'anulado_suporte' && (
                              <Link href={`/publish?edit=${p.id}`} className="btn" style={{ fontSize: 10.5, padding: '4px 9px' }}>Editar</Link>
                            )}
                            {p.status !== 'eliminado' && (
                              <Link href={`/property/${p.id}`} className="btn" style={{ fontSize: 10.5, padding: '4px 9px' }}>Ver anúncio</Link>
                            )}
                            {p.status !== 'eliminado' && p.status !== 'anulado_suporte' && (
                              <button onClick={() => deleteProperty(p.id)} className="btn" style={{ fontSize: 10.5, padding: '4px 9px' }}>
                                Apagar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
    </main>

    {featuredModal && (
      <div
        onClick={() => setFeaturedModal(null)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(51,46,34,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      >
        <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: 380, maxWidth: 'calc(100vw - 32px)', padding: 26 }}>
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
            <div><b>BIC/SWIFT:</b> {PAYMENT_INFO.bic}</div>
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

    {viewsChartId && <ViewsChart propertyId={viewsChartId} onClose={() => setViewsChartId(null)} />}
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="wrap" style={{ padding: 60 }}>...</div>}>
      <DashboardInner />
    </Suspense>
  );
}
