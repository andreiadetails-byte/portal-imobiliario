'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

const TIPOS = ['Apartamento', 'Moradia', 'Terreno', 'Espaço comercial', 'Armazém', 'Escritório'];
const TIPOLOGIAS = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5+'];

function ResultsInner() {
  const searchParams = useSearchParams();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  const [district, setDistrict] = useState(searchParams.get('location') || '');
  const [businessType, setBusinessType] = useState('Venda');
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
      .select('id, title, price, address, district, typology, property_type, area, bedrooms, bathrooms, business_type', { count: 'exact' })
      .eq('status', 'ativo')
      .eq('business_type', businessType);

    if (district) query = query.ilike('district', `%${district}%`);
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
          <Link href="/publish" className="btn btn-primary">Publicar imóvel</Link>
        </div>
        <div className="tile-strip" />
      </header>

      <div className="wrap" style={{ padding: '32px' }}>
        <h1 className="display" style={{ fontSize: 26, marginBottom: 20 }}>Resultados</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28, alignItems: 'start' }}>

          <form onSubmit={runSearch} className="card" style={{ padding: 18, position: 'sticky', top: 90 }}>
            <div className="field">
              <label>Negócio</label>
              <select value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
                <option value="Venda">Comprar</option>
                <option value="Arrendamento">Arrendar</option>
              </select>
            </div>

            <div className="field">
              <label>Distrito</label>
              <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="ex: Lisboa" />
            </div>

            <div className="field">
              <label>Preço máximo (€)</label>
              <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
            </div>

            <div className="field">
              <label>Tipo de imóvel</label>
              {TIPOS.map((t) => (
                <label key={t} style={{ display: 'flex', gap: 6, fontSize: 13, marginBottom: 5, fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(t)}
                    onChange={() => toggleFromList(selectedTypes, setSelectedTypes, t)}
                  />
                  {t}
                </label>
              ))}
            </div>

            <div className="field">
              <label>Tipologia</label>
              {TIPOLOGIAS.map((t) => (
                <label key={t} style={{ display: 'flex', gap: 6, fontSize: 13, marginBottom: 5, fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={selectedTypologies.includes(t)}
                    onChange={() => toggleFromList(selectedTypologies, setSelectedTypologies, t)}
                  />
                  {t}
                </label>
              ))}
            </div>

            <button type="submit" className="btn btn-primary btn-block">Filtrar</button>
          </form>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>
                {loading ? 'A procurar...' : `${count} imóveis encontrados`}
              </span>
              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); runSearch(); }} style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 5 }}>
                <option value="recent">Mais recentes</option>
                <option value="price_asc">Preço: mais baixo</option>
                <option value="price_desc">Preço: mais alto</option>
              </select>
            </div>

            {!loading && properties.length === 0 && (
              <div className="empty-state">Não encontrámos imóveis com estes filtros.</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {properties.map((p) => (
                <Link key={p.id} href={`/property/${p.id}`} className="card"
                      style={{ display: 'grid', gridTemplateColumns: '160px 1fr', overflow: 'hidden' }}>
                  <div className="card-photo" style={{ height: '100%', minHeight: 110 }} />
                  <div className="card-body">
                    <div className="price mono">
                      {Number(p.price).toLocaleString('pt-PT')} {p.business_type === 'Arrendamento' ? '€/mês' : '€'}
                    </div>
                    <div className="addr">{p.typology} · {p.address}</div>
                    <div className="meta">{p.district} · {p.area} m² · {p.bedrooms} quartos</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="wrap" style={{ padding: 60 }}>A carregar...</div>}>
      <ResultsInner />
    </Suspense>
  );
}
