'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import LocationAutocomplete from '../../components/LocationAutocomplete';

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
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleFromList(list, setList, value) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function runSearch(e) {
    if (e) e.preventDefault();
    setLoading(true);

    let query = supabase
      .from('properties')
      .select('id, title, price, address, district, typology, property_type, area, bedrooms, bathrooms, business_type, property_photos(url, position)', { count: 'exact' })
      .eq('status', 'ativo')
      .eq('business_type', businessType);

    if (district) query = query.or(`district.ilike.%${district}%,address.ilike.%${district}%`);
    if (selectedTypes.length > 0) query = query.in('property_type', selectedTypes);
    if (selectedTypologies.length > 0) query = query.in('typology', selectedTypologies);
    if (maxPrice) query = query.lte('price', Number(maxPrice));

    query = sortBy === 'price_asc' ? query.order('price', { ascending: true })
      : sortBy === 'price_desc' ? query.order('price', { ascending: false })
      : query.order('created_at', { ascending: false });

    const { data, count: total, error } = await query;
    if (!error) {
      setProperties(data || []);
      setCount(total || 0);
    }
    setLoading(false);
  }

  return (
    <>
      <header className="site-header">
        <div className="navbar">
          <Link href="/" className="logo">more<span>&middot;</span>ada</Link>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <LanguageSwitcher />
            <Link href="/publish" className="btn btn-primary">{t('nav_publish')}</Link>
          </div>
        </div>
        <div className="tile-strip" />
      </header>

      <div className="wrap" style={{ padding: '32px' }}>
        <h1 className="display" style={{ fontSize: 26, marginBottom: 20 }}>{t('results_title')}</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28, alignItems: 'start' }}>

          <form onSubmit={runSearch} className="card" style={{ padding: 18, position: 'sticky', top: 90 }}>
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
              {TIPOS.map((tp) => (
                <label key={tp} style={{ display: 'flex', gap: 6, fontSize: 13, marginBottom: 5, fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(tp)}
                    onChange={() => toggleFromList(selectedTypes, setSelectedTypes, tp)}
                  />
                  {tp}
                </label>
              ))}
            </div>

            <div className="field">
              <label>{t('results_typology')}</label>
              {TIPOLOGIAS.map((tp) => (
                <label key={tp} style={{ display: 'flex', gap: 6, fontSize: 13, marginBottom: 5, fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={selectedTypologies.includes(tp)}
                    onChange={() => toggleFromList(selectedTypologies, setSelectedTypologies, tp)}
                  />
                  {tp}
                </label>
              ))}
            </div>

            <button type="submit" className="btn btn-primary btn-block">{t('results_filter')}</button>
          </form>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>
                {loading ? t('results_searching') : `${count} ${t('results_found')}`}
              </span>
              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); runSearch(); }} style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 5 }}>
                <option value="recent">{t('results_sort_recent')}</option>
                <option value="price_asc">{t('results_sort_price_asc')}</option>
                <option value="price_desc">{t('results_sort_price_desc')}</option>
              </select>
            </div>

            {!loading && properties.length === 0 && (
              <div className="empty-state">{t('results_empty')}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {properties.map((p) => {
                const firstPhoto = p.property_photos?.sort((a, b) => a.position - b.position)[0]?.url;
                return (
                  <Link key={p.id} href={`/property/${p.id}`} className="card"
                        style={{ display: 'grid', gridTemplateColumns: '160px 1fr', overflow: 'hidden' }}>
                    {firstPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={firstPhoto} alt="" style={{ width: '100%', height: '100%', minHeight: 110, objectFit: 'cover' }} />
                    ) : (
                      <div className="card-photo" style={{ height: '100%', minHeight: 110 }} />
                    )}
                    <div className="card-body">
                      <div className="price mono">
                        {Number(p.price).toLocaleString('pt-PT')} {p.business_type === 'Arrendamento' ? '€/mês' : '€'}
                      </div>
                      <div className="addr">{p.typology} · {p.address}</div>
                      <div className="meta">{p.district} · {p.area} m² · {p.bedrooms} {t('property_rooms').toLowerCase()}</div>
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
