import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const SITE_URL = 'https://portalimobiliario.netlify.app';

export default async function sitemap() {
  const staticPages = [
    '', 'results', 'favorites', 'login', 'publish', 'valuation',
    'simulador-credito', 'simulador-imt', 'sobre', 'faq', 'contacto',
    'privacidade', 'cookies', 'termos', 'seguranca', 'trabalha-connosco',
  ].map((path) => ({
    url: `${SITE_URL}/${path}`,
    lastModified: new Date(),
  }));

  const { data: properties } = await supabase
    .from('properties')
    .select('id, created_at')
    .eq('status', 'ativo')
    .limit(5000);

  const propertyPages = (properties || []).map((p) => ({
    url: `${SITE_URL}/property/${p.id}`,
    lastModified: p.created_at,
  }));

  return [...staticPages, ...propertyPages];
}
