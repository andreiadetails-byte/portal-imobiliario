import ValuationClient from './ValuationClient';

export const metadata = {
  title: 'Avaliação de Imóveis Grátis',
  description: 'Descubra quanto vale o seu imóvel, gratuitamente, com base em imóveis semelhantes na sua zona.',
};

export default function ValuationPage() {
  return <ValuationClient />;
}
