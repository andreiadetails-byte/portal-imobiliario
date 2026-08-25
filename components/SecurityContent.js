'use client';

import TextPage from './TextPage';
import { useLanguage } from '../lib/i18n';

export default function SecurityContent() {
  const { t } = useLanguage();
  return (
    <TextPage title={t('seg_title')}>
      <p style={{ marginBottom: 16 }}>{t('seg_intro')}</p>
      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
        <li style={{ marginBottom: 8 }}>{t('seg_li_no_payment')}</li>
        <li style={{ marginBottom: 8 }}>{t('seg_li_price')}</li>
        <li style={{ marginBottom: 8 }}>{t('seg_li_chat')}</li>
        <li style={{ marginBottom: 8 }}>{t('seg_li_bank')}</li>
      </ul>
      <p>{t('seg_footer')}</p>
    </TextPage>
  );
}
