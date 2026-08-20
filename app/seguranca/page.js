import TextPage from '../../components/TextPage';

export const metadata = {
  title: 'Segurança Online',
  description: 'Dicas para comprar, vender ou arrendar imóveis em segurança, e evitar burlas comuns no imobiliário.',
};

export default function SegurancaPage() {
  return (
    <TextPage title="Segurança online">
      <p style={{ marginBottom: 16 }}>
        A sua segurança é importante para nós. Algumas recomendações ao usar o Morada:
      </p>
      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
        <li style={{ marginBottom: 8 }}>Nunca faça pagamentos ou transferências antes de visitar o imóvel presencialmente.</li>
        <li style={{ marginBottom: 8 }}>Desconfie de preços muito abaixo do valor de mercado.</li>
        <li style={{ marginBottom: 8 }}>Prefira sempre comunicar através do chat da plataforma, onde fica registo da conversa.</li>
        <li style={{ marginBottom: 8 }}>Nunca partilhe dados bancários ou palavras-passe com outros utilizadores.</li>
      </ul>
      <p>
        Se encontrar um anúncio suspeito, use o botão "Denunciar este anúncio" na página do imóvel — a nossa equipa analisa todas as denúncias.
      </p>
    </TextPage>
  );
}
