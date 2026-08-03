'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { useLanguage } from '../../../lib/i18n';
import LanguageSwitcher from '../../../components/LanguageSwitcher';
import Header from '../../../components/Header';

export default function AgencyPage() {
  const { id } = useParams();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', id).single();
      setProfile(profileData);

      const { data: propsData } = await supabase
        .from('properties')
        .select('id, price, address, district, typology, area, bedrooms, business_type')
        .eq('owner_id', id)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false });
      setProperties(propsData || []);

      setLoading(false);
    }
    if (id) load();
  }, [id]);

  if (loading) return (<><Header /><div className="wrap" style={{ padding: 60 }}>...</div></>);
  if (!profile) return (<><Header /><div className="wrap" style={{ padding: 60 }}>Perfil não encontrado.</div></>);

  const initials = (profile.agency_name || profile.full_name || '?')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div>
      <Header />
      <div style={{ height: 140, background: 'linear-gradient(135deg, var(--telha) 0%, #3E4A32 100%)' }} />

      <div className="wrap" style={{ paddingTop: 0 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', marginTop: -26, paddingBottom: 24, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
          <div style={{
            width: 84, height: 84, borderRadius: 10, background: 'var(--paper)', border: '4px solid var(--paper)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 600, color: 'var(--telha)',
            boxShadow: '0 2px 6px rgba(51,46,34,0.12)', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="display" style={{ fontSize: 24 }}>{profile.agency_name || profile.full_name}</h1>
            <div className="meta">
              {profile.account_type === 'agencia' ? t('agency_type') : t('agency_individual_type')}
              {profile.agency_license && ` · ${profile.agency_license}`}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <b className="display" style={{ fontSize: 20 }}>{properties.length}</b>
            <div className="meta">{t('agency_active_listings')}</div>
          </div>
        </div>

        <h2 className="display" style={{ fontSize: 20, margin: '28px 0 16px' }}>{t('agency_listings')}</h2>

        {properties.length === 0 && <p className="empty-state">{t('agency_none')}</p>}

        <div className="grid-listings" style={{ paddingBottom: 60 }}>
          {properties.map((p) => (
            <Link key={p.id} href={`/property/${p.id}`} className="card">
              <div className="card-photo" />
              <div className="card-body">
                <div className="price mono">
                  {Number(p.price).toLocaleString('pt-PT')} {p.business_type === 'Arrendamento' ? '€/mês' : '€'}
                </div>
                <div className="addr">{p.typology} · {p.address}</div>
                <div className="meta">{p.district}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
