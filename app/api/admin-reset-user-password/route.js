import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomInt } from 'crypto';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Confirma que quem está a pedir isto é mesmo um administrador, antes de
// mudar a password de seja quem for.
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

// Gera uma password temporária, fácil de ditar/escrever mas segura o
// suficiente — letras (sem confundir I/l/O/0) e números. Usa "randomInt"
// (criptograficamente seguro) em vez de Math.random, já que isto define
// o acesso a uma conta de outra pessoa.
function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 10; i++) pass += chars[randomInt(chars.length)];
  return pass;
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

    const newPassword = generateTempPassword();

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, newPassword });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
