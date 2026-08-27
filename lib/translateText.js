// Traduz texto usando a API do DeepL.
// Precisa de DEEPL_API_KEY definida no .env.local e no Netlify.

// Idiomas do site que precisam de tradução (o português é sempre o original).
export const TARGET_LANGS = {
  en: 'EN-GB',
  es: 'ES',
  fr: 'FR',
  de: 'DE',
  nl: 'NL',
  ru: 'RU',
  it: 'IT',
  pl: 'PL',
  sv: 'SV',
  uk: 'UK',
  zh: 'ZH',
  ar: 'AR',
};

export async function translateText(text, targetLangCode) {
  if (!text || !text.trim()) return '';
  if (!process.env.DEEPL_API_KEY) {
    console.error('DEEPL_API_KEY não está definida.');
    return text;
  }

  // Chaves ":fx" (plano gratuito) usam o endpoint api-free; chaves pagas usam api.
  const isFree = process.env.DEEPL_API_KEY.endsWith(':fx');
  const endpoint = isFree ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        source_lang: 'PT',
        target_lang: targetLangCode,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Erro do DeepL:', res.status, errText);
      return text;
    }

    const data = await res.json();
    return data.translations?.[0]?.text || text;
  } catch (err) {
    console.error('Erro ao traduzir:', err.message);
    return text;
  }
}

// Traduz título e descrição para todos os idiomas do site de uma vez.
export async function translateToAllLanguages(text) {
  const results = {};
  for (const [langKey, deeplCode] of Object.entries(TARGET_LANGS)) {
    results[langKey] = await translateText(text, deeplCode);
  }
  return results;
}
