import TextPage from '../../components/TextPage';

export default function PrivacidadePage() {
  return (
    <TextPage title="Política de privacidade">
      <p style={{
        marginBottom: 20, padding: 14, background: 'var(--plaster)', borderRadius: 6, fontSize: 13, color: 'var(--ink)',
      }}>
        Nota: este é um modelo genérico de referência. Recomendamos que seja revisto por um profissional antes de o considerar definitivo, para garantir conformidade legal completa com o RGPD e a legislação portuguesa.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Que dados recolhemos</h2>
      <p style={{ marginBottom: 16 }}>
        Ao criar uma conta, recolhemos o seu nome, email e, opcionalmente, foto de perfil e telefone. Ao publicar um imóvel, recolhemos as informações que fornece sobre o mesmo. Ao contactar um anunciante, recolhemos o seu nome, email e mensagem.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Para que usamos os seus dados</h2>
      <p style={{ marginBottom: 16 }}>
        Usamos os seus dados para gerir a sua conta, permitir a comunicação entre utilizadores, enviar notificações relevantes (como novas mensagens ou leads), e melhorar o serviço.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Partilha de dados</h2>
      <p style={{ marginBottom: 16 }}>
        Não vendemos os seus dados a terceiros. Os seus dados de contacto só são partilhados com outros utilizadores quando decide contactá-los diretamente (ex: ao enviar uma mensagem sobre um imóvel).
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Os seus direitos</h2>
      <p>
        Pode solicitar o acesso, correção ou eliminação dos seus dados a qualquer momento, contactando-nos através do botão de mensagem no site.
      </p>
    </TextPage>
  );
}
