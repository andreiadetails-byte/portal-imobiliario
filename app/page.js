'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import NewsletterSignup from '../components/NewsletterSignup';
import LazyMount from '../components/LazyMount';
import { getLocalFavoriteIds, toggleLocalFavorite } from '../lib/localFavorites';
import PhoneDisplay from '../components/PhoneDisplay';
import dynamic from 'next/dynamic';
import { Heart } from 'lucide-react';

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
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('');
  const [businessType, setBusinessType] = useState('Venda');
  const [news, setNews] = useState([]);
  const [user, setUser] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    function handler(e) {
      e.preventDefault();
      setInstallPrompt(e);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstallClick() {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }
  const [favoriteIds, setFavoriteIds] = useState([]);

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
    async function loadProperties() {
      const { data, error } = await supabase
        .from('properties')
        .select('id, owner_id, title, price, display_name, address, district, municipality, parish, show_full_address, typology, property_type, area, area_util, bedrooms, bathrooms, business_type, featured_status, created_at, property_photos(url, thumbnail_url, position)')
        .eq('status', 'ativo')
        .eq('featured_status', 'active')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Erro ao carregar imóveis em destaque:', error);
      }

      if (!error) {
        const all = data || [];
        // A consulta já só traz imóveis com destaque ativo. Aqui baralhamos
        // a ordem e tentamos ao máximo intercalar donos diferentes — para
        // nunca aparecerem vários imóveis do mesmo empreendimento ao mesmo
        // tempo. Mas se não houver donos suficientes para preencher os 6
        // lugares, prefere mostrar repetidos a deixar lugares vazios (é
        // perfeitamente normal um dono ter vários imóveis em destaque, só
        // não convém verem-se todos juntos na mesma vista).
        const featuredPool = shuffle(all);
        const chosen = [];
        const usedMainPhotoUrls = new Set();
        const usedOwnerIds = new Set();

        // 1ª passagem: só aceita donos ainda não escolhidos.
        for (const p of featuredPool) {
          if (chosen.length >= 3) break;
          if (p.owner_id && usedOwnerIds.has(p.owner_id)) continue;
          const mainPhoto = p.property_photos?.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.url;
          if (mainPhoto && usedMainPhotoUrls.has(mainPhoto)) continue;
          chosen.push(p);
          if (p.owner_id) usedOwnerIds.add(p.owner_id);
          if (mainPhoto) usedMainPhotoUrls.add(mainPhoto);
        }

        // 2ª passagem (só se ainda faltarem lugares): já aceita repetir
        // donos, mas continua a nunca repetir a mesma foto principal.
        if (chosen.length < 6) {
          const chosenIds = new Set(chosen.map((p) => p.id));
          for (const p of featuredPool) {
            if (chosen.length >= 3) break;
            if (chosenIds.has(p.id)) continue;
            const mainPhoto = p.property_photos?.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.url;
            if (mainPhoto && usedMainPhotoUrls.has(mainPhoto)) continue;
            chosen.push(p);
            if (mainPhoto) usedMainPhotoUrls.add(mainPhoto);
          }
        }

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
          padding: '120px 0 70px',
          backgroundImage: 'linear-gradient(rgba(51,46,34,0.32), rgba(51,46,34,0.42)), url(/mood/sala-verde-premium.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        <div className="wrap" style={{ maxWidth: 720, textAlign: 'center' }}>
          <h1 className="display hero-title" style={{ fontSize: 46, lineHeight: 1.15, letterSpacing: '-0.01em', marginBottom: 14, color: '#fff' }}>
            {t('home_title')}
          </h1>
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 15, letterSpacing: '0.06em',
            color: 'rgba(255,255,255,0.9)', marginBottom: 30,
          }}>
            {t('home_lede')}
          </p>
        </div>

        <div className="wrap">
          <form onSubmit={handleSearch} className="card" style={{ padding: 22, maxWidth: 760, margin: '0 auto', background: 'var(--paper)', boxShadow: '0 16px 44px rgba(30,26,18,0.22)', overflow: 'visible' }}>
            <div className="home-tabs-search-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {['Venda', 'Arrendamento', 'Trespasse'].map((bt) => (
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
                    {bt === 'Venda' ? t('results_buy') : bt === 'Arrendamento' ? t('results_rent') : t('pub_trespass')}
                  </button>
                ))}
              </div>
              <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>{t('home_search_btn')}</button>
            </div>

            <div className="search-box-row" style={{ display: 'flex', gap: 12 }}>
              <LocationAutocomplete onChange={setLocation} placeholder={t('home_search_placeholder')} />
            </div>
          </form>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Link
              href="/results?draw=1"
              style={{
                display: 'inline-flex', alignItems: 'center',
                fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.88)',
                borderBottom: '1px solid rgba(255,255,255,0.4)', paddingBottom: 2,
              }}
            >
              {t('home_draw_map')}
            </Link>
          </div>
        </div>
      </section>

      <section style={{ background: 'linear-gradient(180deg, #E5E7DA 0%, #DDE2D2 100%)', padding: '80px 0' }}>
        <div className="wrap" style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <span style={{
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--telha)', fontWeight: 600, marginBottom: 12, display: 'block',
            }}>
              Para investidores
            </span>
            <h2 className="display" style={{ fontSize: 30, marginBottom: 16, color: 'var(--ink)' }}>
              Investe com mais informação.
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-soft)', marginBottom: 26, lineHeight: 1.6, maxWidth: 400 }}>
              Descubra a rentabilidade real de um investimento imobiliário, com base em dados atuais de mercado.
            </p>
            <Link href="/simulador-investimento" className="btn btn-primary" style={{ fontSize: 15, padding: '12px 26px' }}>
              Calcular rentabilidade
            </Link>
          </div>
          <div style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 20px 50px rgba(51,46,34,0.14)' }}>
            <img src="/mood/estante-livros-v2.jpg" alt="" style={{ width: '100%', height: 320, objectFit: 'cover' }} />
          </div>
        </div>
      </section>

      <section style={{ padding: '32px 0 88px', background: '#F1EFE6' }}>
        <div className="wrap">
          <h2 className="display" style={{ fontSize: 32, marginBottom: 32, color: 'var(--ink)' }}>{t('home_featured')}</h2>

          {loading && <p style={{ color: 'var(--ink)' }}>{t('home_loading')}</p>}

          {!loading && properties.length === 0 && (
            <div className="empty-state">
              <p style={{ color: 'var(--ink)' }}>{t('home_empty')}</p>
            </div>
          )}

          <div className="grid-listings">
            {properties.slice(0, 3).map((p, i) => {
              const firstSorted = p.property_photos?.sort((a, b) => a.position - b.position)[0];
              const firstPhoto = firstSorted?.thumbnail_url || firstSorted?.url;
              return (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/property/${p.id}`)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/property/${p.id}`); }}
                    className={`card card-hover-lift${p.featured_status === 'active' ? ' card-destaque' : ''}`}
                    style={{ position: 'relative', cursor: 'pointer', border: p.featured_status === 'active' ? '2.5px solid var(--telha)' : undefined, boxShadow: p.featured_status === 'active' ? '0 6px 18px rgba(92,103,76,0.22)' : undefined }}>
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
                    {favoriteIds.includes(p.id) ? <Heart size={15} fill="#b8452f" strokeWidth={1.5} /> : <Heart size={15} strokeWidth={1.5} />}
                  </button>
                  {firstPhoto ? (
                    <div style={{ position: 'relative', overflow: 'hidden' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={firstPhoto} alt={`Foto do imóvel ${p.typology} em ${p.district}`} loading={i === 0 ? 'eager' : 'lazy'} fetchPriority={i === 0 ? 'high' : 'auto'} className="card-photo-zoom" style={{ width: '100%', height: 190, objectFit: 'cover', transition: 'transform 0.5s ease' }} />
                      <div className="photo-watermark" style={{ fontSize: 11 }}>More·ada</div>
                    </div>
                  ) : (
                    <div className="card-photo" style={{ height: 190 }} />
                  )}
                  <div className="card-body" style={{ padding: '22px 20px 20px' }}>
                    <div className="addr" style={{ fontSize: 17, marginBottom: 4 }}>{p.typology} · {p.district}</div>
                    <div className="meta" style={{ marginBottom: 10, fontSize: 13 }}>{displayAddress(p)}</div>
                    <div className="price" style={{ fontSize: 20, marginBottom: 6 }}>
                      {Number(p.price).toLocaleString('pt-PT')} {p.business_type === 'Arrendamento' ? '€/mês' : '€'}
                    </div>
                    <div className="meta" style={{ marginBottom: 4, color: 'var(--azulejo)', fontSize: 12.5 }}>
                      {p.bedrooms ? `${p.bedrooms} ${t('home_bedrooms_inline')}` : ''}
                      {p.bathrooms ? ` · ${p.bathrooms} ${t('home_wc_inline')}` : ''}
                      {p.area_util ? ` · ${p.area_util} ${t('meta_sqm_useful')}` : ''}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {p.profiles && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexShrink: 0 }}>
                          {p.profiles.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.profiles.avatar_url} alt="" loading="lazy" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{
                              width: 26, height: 26, borderRadius: '50%', background: 'var(--azulejo)', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0,
                            }}>
                              {(p.display_name || p.profiles.agency_name || p.profiles.full_name || '?')[0].toUpperCase()}
                            </div>
                          )}
                          <span style={{ fontSize: 11.5, color: 'var(--text-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
                            {p.display_name || p.profiles.agency_name || p.profiles.full_name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                      <Link
                        href={`/property/${p.id}#property-contact-box`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, fontSize: 15,
                          fontWeight: 700, color: '#fff', background: 'var(--telha)', borderRadius: 8,
                          padding: '11px 16px', textDecoration: 'none',
                        }}
                      >
                        💬 {t('prop_send_message')}
                      </Link>
                      {p.profiles?.phone_public && (
                        <PhoneDisplay
                          phone={p.profiles.phone_public}
                          propertyId={p.id}
                          ownerId={p.owner_id}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, cursor: 'pointer',
                            fontWeight: 700, color: 'var(--ink)', background: 'var(--paper)',
                            border: '1.5px solid var(--line)', borderRadius: 8, padding: '11px 16px', textDecoration: 'none',
                          }}
                        >
                          📞 {t('prop_call')}
                        </PhoneDisplay>
                      )}
                    </div>
                  </div>
                </div>
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
              const firstSorted = p.property_photos?.sort((a, b) => a.position - b.position)[0];
              const firstPhoto = firstSorted?.thumbnail_url || firstSorted?.url;
              return (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/property/${p.id}`)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/property/${p.id}`); }}
                    className={`card card-hover-lift${p.featured_status === 'active' ? ' card-destaque' : ''}`}
                    style={{ position: 'relative', cursor: 'pointer', border: p.featured_status === 'active' ? '2.5px solid var(--telha)' : undefined, boxShadow: p.featured_status === 'active' ? '0 6px 18px rgba(92,103,76,0.22)' : undefined }}>
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
                    {favoriteIds.includes(p.id) ? <Heart size={15} fill="#b8452f" strokeWidth={1.5} /> : <Heart size={15} strokeWidth={1.5} />}
                  </button>
                  {firstPhoto ? (
                    <div style={{ position: 'relative', overflow: 'hidden' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={firstPhoto} alt={`Foto do imóvel ${p.typology} em ${p.district}`} loading="lazy" className="card-photo-zoom" style={{ width: '100%', height: 190, objectFit: 'cover', transition: 'transform 0.5s ease' }} />
                      <div className="photo-watermark" style={{ fontSize: 11 }}>More·ada</div>
                    </div>
                  ) : (
                    <div className="card-photo" style={{ height: 190 }} />
                  )}
                  <div className="card-body" style={{ padding: '22px 20px 20px' }}>
                    <div className="addr" style={{ fontSize: 17, marginBottom: 4 }}>{p.typology} · {p.district}</div>
                    <div className="meta" style={{ marginBottom: 10, fontSize: 13 }}>{displayAddress(p)}</div>
                    <div className="price" style={{ fontSize: 20, marginBottom: 6 }}>
                      {Number(p.price).toLocaleString('pt-PT')} {p.business_type === 'Arrendamento' ? '€/mês' : '€'}
                    </div>
                    <div className="meta" style={{ marginBottom: 4, color: 'var(--azulejo)', fontSize: 12.5 }}>
                      {p.bedrooms ? `${p.bedrooms} ${t('home_bedrooms_inline')}` : ''}
                      {p.bathrooms ? ` · ${p.bathrooms} ${t('home_wc_inline')}` : ''}
                      {p.area_util ? ` · ${p.area_util} ${t('meta_sqm_useful')}` : ''}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {p.profiles && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexShrink: 0 }}>
                          {p.profiles.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.profiles.avatar_url} alt="" loading="lazy" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{
                              width: 26, height: 26, borderRadius: '50%', background: 'var(--azulejo)', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0,
                            }}>
                              {(p.display_name || p.profiles.agency_name || p.profiles.full_name || '?')[0].toUpperCase()}
                            </div>
                          )}
                          <span style={{ fontSize: 11.5, color: 'var(--text-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
                            {p.display_name || p.profiles.agency_name || p.profiles.full_name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                      <Link
                        href={`/property/${p.id}#property-contact-box`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, fontSize: 15,
                          fontWeight: 700, color: '#fff', background: 'var(--telha)', borderRadius: 8,
                          padding: '11px 16px', textDecoration: 'none',
                        }}
                      >
                        💬 {t('prop_send_message')}
                      </Link>
                      {p.profiles?.phone_public && (
                        <PhoneDisplay
                          phone={p.profiles.phone_public}
                          propertyId={p.id}
                          ownerId={p.owner_id}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, cursor: 'pointer',
                            fontWeight: 700, color: 'var(--ink)', background: 'var(--paper)',
                            border: '1.5px solid var(--line)', borderRadius: 8, padding: '11px 16px', textDecoration: 'none',
                          }}
                        >
                          📞 {t('prop_call')}
                        </PhoneDisplay>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section style={{ padding: '0 0 56px', background: '#E8ECE0' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 40px' }}>
            <h2 className="display" style={{ fontSize: 30, marginBottom: 10 }}>Calcula antes de decidir</h2>
            <p style={{ fontSize: 15.5, color: 'var(--text-soft)' }}>
              Ferramentas simples para tomar melhores decisões imobiliárias.
            </p>
          </div>

          <div className="simulators-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {[
              { href: '/simulador-imt', img: '/mood/parede-bege.jpg', title: 'CALCULAR IMT', text: 'Saiba quanto poderá pagar na compra.' },
              { href: '/simulador-arrendar-comprar', img: '/mood/luz-janela.jpg', title: 'ARRENDAR OU COMPRAR', text: 'Compare as duas opções.' },
              { href: '/simulador-credito', img: '/mood/folha-terracota.jpg', title: 'SIMULADOR DE CRÉDITO', text: 'Estime a sua prestação.' },
            ].map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="card-hover-lift decision-card"
                style={{
                  display: 'block', textDecoration: 'none', background: 'var(--plaster)',
                  border: '1px solid rgba(122,128,104,0.22)', borderRadius: 14, overflow: 'hidden',
                }}
              >
                <div style={{ height: 100, overflow: 'hidden' }}>
                  <img src={card.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ padding: '22px 24px 26px' }}>
                <div className="display" style={{
                  fontSize: 21, fontWeight: 700,
                  color: 'var(--ink)', marginBottom: 8,
                }}>
                  {card.title}
                </div>
                <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.5, marginBottom: 0 }}>
                  {card.text}
                </p>
                </div>
              </Link>
            ))}
          </div>

          <div className="valuation-home-card" style={{
            display: 'grid', gridTemplateColumns: 'minmax(280px, 0.9fr) minmax(0, 1.1fr)',
            borderRadius: 14, overflow: 'hidden', marginTop: 44,
            background: 'var(--plaster)', border: '1px solid rgba(122,128,104,0.22)',
            minHeight: 180,
          }}>
            <div style={{ minHeight: 180, overflow: 'hidden' }}>
              <img src="/images/avaliacao-foto.jpg" alt="Avaliação de imóvel" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <div style={{ padding: '28px 34px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h2 className="display" style={{ fontSize: 22, marginBottom: 8, color: 'var(--ink)' }}>{t('home_valuation_title')}</h2>
              <p style={{ fontSize: 14.5, color: 'var(--text-soft)', marginBottom: 20, lineHeight: 1.55 }}>{t('home_valuation_sub')}</p>
              <Link href="/valuation" className="btn btn-primary" style={{ width: 'fit-content' }}>{t('home_valuation_btn')}</Link>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '20px 0 88px', background: '#F3F0E7' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 40px' }}>
            <h2 className="display" style={{ fontSize: 28, marginBottom: 10 }}>Quanto vale o m² na sua zona?</h2>
            <p style={{ fontSize: 15.5, color: 'var(--text-soft)', margin: 0 }}>Compare os preços praticados na sua área e perceba melhor o valor da sua casa.</p>
          </div>
          <div style={{ maxWidth: 620, margin: '0 auto 40px' }}>
            <PricePerM2Lookup />
          </div>
        </div>
      </section>


      <section style={{ padding: '56px 0', background: '#DDE3D4' }}>
        <div className="wrap">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { img: '/mood/sala-verde-premium.jpg', label: 'Sala' },
              { img: '/mood/nicho-arco-ceramica.jpg', label: 'Cozinha' },
              { img: '/mood/estante-livros-v2.jpg', label: 'Investimento' },
            ].map((item) => (
              <div key={item.img} style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 12px 30px rgba(51,46,34,0.1)' }}>
                <img src={item.img} alt="" style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
              </div>
            ))}
          </div>
        </div>
      </section>



      <section style={{ padding: '48px 0', position: 'relative', overflow: 'hidden', background: '#D6DED0' }}>
        <img src="/mood/floresta.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(82,92,70,0.34)' }} />
        <div className="wrap" style={{ maxWidth: 420, position: 'relative' }}>
          <div style={{
            background: '#fff', border: '1.5px solid var(--brass)', borderRadius: 12, padding: '20px 26px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=https%3A%2F%2Fwww.moreada.pt"
              alt="Código QR para abrir o More·ada no telemóvel"
              width={88}
              height={88}
              style={{ borderRadius: 6, border: '1px solid var(--line)', flexShrink: 0 }}
            />
            <div className="display" style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>
              Leva o More·ada no telemóvel
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '64px 0 88px', position: 'relative', overflow: 'hidden' }}>
        <img src="/mood/pintura-abstrata.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(82,92,70,0.34)' }} />
        <div className="wrap" style={{ maxWidth: 760, position: 'relative' }}>
          <div className="card" style={{ padding: '26px 28px', background: 'var(--plaster)' }}>
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


      <section style={{ padding: '96px 0', position: 'relative', overflow: 'hidden', background: '#667055' }}>
        <img
          src="/mood/escritorio.jpg"
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(58,64,49,0.30) 0%, rgba(58,64,49,0.52) 100%)' }} />
        <div className="wrap" style={{ position: 'relative', maxWidth: 680, textAlign: 'center' }}>
          <div className="display" style={{ fontSize: 38, fontWeight: 600, color: '#fff', marginBottom: 18, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
            {t('home_mood_title')}
          </div>
          <p style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.7, maxWidth: 460, margin: '0 auto' }}>
            {t('home_mood_text')}
          </p>
        </div>
      </section>

      <div style={{ height: 24, background: '#E4E7DA' }} />

      



      

      <section style={{ padding: '64px 0 88px', position: 'relative', overflow: 'hidden', background: '#DCE3D5' }}>
        <img src="/mood/folhas-chao.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(82,92,70,0.36)' }} />
        <div className="wrap" style={{ position: 'relative' }}>
          <h2 className="display" style={{ fontSize: 28, marginBottom: 8, color: '#fff' }}>{t('home_districts_title')}</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', marginBottom: 20 }}>{t('home_districts_sub')}</p>
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

      <section style={{ padding: '56px 0 88px', position: 'relative', overflow: 'hidden' }}>
        <img src="/mood/luz-janela.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(82,92,70,0.32)' }} />
        <div className="wrap two-col-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, position: 'relative' }}>
          <div>
            <h2 className="display" style={{ fontSize: 20, marginBottom: 14, color: '#fff' }}>{t('home_testimonials_title')}</h2>
            <TestimonialsCarousel />
          </div>
          <div>
            <h2 className="display" style={{ fontSize: 20, marginBottom: 14, color: '#fff' }}>{t('home_map_title')}</h2>
            <LazyMount placeholderHeight={340}>
              <MiniMapPreview />
            </LazyMount>
          </div>
        </div>
      </section>

      <section style={{ padding: '64px 0 104px', position: 'relative', overflow: 'hidden' }}>
        <img src="/mood/parede-bege.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(82,92,70,0.34)' }} />
        <div className="wrap" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
            <h2 className="display" style={{ fontSize: 28, margin: 0, color: '#fff' }}>{t('home_news_title')}</h2>
            <Link href="/noticias" style={{ fontSize: 13.5, fontWeight: 600, color: '#fff', textDecoration: 'underline' }}>
              {t('home_news_see_all')}
            </Link>
          </div>
          {news.length === 0 ? (
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)' }}>{t('home_no_news')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {news.map((n) => (
                <Link key={n.id} href={`/noticias/${n.id}`} className="card news-card" style={{
                  display: 'grid', gridTemplateColumns: n.cover_image_url ? '220px 1fr' : '1fr',
                  overflow: 'hidden',
                }}>
                  {n.cover_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={n.cover_image_url} alt={(n.title_translations && n.title_translations[lang]) || n.title} loading="lazy" style={{ width: '100%', height: '100%', minHeight: 150, objectFit: 'contain', background: 'var(--plaster)' }} />
                  )}
                  <div style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{
                      fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, textTransform: 'uppercase',
                      letterSpacing: '0.05em', color: 'var(--telha)', display: 'block', marginBottom: 8,
                    }}>
                      {n.category}
                    </span>
                    <h4 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8, lineHeight: 1.3 }}>{(n.title_translations && n.title_translations[lang]) || n.title}</h4>
                    <p style={{ fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.55 }}>
                      {summarizeToSentence((n.body_translations && n.body_translations[lang]) || n.body)}
                    </p>
                    <span style={{ fontSize: 12.5, color: 'var(--telha)', fontWeight: 600, marginTop: 8 }}>
                      {t('home_read_full_news')}
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
          <div className="newsletter-box" style={{
            display: 'grid', gridTemplateColumns: '260px 1fr', gap: 0, borderRadius: 16, overflow: 'hidden',
            marginBottom: 40, background: 'var(--plaster)', border: '1px solid rgba(126,143,106,0.2)',
          }}>
            <div style={{
              backgroundImage: 'url(/mood/nicho-arco-ceramica.jpg)', backgroundSize: 'cover', backgroundPosition: 'center',
              minHeight: 220,
            }} />
            <div style={{ padding: '32px 36px', textAlign: 'left' }}>
              <h3 className="display" style={{ fontSize: 19, marginBottom: 6 }}>{t('newsletter_title')}</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-soft)', marginBottom: 16, maxWidth: 480 }}>
                {t('newsletter_subtitle')}
              </p>
              <div style={{ maxWidth: 420 }}>
                <NewsletterSignup />
              </div>
            </div>
          </div>
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
