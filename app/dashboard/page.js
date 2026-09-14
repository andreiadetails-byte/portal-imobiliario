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
import { normalizeSearchText } from '../../lib/normalizeSearch';

const STATUS_LABELS = {
  ativo: { labelKey: 'dash_status_active', color: 'var(--telha)', bg: 'rgba(126,143,106,0.18)' },
  em_revisao: { labelKey: 'dash_status_review', color: '#8a6a1f', bg: 'var(--brass)' },
  rejeitado: { labelKey: 'dash_status_rejected', color: '#8a3b2a', bg: 'rgba(138,59,42,0.12)' },
  desativado: { labelKey: 'dash_status_deactivated', color: 'var(--text-soft)', bg: 'var(--line)' },
  anulado_suporte: { labelKey: 'dash_status_cancelled_support', color: '#8a3b2a', bg: 'rgba(138,59,42,0.12)' },
  eliminado: { labelKey: 'dash_status_deleted', color: 'var(--text-soft)', bg: 'var(--line)' },
  vendido: { labelKey: 'dash_status_sold', color: 'var(--text-soft)', bg: 'var(--line)' },
  arrendado: { labelKey: 'dash_status_rented', color: 'var(--text-soft)', bg: 'var(--line)' },
  expirado: { labelKey: 'dash_status_expired', color: 'var(--text-soft)', bg: 'var(--line)' },
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
  const [activeListingTab, setActiveListingTab] = useState('ativo');

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
  const [featuredProofFile, setFeaturedProofFile] = useState(null);
  const [uploadingFeaturedProof, setUploadingFeaturedProof] = useState(false);
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
      .select('*, property_photos(url, thumbnail_url, position)', { count: 'exact' })
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

  async function deletePropertyPermanently(id) {
    if (!confirm(t('dash_delete_permanently_confirm'))) return;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/delete-property-permanently', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ propertyId: id }),
    });
    if (res.ok) {
      setProperties((cur) => cur.filter((p) => p.id !== id));
    } else {
      const { error } = await res.json();
      alert(`Não foi possível apagar definitivamente: ${error}`);
    }
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

    let proofUrl = null;
    if (featuredProofFile) {
      setUploadingFeaturedProof(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const body = new FormData();
        body.append('file', featuredProofFile);
        body.append('propertyId', `featured-${id}`);
        body.append('type', 'document');
        const res = await fetch('/api/upload-photo-r2', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body,
        });
        if (res.ok) {
          const data = await res.json();
          proofUrl = data.url;
        }
      } catch (err) {
        // Se o envio do comprovativo falhar, o pedido segue mesmo assim —
        // a pessoa pode sempre mostrar o comprovativo depois, por email.
      }
      setUploadingFeaturedProof(false);
    }

    await supabase.from('properties').update({
      featured_status: 'pending',
      featured_requested_at: new Date().toISOString(),
      featured_days: featuredDays,
      featured_proof_url: proofUrl,
    }).eq('id', id);
    setProperties((cur) => cur.map((p) => (p.id === id ? { ...p, featured_status: 'pending' } : p)));
    setFeaturedModal(null);
    setFeaturedDays(7);
    setFeaturedProofFile(null);
  }

  if (loading) return (<><Header /><div className="wrap" style={{ padding: 60 }}>...</div></>);

  return (
    <>
      <Header />
    <main id="main-content" className="wrap" style={{ padding: '24px 32px 80px', background: 'var(--paper)', borderRadius: 16, marginTop: 24 }}>
      <BackButton fallback="/" />
      {isWelcomeAgency && !welcomeDismissed && (() => {
        // Calcula quantos meses grátis a conta realmente tem (pode ser mais
        // do que 1, se tiver usado um cupão de oferta), em vez de assumir
        // sempre "1 mês" — antes esta mensagem estava fixa, mesmo quando a
        // pessoa tinha direito a mais meses.
        let freeMonths = 1;
        if (profile?.subscription_paid_until) {
          const now = new Date();
          const paidUntil = new Date(profile.subscription_paid_until);
          freeMonths = Math.max(1, Math.round((paidUntil - now) / (1000 * 60 * 60 * 24 * 30)));
        }
        return (
        <div style={{
          background: 'linear-gradient(135deg, var(--telha) 0%, #3E4A32 100%)', borderRadius: 10,
          padding: '20px 24px', marginBottom: 28, color: '#fff', position: 'relative',
        }}>
          <button
            onClick={() => setWelcomeDismissed(true)}
            aria-label={t('attr_close_alert')}
            style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}
          >
            <X size={16} />
          </button>
          <div className="display" style={{ fontSize: 19, fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gift size={20} /> {freeMonths === 1 ? 'Bem-vinda! O seu primeiro mês é grátis' : `Bem-vinda! Tem ${freeMonths} meses grátis`}
          </div>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.9)', maxWidth: 560 }}>
            Como conta de agência, tem acesso total ao painel durante {freeMonths === 1 ? '1 mês' : `${freeMonths} meses`}, sem qualquer custo. Depois desse período,
            a mensalidade é de {PAYMENT_INFO.subscriptionFee.toFixed(2)} €/mês, com pagamento por transferência bancária.
            Vai receber um aviso antes do período grátis terminar.
          </p>
        </div>
        );
      })()}

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
              <label style={{ fontSize: 12 }}>{t('dash_address')}</label>
              <input type="text" value={listingFilters.address} onChange={(e) => updateListingFilter('address', e.target.value)} placeholder={t('attr_street_number')} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 12 }}>{t('dash_price')}</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="number" value={listingFilters.minPrice} onChange={(e) => updateListingFilter('minPrice', e.target.value)} placeholder={t('attr_from')} />
                <span style={{ color: 'var(--text-soft)', fontSize: 12 }}>—</span>
                <input type="number" value={listingFilters.maxPrice} onChange={(e) => updateListingFilter('maxPrice', e.target.value)} placeholder={t('dash_price_to')} />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 12 }}>{t('dash_municipality')}</label>
              <input type="text" value={listingFilters.municipality} onChange={(e) => updateListingFilter('municipality', e.target.value)} placeholder={t('attr_municipality')} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 12 }}>{t('dash_parish')}</label>
              <input type="text" value={listingFilters.parish} onChange={(e) => updateListingFilter('parish', e.target.value)} placeholder={t('attr_parish')} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" style={{ fontSize: 13 }}>{t('dash_search_btn')}</button>
            <button type="button" onClick={clearListingSearch} className="btn" style={{ fontSize: 13 }}>{t('dash_clear_btn')}</button>
          </div>
        </form>
      )}
      {properties.length === 0 ? (
        <p className="empty-state">{t('dashboard_none_listings')}</p>
      ) : (
        <div style={{ marginBottom: 40 }}>
          {(() => {
            const groups = [
              { key: 'ativo', title: t('dash_published'), match: (p) => ['ativo', 'desativado', 'vendido', 'arrendado', 'expirado'].includes(p.status) },
              { key: 'pendente', title: t('dash_pending_review'), match: (p) => p.status === 'em_revisao' },
              { key: 'eliminado', title: t('dash_deleted'), match: (p) => p.status === 'eliminado' },
              { key: 'outros', title: t('dash_rejected_cancelled'), match: (p) => ['rejeitado', 'anulado_suporte'].includes(p.status) },
            ];
            const matchesSearch = (p) => {
              const { address, minPrice, maxPrice, parish, municipality } = appliedListingFilters;
              if (address && !normalizeSearchText(p.address).includes(normalizeSearchText(address))) return false;
              if (minPrice && Number(p.price || 0) < Number(minPrice)) return false;
              if (maxPrice && Number(p.price || 0) > Number(maxPrice)) return false;
              if (parish && !normalizeSearchText(p.parish).includes(normalizeSearchText(parish))) return false;
              if (municipality && !normalizeSearchText(p.municipality).includes(normalizeSearchText(municipality))) return false;
              return true;
            };
            const groupCounts = Object.fromEntries(groups.map((g) => [g.key, properties.filter((p) => g.match(p) && matchesSearch(p)).length]));
            const activeGroup = groups.find((g) => g.key === activeListingTab) || groups[0];
            const group = properties.filter((p) => activeGroup.match(p) && matchesSearch(p));
            const currentPage = listingPages[activeGroup.key] || 1;
            const totalPages = Math.ceil(group.length / LISTINGS_PER_PAGE);
            const pageItems = group.slice((currentPage - 1) * LISTINGS_PER_PAGE, currentPage * LISTINGS_PER_PAGE);

            return (
              <>
                {/* Separadores (tabs) no topo, para escolher que grupo de anúncios ver */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
                  {groups.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setActiveListingTab(g.key)}
                      className="btn"
                      style={{
                        fontSize: 13.5, fontWeight: 600,
                        background: activeListingTab === g.key ? 'var(--telha)' : 'var(--paper)',
                        color: activeListingTab === g.key ? '#fff' : 'var(--ink)',
                        borderColor: activeListingTab === g.key ? 'var(--telha)' : 'var(--line)',
                      }}
                    >
                      {g.title} ({groupCounts[g.key]})
                    </button>
                  ))}
                </div>

                {group.length === 0 ? (
                  <p className="empty-state">{t('dashboard_none_listings')}</p>
                ) : (
                  <div className="grid-listings">
                    {pageItems.map((p) => {
                      const st = STATUS_LABELS[p.status] || { labelKey: null, color: 'var(--text-soft)', bg: 'var(--line)' };
                      const stLabel = st.labelKey ? t(st.labelKey) : p.status;
                      const firstSorted = p.property_photos?.sort((a, b) => a.position - b.position)[0];
                      const firstPhoto = firstSorted?.thumbnail_url || firstSorted?.url;
                      const isLocked = p.status === 'anulado_suporte' || p.status === 'eliminado';
                      return (
                        <div key={p.id} className="card" style={{ position: 'relative' }}>
                          <span style={{
                            position: 'absolute', top: 10, left: 10, zIndex: 1, fontSize: 11, fontWeight: 700,
                            padding: '4px 10px', borderRadius: 20, background: st.bg, color: st.color,
                          }}>
                            {stLabel}
                          </span>
                          <Link href={`/property/${p.id}`}>
                            {firstPhoto ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={firstPhoto} alt={`Foto do imóvel ${p.typology}`} loading="lazy" className="card-photo" style={{ objectFit: 'cover', width: '100%' }} />
                            ) : (
                              <div className="card-photo" />
                            )}
                          </Link>
                          <div className="card-body">
                            <div className="price">
                              {Number(p.price).toLocaleString('pt-PT')} {p.business_type === 'Arrendamento' ? '€/mês' : '€'}
                            </div>
                            <Link href={`/property/${p.id}`}>
                              <div className="addr">{p.typology} · {displayAddress ? displayAddress(p) : p.address}</div>
                              <div className="meta">
                                {p.property_type ? `${p.property_type} · ` : ''}
                                {p.area_util ? `${p.area_util} m² · ` : ''}
                                {p.bedrooms} quartos{p.bathrooms != null ? ` · ${p.bathrooms} wc` : ''}
                              </div>
                              {p.created_at && (
                                <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>
                                  {t('meta_published_on')} {new Date(p.created_at).toLocaleDateString('pt-PT')}
                                </div>
                              )}
                              <div style={{ fontSize: 12.5, color: 'var(--text-soft)', marginTop: 2 }}>
                                {p.district}{p.municipality ? ` · ${p.municipality}` : ''}
                              </div>
                            </Link>
                            {p.status === 'anulado_suporte' && p.cancellation_reason && (
                              <p style={{ fontSize: 12, color: '#8a3b2a', marginTop: 6 }}>{t('dash_reason')} {p.cancellation_reason}</p>
                            )}
                            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                              {!isLocked && p.featured_status === 'none' && p.status === 'ativo' && (
                                <button onClick={() => toggleFeaturedButtonClick(p.id)} className="btn" style={{ fontSize: 12.5 }}>⭐ {t('dash_feature')}</button>
                              )}
                              {(p.featured_status === 'active' || p.featured_status === 'pending') && (
                                <button onClick={() => cancelFeatured(p.id)} className="btn" style={{ fontSize: 12.5 }}>Anular destaque</button>
                              )}
                              {!isLocked && p.status === 'ativo' && (
                                <button onClick={() => deactivateProperty(p.id)} className="btn" style={{ fontSize: 12.5 }}>Desativar</button>
                              )}
                              {!isLocked && p.status === 'desativado' && (
                                <button onClick={() => reactivateProperty(p.id)} className="btn" style={{ fontSize: 12.5 }}>Reativar</button>
                              )}
                              {p.status !== 'anulado_suporte' && (
                                <Link href={`/publish?edit=${p.id}`} className="btn" style={{ fontSize: 12.5 }}>{t('dash_edit')}</Link>
                              )}
                              {p.status !== 'eliminado' && (
                                <Link href={`/property/${p.id}`} className="btn" style={{ fontSize: 12.5 }}>{t('dash_view_listing')}</Link>
                              )}
                              {p.status === 'eliminado' && (
                                <button onClick={() => republishProperty(p.id)} className="btn" style={{ fontSize: 12.5 }}>{t('dash_republish')}</button>
                              )}
                              {p.status === 'eliminado' && (
                                <button onClick={() => deletePropertyPermanently(p.id)} className="btn" style={{ fontSize: 12.5, color: '#8a3b2a' }}>{t('dash_delete_permanently')}</button>
                              )}
                              {p.status !== 'eliminado' && (
                                <button onClick={() => deleteProperty(p.id)} className="btn" style={{ fontSize: 12.5, color: '#8a3b2a' }}>Apagar</button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {totalPages > 1 && (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setListingPages((cur) => ({ ...cur, [activeGroup.key]: pageNum }))}
                        className="btn"
                        style={{ fontSize: 13, background: currentPage === pageNum ? 'var(--telha)' : 'var(--paper)', color: currentPage === pageNum ? '#fff' : 'var(--ink)' }}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
      {properties.length > 0 && Object.values(appliedListingFilters).some(Boolean) && properties.filter((p) => {
        const { address, minPrice, maxPrice, parish, municipality } = appliedListingFilters;
        if (address && !normalizeSearchText(p.address).includes(normalizeSearchText(address))) return false;
        if (minPrice && Number(p.price || 0) < Number(minPrice)) return false;
        if (maxPrice && Number(p.price || 0) > Number(maxPrice)) return false;
        if (parish && !normalizeSearchText(p.parish).includes(normalizeSearchText(parish))) return false;
        if (municipality && !normalizeSearchText(p.municipality).includes(normalizeSearchText(municipality))) return false;
        return true;
      }).length === 0 && (
        <p className="empty-state">{t('dash_no_match')}</p>
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
              <span>{t('dash_activation_fee')}</span><b>{PAYMENT_INFO.activationFee.toFixed(2)} €</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
              <span>{t('dash_per_day_featured')}</span><b>{PAYMENT_INFO.dailyFee.toFixed(2)} €</b>
            </div>
          </div>

          <div className="field">
            <label>{t('dash_how_many_days')}</label>
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
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{t('dash_total_now')}</span>
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
              <button onClick={() => setFeaturedModal(null)} className="btn btn-block">{t('dash_cancel')}</button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{t('dash_bank_transfer')}</p>
              <div style={{ fontSize: 13, marginBottom: 6 }}>
                <div><b>IBAN:</b> {PAYMENT_INFO.iban}</div>
                <div><b>BIC/SWIFT:</b> {PAYMENT_INFO.bic}</div>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginBottom: 12 }}>
                Transfira <b>{(PAYMENT_INFO.activationFee + PAYMENT_INFO.dailyFee * featuredDays).toFixed(2)} €</b> e indique o número de referência <b>{featuredModal.slice(0, 8)}</b> na descrição da transferência.
                Depois de recebermos o pagamento, o destaque é ativado manualmente (normalmente em 1 dia útil), e dura {featuredDays} dias a partir da ativação.
              </p>

              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="featured-proof-input"
                  className="btn"
                  style={{ fontSize: 12.5, padding: '7px 14px', cursor: 'pointer', display: 'inline-block' }}
                >
                  📎 {featuredProofFile ? featuredProofFile.name : 'Anexar comprovativo (opcional)'}
                </label>
                <input
                  id="featured-proof-input"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFeaturedProofFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
              </div>

              <button onClick={() => requestFeatured(featuredModal)} className="btn btn-primary btn-block" style={{ marginBottom: 8 }} disabled={uploadingFeaturedProof}>
                {uploadingFeaturedProof ? 'A enviar...' : 'Já fiz a transferência'}
              </button>
              <button onClick={() => setFeaturedModal(null)} className="btn btn-block">{t('dash_cancel')}</button>
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
