import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Elimina definitivamente a conta de um utilizador (a pedido do próprio),
// depois de guardar o motivo que deu, para sabermos porque as pessoas saem.

export async function POST(request) {
  try {
    const { reason } = await request.json();

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return Response.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return Response.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    // Guarda o motivo antes de apagar tudo, para termos como perceber
    // porque é que as pessoas cancelam a conta.
    await supabaseAdmin.from('account_deletions').insert({
      user_id: user.id,
      email: user.email,
      reason: reason || null,
    });

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('Erro ao eliminar conta:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
