import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail } from '../../../lib/sendEmail';

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

    const { data: property } = await supabaseAdmin
      .from('properties').select('typology, address').eq('id', conversation.property_id).single();
    const propertyLabel = property ? `${property.typology} · ${property.address}` : 'um imóvel';

    // Notificação no sino — cria-se sempre, mesmo que o email falhe por algum motivo.
    await supabaseAdmin.from('notifications').insert({
      user_id: recipientId,
      message: `🏠 Nova mensagem sobre o imóvel ${propertyLabel}: "${message.content.slice(0, 80)}${message.content.length > 80 ? '…' : ''}"`,
      link: `/chat?c=${message.conversation_id}`,
    });

    const { data: recipientAuth } = await supabaseAdmin.auth.admin.getUserById(recipientId);
    const email = recipientAuth?.user?.email;
    if (!email) return Response.json({ skipped: true });

    await sendEmail({
      to: email,
      subject: `Nova mensagem no chat${property ? ` — ${property.typology} · ${property.address}` : ''}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px;">
          <h2 style="color: #332E22;">Tem uma nova mensagem</h2>
          <p>"${message.content}"</p>
          <p><a href="https://portalimobiliario.netlify.app/chat?c=${message.conversation_id}" style="color:#5A6B49;">Ver e responder</a></p>
        </div>
      `,
    });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
