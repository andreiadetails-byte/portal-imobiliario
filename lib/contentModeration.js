// Deteta linguagem ofensiva simples em texto (título/descrição de anúncios).
// Lista básica, fácil de editar/aumentar — não é perfeita, mas apanha os
// casos mais óbvios, e evita que anúncios com asneiras fiquem publicados
// sem revisão.

const OFFENSIVE_WORDS = [
  'porra', 'caralho', 'foda-se', 'fodase', 'foder', 'puta', 'puto de merda',
  'merda', 'cabrao', 'cabrão', 'cabra', 'filho da puta', 'fdp', 'otario', 'otário',
  'imbecil', 'idiota de merda', 'burro de merda', 'estupido de merda', 'estúpido de merda',
  'vai-te foder', 'vai te foder', 'corno', 'cornudo', 'puta que pariu',
  'arrombado', 'boceta', 'buceta', 'pinto pequeno', 'panasca', 'maricas',
  'nazi', 'nazista', 'hitler', 'preto de merda', 'macaco de merda',
];

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s]/g, ' ') // remove pontuação, para apanhar "porra!" ou "porra."
    .replace(/\s+/g, ' ');
}

// Devolve a lista de palavras encontradas (vazia se o texto estiver limpo).
export function findOffensiveWords(...texts) {
  const combined = normalize(texts.join(' '));
  const found = [];
  for (const word of OFFENSIVE_WORDS) {
    const normalizedWord = normalize(word);
    if (combined.includes(normalizedWord)) found.push(word);
  }
  return found;
}

export function containsOffensiveLanguage(...texts) {
  return findOffensiveWords(...texts).length > 0;
}

// Deteta links/URLs no texto — não é permitido incluir links nos anúncios
// (evita que as pessoas contornem o site, direcionando para WhatsApp,
// Instagram, outros sites, etc., em vez de usarem o chat do próprio site).
const LINK_PATTERN = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|pt|net|org|shop|store|online|site|info|biz|me)\b)/i;

export function containsLink(...texts) {
  const combined = texts.join(' ');
  return LINK_PATTERN.test(combined);
}
