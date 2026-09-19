import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Sincroniza os imóveis do CRM da Gold Residence (Supabase próprio) com o
// More·ada. Só leitura no CRM: usa a chave pública (publishable/anon), que
// só vê o que a regra de leitura pública do CRM já deixa ver
// (published = true e estado diferente de "Oculto").
//
// Pede SEMPRE colunas explícitas — nunca "select *" — para nunca trazer
// dados privados do proprietário nem a comissão.
//
// Funciona por páginas (PAGE imóveis de cada vez) para não estourar o tempo
// limite das funções do Netlify. Modos:
//   preview  — só conta e mostra uma amostra, não grava nada
//   sync     — importa uma página (offset/limit)
//   finalize — desativa no More·ada os imóveis importados que já não estão
//              "Disponível" no CRM (vendidos, ocultos, apagados)

const CRM_URL = process.env.GOLD_CRM_SUPABASE_URL || 'https://vjjdfetfrqoidvawmumh.supabase.co';
const CRM_KEY = process.env.GOLD_CRM_ANON_KEY || 'sb_publishable_a1r6ebUZTExsZ5kHvYmM6A_EsykTqcJ';
const SOURCE = 'gold-residence';
const PAGE = 10;

// Modo de teste: três imóveis inventados, no mesmo formato que vem do CRM.
// Não fazem nenhum pedido ao CRM e ficam marcados com crm_source = "demo",
// separados dos reais, para se poderem apagar sem tocar em mais nada.
const DEMO_SOURCE = 'demo';
const DEMO_ROWS = [
  {
    reference: 'DEMO-001', title: '[TESTE] Apartamento T3 com varanda', business: 'Venda', type: 'Apartamento',
    typology: 'T3', price: '385000', district: 'Porto', county: 'Porto', parish: 'Foz do Douro',
    address: 'Rua de Exemplo 10', area: '118', bedrooms: 3, bathrooms: 2, condition: 'Usado', floor: '2',
    balcony: true, parking: 'Sim', description: 'Imóvel de teste. Pode apagar.',
    image: 'https://www.moreada.pt/mood/sala-verde-premium.jpg',
    images: ['https://www.moreada.pt/mood/sala-verde-premium.jpg', 'https://www.moreada.pt/mood/nicho-arco-ceramica.jpg', '/fotos/caminho-relativo.jpg'],
  },
  {
    reference: 'DEMO-002', title: '[TESTE] Terreno rústico', business: 'Venda', type: 'terreno',
    typology: null, price: '45000', district: 'Évora', county: 'Montemor-o-Novo', parish: null,
    address: '', area: '5000', bedrooms: null, bathrooms: null, description: 'Terreno de teste sem morada.',
    image: null, images: '["https://www.moreada.pt/mood/nicho-arco-ceramica.jpg"]',
  },
  {
    reference: 'DEMO-003', title: '[TESTE] Estúdio para arrendar', business: 'Arrendamento', type: 'Apartamento',
    typology: '', price: 750, district: 'Lisboa', county: 'Lisboa', parish: 'Arroios',
    address: 'Rua de Teste 5', area: '32', bedrooms: 0, bathrooms: 1, description: 'Estúdio de teste sem fotos.',
    image: null, images: null,
  },
];

const PUBLIC_COLUMNS = [
  'reference', 'title', 'business', 'type', 'typology', 'price',
  'district', 'county', 'parish', 'address', 'area', 'bedrooms', 'bathrooms',
  'condition', 'floor', 'balcony', 'parking', 'image', 'images', 'description',
];

const KNOWN_TYPES = ['Apartamento', 'Moradia', 'Terreno', 'Espaço comercial', 'Armazém', 'Escritório', 'Quarto'];

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function truthy(v) {
  if (v === true) return true;
  return ['true', 'sim', 'yes', '1', 's'].includes(String(v ?? '').trim().toLowerCase());
}

function mapBusiness(raw) {
  const s = String(raw || '').toLowerCase();
  if (s.includes('arrend') || s.includes('rent')) return 'Arrendamento';
  if (s.includes('trespass')) return 'Trespasse';
  return 'Venda';
}

function mapType(raw) {
  const s = String(raw || '').trim().toLowerCase();
  const found = KNOWN_TYPES.find((t) => t.toLowerCase() === s);
  if (found) return found;
  if (s.includes('moradia') || s.includes('vivenda')) return 'Moradia';
  if (s.includes('terreno') || s.includes('lote')) return 'Terreno';
  if (s.includes('apart')) return 'Apartamento';
  return raw ? String(raw).trim() : 'Apartamento';
}

