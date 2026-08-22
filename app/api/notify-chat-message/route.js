import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail } from '../../../lib/sendEmail';
import { renderEmail, propertyCardHtml, SITE_URL } from '../../../lib/emailTemplate';

// Chamada pelo Supabase (Database Webhook) sempre que uma nova mensagem de chat é inserida.
export async function POST(request) {
  try {
    const payload = await request.json();
    const message = payload.record;
    if (!message) return Response.json({ error: 'Sem dados' }, { status: 400 });

    const { data: conversation } = await supabaseAdmin
      .from('conversations').select('buyer_id, seller_id, property_id').eq('id', message.conversation_id).single();
    if (!conversation) return Response.json({ skipped: true });

    const recipientId = message.sender_id === conversation.buyer_id ? conversation.seller_id : conversation.buyer_id;

    // Vai buscar o nome, email e telefone de quem enviou a mensagem, para o
    // destinatário saber logo quem é, sem precisar de abrir o site.
    const { data: senderProfile } = await supabaseAdmin
      .from('profiles').select('full_name, agency_name, phone_real').eq('id', message.sender_id).single();
    const { data: senderAuth } = await supabaseAdmin.auth.admin.getUserById(message.sender_id);
    const senderName = senderProfile?.agency_name || senderProfile?.full_name || 'Um utilizador';
    const senderEmail = senderAuth?.user?.email;
    const senderPhone = senderProfile?.phone_real;

    const { data: property } = await supabaseAdmin
      .from('properties')
      .select('typology, address, price, business_type, property_photos(url, position)')
      .eq('id', conversation.property_id).single();
    const propertyLabel = property ? `${property.typology} · ${property.address}` : 'um imóvel';
    const sortedPhotos = (property?.property_photos || []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const firstPhoto = sortedPhotos[0]?.url;

    // Notificação no sino — cria-se sempre, mesmo que o email falhe por algum motivo.
    await supabaseAdmin.from('notifications').insert({
      user_id: recipientId,
      message: `🏠 Nova mensagem sobre o imóvel ${propertyLabel}: "${message.content.slice(0, 80)}${message.content.length > 80 ? '…' : ''}"`,
      link: `/chat?c=${message.conversation_id}`,
    });

    const { data: recipientAuth } = await supabaseAdmin.auth.admin.getUserById(recipientId);
    const email = recipientAuth?.user?.email;
    if (!email) return Response.json({ skipped: true });

    const { data: recipientProfile } = await supabaseAdmin
      .from('profiles').select('full_name, agency_name').eq('id', recipientId).single();
    const recipientFirstName = (recipientProfile?.agency_name || recipientProfile?.full_name || '').split(' ')[0];

    const bodyHtml = `
      <p style="margin:0 0 14px; font-size:15px;">Olá${recipientFirstName ? ` ${recipientFirstName}` : ''},</p>
      <h2 style="font-size:19px; color:#332E22; margin: 0 0 6px;">Tem uma nova mensagem 💬</h2>
      ${property ? propertyCardHtml({
        typology: property.typology, address: property.address, price: property.price,
        businessType: property.business_type, photoUrl: firstPhoto, propertyId: conversation.property_id,
      }) : ''}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 10px 0;">
        <tr><td style="padding:4px 0; font-size:13.5px;"><b>Nome:</b> ${senderName}</td></tr>
        ${senderEmail ? `<tr><td style="padding:4px 0; font-size:13.5px;"><b>Email:</b> ${senderEmail}</td></tr>` : ''}
        ${senderPhone ? `<tr><td style="padding:4px 0; font-size:13.5px;"><b>Telefone:</b> ${senderPhone}</td></tr>` : ''}
      </table>
      <div style="background:#F1E8D6; border-radius:6px; padding:12px 14px; font-size:14px; font-style:italic; color:#332E22;">
        "${message.content}"
      </div>
    `;

    await sendEmail({
      to: email,
      subject: `Nova mensagem de ${senderName}${property ? ` — ${property.typology} · ${property.address}` : ''}`,
      html: renderEmail({
        preheader: `${senderName}: ${message.content.slice(0, 90)}`,
        bodyHtml,
        ctaText: 'Ver e responder',
        ctaUrl: `${SITE_URL}/chat?c=${message.conversation_id}`,
      }),
    });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
