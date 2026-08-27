'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { useLanguage } from '../../../lib/i18n';
import Header from '../../../components/Header';
import { displayAddress } from '../../../lib/displayAddress';
import { accountTypeLabel } from '../../../lib/accountTypes';
import MortgageSimulator from '../../../components/MortgageSimulator';
import ImtCalculator from '../../../components/ImtCalculator';
import RentVsBuyCalculator from '../../../components/RentVsBuyCalculator';
import dynamic from 'next/dynamic';

const PropertyLocationMap = dynamic(() => import('../../../components/PropertyLocationMap'), { ssr: false });
import NeighborhoodScore from '../../../components/NeighborhoodScore';

export default function PropertyClient() {
  const { id } = useParams();
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);
  const [lead, setLead] = useState({ name: '', email: '', phone: '', message: t('prop_default_lead_message') });

  const [user, setUser] = useState(null);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [similarFavoriteIds, setSimilarFavoriteIds] = useState([]);
  const [showQr, setShowQr] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [similar, setSimilar] = useState([]);
  const [reportModal, setReportModal] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [reportForm, setReportForm] = useState({ reason: 'Anúncio enganador ou falso', details: '', name: '', contact: '' });

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('properties').select('*').eq('id', id).single();
      setProperty(data);
      setLoading(false);

      if (data) {
        const { data: owner } = await supabase.from('profiles_public').select('id, full_name, agency_name, account_type, is_verified, phone_public').eq('id', data.owner_id).single();
        setOwnerProfile(owner);

        const { data: photosData } = await supabase.from('property_photos').select('url').eq('property_id', data.id).order('position');
        setPhotos((photosData || []).map((p) => p.url));

        supabase.from('properties').update({ views_count: (data.views_count || 0) + 1 }).eq('id', data.id).then(() => {});
        supabase.from('property_views').insert({ property_id: data.id }).then(() => {});

        // Tenta primeiro imóveis bem parecidos (mesmo distrito e tipo); se não
        // houver 6, vai alargando os critérios até chegar a 6 (ou esgotar).
        let foundSimilar = [];
        const baseSelect = 'id, price, address, district, typology, business_type, property_type, property_photos(url, position)';

        const { data: sameDistrictType } = await supabase
          .from('properties').select(baseSelect)
          .eq('status', 'ativo').eq('district', data.district).eq('property_type', data.property_type)
          .neq('id', data.id).limit(6);
        foundSimilar = sameDistrictType || [];

        if (foundSimilar.length < 6) {
          const excludeIds = [data.id, ...foundSimilar.map((s) => s.id)];
          const { data: sameDistrict } = await supabase
            .from('properties').select(baseSelect)
            .eq('status', 'ativo').eq('district', data.district)
            .not('id', 'in', `(${excludeIds.join(',')})`)
            .limit(6 - foundSimilar.length);
          foundSimilar = [...foundSimilar, ...(sameDistrict || [])];
        }

        if (foundSimilar.length < 6) {
          const excludeIds = [data.id, ...foundSimilar.map((s) => s.id)];
          const { data: sameBusiness } = await supabase
            .from('properties').select(baseSelect)
            .eq('status', 'ativo').eq('business_type', data.business_type)
            .not('id', 'in', `(${excludeIds.join(',')})`)
            .order('created_at', { ascending: false })
            .limit(6 - foundSimilar.length);
          foundSimilar = [...foundSimilar, ...(sameBusiness || [])];
        }

        setSimilar(foundSimilar);
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser && data) {
        const { data: fav } = await supabase
          .from('favorites').select('id').eq('user_id', currentUser.id).eq('property_id', data.id).maybeSingle();
        setIsFavorite(!!fav);

        const { data: allFavs } = await supabase.from('favorites').select('property_id').eq('user_id', currentUser.id);
        setSimilarFavoriteIds((allFavs || []).map((f) => f.property_id));

        const { data: myProfile } = await supabase.from('profiles').select('full_name').eq('id', currentUser.id).single();
        setLead((cur) => ({ ...cur, name: myProfile?.full_name || '', email: currentUser.email || '' }));
      }
    }
    if (id) load();
  }, [id]);

  async function toggleFavorite() {
    if (!user) { router.push('/login'); return; }
    setFavLoading(true);
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('property_id', property.id);
      setIsFavorite(false);
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, property_id: property.id, price_at_save: property.price ?? null });
      setIsFavorite(true);
    }
    setFavLoading(false);
  }

  async function toggleSimilarFavorite(e, propertyId) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { router.push('/login'); return; }
    if (similarFavoriteIds.includes(propertyId)) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('property_id', propertyId);
      setSimilarFavoriteIds((cur) => cur.filter((id) => id !== propertyId));
    } else {
      const prop = similar.find((p) => p.id === propertyId);
      await supabase.from('favorites').insert({ user_id: user.id, property_id: propertyId, price_at_save: prop?.price ?? null });
      setSimilarFavoriteIds((cur) => [...cur, propertyId]);
    }
  }

  async function submitReport(e) {
    e.preventDefault();
    await supabase.from('reports').insert({
      property_id: property.id,
      reason: reportForm.reason,
      details: reportForm.details,
      reporter_name: reportForm.name,
      reporter_contact: reportForm.contact,
    });
    setReportSent(true);
  }

  async function getOrCreateConversation() {
    if (!user || user.id === property.owner_id) return null;

    const { data: existing } = await supabase
      .from('conversations').select('id').eq('property_id', property.id).eq('buyer_id', user.id).maybeSingle();
    if (existing) return existing.id;

    const { data: created, error } = await supabase
      .from('conversations')
      .insert({ property_id: property.id, buyer_id: user.id, seller_id: property.owner_id })
      .select().single();

    return error ? null : created.id;
  }

  async function startConversation() {
    if (!user) { router.push('/login'); return; }
    if (user.id === property.owner_id) return;
    const conversationId = await getOrCreateConversation();
    if (conversationId) router.push(`/chat?c=${conversationId}`);
  }

  async function handleSendLead(e) {
    e.preventDefault();

    if (user && user.id !== property.owner_id) {
      // Com sessão iniciada: um sistema só — vai diretamente para o chat, com o nome e email visíveis na conversa.
      const conversationId = await getOrCreateConversation();
      if (conversationId) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: lead.message,
          sender_name: lead.name,
          sender_email: lead.email,
          sender_phone: lead.phone || null,
        });
      }
    } else {
      // Sem sessão iniciada, não há forma de chat — fica como lead (com nome, email e contacto).
      await supabase.from('leads').insert({
        property_id: property.id,
        owner_id: property.owner_id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        message: lead.message,
      });
    }

    setSent(true);
  }

  if (loading) return (<><Header /><div className="wrap" style={{ padding: 60 }}>...</div></>);
  if (!property) return (<><Header /><div className="wrap" style={{ padding: 60 }}>{t('property_not_found')}</div></>);

  // Mostra a versão traduzida da descrição, se existir; senão, mostra sempre o original em português.
  const displayDescription = (lang !== 'pt' && property.description_translations?.[lang]) || property.description;

  return (
    <>
      <Header />
    <main id="main-content" className="wrap" style={{ padding: '40px 32px 80px' }}>
      <button
        onClick={() => (typeof window !== 'undefined' && window.history.length > 1 ? router.back() : router.push('/results'))}
        className="btn"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, marginBottom: 20, padding: '9px 16px' }}
      >
        {t('back_to_previous_page')}
      </button>
      <div className="property-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 40 }}>
        <div>
          {photos.length > 0 ? (
            <div style={{ marginBottom: 24 }}>
              {photos.length > 1 ? (
                <div className="property-gallery" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, height: 380, borderRadius: 8, overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="property-gallery-main"
                    src={photos[activePhoto]}
                    alt={`Foto ${activePhoto + 1} de ${photos.length} — ${property.typology}, ${property.address}`}
                    onClick={() => setLightbox(true)}
                    loading="eager"
                    fetchPriority="high"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
                  />
                  <div className="property-gallery-side" style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
                    {[1, 2].map((offset) => {
                      const idx = (activePhoto + offset) % photos.length;
                      const isLast = offset === 2;
                      const remaining = photos.length - 3;
                      return (
                        <div
                          key={offset}
                          onClick={() => (isLast && remaining > 0 ? setLightbox(true) : setActivePhoto(idx))}
                          style={{ position: 'relative', flex: '1 1 0', minHeight: 0, cursor: 'pointer', borderRadius: 4, overflow: 'hidden' }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photos[idx]} alt={`Foto ${idx + 1} de ${photos.length} do imóvel`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {isLast && remaining > 0 && (
                            <div style={{
                              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600,
                            }}>
                              +{remaining} fotos
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={photos[0]}
                  alt={`Foto do imóvel — ${property.typology}, ${property.address}`}
                  onClick={() => setLightbox(true)}
                  style={{ width: '100%', height: 380, objectFit: 'cover', borderRadius: 8, cursor: 'zoom-in' }}
                />
              )}
            </div>
          ) : (
            <div className="card-photo" style={{ height: 380, borderRadius: 8, marginBottom: 24 }} />
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="price" style={{ fontSize: 30, whiteSpace: 'nowrap' }}>
                {Number(property.price).toLocaleString('pt-PT')} {property.business_type === 'Arrendamento' ? '€/mês' : '€'}
              </div>
              {property.previous_price && property.previous_price > property.price && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 10,
                    background: 'rgba(126,143,106,0.18)', color: 'var(--telha)',
                  }}>
                    ↓ Preço reduzido
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-soft)', textDecoration: 'line-through' }}>
                    {Number(property.previous_price).toLocaleString('pt-PT')} €
                  </span>
                  {property.price_reduction_count > 1 && (
                    <span style={{ fontSize: 11.5, color: 'var(--text-soft)' }}>
                      · já desceu {property.price_reduction_count} vezes desde que foi publicado
                    </span>
                  )}
                </div>
              )}
              {property.document_verified && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                  <span style={{
                    fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 10,
                    background: 'rgba(90,107,73,0.15)', color: 'var(--azulejo)',
                  }}>
                    📄 Documentação verificada
                  </span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${property.typology} · ${displayAddress(property)} — ${Number(property.price).toLocaleString('pt-PT')} € ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
              >
                💬 WhatsApp
              </a>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: property.title, url: window.location.href });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Link copiado!');
                  }
                }}
                className="btn"
                style={{ fontSize: 13, whiteSpace: 'nowrap' }}
              >
                ↗ Partilhar
              </button>
              <button
                onClick={() => setShowQr(true)}
                className="btn"
                style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
              >
                ▦ QR Code
              </button>
              <button
                onClick={toggleFavorite}
                disabled={favLoading}
                className="btn"
                style={{
                  fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                  background: isFavorite ? 'rgba(126,143,106,0.12)' : 'transparent',
                  borderColor: isFavorite ? 'var(--azulejo)' : 'var(--ink)',
                  color: isFavorite ? 'var(--telha)' : 'var(--ink)',
                }}
              >
                {isFavorite ? `♥ ${t('property_saved')}` : `♡ ${t('property_save')}`}
              </button>
            </div>
          </div>
          <div className="addr" style={{ fontSize: 17 }}>{property.typology} · {displayAddress(property)}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="meta">{property.district}{property.internal_reference && ` · Ref. ${property.internal_reference}`}</div>
            <div className="meta" style={{ marginTop: 4, display: 'flex', gap: 14 }}>
              <span>📅 {t('prop_published_days_ago')} {Math.max(0, Math.floor((Date.now() - new Date(property.created_at)) / 86400000))} {t('prop_days_ago_suffix')}</span>
              <span>👁 {property.views_count || 0} {t('prop_views')}</span>
            </div>
            <button
              onClick={() => setReportModal(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-soft)', textDecoration: 'underline' }}
            >
              {t('prop_report_listing')}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 24, borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '18px 0', margin: '24px 0', flexWrap: 'wrap' }}>
            {property.area && <div><b>{property.area} m²</b><div className="meta">{t('prop_gross_area')}</div></div>}
            {property.area_util && <div><b>{property.area_util} m²</b><div className="meta">{t('prop_usable_area')}</div></div>}
            <div><b>{property.bedrooms}</b><div className="meta">{t('property_rooms')}</div></div>
            <div><b>{property.bathrooms}</b><div className="meta">{t('property_baths')}</div></div>
            <div><b>{property.energy_certificate || '—'}</b><div className="meta">{t('property_energy')}</div></div>
            {property.floor && (
              <div><b>{property.floor}{property.is_top_floor ? ` ${t('prop_top_floor')}` : ''}</b><div className="meta">{t('prop_floor')}</div></div>
            )}
            {property.state && <div><b>{property.state}</b><div className="meta">{t('prop_state_label')}</div></div>}
          </div>

          {property.property_type === 'Moradia' && property.house_subtype && (
            <p style={{ fontSize: 13.5, color: 'var(--text-soft)', marginTop: -14, marginBottom: 20 }}>
              {property.house_subtype}
            </p>
          )}

          <h3 className="display" style={{ fontSize: 19, marginBottom: 12 }}>{t('property_about')}</h3>
          {displayDescription.split(/\n{2,}/).map((paragraph, i) => (
            <p key={i} style={{ color: 'var(--ink)', fontSize: 16, lineHeight: 1.7, marginBottom: 16, whiteSpace: 'pre-line' }}>
              {paragraph}
            </p>
          ))}

          {ownerProfile && user?.id !== property.owner_id && (
            <div
              onClick={startConversation}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, padding: '12px 16px',
                background: 'var(--plaster)', borderRadius: 8, cursor: 'pointer',
              }}
            >
              💬
              <span style={{ fontSize: 13.5 }}>
                {t('prop_chat_with')} <b>{property.display_name || ownerProfile.agency_name || ownerProfile.full_name}</b> {t('prop_chat_about_property')}
              </span>
            </div>
          )}

          {ownerProfile?.phone_public && (
            <a
              href={`tel:${ownerProfile.phone_public.replace(/\s+/g, '')}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '12px 16px',
                background: 'var(--plaster)', borderRadius: 8, textDecoration: 'none', color: 'var(--ink)',
              }}
            >
              📞
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{ownerProfile.phone_public}</span>
            </a>
          )}

          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              property.area_util && [t('prop_usable_area'), `${property.area_util} m²`],
              property.floor && [t('prop_floor'), property.floor],
              property.solar_orientations?.length > 0 && [t('prop_orientation'), property.solar_orientations.join(', ')],
              property.energy_certificate && [t('prop_energy_class'), property.energy_certificate],
              property.construction_year && [t('prop_construction_year'), property.construction_year],
              property.state && [t('prop_state'), property.state],
              [t('prop_elevator'), property.features?.includes('Elevador') ? t('prop_yes') : t('prop_no')],
              [t('prop_parking'), property.has_parking ? t('prop_yes') : t('prop_no')],
              [t('prop_balcony'), property.has_balcony ? t('prop_yes') : t('prop_no')],
            ].filter(Boolean).map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span style={{ color: 'var(--text-soft)' }}>{label}</span>
                <b>{value}</b>
              </div>
            ))}
          </div>

          {(() => {
            const amenities = [
              property.has_storage && t('prop_amenity_storage'),
              property.has_parking && t('prop_parking'),
              property.has_balcony && t('prop_balcony'),
              property.has_garden && t('prop_amenity_garden'),
              property.has_pool && t('prop_amenity_pool'),
              property.has_gym && t('prop_amenity_gym'),
              property.has_coworking && t('prop_amenity_coworking'),
              property.near_transit && t('prop_amenity_transit'),
              property.is_furnished && t('prop_amenity_furnished'),
              property.pets_allowed && t('prop_amenity_pets'),
              ...(property.features || []),
            ].filter(Boolean);
            return amenities.length > 0 && (
              <>
                <h3 className="display" style={{ fontSize: 19, margin: '24px 0 10px' }}>{t('property_features')}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {amenities.map((f) => (
                    <span key={f} style={{ fontSize: 13, padding: '5px 12px', background: 'var(--plaster)', borderRadius: 14 }}>{f}</span>
                  ))}
                </div>
              </>
            );
          })()}

          {property.video_url && (
            <>
              <h3 className="display" style={{ fontSize: 19, margin: '24px 0 10px' }}>{t('prop_video_title')}</h3>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                controls
                preload="metadata"
                style={{ width: '100%', maxHeight: 480, borderRadius: 8, border: '1px solid var(--line)', background: '#000' }}
              >
                <source src={property.video_url} />
                O seu browser não suporta a reprodução de vídeo.
              </video>
            </>
          )}

          {property.floor_plan_url && (
            <>
              <h3 className="display" style={{ fontSize: 19, margin: '24px 0 10px' }}>{t('prop_floorplan_title')}</h3>
              {property.floor_plan_url.toLowerCase().endsWith('.pdf') ? (
                <a href={property.floor_plan_url} target="_blank" rel="noopener noreferrer" className="btn">
                  {t('prop_view_floorplan')}
                </a>
              ) : (
                <a href={property.floor_plan_url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={property.floor_plan_url} alt={t('attr_floorplan_alt')} loading="lazy" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--line)' }} />
                </a>
              )}
            </>
          )}

          <PropertyLocationMap latitude={property.latitude} longitude={property.longitude} address={displayAddress(property)} />
          <NeighborhoodScore propertyId={property.id} latitude={property.latitude} longitude={property.longitude} />

          {property.business_type === 'Venda' && (
            <>
              <MortgageSimulator price={Number(property.price)} />
              <ImtCalculator price={Number(property.price)} />
              <RentVsBuyCalculator price={Number(property.price)} />
            </>
          )}
        </div>

        <aside id="property-contact-box" className="card" style={{ padding: 22, height: 'fit-content' }}>
          {ownerProfile && (
            <Link
              href={`/agency/${ownerProfile.id}${property.display_name ? `?as=${encodeURIComponent(property.display_name)}` : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: '50%', background: 'var(--azulejo)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0,
              }}>
                {(property.display_name || ownerProfile.agency_name || ownerProfile.full_name || '?')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {property.display_name || ownerProfile.agency_name || ownerProfile.full_name}
                  {ownerProfile.is_verified && (
                    <span title={t('attr_verified_professional')} style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 15, height: 15,
                      borderRadius: '50%', background: 'var(--azulejo)', color: '#fff', fontSize: 9,
                    }}>
                      ✓
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-soft)' }}>
                  {accountTypeLabel(ownerProfile.account_type)}
                </div>
                {ownerProfile.phone_public && (
                  <a
                    href={`tel:${ownerProfile.phone_public.replace(/\s+/g, '')}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontSize: 12, color: 'var(--telha)', fontWeight: 600, marginTop: 2, display: 'block', textDecoration: 'none' }}
                  >
                    📞 {ownerProfile.phone_public}
                  </a>
                )}
                <span style={{ fontSize: 11.5, color: 'var(--telha)', fontWeight: 600, marginTop: 4, display: 'inline-block', textDecoration: 'underline' }}>
                  {t('prop_view_all_listings')}
                </span>
              </div>
            </Link>
          )}

          {user && user.id === property.owner_id ? (
            <p style={{ fontSize: 13.5, color: 'var(--text-soft)', textAlign: 'center', padding: '12px 0' }}>
              {t('property_own_listing')}
            </p>
          ) : sent ? (
            <p style={{ fontSize: 14 }}>
              {user ? (
                <>{t('prop_msg_sent')} <Link href="/chat" style={{ color: 'var(--telha)', textDecoration: 'underline' }}>{t('prop_chat_link')}</Link>.</>
              ) : t('property_sent')}
            </p>
          ) : user ? (
            <form onSubmit={handleSendLead}>
              <div className="field">
                <label>{t('prop_your_name')}</label>
                <input required value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} />
              </div>
              <div className="field">
                <label>{t('prop_your_email')}</label>
                <input required type="email" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} />
              </div>
              <div className="field">
                <label>{t('prop_phone_optional')} <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{t('prop_optional')}</span></label>
                <input value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} />
              </div>
              <div className="field">
                <label>{t('prop_message_to')} {ownerProfile?.agency_name || ownerProfile?.full_name}</label>
                <textarea required rows={4} value={lead.message} onChange={(e) => setLead({ ...lead, message: e.target.value })} placeholder={t('attr_interest_placeholder')} />
              </div>
              <button type="submit" className="btn btn-primary btn-block">{t('prop_send_message')}</button>
              <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 10, textAlign: 'center' }}>
                A mensagem, o seu nome e email ficam visíveis no chat, associados a esta conversa.
              </p>
            </form>
          ) : (
            <form onSubmit={handleSendLead}>
              <div className="field">
                <label>{t('property_name')}</label>
                <input required value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} />
              </div>
              <div className="field">
                <label>{t('prop_your_email')}</label>
                <input required type="email" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} />
              </div>
              <div className="field">
                <label>{t('property_phone')} <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>(opcional)</span></label>
                <input value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} />
              </div>
              <div className="field">
                <label>{t('property_message')}</label>
                <textarea rows={4} value={lead.message} onChange={(e) => setLead({ ...lead, message: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary btn-block">{t('property_send')}</button>
              <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 10, textAlign: 'center' }}>
                {t('property_privacy')}
              </p>
            </form>
          )}
        </aside>
      </div>

      {similar.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <h3 className="display" style={{ fontSize: 19, marginBottom: 14 }}>{t('prop_similar_title')}</h3>
          <div className="grid-listings">
            {similar.map((s) => {
              const sPhoto = s.property_photos?.sort((a, b) => a.position - b.position)[0]?.url;
              return (
                <Link key={s.id} href={`/property/${s.id}`} className="card" style={{ position: 'relative' }}>
                  <button
                    onClick={(e) => toggleSimilarFavorite(e, s.id)}
                    aria-label={t('attr_save_favorites')}
                    style={{
                      position: 'absolute', top: 10, right: 10, zIndex: 1, width: 30, height: 30, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer', fontSize: 15,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: similarFavoriteIds.includes(s.id) ? '#b8452f' : 'var(--ink)',
                    }}
                  >
                    {similarFavoriteIds.includes(s.id) ? '♥' : '♡'}
                  </button>
                  {sPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sPhoto} alt={`Foto de imóvel semelhante — ${s.typology}`} loading="lazy" style={{ width: '100%', height: 150, objectFit: 'cover' }} />
                  ) : (
                    <div className="card-photo" style={{ height: 150 }} />
                  )}
                  <div className="card-body">
                    <div className="price">
                      {Number(s.price).toLocaleString('pt-PT')} {s.business_type === 'Arrendamento' ? '€/mês' : '€'}
                    </div>
                    <div className="addr">{s.typology} · {s.address}</div>
                    <div className="meta">{s.district}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </main>

    {!(user && user.id === property.owner_id) && (
      <button
        onClick={() => document.getElementById('property-contact-box')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        className="property-contact-fab"
        style={{
          position: 'fixed', bottom: 78, right: 16, zIndex: 45,
          background: 'var(--telha)', color: '#fff', border: 'none', borderRadius: 30,
          padding: '13px 20px', fontSize: 14, fontWeight: 700, boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          display: 'none', alignItems: 'center', gap: 8, cursor: 'pointer',
        }}
      >
        💬 {t('prop_send_message')}
      </button>
    )}

    {reportModal && (
      <div
        onClick={() => setReportModal(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(51,46,34,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}
      >
        <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: 400, maxWidth: 'calc(100vw - 32px)', padding: 26, maxHeight: '90vh', overflowY: 'auto' }}>
          <h3 className="display" style={{ fontSize: 19, marginBottom: 6 }}>{t('prop_report_listing')}</h3>

          {reportSent ? (
            <p style={{ fontSize: 14 }}>{t('prop_report_thanks')}</p>
          ) : (
            <form onSubmit={submitReport}>
              <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 16, background: 'var(--plaster)', padding: 12, borderRadius: 6 }}>
                🔒 A sua identidade e contacto não são partilhados com o anunciante em momento nenhum — só a nossa equipa tem acesso a esta denúncia.
              </p>

              <div className="field">
                <label>{t('prop_reason_label')}</label>
                <select value={reportForm.reason} onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })}>
                  <option>{t('prop_reason_misleading')}</option>
                  <option>{t('prop_reason_notexist')}</option>
                  <option>{t('prop_reason_wrongprice')}</option>
                  <option>{t('prop_reason_discriminatory')}</option>
                  <option>{t('prop_reason_illegal')}</option>
                  <option>{t('prop_reason_spam')}</option>
                  <option>{t('prop_reason_other')}</option>
                </select>
              </div>

              <div className="field">
                <label>{t('prop_your_name')}</label>
                <input required value={reportForm.name} onChange={(e) => setReportForm({ ...reportForm, name: e.target.value })} />
              </div>

              <div className="field">
                <label>{t('prop_details_label')} <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{t('prop_optional')}</span></label>
                <textarea rows={3} value={reportForm.details} onChange={(e) => setReportForm({ ...reportForm, details: e.target.value })} />
              </div>

              <div className="field">
                <label>{t('prop_your_contact')} <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{t('prop_contact_hint')}</span></label>
                <input required value={reportForm.contact} onChange={(e) => setReportForm({ ...reportForm, contact: e.target.value })} />
              </div>

              <button type="submit" className="btn btn-primary btn-block" style={{ marginBottom: 8 }}>{t('prop_send_report')}</button>
              <button type="button" onClick={() => setReportModal(false)} className="btn btn-block">{t('prop_cancel')}</button>
            </form>
          )}
        </div>
      </div>
    )}

    {lightbox && (
      <div
        onClick={() => setLightbox(false)}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(20,17,12,0.92)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos[activePhoto]} alt={`Foto ${activePhoto + 1} de ${photos.length} — vista ampliada`} style={{ maxWidth: '90vw', maxHeight: '78vh', borderRadius: 6, objectFit: 'contain' }} />
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setActivePhoto((i) => (i - 1 + photos.length) % photos.length); }}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}
          >
            ‹
          </button>
          <span style={{ color: '#fff', fontSize: 13 }}>{activePhoto + 1} / {photos.length}</span>
          <button
            onClick={(e) => { e.stopPropagation(); setActivePhoto((i) => (i + 1) % photos.length); }}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', fontSize: 18 }}
          >
            ›
          </button>
        </div>
        <button
          onClick={() => setLightbox(false)}
          style={{ position: 'absolute', top: 20, right: 24, background: 'none', border: 'none', color: '#fff', fontSize: 26, cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>
    )}

    {showQr && (
      <div
        onClick={() => setShowQr(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(51,46,34,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      >
        <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: 300, maxWidth: 'calc(100vw - 32px)', padding: 26, textAlign: 'center' }}>
          <h3 className="display" style={{ fontSize: 18, marginBottom: 6 }}>{t('prop_qr_title')}</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 16 }}>
            Útil para cartazes, folhetos ou vitrinas — quem digitalizar vai direto a este anúncio.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
            alt="Código QR"
            width={220}
            height={220}
            style={{ borderRadius: 8, border: '1px solid var(--line)', marginBottom: 16 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
              download="codigo-qr-imovel.png"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ fontSize: 13, flex: 1 }}
            >
              Descarregar
            </a>
            <button onClick={() => setShowQr(false)} className="btn" style={{ fontSize: 13, flex: 1 }}>{t('prop_close')}</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
