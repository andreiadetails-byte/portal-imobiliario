'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import Header from '../../components/Header';

export default function FavoritesPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data, error } = await supabase
        .from('favorites')
        .select('property_id, properties (id, price, address, district, typology, area, bedrooms, bathrooms, business_type)')
        .eq('user_id', user.id);

      if (!error) {
        setProperties((data || []).map((f) => f.properties).filter(Boolean));
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function removeFavorite(propertyId) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('property_id', propertyId);
    setProperties((cur) => cur.filter((p) => p.id !== propertyId));
  }

  if (loading) return (
    <><Header /><div className="wrap" style={{ padding: 60 }}>...</div></>
  );

  return (
    <>
      <Header />
      <div className="wrap" style={{ padding: '40px 32px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 className="display" style={{ fontSize: 26 }}>{t('favorites_title')}</h1>
        </div>

        {properties.length === 0 && (
          <div className="empty-state">{t('favorites_empty')}</div>
      )}

      <div className="grid-listings">
        {properties.map((p) => (
          <div key={p.id} className="card">
            <Link href={`/property/${p.id}`}>
              <div className="card-photo" />
            </Link>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="price mono">
                  {Number(p.price).toLocaleString('pt-PT')} {p.business_type === 'Arrendamento' ? '€/mês' : '€'}
                </div>
                <button
                  onClick={() => removeFavorite(p.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--telha)', fontSize: 18, lineHeight: 1 }}
                  aria-label="Remover dos favoritos"
                >
                  ♥
                </button>
              </div>
              <Link href={`/property/${p.id}`}>
                <div className="addr">{p.typology} · {p.address}</div>
                <div className="meta">{p.district} · {p.area} m² · {p.bedrooms} {t('property_rooms').toLowerCase()}</div>
              </Link>
            </div>
          </div>
        ))}
      </div>
      </div>
    </>
  );
}
