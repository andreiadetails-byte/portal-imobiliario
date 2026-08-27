'use client';

import TextPage from './TextPage';
import { useLanguage } from '../lib/i18n';

export default function CareersContent() {
  const { t } = useLanguage();
  return (
    <TextPage title={t('careers_title')}>
      <p style={{ marginBottom: 16 }}>{t('careers_p1')}</p>
      <p>{t('careers_p2')}</p>
    </TextPage>
  );
}
