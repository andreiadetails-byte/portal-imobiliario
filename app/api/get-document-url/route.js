import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Gera um link temporário (válido por poucos minutos) para ver o documento
// de comprovação de um imóvel — só entrega esse link a quem é o dono do
// imóvel, ou a um administrador. Ninguém mais consegue ver o documento,
// mesmo que descubra o endereço desta rota.

async function getVerifiedUserId(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: { user } } = await supabase.auth.getUser(token);
  return user?.id || null;
}

export async function POST(request) {
  try {
    const userId = await getVerifiedUserId(request);
    if (!userId) {
      return Response.json({ error: 'Precisa de ter sessão iniciada.' }, { status: 401 });
    }

    const { propertyId } = await request.json();
    if (!propertyId) {
      return Response.json({ error: 'Falta o propertyId.' }, { status: 400 });
    }

    const { data: property } = await supabaseAdmin
      .from('properties').select('owner_id, document_url').eq('id', propertyId).single();

    if (!property || !property.document_url) {
      return Response.json({ error: 'Não há documento para este imóvel.' }, { status: 404 });
    }

    if (property.owner_id !== userId) {
      const { data: callerProfile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', userId).single();
      if (!callerProfile?.is_admin) {
        return Response.json({ error: 'Não autorizado.' }, { status: 403 });
      }
    }

    const { data: signedUrlData, error } = await supabaseAdmin.storage
      .from('property-documents')
      .createSignedUrl(property.document_url, 300); // válido 5 minutos

    if (error || !signedUrlData) {
      return Response.json({ error: 'Não foi possível gerar o link do documento.' }, { status: 500 });
    }

    return Response.json({ url: signedUrlData.signedUrl });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
