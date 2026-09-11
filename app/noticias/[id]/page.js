'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import Header from '../../../components/Header';
import { useLanguage } from '../../../lib/i18n';

function summarizeToSentence(text) {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  const match = clean.match(/^.{0,120}?[.!?](\s|$)/);
  if (match) return match[0].trim();
  return clean.length > 120 ? `${clean.slice(0, 120)}...` : clean;
}

export default function NoticiaPage() {
  const { t, lang } = useLanguage();
  const { id } = useParams();
  const [news, setNews] = useState(null);
  const [otherNews, setOtherNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase.from('news').select('*').eq('id', id).single().then(({ data }) => {
      setNews(data);
      setLoading(false);
    });
    supabase
      .from('news')
      .select('*')
      .eq('published', true)
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setOtherNews(data || []));
  }, [id]);

  if (loading) return (<><Header /><div className="wrap" style={{ padding: 60, background: 'var(--paper)', borderRadius: 16, marginTop: 24 }}>...</div></>);
  if (!news) return (<><Header /><div className="wrap" style={{ padding: 60, background: 'var(--paper)', borderRadius: 16, marginTop: 24 }}>{t('news_not_found')}</div></>);

  return (
    <>
      <Header />
      <main id="main-content" className="wrap" style={{ maxWidth: 1080, padding: '24px 32px 56px' }}>
        <div style={{ background: '#3D4A2E', borderRadius: 16, padding: '32px 32px 36px', marginBottom: 24, textAlign: 'center' }}>
          <Link href="/" style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', display: 'block', marginBottom: 14 }}>&larr; {t('news_back_home')}</Link>
          <p className="display" style={{ fontSize: 40, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
            {t('news_masthead')}
          </p>
        </div>

        <div className="news-detail-grid" style={{ display: 'grid', gridTemplateColumns: otherNews.length > 0 ? '1fr 320px' : '1fr', gap: 24, alignItems: 'start' }}>
          {/* Notícia principal, em destaque */}
          <div style={{ background: 'var(--paper)', borderRadius: 16, padding: '24px 32px 40px' }}>
            <span style={{
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, textTransform: 'uppercase',
              letterSpacing: '0.05em', color: 'var(--telha)', display: 'block', marginBottom: 10,
            }}>
              {news.category}
            </span>
            <h1 className="display" style={{ fontSize: 30, lineHeight: 1.2, marginBottom: 20 }}>{(news.title_translations && news.title_translations[lang]) || news.title}</h1>

            {news.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
                <img src={news.cover_image_url} alt={(news.title_translations && news.title_translations[lang]) || news.title} style={{ width: '100%', maxHeight: 380, objectFit: 'contain', background: 'var(--plaster)', borderRadius: 8, marginBottom: 28 }} />
            )}

            {((news.body_translations && news.body_translations[lang]) || news.body).split(/\n{2,}/).map((paragraph, i) => (
              <p key={i} style={{ color: 'var(--ink)', fontSize: 16, lineHeight: 1.7, marginBottom: 16, whiteSpace: 'pre-line' }}>
                {paragraph}
              </p>
            ))}
          </div>

          {/* Outras notícias, à volta, como num jornal */}
          {otherNews.length > 0 && (
            <div style={{ background: 'var(--plaster)', border: '1px solid var(--line)', borderRadius: 16, padding: '24px 20px' }}>
              <h3 className="display" style={{ fontSize: 16, marginBottom: 16 }}>{t('news_other_articles')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {otherNews.map((n) => (
                  <Link key={n.id} href={`/noticias/${n.id}`} style={{ display: 'flex', gap: 10, textDecoration: 'none' }}>
                    {n.cover_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={n.cover_image_url}
                        alt={(n.title_translations && n.title_translations[lang]) || n.title}
                        loading="lazy"
                        style={{ width: 70, height: 70, objectFit: 'contain', background: 'var(--plaster)', borderRadius: 6, flexShrink: 0 }}
                      />
                    )}
                    <div>
                      <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--telha)', fontWeight: 600 }}>
                        {n.category}
                      </span>
                      <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, margin: '3px 0 0', color: 'var(--ink)' }}>
                        {(n.title_translations && n.title_translations[lang]) || n.title}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              <Link href="/noticias" style={{ display: 'block', marginTop: 18, fontSize: 12.5, fontWeight: 600, color: 'var(--telha)' }}>
                {t('home_news_see_all')} &rarr;
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
