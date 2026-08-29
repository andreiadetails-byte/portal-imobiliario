'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { useLanguage } from '../../../lib/i18n';
import Header from '../../../components/Header';
import BackButton from '../../../components/BackButton';
import { displayAddress } from '../../../lib/displayAddress';
import { accountTypeLabel } from '../../../lib/accountTypes';

export default function AgencyPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const displayNameOverride = searchParams.get('as');
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [messageModalFor, setMessageModalFor] = useState(null);
  const [messageForm, setMessageForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [messageSent, setMessageSent] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  async function openMessageModal(p) {
    setMessageSent(false);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const { data: myProfile } = await supabase.from('profiles').select('full_name').eq('id', currentUser.id).single();
      setMessageForm({ name: myProfile?.full_name || '', email: currentUser.email || '', phone: '', message: '' });
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
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (currentUser && currentUser.id !== p.owner_id) {
      const { data: existing } = await supabase
        .from('conversations').select('id').eq('property_id', p.id).eq('buyer_id', currentUser.id).maybeSingle();
      let conversationId = existing?.id;
      if (!conversationId) {
        const { data: created } = await supabase
          .from('conversations').insert({ property_id: p.id, buyer_id: currentUser.id, seller_id: p.owner_id }).select().single();
        conversationId = created?.id;
      }
      if (conversationId) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: currentUser.id,
          content: messageForm.message,
          sender_name: messageForm.name,
          sender_email: messageForm.email,
          sender_phone: messageForm.phone || null,
        });
      }
    } else {
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
      const prop = properties.find((p) => p.id === propertyId);
      await supabase.from('favorites').insert({ user_id: user.id, property_id: propertyId, price_at_save: prop?.price ?? null });
      setFavoriteIds((cur) => [...cur, propertyId]);
    }
  }

  useEffect(() => {
    async function load() {
      const { data: profileData } = await supabase.from('profiles_public').select('*').eq('id', id).single();
      setProfile(profileData);

      const { data: propsData } = await supabase
        .from('properties')
        .select('id, price, previous_price, display_name, address, district, municipality, parish, show_full_address, typology, property_type, area, area_util, bedrooms, bathrooms, business_type, featured_status, created_at, owner_id, property_photos(url, thumbnail_url, position)')
        .eq('owner_id', id)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false });
      setProperties(propsData || []);

      setLoading(false);
    }
    if (id) load();
  }, [id]);

  if (loading) return (<><Header /><div className="wrap" style={{ padding: 60 }}>...</div></>);
  if (!profile) return (<><Header /><div className="wrap" style={{ padding: 60 }}>{t('agency_profile_not_found')}</div></>);

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
      <div className="wrap" style={{ paddingTop: 16, paddingBottom: 0 }}>
        <BackButton fallback="/" />
      </div>
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
                <span title={t('attr_verified_professional')} style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24,
                  borderRadius: '50%', background: 'var(--azulejo)', color: '#fff', fontSize: 13,
                }}>
                  ✓
                </span>
              )}
            </h1>
            <div className="meta" style={{ marginTop: 4 }}>
              {accountTypeLabel(profile.account_type)}
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
                <div className="meta">{t('agency_for_sale')}</div>
              </div>
            )}
            {arrendaCount > 0 && (
              <div style={{ textAlign: 'center' }}>
                <b className="display" style={{ fontSize: 24 }}>{arrendaCount}</b>
                <div className="meta">{t('agency_for_rent')}</div>
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
            const firstSorted = [...(p.property_photos || [])].sort((a, b) => a.position - b.position)[0];
            const firstPhoto = firstSorted?.thumbnail_url || firstSorted?.url;
            return (
              <div key={p.id} onClick={() => router.push(`/property/${p.id}`)} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/property/${p.id}`); }} className={`card${p.featured_status === 'active' ? ' card-destaque' : ''}`} style={{ position: 'relative', cursor: 'pointer', border: p.featured_status === 'active' ? '2.5px solid var(--gold-strong)' : undefined, boxShadow: p.featured_status === 'active' ? '0 6px 18px rgba(201,162,39,0.28)' : undefined }}>
                {p.featured_status === 'active' && (
                  <span className="destaque-strip">★ DESTAQUE</span>
                )}
                <button
                  onClick={(e) => toggleFavorite(e, p.id)}
                  aria-label={t('attr_save_favorites')}
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
                    {p.district}{p.area_util ? ` · ${p.area_util} ${t('meta_sqm_useful')}` : ''}{p.bedrooms ? ` · ${p.bedrooms} quartos` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openMessageModal(p); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5,
                        fontWeight: 700, color: '#fff', background: 'var(--telha)', border: 'none',
                        borderRadius: 7, padding: '8px 12px', cursor: 'pointer',
                      }}
                    >
                      💬 {t('prop_send_message')}
                    </button>
                    {profile.phone_public && (
                      <a
                        href={`tel:${profile.phone_public.replace(/\s+/g, '')}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5,
                          fontWeight: 700, color: 'var(--ink)', background: 'var(--plaster)',
                          border: '1.5px solid var(--line)', borderRadius: 7, padding: '8px 12px', textDecoration: 'none',
                        }}
                      >
                        📞 {t('prop_call')}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
                <p style={{ fontSize: 14 }}>{t('property_sent')}</p>
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
                    <label>{t('prop_message_to')} {profile.agency_name || profile.full_name}</label>
                    <textarea required rows={4} value={messageForm.message} onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })} />
                  </div>
                  <button type="submit" disabled={sendingMessage} className="btn btn-primary btn-block">
                    {sendingMessage ? t('sw_sending') : t('prop_send_message')}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
