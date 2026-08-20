import TextPage from '../../components/TextPage';

const FAQS = [
  { p: 'Como publico um imóvel?', r: 'Crie uma conta, clique em "Publicar imóvel" e preencha o formulário. O seu anúncio fica "em revisão" até ser aprovado pela nossa equipa.' },
  { p: 'É grátis publicar?', r: 'Para utilizadores particulares, sim — é gratuito publicar até 3 anúncios. Para agências, a publicação tem um custo de 15 € por mês, com direito a até 50 anúncios simultâneos.' },
  { p: 'Como falo com o anunciante de um imóvel?', r: 'Na página do imóvel, use o formulário de contacto — se tiver sessão iniciada, a conversa fica guardada no seu chat.' },
  { p: 'Posso editar ou apagar um anúncio depois de publicado?', r: 'Sim, no seu painel encontra as opções de editar, desativar ou apagar cada anúncio.' },
  { p: 'O que é o "destaque" de um anúncio?', r: 'É uma forma de dar mais visibilidade ao seu imóvel nos resultados de pesquisa. Pode ativá-lo diretamente no seu painel.' },
  { p: 'Como denuncio um anúncio suspeito?', r: 'Na página do imóvel, existe o botão "Denunciar este anúncio". A nossa equipa analisa todas as denúncias.' },
];

export default function FaqPage() {
  return (
    <TextPage title="Perguntas frequentes">
      {FAQS.map((f, i) => (
        <div key={i} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{f.p}</div>
          <div>{f.r}</div>
        </div>
      ))}
    </TextPage>
  );
}
