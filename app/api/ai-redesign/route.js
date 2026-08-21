import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const MONTHLY_LIMIT = 10;

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function POST(request) {
  try {
    const { userId, imageUrl, prompt } = await request.json();

    if (!userId || !imageUrl || !prompt) {
      return Response.json({ error: 'Faltam dados no pedido.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'Funcionalidade não configurada no servidor.' }, { status: 500 });
    }

    // Verifica e atualiza o limite mensal de forma atómica (evita que dois
    // pedidos em simultâneo façam a pessoa ultrapassar o limite).
    const monthKey = currentMonthKey();
    const { data: usageRow } = await supabaseAdmin
      .from('ai_redesign_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('month_key', monthKey)
      .maybeSingle();

    const currentCount = usageRow?.count || 0;
    if (currentCount >= MONTHLY_LIMIT) {
      return Response.json({ error: `Já usou as ${MONTHLY_LIMIT} imagens grátis deste mês. O limite renova no próximo mês.` }, { status: 429 });
    }

    // Vai buscar a foto original e converte para base64, como o Gemini exige.
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      return Response.json({ error: 'Não foi possível carregar a foto original.' }, { status: 400 });
    }
    const imageBuffer = await imageRes.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageRes.headers.get('content-type') || 'image/jpeg';

    // Chama a API do Gemini (modelo com capacidade de editar imagens a partir de uma referência).
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: `Edita esta foto de um imóvel, mantendo a estrutura e perspetiva da divisão, aplicando o seguinte pedido: ${prompt}` },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          }],
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Erro do Gemini:', errText);
      return Response.json({ error: 'Não foi possível gerar a imagem. Tente novamente.' }, { status: 500 });
    }

    const geminiData = await geminiRes.json();
    const imagePart = geminiData?.candidates?.[0]?.content?.parts?.find((p) => p.inline_data || p.inlineData);
    const generatedBase64 = imagePart?.inline_data?.data || imagePart?.inlineData?.data;

    if (!generatedBase64) {
      return Response.json({ error: 'O Gemini não devolveu nenhuma imagem. Tente descrever o pedido de forma diferente.' }, { status: 500 });
    }

    // Só regista o uso depois de confirmar que a imagem foi gerada com sucesso.
    await supabaseAdmin
      .from('ai_redesign_usage')
      .upsert(
        { user_id: userId, month_key: monthKey, count: currentCount + 1, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,month_key' }
      );

    return Response.json({
      image: `data:image/png;base64,${generatedBase64}`,
      remaining: MONTHLY_LIMIT - (currentCount + 1),
    });
  } catch (err) {
    console.error('Erro no redesenho com IA:', err);
    return Response.json({ error: 'Ocorreu um erro inesperado. Tente novamente.' }, { status: 500 });
  }
}
