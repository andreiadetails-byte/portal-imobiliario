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
  const [unreadChat, setUnreadChat] = useState(0);
  const [adminPending, setAdminPending] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user || null);
      if (data.user) {
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', data.user.id).single();
        setIsAdmin(!!profile?.is_admin);
        loadUnreadChat(data.user.id);
        loadNotifications(data.user.id);
        if (profile?.is_admin) loadAdminPending();
      }
      setChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('header-unread-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => loadUnreadChat(user.id))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => loadUnreadChat(user.id))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => loadNotifications(user.id))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadUnreadChat(userId) {
    const { data: convs } = await supabase
      .from('conversations').select('id').or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
    const ids = (convs || []).map((c) => c.id);
    if (ids.length === 0) { setUnreadChat(0); return; }
    const { count } = await supabase
      .from('messages').select('id', { count: 'exact', head: true })
      .in('conversation_id', ids).eq('read', false).neq('sender_id', userId);
    setUnreadChat(count || 0);
  }

  async function loadNotifications(userId) {
    const { data } = await supabase
      .from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
    setNotifications(data || []);
  }

  async function loadAdminPending() {
    const { count: destaques } = await supabase
      .from('properties').select('id', { count: 'exact', head: true }).eq('featured_status', 'pending');
    const { count: denuncias } = await supabase
      .from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pendente');
    const { count: suporte } = await supabase
      .from('support_requests').select('id', { count: 'exact', head: true }).eq('read_by_admin', false);
    setAdminPending((destaques || 0) + (denuncias || 0) + (suporte || 0));
  }

  async function toggleNotifications() {
    setNotifOpen((o) => !o);
    if (!notifOpen && user) {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length > 0) {
        await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
        setNotifications((cur) => cur.map((n) => ({ ...n, read: true })));
      }
    }
  }

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
  }

  return (
    <header className="site-header">
      <div className="navbar">
        <Link href="/" className="logo">More<span>&middot;</span>ada</Link>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <LanguageSwitcher />

          {checked && user && (
            <div style={{ position: 'relative', marginRight: 12 }}>
              <button
                onClick={toggleNotifications}
                className="btn"
                style={{ position: 'relative', padding: '11px 14px' }}
                aria-label="Notificações"
              >
                🔔
                {unreadNotifCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -6, right: -6, minWidth: 16, height: 16, borderRadius: 8,
                    background: '#b8452f', color: '#fff', fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                  }}>
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div style={{
                  position: 'absolute', top: '110%', right: 0, width: 300, maxHeight: 360, overflowY: 'auto',
                  background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8,
                  boxShadow: '0 10px 30px rgba(51,46,34,0.18)', zIndex: 50,
                }}>
                  {notifications.length === 0 ? (
                    <p style={{ padding: 16, fontSize: 13, color: 'var(--text-soft)' }}>Sem notificações.</p>
                  ) : (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={n.link || '#'}
                        onClick={() => setNotifOpen(false)}
                        style={{ display: 'block', padding: '12px 14px', borderBottom: '1px solid var(--line)', fontSize: 12.5 }}
                      >
                        {n.message}
                        <div style={{ fontSize: 10.5, color: 'var(--text-soft)', marginTop: 4 }}>
                          {new Date(n.created_at).toLocaleString('pt-PT')}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <Link href="/chat" className="btn" style={{ marginRight: 12, position: 'relative' }}>
            {t('nav_chat')}
            {unreadChat > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6, minWidth: 16, height: 16, borderRadius: 8,
                background: '#b8452f', color: '#fff', fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
              }}>
                {unreadChat > 9 ? '9+' : unreadChat}
              </span>
            )}
          </Link>
          <Link href="/favorites" className="btn" style={{ marginRight: 12 }}>{t('nav_favorites')}</Link>
          {checked && user ? (
            <>
              <Link href="/dashboard" className="btn" style={{ marginRight: 12 }}>{t('dashboard_my_listings')}</Link>
              {isAdmin && (
                <Link href="/admin" className="btn" style={{ marginRight: 12, color: 'var(--telha)', position: 'relative' }}>
                  ⚙ Admin
                  {adminPending > 0 && (
                    <span style={{
                      position: 'absolute', top: -6, right: -6, minWidth: 16, height: 16, borderRadius: 8,
                      background: '#b8452f', color: '#fff', fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                    }}>
                      {adminPending > 9 ? '9+' : adminPending}
                    </span>
                  )}
                </Link>
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

      <nav className="bottom-nav">
        <Link href="/" className="bottom-nav-item"><span style={{ fontSize: 21 }}>🏠</span><span>Início</span></Link>
        <Link href="/results" className="bottom-nav-item"><span style={{ fontSize: 21 }}>🔍</span><span>Pesquisar</span></Link>
        <Link href="/favorites" className="bottom-nav-item"><span style={{ fontSize: 21 }}>♡</span><span>Favoritos</span></Link>
        <Link href="/chat" className="bottom-nav-item" style={{ position: 'relative' }}>
          <span style={{ fontSize: 21 }}>💬</span><span>Chat</span>
          {unreadChat > 0 && (
            <span style={{
              position: 'absolute', top: 0, right: 18, minWidth: 15, height: 15, borderRadius: 8,
              background: 'var(--brass)', color: '#3E2E1A', fontSize: 9.5, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
              boxShadow: '0 0 0 2px var(--telha)',
            }}>
              {unreadChat > 9 ? '9+' : unreadChat}
            </span>
          )}
        </Link>
        <Link href={user ? '/dashboard' : '/login'} className="bottom-nav-item"><span style={{ fontSize: 21 }}>☰</span><span>{user ? 'Painel' : 'Entrar'}</span></Link>
      </nav>
    </header>
  );
}
