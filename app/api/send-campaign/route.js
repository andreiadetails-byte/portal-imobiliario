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

export async function POST(request) {
  try {
    const { adminUserId, subject, message, audience } = await request.json();

    if (!adminUserId || !subject || !message) {
      return Response.json({ error: 'Faltam dados.' }, { status: 400 });
    }

    // Confirma que quem pediu isto é mesmo administrador.
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles').select('is_admin').eq('id', adminUserId).single();
    if (!adminProfile?.is_admin) {
      return Response.json({ error: 'Sem permissão.' }, { status: 403 });
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
