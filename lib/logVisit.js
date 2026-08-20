// Regista uma visita de um utilizador com conta (não visitantes anónimos),
// no máximo uma vez por hora — evita encher a base de dados com registos a mais
// se a pessoa só estiver a navegar de página em página no site.
const THROTTLE_KEY = 'morada_last_visit_logged';
const THROTTLE_MS = 60 * 60 * 1000; // 1 hora

export async function logVisitIfNeeded(supabase, userId) {
  if (!userId) return;
  try {
    const last = Number(localStorage.getItem(THROTTLE_KEY) || 0);
    if (Date.now() - last < THROTTLE_MS) return;

    await supabase.from('user_visits').insert({ user_id: userId });
    await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId);
    localStorage.setItem(THROTTLE_KEY, String(Date.now()));
  } catch (err) {
    // Falhar a registar uma visita nunca deve impedir o resto do site de funcionar.
    console.error('Erro ao registar visita:', err);
  }
}
