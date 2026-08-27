'use client';

import TextPage from './TextPage';
import { useLanguage } from '../lib/i18n';

export default function ContactContent() {
  const { t } = useLanguage();
  return (
    <TextPage title={t('contact_title')}>
      <p style={{ marginBottom: 16 }}>{t('contact_p1')}</p>
      <p style={{ marginBottom: 16 }}>
        {t('contact_p2')} <a href="mailto:geral@moreada.pt" style={{ color: 'var(--telha)' }}>geral@moreada.pt</a>.
      </p>
      <p>{t('contact_p3')}</p>
    </TextPage>
  );
}
