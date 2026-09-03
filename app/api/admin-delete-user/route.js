import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Confirma que quem está a pedir isto é mesmo um administrador, antes de apagar seja o que for.
async function isCallerAdmin(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return false;

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return false;

  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  return !!profile?.is_admin;
}

export async function POST(request) {
  try {
    if (!(await isCallerAdmin(request))) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'Falta o userId.' }, { status: 400 });
    }

    // Apaga primeiro o perfil explicitamente (mesmo que normalmente
    // desapareça sozinho ao apagar a conta) — garante que não fica nada a
    // impedir a pessoa de voltar a registar-se com o mesmo email no futuro.
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
