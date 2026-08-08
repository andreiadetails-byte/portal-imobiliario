'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import Header from '../../components/Header';
import { displayAddress } from '../../lib/displayAddress';

export default function FavoritesPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [properties, setProperties] = useState([]);
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('favoritos');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data, error } = await supabase
        .from('favorites')
        .select('property_id, properties (id, price, address, district, municipality, parish, show_full_address, typology, area, bedrooms, bathrooms, business_type)')
        .eq('user_id', user.id);

      if (!error) {
        setProperties((data || []).map((f) => f.properties).filter(Boolean));
      }

      const { data: searchesData } = await supabase
        .from('saved_searches').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setSearches(searchesData || []);

      setLoading(false);
    }
    load();
  }, [router]);

  async function removeFavorite(propertyId) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('property_id', propertyId);
    setProperties((cur) => cur.filter((p) => p.id !== propertyId));
  }

  async function toggleNotify(searchId, current) {
    await supabase.from('saved_searches').update({ notify: !current }).eq('id', searchId);
    setSearches((cur) => cur.map((s) => (s.id === searchId ? { ...s, notify: !current } : s)));
  }

  async function deleteSearch(searchId) {
    await supabase.from('saved_searches').delete().eq('id', searchId);
    setSearches((cur) => cur.filter((s) => s.id !== searchId));
  }

  function filterSummary(filters) {
    const parts = [];
    if (filters.district) parts.push(filters.district);
    if (filters.selectedTypologies?.length) parts.push(filters.selectedTypologies.join(', '));
    if (filters.maxPrice) parts.push(`até ${Number(filters.maxPrice).toLocaleString('pt-PT')} €`);
    return parts.join(' · ') || 'Sem filtros adicionais';
  }

  if (loading) return (
    <><Header /><div className="wrap" style={{ padding: 60 }}>...</div></>
  );

  return (
    <>
      <Header />
      <div className="wrap" style={{ padding: '40px 32px 80px' }}>
        <h1 className="display" style={{ fontSize: 26, marginBottom: 20 }}>{t('favorites_title')}</h1>

        <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--line)', marginBottom: 24 }}>
          {[['favoritos', `Guardados (${properties.length})`], ['pesquisas', `Pesquisas guardadas (${searches.length})`]].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              style={{
                background: 'none', border: 'none', padding: '0 0 12px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                color: tab === value ? 'var(--ink)' : 'var(--text-soft)',
                borderBottom: tab === value ? '2px solid var(--telha)' : '2px solid transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'favoritos' && (
          <>
            {properties.length === 0 && <div className="empty-state">{t('favorites_empty')}</div>}
            <div className="grid-listings">
              {properties.map((p) => (
                <div key={p.id} className="card">
                  <Link href={`/property/${p.id}`}>
                    <div className="card-photo" />
                  </Link>
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div className="price">
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
                      <div className="addr">{p.typology} · {displayAddress(p)}</div>
                      <div className="meta">{p.district} · {p.area} m² · {p.bedrooms} {t('property_rooms').toLowerCase()}</div>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'pesquisas' && (
          <>
            {searches.length === 0 && <div className="empty-state">Ainda não guardaste nenhuma pesquisa.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {searches.map((s) => (
                <div key={s.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <b style={{ fontSize: 14 }}>{s.name}</b>
                    <div className="meta">{filterSummary(s.filters || {})}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      <input type="checkbox" checked={s.notify} onChange={() => toggleNotify(s.id, s.notify)} />
                      Alertas por email
                    </label>
                    <button onClick={() => deleteSearch(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#8a3b2a' }}>
                      Apagar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
