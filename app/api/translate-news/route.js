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

    // Só administradores podem traduzir notícias — é conteúdo editorial do
    // site, não algo que qualquer utilizador publica.
    const { data: callerProfile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', userId).single();
    if (!callerProfile?.is_admin) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const { newsId } = await request.json();
    if (!newsId) {
      return NextResponse.json({ error: 'Falta o newsId.' }, { status: 400 });
    }

    // Vai sempre buscar o texto real já gravado na notícia, nunca confia no
    // que vier no pedido.
    const { data: newsItem } = await supabaseAdmin
      .from('news').select('title, body').eq('id', newsId).single();

    if (!newsItem) {
      return NextResponse.json({ error: 'Notícia não encontrada.' }, { status: 404 });
    }

    const [titleTranslations, bodyTranslations] = await Promise.all([
      newsItem.title ? translateToAllLanguages(newsItem.title) : Promise.resolve({}),
      newsItem.body ? translateToAllLanguages(newsItem.body) : Promise.resolve({}),
    ]);

    const { error } = await supabaseAdmin
      .from('news')
      .update({
        title_translations: titleTranslations,
        body_translations: bodyTranslations,
      })
      .eq('id', newsId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
