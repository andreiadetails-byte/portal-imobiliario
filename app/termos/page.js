import TextPage from '../../components/TextPage';

export default function TermosPage() {
  return (
    <TextPage title="Condições gerais">
      <p style={{
        marginBottom: 20, padding: 14, background: 'var(--plaster)', borderRadius: 6, fontSize: 13, color: 'var(--ink)',
      }}>
        Nota: este é um modelo genérico de referência. Recomendamos que seja revisto por um profissional antes de o considerar definitivo.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Utilização da plataforma</h2>
      <p style={{ marginBottom: 16 }}>
        O Morada é uma plataforma de intermediação entre anunciantes e interessados em imóveis. Não somos parte em nenhuma transação — a responsabilidade pela veracidade dos anúncios é de quem os publica.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Conteúdo dos anúncios</h2>
      <p style={{ marginBottom: 16 }}>
        Reservamo-nos o direito de rever, recusar ou anular qualquer anúncio que viole a lei, contenha informação falsa, ou não cumpra as nossas regras de publicação.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Conta de utilizador</h2>
      <p>
        É responsável por manter a confidencialidade da sua palavra-passe e por toda a atividade realizada através da sua conta.
      </p>
    </TextPage>
  );
}
