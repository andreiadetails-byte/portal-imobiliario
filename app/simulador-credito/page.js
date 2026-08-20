import Header from '../../components/Header';
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
        <h1 className="display" style={{ fontSize: 28, marginBottom: 8 }}>Simulador de crédito habitação</h1>
        <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 8 }}>
          Descubra qual seria a prestação mensal, ou quanto pode pedir emprestado com base no que consegue pagar por mês.
        </p>
        <MortgageSimulator price={200000} />
      </div>
    </>
  );
}
