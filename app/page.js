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
        .select('id, title, price, address, district, typology, area, bedrooms, bathrooms, business_type, property_photos(url, position)')
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
            {properties.map((p) => {
              const firstPhoto = p.property_photos?.sort((a, b) => a.position - b.position)[0]?.url;
              return (
                <Link key={p.id} href={`/property/${p.id}`} className="card">
                  {firstPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={firstPhoto} alt="" style={{ width: '100%', height: 170, objectFit: 'cover' }} />
                  ) : (
                    <div className="card-photo" />
                  )}
                  <div className="card-body">
                    <div className="price mono">
                      {Number(p.price).toLocaleString('pt-PT')} {p.business_type === 'Arrendamento' ? '€/mês' : '€'}
                    </div>
                    <div className="addr">{p.typology} · {p.address}</div>
                    <div className="meta">{p.district}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section style={{ padding: '0 0 64px' }}>
        <div className="wrap">
          <div style={{
            background: 'var(--brass)', borderRadius: 10, padding: '36px 40px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap',
          }}>
            <div>
              <h2 className="display" style={{ fontSize: 22, marginBottom: 6 }}>{t('home_valuation_title')}</h2>
              <p style={{ fontSize: 14, color: '#5C4E2A', maxWidth: 420 }}>{t('home_valuation_sub')}</p>
            </div>
            <Link href="/publish" className="btn btn-primary">{t('home_valuation_btn')}</Link>
          </div>
        </div>
      </section>

      <section style={{ padding: '0 0 64px' }}>
        <div className="wrap">
          <h2 className="display" style={{ fontSize: 22, marginBottom: 4 }}>{t('home_districts_title')}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 20 }}>{t('home_districts_sub')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {['Lisboa', 'Porto', 'Faro', 'Setúbal', 'Braga', 'Leiria', 'Aveiro', 'Coimbra'].map((d) => (
              <Link
                key={d}
                href={`/results?location=${encodeURIComponent(d)}`}
                className="card"
                style={{ padding: '16px 18px', fontSize: 14, fontWeight: 500 }}
              >
                {d}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '0 0 80px' }}>
        <div className="wrap">
          <h2 className="display" style={{ fontSize: 22, marginBottom: 20 }}>{t('home_news_title')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { cat: t('news_cat_housing'), title: t('news1_title'), body: t('news1_body') },
              { cat: t('news_cat_credit'), title: t('news2_title'), body: t('news2_body') },
              { cat: t('news_cat_construction'), title: t('news3_title'), body: t('news3_body') },
            ].map((n, i) => (
              <div key={i} style={{ borderTop: '2px solid var(--line)', paddingTop: 14 }}>
                <span style={{
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, textTransform: 'uppercase',
                  letterSpacing: '0.05em', color: 'var(--telha)', display: 'block', marginBottom: 8,
                }}>
                  {n.cat}
                </span>
                <h4 style={{ fontSize: 15.5, fontWeight: 500, marginBottom: 6, lineHeight: 1.35 }}>{n.title}</h4>
                <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
