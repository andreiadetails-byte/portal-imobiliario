import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail } from '../../../lib/sendEmail';
import { renderEmail, SITE_URL } from '../../../lib/emailTemplate';

// Avisa todos os utilizadores registados sempre que uma notícia nova é
// publicada — tipo newsletter. Envia com um pequeno atraso entre cada
// email, para não ultrapassar os limites do servidor de email.

const DELAY_MS = 400;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Confirma que quem está a pedir isto tem mesmo sessão iniciada como
// administrador.
async function isCallerAdmin(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return false;

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return false;

  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  return !!profile?.is_admin;
}

export async function POST(request) {
  try {
    if (!(await isCallerAdmin(request))) {
      return Response.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const { newsId } = await request.json();
    if (!newsId) {
      return Response.json({ error: 'Falta o ID da notícia.' }, { status: 400 });
    }

    const { data: news } = await supabaseAdmin.from('news').select('*').eq('id', newsId).single();
    if (!news) {
      return Response.json({ error: 'Notícia não encontrada.' }, { status: 404 });
    }

    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name, agency_name');

    let sentCount = 0;
    let failedCount = 0;

    for (const profile of profiles || []) {
      const { data: userAuth } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      const email = userAuth?.user?.email;
      if (!email) { failedCount++; continue; }

      const firstName = (profile.agency_name || profile.full_name || '').split(' ')[0];

      const bodyHtml = `
        <p style="margin:0 0 14px; font-size:15px;">Olá${firstName ? ` ${firstName}` : ''},</p>
        <span style="font-family: 'IBM Plex Mono', monospace; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:#7E8F6A; display:block; margin-bottom:8px;">
          ${news.category || 'Notícia'}
        </span>
        <h2 style="font-size:19px; color:#332E22; margin: 0 0 10px;">${news.title}</h2>
        <p style="margin:0 0 4px; color:#332E22;">${(news.body || '').slice(0, 200)}${(news.body || '').length > 200 ? '...' : ''}</p>
      `;

      const result = await sendEmail({
        to: email,
        subject: `📰 ${news.title}`,
        html: renderEmail({
          preheader: news.title,
          bodyHtml,
          ctaText: 'Ler notícia completa',
          ctaUrl: `${SITE_URL}/noticias/${news.id}`,
        }),
      });

      if (result.error) failedCount++;
      else sentCount++;

      await sleep(DELAY_MS);
    }

    return Response.json({ success: true, sentCount, failedCount, total: (profiles || []).length });
  } catch (err) {
    console.error('Erro ao notificar notícia:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
