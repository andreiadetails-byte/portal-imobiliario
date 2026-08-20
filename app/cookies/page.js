import TextPage from '../../components/TextPage';

export default function CookiesPage() {
  return (
    <TextPage title="Política de cookies">
      <p style={{ marginBottom: 16 }}>
        Esta página explica que cookies e tecnologias semelhantes usamos no More·ada, e para quê.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Cookies essenciais</h2>
      <p style={{ marginBottom: 16 }}>
        Usamos cookies e armazenamento local do browser estritamente necessários para o funcionamento do site:
      </p>
      <ul style={{ marginBottom: 16, paddingLeft: 20 }}>
        <li style={{ marginBottom: 6 }}>Manter a sua sessão iniciada, para não ter de fazer login em cada página.</li>
        <li style={{ marginBottom: 6 }}>Guardar o idioma que escolheu (português, inglês, espanhol, francês, alemão, holandês ou russo).</li>
        <li style={{ marginBottom: 6 }}>Guardar a sua escolha sobre esta política de cookies, para não voltarmos a perguntar a cada visita.</li>
      </ul>
      <p style={{ marginBottom: 16 }}>
        Estes cookies não podem ser desativados, porque o site deixaria de funcionar corretamente sem eles. Não precisam de autorização, ao abrigo da lei aplicável a cookies estritamente necessários.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Cookies de publicidade ou análise</h2>
      <p style={{ marginBottom: 16 }}>
        O More·ada usa o Google Analytics para perceber quantas pessoas visitam o site e quais as páginas mais vistas — mas <b>só depois de autorizar</b>, através da faixa de cookies que aparece na primeira visita. Se recusar, ou só aceitar os cookies essenciais, o Google Analytics não é carregado, e continuamos sem saber quem é, apenas quantas visitas houve no total (de forma anónima, com o endereço IP encurtado).
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>Como gerir os cookies</h2>
      <p>
        Pode limpar ou bloquear cookies a qualquer momento nas definições do seu browser. Note que, ao bloquear os cookies essenciais, algumas partes do site (como iniciar sessão) podem deixar de funcionar.
      </p>
    </TextPage>
  );
}
