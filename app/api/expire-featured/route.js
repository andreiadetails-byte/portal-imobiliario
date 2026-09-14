import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Verifica se há imóveis com destaque cujo prazo de 7 dias já passou, e
// desativa o destaque, avisando o dono por notificação. Não precisa de
// autenticação especial — só lê e atualiza o que já expirou, nada sensível.
// É chamada automaticamente sempre que alguém visita o seu painel.

export async function POST() {
  try {
    const { data: expired } = await supabaseAdmin
      .from('properties')
      .select('id, owner_id, typology, address')
      .eq('featured_status', 'active')
      .lt('featured_until', new Date().toISOString());

    if (!expired || expired.length === 0) {
      return Response.json({ expiredCount: 0 });
    }

    const ids = expired.map((p) => p.id);
    await supabaseAdmin.from('properties').update({ featured_status: 'none' }).in('id', ids);

    // Avisa cada dono, um a um, que o destaque terminou.
    for (const p of expired) {
      await supabaseAdmin.from('notifications').insert({
        user_id: p.owner_id,
        message: `O destaque do seu anúncio "${p.typology} · ${p.address}" terminou (7 dias). Pode voltar a destacá-lo no próximo mês.`,
        link: '/dashboard',
        read: false,
      });
    }

    return Response.json({ expiredCount: expired.length });
  } catch (err) {
    console.error('Erro ao expirar destaques:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
