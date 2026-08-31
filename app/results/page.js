'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import LocationAutocomplete from '../../components/LocationAutocomplete';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import dynamic from 'next/dynamic';

const MapDrawSearch = dynamic(() => import('../../components/MapDrawSearch'), { ssr: false });
import { displayAddress } from '../../lib/displayAddress';
import AdBanner from '../../components/AdBanner';
import ResultCardPhotos from '../../components/ResultCardPhotos';
import PhoneDisplay from '../../components/PhoneDisplay';
import { getLocalFavoriteIds, toggleLocalFavorite } from '../../lib/localFavorites';

function ResultsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, lang } = useLanguage();

  const TIPOS = ['Apartamento', 'Moradia', 'Terreno', 'Espaço comercial', 'Armazém', 'Escritório', 'Quarto'];
  const TIPO_LABELS = {
    Apartamento: t('results_type_apartment'), Moradia: t('results_type_house'), Terreno: t('results_type_land'),
    'Espaço comercial': t('results_type_commercial'), Armazém: t('results_type_warehouse'),
    Escritório: t('results_type_office'), Quarto: t('results_type_room'),
  };
  const TIPOLOGIAS = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5+'];

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const isFromNaturalSearch = searchParams.get('nlsearch') === '1';

  const [district, setDistrict] = useState(searchParams.get('location') || '');
  const [agencyQuery, setAgencyQuery] = useState('');
  const [agencySuggestions, setAgencySuggestions] = useState([]);
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [businessType, setBusinessType] = useState(searchParams.get('business') || 'Venda');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedTypologies, setSelectedTypologies] = useState(
    searchParams.get('typologies') ? searchParams.get('typologies').split(',') : []
  );
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [minBedrooms, setMinBedrooms] = useState('0');
  const [minBathrooms, setMinBathrooms] = useState('0');
  const [minArea, setMinArea] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState(
    searchParams.get('amenities') ? searchParams.get('amenities').split(',') : []
  );
  const [selectedEnergy, setSelectedEnergy] = useState([]);
  const [elevatorOnly, setElevatorOnly] = useState(searchParams.get('elevator') === '1');

  // Conta quantos filtros a pessoa já escolheu, para mostrar "Filtros (5)"
  // no telemóvel — tal como noutros portais imobiliários conhecidos.
  const activeFilterCount = [
    district, minPrice, maxPrice, minBedrooms, minBathrooms, minArea,
    selectedStates.length > 0, selectedTypologies.length > 0, elevatorOnly,
  ].filter(Boolean).length;
  const [sortBy, setSortBy] = useState('recent');
  const [showMap, setShowMap] = useState(searchParams.get('draw') === '1');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [mapFilterIds, setMapFilterIds] = useState(null);
  const [user, setUser] = useState(null);
  const [messageModalFor, setMessageModalFor] = useState(null); // guarda o imóvel (p) sendo contactado
  const [messageForm, setMessageForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser(data.user);
        const { data: favs } = await supabase.from('favorites').select('property_id').eq('user_id', data.user.id);
        setFavoriteIds((favs || []).map((f) => f.property_id));
      } else {
        setFavoriteIds(getLocalFavoriteIds());
      }
    });
  }, []);

  async function toggleFavorite(e, propertyId) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      const updated = toggleLocalFavorite(propertyId);
      setFavoriteIds(updated);
      return;
    }
    if (favoriteIds.includes(propertyId)) {
      const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('property_id', propertyId);
      if (error) { console.error('Erro ao remover favorito:', error); alert(`Não foi possível remover dos favoritos: ${error.message}`); return; }
      setFavoriteIds((cur) => cur.filter((id) => id !== propertyId));
    } else {
      const prop = properties.find((p) => p.id === propertyId);
      const { error } = await supabase.from('favorites').insert({ user_id: user.id, property_id: propertyId, price_at_save: prop?.price ?? null });
      if (error) { console.error('Erro ao guardar favorito:', error); alert(`Não foi possível guardar nos favoritos: ${error.message}`); return; }
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

  async function searchAgencies(query) {
    setAgencyQuery(query);
    if (query.trim().length < 2) { setAgencySuggestions([]); return; }
    const { data } = await supabase
      .from('profiles_public')
      .select('id, agency_name, full_name, avatar_url')
      .eq('account_type', 'agencia')
      .or(`agency_name.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(6);
    setAgencySuggestions(data || []);
  }

  function pickAgency(agency) {
    setSelectedAgency(agency);
    setAgencyQuery(agency.agency_name || agency.full_name);
    setAgencySuggestions([]);
  }

  function clearAgency() {
    setSelectedAgency(null);
    setAgencyQuery('');
    setAgencySuggestions([]);
  }

  async function saveSearch() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (confirm(t('results_save_search_needs_account'))) window.location.href = '/login';
      return;
    }

    const name = district
      ? `${businessType === 'Arrendamento' ? 'Arrendar' : 'Comprar'} em ${district}`
      : `${businessType === 'Arrendamento' ? 'Arrendar' : 'Comprar'} imóvel`;

    const filters = { district, businessType, selectedTypes, selectedStates, selectedAgency, selectedTypologies, minPrice, maxPrice, minBedrooms, minBathrooms, minArea, selectedAmenities };

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
    if (selectedAgency) query = query.eq('owner_id', selectedAgency.id);
    if (selectedTypologies.length > 0) query = query.in('typology', selectedTypologies);
    if (minPrice) query = query.gte('price', Number(minPrice));
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
      .select('id, owner_id, title, description, description_translations, price, previous_price, display_name, address, district, municipality, parish, show_full_address, typology, property_type, area, area_util, bedrooms, bathrooms, business_type, latitude, longitude, floor_plan_url, featured_status, has_storage, has_parking, has_balcony, has_garden, has_pool, has_gym, has_coworking, near_transit, is_furnished, pets_allowed, created_at, property_photos(url, thumbnail_url, position)')
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

  async function openMessageModal(p) {
    setMessageSent(false);
    setAcceptedPolicy(false);
    if (user) {
      const { data: myProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      setMessageForm({ name: myProfile?.full_name || '', email: user.email || '', phone: '', message: '' });
    } else {
      setMessageForm({ name: '', email: '', phone: '', message: '' });
    }
    setMessageModalFor(p);
  }

  async function sendInlineMessage(e) {
    e.preventDefault();
    if (!messageModalFor) return;
    setSendingMessage(true);
    const p = messageModalFor;

    if (user && user.id !== p.owner_id) {
      // Com sessão iniciada: vai diretamente para o chat, tal como na ficha do imóvel.
      const { data: existing } = await supabase
        .from('conversations').select('id').eq('property_id', p.id).eq('buyer_id', user.id).maybeSingle();
      let conversationId = existing?.id;
      if (!conversationId) {
        const { data: created } = await supabase
          .from('conversations').insert({ property_id: p.id, buyer_id: user.id, seller_id: p.owner_id }).select().single();
        conversationId = created?.id;
      }
      if (conversationId) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: messageForm.message,
          sender_name: messageForm.name,
          sender_email: messageForm.email,
          sender_phone: messageForm.phone || null,
        });
      }
    } else {
      // Sem sessão iniciada — fica como lead, tal como na ficha do imóvel.
      await supabase.from('leads').insert({
        property_id: p.id,
        owner_id: p.owner_id,
        name: messageForm.name,
        email: messageForm.email,
        phone: messageForm.phone,
        message: messageForm.message,
      });
    }

    setSendingMessage(false);
    setMessageSent(true);
  }

  async function runSearch(e, targetPage, sortOverride) {
    if (e) e.preventDefault();
    setShowFiltersModal(false);
    const goToPage = targetPage || 1;
    const effectiveSort = sortOverride || sortBy;
    setPage(goToPage);
    setLoading(true);
    if (typeof window !== 'undefined' && targetPage) window.scrollTo({ top: 0, behavior: 'smooth' });

    let query = supabase
      .from('properties')
      .select('id, owner_id, title, description, description_translations, price, previous_price, display_name, address, district, municipality, parish, show_full_address, typology, property_type, area, area_util, bedrooms, bathrooms, business_type, latitude, longitude, floor_plan_url, featured_status, has_storage, has_parking, has_balcony, has_garden, has_pool, has_gym, has_coworking, near_transit, is_furnished, pets_allowed, created_at, property_photos(url, thumbnail_url, position)', { count: 'exact' })
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
    if (selectedAgency) query = query.eq('owner_id', selectedAgency.id);
    if (selectedTypologies.length > 0) query = query.in('typology', selectedTypologies);
    if (minPrice) query = query.gte('price', Number(minPrice));
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
        <BackButton fallback="/" />
        <h1 className="display" style={{ fontSize: 26, marginBottom: 4 }}>{t('results_title')}</h1>
        <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 20 }}>
          {loading ? t('results_searching') : `${mapFilterIds ? mapFilterIds.length : count} ${t('results_found')}`}
        </p>

        <div className="results-mobile-toolbar">
          <button type="button" onClick={() => setShowFiltersModal(true)} className="btn">
            ☰ {t('results_filters_label')} {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); runSearch(null, page, e.target.value); }}
            className="btn"
            style={{ textAlign: 'center' }}
          >
            <option value="recent">{t('results_sort_recent')}</option>
            <option value="price_asc">{t('results_sort_price_asc')}</option>
            <option value="price_desc">{t('results_sort_price_desc')}</option>
          </select>
          <button type="button" onClick={() => setShowMap((s) => !s)} className="btn">
            📍 {t('results_map_label')}
          </button>
        </div>

        <div className="results-grid" style={{ display: 'grid', gridTemplateColumns: '200px minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>

          <div className={showFiltersModal ? 'filters-modal-open' : ''} style={{ gridColumn: 1, gridRow: 1 }}>
          <form onSubmit={runSearch} className="card filters-form" style={{ padding: 18, position: 'sticky', top: 90, overflow: 'visible' }}>
            <div className="filters-modal-header">
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>{t('results_filters_label')}</span>
              <button type="button" onClick={() => setShowFiltersModal(false)} aria-label={t('attr_close')} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-soft)' }}>✕</button>
            </div>
            <div className="field">
              <label>{t('results_business')}</label>
              <select value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
                <option value="Venda">{t('results_buy')}</option>
                <option value="Arrendamento">{t('results_rent')}</option>
              </select>
            </div>

            <div className="field">
              <label>{t('results_district')}</label>
              <LocationAutocomplete onChange={setDistrict} placeholder="ex: Lisboa" initialValue={district} />
            </div>

            <div className="field">
              <label>{t('results_price_label')}</label>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', minWidth: 0 }}>
                <input type="number" placeholder={t('results_price_from')} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} style={{ minWidth: 0, flex: 1, fontSize: 12, padding: '8px 6px' }} />
                <span style={{ color: 'var(--text-soft)', fontSize: 12, flexShrink: 0 }}>—</span>
                <input type="number" placeholder={t('results_price_to')} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} style={{ minWidth: 0, flex: 1, fontSize: 12, padding: '8px 6px' }} />
              </div>
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
                    {TIPO_LABELS[tp]}
                  </span>
                ))}
              </div>
            </div>

            <div className="field" style={{ position: 'relative' }}>
              <label>{t('results_only_agency')}</label>
              <input
                value={agencyQuery}
                onChange={(e) => { if (selectedAgency) clearAgency(); searchAgencies(e.target.value); }}
                placeholder={t('results_agency_placeholder')}
                style={{ paddingRight: selectedAgency ? 30 : undefined }}
              />
              {selectedAgency && (
                <button
                  onClick={clearAgency}
                  aria-label="Remover filtro de agência"
                  style={{ position: 'absolute', right: 10, top: 33, background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: 'var(--text-soft)' }}
                >
                  ✕
                </button>
              )}
              {agencySuggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 2,
                  background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8,
                  boxShadow: '0 6px 18px rgba(51,46,34,0.15)', maxHeight: 220, overflowY: 'auto',
                }}>
                  {agencySuggestions.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => pickAgency(a)}
                      style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid var(--line)' }}
                    >
                      {a.agency_name || a.full_name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="field">
              <label>{t('results_property_state')}</label>
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
                  {t('results_all')}
                </span>
                {[['Novo', t('results_state_new')], ['Em construção', t('results_state_construction')], ['Para recuperar', t('results_state_torenovate')], ['Usado', t('results_state_used')]].map(([st, stLabel]) => (
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
                    {stLabel}
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
                      fontSize: 12, padding: '6px 0', textAlign: 'center', borderRadius: 5, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'start' }}>
              <div className="field">
                <label>{t('results_min_bedrooms')}</label>
                <select value={minBedrooms} onChange={(e) => setMinBedrooms(e.target.value)}>
                  {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="field">
                <label>{t('results_wc_min')}</label>
                <select value={minBathrooms} onChange={(e) => setMinBathrooms(e.target.value)}>
                  {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label>{t('results_min_area')}</label>
              <input type="number" value={minArea} onChange={(e) => setMinArea(e.target.value)} />
            </div>

            <div className="field">
              <label>{t('results_features')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 6 }}>
                {[
                  ['has_storage', t('results_feat_storage')], ['has_parking', t('results_feat_parking')], ['has_balcony', t('results_feat_balcony')],
                  ['has_garden', t('results_feat_garden')], ['has_pool', t('results_feat_pool')], ['has_gym', t('results_feat_gym')], ['has_coworking', t('results_feat_coworking')],
                  ['near_transit', t('results_feat_transit')],
                  ...(businessType === 'Arrendamento' ? [['is_furnished', t('results_feat_furnished')], ['pets_allowed', t('results_feat_pets')]] : []),
                ].map(([col, label]) => (
                  <span
                    key={col}
                    onClick={() => toggleFromList(selectedAmenities, setSelectedAmenities, col)}
                    style={{
                      fontSize: 11, padding: '6px 4px', textAlign: 'center', borderRadius: 5, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
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
                    fontSize: 11, padding: '6px 4px', textAlign: 'center', borderRadius: 5, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                    border: '1px solid var(--line)',
                    background: elevatorOnly ? 'var(--azulejo)' : 'var(--paper)',
                    color: elevatorOnly ? '#fff' : 'var(--text-soft)',
                  }}
                >
                  {t('results_feat_elevator')}
                </span>
              </div>
            </div>

            <div className="field">
              <label>{t('results_energy_cert')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
                {['A+', 'A', 'B', 'C', 'D', 'E', 'F'].map((cls) => (
                  <span
                    key={cls}
                    onClick={() => toggleFromList(selectedEnergy, setSelectedEnergy, cls)}
                    style={{
                      fontSize: 12, padding: '6px 0', textAlign: 'center', borderRadius: 5, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
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
          </div>

          <div id="map-section" style={{ marginTop: 16, gridColumn: 1, gridRow: 2 }}>
            <div
              onClick={() => setShowMap((s) => !s)}
              style={{ fontSize: 12.5, color: 'var(--telha)', cursor: 'pointer', marginBottom: 8, textAlign: 'center' }}
            >
              {showMap ? t('results_hide_map') : t('results_view_map')}
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

          <div style={{ gridColumn: 2, gridRow: '1 / 3', minWidth: 0 }}>
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
                  {t('results_save_search')}
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
                const firstPhoto = sortedPhotos[0]?.thumbnail_url || sortedPhotos[0]?.url;
                const isFav = favoriteIds.includes(p.id);
                return (
                  <React.Fragment key={p.id}>
                  {i > 0 && i % 5 === 0 && <AdBanner key={`ad-${i}`} animated={(i / 5) % 2 === 1} />}
                  <div
                    onClick={() => router.push(`/property/${p.id}`)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/property/${p.id}`); }}
                    className={`card result-card${p.featured_status === 'active' ? ' card-destaque' : ''}`}
                        style={{
                          display: 'grid', gridTemplateColumns: '520px minmax(0, 1fr)', overflow: 'hidden', position: 'relative', cursor: 'pointer',
                          border: p.featured_status === 'active' ? '2.5px solid var(--gold-strong)' : undefined, boxShadow: p.featured_status === 'active' ? '0 6px 18px rgba(201,162,39,0.28)' : undefined,
                        }}>
                    <div className="result-card-photo result-card-photo-mobile-inner" style={{ position: 'relative', height: 400 }}>
                      <ResultCardPhotos photos={sortedPhotos} typology={p.typology} district={p.district} />

                      {p.featured_status === 'active' && (
                        <span className="destaque-strip">★ DESTAQUE</span>
                      )}

                      <button
                        onClick={(e) => toggleFavorite(e, p.id)}
                        aria-label="Guardar nos favoritos"
                        style={{
                          position: 'absolute', top: 10, right: 10, width: 40, height: 40, borderRadius: '50%',
                          background: isFav ? '#b8452f' : 'rgba(255,255,255,0.95)', border: 'none', cursor: 'pointer', fontSize: 20,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                          color: isFav ? '#fff' : '#b8452f',
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
                      <div className="price result-card-price" style={{ fontSize: 28, fontWeight: 800, color: 'var(--telha)' }}>
                        {Number(p.price).toLocaleString('pt-PT')} {p.business_type === 'Arrendamento' ? '€/mês' : '€'}
                      </div>
                      {p.previous_price && p.previous_price > p.price && (
                        <span style={{
                          fontSize: 12.5, fontWeight: 700, padding: '3px 9px', borderRadius: 10,
                          background: 'rgba(126,143,106,0.18)', color: 'var(--telha)',
                        }}>
                          ↓ Reduzido
                        </span>
                      )}
                      <div className="addr result-card-addr" style={{ fontSize: 18, marginTop: 8, fontWeight: 600 }}>{p.typology} · {displayAddress(p)}</div>
                      <div className="meta" style={{ marginBottom: 0, fontSize: 17 }}>
                        {p.district}{p.parish ? ` · ${p.parish}` : p.municipality ? ` · ${p.municipality}` : ''}
                      </div>

                      <div className="result-card-details" style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: 14.5, color: 'var(--text-soft)', flexWrap: 'wrap' }}>
                        {p.area_util && <span>📐 {p.area_util} {t('meta_sqm_useful')}</span>}
                        <span>🛏 {p.bedrooms} {t('property_rooms').toLowerCase()}</span>
                        <span>🚿 {p.bathrooms} wc</span>
                      </div>

                      {p.description && (
                        <p className="result-card-description" style={{
                          fontSize: 15, color: 'var(--ink)', marginTop: 16, lineHeight: 1.6,
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
                            fontSize: 11.5, color: 'var(--text-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                          }}>
                            {p.display_name || p.profiles?.agency_name || p.profiles?.full_name || 'Anunciante'}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-soft)', flexShrink: 0 }}>
                          {new Date(p.created_at).toLocaleDateString('pt-PT')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openMessageModal(p); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6, fontSize: 16,
                            fontWeight: 700, color: '#fff', background: 'var(--telha)', border: 'none',
                            borderRadius: 9, padding: '13px 20px', cursor: 'pointer', boxShadow: '0 3px 10px rgba(126,143,106,0.35)',
                          }}
                        >
                          💬 {t('prop_send_message')}
                        </button>
                        {p.profiles?.phone_public && (
                          <PhoneDisplay
                            phone={p.profiles.phone_public}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6, fontSize: 16, cursor: 'pointer',
                              fontWeight: 700, color: '#fff', background: 'var(--azulejo)',
                              border: 'none', borderRadius: 9, padding: '13px 20px', textDecoration: 'none', boxShadow: '0 3px 10px rgba(58,90,120,0.3)',
                            }}
                          >
                            📞 {t('prop_call')}
                          </PhoneDisplay>
                        )}
                      </div>
                    </div>
                  </div>
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

        {messageModalFor && (
          <div
            onClick={() => setMessageModalFor(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(51,46,34,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: 20 }}
          >
            <div onClick={(e) => e.stopPropagation()} className="card" style={{ padding: 24, maxWidth: 420, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{t('prop_send_message')}</span>
                <button onClick={() => setMessageModalFor(null)} aria-label={t('prop_close')} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-soft)' }}>✕</button>
              </div>
              {messageSent ? (
                <div>
                  <p style={{ fontSize: 14 }}>
                    {user ? (
                      <>{t('prop_msg_sent')} <Link href="/chat" style={{ color: 'var(--telha)', textDecoration: 'underline' }}>{t('prop_chat_link')}</Link>.</>
                    ) : t('property_sent')}
                  </p>
                  {!user && (
                    <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: 'rgba(126,143,106,0.08)', border: '1px solid var(--azulejo)' }}>
                      <p style={{ fontSize: 12.5, marginBottom: 8 }}>{t('prop_guest_sent_suggestion')}</p>
                      <Link href="/login" className="btn btn-primary" style={{ fontSize: 12.5, padding: '7px 14px' }}>{t('fav_guest_create_account')}</Link>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={sendInlineMessage}>
                  <div className="field">
                    <label>{t('prop_your_name')}</label>
                    <input required value={messageForm.name} onChange={(e) => setMessageForm({ ...messageForm, name: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>{t('prop_your_email')}</label>
                    <input required type="email" value={messageForm.email} onChange={(e) => setMessageForm({ ...messageForm, email: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>{t('prop_phone_optional')} <span className="hint">{t('prop_optional')}</span></label>
                    <input value={messageForm.phone} onChange={(e) => setMessageForm({ ...messageForm, phone: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>{t('prop_message_to')} {messageModalFor.display_name || messageModalFor.profiles?.agency_name || messageModalFor.profiles?.full_name}</label>
                    <textarea required rows={4} value={messageForm.message} onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 11.5, color: 'var(--text-soft)', marginBottom: 12, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      required
                      checked={acceptedPolicy}
                      onChange={(e) => setAcceptedPolicy(e.target.checked)}
                      style={{ marginTop: 2, flexShrink: 0 }}
                    />
                    <span>
                      {t('sw_read_accept')}{' '}
                      <a href="/privacidade" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--telha)', textDecoration: 'underline' }}>
                        {t('sw_privacy_policy')}
                      </a>{' '}
                      {t('sw_and_the')}{' '}
                      <a href="/termos" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--telha)', textDecoration: 'underline' }}>
                        {t('sw_terms_conditions')}
                      </a>.
                    </span>
                  </label>
                  <button type="submit" disabled={sendingMessage || !acceptedPolicy} className="btn btn-primary btn-block">
                    {sendingMessage ? t('sw_sending') : t('prop_send_message')}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
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
