import { XMLParser } from 'fast-xml-parser';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

// Lê um feed XML de CRM imobiliário e cria/atualiza os anúncios do
// utilizador no More·ada. Suporta as variações de nomes de campos mais
// comuns entre os CRMs portugueses (cada um tem o seu formato próprio),
// tentando várias hipóteses de nome para cada informação.
//
// Chamada pelo próprio utilizador (botão "Sincronizar agora"), com o seu
// token de sessão — por isso confirmamos aqui que quem pede é dono do
// feed que se está a tentar sincronizar.

function firstDefined(obj, keys) {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return null;
}

function asArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function normalizeBusinessType(raw) {
  const s = String(raw || '').toLowerCase();
  if (s.includes('arrend') || s.includes('rent') || s.includes('aluguer')) return 'Arrendamento';
  if (s.includes('trespass')) return 'Trespasse';
  return 'Venda';
}

function normalizeTypology(raw) {
  const s = String(raw || '').toUpperCase().replace(/\s+/g, '');
  const match = s.match(/T(\d+)/);
  if (match) return `T${match[1]}`;
  return s || null;
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Não autenticado.' }, { status: 401 });

    const supabaseAuth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: { user } } = await supabaseAuth.auth.getUser(token);
    if (!user) return Response.json({ error: 'Não autorizado.' }, { status: 401 });

    const { data: feed } = await supabaseAdmin.from('crm_feeds').select('*').eq('user_id', user.id).single();
    if (!feed) return Response.json({ error: 'Não tens nenhum feed CRM configurado.' }, { status: 400 });

    let xmlText;
    try {
      const res = await fetch(feed.feed_url, { headers: { 'User-Agent': 'MoreadaFeedSync/1.0' } });
      if (!res.ok) throw new Error(`O link do feed devolveu o erro ${res.status}.`);
      xmlText = await res.text();
    } catch (fetchErr) {
      await supabaseAdmin.from('crm_feeds').update({
        last_sync_at: new Date().toISOString(), last_sync_status: 'error',
        last_sync_error: `Não foi possível aceder ao link do feed: ${fetchErr.message}`,
      }).eq('id', feed.id);
      return Response.json({ error: `Não foi possível aceder ao link do feed: ${fetchErr.message}` }, { status: 400 });
    }

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    let parsed;
    try {
      parsed = parser.parse(xmlText);
    } catch (parseErr) {
      await supabaseAdmin.from('crm_feeds').update({
        last_sync_at: new Date().toISOString(), last_sync_status: 'error',
        last_sync_error: 'O ficheiro do feed não é um XML válido.',
      }).eq('id', feed.id);
      return Response.json({ error: 'O ficheiro do feed não é um XML válido.' }, { status: 400 });
    }

    // Procura a lista de imóveis dentro do XML — o nome do contentor e de
    // cada item varia consoante o CRM, por isso tentamos as combinações
    // mais comuns em vez de assumir uma só.
    const root = parsed.ad_list || parsed.imoveis || parsed.properties || parsed.anuncios || parsed;
    const rawList = root.ad || root.imovel || root.property || root.anuncio || root.item || [];
    const items = asArray(rawList);

    if (items.length === 0) {
      await supabaseAdmin.from('crm_feeds').update({
        last_sync_at: new Date().toISOString(), last_sync_status: 'error',
        last_sync_error: 'Não encontrei nenhum imóvel dentro do feed — o formato pode não ser reconhecido.',
      }).eq('id', feed.id);
      return Response.json({ error: 'Não encontrei nenhum imóvel dentro do feed. Contacta-nos para adicionarmos suporte a este formato específico.' }, { status: 400 });
    }

    let created = 0;
    let updated = 0;
    const errors = [];

    for (const item of items) {
      try {
        const externalId = String(firstDefined(item, ['id', 'ref', 'reference', 'referencia', '@_id']) || '');
        if (!externalId) { errors.push('Um imóvel do feed não tinha identificador — ignorado.'); continue; }

        const title = firstDefined(item, ['title', 'titulo', 'name']);
        const description = firstDefined(item, ['description', 'descricao', 'desc']);
        const price = Number(firstDefined(item, ['price', 'preco']) || 0);
        const businessType = normalizeBusinessType(firstDefined(item, ['business_type', 'tipo_negocio', 'transaction_type']));
        const typology = normalizeTypology(firstDefined(item, ['typology', 'tipologia', 'rooms', 'bedrooms']));
        const district = firstDefined(item, ['district', 'distrito']);
        const municipality = firstDefined(item, ['municipality', 'concelho', 'city']);
        const parish = firstDefined(item, ['parish', 'freguesia']);
        const areaUtil = Number(firstDefined(item, ['area_util', 'useful_area', 'area']) || 0) || null;

        const photosRaw = item.images?.image || item.photos?.photo || item.fotos?.foto || [];
        const photoUrls = asArray(photosRaw).map((p) => (typeof p === 'string' ? p : p['#text'] || p['@_url'] || p.url)).filter(Boolean);

        const propertyData = {
          owner_id: user.id,
          title: title || `${typology || 'Imóvel'} · ${municipality || ''}`.trim(),
          description: description || '',
          price,
          business_type: businessType,
          typology: typology || '',
          district: district || '',
          municipality: municipality || '',
          parish: parish || '',
          area_util: areaUtil,
          status: 'ativo',
          crm_feed_id: feed.id,
          crm_external_id: externalId,
        };

        const { data: existing } = await supabaseAdmin
          .from('properties').select('id')
          .eq('crm_feed_id', feed.id).eq('crm_external_id', externalId).maybeSingle();

        let propertyId;
        if (existing) {
          await supabaseAdmin.from('properties').update(propertyData).eq('id', existing.id);
          propertyId = existing.id;
          updated++;
        } else {
          const { data: inserted, error: insertErr } = await supabaseAdmin
            .from('properties').insert(propertyData).select('id').single();
          if (insertErr) throw insertErr;
          propertyId = inserted.id;
          created++;
        }

        // Só substitui as fotos se o feed trouxer alguma — assim um feed
        // sem fotos nesse imóvel não apaga fotos que já lá estavam.
        if (photoUrls.length > 0) {
          await supabaseAdmin.from('property_photos').delete().eq('property_id', propertyId);
          await Promise.all(
            photoUrls.map((url, i) => supabaseAdmin.from('property_photos').insert({ property_id: propertyId, url, position: i }))
          );
        }
      } catch (itemErr) {
        errors.push(itemErr.message);
      }
    }

    await supabaseAdmin.from('crm_feeds').update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: errors.length === items.length ? 'error' : 'success',
      last_sync_error: errors.length > 0 ? errors.slice(0, 5).join(' | ') : null,
      last_sync_created: created,
      last_sync_updated: updated,
    }).eq('id', feed.id);

    return Response.json({ success: true, created, updated, total: items.length, errors: errors.slice(0, 5) });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
