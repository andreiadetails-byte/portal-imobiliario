'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function PropertyPage() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);
  const [lead, setLead] = useState({ name: '', phone: '', message: 'Olá, gostaria de saber mais sobre este imóvel e agendar uma visita.' });

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('properties').select('*').eq('id', id).single();
      setProperty(data);
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  async function handleSendLead(e) {
    e.preventDefault();
    await supabase.from('leads').insert({
      property_id: property.id,
      owner_id: property.owner_id,
      name: lead.name,
      phone: lead.phone,
      message: lead.message,
    });
    setSent(true);
  }

  if (loading) return <div className="wrap" style={{ padding: 60 }}>A carregar...</div>;
  if (!property) return <div className="wrap" style={{ padding: 60 }}>Imóvel não encontrado.</div>;

  return (
    <div className="wrap" style={{ padding: '40px 32px 80px' }}>
      <div className="card-photo" style={{ height: 320, borderRadius: 8, marginBottom: 24 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 40 }}>
        <div>
          <div className="price mono" style={{ fontSize: 30 }}>
            {Number(property.price).toLocaleString('pt-PT')} {property.business_type === 'Arrendamento' ? '€/mês' : '€'}
          </div>
          <div className="addr" style={{ fontSize: 17 }}>{property.typology} · {property.address}</div>
          <div className="meta">{property.district}</div>

          <div style={{ display: 'flex', gap: 24, borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '18px 0', margin: '24px 0' }}>
            <div><b>{property.area} m²</b><div className="meta">Área</div></div>
            <div><b>{property.bedrooms}</b><div className="meta">Quartos</div></div>
            <div><b>{property.bathrooms}</b><div className="meta">Casas de banho</div></div>
            <div><b>{property.energy_certificate || '—'}</b><div className="meta">C. Energético</div></div>
          </div>

          <h3 className="display" style={{ fontSize: 19, marginBottom: 10 }}>Sobre o imóvel</h3>
          <p style={{ color: 'var(--text-soft)', fontSize: 14.5 }}>{property.description}</p>

          {property.features?.length > 0 && (
            <>
              <h3 className="display" style={{ fontSize: 19, margin: '24px 0 10px' }}>Características</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {property.features.map((f) => (
                  <span key={f} style={{ fontSize: 13, padding: '5px 12px', background: 'var(--plaster)', borderRadius: 14 }}>{f}</span>
                ))}
              </div>
            </>
          )}
        </div>

        <aside className="card" style={{ padding: 22, height: 'fit-content' }}>
          {sent ? (
            <p style={{ fontSize: 14 }}>Mensagem enviada! O anunciante vai receber o seu contacto em breve.</p>
          ) : (
            <form onSubmit={handleSendLead}>
              <div className="field">
                <label>Nome</label>
                <input required value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Telefone</label>
                <input required value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} />
              </div>
              <div className="field">
                <label>Mensagem</label>
                <textarea rows={4} value={lead.message} onChange={(e) => setLead({ ...lead, message: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary btn-block">Enviar mensagem</button>
              <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 10, textAlign: 'center' }}>
                O contacto é enviado diretamente ao anunciante
              </p>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
