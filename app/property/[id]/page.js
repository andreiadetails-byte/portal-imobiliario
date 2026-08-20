import { createClient } from '@supabase/supabase-js';
import PropertyClient from './PropertyClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function generateMetadata({ params }) {
  const { id } = await params;

  const { data: property } = await supabase
    .from('properties')
    .select('title, description, typology, address, district, price, business_type, property_photos(url, position)')
    .eq('id', id)
    .single();

  if (!property) {
    return { title: 'Imóvel | More·ada' };
  }

  const title = `${property.typology} · ${property.address} — ${Number(property.price).toLocaleString('pt-PT')} € | More·ada`;
  const description = (property.description || '').slice(0, 155);
  const firstPhoto = property.property_photos?.sort((a, b) => a.position - b.position)[0]?.url;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: firstPhoto ? [{ url: firstPhoto }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: firstPhoto ? [firstPhoto] : [],
    },
  };
}

export default async function PropertyPage({ params }) {
  const { id } = await params;
  const { data: property } = await supabase
    .from('properties')
    .select('title, description, typology, address, district, price, business_type, area_util, bedrooms, bathrooms, property_photos(url, position)')
    .eq('id', id)
    .single();

  const jsonLd = property ? {
    '@context': 'https://schema.org',
    '@type': 'Residence',
    name: property.title,
    description: property.description,
    address: { '@type': 'PostalAddress', streetAddress: property.address, addressRegion: property.district, addressCountry: 'PT' },
    numberOfRooms: property.bedrooms,
    floorSize: property.area_util ? { '@type': 'QuantitativeValue', value: property.area_util, unitCode: 'MTK' } : undefined,
    image: property.property_photos?.sort((a, b) => a.position - b.position).map((p) => p.url),
  } : null;

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <PropertyClient />
    </>
  );
}
