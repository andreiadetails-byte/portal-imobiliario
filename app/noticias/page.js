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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {news.map((n) => (
              <Link key={n.id} href={`/noticias/${n.id}`} className="card news-card" style={{
                display: 'grid', gridTemplateColumns: n.cover_image_url ? '220px 1fr' : '1fr',
                overflow: 'hidden',
              }}>
                {n.cover_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={n.cover_image_url}
                    alt={(n.title_translations && n.title_translations[lang]) || n.title}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', minHeight: 150, objectFit: 'cover', objectPosition: n.cover_image_position || 'center' }}
                  />
                )}
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, textTransform: 'uppercase',
                    letterSpacing: '0.05em', color: 'var(--telha)', display: 'block', marginBottom: 8,
                  }}>
                    {n.category}
                  </span>
                  <h4 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8, lineHeight: 1.3 }}>{(n.title_translations && n.title_translations[lang]) || n.title}</h4>
                  <p style={{ fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.55 }}>
                    {summarizeToSentence((n.body_translations && n.body_translations[lang]) || n.body)}
                  </p>
                  <span style={{ fontSize: 12.5, color: 'var(--telha)', fontWeight: 600, marginTop: 8 }}>
                    {t('home_read_full_news')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
