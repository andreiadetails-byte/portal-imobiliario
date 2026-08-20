import TextPage from '../../components/TextPage';
import { PAYMENT_INFO } from '../../lib/paymentInfo';

export default function PrivacidadePage() {
  return (
    <TextPage title="Política de privacidade">
      <p style={{ marginBottom: 16 }}>
        O responsável pelo tratamento dos seus dados pessoais é o <b>More·ada</b>, NIPC {PAYMENT_INFO.companyNipc}.
        Esta política explica que dados recolhemos, para quê, e quais os seus direitos.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Que dados recolhemos</h2>
      <ul style={{ marginBottom: 16, paddingLeft: 20 }}>
        <li style={{ marginBottom: 6 }}><b>Ao criar conta:</b> nome, email, e opcionalmente foto de perfil, telemóvel e, para agências, o nome e a licença AMI.</li>
        <li style={{ marginBottom: 6 }}><b>Ao publicar um imóvel:</b> as informações do anúncio (morada, preço, características, fotos) e, se anexar, o documento comprovativo de propriedade.</li>
        <li style={{ marginBottom: 6 }}><b>Ao contactar um anunciante:</b> o conteúdo das mensagens trocadas no chat.</li>
        <li style={{ marginBottom: 6 }}><b>Ao contactar o suporte:</b> o seu nome, contacto e a mensagem enviada.</li>
        <li style={{ marginBottom: 6 }}><b>Para contas de agência com subscrição:</b> o comprovativo de pagamento que anexa.</li>
      </ul>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Para que usamos os seus dados</h2>
      <p style={{ marginBottom: 16 }}>
        Usamos os seus dados para: criar e gerir a sua conta; permitir a publicação e pesquisa de imóveis; permitir a comunicação entre utilizadores através do chat; enviar notificações relevantes por email (novas mensagens, alterações à sua conta, lembretes de pagamento); confirmar pagamentos de subscrições e destaques; e cumprir obrigações legais aplicáveis à mediação imobiliária em Portugal.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Com quem partilhamos os seus dados</h2>
      <p style={{ marginBottom: 16 }}>
        Não vendemos os seus dados a terceiros. Os seus dados de contacto (nome, e o telemóvel, se autorizar) só ficam visíveis a outros utilizadores quando o decide — por exemplo, ao autorizar a exibição do telemóvel no seu anúncio, ou ao contactar diretamente outro utilizador pelo chat.
      </p>
      <p style={{ marginBottom: 16 }}>
        Usamos os seguintes prestadores de serviços para operar o site, que processam dados em nosso nome: <b>Supabase</b> (base de dados e alojamento de ficheiros), <b>Netlify</b> (alojamento do site) e um serviço de email para o envio de notificações. Estes prestadores estão contratualmente obrigados a proteger os seus dados.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Quanto tempo guardamos os seus dados</h2>
      <p style={{ marginBottom: 16 }}>
        Mantemos os seus dados enquanto a sua conta estiver ativa. Se eliminar a sua conta, os seus dados pessoais são apagados, exceto quando a lei nos obrigar a conservar determinada informação (por exemplo, registos fiscais de pagamentos).
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Os seus direitos</h2>
      <p style={{ marginBottom: 16 }}>
        Ao abrigo do RGPD, tem direito a aceder, corrigir, eliminar ou pedir a portabilidade dos seus dados, e a opor-se a determinados tratamentos. Pode exercer estes direitos contactando-nos através do botão de mensagem no site. Tem também o direito de apresentar reclamação junto da Comissão Nacional de Proteção de Dados (CNPD).
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Cookies</h2>
      <p>
        Para informação sobre os cookies que usamos, consulte a nossa <a href="/cookies" style={{ color: 'var(--telha)' }}>política de cookies</a>.
      </p>
    </TextPage>
  );
}
