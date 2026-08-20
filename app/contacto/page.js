import TextPage from '../../components/TextPage';

export const metadata = {
  title: 'Contacta-nos',
  description: 'Fale connosco — tire dúvidas, reporte um problema ou dê-nos sugestões sobre o More·ada.',
};

export default function ContactoPage() {
  return (
    <TextPage title="Contacta-nos">
      <p style={{ marginBottom: 16 }}>
        A forma mais rápida de falar connosco é através do botão de mensagem, visível no canto do site em qualquer página — respondemos assim que possível.
      </p>
      <p>
        Se tiver uma conta, também pode consultar as respostas anteriores no seu painel, em &quot;As minhas mensagens de suporte&quot;.
      </p>
    </TextPage>
  );
}
