'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
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
  const [filter, setFilter] = useState('todas');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function init() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { router.push('/login'); return; }
      setUser(currentUser);

      const { data } = await supabase
        .from('conversations')
        .select(`
          id, property_id, buyer_id, seller_id, status,
          properties (id, address, typology, price, business_type, property_photos(url, position)),
          buyer:profiles!conversations_buyer_id_fkey (full_name, agency_name),
          seller:profiles!conversations_seller_id_fkey (full_name, agency_name)
        `)
        .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      const convs = data || [];
      const ids = convs.map((c) => c.id);

      let lastMessages = {};
      let unreadCounts = {};
      if (ids.length > 0) {
        const { data: allMsgs } = await supabase
          .from('messages')
          .select('conversation_id, content, sender_id, sender_name, sender_email, sender_phone, created_at, read')
          .in('conversation_id', ids)
          .order('created_at', { ascending: true });

        (allMsgs || []).forEach((m) => {
          lastMessages[m.conversation_id] = m; // fica o último, já que estão por ordem ascendente
          if (m.sender_id !== currentUser.id && !m.read) {
            unreadCounts[m.conversation_id] = (unreadCounts[m.conversation_id] || 0) + 1;
          }
        });
      }

      const enriched = convs.map((c) => ({
        ...c,
        lastMessage: lastMessages[c.id] || null,
        unreadCount: unreadCounts[c.id] || 0,
      }));

      setConversations(enriched);
      if (!activeId && enriched.length > 0) setActiveId(enriched[0].id);
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

      await supabase.from('messages').update({ read: true })
        .eq('conversation_id', activeId).eq('read', false).neq('sender_id', user.id);

      setConversations((cur) => cur.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c)));
    }
    loadMessages();

    const channel = supabase
      .channel(`messages-${activeId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeId}` },
        (payload) => {
          setMessages((cur) => [...cur, payload.new]);
          setConversations((cur) => cur.map((c) => (c.id === activeId ? { ...c, lastMessage: payload.new } : c)));
          if (payload.new.sender_id !== user.id) {
            supabase.from('messages').update({ read: true }).eq('id', payload.new.id);
            const conv = conversations.find((c) => c.id === activeId);
            if (conv?.status === 'tratada') {
              supabase.from('conversations').update({ status: 'aberta' }).eq('id', activeId);
              setConversations((cur) => cur.map((c) => (c.id === activeId ? { ...c, status: 'aberta' } : c)));
            }
          }
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeId, user]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const content = text.trim();
    setText('');
    const { data } = await supabase.from('messages').insert({ conversation_id: activeId, sender_id: user.id, content }).select().single();
    if (data) setConversations((cur) => cur.map((c) => (c.id === activeId ? { ...c, lastMessage: data } : c)));
  }

  async function toggleConversationStatus(convId, currentStatus) {
    const newStatus = currentStatus === 'tratada' ? 'aberta' : 'tratada';
    await supabase.from('conversations').update({ status: newStatus }).eq('id', convId);
    setConversations((cur) => cur.map((c) => (c.id === convId ? { ...c, status: newStatus } : c)));
  }

  function otherPersonOf(c) {
    const person = c.buyer_id === user.id ? c.seller : c.buyer;
    return { name: person?.agency_name || person?.full_name || 'Utilizador' };
  }

  const activeConversation = conversations.find((c) => c.id === activeId);

  const filteredConversations = conversations
    .filter((c) => {
      if (filter === 'nao_lidos') return c.unreadCount > 0;
      if (filter === 'tratadas') return c.status === 'tratada';
      if (filter === 'pendentes') return c.status !== 'tratada';
      return true; // todas
    })
    .filter((c) => {
      if (!search.trim()) return true;
      const term = search.trim().toLowerCase();
      const { name } = otherPersonOf(c);
      const contact = `${c.lastMessage?.sender_name || ''} ${c.lastMessage?.sender_email || ''}`.toLowerCase();
      const propText = `${c.properties?.typology || ''} ${c.properties?.address || ''}`.toLowerCase();
      return name.toLowerCase().includes(term) || contact.includes(term) || propText.includes(term);
    });

  if (loading) return (<><Header /><div className="wrap" style={{ padding: 60 }}>...</div></>);

  return (
    <>
      <Header />
    <div className="wrap" style={{ padding: '40px 32px 80px' }}>
      <h1 className="display" style={{ fontSize: 26, marginBottom: 20 }}>{t('chat_title')}</h1>

      {conversations.length === 0 ? (
        <div className="empty-state">{t('chat_empty')}</div>
      ) : (
        <div className="card" style={{ display: 'grid', gridTemplateColumns: '460px 1fr', height: 560, overflow: 'hidden' }}>
          <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                {[['todas', 'Todos'], ['nao_lidos', 'Não lidos'], ['pendentes', 'Por gerir'], ['tratadas', 'Tratadas']].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className="btn"
                    style={{
                      fontSize: 11.5, padding: '5px 10px',
                      background: filter === value ? 'var(--telha)' : 'transparent',
                      color: filter === value ? '#fff' : 'var(--ink)',
                      borderColor: filter === value ? 'var(--telha)' : 'var(--ink)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome, email ou imóvel"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 20, border: '1px solid var(--line)', fontSize: 12.5 }}
              />
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredConversations.length === 0 && (
                <p style={{ padding: 16, fontSize: 12.5, color: 'var(--text-soft)' }}>Nenhuma conversa neste filtro.</p>
              )}
              {filteredConversations.map((c) => {
                const { name } = otherPersonOf(c);
                const photo = c.properties?.property_photos?.sort((a, b) => a.position - b.position)[0]?.url;
                const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
                const contact = [c.lastMessage?.sender_email, c.lastMessage?.sender_phone].filter(Boolean).join(' · ') || c.lastMessage?.sender_name;
                const isUnread = c.unreadCount > 0;
                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    style={{
                      display: 'flex', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--line)', cursor: 'pointer',
                      background: c.id === activeId ? 'var(--plaster)' : 'transparent', alignItems: 'flex-start',
                    }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', background: 'var(--azulejo)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0,
                    }}>
                      {initials || '?'}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                        <b style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</b>
                        <span style={{ fontSize: 10, color: 'var(--text-soft)', flexShrink: 0 }}>
                          {c.lastMessage ? new Date(c.lastMessage.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) : ''}
                        </span>
                      </div>
                      {contact && (
                        <div style={{ fontSize: 11, color: 'var(--text-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {contact}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt="" style={{ width: 32, height: 26, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 32, height: 26, borderRadius: 3, background: 'linear-gradient(135deg, var(--azulejo), #4A5A3C)', flexShrink: 0 }} />
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.properties?.typology} · {c.properties?.address}
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-soft)' }}>
                            {c.properties && `${Number(c.properties.price).toLocaleString('pt-PT')} €`}
                          </div>
                        </div>
                      </div>

                      <div style={{
                        fontSize: 11.5, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        fontWeight: isUnread ? 700 : 400, color: isUnread ? 'var(--ink)' : 'var(--text-soft)',
                      }}>
                        {c.lastMessage?.content || 'Sem mensagens ainda'}
                      </div>

                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        {isUnread && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: '#b8452f', color: '#fff' }}>
                            {c.unreadCount} NOVA{c.unreadCount > 1 ? 'S' : ''}
                          </span>
                        )}
                        {c.status === 'tratada' && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: 'var(--line)', color: 'var(--text-soft)' }}>
                            TRATADA
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ borderBottom: '1px solid var(--line)' }}>
              <div style={{ padding: '14px 18px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>
                  {activeConversation && otherPersonOf(activeConversation).name}
                </span>
                {activeConversation && (
                  <button
                    onClick={() => toggleConversationStatus(activeConversation.id, activeConversation.status)}
                    className="btn"
                    style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0 }}
                  >
                    {activeConversation.status === 'tratada' ? '↺ Reabrir' : '✓ Marcar como tratada'}
                  </button>
                )}
              </div>
              {activeConversation?.properties && (
                <Link
                  href={`/property/${activeConversation.properties.id}`}
                  target="_blank"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px 12px' }}
                >
                  {(() => {
                    const photo = activeConversation.properties.property_photos?.sort((a, b) => a.position - b.position)[0]?.url;
                    return photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" style={{ width: 44, height: 34, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 44, height: 34, borderRadius: 4, background: 'linear-gradient(135deg, var(--azulejo), #4A5A3C)', flexShrink: 0 }} />
                    );
                  })()}
                  <div style={{ fontSize: 12, lineHeight: 1.3 }}>
                    <div style={{ fontWeight: 600 }}>
                      {activeConversation.properties.typology} · {activeConversation.properties.address}
                    </div>
                    <div style={{ color: 'var(--text-soft)' }}>
                      {Number(activeConversation.properties.price).toLocaleString('pt-PT')} {activeConversation.properties.business_type === 'Arrendamento' ? '€/mês' : '€'} · Ver anúncio ↗
                    </div>
                  </div>
                </Link>
              )}
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
                      {m.sender_name}{m.sender_name && (m.sender_email || m.sender_phone) && ' · '}{m.sender_email}{m.sender_email && m.sender_phone && ' · '}{m.sender_phone}
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
