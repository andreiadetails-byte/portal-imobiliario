'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import Header from '../../components/Header';
import { PAYMENT_INFO } from '../../lib/paymentInfo';

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [properties, setProperties] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [featuredModal, setFeaturedModal] = useState(null); // property id, ou null

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);

      const { data: propsData } = await supabase
        .from('properties').select('*').eq('owner_id', user.id).order('created_at', { ascending: false });
      setProperties(propsData || []);

      const { data: leadsData } = await supabase
        .from('leads').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(10);
      setLeads(leadsData || []);

      setLoading(false);
    }
    load();
  }, [router]);

  async function markLeadReplied(leadId) {
    await supabase.from('leads').update({ status: 'respondido' }).eq('id', leadId);
    setLeads((cur) => cur.map((l) => (l.id === leadId ? { ...l, status: 'respondido' } : l)));
  }

  async function deleteProperty(id) {
    if (!confirm('Tem a certeza que quer apagar este anúncio? Esta ação não pode ser desfeita.')) return;
    await supabase.from('properties').delete().eq('id', id);
    setProperties((cur) => cur.filter((p) => p.id !== id));
  }

  async function requestFeatured(id) {
    await supabase.from('properties').update({
      featured_status: 'pending',
      featured_requested_at: new Date().toISOString(),
    }).eq('id', id);
    setProperties((cur) => cur.map((p) => (p.id === id ? { ...p, featured_status: 'pending' } : p)));
    setFeaturedModal(null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) return (<><Header /><div className="wrap" style={{ padding: 60 }}>...</div></>);

  return (
    <>
      <Header />
    <div className="wrap" style={{ padding: '40px 32px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="display" style={{ fontSize: 28 }}>{t('dashboard_hi')}, {profile?.full_name || ''}</h1>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link href="/publish" className="btn btn-primary" style={{ marginRight: 12 }}>{t('dashboard_new')}</Link>
          <button onClick={handleLogout} className="btn">{t('nav_logout')}</button>
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
          {properties.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <b>{p.typology} · {p.address}</b>
                  {p.featured_status === 'active' && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'var(--brass)', color: '#5C4E2A' }}>★ DESTAQUE</span>
                  )}
                  {p.featured_status === 'pending' && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'var(--line)', color: 'var(--text-soft)' }}>Pagamento pendente</span>
                  )}
                </div>
                <div className="meta">{Number(p.price).toLocaleString('pt-PT')} € · {p.status} · {p.views_count || 0} visualizações</div>
              </div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
                {p.featured_status === 'none' && (
                  <button onClick={() => setFeaturedModal(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--telha)' }}>
                    ★ Destacar
                  </button>
                )}
                <Link href={`/property/${p.id}`} style={{ fontSize: 13, color: 'var(--telha)' }}>{t('dashboard_view')}</Link>
                <button onClick={() => deleteProperty(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#8a3b2a' }}>
                  Apagar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="display" style={{ fontSize: 18, marginBottom: 14 }}>{t('dashboard_recent_leads')}</h2>
      {leads.length === 0 ? (
        <p className="empty-state">{t('dashboard_none_leads')}</p>
      ) : (
        <div className="card">
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
