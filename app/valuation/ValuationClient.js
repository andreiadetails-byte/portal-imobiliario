'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';

export default function ValuationClient() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ address: '', typology: '', area: '', notes: '', name: '', contact: '' });

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    await supabase.from('valuation_requests').insert({
      address: form.address,
      typology: form.typology || null,
      area: form.area ? Number(form.area) : null,
      notes: form.notes || null,
      name: form.name,
      contact: form.contact,
    });
    setSending(false);
    setSent(true);
  }

  return (
    <>
      <Header />
      <div className="wrap" style={{ maxWidth: 560, padding: '48px 32px 80px' }}>
        <BackButton fallback="/" />
        <h1 className="display" style={{ fontSize: 28, marginBottom: 8 }}>Avalie o seu imóvel</h1>
        <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 24 }}>
          Descreva o seu imóvel e entramos em contacto consigo com uma avaliação, sem compromisso.
        </p>

        <div className="card" style={{ padding: 28 }}>
          {sent ? (
            <p style={{ fontSize: 14.5 }}>
              Obrigado! Recebemos o seu pedido e vamos entrar em contacto consigo em breve.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Morada do imóvel</label>
                <input required value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Rua, número, freguesia, concelho" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="field">
                  <label>Tipologia</label>
                  <select value={form.typology} onChange={(e) => update('typology', e.target.value)}>
                    <option value="">Selecione</option>
                    {['T0', 'T1', 'T2', 'T3', 'T4', 'T5+'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Área (m²)</label>
                  <input type="number" value={form.area} onChange={(e) => update('area', e.target.value)} />
                </div>
              </div>

              <div className="field">
                <label>Características (opcional)</label>
                <textarea rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="ex: renovado em 2022, com garagem e varanda..." />
              </div>

              <div className="field">
                <label>O seu nome</label>
                <input required value={form.name} onChange={(e) => update('name', e.target.value)} />
              </div>
              <div className="field">
                <label>Email ou telefone</label>
                <input required value={form.contact} onChange={(e) => update('contact', e.target.value)} />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={sending}>
                {sending ? 'A enviar...' : 'Pedir avaliação'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
