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
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user || null);
      if (data.user) {
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', data.user.id).single();
        setIsAdmin(!!profile?.is_admin);
      }
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
              {isAdmin && (
                <Link href="/admin" className="btn" style={{ marginRight: 12, color: 'var(--telha)' }}>Admin</Link>
              )}
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
