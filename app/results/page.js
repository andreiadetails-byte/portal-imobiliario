'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import LocationAutocomplete from '../../components/LocationAutocomplete';
import Header from '../../components/Header';
import dynamic from 'next/dynamic';

const MapDrawSearch = dynamic(() => import('../../components/MapDrawSearch'), { ssr: false });
import { displayAddress } from '../../lib/displayAddress';
import AdBanner from '../../components/AdBanner';

function ResultsInner() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const TIPOS = ['Apartamento', 'Moradia', 'Terreno', 'Espaço comercial', 'Armazém', 'Escritório'];
  const TIPOLOGIAS = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5+'];

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  const [district, setDistrict] = useState(searchParams.get('location') || '');
  const [businessType, setBusinessType] = useState(searchParams.get('business') || 'Venda');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedTypologies, setSelectedTypologies] = useState([]);
  const [maxPrice, setMaxPrice] = useState('');
  const [minBedrooms, setMinBedrooms] = useState('');
  const [minBathrooms, setMinBathrooms] = useState('');
  const [minArea, setMinArea] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [sortBy, setSortBy] = useState('recent');
  const [showMap, setShowMap] = useState(true);
  const [mapFilterIds, setMapFilterIds] = useState(null);
  const [user, setUser] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser(data.user);
        const { data: favs } = await supabase.from('favorites').select('property_id').eq('user_id', data.user.id);
        setFavoriteIds((favs || []).map((f) => f.property_id));
      }
    });
  }, []);

  async function toggleFavorite(e, propertyId) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { window.location.href = '/login'; return; }
    if (favoriteIds.includes(propertyId)) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('property_id', propertyId);
      setFavoriteIds((cur) => cur.filter((id) => id !== propertyId));
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, property_id: propertyId });
      setFavoriteIds((cur) => [...cur, propertyId]);
    }
  }

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleFromList(list, setList, value) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function saveSearch() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }

    const name = district
      ? `${businessType === 'Arrendamento' ? 'Arrendar' : 'Comprar'} em ${district}`
      : `${businessType === 'Arrendamento' ? 'Arrendar' : 'Comprar'} imóvel`;

    const filters = { district, businessType, selectedTypes, selectedTypologies, maxPrice, minBedrooms, minBathrooms, minArea, selectedAmenities };

    const { error } = await supabase.from('saved_searches').insert({ user_id: user.id, name, filters, notify: true });
    if (!error) alert(`Pesquisa guardada! Vai receber um email sempre que aparecer um imóvel novo que corresponda.`);
  }

  async function runSearch(e, targetPage) {
    if (e) e.preventDefault();
    const goToPage = targetPage || 1;
    setPage(goToPage);
    setLoading(true);
    if (typeof window !== 'undefined' && targetPage) window.scrollTo({ top: 0, behavior: 'smooth' });

    let query = supabase
      .from('properties')
      .select('id, title, description, price, address, district, municipality, parish, show_full_address, typology, property_type, area, area_util, bedrooms, bathrooms, business_type, latitude, longitude, featured_status, has_storage, has_parking, has_balcony, has_garden, has_pool, has_gym, has_coworking, created_at, property_photos(url, position), profiles(avatar_url, full_name, agency_name)', { count: 'exact' })
      .eq('status', 'ativo')
      .eq('business_type', businessType);

    if (district) {
      // Junta as palavras com "%" no meio, para "vila nova gaia" encontrar
      // "Vila Nova de Gaia" sem ser preciso escrever o "de".
      const pattern = `%${district.trim().split(/\s+/).filter(Boolean).join('%')}%`;
      query = query.or(`district.ilike.${pattern},address.ilike.${pattern},municipality.ilike.${pattern},parish.ilike.${pattern}`);
    }
    if (selectedTypes.length > 0) query = query.in('property_type', selectedTypes);
    if (selectedTypologies.length > 0) query = query.in('typology', selectedTypologies);
    if (maxPrice) query = query.lte('price', Number(maxPrice));
    if (minBedrooms) query = query.gte('bedrooms', Number(minBedrooms));
    if (minBathrooms) query = query.gte('bathrooms', Number(minBathrooms));
    if (minArea) query = query.gte('area', Number(minArea));
    selectedAmenities.forEach((col) => { query = query.eq(col, true); });

    query = sortBy === 'price_asc' ? query.order('price', { ascending: true })
      : sortBy === 'price_desc' ? query.order('price', { ascending: false })
      : query.order('created_at', { ascending: false });

    query = query.range((goToPage - 1) * PAGE_SIZE, goToPage * PAGE_SIZE - 1);

    const { data, count: total, error } = await query;
    if (!error) {
      // Os destaques só "saltam" para a frente quando se vê por mais recentes.
      // Ao ordenar por preço, respeita-se sempre a ordem real de preços.
      const sorted = sortBy === 'recent'
        ? [...(data || [])].sort((a, b) => (b.featured_status === 'active') - (a.featured_status === 'active'))
        : (data || []);
      setProperties(sorted);
      setCount(total || 0);
    }
    setLoading(false);
  }

  return (
    <>
      <Header />

      <div className="wrap" style={{ padding: '32px' }}>
        <h1 className="display" style={{ fontSize: 26, marginBottom: 20 }}>{t('results_title')}</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '200px minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>

          <form onSubmit={runSearch} className="card" style={{ padding: 18, position: 'sticky', top: 90, overflow: 'visible' }}>
            <div className="field">
              <label>{t('results_business')}</label>
              <select value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
                <option value="Venda">{t('results_buy')}</option>
                <option value="Arrendamento">{t('results_rent')}</option>
              </select>
            </div>

            <div className="field">
              <label>{t('results_district')}</label>
              <LocationAutocomplete onChange={setDistrict} placeholder="ex: Lisboa" />
            </div>

            <div className="field">
              <label>{t('results_maxprice')}</label>
              <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
            </div>

            <div className="field">
              <label>{t('results_type')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {TIPOS.map((tp) => (
                  <span
                    key={tp}
                    onClick={() => toggleFromList(selectedTypes, setSelectedTypes, tp)}
                    style={{
                      fontSize: 11.5, padding: '6px 4px', textAlign: 'center', borderRadius: 5, cursor: 'pointer',
                      border: '1px solid var(--line)',
                      background: selectedTypes.includes(tp) ? 'var(--azulejo)' : 'var(--paper)',
                      color: selectedTypes.includes(tp) ? '#fff' : 'var(--text-soft)',
                    }}
                  >
                    {tp}
                  </span>
                ))}
              </div>
            </div>

            <div className="field">
              <label>{t('results_typology')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {TIPOLOGIAS.map((tp) => (
                  <span
                    key={tp}
                    onClick={() => toggleFromList(selectedTypologies, setSelectedTypologies, tp)}
                    style={{
                      fontSize: 12, padding: '6px 0', textAlign: 'center', borderRadius: 5, cursor: 'pointer',
                      border: '1px solid var(--line)',
                      background: selectedTypologies.includes(tp) ? 'var(--azulejo)' : 'var(--paper)',
                      color: selectedTypologies.includes(tp) ? '#fff' : 'var(--text-soft)',
                    }}
                  >
                    {tp}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="field">
                <label>Quartos (mín.)</label>
                <select value={minBedrooms} onChange={(e) => setMinBedrooms(e.target.value)}>
                  <option value="">Qualquer</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
                </select>
              </div>
              <div className="field">
                <label>WC (mín.)</label>
                <select value={minBathrooms} onChange={(e) => setMinBathrooms(e.target.value)}>
                  <option value="">Qualquer</option>
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Área mínima (m²)</label>
              <input type="number" value={minArea} onChange={(e) => setMinArea(e.target.value)} />
            </div>

            <div className="field">
              <label>Características</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  ['has_storage', 'Arrumos'], ['has_parking', 'Estacion.'], ['has_balcony', 'Varanda'],
                  ['has_garden', 'Jardim'], ['has_pool', 'Piscina'], ['has_gym', 'Ginásio'], ['has_coworking', 'Coworking'],
                ].map(([col, label]) => (
                  <span
                    key={col}
                    onClick={() => toggleFromList(selectedAmenities, setSelectedAmenities, col)}
                    style={{
                      fontSize: 11, padding: '6px 4px', textAlign: 'center', borderRadius: 5, cursor: 'pointer',
                      border: '1px solid var(--line)',
                      background: selectedAmenities.includes(col) ? 'var(--azulejo)' : 'var(--paper)',
                      color: selectedAmenities.includes(col) ? '#fff' : 'var(--text-soft)',
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block">{t('results_filter')}</button>
          </form>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>
                {loading ? t('results_searching') : `${(mapFilterIds ? properties.filter((p) => mapFilterIds.includes(p.id)) : properties).length} ${t('results_found')}`}
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={saveSearch} className="btn" style={{ fontSize: 13 }}>
                  🔔 Guardar pesquisa
                </button>
                <button type="button" onClick={() => setShowMap((s) => !s)} className="btn" style={{ fontSize: 13 }}>
                  {showMap ? '✕ Fechar mapa' : '🗺️ Ver no mapa'}
                </button>
                <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); runSearch(); }} style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 5 }}>
                  <option value="recent">{t('results_sort_recent')}</option>
                  <option value="price_asc">{t('results_sort_price_asc')}</option>
                  <option value="price_desc">{t('results_sort_price_desc')}</option>
                </select>
              </div>
            </div>

            {showMap && (
              <div style={{ marginBottom: 20 }}>
                <MapDrawSearch properties={properties} onFilter={setMapFilterIds} />
              </div>
            )}

            {mapFilterIds && (
              <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 12 }}>
                A mostrar só imóveis dentro da zona desenhada.{' '}
                <span onClick={() => setMapFilterIds(null)} style={{ color: 'var(--telha)', cursor: 'pointer', textDecoration: 'underline' }}>
                  Remover filtro de zona
                </span>
              </p>
            )}

            {!loading && properties.length === 0 && (
              <div className="empty-state">{t('results_empty')}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {(mapFilterIds ? properties.filter((p) => mapFilterIds.includes(p.id)) : properties).map((p, i) => {
                const sortedPhotos = p.property_photos?.sort((a, b) => a.position - b.position) || [];
                const firstPhoto = sortedPhotos[0]?.url;
                const isFav = favoriteIds.includes(p.id);
                return (
                  <React.Fragment key={p.id}>
                  {i > 0 && i % 5 === 0 && <AdBanner />}
                  <Link href={`/property/${p.id}`} className={`card${p.featured_status === 'active' ? ' card-destaque' : ''}`}
                        style={{
                          display: 'grid', gridTemplateColumns: '400px minmax(0, 1fr)', overflow: 'hidden', position: 'relative',
                          border: p.featured_status === 'active' ? '1.5px solid var(--brass)' : undefined,
                        }}>
                    <div style={{ position: 'relative', height: '100%', minHeight: 250 }}>
                      {sortedPhotos.length > 1 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 4, height: '100%' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={firstPhoto} alt="" style={{ width: '100%', height: '100%', minHeight: 250, objectFit: 'cover' }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%' }}>
                            {[1, 2].map((offset) => {
                              const photo = sortedPhotos[offset % sortedPhotos.length];
                              const isLast = offset === 2;
                              const remaining = sortedPhotos.length - 3;
                              return (
                                <div key={offset} style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  {isLast && remaining > 0 && (
                                    <div style={{
                                      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', color: '#fff',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600,
                                    }}>
                                      +{remaining}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : firstPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={firstPhoto} alt="" style={{ width: '100%', height: '100%', minHeight: 250, objectFit: 'cover' }} />
                      ) : (
                        <div className="card-photo" style={{ height: '100%', minHeight: 250 }} />
                      )}

                      {p.featured_status === 'active' && (
                        <span style={{
                          position: 'absolute', top: 10, left: 10, fontSize: 11, fontWeight: 700,
                          padding: '4px 10px', borderRadius: 10, background: 'var(--brass)', color: '#5C4E2A',
                        }}>
                          ★ DESTAQUE
                        </span>
                      )}

                      <button
                        onClick={(e) => toggleFavorite(e, p.id)}
                        aria-label="Guardar nos favoritos"
                        style={{
                          position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: '50%',
                          background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer', fontSize: 16,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: isFav ? '#b8452f' : 'var(--ink)',
                        }}
                      >
                        {isFav ? '♥' : '♡'}
                      </button>
                    </div>

                    <div className="card-body" style={{ padding: 18, display: 'flex', flexDirection: 'column', minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                      <div className="price" style={{ fontSize: 23 }}>
                        {Number(p.price).toLocaleString('pt-PT')} {p.business_type === 'Arrendamento' ? '€/mês' : '€'}
                      </div>
                      <div className="addr" style={{ fontSize: 17, marginTop: 6, fontWeight: 500 }}>{p.typology} · {displayAddress(p)}</div>

                      <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 14, color: 'var(--text-soft)', flexWrap: 'wrap' }}>
                        {(p.area || p.area_util) && <span>📐 {p.area || p.area_util} m²</span>}
                        <span>🛏 {p.bedrooms} {t('property_rooms').toLowerCase()}</span>
                        <span>🚿 {p.bathrooms} wc</span>
                      </div>

                      {p.description && (
                        <p style={{
                          fontSize: 15.5, color: 'var(--ink)', marginTop: 12, lineHeight: 1.55,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {p.description}
                        </p>
                      )}

                      <div style={{ flex: 1 }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          {p.profiles?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.profiles.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%', background: 'var(--azulejo)', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 600,
                            }}>
                              {(p.profiles?.agency_name || p.profiles?.full_name || '?')[0].toUpperCase()}
                            </div>
                          )}
                          <span style={{ fontSize: 11.5, color: 'var(--text-soft)' }}>
                            {p.profiles?.agency_name || p.profiles?.full_name || 'Anunciante'}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>
                          {new Date(p.created_at).toLocaleDateString('pt-PT')}
                        </span>
                      </div>
                    </div>
                  </Link>
                  </React.Fragment>
                );
              })}
            </div>

            {count > PAGE_SIZE && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 28, flexWrap: 'wrap' }}>
                <button
                  onClick={() => runSearch(null, Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="btn"
                  style={{ fontSize: 13, padding: '8px 14px', opacity: page === 1 ? 0.4 : 1 }}
                >
                  &larr;
                </button>
                {Array.from({ length: Math.ceil(count / PAGE_SIZE) }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => runSearch(null, n)}
                    className="btn"
                    style={{
                      fontSize: 13, padding: '8px 13px', minWidth: 38,
                      background: n === page ? 'var(--telha)' : 'transparent',
                      color: n === page ? '#fff' : 'var(--ink)',
                      borderColor: n === page ? 'var(--telha)' : 'var(--ink)',
                    }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => runSearch(null, Math.min(Math.ceil(count / PAGE_SIZE), page + 1))}
                  disabled={page === Math.ceil(count / PAGE_SIZE)}
                  className="btn"
                  style={{ fontSize: 13, padding: '8px 14px', opacity: page === Math.ceil(count / PAGE_SIZE) ? 0.4 : 1 }}
                >
                  &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="wrap" style={{ padding: 60 }}>...</div>}>
      <ResultsInner />
    </Suspense>
  );
}
