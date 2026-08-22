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
      <p style={{ marginBottom: 16 }}>
        Também pode escrever-nos diretamente para <a href="mailto:geral@moreada.pt" style={{ color: 'var(--telha)' }}>geral@moreada.pt</a>.
      </p>
      <p>
        Se tiver uma conta, também pode consultar as respostas anteriores no seu painel, em &quot;Mensagens de suporte&quot;.
      </p>
    </TextPage>
  );
}
