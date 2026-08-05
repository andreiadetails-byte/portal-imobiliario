'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { useLanguage } from '../../../lib/i18n';
import Header from '../../../components/Header';
import { displayAddress } from '../../../lib/displayAddress';
import MortgageSimulator from '../../../components/MortgageSimulator';
import ImtCalculator from '../../../components/ImtCalculator';
import dynamic from 'next/dynamic';

const PropertyLocationMap = dynamic(() => import('../../../components/PropertyLocationMap'), { ssr: false });

export default function PropertyPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);
  const [lead, setLead] = useState({ name: '', email: '', phone: '', message: '' });

  const [user, setUser] = useState(null);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
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
        const { data: owner } = await supabase.from('profiles').select('id, full_name, agency_name, account_type, is_verified').eq('id', data.owner_id).single();
        setOwnerProfile(owner);

        const { data: photosData } = await supabase.from('property_photos').select('url').eq('property_id', data.id).order('position');
        setPhotos((photosData || []).map((p) => p.url));

        supabase.from('properties').update({ views_count: (data.views_count || 0) + 1 }).eq('id', data.id).then(() => {});

        const { data: similarData } = await supabase
          .from('properties')
          .select('id, price, address, district, typology, business_type, property_photos(url, position)')
          .eq('status', 'ativo')
          .eq('district', data.district)
          .eq('property_type', data.property_type)
          .neq('id', data.id)
          .limit(4);
        setSimilar(similarData || []);
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser && data) {
        const { data: fav } = await supabase
          .from('favorites').select('id').eq('user_id', currentUser.id).eq('property_id', data.id).maybeSingle();
        setIsFavorite(!!fav);

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
      await supabase.from('favorites').insert({ user_id: user.id, property_id: property.id });
      setIsFavorite(true);
    }
    setFavLoading(false);
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

  return (
    <>
      <Header />
    <div className="wrap" style={{ padding: '40px 32px 80px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 40 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="price mono" style={{ fontSize: 30 }}>
              {Number(property.price).toLocaleString('pt-PT')} {property.business_type === 'Arrendamento' ? '€/mês' : '€'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
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
                style={{ fontSize: 13 }}
              >
                ↗ Partilhar
              </button>
              <button
                onClick={toggleFavorite}
                disabled={favLoading}
                className="btn"
                style={{
                  fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
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
              <span>📅 Publicado há {Math.max(0, Math.floor((Date.now() - new Date(property.created_at)) / 86400000))} dias</span>
              <span>👁 {property.views_count || 0} visualizações</span>
            </div>
            <button
              onClick={() => setReportModal(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-soft)', textDecoration: 'underline' }}
            >
              ⚑ Denunciar este anúncio
            </button>
          </div>

          <div style={{ display: 'flex', gap: 24, borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '18px 0', margin: '24px 0', flexWrap: 'wrap' }}>
            {property.area && <div><b>{property.area} m²</b><div className="meta">Área bruta</div></div>}
            {property.area_util && <div><b>{property.area_util} m²</b><div className="meta">Área útil</div></div>}
            <div><b>{property.bedrooms}</b><div className="meta">{t('property_rooms')}</div></div>
            <div><b>{property.bathrooms}</b><div className="meta">{t('property_baths')}</div></div>
            <div><b>{property.energy_certificate || '—'}</b><div className="meta">{t('property_energy')}</div></div>
            {property.floor && (
              <div><b>{property.floor}{property.is_top_floor ? ' (último)' : ''}</b><div className="meta">Piso</div></div>
            )}
            {property.state && <div><b>{property.state}</b><div className="meta">Estado</div></div>}
          </div>

          {property.property_type === 'Moradia' && property.house_subtype && (
            <p style={{ fontSize: 13.5, color: 'var(--text-soft)', marginTop: -14, marginBottom: 20 }}>
              {property.house_subtype}
            </p>
          )}

          <h3 className="display" style={{ fontSize: 19, marginBottom: 10 }}>{t('property_about')}</h3>
          <p style={{ color: 'var(--text-soft)', fontSize: 14.5 }}>{property.description}</p>

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
                Fale com <b>{ownerProfile.agency_name || ownerProfile.full_name}</b> sobre este imóvel, diretamente no chat.
              </span>
            </div>
          )}

          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              property.area_util && ['Área útil', `${property.area_util} m²`],
              property.floor && ['Piso', property.floor],
              property.solar_orientations?.length > 0 && ['Orientação', property.solar_orientations.join(', ')],
              property.energy_certificate && ['Classe energética', property.energy_certificate],
              property.state && ['Estado do imóvel', property.state],
              ['Elevador', property.features?.includes('Elevador') ? 'Sim' : 'Não'],
              ['Estacionamento', property.has_parking ? 'Sim' : 'Não'],
              ['Varanda', property.has_balcony ? 'Sim' : 'Não'],
            ].filter(Boolean).map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span style={{ color: 'var(--text-soft)' }}>{label}</span>
                <b>{value}</b>
              </div>
            ))}
          </div>

          {(() => {
            const amenities = [
              property.has_storage && 'Arrumos',
              property.has_parking && 'Estacionamento',
              property.has_balcony && 'Varanda',
              property.has_garden && 'Jardim',
              property.has_pool && 'Piscina',
              property.has_gym && 'Ginásio',
              property.has_coworking && 'Sala de coworking',
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

          {photos.length > 0 ? (
            <div style={{ marginTop: 24 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[activePhoto]}
                alt=""
                onClick={() => setLightbox(true)}
                style={{ width: '100%', height: 380, objectFit: 'cover', borderRadius: 8, marginBottom: 8, cursor: 'zoom-in' }}
              />
              {photos.length > 1 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, overflowX: 'auto' }}>
                  {photos.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt=""
                      onClick={() => setActivePhoto(i)}
                      style={{
                        width: 72, height: 56, objectFit: 'cover', borderRadius: 4, cursor: 'pointer', flexShrink: 0,
                        border: i === activePhoto ? '2px solid var(--telha)' : '2px solid transparent',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card-photo" style={{ height: 380, borderRadius: 8, marginTop: 24 }} />
          )}

          {property.floor_plan_url && (
            <>
              <h3 className="display" style={{ fontSize: 19, margin: '24px 0 10px' }}>Planta do imóvel</h3>
              {property.floor_plan_url.toLowerCase().endsWith('.pdf') ? (
                <a href={property.floor_plan_url} target="_blank" rel="noopener noreferrer" className="btn">
                  📄 Ver planta (PDF)
                </a>
              ) : (
                <a href={property.floor_plan_url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={property.floor_plan_url} alt="Planta do imóvel" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--line)' }} />
                </a>
              )}
            </>
          )}

          <PropertyLocationMap latitude={property.latitude} longitude={property.longitude} address={displayAddress(property)} />

          {property.business_type === 'Venda' && (
            <>
              <MortgageSimulator price={Number(property.price)} />
              <ImtCalculator price={Number(property.price)} />
            </>
          )}
        </div>

        <aside className="card" style={{ padding: 22, height: 'fit-content' }}>
          {ownerProfile && (
            <Link href={`/agency/${ownerProfile.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', background: 'var(--azulejo)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0,
              }}>
                {(ownerProfile.agency_name || ownerProfile.full_name || '?')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {ownerProfile.agency_name || ownerProfile.full_name}
                  {ownerProfile.is_verified && (
                    <span title="Profissional verificado" style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 15, height: 15,
                      borderRadius: '50%', background: 'var(--azulejo)', color: '#fff', fontSize: 9,
                    }}>
                      ✓
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-soft)' }}>
                  {ownerProfile.account_type === 'agencia' ? t('agency_type') : t('agency_individual_type')}
                </div>
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
                <>Mensagem enviada! Pode continuar a conversa no <Link href="/chat" style={{ color: 'var(--telha)', textDecoration: 'underline' }}>chat</Link>.</>
              ) : t('property_sent')}
            </p>
          ) : user ? (
            <form onSubmit={handleSendLead}>
              <div className="field">
                <label>O seu nome</label>
                <input required value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} />
              </div>
              <div className="field">
                <label>O seu email</label>
                <input required type="email" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} />
              </div>
              <div className="field">
                <label>Mensagem para {ownerProfile?.agency_name || ownerProfile?.full_name}</label>
                <textarea required rows={4} value={lead.message} onChange={(e) => setLead({ ...lead, message: e.target.value })} placeholder="Olá, tenho interesse neste imóvel..." />
              </div>
              <button type="submit" className="btn btn-primary btn-block">Enviar mensagem</button>
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
                <label>O seu email</label>
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
          <h3 className="display" style={{ fontSize: 19, marginBottom: 14 }}>Imóveis semelhantes</h3>
          <div className="grid-listings">
            {similar.map((s) => {
              const sPhoto = s.property_photos?.sort((a, b) => a.position - b.position)[0]?.url;
              return (
                <Link key={s.id} href={`/property/${s.id}`} className="card">
                  {sPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sPhoto} alt="" style={{ width: '100%', height: 150, objectFit: 'cover' }} />
                  ) : (
                    <div className="card-photo" style={{ height: 150 }} />
                  )}
                  <div className="card-body">
                    <div className="price mono">
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
    </div>

    {reportModal && (
      <div
        onClick={() => setReportModal(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(51,46,34,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}
      >
        <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: 400, padding: 26, maxHeight: '90vh', overflowY: 'auto' }}>
          <h3 className="display" style={{ fontSize: 19, marginBottom: 6 }}>⚑ Denunciar este anúncio</h3>

          {reportSent ? (
            <p style={{ fontSize: 14 }}>Obrigado. A nossa equipa vai analisar esta denúncia.</p>
          ) : (
            <form onSubmit={submitReport}>
              <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 16, background: 'var(--plaster)', padding: 12, borderRadius: 6 }}>
                🔒 A sua identidade e contacto não são partilhados com o anunciante em momento nenhum — só a nossa equipa tem acesso a esta denúncia.
              </p>

              <div className="field">
                <label>Motivo</label>
                <select value={reportForm.reason} onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })}>
                  <option>Anúncio enganador ou falso</option>
                  <option>Imóvel não existe / fraude</option>
                  <option>Preço ou dados incorretos</option>
                  <option>Conteúdo discriminatório</option>
                  <option>Conteúdo ilegal ou proibido</option>
                  <option>Spam ou anúncio duplicado</option>
                  <option>Outro motivo</option>
                </select>
              </div>

              <div className="field">
                <label>O seu nome</label>
                <input required value={reportForm.name} onChange={(e) => setReportForm({ ...reportForm, name: e.target.value })} />
              </div>

              <div className="field">
                <label>Detalhes <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>(opcional)</span></label>
                <textarea rows={3} value={reportForm.details} onChange={(e) => setReportForm({ ...reportForm, details: e.target.value })} />
              </div>

              <div className="field">
                <label>O seu contacto <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>(email ou telefone, para vos podermos responder se for preciso)</span></label>
                <input required value={reportForm.contact} onChange={(e) => setReportForm({ ...reportForm, contact: e.target.value })} />
              </div>

              <button type="submit" className="btn btn-primary btn-block" style={{ marginBottom: 8 }}>Enviar denúncia</button>
              <button type="button" onClick={() => setReportModal(false)} className="btn btn-block">Cancelar</button>
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
        <img src={photos[activePhoto]} alt="" style={{ maxWidth: '90vw', maxHeight: '78vh', borderRadius: 6, objectFit: 'contain' }} />
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
    </>
  );
}
