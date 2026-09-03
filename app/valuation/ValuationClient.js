'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import { useLanguage } from '../../lib/i18n';
import HoneypotField from '../../components/HoneypotField';

export default function ValuationClient() {
  const { t } = useLanguage();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ address: '', typology: '', area: '', notes: '', name: '', contact: '' });
  const [honeypot, setHoneypot] = useState('');

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (honeypot) return; // robô apanhado — não faz nada, silenciosamente
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
        <h1 className="display" style={{ fontSize: 28, marginBottom: 8 }}>{t('valuation_title')}</h1>
        <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 24 }}>
          {t('valuation_subtitle')}
        </p>

        <div className="card" style={{ padding: 28 }}>
          {sent ? (
            <p style={{ fontSize: 14.5 }}>
              {t('valuation_thanks')}
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <HoneypotField value={honeypot} onChange={setHoneypot} />
              <div className="field">
                <label>{t('valuation_address_label')}</label>
                <input required value={form.address} onChange={(e) => update('address', e.target.value)} placeholder={t('valuation_address_placeholder')} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="field">
                  <label>{t('valuation_typology')}</label>
                  <select value={form.typology} onChange={(e) => update('typology', e.target.value)}>
                    <option value="">{t('valuation_select')}</option>
                    {['T0', 'T1', 'T2', 'T3', 'T4', 'T5+'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>{t('valuation_area')}</label>
                  <input type="number" value={form.area} onChange={(e) => update('area', e.target.value)} />
                </div>
              </div>

              <div className="field">
                <label>{t('valuation_features_optional')}</label>
                <textarea rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder={t('valuation_features_placeholder')} />
              </div>

              <div className="field">
                <label>{t('valuation_your_name')}</label>
                <input required value={form.name} onChange={(e) => update('name', e.target.value)} />
              </div>
              <div className="field">
                <label>{t('valuation_email_or_phone')}</label>
                <input required value={form.contact} onChange={(e) => update('contact', e.target.value)} />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={sending}>
                {sending ? t('valuation_sending') : t('valuation_request_btn')}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
