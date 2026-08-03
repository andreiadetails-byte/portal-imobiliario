'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';

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

  const [form, setForm] = useState({
    title: '', description: '', property_type: 'Apartamento', typology: 'T3',
    business_type: 'Venda', price: '', condo_fee: '', area: '', bedrooms: 3, bathrooms: 2,
    state: 'Usado', energy_certificate: 'B', address: '', district: 'Lisboa',
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
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
      features,
      status: 'em_revisao',
    }).select().single();

    setSaving(false);
    if (error) { setError(error.message); return; }
    router.push('/dashboard');
  }

  if (!user) return <div className="wrap" style={{ padding: 60 }}>A verificar sessão...</div>;

  return (
    <div className="wrap" style={{ maxWidth: 720, padding: '48px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 28 }}>{t('publish_title')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: 32 }}>
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
          <label>Distrito</label>
          <input required value={form.district} onChange={(e) => updateField('district', e.target.value)} />
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
