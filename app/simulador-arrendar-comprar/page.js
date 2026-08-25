import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import RentVsBuyCalculator from '../../components/RentVsBuyCalculator';

export const metadata = {
  title: 'Arrendar ou Comprar Casa? Simulador Gratuito',
  description: 'Compare gratuitamente o custo real de comprar com o de arrendar em Portugal, ao longo do tempo que pretende ficar no imóvel.',
};

export default function SimuladorArrendarComprarPage() {
  return (
    <>
      <Header />
      <div className="wrap" style={{ maxWidth: 620, padding: '48px 32px 80px' }}>
        <BackButton fallback="/" />
        <RentVsBuyCalculator price={200000} showTitle />
      </div>
    </>
  );
}
