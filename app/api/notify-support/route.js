import { sendEmail } from '../../../lib/sendEmail';
import { renderEmail, escapeHtml, SITE_URL } from '../../../lib/emailTemplate';
import { isValidWebhookRequest } from '../../../lib/verifyWebhook';

export async function POST(request) {
  try {
    if (!isValidWebhookRequest(request)) {
      return Response.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const payload = await request.json();
    const req = payload.record;

    if (!req) {
      return Response.json({ error: 'Sem dados' }, { status: 400 });
    }

    const notifyEmail = process.env.SUPPORT_NOTIFY_EMAIL || 'geral@moreada.pt';

    const bodyHtml = `
      <h2 style="font-size:19px; color:#332E22; margin: 0 0 6px;">💬 Nova mensagem de suporte</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 14px 0; font-size:14px;">
        <tr><td style="padding:4px 0;"><b>Nome:</b> ${escapeHtml(req.name) || 'não fornecido'}</td></tr>
        <tr><td style="padding:4px 0;"><b>Contacto:</b> ${escapeHtml(req.contact) || 'não fornecido'}</td></tr>
        <tr><td style="padding:4px 0;"><b>Com conta no site:</b> ${req.user_id ? 'sim' : 'não'}</td></tr>
      </table>
      <p style="margin:16px 0 4px; font-size:13.5px; color:#6B6455;">Mensagem:</p>
      <div style="background:#F1E8D6; border-radius:6px; padding:12px 14px; font-size:14px; color:#332E22;">
        ${escapeHtml(req.message)}
      </div>
    `;

    const result = await sendEmail({
      to: notifyEmail,
      subject: `💬 Nova mensagem de suporte de ${req.name || 'alguém'}`,
      html: renderEmail({
        preheader: `Nova mensagem de suporte de ${req.name || 'alguém'}`,
        bodyHtml,
        ctaText: 'Responder no painel de admin',
        ctaUrl: `${SITE_URL}/admin?tab=suporte`,
      }),
    });

    if (result.error) {
      return Response.json({ error: 'Falha ao enviar email', details: result.error }, { status: 500 });
    }
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
