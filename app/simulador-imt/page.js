import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import ImtCalculator from '../../components/ImtCalculator';

export const metadata = {
  title: 'Simulador de IMT e Imposto do Selo',
  description: 'Calcule gratuitamente quanto vai pagar de IMT e Imposto do Selo antes da escritura, na compra da sua casa em Portugal.',
};

export default function SimuladorImtPage() {
  return (
    <>
      <Header />
      <div className="wrap" style={{ maxWidth: 560, padding: '48px 32px 80px' }}>
        <BackButton fallback="/" />
        <h1 className="display" style={{ fontSize: 28, marginBottom: 8 }}>Quanto vou pagar de IMT?</h1>
        <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 8 }}>
          Calcule o IMT e o Imposto do Selo que vai pagar antes da escritura, na compra da sua casa.
        </p>
        <ImtCalculator price={200000} />
      </div>
    </>
  );
}
