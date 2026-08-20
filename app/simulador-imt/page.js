'use client';

import Header from '../../components/Header';
import ImtCalculator from '../../components/ImtCalculator';

export default function SimuladorImtPage() {
  return (
    <>
      <Header />
      <div className="wrap" style={{ maxWidth: 560, padding: '48px 32px 80px' }}>
        <h1 className="display" style={{ fontSize: 28, marginBottom: 8 }}>Quanto vou pagar de IMT?</h1>
        <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 8 }}>
          Calcule o IMT e o Imposto do Selo que vai pagar antes da escritura, na compra da sua casa.
        </p>
        <ImtCalculator price={200000} />
      </div>
    </>
  );
}
