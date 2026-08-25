import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import InvestmentProfitCalculator from '../../components/InvestmentProfitCalculator';

export const metadata = {
  title: 'Calculadora de Lucro em Investimento Imobiliário',
  description: 'Calcule o lucro esperado ao comprar e revender um imóvel em Portugal, incluindo despesas, IMT, Imposto do Selo, e o imposto sobre a mais-valia.',
};

export default function SimuladorInvestimentoPage() {
  return (
    <>
      <Header />
      <div className="wrap" style={{ maxWidth: 560, padding: '48px 32px 80px' }}>
        <BackButton fallback="/" />
        <InvestmentProfitCalculator showTitle />
      </div>
    </>
  );
}
