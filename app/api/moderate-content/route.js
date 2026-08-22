import { createClient } from '@supabase/supabase-js';

// Analisa fotos (e a planta) de um anúncio, para detetar conteúdo
// impróprio antes de o anúncio ficar visível a todos. Usa o Gemini
// só para "ver e descrever" — não gera imagens, por isso não usa a
// mesma quota (mais limitada) da geração de imagens.
//
// Se o Gemini falhar por qualquer razão (quota, indisponibilidade), o
// anúncio fica marcado para revisão manual em vez de bloquear a
// publicação — nunca impede alguém de publicar só por um erro técnico.

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
    // Exige sessão iniciada — evita que esta rota (que usa a tua quota do
    // Gemini) seja chamada livremente por qualquer pessoa, sem controlo.
    const userId = await getVerifiedUserId(request);
    if (!userId) {
      return Response.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { imageUrls } = await request.json();
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return Response.json({ flagged: false, reason: null });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ flagged: true, reason: 'Moderação não configurada — enviado para revisão manual.', error: true });
    }

    // Só verifica as 3 primeiras fotos + a planta (se vier incluída), para
    // não gastar demasiados pedidos por cada anúncio publicado.
    const toCheck = imageUrls.slice(0, 4);

    const imageParts = [];
    for (const url of toCheck) {
      try {
        const imgRes = await fetch(url);
        if (!imgRes.ok) continue;
        const buffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
        imageParts.push({ inline_data: { mime_type: mimeType, data: base64 } });
      } catch {
        // Se uma foto não carregar, ignora-a e continua com as outras.
      }
    }

    if (imageParts.length === 0) {
      return Response.json({ flagged: false, reason: null });
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: 'Estas são fotos de um anúncio de imóvel num portal imobiliário. Responde APENAS com "OK" se todas forem fotos normais de um imóvel (interior, exterior, plantas). Responde "IMPROPRIO: " seguido de um motivo muito curto, se alguma foto tiver conteúdo impróprio (nudez, violência, ofensivo, ou claramente não ser uma foto de imóvel).',
              },
              ...imageParts,
            ],
          }],
        }),
      }
    );

    if (!geminiRes.ok) {
      return Response.json({ flagged: true, reason: 'Não foi possível verificar as fotos automaticamente — enviado para revisão manual.', error: true });
    }

    const geminiData = await geminiRes.json();
    const textResult = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (textResult.toUpperCase().includes('IMPROPRIO')) {
      return Response.json({ flagged: true, reason: textResult.trim() });
    }

    return Response.json({ flagged: false, reason: null });
  } catch (err) {
    console.error('Erro na moderação de conteúdo:', err);
    // Em caso de erro inesperado, marca para revisão manual em vez de bloquear.
    return Response.json({ flagged: true, reason: 'Erro ao verificar — enviado para revisão manual.', error: true });
  }
}
