'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import Header from '../../components/Header';

function ChatInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(searchParams.get('c') || null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { router.push('/login'); return; }
      setUser(currentUser);

      const { data } = await supabase
        .from('conversations')
        .select(`
          id, property_id, buyer_id, seller_id, properties (address, typology),
          buyer:profiles!conversations_buyer_id_fkey (full_name, agency_name),
          seller:profiles!conversations_seller_id_fkey (full_name, agency_name)
        `)
        .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      setConversations(data || []);
      if (!activeId && data && data.length > 0) setActiveId(data[0].id);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId || !user) return;
    async function loadMessages() {
      const { data } = await supabase
        .from('messages').select('*').eq('conversation_id', activeId).order('created_at', { ascending: true });
      setMessages(data || []);

      // Marca como lidas as mensagens que não foram enviadas por mim
      await supabase.from('messages').update({ read: true })
        .eq('conversation_id', activeId).eq('read', false).neq('sender_id', user.id);
    }
    loadMessages();

    const channel = supabase
      .channel(`messages-${activeId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeId}` },
        (payload) => {
          setMessages((cur) => [...cur, payload.new]);
          if (payload.new.sender_id !== user.id) {
            supabase.from('messages').update({ read: true }).eq('id', payload.new.id);
          }
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeId, user]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await supabase.from('messages').insert({ conversation_id: activeId, sender_id: user.id, content: text.trim() });
    setText('');
  }

  const activeConversation = conversations.find((c) => c.id === activeId);

  if (loading) return (<><Header /><div className="wrap" style={{ padding: 60 }}>...</div></>);

  return (
    <>
      <Header />
    <div className="wrap" style={{ padding: '40px 32px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className="display" style={{ fontSize: 26 }}>{t('chat_title')}</h1>
      </div>

      {conversations.length === 0 ? (
        <div className="empty-state">{t('chat_empty')}</div>
      ) : (
        <div className="card" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: 520, overflow: 'hidden' }}>
          <div style={{ borderRight: '1px solid var(--line)', overflowY: 'auto' }}>
            {conversations.map((c) => {
              const otherPerson = c.buyer_id === user.id ? c.seller : c.buyer;
              const otherName = otherPerson?.agency_name || otherPerson?.full_name || 'Utilizador';
              return (
                <div
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  style={{
                    padding: '14px 16px', borderBottom: '1px solid var(--line)', cursor: 'pointer',
                    background: c.id === activeId ? 'var(--plaster)' : 'transparent',
                  }}
                >
                  <b style={{ fontSize: 13.5 }}>{otherName}</b>
                  <div style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 2 }}>
                    {c.properties?.typology} · {c.properties?.address}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', fontSize: 13.5, fontWeight: 600 }}>
              {activeConversation && (() => {
                const otherPerson = activeConversation.buyer_id === user.id ? activeConversation.seller : activeConversation.buyer;
                const otherName = otherPerson?.agency_name || otherPerson?.full_name || 'Utilizador';
                return `${otherName} · ${activeConversation.properties?.typology} · ${activeConversation.properties?.address}`;
              })()}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    maxWidth: '70%',
                    alignSelf: m.sender_id === user.id ? 'flex-end' : 'flex-start',
                  }}
                >
                  {m.sender_id !== user.id && (m.sender_name || m.sender_email) && (
                    <div style={{ fontSize: 10.5, color: 'var(--text-soft)', marginBottom: 2, paddingLeft: 2 }}>
                      {m.sender_name}{m.sender_name && m.sender_email && ' · '}{m.sender_email}
                    </div>
                  )}
                  <div
                    style={{
                      padding: '10px 14px', borderRadius: 12, fontSize: 13.5,
                      background: m.sender_id === user.id ? 'var(--telha)' : 'var(--plaster)',
                      color: m.sender_id === user.id ? '#fff' : 'var(--ink)',
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={sendMessage} style={{ display: 'flex', gap: 10, padding: 14, borderTop: '1px solid var(--line)' }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('chat_placeholder')}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid var(--line)' }}
              />
              <button type="submit" className="btn btn-primary" style={{ borderRadius: '50%', width: 40, height: 40, padding: 0 }}>&rarr;</button>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="wrap" style={{ padding: 60 }}>...</div>}>
      <ChatInner />
    </Suspense>
  );
}
