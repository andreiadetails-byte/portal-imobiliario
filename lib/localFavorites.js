// Favoritos para quem ainda não tem conta — guardados só no telemóvel/
// computador da pessoa (localStorage), não no Supabase. Assim que a pessoa
// cria conta ou inicia sessão, estes favoritos são "migrados" para a conta
// dela automaticamente (ver migrateLocalFavoritesToAccount).

const STORAGE_KEY = 'morada_local_favorites';

export function getLocalFavoriteIds() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isLocalFavorite(propertyId) {
  return getLocalFavoriteIds().includes(propertyId);
}

export function toggleLocalFavorite(propertyId) {
  const current = getLocalFavoriteIds();
  const next = current.includes(propertyId)
    ? current.filter((id) => id !== propertyId)
    : [...current, propertyId];
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function clearLocalFavorites() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
}

// Chamada depois de login/registo com sucesso — junta os favoritos guardados
// localmente à conta da pessoa (evitando duplicados), e depois limpa a
// cópia local, já que passam a viver só na conta a partir daqui.
export async function migrateLocalFavoritesToAccount(supabase, userId) {
  const localIds = getLocalFavoriteIds();
  if (localIds.length === 0) return;

  const { data: existing } = await supabase.from('favorites').select('property_id').eq('user_id', userId);
  const existingIds = new Set((existing || []).map((f) => f.property_id));
  const newIds = localIds.filter((id) => !existingIds.has(id));

  if (newIds.length > 0) {
    const { data: propsData } = await supabase.from('properties').select('id, price').in('id', newIds);
    const priceById = Object.fromEntries((propsData || []).map((p) => [p.id, p.price]));
    const toInsert = newIds.map((property_id) => ({ user_id: userId, property_id, price_at_save: priceById[property_id] ?? null }));
    await supabase.from('favorites').insert(toInsert);
  }
  clearLocalFavorites();
}
