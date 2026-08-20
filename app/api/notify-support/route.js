// Esta rota já não envia email — as mensagens de suporte passaram a ser
// geridas dentro da app (painel de administração, separador "Suporte").
// Se ainda tiveres o Database Webhook configurado para esta rota, podes
// desativá-lo no Supabase — já não é necessário. Mantemos o ficheiro para
// não dar erro caso o webhook ainda esteja ligado.
export async function POST() {
  return Response.json({ success: true, note: 'Notificações de suporte movidas para dentro da app.' });
}
