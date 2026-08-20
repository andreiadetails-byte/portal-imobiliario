'use client';

import Header from '../../components/Header';
import RentVsBuyCalculator from '../../components/RentVsBuyCalculator';

export default function SimuladorArrendarComprarPage() {
  return (
    <>
      <Header />
      <div className="wrap" style={{ maxWidth: 620, padding: '48px 32px 80px' }}>
        <h1 className="display" style={{ fontSize: 28, marginBottom: 8 }}>Arrendar ou comprar?</h1>
        <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 8 }}>
          Compare o custo real de comprar com o de arrendar, ao longo do tempo que pretende ficar no imóvel.
        </p>
        <RentVsBuyCalculator price={200000} />
      </div>
    </>
  );
}
