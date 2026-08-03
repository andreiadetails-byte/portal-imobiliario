'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [properties, setProperties] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) return <div className="wrap" style={{ padding: 60 }}>...</div>;

  return (
    <div className="wrap" style={{ padding: '40px 32px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="display" style={{ fontSize: 28 }}>{t('dashboard_hi')}, {profile?.full_name || ''}</h1>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <LanguageSwitcher />
          <Link href="/publish" className="btn btn-primary" style={{ marginRight: 12 }}>{t('dashboard_new')}</Link>
          <button onClick={handleLogout} className="btn">{t('nav_logout')}</button>
        </div>
      </div>

      <h2 className="display" style={{ fontSize: 18, marginBottom: 14 }}>{t('dashboard_my_listings')}</h2>
      {properties.length === 0 ? (
        <p className="empty-state">{t('dashboard_none_listings')}</p>
      ) : (
        <div className="card" style={{ marginBottom: 40 }}>
          {properties.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
              <div>
                <b>{p.typology} · {p.address}</b>
                <div className="meta">{Number(p.price).toLocaleString('pt-PT')} € · {p.status}</div>
              </div>
              <Link href={`/property/${p.id}`} style={{ fontSize: 13, color: 'var(--telha)' }}>{t('dashboard_view')}</Link>
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
  );
}
