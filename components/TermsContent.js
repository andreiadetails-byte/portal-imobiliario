'use client';

import TextPage from './TextPage';
import { useLanguage } from '../lib/i18n';
import { PAYMENT_INFO } from '../lib/paymentInfo';

export default function TermsContent() {
  const { t } = useLanguage();
  return (
    <TextPage title={t('terms_title')}>
      <p style={{ marginBottom: 16 }}>{t('terms_intro')}</p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>{t('terms_h_nature')}</h2>
      <p style={{ marginBottom: 16 }}>{t('terms_nature_text')}</p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>{t('terms_h_accounts')}</h2>
      <p style={{ marginBottom: 16 }}>
        {t('terms_accounts_pre')} <b>{t('terms_accounts_particular')}</b> {t('terms_accounts_particular_desc')} <b>{t('terms_accounts_agency')}</b> {t('terms_accounts_post')}
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>{t('terms_h_subscription')}</h2>
      <p style={{ marginBottom: 16 }}>
        {t('terms_subscription_pre')} {PAYMENT_INFO.subscriptionFee.toFixed(2)} €{t('terms_subscription_post')}
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>{t('terms_h_listing_content')}</h2>
      <p style={{ marginBottom: 16 }}>{t('terms_listing_content_text')}</p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>{t('terms_h_featured')}</h2>
      <p style={{ marginBottom: 16 }}>{t('terms_featured_text')}</p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>{t('terms_h_behavior')}</h2>
      <p style={{ marginBottom: 16 }}>{t('terms_behavior_text')}</p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>{t('terms_h_liability')}</h2>
      <p style={{ marginBottom: 16 }}>{t('terms_liability_text')}</p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>{t('terms_h_changes')}</h2>
      <p style={{ marginBottom: 16 }}>{t('terms_changes_text')}</p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>{t('terms_h_law')}</h2>
      <p>
        {t('terms_law_pre')}{' '}
        <a href="https://www.livroreclamacoes.pt/Inicio/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--telha)' }}>
          {t('terms_law_link')}
        </a>{' '}
        {t('terms_law_post')}
      </p>
    </TextPage>
  );
}
