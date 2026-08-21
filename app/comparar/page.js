'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { getCompareIds, useCompareList } from '../../lib/useCompareList';
import { displayAddress } from '../../lib/displayAddress';
import Header from '../../components/Header';

const ROWS = [
  { label: 'Preço', get: (p) => `${Number(p.price).toLocaleString('pt-PT')} ${p.business_type === 'Arrendamento' ? '€/mês' : '€'}` },
  { label: 'Tipo de negócio', get: (p) => p.business_type },
  { label: 'Tipologia', get: (p) => p.typology },
  { label: 'Área', get: (p) => `${p.area || p.area_util || '—'} m²` },
  { label: 'Quartos', get: (p) => p.bedrooms },
  { label: 'Casas de banho', get: (p) => p.bathrooms },
  { label: 'Andar', get: (p) => p.floor || '—' },
  { label: 'Estado', get: (p) => p.state || '—' },
  { label: 'Certificado energético', get: (p) => p.energy_certificate || '—' },
  { label: 'Condomínio', get: (p) => (p.condo_fee ? `${p.condo_fee} €/mês` : '—') },
  { label: 'Localização', get: (p) => displayAddress(p) },
  { label: 'Arrumos', get: (p) => (p.has_storage ? 'Sim' : 'Não') },
  { label: 'Estacionamento', get: (p) => (p.has_parking ? 'Sim' : 'Não') },
  { label: 'Varanda', get: (p) => (p.has_balcony ? 'Sim' : 'Não') },
  { label: 'Jardim', get: (p) => (p.has_garden ? 'Sim' : 'Não') },
  { label: 'Piscina', get: (p) => (p.has_pool ? 'Sim' : 'Não') },
  { label: 'Ginásio', get: (p) => (p.has_gym ? 'Sim' : 'Não') },
  { label: 'Perto de transportes', get: (p) => (p.near_transit ? 'Sim' : 'Não') },
  { label: 'Mobilado', get: (p) => (p.is_furnished ? 'Sim' : p.business_type === 'Arrendamento' ? 'Não' : '—') },
  { label: 'Aceita animais', get: (p) => (p.pets_allowed ? 'Sim' : p.business_type === 'Arrendamento' ? 'Não' : '—') },
];

export default function CompararPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toggle, clear } = useCompareList();

  useEffect(() => {
    async function load() {
      const ids = getCompareIds();
      if (ids.length === 0) { setLoading(false); return; }
      const { data } = await supabase
        .from('properties')
        .select('*, property_photos(url, position)')
        .in('id', ids);
      // Mantém a ordem em que foram selecionados.
      const ordered = ids.map((id) => (data || []).find((p) => p.id === id)).filter(Boolean);
      setProperties(ordered);
      setLoading(false);
    }
    load();

    // Ao sair desta página (voltar atrás, ou ir para outro sítio do site), a
    // seleção de comparação limpa-se sozinha — evita ficar sempre com "2 imóveis
    // em comparação" marcado, mesmo depois de já ter comparado e seguido em frente.
    return () => clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function removeFromCompare(id) {
    toggle(id);
    setProperties((cur) => cur.filter((p) => p.id !== id));
  }

  return (
    <>
      <Header />
      <main id="main-content" className="wrap" style={{ maxWidth: 1180, padding: '48px 32px 100px' }}>
        <Link href="/favorites" className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14.5, fontWeight: 600, marginBottom: 20, padding: '10px 18px' }}>
          ← Voltar aos favoritos
        </Link>
        <h1 className="display" style={{ fontSize: 28, marginBottom: 8 }}>Comparar imóveis</h1>
        <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 28 }}>
          Veja lado a lado as diferenças entre os imóveis que selecionou.
        </p>

        {loading ? (
          <p>A carregar...</p>
        ) : properties.length < 2 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 15, color: 'var(--text-soft)', marginBottom: 16 }}>
              Precisa de pelo menos 2 imóveis selecionados para comparar. Volte aos resultados e marque a caixa &quot;Comparar&quot; em pelo menos dois anúncios.
            </p>
            <Link href="/results" className="btn btn-primary">Ver resultados</Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 12px', minWidth: 160 }}></th>
                  {properties.map((p) => {
                    const photo = p.property_photos?.sort((a, b) => a.position - b.position)[0]?.url;
                    return (
                      <th key={p.id} style={{ padding: '10px 12px', minWidth: 220, verticalAlign: 'top' }}>
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => removeFromCompare(p.id)}
                            aria-label="Remover da comparação"
                            style={{
                              position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%',
                              background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', fontSize: 13, zIndex: 1,
                            }}
                          >
                            ✕
                          </button>
                          <Link href={`/property/${p.id}`}>
                            {photo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={photo} alt={`Foto do imóvel ${p.typology}`} loading="lazy" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8 }} />
                            ) : (
                              <div style={{ width: '100%', height: 140, borderRadius: 8, background: 'linear-gradient(135deg, var(--azulejo), #4A5A3C)' }} />
                            )}
                          </Link>
                        </div>
                        <Link href={`/property/${p.id}`} style={{ display: 'block', marginTop: 8, fontWeight: 600, fontSize: 14 }}>
                          {p.typology} · {p.district}
                        </Link>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, i) => (
                  <tr key={row.label} style={{ background: i % 2 === 0 ? 'var(--plaster)' : 'transparent' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, color: 'var(--text-soft)' }}>{row.label}</td>
                    {properties.map((p) => (
                      <td key={p.id} style={{ padding: '10px 12px', fontSize: 13.5, textAlign: 'center' }}>{row.get(p)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
