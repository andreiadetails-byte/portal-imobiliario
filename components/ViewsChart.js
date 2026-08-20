'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '../lib/supabaseClient';

export default function ViewsChart({ propertyId, onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const since = new Date();
      since.setDate(since.getDate() - 13);

      const { data: rows } = await supabase
        .from('property_views').select('created_at')
        .eq('property_id', propertyId).gte('created_at', since.toISOString());

      const byDay = {};
      for (let i = 0; i < 14; i++) {
        const d = new Date(since);
        d.setDate(since.getDate() + i);
        const key = d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
        byDay[key] = 0;
      }
      (rows || []).forEach((r) => {
        const key = new Date(r.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
        if (key in byDay) byDay[key] += 1;
      });

      setData(Object.entries(byDay).map(([dia, visualizações]) => ({ dia, visualizações })));
      setLoading(false);
    }
    load();
  }, [propertyId]);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(51,46,34,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
    >
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: 480, maxWidth: 'calc(100vw - 32px)', padding: 26 }}>
        <h3 className="display" style={{ fontSize: 18, marginBottom: 4 }}>Visualizações — últimos 14 dias</h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 18 }}>
          Quantas vezes este anúncio foi visto, por dia.
        </p>

        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>A carregar...</p>
        ) : (
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={data}>
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} interval={1} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
                <Tooltip />
                <Bar dataKey="visualizações" fill="#7E8F6A" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <button onClick={onClose} className="btn btn-block" style={{ marginTop: 18 }}>Fechar</button>
      </div>
    </div>
  );
}
