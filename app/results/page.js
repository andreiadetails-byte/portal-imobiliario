'use client';

import { useEffect, useState, Suspense } from 'react';
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

  async function runSearch(e) {
    if (e) e.preventDefault();
    setLoading(true);

    let query = supabase
      .from('properties')
      .select('id, title, price, address, district, municipality, parish, show_full_address, typology, property_type, area, area_util, bedrooms, bathrooms, business_type, latitude, longitude, featured_status, has_storage, has_parking, has_balcony, has_garden, has_pool, has_gym, has_coworking, created_at, property_photos(url, position), profiles(avatar_url, full_name, agency_name)', { count: 'exact' })
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

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28, alignItems: 'start' }}>

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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(mapFilterIds ? properties.filter((p) => mapFilterIds.includes(p.id)) : properties).map((p) => {
                const firstPhoto = p.property_photos?.sort((a, b) => a.position - b.position)[0]?.url;
                return (
                  <Link key={p.id} href={`/property/${p.id}`} className={`card${p.featured_status === 'active' ? ' card-destaque' : ''}`}
                        style={{
                          display: 'grid', gridTemplateColumns: '160px 1fr', overflow: 'hidden', position: 'relative',
                          border: p.featured_status === 'active' ? '1.5px solid var(--brass)' : undefined,
                        }}>
                    {p.featured_status === 'active' && (
                      <span style={{
                        position: 'absolute', top: 8, left: 8, zIndex: 1, fontSize: 10.5, fontWeight: 700,
                        padding: '3px 9px', borderRadius: 10, background: 'var(--brass)', color: '#5C4E2A',
                      }}>
                        ★ DESTAQUE
                      </span>
                    )}
                    {firstPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={firstPhoto} alt="" style={{ width: '100%', height: '100%', minHeight: 110, objectFit: 'cover' }} />
                    ) : (
                      <div className="card-photo" style={{ height: '100%', minHeight: 110 }} />
                    )}
                    <div className="card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div className="price mono">
                          {Number(p.price).toLocaleString('pt-PT')} {p.business_type === 'Arrendamento' ? '€/mês' : '€'}
                        </div>
                        {p.profiles && (
                          <div title={p.profiles.agency_name || p.profiles.full_name} style={{ flexShrink: 0 }}>
                            {p.profiles.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.profiles.avatar_url} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{
                                width: 26, height: 26, borderRadius: '50%', background: 'var(--azulejo)', color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600,
                              }}>
                                {(p.profiles.agency_name || p.profiles.full_name || '?')[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="addr">{p.typology} · {displayAddress(p)}</div>
                      <div className="meta">{p.district} · {p.area || p.area_util} m² · {p.bedrooms} {t('property_rooms').toLowerCase()}</div>
                      <div className="meta" style={{ marginTop: -8, fontSize: 11 }}>Publicado em {new Date(p.created_at).toLocaleDateString('pt-PT')}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
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
