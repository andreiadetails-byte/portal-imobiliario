import TextPage from '../../components/TextPage';

export const metadata = {
  title: 'Sobre nós',
  description: 'Conheça o More·ada, o portal imobiliário português que liga particulares e agências diretamente, sem intermediários obrigatórios.',
};

export default function SobrePage() {
  return (
    <TextPage title="Sobre nós">
      <p style={{ marginBottom: 16 }}>
        O Morada nasceu com um objetivo simples: tornar a compra, venda e arrendamento de imóveis em Portugal mais direto, sem intermediários obrigatórios.
      </p>
      <p style={{ marginBottom: 16 }}>
        Particulares e agências podem publicar os seus imóveis, falar diretamente com interessados através do chat, e gerir tudo — leads, mensagens, anúncios — num único painel.
      </p>
      <p>
        Continuamos a crescer e a melhorar a plataforma com base no que os nossos utilizadores nos vão dizendo. Se tiver sugestões, fale connosco através do ícone de mensagem, no canto do site.
      </p>
    </TextPage>
  );
}
