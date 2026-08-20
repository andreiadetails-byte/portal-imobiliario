import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail } from '../../../lib/sendEmail';

// Só permitimos alterar estes campos por esta via, por segurança —
// nunca aceitar diretamente qualquer campo enviado pelo pedido.
const ALLOWED_FIELDS = ['account_type', 'is_blocked', 'subscription_status', 'subscription_paid_until', 'is_verified'];

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

function describeChange(field, value) {
  if (field === 'account_type') {
    return value === 'agencia'
      ? 'A sua conta foi alterada para o tipo <b>Agência</b>.'
      : 'A sua conta foi alterada para o tipo <b>Particular</b>.';
  }
  if (field === 'is_blocked') {
    return value ? 'A sua conta foi <b>bloqueada</b>.' : 'A sua conta foi <b>desbloqueada</b> e voltou ao normal.';
  }
  if (field === 'subscription_status' && value === 'active') {
    return 'O seu pagamento foi confirmado e a sua assinatura está <b>ativa</b>.';
  }
  if (field === 'is_verified') {
    return value ? 'A sua conta foi marcada como <b>verificada</b> pelo Morada.' : null;
  }
  return null;
}

export async function POST(request) {
  try {
    if (!(await isCallerAdmin(request))) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const { userId, updates } = await request.json();
    if (!userId || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
    }

    const safeUpdates = {};
    for (const key of Object.keys(updates)) {
      if (ALLOWED_FIELDS.includes(key)) safeUpdates[key] = updates[key];
    }
    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo permitido para atualizar.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('profiles').update(safeUpdates).eq('id', userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Avisa o utilizador por email sobre a alteração, sem deixar isso impedir a resposta se falhar.
    try {
      const messages = Object.entries(safeUpdates)
        .map(([field, value]) => describeChange(field, value))
        .filter(Boolean);

      if (messages.length > 0) {
        const { data: userAuth } = await supabaseAdmin.auth.admin.getUserById(userId);
        const email = userAuth?.user?.email;
        if (email) {
          await sendEmail({
            to: email,
            subject: 'A sua conta no Morada foi atualizada',
            html: `
              <div style="font-family: sans-serif; max-width: 480px; color: #332E22;">
                <p style="font-family: Georgia, serif; font-size: 20px; font-weight: 600; margin-bottom: 20px;">More·ada</p>
                <h2 style="color: #332E22; font-size: 18px;">A sua conta foi atualizada</h2>
                ${messages.map((m) => `<p>${m}</p>`).join('')}
                <p style="margin-top: 24px;">
                  <a href="https://portalimobiliario.netlify.app/dashboard" style="color: #5A6B49;">Ver o meu painel</a>
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px;" />
                <p style="font-size: 12px; color: #999;">
                  Este email foi enviado pelo More·ada, portal imobiliário em Portugal, na sequência de uma ação feita por um administrador na sua conta.
                  Se não reconhece esta alteração, contacte-nos através do site.
                </p>
              </div>
            `,
          });
        }
      }
    } catch (emailErr) {
      console.error('Falha ao enviar email de aviso de alteração:', emailErr.message);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
