'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

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

export default function MortgageSimulator({ price }) {
  const [mode, setMode] = useState('prestacao'); // 'prestacao' ou 'quanto'

  const [propertyPrice, setPropertyPrice] = useState(price);
  const [monthlyBudget, setMonthlyBudget] = useState(700);
  const [downPaymentPct, setDownPaymentPct] = useState(10);
  const [years, setYears] = useState(35);
  const [rateType, setRateType] = useState('Fixa');
  const [rate, setRate] = useState(3.5);
  const [houseType, setHouseType] = useState('Principal');
  const [under35, setUnder35] = useState('Sim');
  const [rateUpdatedAt, setRateUpdatedAt] = useState(null);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    supabase.from('settings').select('mortgage_rate, updated_at').eq('id', 1).single().then(({ data }) => {
      if (data) {
        setRate(Number(data.mortgage_rate));
        setRateUpdatedAt(data.updated_at);
      }
    });
  }, []);

  function handleCalculate() {
    const monthlyRate = rate / 100 / 12;
    const months = years * 12;

    // Modo "prestação": preço → prestação mensal
    const loanAmount = propertyPrice * (1 - downPaymentPct / 100);
    const monthlyPayment = monthlyRate === 0
      ? loanAmount / months
      : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);

    // Modo "quanto posso pedir": prestação mensal → preço máximo
    const maxLoan = monthlyRate === 0
      ? monthlyBudget * months
      : (monthlyBudget * (Math.pow(1 + monthlyRate, months) - 1)) / (monthlyRate * Math.pow(1 + monthlyRate, months));
    const maxPropertyPrice = maxLoan / (1 - downPaymentPct / 100);

    setResult({ loanAmount, monthlyPayment, maxLoan, maxPropertyPrice });
    setHasCalculated(true);
  }

  // Se mudar de modo (prestação ↔ quanto posso pedir), esconde o resultado antigo, já que já não corresponde.
  function handleModeChange(newMode) {
    setMode(newMode);
    setHasCalculated(false);
  }

  return (
    <div className="card" style={{ padding: 22, marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
        <h3 className="display" style={{ fontSize: 18 }}>Simulador de crédito habitação</h3>
        <button
          type="button"
          onClick={() => handleModeChange(mode === 'prestacao' ? 'quanto' : 'prestacao')}
          style={{ background: 'none', border: 'none', color: 'var(--telha)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
        >
          {mode === 'prestacao' ? 'Calcular o valor que posso gastar' : '← Simular a prestação deste imóvel'}
        </button>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 20 }}>
        Cálculo indicativo, não vinculativo. Consulte o seu banco para uma simulação real.
        {rateUpdatedAt && ` Taxa de referência atualizada em ${new Date(rateUpdatedAt).toLocaleDateString('pt-PT')}.`}
      </p>

      {mode === 'prestacao' ? (
        <div className="field">
          <label>Preço do imóvel</label>
          <div style={{ position: 'relative' }}>
            <input type="number" value={propertyPrice} onChange={(e) => setPropertyPrice(Number(e.target.value))} style={{ paddingRight: 30 }} />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-soft)' }}>€</span>
          </div>
        </div>
      ) : (
        <div className="field">
          <label>Quanto pode pagar por mês</label>
          <div style={{ position: 'relative' }}>
            <input type="number" value={monthlyBudget} onChange={(e) => setMonthlyBudget(Number(e.target.value))} style={{ paddingRight: 50 }} />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-soft)' }}>€/mês</span>
          </div>
        </div>
      )}

      <div className="field">
        <label>Entrada inicial (%)</label>
        <input type="number" value={downPaymentPct} onChange={(e) => setDownPaymentPct(Number(e.target.value))} min={0} max={100} />
        <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 6 }}>
          Os bancos normalmente pedem uma entrada mínima de 10%, mais despesas associadas.
        </p>
      </div>

      <div className="field">
        <label>Prazo em anos</label>
        <input type="number" value={years} onChange={(e) => setYears(Number(e.target.value))} min={1} max={40} />
      </div>

      <div className="field">
        <label>Tipo de taxa de juro</label>
        <PillGroup
          value={rateType}
          onChange={setRateType}
          options={[{ value: 'Fixa', label: 'Fixa' }, { value: 'Variável', label: 'Variável' }]}
        />
      </div>

      <div className="field">
        <label>Taxa de juro anual (%)</label>
        <input type="number" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))} min={0} />
      </div>

      <div className="field">
        <label>Tipo de casa</label>
        <PillGroup
          value={houseType}
          onChange={setHouseType}
          options={[{ value: 'Principal', label: 'Principal' }, { value: 'Secundária', label: 'Secundária' }]}
        />
      </div>

      <div className="field">
        <label>Tens 35 anos ou menos?</label>
        <PillGroup
          value={under35}
          onChange={setUnder35}
          options={[{ value: 'Sim', label: 'Sim' }, { value: 'Não', label: 'Não' }]}
        />
        {under35 === 'Sim' && houseType === 'Principal' && (
          <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 6 }}>
            Pode ter direito a benefícios fiscais para jovens na compra de primeira habitação própria. Confirme as condições atuais com o seu banco ou nas Finanças.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleCalculate}
        className="btn btn-primary btn-block"
        style={{ marginTop: 4, marginBottom: hasCalculated ? 16 : 0 }}
      >
        Calcular
      </button>

      {hasCalculated && result && (
        mode === 'prestacao' ? (
          <div style={{ background: 'var(--plaster)', borderRadius: 8, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>Montante financiado</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{result.loanAmount.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>Prestação mensal estimada</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--telha)', fontFamily: 'Inter, sans-serif' }}>
                {result.monthlyPayment.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €/mês
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--plaster)', borderRadius: 8, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>Montante máximo de crédito</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{result.maxLoan.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>Preço máximo do imóvel</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--telha)', fontFamily: 'Inter, sans-serif' }}>
                {result.maxPropertyPrice.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
