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

// Regras próprias para cada tipo de ficheiro que este anúncio pode ter.
const FILE_RULES = {
  photo: { folder: 'photos', allowedPrefix: 'image/', maxMB: 20, label: 'A imagem' },
  video: { folder: 'videos', allowedPrefix: 'video/', maxMB: 100, label: 'O vídeo' },
  plan: { folder: 'plans', allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], maxMB: 20, label: 'A planta' },
};

function extensionFor(mimeType) {
  const map = {
    'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg',
    'application/pdf': 'pdf', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
  };
  return map[mimeType] || mimeType.split('/')[1] || 'bin';
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
    const type = formData.get('type') || 'photo';

    if (!file || !propertyId) {
      return NextResponse.json({ error: 'Falta o ficheiro ou o propertyId.' }, { status: 400 });
    }

    const rules = FILE_RULES[type];
    if (!rules) {
      return NextResponse.json({ error: 'Tipo de ficheiro desconhecido.' }, { status: 400 });
    }

    const isAllowedType = rules.allowedPrefix
      ? file.type.startsWith(rules.allowedPrefix)
      : rules.allowedTypes.includes(file.type);
    if (!isAllowedType) {
      return NextResponse.json({ error: `${rules.label} tem um formato não suportado.` }, { status: 400 });
    }

    if (file.size > rules.maxMB * 1024 * 1024) {
      return NextResponse.json({ error: `${rules.label} é demasiado grande (máximo ${rules.maxMB}MB).` }, { status: 400 });
    }

    // Nota: fotos e vídeos já vêm redimensionados/verificados no browser —
    // por isso enviamos diretamente para o R2, sem processamento extra aqui.
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const ext = extensionFor(file.type);
    const key = `properties/${propertyId}/${rules.folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    try {
      await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: inputBuffer,
        ContentType: file.type,
        CacheControl: 'public, max-age=31536000, immutable', // o ficheiro nunca muda depois de enviado, por isso o browser/CDN pode guardá-lo em cache "para sempre"
      }));
    } catch (r2Err) {
      console.error('Erro ao enviar para o R2:', r2Err);
      return NextResponse.json({ error: `Falha ao enviar para o R2: ${r2Err.message}` }, { status: 500 });
    }

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error('Erro ao enviar ficheiro para o R2:', err);
    return NextResponse.json({ error: `Não foi possível enviar o ficheiro: ${err.message}` }, { status: 500 });
  }
}
