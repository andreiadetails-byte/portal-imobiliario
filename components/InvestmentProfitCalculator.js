'use client';

import { useState } from 'react';

// Reutiliza a mesma tabela de IMT da calculadora de IMT (habitação secundária,
// já que um imóvel comprado para revender não costuma ser habitação própria).
const ESCALOES_SECUNDARIA = [
  { limite: 106346, taxa: 0.01, abater: 0 },
  { limite: 145470, taxa: 0.02, abater: 1063.46 },
  { limite: 198347, taxa: 0.05, abater: 5427.56 },
  { limite: 330539, taxa: 0.07, abater: 9394.50 },
  { limite: 660982, taxa: 0.08, abater: 12699.89 },
  { limite: 1150853, taxa: 0.06, abater: 0 },
  { limite: Infinity, taxa: 0.075, abater: 0 },
];

function calcularIMT(valor) {
  const escalao = ESCALOES_SECUNDARIA.find((e) => valor <= e.limite);
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

export default function InvestmentProfitCalculator() {
  const [investorType, setInvestorType] = useState('Particular');
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

  const imt = calcularIMT(purchasePrice);
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
      <h3 className="display" style={{ fontSize: 18, marginBottom: 4 }}>Calculadora de lucro em investimento imobiliário</h3>
      <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 20 }}>
        Estimativa indicativa, para o Continente. Não substitui o aconselhamento de um contabilista — as regras fiscais de mais-valias têm mais particularidades do que esta calculadora consegue cobrir.
      </p>

      <div className="field">
        <label>Vai investir como</label>
        <PillGroup
          value={investorType}
          onChange={setInvestorType}
          options={[{ value: 'Particular', label: 'Particular (IRS)' }, { value: 'Empresa', label: 'Empresa (IRC)' }]}
        />
      </div>

      <EuroField label="Valor do imóvel adquirido" value={purchasePrice} onChange={setPurchasePrice} />
      <EuroField label="Valor de revenda do imóvel" value={resalePrice} onChange={setResalePrice} />

      <div className="field">
        <label>Vai financiar a compra com crédito?</label>
        <PillGroup value={financed} onChange={setFinanced} options={[{ value: 'Sim', label: 'Sim' }, { value: 'Não', label: 'Não' }]} />
      </div>
      {financed === 'Sim' && (
        <EuroField label="Valor do crédito" value={loanAmount} onChange={setLoanAmount} />
      )}

      <h4 style={{ fontSize: 14, fontWeight: 600, marginTop: 20, marginBottom: 4 }}>Despesas de aquisição</h4>

      <div style={{ background: 'var(--plaster)', borderRadius: 8, padding: 14, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span>IMT (calculado automaticamente)</span><b>{imt.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €</b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span>Imposto do Selo — compra (0,8%)</span><b>{stampDutyPurchase.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €</b>
        </div>
        {financed === 'Sim' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span>Imposto do Selo — crédito habitação (0,6%)</span><b>{stampDutyLoan.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €</b>
          </div>
        )}
      </div>

      <EuroField label="Registos notariais e escritura" value={notaryFees} onChange={setNotaryFees} />
      {financed === 'Sim' && (
        <EuroField label="Avaliação bancária" value={bankValuation} onChange={setBankValuation} />
      )}
      <EuroField label="Obras no imóvel" value={renovationCosts} onChange={setRenovationCosts} hint="Guarde as faturas — obras com fatura podem reduzir a mais-valia tributável." />

      <h4 style={{ fontSize: 14, fontWeight: 600, marginTop: 20, marginBottom: 4 }}>Despesas de revenda</h4>

      <div className="field">
        <label>Comissão imobiliária (%)</label>
        <input type="number" step="0.1" value={commissionPct} onChange={(e) => setCommissionPct(Number(e.target.value))} min={0} max={20} />
        <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 4 }}>
          = {commissionValue.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} € sobre o valor de revenda
        </p>
      </div>

      {investorType === 'Particular' && (
        <div className="field">
          <label>Taxa de IRS aplicável ao teu escalão (%)</label>
          <input type="number" step="0.5" value={irsRate} onChange={(e) => setIrsRate(Number(e.target.value))} min={0} max={48} />
          <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 4 }}>
            Depende do total dos teus rendimentos no ano — os escalões de IRS vão de 14,5% a 48%. Se não tiveres a certeza, usa a tua taxa de IRS do último ano, ou pergunta ao teu contabilista.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setHasCalculated(true)}
        className="btn btn-primary btn-block"
        style={{ marginTop: 4, marginBottom: hasCalculated ? 16 : 0 }}
      >
        Calcular lucro
      </button>

      {hasCalculated && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: 'var(--plaster)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 4 }}>Lucro bruto (antes de impostos)</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: grossProfit >= 0 ? 'var(--telha)' : '#8a3b2a', fontFamily: 'Inter, sans-serif' }}>
              {grossProfit.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €
            </div>
          </div>

          <div style={{ background: 'var(--plaster)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 4 }}>
              Imposto sobre a mais-valia ({investorType === 'Particular' ? `IRS, 50% tributável a ${irsRate}%` : 'IRC, 21%'})
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#8a3b2a', fontFamily: 'Inter, sans-serif' }}>
              − {taxDue.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €
            </div>
          </div>

          <div style={{ background: 'rgba(126,143,106,0.14)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 4 }}>Lucro líquido final (depois de impostos)</div>
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
