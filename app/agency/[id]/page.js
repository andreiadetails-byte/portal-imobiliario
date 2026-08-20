'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { useLanguage } from '../../../lib/i18n';
import Header from '../../../components/Header';
import { displayAddress } from '../../../lib/displayAddress';

export default function AgencyPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const displayNameOverride = searchParams.get('as');
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
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
      await supabase.from('favorites').insert({ user_id: user.id, property_id: propertyId });
      setFavoriteIds((cur) => [...cur, propertyId]);
    }
  }

  useEffect(() => {
    async function load() {
      const { data: profileData } = await supabase.from('profiles_public').select('*').eq('id', id).single();
      setProfile(profileData);

      const { data: propsData } = await supabase
        .from('properties')
        .select('id, price, previous_price, display_name, address, district, municipality, parish, show_full_address, typology, property_type, area, area_util, bedrooms, bathrooms, business_type, featured_status, created_at, property_photos(url, position)')
        .eq('owner_id', id)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false });
      setProperties(propsData || []);

      setLoading(false);
    }
    if (id) load();
  }, [id]);

  if (loading) return (<><Header /><div className="wrap" style={{ padding: 60 }}>...</div></>);
  if (!profile) return (<><Header /><div className="wrap" style={{ padding: 60 }}>Perfil não encontrado.</div></>);

  const displayName = displayNameOverride || profile.agency_name || profile.full_name;
  const initials = (displayName || '?')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const vendaCount = properties.filter((p) => p.business_type === 'Venda').length;
  const arrendaCount = properties.filter((p) => p.business_type === 'Arrendamento').length;
  const filtered = filter === 'todos' ? properties : properties.filter((p) => p.business_type === (filter === 'comprar' ? 'Venda' : 'Arrendamento'));
  const memberSince = profile.created_at ? new Date(profile.created_at).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }) : null;

  return (
    <div>
      <Header />
      <div style={{
        height: 200,
        backgroundImage: 'linear-gradient(rgba(30,26,18,0.55), rgba(30,26,18,0.55)), url(/hero.jpg)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        display: 'flex', alignItems: 'flex-end', overflow: 'hidden', position: 'relative',
      }} />

      <main id="main-content" className="wrap" style={{ paddingTop: 0 }}>
        <div style={{ display: 'flex', gap: 22, alignItems: 'flex-end', paddingBottom: 24, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={displayName} loading="lazy" style={{
              width: 100, height: 100, borderRadius: 14, objectFit: 'cover', border: '4px solid var(--paper)',
              boxShadow: '0 4px 12px rgba(51,46,34,0.18)', flexShrink: 0, marginTop: -60,
            }} />
          ) : (
            <div style={{
              width: 100, height: 100, borderRadius: 14, background: 'var(--paper)', border: '4px solid var(--paper)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Fraunces, serif', fontSize: 30, fontWeight: 600, color: 'var(--telha)',
              boxShadow: '0 4px 12px rgba(51,46,34,0.18)', flexShrink: 0, marginTop: -60,
            }}>
              {initials}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0, paddingTop: 12 }}>
            <h1 className="display" style={{ fontSize: 28, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
              {displayName}
              {profile.is_verified && (
                <span title="Profissional verificado" style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24,
                  borderRadius: '50%', background: 'var(--azulejo)', color: '#fff', fontSize: 13,
                }}>
                  ✓
                </span>
              )}
            </h1>
            <div className="meta" style={{ marginTop: 4 }}>
              {profile.account_type === 'agencia' ? t('agency_type') : t('agency_individual_type')}
              {profile.is_verified && ' · Verificado pelo Morada'}
              {profile.agency_license && ` · ${profile.agency_license}`}
              {memberSince && ` · No Morada desde ${memberSince}`}
            </div>
            {profile.phone_public && (
              <a
                href={`tel:${profile.phone_public.replace(/\s+/g, '')}`}
                className="btn"
                style={{ fontSize: 13, marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                📞 {profile.phone_public}
              </a>
            )}
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <b className="display" style={{ fontSize: 24 }}>{properties.length}</b>
              <div className="meta">{t('agency_active_listings')}</div>
            </div>
            {vendaCount > 0 && (
              <div style={{ textAlign: 'center' }}>
                <b className="display" style={{ fontSize: 24 }}>{vendaCount}</b>
                <div className="meta">Para venda</div>
              </div>
            )}
            {arrendaCount > 0 && (
              <div style={{ textAlign: 'center' }}>
                <b className="display" style={{ fontSize: 24 }}>{arrendaCount}</b>
                <div className="meta">Para arrendar</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ overflow: 'hidden', borderRadius: 8, margin: '18px 0', background: 'linear-gradient(135deg, var(--telha) 0%, #3E4A32 100%)' }}>
          <div style={{ display: 'flex', width: 'max-content', animation: 'promo-scroll 18s linear infinite', padding: '10px 0' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, padding: '0 32px', color: '#fff', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
                <span>{displayName}</span>
                {profile.phone_public && <span style={{ opacity: 0.85 }}>· 📞 {profile.phone_public}</span>}
                <span style={{ color: 'var(--brass)' }}>· Comprar casa? É comigo! ·</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '28px 0 16px', flexWrap: 'wrap', gap: 12 }}>
          <h2 className="display" style={{ fontSize: 20 }}>{t('agency_listings')}</h2>
          {properties.length > 0 && (vendaCount > 0 && arrendaCount > 0) && (
            <div style={{ display: 'flex', gap: 8 }}>
              {[['todos', 'Todos'], ['comprar', 'Comprar'], ['arrendar', 'Arrendar']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFilter(val)}
                  className="btn"
                  style={{
                    fontSize: 13,
                    background: filter === val ? 'var(--telha)' : 'transparent',
                    color: filter === val ? '#fff' : 'var(--ink)',
                    borderColor: filter === val ? 'var(--telha)' : 'var(--line)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {properties.length === 0 && <p className="empty-state">{t('agency_none')}</p>}

        <div className="grid-listings" style={{ paddingBottom: 60 }}>
          {filtered.map((p) => {
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
                  <img src={firstPhoto} alt={`Foto do imóvel ${p.typology}`} loading="lazy" className="card-photo" style={{ objectFit: 'cover', width: '100%' }} />
                ) : (
                  <div className="card-photo" />
                )}
                <div className="card-body">
                  <div className="price">
                    {Number(p.price).toLocaleString('pt-PT')} {p.business_type === 'Arrendamento' ? '€/mês' : '€'}
                  </div>
                  {p.previous_price && p.previous_price > p.price && (
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      background: 'rgba(126,143,106,0.18)', color: 'var(--telha)', display: 'inline-block', marginBottom: 4,
                    }}>
                      ↓ Reduzido
                    </span>
                  )}
                  <div className="addr">{p.typology} · {displayAddress(p)}</div>
                  <div className="meta">
                    {p.district}{(p.area || p.area_util) ? ` · ${p.area || p.area_util} m²` : ''}{p.bedrooms ? ` · ${p.bedrooms} quartos` : ''}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
