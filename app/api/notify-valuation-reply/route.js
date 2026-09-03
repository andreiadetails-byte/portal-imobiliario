import { sendEmail } from '../../../lib/sendEmail';
import { renderEmail, escapeHtml, SITE_URL } from '../../../lib/emailTemplate';

// Esta rota é chamada diretamente pelo painel de admin (não é um Database
// Webhook do Supabase) — é o admin a decidir, na hora, enviar a avaliação
// (com ou sem documento anexado) a quem a pediu.
export async function POST(request) {
  try {
    const { toEmail, toName, address, replyText, attachmentUrl } = await request.json();
    if (!toEmail) {
      return Response.json({ error: 'Falta o email de destino.' }, { status: 400 });
    }

    const bodyHtml = `
      <h2 style="font-size:19px; color:#332E22; margin: 0 0 6px;">A sua avaliação de imóvel</h2>
      <p style="font-size:13.5px; color:#6B6455; margin:0 0 12px;">Sobre: ${escapeHtml(address) || 'o imóvel que indicou'}</p>
      ${replyText ? `
        <div style="background:#F1E8D6; border-radius:6px; padding:12px 14px; font-size:14px; color:#332E22; margin-bottom: 14px;">
          ${escapeHtml(replyText)}
        </div>
      ` : ''}
      ${attachmentUrl ? `
        <p style="font-size:14px; margin: 10px 0;">
          📄 <a href="${attachmentUrl}" style="color:#B8452F; font-weight:600;">Ver documento da avaliação</a>
        </p>
      ` : ''}
    `;

    const result = await sendEmail({
      to: toEmail,
      subject: `A sua avaliação de imóvel — More·ada${toName ? ` (${toName})` : ''}`,
      html: renderEmail({
        preheader: 'A sua avaliação de imóvel está pronta',
        bodyHtml,
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
