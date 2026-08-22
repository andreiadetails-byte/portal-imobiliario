import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail } from '../../../lib/sendEmail';
import { renderEmail, SITE_URL } from '../../../lib/emailTemplate';

// Envia uma campanha de email a vários utilizadores de uma vez. Só pode ser
// chamada por um administrador. Envia com um pequeno atraso entre cada
// email, para não ultrapassar os limites do servidor de email (a maioria
// dos fornecedores bloqueia contas que enviam muitos emails muito depressa).

const DELAY_MS = 400; // atraso entre cada envio

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Confirma que quem está a pedir isto tem mesmo sessão iniciada como
// administrador — nunca confia num "adminUserId" vindo do próprio pedido,
// que qualquer pessoa podia adivinhar ou copiar para se fazer passar por ti.
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
      return Response.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const { subject, message, audience } = await request.json();

    if (!subject || !message) {
      return Response.json({ error: 'Faltam dados.' }, { status: 400 });
    }

    let query = supabaseAdmin.from('profiles').select('id, full_name, agency_name, account_type');
    if (audience === 'agencias') query = query.eq('account_type', 'agencia');
    else if (audience === 'particulares') query = query.eq('account_type', 'particular');

    const { data: profiles } = await query;

    let sentCount = 0;
    let failedCount = 0;

    for (const profile of profiles || []) {
      const { data: userAuth } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      const email = userAuth?.user?.email;
      if (!email) { failedCount++; continue; }

      const firstName = (profile.agency_name || profile.full_name || '').split(' ')[0];

      const bodyHtml = `
        <p style="margin:0 0 14px; font-size:15px;">Olá${firstName ? ` ${firstName}` : ''},</p>
        ${message}
      `;

      const result = await sendEmail({
        to: email,
        subject,
        html: renderEmail({
          preheader: subject,
          bodyHtml,
          ctaText: 'Deixar a minha opinião',
          ctaUrl: `${SITE_URL}/feedback`,
        }),
      });

      if (result.error) failedCount++;
      else sentCount++;

      await sleep(DELAY_MS);
    }

    return Response.json({ success: true, sentCount, failedCount, total: (profiles || []).length });
  } catch (err) {
    console.error('Erro ao enviar campanha:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
