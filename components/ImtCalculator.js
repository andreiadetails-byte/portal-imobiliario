'use client';

import { useState } from 'react';
import { useLanguage } from '../lib/i18n';

// Tabela IMT 2026 — Continente, Habitação Própria e Permanente
// Fonte: tabelas práticas da Autoridade Tributária (Ofício Circulado 40129/2026)
const ESCALOES_HPP = [
  { limite: 106346, taxa: 0, abater: 0 },
  { limite: 145470, taxa: 0.02, abater: 2126.92 },
  { limite: 198347, taxa: 0.05, abater: 6491.02 },
  { limite: 330539, taxa: 0.07, abater: 10457.96 },
  { limite: 660982, taxa: 0.08, abater: 13763.35 },
  { limite: 1150853, taxa: 0.06, abater: 0 }, // taxa única, sem parcela a abater
  { limite: Infinity, taxa: 0.075, abater: 0 }, // taxa única, sem parcela a abater
];

// Tabela IMT 2026 — Continente, Habitação Secundária (não HPP)
// Mesmos escalões da tabela HPP, mas sem isenção no 1º escalão (1% em vez de 0%).
const ESCALOES_SECUNDARIA = [
  { limite: 106346, taxa: 0.01, abater: 0 },
  { limite: 145470, taxa: 0.02, abater: 1063.46 },
  { limite: 198347, taxa: 0.05, abater: 5427.56 },
  { limite: 330539, taxa: 0.07, abater: 9394.50 },
  { limite: 660982, taxa: 0.08, abater: 12699.89 },
  { limite: 1150853, taxa: 0.06, abater: 0 },
  { limite: Infinity, taxa: 0.075, abater: 0 },
];

const LIMITE_JOVEM_TOTAL = 330539;
const LIMITE_JOVEM_PARCIAL = 660982;

function calcularIMT(valor, escaloes = ESCALOES_HPP) {
  const escalao = escaloes.find((e) => valor <= e.limite);
  return Math.max(0, valor * escalao.taxa - escalao.abater);
}

function PillGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 600, borderRadius: 5, cursor: 'pointer',
            border: value === opt.value ? '1.5px solid var(--telha)' : '1px solid var(--line)',
            background: value === opt.value ? 'rgba(126,143,106,0.12)' : 'var(--paper)',
            color: value === opt.value ? 'var(--telha)' : 'var(--text-soft)',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function ImtCalculator({ price, showTitle }) {
  const { t } = useLanguage();
  const [value, setValue] = useState(price);
  const [isResident, setIsResident] = useState('Sim');
  const [finalidade, setFinalidade] = useState('Própria e permanente');
  const [under35, setUnder35] = useState('Não');
  const [firstHome, setFirstHome] = useState('Sim');

  const isHPP = finalidade === 'Própria e permanente';
  const isJovemElegivel = isResident === 'Sim' && isHPP && under35 === 'Sim' && firstHome === 'Sim';

  let imt;
  let selo;

  if (isResident === 'Não') {
    // Decreto-Lei n.º 97/2026 — taxa fixa de 7,5% para não residentes fiscais (desde 25/05/2026)
    imt = value * 0.075;
    selo = value * 0.008;
  } else if (isJovemElegivel) {
    if (value <= LIMITE_JOVEM_TOTAL) {
      imt = 0;
      selo = 0;
    } else if (value <= LIMITE_JOVEM_PARCIAL) {
      const excedente = value - LIMITE_JOVEM_TOTAL;
      imt = excedente * 0.08;
      selo = excedente * 0.008;
    } else {
      imt = calcularIMT(value, ESCALOES_HPP);
      selo = value * 0.008;
    }
  } else {
    imt = calcularIMT(value, isHPP ? ESCALOES_HPP : ESCALOES_SECUNDARIA);
    selo = value * 0.008;
  }

  const total = imt + selo;

  return (
    <div className="card" style={{ padding: 22, marginTop: 8 }}>
      {showTitle && (
        <>
          <h1 className="display" style={{ fontSize: 28, marginBottom: 8 }}>{t('imt_page_title')}</h1>
          <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 20 }}>
            {t('imt_page_subtitle')}
          </p>
        </>
      )}
      <h3 className="display" style={{ fontSize: 18, marginBottom: 4 }}>{t('imt_calc_title')}</h3>
      <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 20 }}>
        {t('imt_disclaimer')}
      </p>

      <div className="field">
        <label>{t('imt_property_value')}</label>
        <div style={{ position: 'relative' }}>
          <input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} style={{ paddingRight: 30 }} />
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-soft)' }}>€</span>
        </div>
      </div>

      <div className="field">
        <label>{t('imt_purpose')}</label>
        <PillGroup
          value={finalidade}
          onChange={setFinalidade}
          options={[{ value: 'Própria e permanente', label: t('imt_primary_home') }, { value: 'Secundária', label: t('imt_secondary_home') }]}
        />
      </div>

      <div className="field">
        <label>{t('imt_is_resident')}</label>
        <PillGroup value={isResident} onChange={setIsResident} options={[{ value: 'Sim', label: t('imt_yes') }, { value: 'Não', label: t('imt_no') }]} />
      </div>

      {isResident === 'Não' ? (
        <p style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 12 }}>
          {t('imt_nonresident_note')}
        </p>
      ) : !isHPP ? (
        <p style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 12 }}>
          {t('imt_secondary_note')}
        </p>
      ) : (
        <>
          <div className="field">
            <label>{t('imt_under35')}</label>
            <PillGroup value={under35} onChange={setUnder35} options={[{ value: 'Sim', label: t('imt_yes') }, { value: 'Não', label: t('imt_no') }]} />
          </div>

          {under35 === 'Sim' && (
            <div className="field">
              <label>{t('imt_first_home')}</label>
              <PillGroup value={firstHome} onChange={setFirstHome} options={[{ value: 'Sim', label: t('imt_yes') }, { value: 'Não', label: t('imt_no') }]} />
            </div>
          )}

          {isJovemElegivel && value <= LIMITE_JOVEM_TOTAL && (
            <p style={{ fontSize: 12, color: 'var(--telha)', marginBottom: 12 }}>
              ✓ Com o regime "IMT Jovem", este imóvel fica isento de IMT e de Imposto do Selo.
            </p>
          )}
        </>
      )}

      <div style={{ background: 'var(--plaster)', borderRadius: 8, padding: 16, display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 6 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>IMT</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{imt.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>{t('imt_stamp_duty')}</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{selo.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>{t('imt_total_before_deed')}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--telha)', fontFamily: 'Inter, sans-serif' }}>
            {total.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €
          </div>
        </div>
      </div>
    </div>
  );
}
