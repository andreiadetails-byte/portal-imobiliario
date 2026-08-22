import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail } from '../../../lib/sendEmail';
import { renderEmail, propertyCardHtml, escapeHtml, SITE_URL } from '../../../lib/emailTemplate';
import { isValidWebhookRequest } from '../../../lib/verifyWebhook';

// Esta rota é chamada automaticamente pelo Supabase (via Database Webhook)
// sempre que uma nova linha é inserida na tabela "leads".

export async function POST(request) {
  try {
    if (!isValidWebhookRequest(request)) {
      return Response.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const payload = await request.json();
    const lead = payload.record;

    if (!lead) {
      return Response.json({ error: 'Sem dados de lead' }, { status: 400 });
    }

    const { data: ownerAuth } = await supabaseAdmin.auth.admin.getUserById(lead.owner_id);
    const ownerEmail = ownerAuth?.user?.email;
    if (!ownerEmail) {
      return Response.json({ error: 'Não foi possível encontrar o email do anunciante' }, { status: 404 });
    }
    const { data: ownerProfile } = await supabaseAdmin
      .from('profiles').select('full_name, agency_name').eq('id', lead.owner_id).single();
    const ownerFirstName = (ownerProfile?.agency_name || ownerProfile?.full_name || '').split(' ')[0];

    const { data: property } = await supabaseAdmin
      .from('properties')
      .select('typology, address, price, business_type, property_photos(url, position)')
      .eq('id', lead.property_id).single();

    const sortedPhotos = (property?.property_photos || []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const firstPhoto = sortedPhotos[0]?.url;
    const propertyLabel = property ? `${property.typology} · ${property.address}` : 'o seu imóvel';

    const bodyHtml = `
      <p style="margin:0 0 14px; font-size:15px;">Olá${ownerFirstName ? ` ${ownerFirstName}` : ''},</p>
      <h2 style="font-size:19px; color:#332E22; margin: 0 0 6px;">Recebeu uma nova mensagem 📩</h2>
      <p style="margin:0 0 4px;">Alguém está interessado no seu anúncio.</p>
      ${property ? propertyCardHtml({
        typology: property.typology, address: property.address, price: property.price,
        businessType: property.business_type, photoUrl: firstPhoto, propertyId: lead.property_id,
      }) : ''}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 14px 0; font-size:14px;">
        <tr><td style="padding:4px 0;"><b>Nome:</b> ${escapeHtml(lead.name)}</td></tr>
        <tr><td style="padding:4px 0;"><b>Telefone:</b> ${escapeHtml(lead.phone) || '—'}</td></tr>
        <tr><td style="padding:4px 0;"><b>Email:</b> ${escapeHtml(lead.email) || '—'}</td></tr>
      </table>
      <div style="background:#F1E8D6; border-radius:6px; padding:12px 14px; font-size:14px; font-style:italic; color:#332E22;">
        "${escapeHtml(lead.message) || 'Sem mensagem adicional.'}"
      </div>
    `;

    const result = await sendEmail({
      to: ownerEmail,
      subject: `Nova mensagem sobre ${propertyLabel}`,
      html: renderEmail({
        preheader: `${escapeHtml(lead.name)} está interessado no seu imóvel`,
        bodyHtml,
        ctaText: 'Ver e responder',
        ctaUrl: `${SITE_URL}/dashboard`,
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
