'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../lib/i18n';
import LanguageSwitcher from './LanguageSwitcher';

export default function Header() {
  const { t } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user || null);
      setChecked(true);
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
  }

  return (
    <header className="site-header">
      <div className="navbar">
        <Link href="/" className="logo">more<span>&middot;</span>ada</Link>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <LanguageSwitcher />
          <Link href="/chat" className="btn" style={{ marginRight: 12 }}>{t('nav_chat')}</Link>
          <Link href="/favorites" className="btn" style={{ marginRight: 12 }}>{t('nav_favorites')}</Link>
          {checked && user ? (
            <>
              <Link href="/dashboard" className="btn" style={{ marginRight: 12 }}>{t('dashboard_my_listings')}</Link>
              <button onClick={handleLogout} className="btn" style={{ marginRight: 12 }}>{t('nav_logout')}</button>
            </>
          ) : (
            <Link href="/login" className="btn" style={{ marginRight: 12 }}>{t('nav_login')}</Link>
          )}
          <Link href="/publish" className="btn btn-primary">{t('nav_publish')}</Link>
        </div>
      </div>
      <div className="tile-strip" />
    </header>
  );
}
