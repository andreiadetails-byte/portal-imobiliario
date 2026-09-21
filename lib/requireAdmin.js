import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabaseAdmin';

// Confirma que quem chama uma rota do servidor tem sessão iniciada E é
// administrador. Devolve o utilizador, ou null se não for.
// Usar em qualquer rota que envie emails ou altere dados em nome de outros.
export async function requireAdmin(request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;

  const authClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: { user } } = await authClient.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  return profile?.is_admin ? user : null;
}
