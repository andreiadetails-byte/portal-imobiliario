'use client';

import { useState } from 'react';
import { useLanguage } from '../lib/i18n';

// As duas tabelas de IMT — a pessoa escolhe qual se aplica ao imóvel que está a comprar.
const ESCALOES_HPP = [
  { limite: 106346, taxa: 0, abater: 0 },
  { limite: 145470, taxa: 0.02, abater: 2126.92 },
  { limite: 198347, taxa: 0.05, abater: 6491.02 },
  { limite: 330539, taxa: 0.07, abater: 10457.96 },
  { limite: 660982, taxa: 0.08, abater: 13763.35 },
  { limite: 1150853, taxa: 0.06, abater: 0 },
  { limite: Infinity, taxa: 0.075, abater: 0 },
];

const ESCALOES_SECUNDARIA = [
  { limite: 106346, taxa: 0.01, abater: 0 },
  { limite: 145470, taxa: 0.02, abater: 1063.46 },
  { limite: 198347, taxa: 0.05, abater: 5427.56 },
  { limite: 330539, taxa: 0.07, abater: 9394.50 },
  { limite: 660982, taxa: 0.08, abater: 12699.89 },
  { limite: 1150853, taxa: 0.06, abater: 0 },
  { limite: Infinity, taxa: 0.075, abater: 0 },
];

