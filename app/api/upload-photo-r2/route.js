import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../../../lib/r2Client';

// Tamanho máximo de cada lado da foto — chega perfeitamente para o ecrã de
// qualquer telemóvel ou computador, e mantém o ficheiro pequeno mesmo à
// escala de dezenas de milhares de imóveis.
const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 82;

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

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    // Redimensiona (só encolhe, nunca aumenta) e converte sempre para WebP —
    // fica visualmente igual, mas costuma pesar bastante menos do que o
    // JPEG ou PNG originais, o que poupa espaço e torna o site mais rápido.
    const optimizedBuffer = await sharp(inputBuffer)
      .rotate() // aplica a orientação correta guardada na foto (fotos de telemóvel vêm às vezes "deitadas")
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    const key = `properties/${propertyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: optimizedBuffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable', // a imagem nunca muda depois de enviada, por isso o browser/CDN pode guardá-la em cache "para sempre"
    }));

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error('Erro ao enviar foto para o R2:', err);
    return NextResponse.json({ error: 'Não foi possível enviar a foto. Tente outra vez.' }, { status: 500 });
  }
}
