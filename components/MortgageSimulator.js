'use client';

import { useState } from 'react';

export default function MortgageSimulator({ price }) {
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [rate, setRate] = useState(3.5);
  const [years, setYears] = useState(30);

  const loanAmount = price * (1 - downPaymentPct / 100);
  const monthlyRate = rate / 100 / 12;
  const months = years * 12;
  const monthlyPayment = monthlyRate === 0
    ? loanAmount / months
    : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);

  return (
    <div className="card" style={{ padding: 20, marginTop: 8 }}>
      <h3 className="display" style={{ fontSize: 17, marginBottom: 4 }}>Simular crédito habitação</h3>
      <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 16 }}>
        Cálculo indicativo, não vinculativo. Consulte o seu banco para uma simulação real.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Entrada inicial (%)</label>
          <input type="number" value={downPaymentPct} onChange={(e) => setDownPaymentPct(Number(e.target.value))} min={0} max={100} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Taxa de juro anual (%)</label>
          <input type="number" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))} min={0} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Prazo (anos)</label>
          <input type="number" value={years} onChange={(e) => setYears(Number(e.target.value))} min={1} max={40} />
        </div>
      </div>

      <div style={{ background: 'var(--plaster)', borderRadius: 8, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>Montante financiado</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{loanAmount.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>Prestação mensal estimada</div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: 'var(--telha)' }}>
            {monthlyPayment.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €/mês
          </div>
        </div>
      </div>
    </div>
  );
}
