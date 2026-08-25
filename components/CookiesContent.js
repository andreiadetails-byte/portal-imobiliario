'use client';

import TextPage from './TextPage';
import { useLanguage } from '../lib/i18n';

export default function CookiesContent() {
  const { t } = useLanguage();
  return (
    <TextPage title={t('cookies_title')}>
      <p style={{ marginBottom: 16 }}>{t('cookies_intro')}</p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>{t('cookies_h_essential')}</h2>
      <p style={{ marginBottom: 16 }}>{t('cookies_essential_intro')}</p>
      <ul style={{ marginBottom: 16, paddingLeft: 20 }}>
        <li style={{ marginBottom: 6 }}>{t('cookies_li_session')}</li>
        <li style={{ marginBottom: 6 }}>{t('cookies_li_language')}</li>
        <li style={{ marginBottom: 6 }}>{t('cookies_li_consent')}</li>
      </ul>
      <p style={{ marginBottom: 16 }}>{t('cookies_essential_note')}</p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>{t('cookies_h_analytics')}</h2>
      <p style={{ marginBottom: 16 }}>
        {t('cookies_analytics_pre')} <b>{t('cookies_analytics_bold')}</b>{t('cookies_analytics_post')}
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>{t('cookies_h_manage')}</h2>
      <p>{t('cookies_manage_text')}</p>
    </TextPage>
  );
}
