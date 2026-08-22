import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail } from '../../../lib/sendEmail';
import { renderEmail, SITE_URL } from '../../../lib/emailTemplate';

// Chamada pelo painel de administração, quando decides pedir autorização a
// alguém para publicar a mensagem simpática que enviou como testemunho.

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

    const { supportRequestId } = await request.json();
    if (!supportRequestId) {
      return Response.json({ error: 'Falta o ID da mensagem.' }, { status: 400 });
    }

    const { data: message } = await supabaseAdmin
      .from('support_requests').select('*').eq('id', supportRequestId).single();

    if (!message) {
      return Response.json({ error: 'Mensagem não encontrada.' }, { status: 404 });
    }
    if (!message.user_id) {
      return Response.json({ error: 'Esta mensagem não está associada a nenhuma conta com email.' }, { status: 400 });
    }

    const { data: userAuth } = await supabaseAdmin.auth.admin.getUserById(message.user_id);
    const email = userAuth?.user?.email;
    if (!email) {
      return Response.json({ error: 'Não foi possível encontrar o email desta pessoa.' }, { status: 404 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('full_name').eq('id', message.user_id).single();
    const firstName = (profile?.full_name || '').split(' ')[0];

    const token = randomUUID();
    await supabaseAdmin
      .from('support_requests')
      .update({ testimonial_consent: 'pedido', testimonial_consent_token: token })
      .eq('id', supportRequestId);

    const bodyHtml = `
      <p style="margin:0 0 14px; font-size:15px;">Olá${firstName ? ` ${firstName}` : ''},</p>
      <h2 style="font-size:19px; color:#332E22; margin: 0 0 6px;">Podemos partilhar a sua opinião? 💬</h2>
      <p style="margin:0 0 12px;">Ficámos muito contentes com a mensagem que nos enviou:</p>
      <div style="background:#F1E8D6; border-radius:6px; padding:12px 14px; font-size:14px; font-style:italic; color:#332E22; margin-bottom:16px;">
        "${message.message}"
      </div>
      <p style="margin:0 0 18px;">Gostaríamos de a mostrar como testemunho na página principal do More·ada, com o seu primeiro nome. Autoriza?</p>
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-right:10px;">
            <a href="${SITE_URL}/api/testimonial-consent-response?token=${token}&resposta=sim" style="display:inline-block; background:#5A6B49; color:#fff; text-decoration:none; font-weight:600; font-size:13.5px; padding:11px 20px; border-radius:6px;">Sim, autorizo</a>
          </td>
          <td>
            <a href="${SITE_URL}/api/testimonial-consent-response?token=${token}&resposta=nao" style="display:inline-block; background:#fff; color:#8a3b2a; border:1px solid #8a3b2a; text-decoration:none; font-weight:600; font-size:13.5px; padding:11px 20px; border-radius:6px;">Prefiro que não</a>
          </td>
        </tr>
      </table>
    `;

    const result = await sendEmail({
      to: email,
      subject: 'Podemos partilhar a sua opinião sobre o More·ada?',
      html: renderEmail({ preheader: 'Gostaríamos de mostrar a sua mensagem como testemunho', bodyHtml }),
    });

    if (result.error) {
      return Response.json({ error: 'Falha ao enviar email', details: result.error }, { status: 500 });
    }
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
