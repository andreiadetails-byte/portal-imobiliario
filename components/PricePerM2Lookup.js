'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import LocationAutocomplete from './LocationAutocomplete';

// Regiões usadas pelo INE que não são distrito/concelho/freguesia (não existem
// nessa hierarquia), mas que as pessoas costumam escrever à procura de preços.
const INE_REGIONS = ['Algarve', 'Grande Lisboa', 'Área Metropolitana do Porto', 'Península de Setúbal', 'Região Autónoma da Madeira', 'Portugal'];

export default function PricePerM2Lookup() {
  const [levels, setLevels] = useState(null);
  const [typedQuery, setTypedQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [businessType, setBusinessType] = useState('Venda');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);

  const matchingRegions = typedQuery.trim().length >= 2
    ? INE_REGIONS.filter((r) => r.toLowerCase().includes(typedQuery.trim().toLowerCase()))
    : [];

  function handleLocationChange(text) {
    setTypedQuery(text);
    if (selectedRegion) setSelectedRegion(null);
  }

  function handleLocationLevels(newLevels) {
    setLevels(newLevels);
    setSelectedRegion(null);
  }

  function pickRegion(region) {
    setSelectedRegion(region);
    setLevels(null);
    setTypedQuery('');
  }

  async function handleSearch() {
    const hasSelection = selectedRegion || (levels && (levels.freguesia || levels.concelho || levels.distrito));
    if (!hasSelection) return;
    setLoading(true);
    setSearched(true);

    if (selectedRegion) {
      // Regiões do INE não têm imóveis do site associados diretamente — vai
      // sempre buscar o valor de referência oficial.
      const { data: ineData } = await supabase
        .from('ine_reference_prices')
        .select('*')
        .ilike('geo_name', selectedRegion)
        .eq('business_type', businessType === 'Arrendamento' ? 'Arrendamento' : 'Venda')
        .limit(1)
        .maybeSingle();
      setResult({ count: 0, ine: ineData || null });
      setLoading(false);
      return;
    }

    // Tenta o nível mais específico primeiro (freguesia), e se não houver imóveis
    // suficientes, alarga automaticamente para o concelho, depois para o distrito —
    // assim aparecem sempre resultados reais do site sempre que possível, em vez de
    // saltar logo para o valor do INE só porque uma freguesia tem poucos anúncios.
    const levelsToTry = [
      levels.freguesia && { column: 'parish', value: levels.freguesia, label: levels.freguesia },
      levels.concelho && { column: 'municipality', value: levels.concelho, label: levels.concelho },
      levels.distrito && { column: 'district', value: levels.distrito, label: levels.distrito },
    ].filter(Boolean);

    const MIN_RESULTS = 3;
    let bestMatch = null;

    for (const { column, value, label } of levelsToTry) {
      const { data } = await supabase
        .from('properties')
        .select('price, area, area_util')
        .eq('status', 'ativo')
        .eq('business_type', businessType)
        .eq(column, value);

      const pricesPerM2 = (data || [])
        .map((p) => {
          const area = p.area || p.area_util;
          return area > 0 ? Number(p.price) / Number(area) : null;
        })
        .filter((v) => v != null && v > 0 && Number.isFinite(v));

      if (pricesPerM2.length > 0 && (!bestMatch || pricesPerM2.length > bestMatch.pricesPerM2.length)) {
        bestMatch = { pricesPerM2, label, widened: column !== levelsToTry[0].column };
      }
      if (pricesPerM2.length >= MIN_RESULTS) {
        bestMatch = { pricesPerM2, label, widened: column !== levelsToTry[0].column };
        break;
      }
    }

    if (!bestMatch) {
      // Sem imóveis suficientes em nenhum nível — tenta um valor de referência oficial do INE.
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
      const { pricesPerM2, label, widened } = bestMatch;
      const avg = pricesPerM2.reduce((sum, v) => sum + v, 0) / pricesPerM2.length;
      const sorted = [...pricesPerM2].sort((a, b) => a - b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      setResult({ count: pricesPerM2.length, avg, min, max, widenedLabel: widened ? label : null });
    }
    setLoading(false);
  }

  const areaLabel = selectedRegion || levels?.freguesia || levels?.concelho || levels?.distrito || '';

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

      <div style={{ position: 'relative' }}>
        <LocationAutocomplete onChange={handleLocationChange} onLevels={handleLocationLevels} placeholder="Escreve uma freguesia, concelho, distrito ou região (ex: Algarve)..." />
        {matchingRegions.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 20,
            background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 6,
            boxShadow: '0 6px 18px rgba(51,46,34,0.14)',
          }}>
            {matchingRegions.map((r) => (
              <div
                key={r}
                onClick={() => pickRegion(r)}
                style={{ padding: '9px 14px', fontSize: 13.5, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
              >
                <span>{r}</span>
                <span style={{ fontSize: 10.5, color: 'var(--text-soft)' }}>região</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {selectedRegion && (
        <div style={{ marginTop: 8 }}>
          <span style={{
            fontSize: 12.5, fontWeight: 500, background: 'var(--plaster)', borderRadius: 12,
            padding: '4px 10px', cursor: 'pointer',
          }} onClick={() => setSelectedRegion(null)}>
            {selectedRegion} ✕
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={handleSearch}
        className="btn btn-primary btn-block"
        style={{ marginTop: 12 }}
        disabled={loading || (!levels && !selectedRegion)}
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
                Preço médio em {result.widenedLabel || areaLabel} ({result.count} {result.count === 1 ? 'imóvel' : 'imóveis'})
                {result.widenedLabel && (
                  <> — ainda não há imóveis suficientes só em {areaLabel}, por isso alargámos a pesquisa</>
                )}
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
