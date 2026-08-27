'use client';

import TextPage from './TextPage';
import { useLanguage } from '../lib/i18n';

export default function AboutContent() {
  const { t } = useLanguage();
  return (
    <TextPage title={t('about_title')}>
      <p style={{ marginBottom: 16 }}>{t('about_p1')}</p>
      <p style={{ marginBottom: 16 }}>{t('about_p2')}</p>
      <p>{t('about_p3')}</p>
    </TextPage>
  );
}
