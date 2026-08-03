'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../lib/i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function HomePage() {
  const { t } = useLanguage();
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
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <LanguageSwitcher />
            <Link href="/chat" className="btn" style={{ marginRight: 12 }}>{t('nav_chat')}</Link>
            <Link href="/favorites" className="btn" style={{ marginRight: 12 }}>{t('nav_favorites')}</Link>
            <Link href="/login" className="btn" style={{ marginRight: 12 }}>{t('nav_login')}</Link>
            <Link href="/publish" className="btn btn-primary">{t('nav_publish')}</Link>
          </div>
        </div>
        <div className="tile-strip" />
      </header>

      <section style={{ padding: '64px 0' }}>
        <div className="wrap">
          <h1 className="display" style={{ fontSize: 44, marginBottom: 16 }}>
            {t('home_title')}
          </h1>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, maxWidth: 560 }}>
            <input
              type="text"
              placeholder={t('home_search_placeholder')}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{ flex: 1, padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 5 }}
            />
            <button type="submit" className="btn btn-primary">{t('home_search_btn')}</button>
          </form>
        </div>
      </section>

      <section style={{ padding: '32px 0 80px' }}>
        <div className="wrap">
          <h2 className="display" style={{ fontSize: 26, marginBottom: 24 }}>{t('home_featured')}</h2>

          {loading && <p>{t('home_loading')}</p>}

          {!loading && properties.length === 0 && (
            <div className="empty-state">
              <p>{t('home_empty')}</p>
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
