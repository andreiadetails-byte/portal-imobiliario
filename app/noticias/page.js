'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import { useLanguage } from '../../lib/i18n';

function summarizeToSentence(text) {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  const match = clean.match(/^.{0,160}?[.!?](\s|$)/);
  if (match) return match[0].trim();
  return clean.length > 160 ? `${clean.slice(0, 160)}...` : clean;
}

export default function NoticiasPage() {
  const { t, lang } = useLanguage();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('news')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setNews(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <Header />
      <main id="main-content" className="wrap" style={{ maxWidth: 820, padding: '24px 32px 80px', background: 'var(--paper)', borderRadius: 16, marginTop: 24 }}>
        <BackButton fallback="/" />
        <h1 className="display" style={{ fontSize: 30, marginBottom: 8 }}>{t('news_all_title')}</h1>
        <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 28 }}>{t('news_all_subtitle')}</p>

        {loading ? (
          <p style={{ fontSize: 13.5, color: 'var(--text-soft)' }}>{t('home_loading')}</p>
        ) : news.length === 0 ? (
          <p style={{ fontSize: 13.5, color: 'var(--text-soft)' }}>{t('home_no_news')}</p>
        ) : (
          <>
            {/* Destaque principal — a notícia mais recente, em grande */}
            <Link href={`/noticias/${news[0].id}`} className="card news-card" style={{
              display: 'block', overflow: 'hidden', marginBottom: 32, textDecoration: 'none',
            }}>
              {news[0].cover_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={news[0].cover_image_url}
                  alt={(news[0].title_translations && news[0].title_translations[lang]) || news[0].title}
                  loading="eager"
                  style={{ width: '100%', height: 280, objectFit: 'contain', background: 'var(--plaster)' }}
                />
              )}
              <div style={{ padding: '22px 24px' }}>
                <span style={{
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, textTransform: 'uppercase',
                  letterSpacing: '0.05em', color: 'var(--telha)', display: 'block', marginBottom: 10,
                }}>
                  {news[0].category}
                </span>
                <h2 className="display" style={{ fontSize: 24, fontWeight: 600, marginBottom: 10, lineHeight: 1.3 }}>
                  {(news[0].title_translations && news[0].title_translations[lang]) || news[0].title}
                </h2>
                <p style={{ fontSize: 14.5, color: 'var(--text-soft)', lineHeight: 1.6, marginBottom: 10 }}>
                  {summarizeToSentence((news[0].body_translations && news[0].body_translations[lang]) || news[0].body)}
                </p>
                <span style={{ fontSize: 13, color: 'var(--telha)', fontWeight: 600 }}>
                  {t('home_read_full_news')}
                </span>
              </div>
            </Link>

            {/* Restantes notícias, em grelha tipo jornal */}
            {news.length > 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                {news.slice(1).map((n) => (
                  <Link key={n.id} href={`/noticias/${n.id}`} className="card news-card" style={{
                    display: 'flex', flexDirection: 'column', overflow: 'hidden', textDecoration: 'none',
                  }}>
                    {n.cover_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={n.cover_image_url}
                        alt={(n.title_translations && n.title_translations[lang]) || n.title}
                        loading="lazy"
                        style={{ width: '100%', height: 150, objectFit: 'contain', background: 'var(--plaster)' }}
                      />
                    )}
                    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={{
                        fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, textTransform: 'uppercase',
                        letterSpacing: '0.05em', color: 'var(--telha)', display: 'block', marginBottom: 6,
                      }}>
                        {n.category}
                      </span>
                      <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, lineHeight: 1.3 }}>
                        {(n.title_translations && n.title_translations[lang]) || n.title}
                      </h4>
                      <p style={{ fontSize: 12.5, color: 'var(--text-soft)', lineHeight: 1.5, flex: 1 }}>
                        {summarizeToSentence((n.body_translations && n.body_translations[lang]) || n.body)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