function calcularIMT(valor, isHPP) {
  const escaloes = isHPP ? ESCALOES_HPP : ESCALOES_SECUNDARIA;
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

function EuroField({ label, value, onChange, hint }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ position: 'relative' }}>
        <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ paddingRight: 30 }} min={0} />
        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-soft)' }}>€</span>
      </div>
      {hint && <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

export default function InvestmentProfitCalculator({ showTitle }) {
  const { t } = useLanguage();
  const [investorType, setInvestorType] = useState('Particular');
  const [homeType, setHomeType] = useState('Secundária');
  const [purchasePrice, setPurchasePrice] = useState(200000);
  const [resalePrice, setResalePrice] = useState(260000);

  const [financed, setFinanced] = useState('Não');
  const [loanAmount, setLoanAmount] = useState(160000);

  const [notaryFees, setNotaryFees] = useState(1200);
  const [bankValuation, setBankValuation] = useState(300);
  const [renovationCosts, setRenovationCosts] = useState(15000);

  const [commissionPct, setCommissionPct] = useState(5);

  const [irsRate, setIrsRate] = useState(35);

  const [hasCalculated, setHasCalculated] = useState(false);

  const imt = calcularIMT(purchasePrice, homeType === 'Própria e permanente');
  const stampDutyPurchase = purchasePrice * 0.008;
  const stampDutyLoan = financed === 'Sim' ? loanAmount * 0.006 : 0;

  const totalAcquisitionCosts = imt + stampDutyPurchase + stampDutyLoan + notaryFees
    + (financed === 'Sim' ? bankValuation : 0) + renovationCosts;

  const commissionValue = resalePrice * (commissionPct / 100);
  const totalResaleCosts = commissionValue;

  const grossProfit = resalePrice - purchasePrice - totalAcquisitionCosts - totalResaleCosts;

  // Mais-valia tributável: estimativa simplificada = lucro bruto (a lei real prevê
  // coeficientes de desvalorização da moeda e regras específicas — isto é só uma
  // aproximação para teres uma ideia, não uma declaração fiscal).
  const taxableGain = Math.max(0, grossProfit);
  const taxDue = investorType === 'Particular'
    ? taxableGain * 0.5 * (irsRate / 100)
    : taxableGain * 0.21; // taxa geral de IRC no Continente, sem derramas

  const netProfit = grossProfit - taxDue;

  return (
    <div className="card" style={{ padding: 22, marginTop: 8 }}>
      {showTitle && (
        <>
          <h1 className="display" style={{ fontSize: 28, marginBottom: 8 }}>{t('invest_page_title')}</h1>
          <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 20 }}>{t('invest_page_subtitle')}</p>
        </>
      )}
      <h3 className="display" style={{ fontSize: 18, marginBottom: 4 }}>{t('invest_title')}</h3>
      <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 20 }}>
        {t('invest_disclaimer')}
      </p>

      <div className="field">
        <label>{t('invest_as')}</label>
        <PillGroup
          value={investorType}
          onChange={setInvestorType}
          options={[{ value: 'Particular', label: t('invest_individual_irs') }, { value: 'Empresa', label: t('invest_company_irc') }]}
        />
      </div>

      <EuroField label={t('invest_purchase_value')} value={purchasePrice} onChange={setPurchasePrice} />

      <div className="field">
        <label>{t('invest_acquired_as')}</label>
        <PillGroup
          value={homeType}
          onChange={setHomeType}
          options={[{ value: 'Secundária', label: t('invest_secondary_home') }, { value: 'Própria e permanente', label: t('invest_primary_home') }]}
        />
        <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 4 }}>
          {t('invest_imt_note')}
        </p>
      </div>

      <EuroField label={t('invest_resale_value')} value={resalePrice} onChange={setResalePrice} />

      <div className="field">
        <label>{t('invest_had_financing')}</label>
        <PillGroup value={financed} onChange={setFinanced} options={[{ value: 'Sim', label: t('invest_yes') }, { value: 'Não', label: t('invest_no') }]} />
      </div>
      {financed === 'Sim' && (
        <EuroField label={t('invest_loan_amount')} value={loanAmount} onChange={setLoanAmount} />
      )}

      <h4 style={{ fontSize: 14, fontWeight: 600, marginTop: 20, marginBottom: 4 }}>{t('invest_acquisition_expenses')}</h4>

      <div style={{ background: 'var(--plaster)', borderRadius: 8, padding: 14, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span>{t('invest_imt_auto')}</span><b>{imt.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €</b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span>{t('invest_stamp_purchase')}</span><b>{stampDutyPurchase.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €</b>
        </div>
        {financed === 'Sim' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span>{t('invest_stamp_loan')}</span><b>{stampDutyLoan.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €</b>
          </div>
        )}
      </div>

      <EuroField label={t('invest_notary_fees')} value={notaryFees} onChange={setNotaryFees} />
      {financed === 'Sim' && (
        <EuroField label={t('invest_bank_valuation')} value={bankValuation} onChange={setBankValuation} />
      )}
      <EuroField label={t('invest_renovation_costs')} value={renovationCosts} onChange={setRenovationCosts} hint={t('invest_keep_invoices_hint')} />

      <h4 style={{ fontSize: 14, fontWeight: 600, marginTop: 20, marginBottom: 4 }}>{t('invest_resale_expenses')}</h4>

      <div className="field">
        <label>{t('invest_agent_commission')}</label>
        <input type="number" step="0.1" value={commissionPct} onChange={(e) => setCommissionPct(Number(e.target.value))} min={0} max={20} />
        <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 4 }}>
          = {commissionValue.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} € {t('invest_over_resale_value')}
        </p>
      </div>

      {investorType === 'Particular' && (
        <div className="field">
          <label>{t('invest_irs_bracket')}</label>
          <input type="number" step="0.5" value={irsRate} onChange={(e) => setIrsRate(Number(e.target.value))} min={0} max={48} />
          <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 4 }}>
            {t('invest_irs_bracket_hint')}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setHasCalculated(true)}
        className="btn btn-primary btn-block"
        style={{ marginTop: 4, marginBottom: hasCalculated ? 16 : 0 }}
      >
        {t('invest_calculate_btn')}
      </button>

      {hasCalculated && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: 'var(--plaster)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 4 }}>{t('invest_gross_profit')}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: grossProfit >= 0 ? 'var(--telha)' : '#8a3b2a', fontFamily: 'Inter, sans-serif' }}>
              {grossProfit.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €
            </div>
          </div>

          <div style={{ background: 'var(--plaster)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 4 }}>
              {t('invest_capital_gains_tax')} ({investorType === 'Particular' ? `${t('invest_irs_taxable')} ${irsRate}%` : 'IRC, 21%'})
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#8a3b2a', fontFamily: 'Inter, sans-serif' }}>
              − {taxDue.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €
            </div>
          </div>

          <div style={{ background: 'rgba(126,143,106,0.14)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 4 }}>{t('invest_net_profit')}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: netProfit >= 0 ? 'var(--telha)' : '#8a3b2a', fontFamily: 'Inter, sans-serif' }}>
              {netProfit.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €
            </div>
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-soft)' }}>
            O cálculo da mais-valia real pode ainda considerar o coeficiente de desvalorização da moeda (para imóveis detidos há mais tempo) e outras despesas comprovadas. Fale com um contabilista antes de decidir.
          </p>
        </div>
      )}
    </div>
  );
}
