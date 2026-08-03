// Esta rota é chamada automaticamente pelo Supabase (via Database Webhook)
// sempre que uma nova linha é inserida na tabela "support_requests".

export async function POST(request) {
  try {
    const payload = await request.json();
    const req = payload.record;

    if (!req) {
      return Response.json({ error: 'Sem dados' }, { status: 400 });
    }

    const notifyEmail = process.env.SUPPORT_NOTIFY_EMAIL || 'andreiadetails@gmail.com';

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Morada <onboarding@resend.dev>',
        to: notifyEmail,
        subject: `Nova mensagem de suporte (via ${req.agent_name})`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px;">
            <h2 style="color: #332E22;">Nova mensagem de suporte</h2>
            <p><b>Agente contactada no site:</b> ${req.agent_name}</p>
            <p><b>Nome:</b> ${req.name}</p>
            <p><b>Contacto:</b> ${req.contact || '—'}</p>
            <p><b>Mensagem:</b> ${req.message}</p>
          </div>
        `,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      return Response.json({ error: 'Falha ao enviar email', details: errText }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
