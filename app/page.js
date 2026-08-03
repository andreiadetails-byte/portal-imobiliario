'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function HomePage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('');

  useEffect(() => {
    async function loadProperties() {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, price, address, district, typology, area, bedrooms, bathrooms, business_type')
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })
        .limit(6);

      if (!error) setProperties(data || []);
      setLoading(false);
    }
    loadProperties();
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    window.location.href = `/results?location=${encodeURIComponent(location)}`;
  }

  return (
    <>
      <header className="site-header">
        <div className="navbar">
          <div className="logo">more<span>&middot;</span>ada</div>
          <div>
            <Link href="/chat" className="btn" style={{ marginRight: 12 }}>Mensagens</Link>
            <Link href="/favorites" className="btn" style={{ marginRight: 12 }}>Favoritos</Link>
            <Link href="/login" className="btn" style={{ marginRight: 12 }}>Entrar</Link>
            <Link href="/publish" className="btn btn-primary">Publicar imóvel</Link>
          </div>
        </div>
        <div className="tile-strip" />
      </header>

      <section style={{ padding: '64px 0' }}>
        <div className="wrap">
          <h1 className="display" style={{ fontSize: 44, marginBottom: 16 }}>
            A sua próxima morada, publicada por quem a conhece.
          </h1>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, maxWidth: 560 }}>
            <input
              type="text"
              placeholder="Cidade, zona ou distrito"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{ flex: 1, padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 5 }}
            />
            <button type="submit" className="btn btn-primary">Pesquisar</button>
          </form>
        </div>
      </section>

      <section style={{ padding: '32px 0 80px' }}>
        <div className="wrap">
          <h2 className="display" style={{ fontSize: 26, marginBottom: 24 }}>Imóveis em destaque</h2>

          {loading && <p>A carregar imóveis...</p>}

          {!loading && properties.length === 0 && (
            <div className="empty-state">
              <p>Ainda não há imóveis publicados. Sê o primeiro!</p>
            </div>
          )}

          <div className="grid-listings">
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
      </section>
    </>
  );
}
