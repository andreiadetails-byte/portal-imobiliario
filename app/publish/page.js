'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import LocationAutocomplete from '../../components/LocationAutocomplete';

const CARACTERISTICAS = [
  'Elevador', 'Garagem', 'Varanda', 'Arrecadação', 'Cozinha equipada', 'Aquecimento central',
  'Ar condicionado', 'Terraço', 'Jardim', 'Piscina', 'Mobilado', 'Painéis solares',
  'Vista de mar', 'Vista de rio', 'Portaria / segurança', 'Lareira',
];

export default function PublishPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [features, setFeatures] = useState(['Elevador', 'Garagem']);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState([]); // { file, preview }

  const [form, setForm] = useState({
    title: '', description: '', property_type: 'Apartamento', typology: 'T3',
    business_type: 'Venda', price: '', condo_fee: '', area: '', bedrooms: 3, bathrooms: 2,
    state: 'Usado', energy_certificate: 'B', address: '', district: '', municipality: '', parish: '',
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

  function toggleFeature(f) {
    setFeatures((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  }

  function handlePhotoSelect(e) {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos((cur) => [...cur, ...newPhotos].slice(0, 12)); // máximo 12 fotos
  }

  function removePhoto(index) {
    setPhotos((cur) => cur.filter((_, i) => i !== index));
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

    if (!form.district) {
      setError('Por favor, escolha um distrito na localização.');
      return;
    }

    setSaving(true);

    const { data, error } = await supabase.from('properties').insert({
      owner_id: user.id,
      title: form.title || `${form.typology} · ${form.address}`,
      description: form.description,
      property_type: form.property_type,
      typology: form.typology,
      business_type: form.business_type,
      price: Number(form.price),
      condo_fee: form.condo_fee ? Number(form.condo_fee) : null,
      area: Number(form.area),
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      state: form.state,
      energy_certificate: form.energy_certificate,
      address: form.address,
      district: form.district,
      municipality: form.municipality || null,
      parish: form.parish || null,
      features,
      status: 'em_revisao',
    }).select().single();

    if (error) { setError(error.message); setSaving(false); return; }

    if (photos.length > 0) {
      await uploadPhotos(data.id);
    }

    setSaving(false);
    router.push('/dashboard');
  }

  if (!user) return <div className="wrap" style={{ padding: 60 }}>A verificar sessão...</div>;

  return (
    <div className="wrap" style={{ maxWidth: 720, padding: '48px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 28 }}>{t('publish_title')}</h1>
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
              {['Apartamento', 'Moradia', 'Terreno', 'Espaço comercial', 'Armazém', 'Escritório'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Tipologia</label>
            <select value={form.typology} onChange={(e) => updateField('typology', e.target.value)}>
              {['T0', 'T1', 'T2', 'T3', 'T4', 'T5+'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label>Área bruta (m²)</label>
            <input type="number" required value={form.area} onChange={(e) => updateField('area', e.target.value)} />
          </div>
          <div className="field">
            <label>Estado</label>
            <select value={form.state} onChange={(e) => updateField('state', e.target.value)}>
              <option value="Novo">Novo / Nova construção</option>
              <option value="Usado">Usado</option>
            </select>
          </div>
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
          <label>Descrição</label>
          <textarea rows={4} value={form.description} onChange={(e) => updateField('description', e.target.value)} />
        </div>

        <div className="field">
          <label>Características</label>
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
          <label>Fotografias</label>
          <label
            htmlFor="photo-input"
            style={{
              display: 'block', border: '1.5px dashed var(--line)', borderRadius: 6, padding: '28px 16px',
              textAlign: 'center', color: 'var(--text-soft)', fontSize: 13.5, cursor: 'pointer',
            }}
          >
            Clique para escolher fotografias (até 12)
          </label>
          <input id="photo-input" type="file" accept="image/*" multiple onChange={handlePhotoSelect} style={{ display: 'none' }} />

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
  );
}
