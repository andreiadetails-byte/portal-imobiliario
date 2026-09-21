import { sendEmail } from '../../../lib/sendEmail';
import { requireAdmin } from '../../../lib/requireAdmin';

// Só para a administradora: envia um email de teste e diz exatamente o que
// aconteceu — incluindo que servidor de envio o site está mesmo a usar
// (sem nunca mostrar a password). Serve para descobrir se a configuração
// do Netlify está a ser aplicada.
export async function POST(request) {
  try {
    const user = await requireAdmin(request);
    if (!user) return Response.json({ error: 'Não autorizado.' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const to = String(body.to || user.email || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      return Response.json({ error: 'Endereço de email inválido.' }, { status: 400 });
    }

    const usingSmtp = !!process.env.SMTP_HOST;
    const config = {
      usa: usingSmtp ? 'SMTP' : 'Gmail (alternativa antiga)',
      host: process.env.SMTP_HOST || null,
      porta: process.env.SMTP_PORT || null,
      seguro: process.env.SMTP_SECURE || null,
      utilizador: process.env.SMTP_USER || null,
      remetente: process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || null,
      temPassword: !!process.env.SMTP_PASSWORD,
    };

    const result = await sendEmail({
      to,
      subject: 'Teste de envio — More·ada',
      html: '<p>Se estás a ler isto, o envio de emails do site está a funcionar.</p>',
    });

    return Response.json({ success: !!result.success, error: result.error || null, to, config });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
