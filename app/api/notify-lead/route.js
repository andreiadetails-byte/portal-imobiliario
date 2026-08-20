import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail } from '../../../lib/sendEmail';

// Esta rota é chamada automaticamente pelo Supabase (via Database Webhook)
// sempre que uma nova linha é inserida na tabela "leads".

export async function POST(request) {
  try {
    const payload = await request.json();
    const lead = payload.record; // o Supabase envia a nova linha em "record"

    if (!lead) {
      return Response.json({ error: 'Sem dados de lead' }, { status: 400 });
    }

    // 1. Vai buscar o email do dono do imóvel (usando a service_role key, com acesso total)
    const { data: ownerAuth } = await supabaseAdmin.auth.admin.getUserById(lead.owner_id);
    const ownerEmail = ownerAuth?.user?.email;

    if (!ownerEmail) {
      return Response.json({ error: 'Não foi possível encontrar o email do anunciante' }, { status: 404 });
    }

    // 2. Vai buscar dados do imóvel, para a mensagem ficar mais clara
    const { data: property } = await supabaseAdmin
      .from('properties').select('typology, address').eq('id', lead.property_id).single();

    const propertyLabel = property ? `${property.typology} · ${property.address}` : 'o seu imóvel';

    // 3. Envia o email através do Gmail
    const result = await sendEmail({
      to: ownerEmail,
      subject: `Nova mensagem sobre ${propertyLabel}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px;">
          <h2 style="color: #332E22;">Recebeu uma nova mensagem</h2>
          <p><b>Imóvel:</b> ${propertyLabel}</p>
          <p><b>Nome:</b> ${lead.name}</p>
          <p><b>Telefone:</b> ${lead.phone || '—'}</p>
          <p><b>Mensagem:</b> ${lead.message || '—'}</p>
          <p style="margin-top: 24px;">
            <a href="https://portalimobiliario.netlify.app/dashboard" style="color: #5A6B49;">Ver no painel do Morada</a>
          </p>
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