function mapTypology(raw, propertyType, bedrooms) {
  const m = String(raw || '').toUpperCase().replace(/\s+/g, '').match(/T(\d+)/);
  if (m) return `T${m[1]}`;
  if (propertyType === 'Terreno') return 'Terreno';
  if (bedrooms === 0) return 'T0';
  return '';
}

// A coluna "images" pode vir como lista ou como texto JSON; "image" é a capa.
function collectPhotos(r) {
  let list = r.images;
  if (typeof list === 'string') {
    try { list = JSON.parse(list); } catch { list = [list]; }
  }
  if (!Array.isArray(list)) list = [];
  if (r.image) list = [r.image, ...list];
  const seen = new Set();
  const valid = [];
  let skipped = 0;
  for (const u of list) {
    const url = typeof u === 'string' ? u.trim() : '';
    if (!url || seen.has(url)) continue;
    seen.add(url);
    if (/^https?:\/\//i.test(url)) valid.push(url);
    else skipped++; // caminho relativo (ex.: "/fotos/x.jpg") — não sabemos o domínio
  }
  return { urls: valid.slice(0, 20), skipped };
}

function buildProperty(r) {
  const bedrooms = num(r.bedrooms);
  const propertyType = mapType(r.type);
  const area = num(r.area);
  const address = String(r.address || '').trim();
  const locality = [r.parish, r.county].filter(Boolean).join(', ');
  return {
    title: r.title || `${propertyType} em ${r.county || r.district || 'Portugal'}`,
    internal_reference: r.reference,
    description: r.description || '',
    property_type: propertyType,
    typology: mapTypology(r.typology, propertyType, bedrooms),
    business_type: mapBusiness(r.business),
    price: num(r.price) || 0,
    area,
    area_util: area,
    bedrooms: bedrooms ?? 0,
    bathrooms: num(r.bathrooms) ?? 0,
    state: r.condition || '',
    address: address || locality || 'Portugal',
    district: r.district || '',
    municipality: r.county || null,
    parish: r.parish || null,
    floor: r.floor != null ? String(r.floor) : '',
    has_parking: truthy(r.parking),
    has_balcony: truthy(r.balcony),
    // Por segurança, a morada completa fica escondida até decidirmos o contrário.
    show_full_address: false,
  };
}

async function crmQuery({ select, offset = 0, limit = PAGE, count = false }) {
  const status = encodeURIComponent('Disponível');
  const qs = [
    `select=${select}`,
    'published=eq.true',
    `status=eq.${status}`,
    'or=(no_publish.is.null,no_publish.eq.false)',
    'order=reference.asc',
    `limit=${limit}`,
    `offset=${offset}`,
  ].join('&');

  const res = await fetch(`${CRM_URL}/rest/v1/properties?${qs}`, {
    headers: { apikey: CRM_KEY, ...(count ? { Prefer: 'count=exact' } : {}) },
    cache: 'no-store',
  });

  if (!res.ok) {
    let detail = '';
    try { const j = await res.json(); detail = j.message || j.hint || JSON.stringify(j); } catch { /* ignora */ }
    throw new Error(`O CRM respondeu ${res.status}${detail ? `: ${detail}` : ''}`);
  }

  const rows = await res.json();
  let total = null;
  const range = res.headers.get('content-range'); // ex.: "0-9/34"
  if (range && range.includes('/')) total = Number(range.split('/')[1]);
  return { rows, total };
}

async function requireAdmin(request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  const authClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: { user } } = await authClient.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  return profile?.is_admin ? user : null;
}

