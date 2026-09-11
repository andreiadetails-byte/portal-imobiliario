import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { geocodeAddress } from '../../../lib/geocode';

// Calcula e guarda a latitude/longitude de UM imóvel. Corre no servidor
// (não no navegador), porque o serviço de geocodificação (Nominatim) exige
// um cabeçalho "User-Agent" identificável, que os navegadores nunca
// permitem definir por razões de segurança — feito do lado do navegador,
// os pedidos eram silenciosamente rejeitados.
//
// É chamada um imóvel de cada vez (não todos de uma só chamada), para
// nunca correr o risco de a função do servidor demorar demasiado tempo se
// houver muitos imóveis em falta.

async function isCallerAdmin(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return false;

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return false;

  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  return !!profile?.is_admin;
}

export async function POST(request) {
  try {
    if (!(await isCallerAdmin(request))) {
      return Response.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const { propertyId } = await request.json();
    if (!propertyId) {
      return Response.json({ error: 'Falta o ID do imóvel.' }, { status: 400 });
    }

    const { data: p } = await supabaseAdmin
      .from('properties')
      .select('id, address, municipality, parish, district')
      .eq('id', propertyId)
      .single();

    if (!p) {
      return Response.json({ error: 'Imóvel não encontrado.' }, { status: 404 });
    }

    const fullAddress = [p.address, p.parish, p.municipality, p.district].filter(Boolean).join(', ');
    const { latitude, longitude } = await geocodeAddress(fullAddress);

    if (latitude == null || longitude == null) {
      return Response.json({ success: false, address: fullAddress });
    }

    await supabaseAdmin.from('properties').update({ latitude, longitude }).eq('id', propertyId);
    return Response.json({ success: true, latitude, longitude });
  } catch (err) {
    console.error('Erro ao geocodificar imóvel:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
