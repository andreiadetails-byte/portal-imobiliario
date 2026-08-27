'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../lib/i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';
import LocationAutocomplete from '../components/LocationAutocomplete';
import Header from '../components/Header';
import BigPromoBanner from '../components/BigPromoBanner';
import PricePerM2Lookup from '../components/PricePerM2Lookup';
import TestimonialsCarousel from '../components/TestimonialsCarousel';
import { distritos } from '../lib/locations';
import NaturalSearchBox from '../components/NaturalSearchBox';
import dynamic from 'next/dynamic';

const MiniMapPreview = dynamic(() => import('../components/MiniMapPreview'), { ssr: false });
import { displayAddress } from '../lib/displayAddress';

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function summarizeToSentence(text, maxLength = 160) {
  if (!text || text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
  if (lastSentenceEnd > 40) return cut.slice(0, lastSentenceEnd + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLength)}…`;
}

export default function HomePage() {
  const { t } = useLanguage();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('');
  const [businessType, setBusinessType] = useState('Venda');
  const [news, setNews] = useState([]);
  const [user, setUser] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState([]);

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
    async function loadProperties() {
      const { data, error } = await supabase
        .from('properties')
        .select('id, owner_id, title, price, display_name, address, district, municipality, parish, show_full_address, typology, property_type, area, area_util, bedrooms, bathrooms, business_type, featured_status, created_at, property_photos(url, position)')
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })
        .limit(60);

      if (!error) {
        const all = data || [];
        const featured = shuffle(all.filter((p) => p.featured_status === 'active'));
        const rest = shuffle(all.filter((p) => p.featured_status !== 'active'));
        const chosen = [...featured, ...rest].slice(0, 6);

        const ownerIds = [...new Set(chosen.map((p) => p.owner_id).filter(Boolean))];
        let ownersById = {};
        if (ownerIds.length > 0) {
          const { data: owners } = await supabase.from('profiles_public').select('*').in('id', ownerIds);
          ownersById = Object.fromEntries((owners || []).map((o) => [o.id, o]));
        }

        setProperties(chosen.map((p) => ({ ...p, profiles: ownersById[p.owner_id] || null })));
      }
      setLoading(false);
    }

    async function loadNews() {
      const { data } = await supabase
        .from('news').select('*').eq('published', true).order('created_at', { ascending: false }).limit(3);
      setNews(data || []);
    }

    loadProperties();
    loadNews();
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    window.location.href = `/results?location=${encodeURIComponent(location)}&business=${businessType}`;
  }

  return (
    <>
      <Header minimal />

      <main id="main-content">
      <section
        style={{
          padding: '100px 0 64px',
          backgroundImage: 'linear-gradient(rgba(30,26,18,0.62), rgba(30,26,18,0.42)), url(/hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        <div className="wrap" style={{ maxWidth: 760 }}>
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 15, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--brass)', marginBottom: 18, display: 'block',
          }}>
            {t('home_eyebrow')}
          </span>
          <h1 className="display hero-title" style={{ fontSize: 48, lineHeight: 1.08, letterSpacing: '-0.01em', marginBottom: 14, color: '#fff' }}>
            {t('home_title')}
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', maxWidth: 480, marginBottom: 24 }}>
            {t('home_lede')}
          </p>
        </div>

        <div className="wrap">
          <form onSubmit={handleSearch} className="card" style={{ padding: 22, maxWidth: 760, margin: '0 auto', boxShadow: '0 8px 30px rgba(0,0,0,0.25)', overflow: 'visible' }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
              {['Venda', 'Arrendamento'].map((bt) => (
                <button
                  key={bt}
                  type="button"
                  onClick={() => setBusinessType(bt)}
                  style={{
                    fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 600, padding: '9px 18px',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    color: businessType === bt ? 'var(--ink)' : 'var(--text-soft)',
                    borderBottom: businessType === bt ? '2px solid var(--telha)' : '2px solid transparent',
                  }}
                >
                  {bt === 'Venda' ? t('results_buy') : t('results_rent')}
                </button>
              ))}
            </div>

            <div className="search-box-row" style={{ display: 'flex', gap: 12 }}>
              <LocationAutocomplete onChange={setLocation} placeholder={t('home_search_placeholder')} />
              <button type="submit" className="btn btn-primary">{t('home_search_btn')}</button>
            </div>
          </form>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Link
              href="/results?draw=1"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontSize: 13.5, fontWeight: 600, color: '#fff', textDecoration: 'underline', textUnderlineOffset: 3,
              }}
            >
              {t('home_draw_map')}
            </Link>
          </div>
        </div>
      </section>

      <section style={{ padding: '0 0 40px' }}>
        <div className="wrap" style={{ maxWidth: 760 }}>
          <div style={{ background: 'var(--plaster)', border: '1px solid var(--brass)', borderRadius: 12, overflow: 'hidden' }}>
            <div className="tile-strip" />
            <div style={{ padding: 18 }}>
              <NaturalSearchBox />
            </div>
            <div className="tile-strip" />
          </div>
        </div>
      </section>

      <section style={{ padding: '0 0 40px' }}>
        <div className="wrap" style={{ maxWidth: 760 }}>
          <div style={{
            background: '#fff', border: '1.5px solid var(--brass)', borderRadius: 12, padding: '20px 26px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=https%3A%2F%2Fportalimobiliario.netlify.app"
              alt="Código QR para abrir o More·ada no telemóvel"
              width={104}
              height={104}
              style={{ borderRadius: 6, border: '1px solid var(--line)', flexShrink: 0 }}
            />
            <div>
              <div className="display" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 3 }}>{t('home_install_title')}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 6 }}>
                {t('home_install_subtitle')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.7 }}>
                <b>{t('home_install_android_label')}</b><br />
                {t('home_install_android_opt1')}<br />
                {t('home_install_android_opt2')}<br /><br />
                {t('home_install_ios')}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '0 0 40px' }}>
        <div className="wrap" style={{ maxWidth: 760 }}>
          <Link
            href="/simulador-investimento"
            style={{
              borderRadius: 12, padding: '22px 26px', background: 'linear-gradient(135deg, var(--azulejo) 0%, var(--telha) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', textDecoration: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 34, flexShrink: 0 }}>📈</span>
              <div>
                <div className="display" style={{ fontSize: 19, fontWeight: 600, color: '#fff', marginBottom: 3 }}>{t('home_investor_title')}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)' }}>
                  {t('home_investor_text')}
                </div>
              </div>
            </div>
            <span style={{
              background: '#fff', color: 'var(--ink)', fontSize: 13.5, fontWeight: 600,
              padding: '11px 22px', borderRadius: 6, whiteSpace: 'nowrap',
            }}>
              {t('home_investor_cta')}
            </span>
          </Link>
        </div>
      </section>

      <section style={{ padding: '0 0 64px' }}>
        <div className="wrap" style={{ maxWidth: 760 }}>
          <div className="card" style={{ padding: '26px 28px' }}>
            <h3 className="display" style={{ fontSize: 19, marginBottom: 6 }}>{t('home_doubts_title')}</h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-soft)', marginBottom: 16 }}>
              {t('home_doubts_text')}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
              {[t('home_doubts_tag_buy'), t('home_doubts_tag_sell'), t('home_doubts_tag_rent'), t('home_doubts_tag_credit'), t('home_doubts_tag_docs'), t('home_doubts_tag_deed'), t('home_doubts_tag_taxes'), t('home_doubts_tag_publish'), t('home_doubts_tag_other')].map((tema) => (
                <button
                  key={tema}
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('morada-open-support', { detail: tema === t('home_doubts_tag_other') ? null : tema }))}
                  style={{
                    fontSize: 12.5, fontWeight: 500, padding: '6px 12px', borderRadius: 14, cursor: 'pointer',
                    background: 'var(--plaster)', color: 'var(--text-soft)', border: '1px solid var(--line)',
                  }}
                >
                  {tema}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('morada-open-support'))}
              className="btn btn-primary"
              style={{ fontSize: 13.5 }}
            >
              {t('home_doubts_cta')}
            </button>
          </div>
        </div>
      </section>

      <section style={{ padding: '48px 0 64px' }}>
        <div className="wrap">
          <h2 className="display" style={{ fontSize: 26, marginBottom: 24 }}>{t('home_featured')}</h2>

          {loading && <p>{t('home_loading')}</p>}

          {!loading && properties.length === 0 && (
            <div className="empty-state">
              <p>{t('home_empty')}</p>
            </div>
          )}

          <div className="grid-listings">
            {properties.slice(0, 3).map((p, i) => {
              const firstPhoto = p.property_photos?.sort((a, b) => a.position - b.position)[0]?.url;
              return (
                  <Link key={p.id} href={`/property/${p.id}`} className={`card${p.featured_status === 'active' ? ' card-destaque' : ''}`} style={{ position: 'relative', border: p.featured_status === 'active' ? '2.5px solid var(--gold-strong)' : undefined, boxShadow: p.featured_status === 'active' ? '0 6px 18px rgba(201,162,39,0.28)' : undefined }}>
                  {p.featured_status === 'active' && (
                    <span className="destaque-strip">★ DESTAQUE</span>
                  )}
                  <button
                    onClick={(e) => toggleFavorite(e, p.id)}
                    aria-label="Guardar nos favoritos"
                    style={{
                      position: 'absolute', top: 10, right: 10, zIndex: 1, width: 30, height: 30, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer', fontSize: 15,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: favoriteIds.includes(p.id) ? '#b8452f' : 'var(--ink)',
                    }}
                  >
                    {favoriteIds.includes(p.id) ? '♥' : '♡'}
                  </button>
                  {firstPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={firstPhoto} alt={`Foto do imóvel ${p.typology} em ${p.district}`} loading="lazy" style={{ width: '100%', height: 170, objectFit: 'cover' }} />
                  ) : (
                    <div className="card-photo" />
                  )}
                  <div className="card-body">
                    <div className="price">
                      {Number(p.price).toLocaleString('pt-PT')} {p.business_type === 'Arrendamento' ? '€/mês' : '€'}
                    </div>
                    <div className="addr">{p.typology} · {displayAddress(p)}</div>
                    <div className="meta" style={{ marginBottom: 4 }}>
                      {p.property_type}{(p.area || p.area_util) ? ` · ${p.area || p.area_util} m²` : ''}
                      {p.bedrooms ? ` · ${p.bedrooms} ${t('home_bedrooms_inline')}` : ''}
                      {p.bathrooms ? ` · ${p.bathrooms} ${t('home_wc_inline')}` : ''}
                    </div>
                    <div className="meta" style={{ marginBottom: 10, fontSize: 11 }}>{t('home_published_on')} {new Date(p.created_at).toLocaleDateString('pt-PT')}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <div className="meta" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.district}{p.parish ? ` · ${p.parish}` : p.municipality ? ` · ${p.municipality}` : ''}</div>
                      {p.profiles && (
                        <div title={p.display_name || p.profiles.agency_name || p.profiles.full_name} style={{ flexShrink: 0 }}>
                          {p.profiles.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.profiles.avatar_url} alt="" loading="lazy" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{
                              width: 26, height: 26, borderRadius: '50%', background: 'var(--azulejo)', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600,
                            }}>
                              {(p.display_name || p.profiles.agency_name || p.profiles.full_name || '?')[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {p.profiles?.phone_public && (
                      <a
                        href={`tel:${p.profiles.phone_public.replace(/\s+/g, '')}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, fontWeight: 600, color: 'var(--telha)', textDecoration: 'none' }}
                      >
                        📞 {p.profiles.phone_public}
                      </a>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="wrap" style={{ marginTop: 40, marginBottom: 40 }}>
          <BigPromoBanner />
        </div>

        <div className="wrap">
          <div className="grid-listings">
            {properties.slice(3, 6).map((p, i) => {
              const firstPhoto = p.property_photos?.sort((a, b) => a.position - b.position)[0]?.url;
              return (
                  <Link key={p.id} href={`/property/${p.id}`} className={`card${p.featured_status === 'active' ? ' card-destaque' : ''}`} style={{ position: 'relative', border: p.featured_status === 'active' ? '2.5px solid var(--gold-strong)' : undefined, boxShadow: p.featured_status === 'active' ? '0 6px 18px rgba(201,162,39,0.28)' : undefined }}>
                  {p.featured_status === 'active' && (
                    <span className="destaque-strip">★ DESTAQUE</span>
                  )}
                  <button
                    onClick={(e) => toggleFavorite(e, p.id)}
                    aria-label="Guardar nos favoritos"
                    style={{
                      position: 'absolute', top: 10, right: 10, zIndex: 1, width: 30, height: 30, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer', fontSize: 15,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: favoriteIds.includes(p.id) ? '#b8452f' : 'var(--ink)',
                    }}
                  >
                    {favoriteIds.includes(p.id) ? '♥' : '♡'}
                  </button>
                  {firstPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={firstPhoto} alt={`Foto do imóvel ${p.typology} em ${p.district}`} loading="lazy" style={{ width: '100%', height: 170, objectFit: 'cover' }} />
                  ) : (
                    <div className="card-photo" />
                  )}
                  <div className="card-body">
                    <div className="price">
                      {Number(p.price).toLocaleString('pt-PT')} {p.business_type === 'Arrendamento' ? '€/mês' : '€'}
                    </div>
                    <div className="addr">{p.typology} · {displayAddress(p)}</div>
                    <div className="meta" style={{ marginBottom: 4 }}>
                      {p.property_type}{(p.area || p.area_util) ? ` · ${p.area || p.area_util} m²` : ''}
                      {p.bedrooms ? ` · ${p.bedrooms} ${t('home_bedrooms_inline')}` : ''}
                      {p.bathrooms ? ` · ${p.bathrooms} ${t('home_wc_inline')}` : ''}
                    </div>
                    <div className="meta" style={{ marginBottom: 10, fontSize: 11 }}>{t('home_published_on')} {new Date(p.created_at).toLocaleDateString('pt-PT')}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <div className="meta" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.district}{p.parish ? ` · ${p.parish}` : p.municipality ? ` · ${p.municipality}` : ''}</div>
                      {p.profiles && (
                        <div title={p.display_name || p.profiles.agency_name || p.profiles.full_name} style={{ flexShrink: 0 }}>
                          {p.profiles.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.profiles.avatar_url} alt="" loading="lazy" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{
                              width: 26, height: 26, borderRadius: '50%', background: 'var(--azulejo)', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600,
                            }}>
                              {(p.display_name || p.profiles.agency_name || p.profiles.full_name || '?')[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {p.profiles?.phone_public && (
                      <a
                        href={`tel:${p.profiles.phone_public.replace(/\s+/g, '')}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, fontWeight: 600, color: 'var(--telha)', textDecoration: 'none' }}
                      >
                        📞 {p.profiles.phone_public}
                      </a>
                    )}
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
            position: 'relative', borderRadius: 14, overflow: 'hidden', height: 220,
            backgroundImage: 'url(/images/avaliacao-foto.jpg)', backgroundSize: 'cover', backgroundPosition: 'center center',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, rgba(51,46,34,0.82) 0%, rgba(51,46,34,0.78) 40%, rgba(51,46,34,0.15) 100%)',
            }} />
            <div style={{ position: 'relative', padding: '36px 40px', maxWidth: 440, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h2 className="display" style={{ fontSize: 22, marginBottom: 8, color: '#fff' }}>{t('home_valuation_title')}</h2>
              <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.88)', marginBottom: 20 }}>{t('home_valuation_sub')}</p>
              <Link href="/valuation" className="btn btn-primary" style={{ width: 'fit-content' }}>{t('home_valuation_btn')}</Link>
            </div>
          </div>

          <div className="simulators-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginTop: 110 }}>
            <div className="card-hover-lift simulator-card" style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 150, backgroundImage: 'url(/images/simulador-arrendar.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ padding: '30px 30px 36px' }}>
                <h3 className="display" style={{ fontSize: 22, marginBottom: 10 }}>{t('home_rentbuy_title')}</h3>
                <p style={{ fontSize: 15, color: 'var(--text-soft)', marginBottom: 20, lineHeight: 1.55 }}>
                  Compare o custo real das duas opções, ao longo do tempo.
                </p>
                <Link href="/simulador-arrendar-comprar" className="btn btn-primary" style={{ fontSize: 15.5, padding: '11px 22px' }}>{t('home_rentbuy_cta')}</Link>
              </div>
            </div>
            <div className="card-hover-lift simulator-card" style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 150, backgroundImage: 'url(/images/simulador-imt.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ padding: '30px 30px 36px' }}>
                <h3 className="display" style={{ fontSize: 22, marginBottom: 10 }}>{t('home_imt_title')}</h3>
                <p style={{ fontSize: 15, color: 'var(--text-soft)', marginBottom: 20, lineHeight: 1.55 }}>
                  {t('home_imt_sub')}
                </p>
                <Link href="/simulador-imt" className="btn btn-primary" style={{ fontSize: 15.5, padding: '11px 22px' }}>{t('home_imt_btn')}</Link>
              </div>
            </div>
            <div className="card-hover-lift simulator-card" style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 150, backgroundImage: 'url(/images/simulador-credito.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ padding: '30px 30px 36px' }}>
                <h3 className="display" style={{ fontSize: 22, marginBottom: 10 }}>{t('home_credit_title')}</h3>
                <p style={{ fontSize: 15, color: 'var(--text-soft)', marginBottom: 20, lineHeight: 1.55 }}>
                  {t('home_credit_sub')}
                </p>
                <Link href="/simulador-credito" className="btn btn-primary" style={{ fontSize: 15.5, padding: '11px 22px' }}>{t('home_credit_btn')}</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '0 0 64px' }}>
        <div className="wrap" style={{ maxWidth: 620 }}>
          <PricePerM2Lookup />
        </div>
      </section>

      <section style={{ padding: '0 0 64px' }}>
        <div className="wrap">
          <h2 className="display" style={{ fontSize: 22, marginBottom: 4 }}>{t('home_districts_title')}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 20 }}>{t('home_districts_sub')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {distritos.map((d) => (
              <Link
                key={d}
                href={`/results?location=${encodeURIComponent(d)}`}
                className="card"
                style={{ padding: '12px 18px', fontSize: 14, fontWeight: 500 }}
              >
                {d}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '0 0 64px' }}>
        <div className="wrap two-col-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <h2 className="display" style={{ fontSize: 20, marginBottom: 14 }}>{t('home_testimonials_title')}</h2>
            <TestimonialsCarousel />
          </div>
          <div>
            <h2 className="display" style={{ fontSize: 20, marginBottom: 14 }}>{t('home_map_title')}</h2>
            <MiniMapPreview />
          </div>
        </div>
      </section>

      <section style={{ padding: '0 0 80px' }}>
        <div className="wrap">
          <h2 className="display" style={{ fontSize: 22, marginBottom: 20 }}>{t('home_news_title')}</h2>
          {news.length === 0 ? (
            <p style={{ fontSize: 13.5, color: 'var(--text-soft)' }}>{t('home_no_news')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {news.map((n) => (
                <Link key={n.id} href={`/noticias/${n.id}`} className="card news-card" style={{
                  display: 'grid', gridTemplateColumns: n.cover_image_url ? '220px 1fr' : '1fr',
                  overflow: 'hidden',
                }}>
                  {n.cover_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={n.cover_image_url} alt={n.title} loading="lazy" style={{ width: '100%', height: '100%', minHeight: 150, objectFit: 'cover' }} />
                  )}
                  <div style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{
                      fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, textTransform: 'uppercase',
                      letterSpacing: '0.05em', color: 'var(--telha)', display: 'block', marginBottom: 8,
                    }}>
                      {n.category}
                    </span>
                    <h4 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8, lineHeight: 1.3 }}>{n.title}</h4>
                    <p style={{ fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.55 }}>
                      {summarizeToSentence(n.body)}
                    </p>
                    <span style={{ fontSize: 12.5, color: 'var(--telha)', fontWeight: 600, marginTop: 8 }}>
                      Ler notícia completa →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      </main>

      <footer style={{ borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
        <div className="wrap" style={{ padding: '48px 32px 32px' }}>
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 32, marginBottom: 32 }}>
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
              <Link href="/simulador-credito" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_sim_credit')}</Link>
              <Link href="/simulador-imt" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_sim_imt')}</Link>
              <Link href="/simulador-investimento" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_sim_investment')}</Link>
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
                More·ada
              </h5>
              <Link href="/sobre" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_about_us')}</Link>
              <Link href="/trabalha-connosco" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_careers')}</Link>
              <span style={{ display: 'block', fontSize: 13.5, padding: '5px 0', color: 'var(--text-soft)' }}>{t('footer_about_text')}</span>
            </div>
            <div>
              <h5 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-soft)', marginBottom: 14 }}>
                {t('footer_help_heading')}
              </h5>
              <Link href="/faq" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_faq')}</Link>
              <Link href="/seguranca" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_security')}</Link>
              <Link href="/contacto" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_contact')}</Link>
              <Link href="/privacidade" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_privacy')}</Link>
              <Link href="/cookies" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_cookies_policy')}</Link>
              <Link href="/termos" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_terms')}</Link>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20, fontSize: 13, color: 'var(--text-soft)' }}>
            © 2026 More·ada — {t('footer_tagline')}
            <br />
            <a
              href="https://www.livroreclamacoes.pt/Inicio/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--text-soft)', textDecoration: 'underline' }}
            >
              Livro de Reclamações
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