export async function POST(request) {
  try {
    const user = await requireAdmin(request);
    if (!user) return Response.json({ error: 'Não autorizado.' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const mode = body.mode || 'preview';

    // ---------- PREVIEW ----------
    if (mode === 'preview') {
      const { rows, total } = await crmQuery({ select: PUBLIC_COLUMNS.join(','), offset: 0, limit: 5, count: true });
      return Response.json({
        success: true,
        total,
        sample: rows.map((r) => ({
          reference: r.reference,
          title: r.title,
          price: r.price,
          typology: r.typology,
          district: r.district,
          photos: collectPhotos(r).urls.length,
          hasAddress: !!String(r.address || '').trim(),
        })),
      });
    }

    // ---------- FINALIZE ----------
    if (mode === 'finalize') {
      const { rows } = await crmQuery({ select: 'reference', offset: 0, limit: 1000 });
      const inCrm = new Set(rows.map((r) => r.reference));
      if (inCrm.size === 0) {
        return Response.json({ success: true, deactivated: 0, note: 'O CRM não devolveu nenhum imóvel — por segurança, não desativei nada.' });
      }

      const { data: imported } = await supabaseAdmin
        .from('properties').select('id, crm_external_id')
        .eq('crm_source', SOURCE).eq('status', 'ativo');

      const gone = (imported || []).filter((p) => !inCrm.has(p.crm_external_id));
      // Trava de segurança: se fossem desativados demasiados de uma vez,
      // algo pode estar mal (ex.: erro parcial no CRM) — não avança sozinho.
      if (gone.length > Math.max(3, Math.floor((imported || []).length * 0.5))) {
        return Response.json({
          success: true, deactivated: 0,
          note: `Iria desativar ${gone.length} de ${(imported || []).length} imóveis, o que parece demasiado. Não desativei nenhum — confirma primeiro no CRM.`,
        });
      }
      if (gone.length > 0) {
        await supabaseAdmin.from('properties').update({ status: 'desativado' }).in('id', gone.map((p) => p.id));
      }
      return Response.json({ success: true, deactivated: gone.length });
    }

    // ---------- APAGAR OS DADOS DE TESTE ----------
    if (mode === 'delete-demo') {
      const { data: demoProps } = await supabaseAdmin.from('properties').select('id').eq('crm_source', DEMO_SOURCE);
      const ids = (demoProps || []).map((p) => p.id);
      if (ids.length > 0) {
        await supabaseAdmin.from('property_photos').delete().in('property_id', ids);
        const { error } = await supabaseAdmin.from('properties').delete().in('id', ids);
        if (error) throw error;
      }
      return Response.json({ success: true, deleted: ids.length });
    }

    // ---------- SYNC (uma página) ----------
    const offset = Math.max(0, Number(body.offset) || 0);
    const limit = Math.min(PAGE, Math.max(1, Number(body.limit) || PAGE));
    const isDemo = body.demo === true;
    const source = isDemo ? DEMO_SOURCE : SOURCE;
    const { rows, total } = isDemo
      ? { rows: DEMO_ROWS.slice(offset, offset + limit), total: DEMO_ROWS.length }
      : await crmQuery({ select: PUBLIC_COLUMNS.join(','), offset, limit, count: true });

    const errors = [];
    let created = 0;
    let updated = 0;
    let photosChanged = 0;
    let skippedPhotos = 0;

    const usable = rows.filter((r) => {
      if (!r.reference) { errors.push({ reference: '(sem referência)', message: 'Imóvel sem referência no CRM — ignorado.' }); return false; }
      return true;
    });

    const refs = usable.map((r) => r.reference);
    const { data: existingRows } = refs.length
      ? await supabaseAdmin.from('properties').select('id, crm_external_id').eq('crm_source', source).in('crm_external_id', refs)
      : { data: [] };
    const existingByRef = Object.fromEntries((existingRows || []).map((p) => [p.crm_external_id, p.id]));

    const existingIds = Object.values(existingByRef);
    const { data: existingPhotos } = existingIds.length
      ? await supabaseAdmin.from('property_photos').select('property_id, url, position').in('property_id', existingIds).order('position')
      : { data: [] };
    const photosByProp = {};
    (existingPhotos || []).forEach((ph) => { (photosByProp[ph.property_id] ||= []).push(ph.url); });

    await Promise.all(usable.map(async (r) => {
      try {
        const data = buildProperty(r);
        const { urls, skipped } = collectPhotos(r);
        skippedPhotos += skipped;

        let propertyId = existingByRef[r.reference];
        if (propertyId) {
          const { error } = await supabaseAdmin.from('properties').update(data).eq('id', propertyId);
          if (error) throw error;
          updated++;
        } else {
          const { data: inserted, error } = await supabaseAdmin.from('properties')
            .insert({ ...data, owner_id: user.id, status: isDemo ? 'em_revisao' : 'ativo', crm_source: source, crm_external_id: r.reference })
            .select('id').single();
          if (error) throw error;
          propertyId = inserted.id;
          created++;
        }

        // Só mexe nas fotos se o CRM tiver fotos e forem diferentes das que já lá estão —
        // um imóvel sem fotos no CRM nunca apaga as que já existem.
        const current = photosByProp[propertyId] || [];
        const same = current.length === urls.length && current.every((u, i) => u === urls[i]);
        if (urls.length > 0 && !same) {
          await supabaseAdmin.from('property_photos').delete().eq('property_id', propertyId);
          const { error: photoErr } = await supabaseAdmin.from('property_photos')
            .insert(urls.map((url, i) => ({ property_id: propertyId, url, position: i })));
          if (photoErr) throw photoErr;
          photosChanged++;
        }
      } catch (err) {
        errors.push({ reference: r.reference, message: err.message });
      }
    }));

    const nextOffset = offset + rows.length;
    const done = rows.length < limit || (total != null && nextOffset >= total);
    return Response.json({
      success: true, total, created, updated, photosChanged, skippedPhotos,
      errors: errors.slice(0, 10), errorCount: errors.length, nextOffset, done,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
