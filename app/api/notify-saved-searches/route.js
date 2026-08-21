import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail } from '../../../lib/sendEmail';

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

    // Só dispara quando o imóvel ACABA de passar a "ativo" (não em todas as edições)
    if (!property || property.status !== 'ativo' || oldProperty?.status === 'ativo') {
      return Response.json({ skipped: true });
    }

    const { data: searches } = await supabaseAdmin
      .from('saved_searches').select('*').eq('notify', true);

    let sent = 0;
    for (const search of searches || []) {
      if (!matchesFilters(property, search.filters)) continue;

      const { data: userAuth } = await supabaseAdmin.auth.admin.getUserById(search.user_id);
      const email = userAuth?.user?.email;
      if (!email) continue;

      await sendEmail({
        to: email,
        subject: `Novo imóvel na sua pesquisa "${search.name}"`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px;">
            <h2 style="color: #332E22;">Novo imóvel que corresponde à sua pesquisa</h2>
            <p><b>${property.typology} · ${property.address}</b></p>
            <p>${Number(property.price).toLocaleString('pt-PT')} €</p>
            <p><a href="https://portalimobiliario.netlify.app/property/${property.id}" style="color:#5A6B49;">Ver imóvel</a></p>
          </div>
        `,
      });
      sent++;
    }

    return Response.json({ success: true, sent });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
