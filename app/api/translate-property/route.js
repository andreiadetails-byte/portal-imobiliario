import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { translateToAllLanguages } from '../../../lib/translateText';

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
      return NextResponse.json({ error: 'Precisa de ter sessão iniciada.' }, { status: 401 });
    }

    const { propertyId } = await request.json();
    if (!propertyId) {
      return NextResponse.json({ error: 'Falta o propertyId.' }, { status: 400 });
    }

    // Nunca confia no título/descrição vindos do pedido — vai sempre buscar o
    // texto REAL já gravado no imóvel, e confirma que quem pediu é mesmo o
    // dono (ou admin). Isto impede que alguém injete texto traduzido
    // arbitrário em anúncios que não são seus.
    const { data: property } = await supabaseAdmin
      .from('properties').select('title, description, owner_id').eq('id', propertyId).single();

    if (!property) {
      return NextResponse.json({ error: 'Imóvel não encontrado.' }, { status: 404 });
    }

    if (property.owner_id !== userId) {
      const { data: callerProfile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', userId).single();
      if (!callerProfile?.is_admin) {
        return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
      }
    }

    const [titleTranslations, descriptionTranslations] = await Promise.all([
      property.title ? translateToAllLanguages(property.title) : Promise.resolve({}),
      property.description ? translateToAllLanguages(property.description) : Promise.resolve({}),
    ]);

    const { error } = await supabaseAdmin
      .from('properties')
      .update({
        title_translations: titleTranslations,
        description_translations: descriptionTranslations,
      })
      .eq('id', propertyId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
