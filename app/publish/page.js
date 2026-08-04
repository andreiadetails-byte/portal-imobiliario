'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import LocationAutocomplete from '../../components/LocationAutocomplete';
import Header from '../../components/Header';
import { geocodeAddress } from '../../lib/geocode';

const CARACTERISTICAS = [
  'Elevador', 'Cozinha equipada', 'Aquecimento central', 'Ar condicionado', 'Terraço',
  'Mobilado', 'Painéis solares', 'Vista de mar', 'Vista de rio', 'Portaria / segurança', 'Lareira',
];

const TIPOS_IMOVEL = ['Apartamento', 'Moradia', 'Terreno', 'Espaço comercial', 'Armazém', 'Quarto'];
const SUBTIPOS_MORADIA = ['Moradia bifamiliar', 'Moradia geminada', 'Moradia em banda', 'Moradia independente'];
const ORIENTACOES = ['Norte', 'Sul', 'Nascente', 'Poente'];
const PISOS = ['R/C', '1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º', '9º', '10º', 'Superior ao 10º'];

function YesNoField({ label, value, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        {[{ v: true, l: 'Sim' }, { v: false, l: 'Não' }].map((opt) => (
          <button
            key={String(opt.v)}
            type="button"
            onClick={() => onChange(opt.v)}
            style={{
              flex: 1, padding: '9px 0', fontSize: 13.5, fontWeight: 600, borderRadius: 5, cursor: 'pointer',
              border: value === opt.v ? '1.5px solid var(--telha)' : '1px solid var(--line)',
              background: value === opt.v ? 'rgba(126,143,106,0.12)' : 'var(--paper)',
              color: value === opt.v ? 'var(--telha)' : 'var(--text-soft)',
            }}
          >
            {opt.l}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PublishPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [features, setFeatures] = useState(['Elevador', 'Garagem']);
  const [solarOrientations, setSolarOrientations] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState([]); // { file, preview }
  const [planFile, setPlanFile] = useState(null);

  const [form, setForm] = useState({
    title: '', description: '', property_type: 'Apartamento', typology: 'T3',
    business_type: 'Venda', price: '', condo_fee: '', area: '', bedrooms: 3, bathrooms: 2,
    state: 'Usado', energy_certificate: 'B', address: '', district: '', municipality: '', parish: '',
    floor: '', area_util: '', house_subtype: '', is_top_floor: false,
    has_storage: null, has_parking: null, has_balcony: null,
    has_garden: null, has_pool: null, has_gym: null, has_coworking: null,
    show_full_address: null,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUser(data.user);
    });
  }, [router]);

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function calcQuality() {
    let score = 0;
    // Fotos — até 30 pontos (12 fotos = pontuação máxima desta parte)
    score += Math.min(photos.length / 12, 1) * 30;
    // Descrição — até 20 pontos (150 caracteres = máximo)
    score += Math.min((form.description || '').length / 150, 1) * 20;
    // Características extra selecionadas — até 15 pontos (6 = máximo)
    score += Math.min(features.length / 6, 1) * 15;
    // Planta anexada — 10 pontos
    if (planFile) score += 10;
    // Orientação solar preenchida — 10 pontos
    if (solarOrientations.length > 0) score += 10;
    // Título personalizado — 5 pontos
    if (form.title) score += 5;
    // Condomínio preenchido — 10 pontos
    if (form.condo_fee) score += 10;
    return Math.round(Math.min(score, 100));
  }

  const quality = calcQuality();
  const qualityLabel = quality >= 75 ? 'Muito bom' : quality >= 50 ? 'Bom' : quality >= 25 ? 'Fraco' : 'Muito fraco';
  const qualityColor = quality >= 75 ? 'var(--telha)' : quality >= 50 ? 'var(--azulejo)' : quality >= 25 ? 'var(--brass)' : '#8a3b2a';

  function toggleFeature(f) {
    setFeatures((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  }

  function handlePhotoSelect(e) {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos((cur) => [...cur, ...newPhotos].slice(0, 25)); // máximo 25 fotos
  }

  function removePhoto(index) {
    setPhotos((cur) => cur.filter((_, i) => i !== index));
  }

  function handlePlanSelect(e) {
    const file = e.target.files?.[0];
    if (file) setPlanFile(file);
  }

  async function uploadPlan(propertyId) {
    if (!planFile) return null;
    const ext = planFile.name.split('.').pop();
    const path = `${user.id}/${propertyId}/plan.${ext}`;
    const { error: uploadError } = await supabase.storage.from('property-photos').upload(path, planFile);
    if (uploadError) return null;
    const { data: publicUrlData } = supabase.storage.from('property-photos').getPublicUrl(path);
    return publicUrlData.publicUrl;
  }

  async function uploadPhotos(propertyId) {
    for (let i = 0; i < photos.length; i++) {
      const { file } = photos[i];
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${propertyId}/${Date.now()}-${i}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('property-photos').upload(path, file);
      if (uploadError) continue; // se uma foto falhar, continua com as outras

      const { data: publicUrlData } = supabase.storage.from('property-photos').getPublicUrl(path);

      await supabase.from('property_photos').insert({
        property_id: propertyId,
        url: publicUrlData.publicUrl,
        position: i,
      });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const { count: existingCount } = await supabase
      .from('properties').select('id', { count: 'exact', head: true }).eq('owner_id', user.id);
    if ((existingCount || 0) >= 50) {
      setError('Já tem 50 anúncios publicados, que é o limite por utilizador. Apague um anúncio antigo no seu painel para poder publicar um novo.');
      return;
    }

    if (!form.district || !form.municipality) {
      setError('Por favor, escolha o distrito e o concelho na localização.');
      return;
    }
    if (!form.floor) {
      setError('Por favor, indique o piso.');
      return;
    }
    if (!form.area_util) {
      setError('Por favor, indique a área útil.');
      return;
    }
    if (form.description.trim().length < 50) {
      setError(`A descrição precisa de pelo menos 50 caracteres (tem ${form.description.trim().length}).`);
      return;
    }
    if (form.property_type === 'Moradia' && !form.house_subtype) {
      setError('Por favor, escolha o subtipo de moradia.');
      return;
    }
    const boolFields = ['has_storage', 'has_parking', 'has_balcony', 'has_garden', 'has_pool', 'has_gym', 'has_coworking'];
    if (boolFields.some((f) => form[f] === null)) {
      setError('Por favor, responda a todas as perguntas de Sim/Não (arrumos, estacionamento, varanda, jardim, piscina, ginásio, sala coworking).');
      return;
    }
    if (form.show_full_address === null) {
      setError('Por favor, escolha se a morada completa fica visível no anúncio.');
      return;
    }

    if (!planFile) {
      setError('Por favor, anexe a planta do imóvel.');
      return;
    }
    if (photos.length < 6) {
      setError(`Por favor, adicione pelo menos 6 fotografias (tem ${photos.length}).`);
      return;
    }

    setSaving(true);

    const fullAddress = [form.address, form.parish, form.municipality, form.district].filter(Boolean).join(', ');
    const { latitude, longitude } = await geocodeAddress(fullAddress);

    const { data, error } = await supabase.from('properties').insert({
      owner_id: user.id,
      title: form.title || `${form.typology} · ${form.address}`,
      description: form.description,
      property_type: form.property_type,
      typology: form.typology,
      business_type: form.business_type,
      price: Number(form.price),
      condo_fee: form.condo_fee ? Number(form.condo_fee) : null,
      area: form.area ? Number(form.area) : null,
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      state: form.state,
      energy_certificate: form.energy_certificate,
      address: form.address,
      district: form.district,
      municipality: form.municipality || null,
      parish: form.parish || null,
      latitude,
      longitude,
      floor: form.floor,
      is_top_floor: form.is_top_floor,
      area_util: Number(form.area_util),
      solar_orientations: solarOrientations.length > 0 ? solarOrientations : null,
      house_subtype: form.property_type === 'Moradia' ? form.house_subtype : null,
      has_storage: form.has_storage,
      has_parking: form.has_parking,
      has_balcony: form.has_balcony,
      has_garden: form.has_garden,
      has_pool: form.has_pool,
      has_gym: form.has_gym,
      has_coworking: form.has_coworking,
      show_full_address: form.show_full_address,
      features,
      status: 'em_revisao',
    }).select().single();

    if (error) { setError(error.message); setSaving(false); return; }

    const planUrl = await uploadPlan(data.id);
    if (planUrl) {
      await supabase.from('properties').update({ floor_plan_url: planUrl }).eq('id', data.id);
    }

    if (photos.length > 0) {
      await uploadPhotos(data.id);
    }

    setSaving(false);
    router.push('/dashboard');
  }

  if (!user) return (<><Header /><div className="wrap" style={{ padding: 60 }}>A verificar sessão...</div></>);

  return (
    <>
      <Header />
    <div className="wrap" style={{ maxWidth: 720, padding: '48px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 28 }}>{t('publish_title')}</h1>
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 20, position: 'sticky', top: 76, zIndex: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Qualidade do anúncio</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: qualityColor }}>{quality}% · {qualityLabel}</span>
        </div>
        <div style={{ height: 6, background: 'var(--plaster)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${quality}%`, background: qualityColor, transition: 'width 0.3s ease' }} />
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 8 }}>
          {quality < 100
            ? 'Anúncios mais completos (mais fotos, descrição detalhada, características) recebem mais contactos.'
            : 'O seu anúncio está completo — ótimo trabalho!'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: 32, overflow: 'visible' }}>
        <div className="field">
          <label>Título do anúncio (opcional)</label>
          <input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="ex: T3 remodelado em Campo de Ourique" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label>Tipo de imóvel</label>
            <select value={form.property_type} onChange={(e) => updateField('property_type', e.target.value)}>
              {TIPOS_IMOVEL.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Tipologia</label>
            <select value={form.typology} onChange={(e) => updateField('typology', e.target.value)}>
              {['T0', 'T1', 'T2', 'T3', 'T4', 'T5+'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {form.property_type === 'Moradia' && (
          <div className="field">
            <label>Subtipo de moradia</label>
            <select value={form.house_subtype} onChange={(e) => updateField('house_subtype', e.target.value)}>
              <option value="">Escolha uma opção</option>
              {SUBTIPOS_MORADIA.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label>Piso</label>
            <select required value={form.floor} onChange={(e) => updateField('floor', e.target.value)}>
              <option value="">Escolha uma opção</option>
              {PISOS.map((p) => <option key={p}>{p}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontWeight: 400, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_top_floor} onChange={(e) => updateField('is_top_floor', e.target.checked)} />
              É o último piso do prédio
            </label>
          </div>
          <div className="field">
            <label>Área bruta (m²) <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>(opcional)</span></label>
            <input type="number" value={form.area} onChange={(e) => updateField('area', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label>Área útil (m²) <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: '#8a3b2a' }}>(obrigatório)</span></label>
            <input type="number" required value={form.area_util} onChange={(e) => updateField('area_util', e.target.value)} />
          </div>
          <div className="field">
            <label>Estado</label>
            <select value={form.state} onChange={(e) => updateField('state', e.target.value)}>
              <option value="Novo">Novo</option>
              <option value="Em construção">Em construção</option>
              <option value="Para recuperar">Para recuperar</option>
              <option value="Usado">Usado</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>Orientação solar <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>(opcional, pode escolher mais do que uma)</span></label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ORIENTACOES.map((o) => (
              <span
                key={o}
                onClick={() => setSolarOrientations((cur) => (cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]))}
                style={{
                  fontSize: 13, fontWeight: 500, padding: '8px 16px', borderRadius: 20, cursor: 'pointer',
                  border: '1px solid var(--line)',
                  background: solarOrientations.includes(o) ? 'var(--azulejo)' : 'var(--paper)',
                  color: solarOrientations.includes(o) ? '#fff' : 'var(--text-soft)',
                }}
              >
                {o}
              </span>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Certificado energético</label>
          <select value={form.energy_certificate} onChange={(e) => updateField('energy_certificate', e.target.value)}>
            {['A+', 'A', 'B', 'C', 'D', 'E', 'F'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Morada</label>
          <input required value={form.address} onChange={(e) => updateField('address', e.target.value)} placeholder="Rua, número, freguesia" />
        </div>

        <div className="field">
          <label>Localização</label>
          <LocationAutocomplete
            onLevels={({ distrito, concelho, freguesia }) => {
              updateField('district', distrito || '');
              updateField('municipality', concelho || '');
              updateField('parish', freguesia || '');
            }}
            onChange={() => {}}
            placeholder="Escreva o distrito"
          />
        </div>

        <div className="field">
          <label>Mostrar a morada completa no anúncio?</label>
          <p style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: -2, marginBottom: 8 }}>
            Se escolher "Não", o anúncio mostra apenas a localidade/concelho, não a rua e o número.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ v: true, l: 'Sim, mostrar morada completa' }, { v: false, l: 'Não, mostrar só a localidade' }].map((opt) => (
              <button
                key={String(opt.v)}
                type="button"
                onClick={() => updateField('show_full_address', opt.v)}
                style={{
                  flex: 1, padding: '10px 8px', fontSize: 13, fontWeight: 600, borderRadius: 5, cursor: 'pointer',
                  border: form.show_full_address === opt.v ? '1.5px solid var(--telha)' : '1px solid var(--line)',
                  background: form.show_full_address === opt.v ? 'rgba(126,143,106,0.12)' : 'var(--paper)',
                  color: form.show_full_address === opt.v ? 'var(--telha)' : 'var(--text-soft)',
                }}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Descrição <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>(mínimo 50 caracteres)</span></label>
          <textarea required rows={4} value={form.description} onChange={(e) => updateField('description', e.target.value)} />
          <p style={{ fontSize: 11.5, marginTop: 4, color: form.description.length < 50 ? '#8a3b2a' : 'var(--text-soft)' }}>
            {form.description.length}/50 caracteres {form.description.length < 50 && `(faltam ${50 - form.description.length})`}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <YesNoField label="Arrumos" value={form.has_storage} onChange={(v) => updateField('has_storage', v)} />
          <YesNoField label="Estacionamento" value={form.has_parking} onChange={(v) => updateField('has_parking', v)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <YesNoField label="Varanda" value={form.has_balcony} onChange={(v) => updateField('has_balcony', v)} />
          <YesNoField label="Jardim" value={form.has_garden} onChange={(v) => updateField('has_garden', v)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <YesNoField label="Piscina" value={form.has_pool} onChange={(v) => updateField('has_pool', v)} />
          <YesNoField label="Ginásio" value={form.has_gym} onChange={(v) => updateField('has_gym', v)} />
        </div>
        <YesNoField label="Sala de coworking" value={form.has_coworking} onChange={(v) => updateField('has_coworking', v)} />

        <div className="field">
          <label>Outras características</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CARACTERISTICAS.map((f) => (
              <span
                key={f}
                onClick={() => toggleFeature(f)}
                style={{
                  fontSize: 13, padding: '7px 14px', borderRadius: 20, cursor: 'pointer',
                  border: '1px solid var(--line)',
                  background: features.includes(f) ? 'var(--azulejo)' : 'var(--paper)',
                  color: features.includes(f) ? '#fff' : 'var(--text-soft)',
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label>Tipo de negócio</label>
            <select value={form.business_type} onChange={(e) => updateField('business_type', e.target.value)}>
              <option value="Venda">Venda</option>
              <option value="Arrendamento">Arrendamento</option>
            </select>
          </div>
          <div className="field">
            <label>Preço (€)</label>
            <input type="number" required value={form.price} onChange={(e) => updateField('price', e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>Planta do imóvel</label>
          <label
            htmlFor="plan-input"
            style={{
              display: 'block', border: '1.5px dashed var(--line)', borderRadius: 6, padding: '20px 16px',
              textAlign: 'center', color: 'var(--text-soft)', fontSize: 13.5, cursor: 'pointer',
            }}
          >
            {planFile ? `📄 ${planFile.name}` : 'Clique para anexar a planta (imagem ou PDF)'}
          </label>
          <input id="plan-input" type="file" accept="image/*,.pdf" onChange={handlePlanSelect} style={{ display: 'none' }} />
        </div>

        <div className="field">
          <label>Fotografias</label>
          <label
            htmlFor="photo-input"
            style={{
              display: 'block', border: '1.5px dashed var(--line)', borderRadius: 6, padding: '28px 16px',
              textAlign: 'center', color: 'var(--text-soft)', fontSize: 13.5, cursor: 'pointer',
            }}
          >
            Clique para escolher fotografias (mínimo 6, máximo 25)
          </label>
          <input id="photo-input" type="file" accept="image/*" multiple onChange={handlePhotoSelect} style={{ display: 'none' }} />

          {photos.length > 0 && (
            <p style={{ fontSize: 12.5, marginTop: 8, color: photos.length < 6 ? '#8a3b2a' : 'var(--text-soft)' }}>
              {photos.length}/25 fotografias {photos.length < 6 && `(faltam pelo menos ${6 - photos.length})`}
            </p>
          )}

          {photos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 6, overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    style={{
                      position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? t('publish_saving') : t('publish_submit')}
        </button>
        <p style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 10, textAlign: 'center' }}>
          {t('publish_review_note')}
        </p>
      </form>
    </div>
    </>
  );
}
