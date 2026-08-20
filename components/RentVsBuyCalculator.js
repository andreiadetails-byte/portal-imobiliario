'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function RentVsBuyCalculator({ price = 200000 }) {
  const [purchasePrice, setPurchasePrice] = useState(price);
  const [downPaymentPct, setDownPaymentPct] = useState(10);
  const [years, setYears] = useState(30);
  const [rate, setRate] = useState(3.5);
  const [monthlyRent, setMonthlyRent] = useState(Math.round(price * 0.004));
  const [horizon, setHorizon] = useState(10);

  useEffect(() => {
    supabase.from('settings').select('mortgage_rate').eq('id', 1).single().then(({ data }) => {
      if (data?.mortgage_rate) setRate(data.mortgage_rate);
    });
  }, []);

  const downPayment = purchasePrice * (downPaymentPct / 100);
  const loanAmount = purchasePrice - downPayment;
  const monthlyRate = rate / 100 / 12;
  const numPayments = years * 12;
  const monthlyInstallment = monthlyRate > 0
    ? (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numPayments))
    : loanAmount / numPayments;

  // IMT + Imposto do Selo (estimativa simplificada, escalão HPP mais comum)
  const imtEstimate = Math.max(0, purchasePrice * 0.06 - purchasePrice * 0.03);
  const seloEstimate = purchasePrice * 0.008;

  const monthsInHorizon = Math.min(horizon, years) * 12;
  const totalInterestPaid = (monthlyInstallment * monthsInHorizon) - (loanAmount * (monthsInHorizon / numPayments));
  const maintenanceEstimate = purchasePrice * 0.01 * horizon; // ~1% ao ano

  const netCostBuying = imtEstimate + seloEstimate + Math.max(0, totalInterestPaid) + maintenanceEstimate;

  // Renda com aumento anual estimado de 2%
  let netCostRenting = 0;
  let rentThisYear = monthlyRent * 12;
  for (let y = 0; y < horizon; y++) {
    netCostRenting += rentThisYear;
    rentThisYear *= 1.02;
  }

  const buyingIsBetter = netCostBuying < netCostRenting;
  const difference = Math.abs(netCostBuying - netCostRenting);

  return (
    <div className="card" style={{ padding: 22, marginTop: 8 }}>
      <h3 className="display" style={{ fontSize: 18, marginBottom: 4 }}>Arrendar ou comprar — o que compensa mais?</h3>
      <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 20 }}>
        Estimativa simplificada. Considera juros, IMT, Selo e manutenção do lado da compra; renda com aumento anual do lado do arrendamento — sem contar a valorização do imóvel.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="field">
          <label>Preço do imóvel</label>
          <input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Renda mensal equivalente</label>
          <input type="number" value={monthlyRent} onChange={(e) => setMonthlyRent(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Entrada (%)</label>
          <input type="number" value={downPaymentPct} onChange={(e) => setDownPaymentPct(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Prazo do crédito (anos)</label>
          <input type="number" value={years} onChange={(e) => setYears(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Taxa de juro (%)</label>
          <input type="number" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Quantos anos vais ficar?</label>
          <input type="number" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} />
        </div>
      </div>

      <div style={{ background: 'var(--plaster)', borderRadius: 8, padding: 18, marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13.5 }}>Custo estimado a comprar, em {horizon} anos</span>
          <b style={{ fontSize: 14 }}>{netCostBuying.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €</b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 13.5 }}>Custo estimado a arrendar, em {horizon} anos</span>
          <b style={{ fontSize: 14 }}>{netCostRenting.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €</b>
        </div>
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--telha)' }}>
            {buyingIsBetter ? '🏠 Comprar' : '🔑 Arrendar'} compensa mais — poupas cerca de{' '}
            {difference.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} € em {horizon} anos
          </span>
        </div>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 12 }}>
        Não conta com valorização do imóvel — se a casa valorizar, comprar tende a compensar ainda mais. Não substitui aconselhamento financeiro profissional.
      </p>
    </div>
  );
}
