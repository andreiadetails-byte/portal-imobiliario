import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail } from '../../../lib/sendEmail';
import { renderEmail, escapeHtml, SITE_URL } from '../../../lib/emailTemplate';
import { isValidWebhookRequest } from '../../../lib/verifyWebhook';

export async function POST(request) {
  try {
    if (!isValidWebhookRequest(request)) {
      return Response.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const payload = await request.json();
    const reply = payload.record;
    if (!reply) return Response.json({ error: 'Sem dados' }, { status: 400 });

    const { data: original } = await supabaseAdmin
      .from('support_requests').select('name, contact, user_id').eq('id', reply.support_request_id).single();

    if (reply.sender_role === 'user') {
      // O utilizador respondeu — avisa o admin.
      const notifyEmail = process.env.SUPPORT_NOTIFY_EMAIL || 'geral@moreada.pt';
      const result = await sendEmail({
        to: notifyEmail,
        subject: `💬 Nova resposta de ${original?.name || 'alguém'} no suporte`,
        html: renderEmail({
          preheader: 'Nova resposta numa conversa de suporte',
          bodyHtml: `
            <h2 style="font-size:19px; color:#332E22; margin: 0 0 6px;">💬 Nova resposta no suporte</h2>
            <p style="font-size:13.5px; color:#6B6455;">De: ${escapeHtml(original?.name) || 'alguém'} (${escapeHtml(original?.contact) || 'sem contacto'})</p>
            <div style="background:#F1E8D6; border-radius:6px; padding:12px 14px; font-size:14px; color:#332E22; margin-top:10px;">
              ${escapeHtml(reply.message)}
            </div>
          `,
          ctaText: 'Responder no painel de admin',
          ctaUrl: `${SITE_URL}/admin?tab=suporte`,
        }),
      });
      if (result.error) return Response.json({ error: 'Falha ao enviar email', details: result.error }, { status: 500 });
    } else if (reply.sender_role === 'admin' && original?.user_id) {
      // O admin respondeu — avisa o utilizador, se tiver conta e email.
      const { data: profile } = await supabaseAdmin.from('profiles').select('email').eq('id', original.user_id).single();
      if (profile?.email) {
        const result = await sendEmail({
          to: profile.email,
          subject: '💬 Recebeu uma resposta do suporte More·ada',
          html: renderEmail({
            preheader: 'Recebeu uma resposta do suporte',
            bodyHtml: `
              <h2 style="font-size:19px; color:#332E22; margin: 0 0 6px;">💬 Resposta do suporte</h2>
              <div style="background:#F1E8D6; border-radius:6px; padding:12px 14px; font-size:14px; color:#332E22; margin-top:10px;">
                ${escapeHtml(reply.message)}
              </div>
            `,
            ctaText: 'Ver e responder',
            ctaUrl: `${SITE_URL}/mensagens-suporte`,
          }),
        });
        if (result.error) return Response.json({ error: 'Falha ao enviar email', details: result.error }, { status: 500 });
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
