import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Chamada quando a pessoa clica em "Sim, autorizo" ou "Prefiro que não" no
// email — confirma o token antes de gravar, para ninguém conseguir alterar
// a resposta de outra pessoa só por adivinhar o link.

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const resposta = searchParams.get('resposta');

  const redirectBase = 'https://portalimobiliario.netlify.app/testemunho-resposta';

  if (!token || !['sim', 'nao'].includes(resposta)) {
    return Response.redirect(`${redirectBase}?estado=erro`, 302);
  }

  const { data: message } = await supabaseAdmin
    .from('support_requests').select('id').eq('testimonial_consent_token', token).single();

  if (!message) {
    return Response.redirect(`${redirectBase}?estado=erro`, 302);
  }

  await supabaseAdmin
    .from('support_requests')
    .update({ testimonial_consent: resposta === 'sim' ? 'sim' : 'nao' })
    .eq('id', message.id);

  return Response.redirect(`${redirectBase}?estado=${resposta}`, 302);
}
