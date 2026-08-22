import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Calcula um "score do bairro" (0-100) com base no que existe perto do
// imóvel, usando dados abertos e gratuitos do OpenStreetMap (Overpass API).
// Guarda o resultado em cache no imóvel, e só volta a calcular se tiver
// mais de 90 dias (os dados do mapa não mudam com frequência).

const CACHE_DAYS = 90;

const CATEGORIES = {
  schools: { weight: 8, max: 3, label: 'Escolas' },
  pharmacies: { weight: 6, max: 2, label: 'Farmácias' },
  supermarkets: { weight: 8, max: 3, label: 'Supermercados' },
  transit: { weight: 4, max: 5, label: 'Paragens de transporte' },
  parks: { weight: 8, max: 2, label: 'Parques e jardins' },
  hospitals: { weight: 4, max: 1, label: 'Hospitais/centros de saúde' },
};

function categorize(el) {
  const tags = el.tags || {};
  if (tags.amenity === 'school') return 'schools';
  if (tags.amenity === 'pharmacy') return 'pharmacies';
  if (tags.shop === 'supermarket') return 'supermarkets';
  if (tags.highway === 'bus_stop' || tags.railway === 'tram_stop' || tags.railway === 'station' || tags.railway === 'subway_entrance') return 'transit';
  if (tags.leisure === 'park') return 'parks';
  if (tags.amenity === 'hospital' || tags.amenity === 'clinic') return 'hospitals';
  return null;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');

    if (!propertyId) {
      return Response.json({ error: 'Falta o propertyId.' }, { status: 400 });
    }

    // Vai sempre buscar as coordenadas REAIS do imóvel à base de dados — nunca
    // confia em coordenadas enviadas no pedido, que qualquer pessoa podia
    // alterar para gravar um score falso num imóvel que não é o que diz ser.
    const { data: existing } = await supabaseAdmin
      .from('properties')
      .select('latitude, longitude, neighborhood_score, neighborhood_breakdown, neighborhood_score_updated_at')
      .eq('id', propertyId)
      .maybeSingle();

    if (!existing) {
      return Response.json({ error: 'Imóvel não encontrado.' }, { status: 404 });
    }

    const latitude = existing.latitude;
    const longitude = existing.longitude;
    if (!latitude || !longitude) {
      return Response.json({ error: 'Este imóvel não tem coordenadas guardadas.' }, { status: 400 });
    }

    // Vê se já há um score em cache, ainda recente, para este imóvel.
    if (existing.neighborhood_score != null && existing.neighborhood_score_updated_at) {
      const ageDays = (Date.now() - new Date(existing.neighborhood_score_updated_at).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays < CACHE_DAYS) {
        return Response.json({ score: existing.neighborhood_score, breakdown: existing.neighborhood_breakdown, cached: true });
      }
    }

    // Pergunta ao OpenStreetMap o que existe perto (escolas, farmácias, etc.)
    const query = `
      [out:json][timeout:20];
      (
        node["amenity"="school"](around:1200,${latitude},${longitude});
        node["amenity"="pharmacy"](around:1200,${latitude},${longitude});
        node["shop"="supermarket"](around:1200,${latitude},${longitude});
        node["highway"="bus_stop"](around:600,${latitude},${longitude});
        node["railway"~"station|subway_entrance|tram_stop"](around:1500,${latitude},${longitude});
        node["leisure"="park"](around:1200,${latitude},${longitude});
        node["amenity"~"hospital|clinic"](around:3000,${latitude},${longitude});
      );
      out body;
    `;

    const osmRes = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: query,
    });

    if (!osmRes.ok) {
      return Response.json({ error: 'Não foi possível consultar o mapa neste momento.' }, { status: 502 });
    }

    const osmData = await osmRes.json();
    const counts = { schools: 0, pharmacies: 0, supermarkets: 0, transit: 0, parks: 0, hospitals: 0 };

    for (const el of osmData.elements || []) {
      const cat = categorize(el);
      if (cat) counts[cat]++;
    }

    let score = 0;
    const breakdown = {};
    for (const [key, cfg] of Object.entries(CATEGORIES)) {
      const count = counts[key] || 0;
      const points = Math.min(count, cfg.max) * cfg.weight;
      score += points;
      breakdown[key] = { count, label: cfg.label };
    }
    score = Math.min(100, Math.round(score));

    // Guarda em cache, para a próxima vez não precisar de perguntar ao mapa outra vez.
    await supabaseAdmin
      .from('properties')
      .update({ neighborhood_score: score, neighborhood_breakdown: breakdown, neighborhood_score_updated_at: new Date().toISOString() })
      .eq('id', propertyId);

    return Response.json({ score, breakdown, cached: false });
  } catch (err) {
    console.error('Erro ao calcular score do bairro:', err);
    return Response.json({ error: 'Erro ao calcular o score do bairro.' }, { status: 500 });
  }
}
