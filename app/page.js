'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../lib/i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';
import LocationAutocomplete from '../components/LocationAutocomplete';
import Header from '../components/Header';
import { displayAddress } from '../lib/displayAddress';

export default function HomePage() {
  const { t } = useLanguage();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('');
  const [businessType, setBusinessType] = useState('Venda');
  const [stats, setStats] = useState({ totalProperties: 0, totalDistricts: 0 });
  const [news, setNews] = useState([]);

  useEffect(() => {
    async function loadProperties() {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, price, address, district, municipality, parish, show_full_address, typology, area, bedrooms, bathrooms, business_type, featured_status, property_photos(url, position)')
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })
        .limit(6);

      if (!error) {
        const sorted = [...(data || [])].sort((a, b) => (b.featured_status === 'active') - (a.featured_status === 'active'));
        setProperties(sorted);
      }
      setLoading(false);
    }

    async function loadStats() {
      const { count } = await supabase
        .from('properties').select('id', { count: 'exact', head: true }).eq('status', 'ativo');

      const { data: districtsData } = await supabase
        .from('properties').select('district').eq('status', 'ativo');

      const uniqueDistricts = new Set((districtsData || []).map((d) => d.district)).size;

      setStats({ totalProperties: count || 0, totalDistricts: uniqueDistricts });
    }

    async function loadNews() {
      const { data } = await supabase
        .from('news').select('*').eq('published', true).order('created_at', { ascending: false }).limit(3);
      setNews(data || []);
    }

    loadProperties();
    loadStats();
    loadNews();
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    window.location.href = `/results?location=${encodeURIComponent(location)}&business=${businessType}`;
  }

  return (
    <>
      <Header />

      <section
        style={{
          padding: '100px 0 64px',
          backgroundImage: 'linear-gradient(rgba(30,26,18,0.62), rgba(30,26,18,0.42)), url(/hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="wrap" style={{ maxWidth: 760 }}>
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--brass)', marginBottom: 18, display: 'block',
          }}>
            {t('home_eyebrow')}
          </span>
          <h1 className="display" style={{ fontSize: 48, lineHeight: 1.08, letterSpacing: '-0.01em', marginBottom: 14, color: '#fff' }}>
            {t('home_title')}
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', maxWidth: 480, marginBottom: 36 }}>
            {t('home_lede')}
          </p>
        </div>

        <div className="wrap">
          <form onSubmit={handleSearch} className="card" style={{ padding: 22, maxWidth: 760, boxShadow: '0 8px 30px rgba(0,0,0,0.25)', overflow: 'visible' }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
              {['Venda', 'Arrendamento'].map((bt) => (
                <button
                  key={bt}
                  type="button"
                  onClick={() => setBusinessType(bt)}
                  style={{
                    fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, padding: '8px 16px',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    color: businessType === bt ? 'var(--ink)' : 'var(--text-soft)',
                    borderBottom: businessType === bt ? '2px solid var(--telha)' : '2px solid transparent',
                  }}
                >
                  {bt === 'Venda' ? t('results_buy') : t('results_rent')}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <LocationAutocomplete onChange={setLocation} placeholder={t('home_search_placeholder')} />
              <button type="submit" className="btn btn-primary">{t('home_search_btn')}</button>
            </div>
          </form>

          <Link
            href="/results"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 16,
              fontSize: 13.5, fontWeight: 600, color: '#fff', textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >
            🗺️ Prefere desenhar a sua zona no mapa?
          </Link>
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: 'var(--paper)' }}>
        <div className="wrap" style={{ display: 'flex', gap: 48, padding: '24px 32px', flexWrap: 'wrap' }}>
          <div>
            <b className="display" style={{ fontSize: 24, display: 'block' }}>{stats.totalProperties}</b>
            <span style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>{t('home_stat_properties')}</span>
          </div>
          <div>
            <b className="display" style={{ fontSize: 24, display: 'block' }}>{stats.totalDistricts}</b>
            <span style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>{t('home_stat_districts')}</span>
          </div>
        </div>
      </div>

      <section style={{ padding: '48px 0 80px' }}>
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
                <Link key={p.id} href={`/property/${p.id}`} className="card" style={{ position: 'relative', border: p.featured_status === 'active' ? '1.5px solid var(--brass)' : undefined }}>
                  {p.featured_status === 'active' && (
                    <span style={{
                      position: 'absolute', top: 10, left: 10, zIndex: 1, fontSize: 10.5, fontWeight: 700,
                      padding: '3px 9px', borderRadius: 10, background: 'var(--brass)', color: '#5C4E2A',
                    }}>
                      ★ DESTAQUE
                    </span>
                  )}
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
                    <div className="addr">{p.typology} · {displayAddress(p)}</div>
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
          {news.length === 0 ? (
            <p style={{ fontSize: 13.5, color: 'var(--text-soft)' }}>Ainda não há notícias publicadas.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
              {news.map((n) => (
                <div key={n.id} style={{ borderTop: '2px solid var(--line)', paddingTop: 14 }}>
                  {n.cover_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={n.cover_image_url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 6, marginBottom: 12 }} />
                  )}
                  <span style={{
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, textTransform: 'uppercase',
                    letterSpacing: '0.05em', color: 'var(--telha)', display: 'block', marginBottom: 8,
                  }}>
                    {n.category}
                  </span>
                  <h4 style={{ fontSize: 15.5, fontWeight: 500, marginBottom: 6, lineHeight: 1.35 }}>{n.title}</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>{n.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer style={{ borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
        <div className="wrap" style={{ padding: '48px 32px 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, marginBottom: 32 }}>
            <div>
              <h5 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-soft)', marginBottom: 14 }}>
                {t('footer_search')}
              </h5>
              <Link href="/results" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_buy')}</Link>
              <Link href="/results" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_rent')}</Link>
            </div>
            <div>
              <h5 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-soft)', marginBottom: 14 }}>
                {t('footer_have_property')}
              </h5>
              <Link href="/publish" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_publish')}</Link>
              <Link href="/dashboard" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_dashboard')}</Link>
            </div>
            <div>
              <h5 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-soft)', marginBottom: 14 }}>
                {t('footer_account')}
              </h5>
              <Link href="/login" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_login')}</Link>
              <Link href="/favorites" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('nav_favorites')}</Link>
              <Link href="/chat" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('nav_chat')}</Link>
            </div>
            <div>
              <h5 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-soft)', marginBottom: 14 }}>
                {t('footer_about')}
              </h5>
              <span style={{ display: 'block', fontSize: 13.5, padding: '5px 0', color: 'var(--text-soft)' }}>{t('footer_about_text')}</span>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20, fontSize: 13, color: 'var(--text-soft)' }}>
            © 2026 morada — {t('footer_tagline')}
          </div>
        </div>
      </footer>
    </>
  );
}
