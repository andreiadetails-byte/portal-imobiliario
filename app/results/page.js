'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import { useCompareList } from '../../lib/useCompareList';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import LocationAutocomplete from '../../components/LocationAutocomplete';
import Header from '../../components/Header';
import dynamic from 'next/dynamic';

const MapDrawSearch = dynamic(() => import('../../components/MapDrawSearch'), { ssr: false });
import { displayAddress } from '../../lib/displayAddress';
import AdBanner from '../../components/AdBanner';

function ResultsInner() {
  const searchParams = useSearchParams();
  const { t, lang } = useLanguage();
  const { ids: compareIds, toggle: toggleCompare } = useCompareList();

  const TIPOS = ['Apartamento', 'Moradia', 'Terreno', 'Espaço comercial', 'Armazém', 'Escritório', 'Quarto'];
  const TIPOLOGIAS = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5+'];

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const isFromNaturalSearch = searchParams.get('nlsearch') === '1';

  const [district, setDistrict] = useState(searchParams.get('location') || '');
  const [businessType, setBusinessType] = useState(searchParams.get('business') || 'Venda');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedTypologies, setSelectedTypologies] = useState(
    searchParams.get('typologies') ? searchParams.get('typologies').split(',') : []
  );
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [minBedrooms, setMinBedrooms] = useState('');
  const [minBathrooms, setMinBathrooms] = useState('');
  const [minArea, setMinArea] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState(
    searchParams.get('amenities') ? searchParams.get('amenities').split(',') : []
  );
  const [selectedEnergy, setSelectedEnergy] = useState([]);
  const [elevatorOnly, setElevatorOnly] = useState(searchParams.get('elevator') === '1');
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
      const prop = properties.find((p) => p.id === propertyId);
      await supabase.from('favorites').insert({ user_id: user.id, property_id: propertyId, price_at_save: prop?.price ?? null });
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

    const filters = { district, businessType, selectedTypes, selectedStates, selectedTypologies, maxPrice, minBedrooms, minBathrooms, minArea, selectedAmenities };

    const { error } = await supabase.from('saved_searches').insert({ user_id: user.id, name, filters, notify: true });
    if (!error) alert(`Pesquisa guardada! Vai receber um email sempre que aparecer um imóvel novo que corresponda.`);
  }

  // Vai buscar TODOS os imóveis com coordenadas que respeitem os filtros atuais (sem limite de página),
  // para a pesquisa por zona desenhada no mapa conseguir procurar em todo o lado, não só na página à vista.
  async function fetchAllForMapZone() {
    let query = supabase
      .from('properties')
      .select('id, latitude, longitude')
      .eq('status', 'ativo')
      .eq('business_type', businessType)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (district) {
      const pattern = `%${district.trim().split(/\s+/).filter(Boolean).join('%')}%`;
      query = query.or(`district.ilike.${pattern},address.ilike.${pattern},municipality.ilike.${pattern},parish.ilike.${pattern}`);
    }
    if (selectedTypes.length > 0) query = query.in('property_type', selectedTypes);
    if (selectedStates.length > 0) query = query.in('state', selectedStates);
    if (selectedTypologies.length > 0) query = query.in('typology', selectedTypologies);
    if (maxPrice) query = query.lte('price', Number(maxPrice));
    if (minBedrooms) query = query.gte('bedrooms', Number(minBedrooms));
    if (minBathrooms) query = query.gte('bathrooms', Number(minBathrooms));
    if (minArea) query = query.gte('area', Number(minArea));
    selectedAmenities.forEach((col) => { query = query.eq(col, true); });
    if (selectedEnergy.length > 0) query = query.in('energy_certificate', selectedEnergy);
    if (elevatorOnly) query = query.contains('features', ['Elevador']);

    const { data } = await query;
    return data || [];
  }

  // Depois de saber quais IDs caem dentro da zona desenhada, vai buscar os dados completos desses imóveis.
  async function loadPropertiesByIds(ids) {
    if (ids.length === 0) { setProperties([]); return; }
    const { data } = await supabase
      .from('properties')
      .select('id, owner_id, title, description, description_translations, price, previous_price, display_name, address, district, municipality, parish, show_full_address, typology, property_type, area, area_util, bedrooms, bathrooms, business_type, latitude, longitude, floor_plan_url, featured_status, has_storage, has_parking, has_balcony, has_garden, has_pool, has_gym, has_coworking, near_transit, is_furnished, pets_allowed, created_at, property_photos(url, position)')
      .in('id', ids);

    let sorted = [...(data || [])].sort((a, b) => (b.featured_status === 'active') - (a.featured_status === 'active'));

    const ownerIds = [...new Set(sorted.map((p) => p.owner_id).filter(Boolean))];
    if (ownerIds.length > 0) {
      const { data: owners } = await supabase.from('profiles_public').select('*').in('id', ownerIds);
      const ownersById = Object.fromEntries((owners || []).map((o) => [o.id, o]));
      sorted = sorted.map((p) => ({ ...p, profiles: ownersById[p.owner_id] || null }));
    }
    setProperties(sorted);
  }

  async function runSearch(e, targetPage, sortOverride) {
    if (e) e.preventDefault();
    const goToPage = targetPage || 1;
    const effectiveSort = sortOverride || sortBy;
    setPage(goToPage);
    setLoading(true);
    if (typeof window !== 'undefined' && targetPage) window.scrollTo({ top: 0, behavior: 'smooth' });

    let query = supabase
      .from('properties')
      .select('id, owner_id, title, description, description_translations, price, previous_price, display_name, address, district, municipality, parish, show_full_address, typology, property_type, area, area_util, bedrooms, bathrooms, business_type, latitude, longitude, floor_plan_url, featured_status, has_storage, has_parking, has_balcony, has_garden, has_pool, has_gym, has_coworking, near_transit, is_furnished, pets_allowed, created_at, property_photos(url, position)', { count: 'exact' })
      .eq('status', 'ativo')
      .eq('business_type', businessType);

    if (district) {
      // Junta as palavras com "%" no meio, para "vila nova gaia" encontrar
      // "Vila Nova de Gaia" sem ser preciso escrever o "de".
      const pattern = `%${district.trim().split(/\s+/).filter(Boolean).join('%')}%`;
      query = query.or(`district.ilike.${pattern},address.ilike.${pattern},municipality.ilike.${pattern},parish.ilike.${pattern}`);
    }
    if (selectedTypes.length > 0) query = query.in('property_type', selectedTypes);
    if (selectedStates.length > 0) query = query.in('state', selectedStates);
    if (selectedTypologies.length > 0) query = query.in('typology', selectedTypologies);
    if (maxPrice) query = query.lte('price', Number(maxPrice));
    if (minBedrooms) query = query.gte('bedrooms', Number(minBedrooms));
    if (minBathrooms) query = query.gte('bathrooms', Number(minBathrooms));
    if (minArea) query = query.gte('area', Number(minArea));
    selectedAmenities.forEach((col) => { query = query.eq(col, true); });
    if (selectedEnergy.length > 0) query = query.in('energy_certificate', selectedEnergy);
    if (elevatorOnly) query = query.contains('features', ['Elevador']);

    query = effectiveSort === 'price_asc' ? query.order('price', { ascending: true })
      : effectiveSort === 'price_desc' ? query.order('price', { ascending: false })
      : query.order('created_at', { ascending: false });

    query = query.range((goToPage - 1) * PAGE_SIZE, goToPage * PAGE_SIZE - 1);

    const { data, count: total, error } = await query;
    if (!error) {
      // Os destaques só "saltam" para a frente quando se vê por mais recentes.
      // Ao ordenar por preço, respeita-se sempre a ordem real de preços.
      let sorted = effectiveSort === 'recent'
        ? [...(data || [])].sort((a, b) => (b.featured_status === 'active') - (a.featured_status === 'active'))
        : (data || []);

      // Junta os perfis dos anunciantes através da vista segura (nunca traz telefones
      // privados, mesmo que tentássemos pedir — a base de dados não deixa).
      const ownerIds = [...new Set(sorted.map((p) => p.owner_id).filter(Boolean))];
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase.from('profiles_public').select('*').in('id', ownerIds);
        const ownersById = Object.fromEntries((owners || []).map((o) => [o.id, o]));
        sorted = sorted.map((p) => ({ ...p, profiles: ownersById[p.owner_id] || null }));
      }

      setProperties(sorted);
      setCount(total || 0);
    }
    setLoading(false);
  }

  return (
    <>
      <Header />

      <main id="main-content" className="wrap" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <h1 className="display" style={{ fontSize: 26, marginBottom: 20 }}>{t('results_title')}</h1>

        <div className="results-grid" style={{ display: 'grid', gridTemplateColumns: '200px minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>

          <div>
          <form onSubmit={runSearch} className="card filters-form" style={{ padding: 18, position: 'sticky', top: 90, overflow: 'visible' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 6 }}>
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
              <label>Estado do imóvel</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 6 }}>
                <span
                  onClick={() => setSelectedStates([])}
                  style={{
                    fontSize: 11.5, padding: '6px 4px', textAlign: 'center', borderRadius: 5, cursor: 'pointer',
                    border: '1px solid var(--line)',
                    background: selectedStates.length === 0 ? 'var(--azulejo)' : 'var(--paper)',
                    color: selectedStates.length === 0 ? '#fff' : 'var(--text-soft)',
                    gridColumn: '1 / -1',
                  }}
                >
                  Todos
                </span>
                {['Novo', 'Em construção', 'Para recuperar', 'Usado'].map((st) => (
                  <span
                    key={st}
                    onClick={() => toggleFromList(selectedStates, setSelectedStates, st)}
                    style={{
                      fontSize: 11.5, padding: '6px 4px', textAlign: 'center', borderRadius: 5, cursor: 'pointer',
                      border: '1px solid var(--line)',
                      background: selectedStates.includes(st) ? 'var(--azulejo)' : 'var(--paper)',
                      color: selectedStates.includes(st) ? '#fff' : 'var(--text-soft)',
                    }}
                  >
                    {st}
                  </span>
                ))}
              </div>
            </div>

            <div className="field">
              <label>{t('results_typology')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
                {TIPOLOGIAS.map((tp) => (
                  <span
                    key={tp}
                    onClick={() => toggleFromList(selectedTypologies, setSelectedTypologies, tp)}
                    style={{
                      fontSize: 12, padding: '6px 0', textAlign: 'center', borderRadius: 5, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
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
                  {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="field">
                <label>WC (mín.)</label>
                <select value={minBathrooms} onChange={(e) => setMinBathrooms(e.target.value)}>
                  <option value="">Qualquer</option>
                  {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Área mínima (m²)</label>
              <input type="number" value={minArea} onChange={(e) => setMinArea(e.target.value)} />
            </div>

            <div className="field">
              <label>Características</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 6 }}>
                {[
                  ['has_storage', 'Arrumos'], ['has_parking', 'Estacion.'], ['has_balcony', 'Varanda'],
                  ['has_garden', 'Jardim'], ['has_pool', 'Piscina'], ['has_gym', 'Ginásio'], ['has_coworking', 'Coworking'],
                  ['near_transit', 'Transportes'],
                  ...(businessType === 'Arrendamento' ? [['is_furnished', 'Mobilado'], ['pets_allowed', 'Aceita animais']] : []),
                ].map(([col, label]) => (
                  <span
                    key={col}
                    onClick={() => toggleFromList(selectedAmenities, setSelectedAmenities, col)}
                    style={{
                      fontSize: 11, padding: '6px 4px', textAlign: 'center', borderRadius: 5, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      border: '1px solid var(--line)',
                      background: selectedAmenities.includes(col) ? 'var(--azulejo)' : 'var(--paper)',
                      color: selectedAmenities.includes(col) ? '#fff' : 'var(--text-soft)',
                    }}
                  >
                    {label}
                  </span>
                ))}
                <span
                  onClick={() => setElevatorOnly((v) => !v)}
                  style={{
                    fontSize: 11, padding: '6px 4px', textAlign: 'center', borderRadius: 5, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    border: '1px solid var(--line)',
                    background: elevatorOnly ? 'var(--azulejo)' : 'var(--paper)',
                    color: elevatorOnly ? '#fff' : 'var(--text-soft)',
                  }}
                >
                  Elevador
                </span>
              </div>
            </div>

            <div className="field">
              <label>Certificado energético</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
                {['A+', 'A', 'B', 'C', 'D', 'E', 'F'].map((cls) => (
                  <span
                    key={cls}
                    onClick={() => toggleFromList(selectedEnergy, setSelectedEnergy, cls)}
                    style={{
                      fontSize: 12, padding: '6px 0', textAlign: 'center', borderRadius: 5, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      border: '1px solid var(--line)',
                      background: selectedEnergy.includes(cls) ? 'var(--azulejo)' : 'var(--paper)',
                      color: selectedEnergy.includes(cls) ? '#fff' : 'var(--text-soft)',
                    }}
                  >
                    {cls}
                  </span>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block">{t('results_filter')}</button>
          </form>

          <div id="map-section" style={{ marginTop: 16 }}>
            <div
              onClick={() => setShowMap((s) => !s)}
              style={{ fontSize: 12.5, color: 'var(--telha)', cursor: 'pointer', marginBottom: 8, textAlign: 'center' }}
            >
              {showMap ? '✕ Esconder mapa' : '🗺️ Ver mapa'}
            </div>
            {showMap && (
              <div className="card" style={{ padding: 10 }}>
                <MapDrawSearch
                  properties={properties}
                  fetchAllWithCoords={fetchAllForMapZone}
                  autoStart={searchParams.get('draw') === '1'}
                  onFilter={async (ids) => {
                    setMapFilterIds(ids);
                    if (ids) {
                      await loadPropertiesByIds(ids);
                    } else {
                      runSearch(null, 1);
                    }
                  }}
                  height={200}
                />
              </div>
            )}
          </div>
          </div>

          <div>
            {isFromNaturalSearch && !loading && (
              <div style={{
                background: 'linear-gradient(135deg, var(--telha) 0%, #3E4A32 100%)', borderRadius: 10,
                padding: '20px 24px', marginBottom: 20, color: '#fff',
              }}>
                <div className="display" style={{ fontSize: 24, fontWeight: 600 }}>
                  {count > 0 ? `Tenho ${count} imóve${count === 1 ? 'l' : 'is'} para ti!` : 'Ainda não tenho nada assim.'}
                </div>
                <div style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.9)', marginTop: 6 }}>
                  {count > 0
                    ? 'Baseado no que descreveste. Afina mais nos filtros ao lado, se quiseres.'
                    : 'Ajusta os filtros ao lado, ou guarda a pesquisa para te avisarmos assim que aparecer algo.'}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)' }} role="status" aria-live="polite">
                {loading ? t('results_searching') : `${mapFilterIds ? mapFilterIds.length : count} ${t('results_found')}`}
              </span>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" onClick={saveSearch} className="btn" style={{ fontSize: 13 }}>
                  🔔 Guardar pesquisa
                </button>
                <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); runSearch(null, page, e.target.value); }} style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 5 }}>
                  <option value="recent">{t('results_sort_recent')}</option>
                  <option value="price_asc">{t('results_sort_price_asc')}</option>
                  <option value="price_desc">{t('results_sort_price_desc')}</option>
                </select>
              </div>
            </div>

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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {properties.map((p, i) => {
                const sortedPhotos = p.property_photos?.sort((a, b) => a.position - b.position) || [];
                const firstPhoto = sortedPhotos[0]?.url;
                const isFav = favoriteIds.includes(p.id);
                return (
                  <React.Fragment key={p.id}>
                  {i > 0 && i % 5 === 0 && <AdBanner key={`ad-${i}`} animated={(i / 5) % 2 === 1} />}
                  <Link href={`/property/${p.id}`} className={`card result-card${p.featured_status === 'active' ? ' card-destaque' : ''}`}
                        style={{
                          display: 'grid', gridTemplateColumns: '520px minmax(0, 1fr)', overflow: 'hidden', position: 'relative',
                          border: p.featured_status === 'active' ? '2.5px solid var(--gold-strong)' : undefined, boxShadow: p.featured_status === 'active' ? '0 6px 18px rgba(201,162,39,0.28)' : undefined,
                        }}>
                    <div className="result-card-photo" style={{ position: 'relative', height: 400, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {sortedPhotos.length > 1 ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={firstPhoto} alt={`Foto principal do imóvel ${p.typology} loading="lazy" em ${p.district}`} style={{ width: '100%', flex: '1 1 0', minHeight: 0, objectFit: 'cover' }} />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, height: 110, flexShrink: 0 }}>
                            {[1, 2].map((offset) => {
                              const photo = sortedPhotos[offset % sortedPhotos.length];
                              const isLast = offset === 2;
                              const remaining = sortedPhotos.length - 3;
                              return (
                                <div key={offset} style={{ position: 'relative', overflow: 'hidden' }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={photo.url} alt={`Foto adicional do imóvel ${p.typology} loading="lazy" em ${p.district}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                        </>
                      ) : firstPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={firstPhoto} alt={`Foto do imóvel ${p.typology} loading="lazy" em ${p.district}`} style={{ width: '100%', height: 400, objectFit: 'cover' }} />
                      ) : (
                        <div className="card-photo" style={{ height: 400 }} />
                      )}

                      {p.featured_status === 'active' && (
                        <span className="destaque-strip">★ DESTAQUE</span>
                      )}

                      <label
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute', bottom: 10, left: 10, display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
                          background: 'rgba(255,255,255,0.92)', color: 'var(--ink)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={compareIds.includes(p.id)}
                          onChange={(e) => { e.preventDefault(); toggleCompare(p.id); }}
                          style={{ cursor: 'pointer' }}
                        />
                        Comparar
                      </label>

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

                      <div style={{ position: 'absolute', top: 10, right: 50, display: 'flex', gap: 6 }}>
                        {p.floor_plan_url && (
                          <a
                            href={p.floor_plan_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Ver planta"
                            title="Ver planta"
                            style={{
                              width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.92)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, textDecoration: 'none',
                            }}
                          >
                            📐
                          </a>
                        )}
                        {p.latitude && p.longitude && (
                          <a
                            href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Ver localização"
                            title="Ver localização"
                            style={{
                              width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.92)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, textDecoration: 'none',
                            }}
                          >
                            📍
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="card-body" style={{ padding: 26, display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                      <div className="price" style={{ fontSize: 28 }}>
                        {Number(p.price).toLocaleString('pt-PT')} {p.business_type === 'Arrendamento' ? '€/mês' : '€'}
                      </div>
                      {p.previous_price && p.previous_price > p.price && (
                        <span style={{
                          fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 10,
                          background: 'rgba(126,143,106,0.18)', color: 'var(--telha)',
                        }}>
                          ↓ Reduzido
                        </span>
                      )}
                      <div className="addr" style={{ fontSize: 20, marginTop: 8, fontWeight: 500 }}>{p.typology} · {displayAddress(p)}</div>
                      <div className="meta" style={{ marginBottom: 0, fontSize: 16 }}>
                        {p.district}{p.parish ? ` · ${p.parish}` : p.municipality ? ` · ${p.municipality}` : ''}
                      </div>

                      <div style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: 15.5, color: 'var(--text-soft)', flexWrap: 'wrap' }}>
                        {(p.area || p.area_util) && <span>📐 {p.area || p.area_util} m²</span>}
                        <span>🛏 {p.bedrooms} {t('property_rooms').toLowerCase()}</span>
                        <span>🚿 {p.bathrooms} wc</span>
                      </div>

                      {p.description && (
                        <p style={{
                          fontSize: 16, color: 'var(--ink)', marginTop: 16, lineHeight: 1.6,
                          display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          width: '100%', maxWidth: '100%', boxSizing: 'border-box',
                        }}>
                          {(lang !== 'pt' && p.description_translations?.[lang]) || p.description}
                        </p>
                      )}

                      <div style={{ flex: 1 }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
                          {p.profiles?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.profiles.avatar_url} alt="" loading="lazy" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%', background: 'var(--azulejo)', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 600, flexShrink: 0,
                            }}>
                              {(p.display_name || p.profiles?.agency_name || p.profiles?.full_name || '?')[0].toUpperCase()}
                            </div>
                          )}
                          <span style={{
                            fontSize: 11.5, color: 'var(--text-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {p.display_name || p.profiles?.agency_name || p.profiles?.full_name || 'Anunciante'}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-soft)', flexShrink: 0 }}>
                          {new Date(p.created_at).toLocaleDateString('pt-PT')}
                        </span>
                      </div>
                      {p.profiles?.phone_public && (
                        <a
                          href={`tel:${p.profiles.phone_public.replace(/\s+/g, '')}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12.5,
                            fontWeight: 600, color: 'var(--telha)', textDecoration: 'none',
                          }}
                        >
                          📞 {p.profiles.phone_public}
                        </a>
                      )}
                    </div>
                  </Link>
                  </React.Fragment>
                );
              })}
            </div>

            {!mapFilterIds && count > PAGE_SIZE && (
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
      </main>
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
