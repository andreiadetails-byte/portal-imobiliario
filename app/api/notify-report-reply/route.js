import { sendEmail } from '../../../lib/sendEmail';
import { renderEmail, escapeHtml, SITE_URL } from '../../../lib/emailTemplate';

// Esta rota é chamada diretamente pelo painel de admin (não é um Database
// Webhook do Supabase) — é o admin a decidir, na hora, enviar uma resposta
// a quem fez uma denúncia.
export async function POST(request) {
  try {
    const { toEmail, reportReason, replyText } = await request.json();
    if (!toEmail || !replyText) {
      return Response.json({ error: 'Faltam dados.' }, { status: 400 });
    }

    const result = await sendEmail({
      to: toEmail,
      subject: 'Resposta à sua denúncia — More·ada',
      html: renderEmail({
        preheader: 'Recebeu uma resposta à sua denúncia',
        bodyHtml: `
          <h2 style="font-size:19px; color:#332E22; margin: 0 0 6px;">Resposta à sua denúncia</h2>
          <p style="font-size:13.5px; color:#6B6455; margin:0 0 12px;">Sobre: ${escapeHtml(reportReason) || 'o anúncio que denunciou'}</p>
          <div style="background:#F1E8D6; border-radius:6px; padding:12px 14px; font-size:14px; color:#332E22;">
            ${escapeHtml(replyText)}
          </div>
        `,
        ctaText: 'Visitar o More·ada',
        ctaUrl: SITE_URL,
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
