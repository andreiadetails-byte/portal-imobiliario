'use client';

import { useEffect, useState } from 'react';

function scoreLabel(score) {
  if (score >= 75) return { text: 'Muito bem servido', color: 'var(--telha)' };
  if (score >= 45) return { text: 'Razoavelmente servido', color: 'var(--gold-strong)' };
  return { text: 'Poucos serviços por perto', color: 'var(--text-soft)' };
}

export default function NeighborhoodScore({ propertyId, latitude, longitude }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!latitude || !longitude) { setLoading(false); return; }
    fetch(`/api/neighborhood-score?propertyId=${propertyId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(true);
        else setData(json);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [propertyId, latitude, longitude]);

  if (!latitude || !longitude) return null;
  if (loading) {
    return (
      <div className="card" style={{ padding: 18, marginTop: 16 }}>
        <p style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>A calcular o que há perto deste imóvel...</p>
      </div>
    );
  }
  if (error || !data) return null;

  const { score, breakdown } = data;
  const label = scoreLabel(score);

  return (
    <div className="card" style={{ padding: 18, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
          background: `conic-gradient(${label.color} ${score * 3.6}deg, var(--plaster) 0deg)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: 'var(--paper)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700,
          }}>
            {score}
          </div>
        </div>
        <div>
          <h3 className="display" style={{ fontSize: 16, marginBottom: 2 }}>Score do bairro</h3>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: label.color }}>{label.text}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {Object.values(breakdown).map((item) => (
          <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-soft)' }}>
            <span>{item.label}</span>
            <b style={{ color: item.count > 0 ? 'var(--ink)' : 'var(--text-soft)' }}>{item.count}</b>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 10.5, color: 'var(--text-soft)', marginTop: 12 }}>
        Calculado com dados abertos do OpenStreetMap, num raio de cerca de 1,2 km.
      </p>
    </div>
  );
}
