'use client';

import TextPage from './TextPage';
import { useLanguage } from '../lib/i18n';

// Usado para o schema.org (SEO) — fica sempre em português, tal como o
// título/descrição da página, porque é isso que o Google indexa para
// pesquisas em Portugal. O conteúdo visível é que muda de idioma.
const FAQS_PT = [
  { p: 'Como publico um imóvel?', r: 'Crie uma conta, clique em "Publicar imóvel" e preencha o formulário. O seu anúncio fica "em revisão" até ser aprovado pela nossa equipa.' },
  { p: 'É grátis publicar?', r: 'Para utilizadores particulares, sim — é gratuito publicar até 3 anúncios. Para agências, a publicação tem um custo de 15 € por mês, com direito a até 50 anúncios simultâneos.' },
  { p: 'Como falo com o anunciante de um imóvel?', r: 'Na página do imóvel, use o formulário de contacto — se tiver sessão iniciada, a conversa fica guardada no seu chat.' },
  { p: 'Posso editar ou apagar um anúncio depois de publicado?', r: 'Sim, no seu painel encontra as opções de editar, desativar ou apagar cada anúncio.' },
  { p: 'O que é o "destaque" de um anúncio?', r: 'É uma forma de dar mais visibilidade ao seu imóvel nos resultados de pesquisa. Pode ativá-lo diretamente no seu painel.' },
  { p: 'Como denuncio um anúncio suspeito?', r: 'Na página do imóvel, existe o botão "Denunciar este anúncio". A nossa equipa analisa todas as denúncias.' },
];

export default function FaqContent() {
  const { t } = useLanguage();

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS_PT.map((f) => ({
      '@type': 'Question',
      name: f.p,
      acceptedAnswer: { '@type': 'Answer', text: f.r },
    })),
  };

  const faqs = [
    { q: t('faq_q1'), a: t('faq_a1') },
    { q: t('faq_q2'), a: t('faq_a2') },
    { q: t('faq_q3'), a: t('faq_a3') },
    { q: t('faq_q4'), a: t('faq_a4') },
    { q: t('faq_q5'), a: t('faq_a5') },
    { q: t('faq_q6'), a: t('faq_a6') },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <TextPage title={t('faq_title')}>
        {faqs.map((f, i) => (
          <div key={i} style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{f.q}</div>
            <div>{f.a}</div>
          </div>
        ))}
      </TextPage>
    </>
  );
}
