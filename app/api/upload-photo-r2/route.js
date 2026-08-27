import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../../../lib/r2Client';

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

    const formData = await request.formData();
    const file = formData.get('file');
    const propertyId = formData.get('propertyId');

    if (!file || !propertyId) {
      return NextResponse.json({ error: 'Falta o ficheiro ou o propertyId.' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'O ficheiro tem de ser uma imagem.' }, { status: 400 });
    }

    const MAX_UPLOAD_MB = 20;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      return NextResponse.json({ error: `A imagem é demasiado grande (máximo ${MAX_UPLOAD_MB}MB).` }, { status: 400 });
    }

    // Nota: a foto já vem redimensionada e comprimida do browser (até 1920px,
    // JPEG de boa qualidade) — por isso enviamos diretamente para o R2, sem
    // processamento extra aqui no servidor por agora.
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const key = `properties/${propertyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    try {
      await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: inputBuffer,
        ContentType: file.type,
        CacheControl: 'public, max-age=31536000, immutable', // a imagem nunca muda depois de enviada, por isso o browser/CDN pode guardá-la em cache "para sempre"
      }));
    } catch (r2Err) {
      console.error('Erro ao enviar para o R2:', r2Err);
      return NextResponse.json({ error: `Falha ao enviar para o R2: ${r2Err.message}` }, { status: 500 });
    }

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error('Erro ao enviar foto para o R2:', err);
    return NextResponse.json({ error: `Não foi possível enviar a foto: ${err.message}` }, { status: 500 });
  }
}
