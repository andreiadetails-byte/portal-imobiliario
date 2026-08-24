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
        <ImtCalculator price={200000} showTitle />
      </div>
    </>
  );
}
