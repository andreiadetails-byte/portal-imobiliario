import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { translateToAllLanguages } from '../../../lib/translateText';

export async function POST(request) {
  try {
    const { propertyId, title, description } = await request.json();
    if (!propertyId) {
      return NextResponse.json({ error: 'Falta o propertyId.' }, { status: 400 });
    }

    const [titleTranslations, descriptionTranslations] = await Promise.all([
      title ? translateToAllLanguages(title) : Promise.resolve({}),
      description ? translateToAllLanguages(description) : Promise.resolve({}),
    ]);

    const { error } = await supabaseAdmin
      .from('properties')
      .update({
        title_translations: titleTranslations,
        description_translations: descriptionTranslations,
      })
      .eq('id', propertyId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
