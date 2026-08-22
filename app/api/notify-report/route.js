import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail } from '../../../lib/sendEmail';
import { renderEmail, propertyCardHtml, SITE_URL } from '../../../lib/emailTemplate';

export async function POST(request) {
  try {
    const payload = await request.json();
    const report = payload.record;

    if (!report) {
      return Response.json({ error: 'Sem dados' }, { status: 400 });
    }

    const { data: property } = await supabaseAdmin
      .from('properties')
      .select('typology, address, price, business_type, owner_id, property_photos(url, position)')
      .eq('id', report.property_id).single();

    const sortedPhotos = (property?.property_photos || []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const firstPhoto = sortedPhotos[0]?.url;
    const notifyEmail = process.env.SUPPORT_NOTIFY_EMAIL || 'geral@moreada.pt';

    const bodyHtml = `
      <h2 style="font-size:19px; color:#8a3b2a; margin: 0 0 6px;">⚠️ Nova denúncia de anúncio</h2>
      ${property ? propertyCardHtml({
        typology: property.typology, address: property.address, price: property.price,
        businessType: property.business_type, photoUrl: firstPhoto, propertyId: report.property_id,
      }) : `<p>Imóvel: ${report.property_id}</p>`}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 14px 0; font-size:14px;">
        <tr><td style="padding:4px 0;"><b>Motivo:</b> ${report.reason}</td></tr>
        <tr><td style="padding:4px 0;"><b>Detalhes:</b> ${report.details || '—'}</td></tr>
        <tr><td style="padding:4px 0;"><b>Nome de quem denunciou:</b> ${report.reporter_name || 'não fornecido'}</td></tr>
        <tr><td style="padding:4px 0;"><b>Contacto (interno):</b> ${report.reporter_contact || 'não fornecido'}</td></tr>
      </table>
      <p style="font-size:11.5px; color:#8a3b2a;">
        Nota: os dados de quem denunciou não são partilhados com o anunciante.
      </p>
    `;

    const result = await sendEmail({
      to: notifyEmail,
      subject: `⚠️ Denúncia de anúncio — ${property ? property.address : report.property_id}`,
      html: renderEmail({
        preheader: `Denúncia: ${report.reason}`,
        bodyHtml,
        ctaText: 'Gerir no painel de admin',
        ctaUrl: `${SITE_URL}/admin?tab=denuncias`,
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
