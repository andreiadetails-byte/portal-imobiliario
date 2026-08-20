'use client';

import Header from '../../components/Header';
import InvestmentProfitCalculator from '../../components/InvestmentProfitCalculator';

export default function SimuladorInvestimentoPage() {
  return (
    <>
      <Header />
      <div className="wrap" style={{ maxWidth: 560, padding: '48px 32px 80px' }}>
        <h1 className="display" style={{ fontSize: 28, marginBottom: 8 }}>Quanto vou lucrar com este investimento?</h1>
        <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 8 }}>
          Calcule o lucro esperado ao comprar e revender um imóvel, incluindo despesas de compra, venda, e o imposto sobre a mais-valia — como particular ou como empresa.
        </p>
        <InvestmentProfitCalculator />
      </div>
    </>
  );
}
