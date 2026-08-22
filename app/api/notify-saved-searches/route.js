import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail } from '../../../lib/sendEmail';
import { renderEmail, propertyCardHtml, SITE_URL } from '../../../lib/emailTemplate';

// Chamada pelo Supabase (Database Webhook) sempre que um imóvel é atualizado.
// Só age quando o estado passa a "ativo" (aprovado), para não enviar alertas repetidos.

function matchesFilters(property, filters) {
  if (!filters) return false;
  if (filters.businessType && property.business_type !== filters.businessType) return false;
  if (filters.district) {
    const term = filters.district.toLowerCase();
    const inDistrict = property.district?.toLowerCase().includes(term);
    const inAddress = property.address?.toLowerCase().includes(term);
    if (!inDistrict && !inAddress) return false;
  }
  if (filters.selectedTypes?.length && !filters.selectedTypes.includes(property.property_type)) return false;
  if (filters.selectedTypologies?.length && !filters.selectedTypologies.includes(property.typology)) return false;
  if (filters.maxPrice && Number(property.price) > Number(filters.maxPrice)) return false;
  if (filters.minBedrooms && Number(property.bedrooms) < Number(filters.minBedrooms)) return false;
  if (filters.minBathrooms && Number(property.bathrooms) < Number(filters.minBathrooms)) return false;
  if (filters.minArea && Number(property.area) < Number(filters.minArea)) return false;
  return true;
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const property = payload.record;
    const oldProperty = payload.old_record;

    if (!property || property.status !== 'ativo' || oldProperty?.status === 'ativo') {
      return Response.json({ skipped: true });
    }

    const { data: photos } = await supabaseAdmin
      .from('property_photos').select('url, position').eq('property_id', property.id).order('position');
    const firstPhoto = photos?.[0]?.url;

    const { data: searches } = await supabaseAdmin
      .from('saved_searches').select('*').eq('notify', true);

    let sent = 0;
    for (const search of searches || []) {
      if (!matchesFilters(property, search.filters)) continue;

      const { data: userAuth } = await supabaseAdmin.auth.admin.getUserById(search.user_id);
      const email = userAuth?.user?.email;
      if (!email) continue;

      const { data: userProfile } = await supabaseAdmin
        .from('profiles').select('full_name').eq('id', search.user_id).single();
      const userFirstName = (userProfile?.full_name || '').split(' ')[0];

      const bodyHtml = `
        <p style="margin:0 0 14px; font-size:15px;">Olá${userFirstName ? ` ${userFirstName}` : ''},</p>
        <h2 style="font-size:19px; color:#332E22; margin: 0 0 6px;">Novo imóvel para si 🔎</h2>
        <p style="margin:0 0 4px;">Corresponde à sua pesquisa guardada "<b>${search.name}</b>".</p>
        ${propertyCardHtml({
          typology: property.typology, address: property.address, price: property.price,
          businessType: property.business_type, photoUrl: firstPhoto, propertyId: property.id,
        })}
      `;

      await sendEmail({
        to: email,
        subject: `Novo imóvel na sua pesquisa "${search.name}"`,
        html: renderEmail({
          preheader: `${property.typology} · ${property.address}`,
          bodyHtml,
          ctaText: 'Ver imóvel completo',
          ctaUrl: `${SITE_URL}/property/${property.id}`,
        }),
      });
      sent++;
    }

    return Response.json({ success: true, sent });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
