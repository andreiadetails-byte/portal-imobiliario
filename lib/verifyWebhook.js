// Confirma que um pedido a uma rota "chamada automaticamente pelo Supabase"
// (Database Webhook) vem mesmo do Supabase, e não de qualquer pessoa que
// descubra o endereço da rota. Sem isto, alguém conseguia chamar estas
// rotas diretamente e usar o teu sistema de email para enviar spam.
//
// Como configurar no Supabase: em cada Database Webhook (Database → Webhooks),
// nos "HTTP Headers", adiciona um cabeçalho:
//   Nome: x-webhook-secret
//   Valor: (o mesmo valor que puseres em WEBHOOK_SECRET no .env.local/Netlify)

export function isValidWebhookRequest(request) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return false; // se não estiver configurado, nunca deixa passar
  return request.headers.get('x-webhook-secret') === secret;
}
