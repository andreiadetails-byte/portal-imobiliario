import { sendEmail } from '../../../lib/sendEmail';
import { renderEmail, SITE_URL } from '../../../lib/emailTemplate';

// Esta rota é chamada automaticamente pelo Supabase (via Database Webhook)
// sempre que uma nova linha é inserida na tabela "valuation_requests".

export async function POST(request) {
  try {
    const payload = await request.json();
    const req = payload.record;

    if (!req) {
      return Response.json({ error: 'Sem dados' }, { status: 400 });
    }

    const notifyEmail = process.env.SUPPORT_NOTIFY_EMAIL || 'geral@moreada.pt';

    const bodyHtml = `
      <h2 style="font-size:19px; color:#332E22; margin: 0 0 6px;">Novo pedido de avaliação 🏠</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 14px 0; font-size:14px;">
        <tr><td style="padding:4px 0;"><b>Morada:</b> ${req.address}</td></tr>
        <tr><td style="padding:4px 0;"><b>Tipologia:</b> ${req.typology || '—'}</td></tr>
        <tr><td style="padding:4px 0;"><b>Área:</b> ${req.area ? req.area + ' m²' : '—'}</td></tr>
        <tr><td style="padding:4px 0;"><b>Notas:</b> ${req.notes || '—'}</td></tr>
      </table>
      <div style="background:#F1E8D6; border-radius:6px; padding:12px 14px; font-size:14px;">
        <b>Nome:</b> ${req.name}<br>
        <b>Contacto:</b> ${req.contact}
      </div>
    `;

    const result = await sendEmail({
      to: notifyEmail,
      subject: `Novo pedido de avaliação — ${req.address}`,
      html: renderEmail({
        preheader: `Pedido de avaliação de ${req.name}`,
        bodyHtml,
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
