import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(request) {
  try {
    const payload = await request.json();
    const report = payload.record;

    if (!report) {
      return Response.json({ error: 'Sem dados' }, { status: 400 });
    }

    const { data: property } = await supabaseAdmin
      .from('properties').select('typology, address, owner_id').eq('id', report.property_id).single();

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
        subject: `⚠️ Denúncia de anúncio — ${property ? property.address : report.property_id}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px;">
            <h2 style="color: #332E22;">Nova denúncia de anúncio</h2>
            <p><b>Imóvel:</b> ${property ? `${property.typology} · ${property.address}` : report.property_id}</p>
            <p><b>Motivo:</b> ${report.reason}</p>
            <p><b>Detalhes:</b> ${report.details || '—'}</p>
            <p><b>Contacto de quem denunciou (interno):</b> ${report.reporter_contact || 'não fornecido'}</p>
            <p style="margin-top:16px; font-size:12px; color:#8a3b2a;">
              Nota: os dados de quem denunciou não são partilhados com o anunciante.
            </p>
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
