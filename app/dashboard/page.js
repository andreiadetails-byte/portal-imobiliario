'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import { X, Gift } from 'lucide-react';
import ViewsChart from '../../components/ViewsChart';
import { PAYMENT_INFO } from '../../lib/paymentInfo';
import { isProfessionalAccount } from '../../lib/accountTypes';

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
  const [listingFilters, setListingFilters] = useState({ address: '', minPrice: '', maxPrice: '', parish: '', municipality: '' });
  const [appliedListingFilters, setAppliedListingFilters] = useState({ address: '', minPrice: '', maxPrice: '', parish: '', municipality: '' });
  const [listingPages, setListingPages] = useState({});
  const LISTINGS_PER_PAGE = 15;

  function updateListingFilter(key, value) {
    setListingFilters((cur) => ({ ...cur, [key]: value }));
  }
  function runListingSearch(e) {
    e.preventDefault();
    setAppliedListingFilters(listingFilters);
  }
  function clearListingSearch() {
    const empty = { address: '', minPrice: '', maxPrice: '', parish: '', municipality: '' };
    setListingFilters(empty);
    setAppliedListingFilters(empty);
  }
  const [loading, setLoading] = useState(true);
  const [featuredModal, setFeaturedModal] = useState(null);
  const [featuredPaymentMethod, setFeaturedPaymentMethod] = useState('transferencia');
  const [featuredDays, setFeaturedDays] = useState(7);
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

      if (PAYMENT_INFO.subscriptionEnforced && isProfessionalAccount(profileData?.account_type) && !profileData?.is_admin) {
        const isActive = profileData.subscription_status === 'active'
          && profileData.subscription_paid_until
          && new Date(profileData.subscription_paid_until) >= new Date();
        if (!isActive) { router.push('/assinatura'); return; }
      }

      await loadProperties(user.id);

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

  async function deleteProperty(id) {
    if (!confirm('Tem a certeza que quer apagar este anúncio? Pode voltar a publicá-lo mais tarde, se mudar de ideias.')) return;
    await supabase.from('properties').update({ status: 'eliminado' }).eq('id', id);
    setProperties((cur) => cur.map((p) => (p.id === id ? { ...p, status: 'eliminado' } : p)));
    setActiveCount((cur) => Math.max(0, cur - 1));
  }

  async function republishProperty(id) {
    const limit = isProfessionalAccount(profile?.account_type) ? 50 : 3;
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
      setFeaturedPaymentMethod('transferencia');
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
      featured_days: featuredDays,
    }).eq('id', id);
    setProperties((cur) => cur.map((p) => (p.id === id ? { ...p, featured_status: 'pending' } : p)));
    setFeaturedModal(null);
    setFeaturedDays(7);
  }

  if (loading) return (<><Header /><div className="wrap" style={{ padding: 60 }}>...</div></>);

  return (
    <>
      <Header />
    <main id="main-content" className="wrap" style={{ padding: '40px 32px 80px' }}>
      <BackButton fallback="/" />
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
            <X size={16} />
          </button>
          <div className="display" style={{ fontSize: 19, fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gift size={20} /> Bem-vinda! O seu primeiro mês é grátis
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
          <span style={{ fontSize: 12.5, color: activeCount >= (isProfessionalAccount(profile?.account_type) ? 50 : 3) ? '#8a3b2a' : 'var(--text-soft)' }}>
            {activeCount}/{isProfessionalAccount(profile?.account_type) ? 50 : 3} anúncios
          </span>
        )}
      </div>

      {properties.length > 0 && (
        <form onSubmit={runListingSearch} className="card" style={{ padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 10 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 12 }}>Morada</label>
              <input type="text" value={listingFilters.address} onChange={(e) => updateListingFilter('address', e.target.value)} placeholder="Rua, número..." />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 12 }}>Preço</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="number" value={listingFilters.minPrice} onChange={(e) => updateListingFilter('minPrice', e.target.value)} placeholder="Desde" />
                <span style={{ color: 'var(--text-soft)', fontSize: 12 }}>—</span>
                <input type="number" value={listingFilters.maxPrice} onChange={(e) => updateListingFilter('maxPrice', e.target.value)} placeholder="Até" />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 12 }}>Freguesia</label>
              <input type="text" value={listingFilters.parish} onChange={(e) => updateListingFilter('parish', e.target.value)} placeholder="Freguesia" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 12 }}>Concelho</label>
              <input type="text" value={listingFilters.municipality} onChange={(e) => updateListingFilter('municipality', e.target.value)} placeholder="Concelho" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" style={{ fontSize: 13 }}>Pesquisar</button>
            <button type="button" onClick={clearListingSearch} className="btn" style={{ fontSize: 13 }}>Limpar</button>
          </div>
        </form>
      )}
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
            const matchesSearch = (p) => {
              const { address, minPrice, maxPrice, parish, municipality } = appliedListingFilters;
              if (address && !(p.address || '').toLowerCase().includes(address.trim().toLowerCase())) return false;
              if (minPrice && Number(p.price || 0) < Number(minPrice)) return false;
              if (maxPrice && Number(p.price || 0) > Number(maxPrice)) return false;
              if (parish && !(p.parish || '').toLowerCase().includes(parish.trim().toLowerCase())) return false;
              if (municipality && !(p.municipality || '').toLowerCase().includes(municipality.trim().toLowerCase())) return false;
              return true;
            };
            const group = properties.filter((p) => match(p) && matchesSearch(p));
            if (group.length === 0) return null;
            const currentPage = listingPages[key] || 1;
            const totalPages = Math.ceil(group.length / LISTINGS_PER_PAGE);
            const pageItems = group.slice((currentPage - 1) * LISTINGS_PER_PAGE, currentPage * LISTINGS_PER_PAGE);
            return (
              <div key={key}>
                <h2 className="display" style={{ fontSize: 15, marginBottom: 10, color: 'var(--text-soft)' }}>
                  {title} <span style={{ fontWeight: 400 }}>({group.length})</span>
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pageItems.map((p) => {
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
                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 4 }}>
                    <button
                      onClick={() => setListingPages((cur) => ({ ...cur, [key]: currentPage - 1 }))}
                      disabled={currentPage <= 1}
                      className="btn"
                      style={{ fontSize: 12.5, opacity: currentPage <= 1 ? 0.4 : 1 }}
                    >
                      ← Anterior
                    </button>
                    <span style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setListingPages((cur) => ({ ...cur, [key]: currentPage + 1 }))}
                      disabled={currentPage >= totalPages}
                      className="btn"
                      style={{ fontSize: 12.5, opacity: currentPage >= totalPages ? 0.4 : 1 }}
                    >
                      Seguinte →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {properties.length > 0 && Object.values(appliedListingFilters).some(Boolean) && properties.filter((p) => {
        const { address, minPrice, maxPrice, parish, municipality } = appliedListingFilters;
        if (address && !(p.address || '').toLowerCase().includes(address.trim().toLowerCase())) return false;
        if (minPrice && Number(p.price || 0) < Number(minPrice)) return false;
        if (maxPrice && Number(p.price || 0) > Number(maxPrice)) return false;
        if (parish && !(p.parish || '').toLowerCase().includes(parish.trim().toLowerCase())) return false;
        if (municipality && !(p.municipality || '').toLowerCase().includes(municipality.trim().toLowerCase())) return false;
        return true;
      }).length === 0 && (
        <p className="empty-state">Nenhum anúncio corresponde à pesquisa.</p>
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

          <div className="field">
            <label>Durante quantos dias?</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {[7, 15, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFeaturedDays(d)}
                  className={featuredDays === d ? 'btn btn-primary' : 'btn'}
                  style={{ flex: 1, fontSize: 13 }}
                >
                  {d} dias
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              max={90}
              value={featuredDays}
              onChange={(e) => setFeaturedDays(Math.max(1, Math.min(90, Number(e.target.value) || 1)))}
              style={{ fontSize: 13 }}
            />
          </div>

          <div style={{
            background: 'rgba(126,143,106,0.14)', borderRadius: 8, padding: 16, marginBottom: 18,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>Total a pagar agora</span>
            <b style={{ fontSize: 20, color: 'var(--telha)' }}>
              {(PAYMENT_INFO.activationFee + PAYMENT_INFO.dailyFee * featuredDays).toFixed(2)} €
            </b>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            <button
              onClick={() => setFeaturedPaymentMethod('transferencia')}
              className={featuredPaymentMethod === 'transferencia' ? 'btn btn-primary' : 'btn'}
              style={{ flex: 1, fontSize: 13 }}
            >
              Transferência
            </button>
            <button
              onClick={() => setFeaturedPaymentMethod('referencia')}
              className={featuredPaymentMethod === 'referencia' ? 'btn btn-primary' : 'btn'}
              style={{ flex: 1, fontSize: 13 }}
            >
              Entidade e Referência
            </button>
          </div>

          {featuredPaymentMethod === 'referencia' ? (
            <>
              <div style={{ background: 'var(--plaster)', borderRadius: 8, padding: 16, marginBottom: 18, textAlign: 'center' }}>
                <p style={{ fontSize: 13, marginBottom: 4 }}>🚧 Brevemente disponível</p>
                <p style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                  Em breve vai poder gerar aqui uma Entidade e Referência Multibanco, para pagar em qualquer caixa
                  ATM ou homebanking, com ativação automática. Por agora, use a transferência bancária.
                </p>
              </div>
              <button onClick={() => setFeaturedPaymentMethod('transferencia')} className="btn btn-block" style={{ marginBottom: 8 }}>
                Usar transferência bancária
              </button>
              <button onClick={() => setFeaturedModal(null)} className="btn btn-block">Cancelar</button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Pagamento por transferência bancária:</p>
              <div style={{ fontSize: 13, marginBottom: 6 }}>
                <div><b>IBAN:</b> {PAYMENT_INFO.iban}</div>
                <div><b>BIC/SWIFT:</b> {PAYMENT_INFO.bic}</div>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginBottom: 18 }}>
                Transfira <b>{(PAYMENT_INFO.activationFee + PAYMENT_INFO.dailyFee * featuredDays).toFixed(2)} €</b> e indique o número de referência <b>{featuredModal.slice(0, 8)}</b> na descrição da transferência.
                Depois de recebermos o pagamento, o destaque é ativado manualmente (normalmente em 1 dia útil), e dura {featuredDays} dias a partir da ativação.
              </p>

              <button onClick={() => requestFeatured(featuredModal)} className="btn btn-primary btn-block" style={{ marginBottom: 8 }}>
                Já fiz a transferência
              </button>
              <button onClick={() => setFeaturedModal(null)} className="btn btn-block">Cancelar</button>
            </>
          )}
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
