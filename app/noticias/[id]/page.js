'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import Header from '../../../components/Header';
import { useLanguage } from '../../../lib/i18n';

export default function NoticiaPage() {
  const { t, lang } = useLanguage();
  const { id } = useParams();
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('news').select('*').eq('id', id).single().then(({ data }) => {
      setNews(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return (<><Header /><div className="wrap" style={{ padding: 60 }}>...</div></>);
  if (!news) return (<><Header /><div className="wrap" style={{ padding: 60 }}>{t('news_not_found')}</div></>);

  return (
    <>
      <Header />
      <main id="main-content" className="wrap" style={{ maxWidth: 720, padding: '40px 32px 80px' }}>
        <Link href="/" style={{ fontSize: 13, color: 'var(--telha)' }}>&larr; {t('news_back_home')}</Link>

        <div style={{ marginTop: 20 }}>
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, textTransform: 'uppercase',
            letterSpacing: '0.05em', color: 'var(--telha)', display: 'block', marginBottom: 10,
          }}>
            {news.category}
          </span>
          <h1 className="display" style={{ fontSize: 30, lineHeight: 1.2, marginBottom: 20 }}>{(news.title_translations && news.title_translations[lang]) || news.title}</h1>

          {news.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={news.cover_image_url} alt={(news.title_translations && news.title_translations[lang]) || news.title} style={{ width: '100%', maxHeight: 380, objectFit: 'cover', borderRadius: 8, marginBottom: 28 }} />
          )}

          {((news.body_translations && news.body_translations[lang]) || news.body).split(/\n{2,}/).map((paragraph, i) => (
            <p key={i} style={{ color: 'var(--ink)', fontSize: 16, lineHeight: 1.7, marginBottom: 16, whiteSpace: 'pre-line' }}>
              {paragraph}
            </p>
          ))}
        </div>
      </main>
    </>
  );
}
