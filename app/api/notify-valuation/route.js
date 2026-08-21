import { sendEmail } from '../../../lib/sendEmail';

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

    const result = await sendEmail({
      to: notifyEmail,
      subject: `Novo pedido de avaliação — ${req.address}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px;">
          <h2 style="color: #332E22;">Novo pedido de avaliação de imóvel</h2>
          <p><b>Morada:</b> ${req.address}</p>
          <p><b>Tipologia:</b> ${req.typology || '—'}</p>
          <p><b>Área:</b> ${req.area ? req.area + ' m²' : '—'}</p>
          <p><b>Notas / características:</b> ${req.notes || '—'}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
          <p><b>Nome:</b> ${req.name}</p>
          <p><b>Contacto:</b> ${req.contact}</p>
        </div>
      `,
    });

    if (result.error) {
      return Response.json({ error: 'Falha ao enviar email', details: result.error }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
