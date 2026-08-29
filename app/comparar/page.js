'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import { getCompareIds, useCompareList } from '../../lib/useCompareList';
import { displayAddress } from '../../lib/displayAddress';
import Header from '../../components/Header';

export default function CompararPage() {
  const { t } = useLanguage();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toggle, clear } = useCompareList();

  const businessLabel = (bt) => (bt === 'Arrendamento' ? t('comparar_rent') : t('comparar_sale'));
  const yesNo = (v) => (v ? t('comparar_yes') : t('comparar_no'));

  const ROWS = [
    { label: t('comparar_row_price'), get: (p) => `${Number(p.price).toLocaleString('pt-PT')} ${p.business_type === 'Arrendamento' ? t('comparar_month') : '€'}` },
    { label: t('comparar_row_business_type'), get: (p) => businessLabel(p.business_type) },
    { label: t('comparar_row_typology'), get: (p) => p.typology },
    { label: t('comparar_row_area'), get: (p) => (p.area_util ? `${p.area_util} m² (${t('prop_usable_area').toLowerCase()})` : p.area ? `${p.area} m²` : '—') },
    { label: t('comparar_row_bedrooms'), get: (p) => p.bedrooms },
    { label: t('comparar_row_bathrooms'), get: (p) => p.bathrooms },
    { label: t('comparar_row_floor'), get: (p) => p.floor || '—' },
    { label: t('comparar_row_state'), get: (p) => p.state || '—' },
    { label: t('comparar_row_energy'), get: (p) => p.energy_certificate || '—' },
    { label: t('comparar_row_year'), get: (p) => p.construction_year || '—' },
    { label: t('comparar_row_condo'), get: (p) => (p.condo_fee ? `${p.condo_fee} ${t('comparar_month')}` : '—') },
    { label: t('comparar_row_location'), get: (p) => displayAddress(p) },
    { label: t('comparar_row_storage'), get: (p) => yesNo(p.has_storage) },
    { label: t('comparar_row_parking'), get: (p) => yesNo(p.has_parking) },
    { label: t('comparar_row_balcony'), get: (p) => yesNo(p.has_balcony) },
    { label: t('comparar_row_garden'), get: (p) => yesNo(p.has_garden) },
    { label: t('comparar_row_pool'), get: (p) => yesNo(p.has_pool) },
    { label: t('comparar_row_gym'), get: (p) => yesNo(p.has_gym) },
    { label: t('comparar_row_transit'), get: (p) => yesNo(p.near_transit) },
    { label: t('comparar_row_furnished'), get: (p) => (p.is_furnished ? t('comparar_yes') : p.business_type === 'Arrendamento' ? t('comparar_no') : '—') },
    { label: t('comparar_row_pets'), get: (p) => (p.pets_allowed ? t('comparar_yes') : p.business_type === 'Arrendamento' ? t('comparar_no') : '—') },
  ];

  useEffect(() => {
    async function load() {
      const ids = getCompareIds();
      if (ids.length === 0) { setLoading(false); return; }
      const { data } = await supabase
        .from('properties')
        .select('*, property_photos(url, thumbnail_url, position)')
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
        <Link href="/favorites" className="btn no-print" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14.5, fontWeight: 600, marginBottom: 20, padding: '10px 18px' }}>
          {t('comparar_back_favorites')}
        </Link>
        <h1 className="display" style={{ fontSize: 28, marginBottom: 8 }}>{t('comparar_title')}</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 28 }} className="no-print">
          <p style={{ fontSize: 14, color: 'var(--text-soft)', margin: 0 }}>
            {t('comparar_subtitle')}
          </p>
          {properties.length >= 2 && (
            <button onClick={() => window.print()} className="btn" style={{ fontSize: 13 }}>
              {t('comparar_download_pdf')}
            </button>
          )}
        </div>

        {loading ? (
          <p>{t('comparar_loading')}</p>
        ) : properties.length < 2 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 15, color: 'var(--text-soft)', marginBottom: 16 }}>
              {t('comparar_need_2')}
            </p>
            <Link href="/results" className="btn btn-primary">{t('comparar_view_results')}</Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 12px', minWidth: 160 }}></th>
                  {properties.map((p) => {
                    const photoSorted = p.property_photos?.sort((a, b) => a.position - b.position)[0];
                    const photo = photoSorted?.thumbnail_url || photoSorted?.url;
                    return (
                      <th key={p.id} style={{ padding: '10px 12px', minWidth: 220, verticalAlign: 'top' }}>
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => removeFromCompare(p.id)}
                            aria-label={t('attr_remove_compare')}
                            className="no-print"
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
