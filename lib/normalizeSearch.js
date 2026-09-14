// Remove acentos de um texto (ex: "Fábricas" -> "Fabricas"), para comparar
// com a coluna "search_text" da base de dados, que guarda tudo já sem
// acentos e em minúsculas.
export function normalizeSearchText(text) {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
