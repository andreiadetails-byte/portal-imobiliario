// Converte uma morada em coordenadas (latitude/longitude) usando o serviço
// gratuito Nominatim (OpenStreetMap). Não precisa de chave de API.
export async function geocodeAddress(addressText) {
  try {
    const query = encodeURIComponent(`${addressText}, Portugal`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
      headers: {
        // O Nominatim exige um User-Agent identificável (a política deles
        // proíbe pedidos anónimos/genéricos) — sem isto, muitos pedidos
        // acabam bloqueados silenciosamente, especialmente vindos direto
        // do navegador.
        'User-Agent': 'MoreAdaPortalImobiliario/1.0 (contacto: geral@moreada.pt)',
      },
    });
    if (!res.ok) {
      console.error(`Geocoding: resposta ${res.status} do Nominatim para "${addressText}"`);
      return { latitude: null, longitude: null };
    }
    const data = await res.json();
    if (data && data.length > 0) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
    console.error(`Geocoding: nenhum resultado para "${addressText}"`);
  } catch (err) {
    // Se falhar, o imóvel é publicado na mesma, só fica sem coordenadas
    console.error(`Geocoding: erro de rede/pedido para "${addressText}":`, err.message);
  }
  return { latitude: null, longitude: null };
}
