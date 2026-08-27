import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../../../lib/r2Client';

async function getVerifiedUserId(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: { user } } = await supabase.auth.getUser(token);
  return user?.id || null;
}

// Apaga um ficheiro do R2, a partir do seu URL público — se o URL não for
// do R2 (por exemplo, uma foto antiga que ainda está no Supabase Storage),
// não faz nada aqui, essa é tratada à parte.
async function deleteFromR2IfApplicable(url) {
  if (!url || !R2_PUBLIC_URL || !url.startsWith(R2_PUBLIC_URL)) return;
  const key = url.slice(R2_PUBLIC_URL.length + 1); // +1 para tirar a barra
  try {
    await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
  } catch (err) {
    console.error('Erro ao apagar do R2:', key, err.message);
  }
}

// Apaga um ficheiro do Supabase Storage, a partir do seu URL público —
// para as fotos e ficheiros mais antigos, que ainda lá estão.
async function deleteFromSupabaseIfApplicable(url, bucket) {
  if (!url) return;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = decodeURIComponent(url.slice(idx + marker.length));
  try {
    await supabaseAdmin.storage.from(bucket).remove([path]);
  } catch (err) {
    console.error('Erro ao apagar do Supabase Storage:', path, err.message);
  }
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

    const { data: property } = await supabaseAdmin
      .from('properties')
      .select('owner_id, status, video_url, floor_plan_url, document_url')
      .eq('id', propertyId)
      .single();

    if (!property) {
      return NextResponse.json({ error: 'Imóvel não encontrado.' }, { status: 404 });
    }

    if (property.owner_id !== userId) {
      const { data: callerProfile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', userId).single();
      if (!callerProfile?.is_admin) {
        return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
      }
    }

    // Só deixa apagar definitivamente anúncios que já estão marcados como
    // eliminados — evita que alguém apague por engano um anúncio ainda ativo
    // sem primeiro passar pelo "Apagar" normal (reversível).
    if (property.status !== 'eliminado') {
      return NextResponse.json({ error: 'Este anúncio ainda não foi eliminado. Use primeiro o botão "Apagar" normal.' }, { status: 400 });
    }

    const { data: photos } = await supabaseAdmin
      .from('property_photos')
      .select('url')
      .eq('property_id', propertyId);

    // Apaga todos os ficheiros (fotos, vídeo, planta) — tanto os que estão
    // no R2 como os mais antigos, que ainda possam estar no Supabase Storage.
    const allFileUrls = [
      ...(photos || []).map((p) => p.url),
      property.video_url,
      property.floor_plan_url,
    ].filter(Boolean);

    await Promise.all(allFileUrls.map(async (url) => {
      await deleteFromR2IfApplicable(url);
      await deleteFromSupabaseIfApplicable(url, 'property-photos');
    }));

    // O documento de comprovativo de propriedade está num espaço privado à
    // parte, e é guardado como caminho, não como URL completo.
    if (property.document_url) {
      try {
        await supabaseAdmin.storage.from('property-documents').remove([property.document_url]);
      } catch (err) {
        console.error('Erro ao apagar documento:', err.message);
      }
    }

    await supabaseAdmin.from('property_photos').delete().eq('property_id', propertyId);
    await supabaseAdmin.from('properties').delete().eq('id', propertyId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Erro ao apagar definitivamente:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
