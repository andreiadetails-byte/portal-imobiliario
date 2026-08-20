// ============================================================
// MORADA — script de tradução em lote
// Traduz o título e a descrição de todos os anúncios que ainda
// não têm tradução guardada, para os 6 idiomas do site.
//
// COMO USAR:
// 1. Coloca este ficheiro na pasta morada-app (ao lado do package.json)
// 2. Corre: npm install @supabase/supabase-js dotenv node-fetch@2
// 3. Corre: node translate-existing-properties.js
// 4. Demora algum tempo (depende de quantos anúncios tens e do limite
//    de pedidos por segundo do DeepL). Podes correr outra vez se parar
//    a meio — salta os que já têm tradução.
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !DEEPL_API_KEY) {
  console.error('Faltam variáveis no .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou DEEPL_API_KEY).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const isFree = DEEPL_API_KEY.endsWith(':fx');
const DEEPL_ENDPOINT = isFree ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';

const TARGET_LANGS = { en: 'EN-GB', es: 'ES', fr: 'FR', de: 'DE', nl: 'NL', ru: 'RU' };

const LOG_FILE = 'translate-log.txt';
function log(msg) {
  console.log(msg);
  fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function translateText(text, targetLang) {
  if (!text || !text.trim()) return '';
  const res = await fetch(DEEPL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: [text], source_lang: 'PT', target_lang: targetLang }),
  });
  if (!res.ok) throw new Error(`DeepL HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.translations?.[0]?.text || '';
}

async function translateProperty(property, attempt = 1) {
  try {
    const titleTranslations = {};
    const descriptionTranslations = {};

    for (const [langKey, deeplCode] of Object.entries(TARGET_LANGS)) {
      if (property.title) titleTranslations[langKey] = await translateText(property.title, deeplCode);
      if (property.description) descriptionTranslations[langKey] = await translateText(property.description, deeplCode);
    }

    const { error } = await supabase
      .from('properties')
      .update({ title_translations: titleTranslations, description_translations: descriptionTranslations })
      .eq('id', property.id);

    if (error) throw error;
    return true;
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 2000));
      return translateProperty(property, attempt + 1);
    }
    log(`❌ Falhou (imóvel ${property.id}): ${err.message}`);
    return false;
  }
}

async function main() {
  log(`\n=== Início da tradução em lote — ${new Date().toLocaleString('pt-PT')} ===`);

  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, title, description, description_translations')
    .or('description_translations.is.null,description_translations.eq.{}');

  if (error) {
    log(`Erro ao carregar anúncios: ${error.message}`);
    process.exit(1);
  }

  log(`Encontrados ${properties.length} anúncios por traduzir.`);

  let done = 0;
  let failed = 0;

  for (const property of properties) {
    const ok = await translateProperty(property);
    if (ok) done++; else failed++;

    if ((done + failed) % 10 === 0 || (done + failed) === properties.length) {
      log(`Progresso: ${done + failed}/${properties.length} (✓ ${done}  ✗ ${failed})`);
    }

    // Pausa entre pedidos, para respeitar os limites do DeepL.
    await new Promise((r) => setTimeout(r, 300));
  }

  log(`\n=== Concluído: ${done} anúncios traduzidos, ${failed} falharam ===`);
}

main();
