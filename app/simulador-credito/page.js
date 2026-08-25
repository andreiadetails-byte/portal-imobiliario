import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import MortgageSimulator from '../../components/MortgageSimulator';

export const metadata = {
  title: 'Simulador de Crédito Habitação',
  description: 'Calcule gratuitamente a prestação mensal do seu crédito habitação, ou descubra quanto pode pedir emprestado com base no que consegue pagar por mês.',
};

export default function SimuladorCreditoPage() {
  return (
    <>
      <Header />
      <div className="wrap" style={{ maxWidth: 560, padding: '48px 32px 80px' }}>
        <BackButton fallback="/" />
        <MortgageSimulator price={200000} showTitle />
      </div>
    </>
  );
}
