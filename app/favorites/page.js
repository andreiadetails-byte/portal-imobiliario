'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import { displayAddress } from '../../lib/displayAddress';
import { useCompareList } from '../../lib/useCompareList';

export default function FavoritesPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [properties, setProperties] = useState([]);
  const [searches, setSearches] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('favoritos');
  const { ids: compareIds, toggle: toggleCompare } = useCompareList();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: favIds, error: favError } = await supabase
        .from('favorites')
        .select('property_id, notes, price_at_save')
        .eq('user_id', user.id);

      let favProperties = [];
      if (!favError && favIds && favIds.length > 0) {
        const ids = favIds.map((f) => f.property_id);
        const notesById = Object.fromEntries(favIds.map((f) => [f.property_id, f.notes || '']));
        const priceAtSaveById = Object.fromEntries(favIds.map((f) => [f.property_id, f.price_at_save]));
        const { data: propsData } = await supabase
          .from('properties')
          .select('id, price, address, district, municipality, parish, show_full_address, typology, area, bedrooms, bathrooms, business_type, property_photos(url, position)')
          .in('id', ids);
        favProperties = (propsData || []).map((p) => ({ ...p, notes: notesById[p.id] || '', price_at_save: priceAtSaveById[p.id] }));
        setProperties(favProperties);
      } else {
        setProperties([]);
      }

      const { data: searchesData } = await supabase
        .from('saved_searches').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setSearches(searchesData || []);

      // "Match" personalizado: sugere imóveis parecidos com os favoritos (mesmo distrito/tipologia, preço próximo)
      if (favProperties.length > 0) {
        const districts = [...new Set(favProperties.map((p) => p.district).filter(Boolean))];
        const typologies = [...new Set(favProperties.map((p) => p.typology).filter(Boolean))];
        const avgPrice = favProperties.reduce((s, p) => s + Number(p.price), 0) / favProperties.length;
        const excludeIds = favProperties.map((p) => p.id);

        let query = supabase
          .from('properties')
          .select('id, price, address, district, municipality, parish, show_full_address, typology, area, bedrooms, bathrooms, business_type, property_photos(url, position)')
          .eq('status', 'ativo')
          .gte('price', avgPrice * 0.7)
          .lte('price', avgPrice * 1.3)
          .limit(6);

        if (districts.length > 0) query = query.in('district', districts);
        if (typologies.length > 0) query = query.in('typology', typologies);
        if (excludeIds.length > 0) query = query.not('id', 'in', `(${excludeIds.join(',')})`);

        const { data: matchData } = await query;
        setSuggestions(matchData || []);
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

  const notesTimers = useRef({});
  function updateNote(propertyId, value) {
    setProperties((cur) => cur.map((p) => (p.id === propertyId ? { ...p, notes: value } : p)));
    clearTimeout(notesTimers.current[propertyId]);
    notesTimers.current[propertyId] = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('favorites').update({ notes: value }).eq('user_id', user.id).eq('property_id', propertyId);
    }, 800);
  }

  async function addSuggestionToFavorites(e, propertyId) {
    e.preventDefault();
    e.stopPropagation();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    const prop = suggestions.find((p) => p.id === propertyId);
    await supabase.from('favorites').insert({ user_id: user.id, property_id: propertyId, price_at_save: prop?.price ?? null });
    setSuggestions((cur) => cur.filter((p) => p.id !== propertyId));
    // Vai buscar o próprio imóvel para o juntar à lista principal de favoritos, sem precisar de recarregar a página.
    const { data: newFav } = await supabase
      .from('properties')
      .select('id, price, address, district, municipality, parish, show_full_address, typology, area, bedrooms, bathrooms, business_type, property_photos(url, position)')
      .eq('id', propertyId).single();
    if (newFav) setProperties((cur) => [newFav, ...cur]);
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
    if (filters.maxPrice) parts.push(`${t('fav_up_to')} ${Number(filters.maxPrice).toLocaleString('pt-PT')} €`);
    return parts.join(' · ') || t('fav_no_extra_filters');
  }

  if (loading) return (
    <><Header /><div className="wrap" style={{ padding: 60 }}>...</div></>
  );

  return (
    <>
      <Header />
      <main id="main-content" className="wrap" style={{ padding: '40px 32px 80px' }}>
        <BackButton fallback="/" />
        <h1 className="display" style={{ fontSize: 26, marginBottom: 20 }}>{t('favorites_title')}</h1>

        <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--line)', marginBottom: 24 }}>
          {[['favoritos', `${t('fav_saved_tab')} (${properties.length})`], ['pesquisas', `${t('fav_saved_searches_tab')} (${searches.length})`]].map(([value, label]) => (
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

        {tab === 'favoritos' && properties.length > 1 && (
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => router.push('/comparar')}
              className="btn btn-primary"
              disabled={compareIds.length < 2}
              style={{ fontSize: 13.5, opacity: compareIds.length < 2 ? 0.5 : 1, cursor: compareIds.length < 2 ? 'not-allowed' : 'pointer' }}
            >
              {t('fav_compare_my_properties')} {compareIds.length >= 2 ? `(${compareIds.length})` : ''}
            </button>
            {compareIds.length < 2 && (
              <span style={{ fontSize: 12, color: 'var(--text-soft)', marginLeft: 10 }}>
                {t('fav_check_compare_hint')}
              </span>
            )}
          </div>
        )}

        {tab === 'favoritos' && (
          <>
            {properties.length === 0 && <div className="empty-state">{t('favorites_empty')}</div>}
            <div className="grid-listings">
              {properties.map((p) => {
                const firstPhoto = p.property_photos?.sort((a, b) => a.position - b.position)[0]?.url;
                return (
                <div key={p.id} className="card">
                  <Link href={`/property/${p.id}`}>
                    {firstPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={firstPhoto} alt={`Foto do imóvel ${p.typology}`} loading="lazy" className="card-photo" style={{ objectFit: 'cover', width: '100%' }} />
                    ) : (
                      <div className="card-photo" />
                    )}
                  </Link>
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div className="price">
                        {Number(p.price).toLocaleString('pt-PT')} {p.business_type === 'Arrendamento' ? '€/mês' : '€'}
                      </div>
                      <button
                        onClick={() => removeFavorite(p.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--telha)', fontSize: 18, lineHeight: 1 }}
                        aria-label={t('attr_remove_favorites')}
                      >
                        ♥
                      </button>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 4 }}>
                      <input type="checkbox" checked={compareIds.includes(p.id)} onChange={() => toggleCompare(p.id)} style={{ cursor: 'pointer' }} />
                      {t('fav_compare_checkbox')}
                    </label>
                    <Link href={`/property/${p.id}`}>
                      <div className="addr">{p.typology} · {displayAddress(p)}</div>
                      <div className="meta">{p.district} · {p.area || p.area_util} m² · {p.bedrooms} {t('property_rooms').toLowerCase()}</div>
                    </Link>
                    {p.price_at_save && Number(p.price_at_save) > Number(p.price) && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, fontWeight: 600,
                        color: 'var(--telha)', background: 'rgba(126,143,106,0.14)', padding: '5px 9px', borderRadius: 6,
                      }}>
                        {t('fav_price_dropped')} {(Number(p.price_at_save) - Number(p.price)).toLocaleString('pt-PT')} € {t('fav_since_saved')}
                      </div>
                    )}
                    <textarea
                      value={p.notes || ''}
                      onChange={(e) => updateNote(p.id, e.target.value)}
                      placeholder={t('fav_note_placeholder')}
                      rows={2}
                      style={{
                        width: '100%', marginTop: 10, fontSize: 12.5, padding: '8px 10px', borderRadius: 6,
                        border: '1px solid var(--line)', background: 'var(--plaster)', resize: 'vertical',
                        fontFamily: 'inherit', color: 'var(--ink)',
                      }}
                    />
                  </div>
                </div>
                );
              })}
            </div>

            {suggestions.length > 0 && (
              <div style={{ marginTop: 44 }}>
                <h2 className="display" style={{ fontSize: 19, marginBottom: 6 }}>{t('fav_maybe_like')}</h2>
                <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 18 }}>
                  {t('fav_based_on_saved')}
                </p>
                <div className="grid-listings">
                  {suggestions.map((p) => {
                    const firstPhoto = p.property_photos?.sort((a, b) => a.position - b.position)[0]?.url;
                    return (
                      <Link key={p.id} href={`/property/${p.id}`} className="card" style={{ position: 'relative' }}>
                        <button
                          onClick={(e) => addSuggestionToFavorites(e, p.id)}
                          aria-label={t('attr_save_favorites')}
                          style={{
                            position: 'absolute', top: 10, right: 10, zIndex: 1, width: 30, height: 30, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer', fontSize: 15,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)',
                          }}
                        >
                          ♡
                        </button>
                        {firstPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={firstPhoto} alt={`Foto do imóvel ${p.typology}`} loading="lazy" className="card-photo" style={{ objectFit: 'cover', width: '100%' }} />
                        ) : (
                          <div className="card-photo" />
                        )}
                        <div className="card-body">
                          <div className="price">
                            {Number(p.price).toLocaleString('pt-PT')} {p.business_type === 'Arrendamento' ? '€/mês' : '€'}
                          </div>
                          <div className="addr">{p.typology} · {displayAddress(p)}</div>
                          <div className="meta">{p.district} · {p.area} m² · {p.bedrooms} {t('property_rooms').toLowerCase()}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'pesquisas' && (
          <>
            {searches.length === 0 && <div className="empty-state">{t('fav_no_saved_search')}</div>}
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
                      {t('fav_email_alerts')}
                    </label>
                    <button onClick={() => deleteSearch(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#8a3b2a' }}>
                      {t('fav_delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
