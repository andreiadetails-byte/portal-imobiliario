import TextPage from '../../components/TextPage';
import { PAYMENT_INFO } from '../../lib/paymentInfo';

export const metadata = {
  title: 'Condições Gerais',
  description: 'Condições gerais de utilização do More·ada, para particulares e agências imobiliárias.',
};

export default function TermosPage() {
  return (
    <TextPage title="Condições gerais">
      <p style={{ marginBottom: 16 }}>
        O More·ada é operado pela equipa More·ada. Ao criar conta ou usar o site, está a aceitar estas condições.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Natureza da plataforma</h2>
      <p style={{ marginBottom: 16 }}>
        O More·ada é uma plataforma de intermediação que permite a particulares e agências publicar e pesquisar anúncios de imóveis. Não somos parte em nenhuma transação de compra, venda ou arrendamento — a responsabilidade pela veracidade dos anúncios, pela negociação e pelo cumprimento de obrigações legais na transação é exclusivamente de quem publica e de quem contacta.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Contas de utilizador</h2>
      <p style={{ marginBottom: 16 }}>
        Existem dois tipos de conta: <b>particular</b> (até 3 anúncios ativos) e <b>agência</b> (até 50 anúncios ativos, mediante licença AMI válida). É responsável por manter a confidencialidade da sua palavra-passe e por toda a atividade realizada através da sua conta. Reservamo-nos o direito de bloquear ou eliminar contas que violem estas condições.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Subscrição de agências</h2>
      <p style={{ marginBottom: 16 }}>
        Contas de agência têm direito a um primeiro mês gratuito. Após esse período, a mensalidade é de {PAYMENT_INFO.subscriptionFee.toFixed(2)} €, paga através de uma Entidade e Referência Multibanco gerada diretamente na plataforma. A subscrição é válida por um mês exato a contar da data de confirmação do pagamento; caso não seja renovada, o acesso ao painel e à publicação de novos anúncios fica suspenso até à confirmação de um novo pagamento.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Conteúdo dos anúncios</h2>
      <p style={{ marginBottom: 16 }}>
        Todos os anúncios são sujeitos a revisão antes de ficarem visíveis publicamente. Reservamo-nos o direito de rever, recusar ou anular qualquer anúncio que viole a lei, contenha informação falsa ou enganosa, ou não cumpra as nossas regras de publicação. O utilizador garante que tem o direito de publicar as fotografias e informações que anexa, e que estas correspondem à realidade do imóvel.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Destaque de anúncios</h2>
      <p style={{ marginBottom: 16 }}>
        Os anúncios podem ser destacados mediante pagamento, quando esta funcionalidade estiver ativa. O destaque é confirmado manualmente após verificação do comprovativo de pagamento, e pode ser cancelado a qualquer momento pelo utilizador ou pelo More·ada.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Comportamento dos utilizadores</h2>
      <p style={{ marginBottom: 16 }}>
        Não é permitido: publicar anúncios falsos, duplicados ou fraudulentos; assediar ou enviar mensagens abusivas a outros utilizadores através do chat; tentar contornar os limites de conta ou as regras de moderação; ou usar a plataforma para fins ilegais. O incumprimento pode resultar no bloqueio ou eliminação da conta, sem aviso prévio em casos graves.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Limitação de responsabilidade</h2>
      <p style={{ marginBottom: 16 }}>
        O More·ada não garante a exatidão, integridade ou atualidade dos anúncios publicados por terceiros, nem se responsabiliza por danos resultantes de negociações ou transações realizadas entre utilizadores. Os simuladores financeiros disponibilizados (crédito, IMT, arrendar vs. comprar) têm caráter meramente informativo e não constituem aconselhamento financeiro.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Alterações a estas condições</h2>
      <p style={{ marginBottom: 16 }}>
        Podemos atualizar estas condições periodicamente. Alterações significativas serão comunicadas através do site.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Lei aplicável</h2>
      <p>
        Estas condições regem-se pela lei portuguesa. Em caso de litígio de consumo, o utilizador pode recorrer ao{' '}
        <a href="https://www.livroreclamacoes.pt/Inicio/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--telha)' }}>
          Livro de Reclamações Eletrónico
        </a>{' '}
        ou aos meios de resolução alternativa de litígios de consumo legalmente previstos.
      </p>
    </TextPage>
  );
}
