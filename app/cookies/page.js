import TextPage from '../../components/TextPage';

export default function CookiesPage() {
  return (
    <TextPage title="Política de cookies">
      <p style={{
        marginBottom: 20, padding: 14, background: 'var(--plaster)', borderRadius: 6, fontSize: 13, color: 'var(--ink)',
      }}>
        Nota: este é um modelo genérico de referência, para adaptar/rever consoante os cookies reais usados no site.
      </p>
      <p style={{ marginBottom: 16 }}>
        Usamos cookies essenciais para manter a sua sessão iniciada e para o funcionamento básico do site (por exemplo, guardar o idioma escolhido). Não usamos cookies de publicidade de terceiros.
      </p>
      <p>
        Pode gerir ou apagar cookies nas definições do seu browser a qualquer momento.
      </p>
    </TextPage>
  );
}
