import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Rota genérica para o admin poder alterar o estado (marcar como lida,
// resolvida, etc.) de coisas submetidas por outras pessoas — leads,
// avaliações, e assim por diante. As regras de segurança normais não
// deixam um admin alterar diretamente o que outra pessoa submeteu, por
// isso esta rota usa a chave de administração para o fazer com segurança.

// Por segurança, só se pode mexer nestas tabelas e campos por aqui —
// nunca aceitar diretamente o que vier no pedido.
const ALLOWED = {
  valuation_requests: ['status'],
  leads: ['status'],
};

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

    const { table, id, updates } = await request.json();
    if (!table || !id || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
    }

    const allowedFields = ALLOWED[table];
    if (!allowedFields) {
      return NextResponse.json({ error: 'Tabela não permitida.' }, { status: 400 });
    }

    const safeUpdates = {};
    for (const key of Object.keys(updates)) {
      if (allowedFields.includes(key)) safeUpdates[key] = updates[key];
    }
    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo permitido para atualizar.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from(table).update(safeUpdates).eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
