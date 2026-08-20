'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import LocationAutocomplete from './LocationAutocomplete';

export default function PricePerM2Lookup() {
  const [levels, setLevels] = useState(null);
  const [businessType, setBusinessType] = useState('Venda');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!levels || (!levels.freguesia && !levels.concelho && !levels.distrito)) return;
    setLoading(true);
    setSearched(true);

    let query = supabase
      .from('properties')
      .select('price, area, area_util')
      .eq('status', 'ativo')
      .eq('business_type', businessType);

    // Usa o nível mais específico que a pessoa escolheu: freguesia > concelho > distrito.
    if (levels.freguesia) query = query.eq('parish', levels.freguesia);
    else if (levels.concelho) query = query.eq('municipality', levels.concelho);
    else query = query.eq('district', levels.distrito);

    const { data } = await query;

    const pricesPerM2 = (data || [])
      .map((p) => {
        const area = p.area || p.area_util;
        return area > 0 ? Number(p.price) / Number(area) : null;
      })
      .filter((v) => v != null && v > 0 && Number.isFinite(v));

    if (pricesPerM2.length === 0) {
      // Sem imóveis suficientes no site — tenta um valor de referência oficial do INE.
      const geoNamesToTry = [levels.freguesia, levels.concelho, levels.distrito].filter(Boolean);
      let ineMatch = null;
      for (const name of geoNamesToTry) {
        const { data: ineData } = await supabase
          .from('ine_reference_prices')
          .select('*')
          .ilike('geo_name', name)
          .eq('business_type', businessType === 'Arrendamento' ? 'Arrendamento' : 'Venda')
          .limit(1)
          .maybeSingle();
        if (ineData) { ineMatch = ineData; break; }
      }
      setResult({ count: 0, ine: ineMatch });
    } else {
      const avg = pricesPerM2.reduce((sum, v) => sum + v, 0) / pricesPerM2.length;
      const sorted = [...pricesPerM2].sort((a, b) => a - b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      setResult({ count: pricesPerM2.length, avg, min, max });
    }
    setLoading(false);
  }

  const areaLabel = levels?.freguesia || levels?.concelho || levels?.distrito || '';

  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 className="display" style={{ fontSize: 19, marginBottom: 6 }}>Quanto custa o m² na tua zona?</h3>
      <p style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 16 }}>
        Consulta o preço médio por m² numa freguesia, concelho ou distrito, com base nos imóveis publicados no site.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {['Venda', 'Arrendamento'].map((bt) => (
          <button
            key={bt}
            type="button"
            onClick={() => setBusinessType(bt)}
            style={{
              flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600, borderRadius: 5, cursor: 'pointer',
              border: businessType === bt ? '1.5px solid var(--telha)' : '1px solid var(--line)',
              background: businessType === bt ? 'rgba(126,143,106,0.12)' : 'var(--paper)',
              color: businessType === bt ? 'var(--telha)' : 'var(--text-soft)',
            }}
          >
            {bt}
          </button>
        ))}
      </div>

      <LocationAutocomplete onChange={() => {}} onLevels={setLevels} placeholder="Escreve uma freguesia, concelho ou distrito..." />

      <button
        type="button"
        onClick={handleSearch}
        className="btn btn-primary btn-block"
        style={{ marginTop: 12 }}
        disabled={loading || !levels}
      >
        {loading ? 'A calcular...' : 'Ver preço por m²'}
      </button>

      {searched && result && (
        <div style={{ marginTop: 16, background: 'var(--plaster)', borderRadius: 8, padding: 16 }}>
          {result.count === 0 ? (
            result.ine ? (
              <>
                <div style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 4 }}>
                  Ainda não há imóveis suficientes publicados em {areaLabel} — este é o valor oficial mais recente do INE
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--telha)', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>
                  {Number(result.ine.price_per_m2).toLocaleString('pt-PT')} €/m²
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-soft)' }}>
                  {result.ine.geo_name} · Fonte: INE, Estatísticas de Preços da Habitação ao Nível Local
                  {result.ine.reference_quarter && ` (${result.ine.reference_quarter})`}
                </div>
              </>
            ) : (
              <p style={{ fontSize: 13.5, color: 'var(--text-soft)' }}>
                Ainda não há imóveis suficientes publicados em {areaLabel} para calcular uma média fiável, e também não temos um valor de referência oficial guardado para esta zona.
              </p>
            )
          ) : (
            <>
              <div style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 4 }}>
                Preço médio em {areaLabel} ({result.count} {result.count === 1 ? 'imóvel' : 'imóveis'})
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--telha)', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>
                {Math.round(result.avg).toLocaleString('pt-PT')} €/m²
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                Entre {Math.round(result.min).toLocaleString('pt-PT')} € e {Math.round(result.max).toLocaleString('pt-PT')} € por m²
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
