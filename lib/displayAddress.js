// Decide o que mostrar como localização de um imóvel:
// morada completa (se o anunciante autorizou) ou só a localidade/concelho.
export function displayAddress(property) {
  if (property.show_full_address === false) {
    return property.parish || property.municipality || property.district || '';
  }
  return property.address;
}
