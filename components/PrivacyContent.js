'use client';

import TextPage from './TextPage';
import { useLanguage } from '../lib/i18n';

// Pequenas frases guardadas no i18n.js trazem {b}...{/b} à volta da parte
// que deve aparecer a negrito — esta função separa isso em pedaços para
// se poder desenhar o <b> a sério em JSX.
function BoldSplit({ text }) {
  const parts = text.split(/\{\/?b\}/);
  if (parts.length === 1) return <>{text}</>;
  return <><b>{parts[1]}</b>{parts[2]}</>;
}

export default function PrivacyContent() {
  const { t } = useLanguage();
  return (
    <TextPage title={t('priv_title')}>
      <p style={{ marginBottom: 16 }}>
        <BoldSplit text={t('priv_intro')} />
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>{t('priv_h_what_data')}</h2>
      <ul style={{ marginBottom: 16, paddingLeft: 20 }}>
        <li style={{ marginBottom: 6 }}><BoldSplit text={t('priv_li_account')} /></li>
        <li style={{ marginBottom: 6 }}><BoldSplit text={t('priv_li_publish')} /></li>
        <li style={{ marginBottom: 6 }}><BoldSplit text={t('priv_li_contact_owner')} /></li>
        <li style={{ marginBottom: 6 }}><BoldSplit text={t('priv_li_support')} /></li>
        <li style={{ marginBottom: 6 }}><BoldSplit text={t('priv_li_subscription')} /></li>
      </ul>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>{t('priv_h_why')}</h2>
      <p style={{ marginBottom: 16 }}>{t('priv_why_text')}</p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>{t('priv_h_sharing')}</h2>
      <p style={{ marginBottom: 16 }}>{t('priv_sharing_1')}</p>
      <p style={{ marginBottom: 16 }}>{t('priv_sharing_2')}</p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>{t('priv_h_retention')}</h2>
      <p style={{ marginBottom: 16 }}>{t('priv_retention_text')}</p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>{t('priv_h_rights')}</h2>
      <p style={{ marginBottom: 16 }}>{t('priv_rights_text')}</p>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 20, marginBottom: 8 }}>{t('priv_h_cookies')}</h2>
      <p>
        {t('priv_cookies_text')} <a href="/cookies" style={{ color: 'var(--telha)' }}>{t('priv_cookies_link')}</a>.
      </p>
    </TextPage>
  );
}
