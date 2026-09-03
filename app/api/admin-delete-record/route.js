import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Rota genérica para o admin poder apagar coisas submetidas por outras
// pessoas — mensagens de suporte, respostas, etc. As regras de segurança
// normais nem sempre deixam apagar diretamente, por isso esta rota usa a
// chave de administração para o fazer com segurança.

// Por segurança, só se pode apagar destas tabelas por aqui.
const ALLOWED_TABLES = ['support_requests', 'support_replies', 'valuation_requests', 'leads', 'reports'];

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

    const { table, id, matchColumn } = await request.json();
    if (!table || !id) {
      return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
    }
    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Tabela não permitida.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from(table).delete().eq(matchColumn || 'id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
