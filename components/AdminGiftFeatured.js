'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Permite à administradora escolher um imóvel de qualquer utilizador e
// dar-lhe destaque de graça (como prenda ou promoção) — marcado de forma
// a NÃO contar para o limite normal de destaques que essa conta tem
// direito (a diferença fica no campo "featured_gifted").
export default function AdminGiftFeatured({ allUsers }) {
  const [userQuery, setUserQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProperties, setUserProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [days, setDays] = useState(7);
  const [saving, setSaving] = useState(null);
  const [result, setResult] = useState(null);

  const filteredUsers = userQuery.trim().length < 2 ? [] : allUsers.filter((u) => {
    const q = userQuery.toLowerCase();
    return (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.agency_name || '').toLowerCase().includes(q);
  }).slice(0, 8);

  async function selectUser(u) {
    setSelectedUser(u);
    setUserQuery('');
    setUserProperties([]);
    setResult(null);
    setLoadingProperties(true);
    const { data } = await supabase
      .from('properties')
      .select('id, typology, address, price, featured_status')
      .eq('owner_id', u.id)
      .neq('status', 'eliminado')
      .order('created_at', { ascending: false });
    setUserProperties(data || []);
    setLoadingProperties(false);
  }

  async function giftFeatured(propertyId) {
    setSaving(propertyId);
    const featuredUntil = new Date();
    featuredUntil.setDate(featuredUntil.getDate() + Number(days));

    const { error } = await supabase.from('properties').update({
      featured_status: 'active',
      featured_gifted: true,
      featured_activated_at: new Date().toISOString(),
      featured_until: featuredUntil.toISOString(),
    }).eq('id', propertyId);

    setSaving(null);
    if (error) {
      setResult({ error: 'Não foi possível ativar o destaque. Tenta novamente.' });
      return;
    }

    setUserProperties((cur) => cur.map((p) => (p.id === propertyId ? { ...p, featured_status: 'active' } : p)));
    setResult({ success: true });
  }

  async function removeGiftedFeatured(propertyId) {
    setSaving(propertyId);
    const { error } = await supabase.from('properties').update({
      featured_status: 'none',
      featured_gifted: false,
    }).eq('id', propertyId);
    setSaving(null);
    if (!error) {
      setUserProperties((cur) => cur.map((p) => (p.id === propertyId ? { ...p, featured_status: 'none' } : p)));
    }
  }

  return (
    <div className="card" style={{ padding: 20, marginBottom: 24 }}>
      <h2 className="display" style={{ fontSize: 17, marginBottom: 4 }}>Oferecer destaque</h2>
      <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 14 }}>
        Dá destaque a um anúncio sem contar para o limite normal da conta (prenda/promoção).
      </p>

      {!selectedUser ? (
        <div className="field" style={{ marginBottom: 0, position: 'relative' }}>
          <label>Procurar utilizador (nome ou email)</label>
          <input
            type="text"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="ex: joão silva, ou joao@email.com"
          />
          {filteredUsers.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
              background: '#fff', border: '1px solid var(--line)', borderRadius: 6,
              boxShadow: '0 6px 18px rgba(51,46,34,0.15)', maxHeight: 240, overflowY: 'auto', marginTop: 2,
            }}>
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => selectUser(u)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px',
                    border: 'none', background: '#fff', cursor: 'pointer', fontSize: 13.5,
                  }}
                >
                  <b>{u.full_name || u.agency_name || 'Sem nome'}</b>
                  <span style={{ color: 'var(--text-soft)', marginLeft: 6 }}>{u.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--plaster)', borderRadius: 6, padding: '9px 14px', marginBottom: 14,
          }}>
            <span style={{ fontSize: 13.5 }}>
              <b>{selectedUser.full_name || selectedUser.agency_name || 'Sem nome'}</b> ({selectedUser.email})
            </span>
            <button type="button" onClick={() => { setSelectedUser(null); setUserProperties([]); }} className="btn" style={{ padding: '4px 10px', fontSize: 12 }}>
              Trocar
            </button>
          </div>

          <div className="field" style={{ maxWidth: 160, marginBottom: 14 }}>
            <label>Dias de destaque</label>
            <input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
          </div>

          {loadingProperties && <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>A carregar anúncios...</p>}
          {!loadingProperties && userProperties.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>Este utilizador não tem anúncios.</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {userProperties.map((p) => (
              <div key={p.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 6,
              }}>
                <span style={{ fontSize: 13 }}>
                  {p.typology} · {p.address} — {Number(p.price).toLocaleString('pt-PT')} €
                  {p.featured_status === 'active' && <span style={{ color: 'var(--telha)', fontWeight: 600 }}> · ★ já em destaque</span>}
                </span>
                {p.featured_status === 'active' ? (
                  <button
                    type="button"
                    onClick={() => removeGiftedFeatured(p.id)}
                    disabled={saving === p.id}
                    className="btn"
                    style={{ fontSize: 12.5 }}
                  >
                    {saving === p.id ? 'A remover...' : 'Remover destaque'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => giftFeatured(p.id)}
                    disabled={saving === p.id}
                    className="btn btn-primary"
                    style={{ fontSize: 12.5 }}
                  >
                    {saving === p.id ? 'A ativar...' : '★ Oferecer destaque'}
                  </button>
                )}
              </div>
            ))}
          </div>

          {result?.success && <p style={{ fontSize: 13, color: 'var(--telha)', fontWeight: 600, marginTop: 10 }}>✓ Destaque oferecido com sucesso!</p>}
          {result?.error && <p className="error-text" style={{ marginTop: 10 }}>{result.error}</p>}
        </>
      )}
    </div>
  );
}
