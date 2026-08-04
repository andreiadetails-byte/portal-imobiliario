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
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user || null);
      if (data.user) {
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', data.user.id).single();
        setIsAdmin(!!profile?.is_admin);
        loadUnread(data.user.id);
      }
      setChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('header-unread-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => loadUnread(user.id))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => loadUnread(user.id))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadUnread(userId) {
    const { data: convs } = await supabase
      .from('conversations').select('id').or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
    const ids = (convs || []).map((c) => c.id);
    if (ids.length === 0) { setUnreadCount(0); return; }
    const { count } = await supabase
      .from('messages').select('id', { count: 'exact', head: true })
      .in('conversation_id', ids).eq('read', false).neq('sender_id', userId);
    setUnreadCount(count || 0);
  }

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
          <Link href="/chat" className="btn" style={{ marginRight: 12, position: 'relative' }}>
            {t('nav_chat')}
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6, minWidth: 16, height: 16, borderRadius: 8,
                background: '#b8452f', color: '#fff', fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <Link href="/favorites" className="btn" style={{ marginRight: 12 }}>{t('nav_favorites')}</Link>
          {checked && user ? (
            <>
              <Link href="/dashboard" className="btn" style={{ marginRight: 12 }}>{t('dashboard_my_listings')}</Link>
              {isAdmin && (
                <Link href="/admin" className="btn" style={{ marginRight: 12, color: 'var(--telha)' }}>⚙ Admin</Link>
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
