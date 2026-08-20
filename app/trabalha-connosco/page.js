import TextPage from '../../components/TextPage';

export const metadata = {
  title: 'Trabalha Connosco',
  description: 'Junta-te à equipa do More·ada.',
};

export default function TrabalhaConnoscoPage() {
  return (
    <TextPage title="Trabalha connosco">
      <p style={{ marginBottom: 16 }}>
        Estamos sempre atentos a pessoas interessadas em ajudar a construir o Morada — seja em tecnologia, apoio ao cliente, ou parcerias com agências imobiliárias.
      </p>
      <p>
        Se tem interesse em colaborar connosco, entre em contacto através do ícone de mensagem no canto do site, e conte-nos um pouco sobre si.
      </p>
    </TextPage>
  );
}
