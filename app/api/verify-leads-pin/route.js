import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

async function getVerifiedUserId(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: { user } } = await supabase.auth.getUser(token);
  return user?.id || null;
}

export async function POST(request) {
  try {
    const userId = await getVerifiedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Precisa de ter sessão iniciada.' }, { status: 401 });
    }

    const { data: callerProfile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', userId).single();
    if (!callerProfile?.is_admin) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const { pin } = await request.json();
    const correctPin = process.env.ADMIN_LEADS_PIN;

    if (!correctPin) {
      // Sem PIN configurado no servidor, nunca deixa passar — mais vale
      // pedir para configurar do que deixar o acesso aberto por engano.
      return NextResponse.json({ error: 'PIN não está configurado no servidor.' }, { status: 500 });
    }

    if (pin !== correctPin) {
      return NextResponse.json({ error: 'PIN incorreto.' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
