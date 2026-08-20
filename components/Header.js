'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { logVisitIfNeeded } from '../lib/logVisit';
import { Bell, Home, Search, Heart, MessageCircle } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import LanguageSwitcher from './LanguageSwitcher';

export default function Header({ minimal = false }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);
  const [adminPending, setAdminPending] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [subReminder, setSubReminder] = useState(null);
  const [subReminderDismissed, setSubReminderDismissed] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: profile } = await supabase.from('profiles')
          .select('is_admin, is_blocked, account_type, subscription_status, subscription_paid_until')
          .eq('id', data.user.id).single();

        if (profile?.is_blocked) {
          await supabase.auth.signOut();
          setUser(null);
          setChecked(true);
          if (typeof window !== 'undefined') window.location.href = '/login';
          return;
        }

        if (profile?.account_type === 'agencia' && profile.subscription_status === 'active' && profile.subscription_paid_until) {
          const paidUntil = new Date(profile.subscription_paid_until);
          const daysLeft = Math.ceil((paidUntil - new Date()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 2) setSubReminder({ daysLeft, paidUntil });
        }

        setUser(data.user);
        setIsAdmin(!!profile?.is_admin);
        loadUnreadChat(data.user.id);
        loadNotifications(data.user.id);
        logVisitIfNeeded(supabase, data.user.id);
        if (profile?.is_admin) loadAdminPending();
      } else {
        setUser(null);
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
      .in('conversation_id', ids).or('read.eq.false,read.is.null').neq('sender_id', userId);
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
    const wasOpen = notifOpen;
    setNotifOpen((o) => !o);
    if (!wasOpen && user) {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length > 0) {
        await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
        setNotifications((cur) => cur.map((n) => ({ ...n, read: true })));
      }
    } else if (wasOpen) {
      // Ao fechar o sino, as notificações já lidas desaparecem da lista —
      // só ficam visíveis enquanto a pessoa as está mesmo a ver.
      setNotifications((cur) => cur.filter((n) => !n.read));
    }
  }

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
  }

  return (
    <header className={`site-header${minimal ? ' header-minimal' : ''}`}>
      <div className="navbar">
        <Link href="/" className="logo" style={{ flexShrink: 0, marginRight: 20 }}>More<span>&middot;</span>ada</Link>
        <div className="navbar-links" style={{ display: 'flex', alignItems: 'center' }}>
          <LanguageSwitcher />

          {checked && user && (
            <div className="navbar-bell" style={{ position: 'relative', marginRight: 12 }}>
              <button
                onClick={toggleNotifications}
                className="btn"
                style={{ position: 'relative', padding: '11px 14px' }}
                aria-label="Notificações"
              >
                <Bell size={18} />
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
                  position: 'absolute', top: '110%', right: 0, width: 300, maxWidth: 'calc(100vw - 32px)', maxHeight: 360, overflowY: 'auto',
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
                        onClick={() => { setNotifOpen(false); setNotifications((cur) => cur.filter((x) => x.id !== n.id)); }}
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

          <div className="navbar-nav-links" style={{ display: 'flex', alignItems: 'center' }}>
          <Link href="/chat" className="btn" style={{ marginRight: 12, position: 'relative', minWidth: 110, textAlign: 'center' }}>
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
          <Link href="/favorites" className="btn" style={{ marginRight: 12, minWidth: 110, textAlign: 'center' }}>{t('nav_favorites')}</Link>
          {checked && user && (
            <>
              <Link href="/dashboard" className="btn" style={{ marginRight: 12, minWidth: 110, textAlign: 'center' }}>{t('dashboard_my_listings')}</Link>
              <Link href="/perfil" className="btn" style={{ marginRight: 12, minWidth: 110, textAlign: 'center' }}>{t('nav_account')}</Link>
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
            </>
          )}
          </div>
          {checked && user ? (
            <button onClick={handleLogout} className="btn navbar-login-btn" style={{ marginRight: 12, flexShrink: 0 }}>{t('nav_logout')}</button>
          ) : (
            <Link href="/login" className="btn navbar-login-btn" style={{ marginRight: 12, flexShrink: 0 }}>{t('nav_login')}</Link>
          )}
          <Link href="/publish" className="btn btn-primary navbar-publish-btn" style={{ minWidth: 130, textAlign: 'center' }}>{t('nav_publish')}</Link>
        </div>

        {/* Duas linhas fixas, só em telemóvel: (Entrar/Sair + Publicar) e (Favoritos + Mensagens) */}
        <div className="navbar-mobile-rows">
          <div className="navbar-mobile-row">
            {checked && user ? (
              <button onClick={handleLogout} className="btn">{t('nav_logout')}</button>
            ) : (
              <Link href="/login" className="btn">{t('nav_login')}</Link>
            )}
            <Link href="/publish" className="btn btn-primary">{t('nav_publish')}</Link>
          </div>
          <div className="navbar-mobile-row">
            <Link href="/favorites" className="btn">{t('nav_favorites')}</Link>
            <Link href="/chat" className="btn" style={{ position: 'relative' }}>
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
          </div>
        </div>
      </div>
      <div className="tile-strip" />

      <nav className="bottom-nav">
        <Link href="/" className="bottom-nav-item"><Home size={21} /><span>Início</span></Link>
        <Link href="/results" className="bottom-nav-item"><Search size={21} /><span>Pesquisar</span></Link>
        <Link href="/favorites" className="bottom-nav-item"><Heart size={21} /><span>Favoritos</span></Link>
        <Link href="/chat" className="bottom-nav-item" style={{ position: 'relative' }}>
          <MessageCircle size={21} /><span>Chat</span>
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
        <Link href={user ? '/dashboard' : '/login'} className="bottom-nav-item"><span style={{ fontSize: 21 }}>☰</span><span>{user ? 'Anúncios' : 'Entrar'}</span></Link>
      </nav>

      {subReminder && !subReminderDismissed && (
        <div style={{
          background: '#8a6a1f', color: '#fff', padding: '10px 20px', fontSize: 13.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap', textAlign: 'center',
        }}>
          <span>
            ⏰ A sua assinatura {subReminder.daysLeft <= 0 ? 'termina hoje' : `termina em ${subReminder.daysLeft} dia${subReminder.daysLeft === 1 ? '' : 's'}`} ({subReminder.paidUntil.toLocaleDateString('pt-PT')}). Renove para não perder o acesso ao seu painel.
          </span>
          <Link href="/assinatura" style={{ color: '#fff', fontWeight: 700, textDecoration: 'underline', flexShrink: 0 }}>Renovar agora</Link>
          <button
            onClick={() => setSubReminderDismissed(true)}
            aria-label="Fechar aviso"
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}
          >
            ✕
          </button>
        </div>
      )}
    </header>
  );
}
