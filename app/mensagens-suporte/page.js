'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import { agentLabel } from '../../lib/agentNames';

function MensagensSuporteInner() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightedId = searchParams.get('id');
  const [userId, setUserId] = useState(null);
  const [supportThreads, setSupportThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);
      await loadSupport(user.id);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Se se veio de uma notificação (com o id da conversa específica), abre
  // logo essa conversa, em vez de ser preciso a procurar na lista.
  useEffect(() => {
    if (!highlightedId || supportThreads.length === 0) return;
    setActiveId(highlightedId);
  }, [highlightedId, supportThreads]);

  // Ao abrir a página, se ainda não estiver nenhuma escolhida, escolhe
  // automaticamente a mais recente — para nunca ficar um ecrã vazio.
  useEffect(() => {
    if (!activeId && supportThreads.length > 0) {
      setActiveId(supportThreads[0].id);
    }
  }, [supportThreads, activeId]);

  // Atualiza a conversa em tempo real — assim que o admin responde, a
  // resposta aparece logo aqui, sem ser preciso sair e voltar a entrar.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`support-replies-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_replies' }, () => loadSupport(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_requests', filter: `user_id=eq.${userId}` }, () => loadSupport(userId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  async function loadSupport(uid) {
    const { data: requests } = await supabase
      .from('support_requests').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    const withReplies = await Promise.all((requests || []).map(async (r) => {
      const { data: replies } = await supabase
        .from('support_replies').select('*').eq('support_request_id', r.id).order('created_at', { ascending: true });
      // Marca como lidas (com a hora exata) as respostas do admin que a
      // pessoa ainda não tinha visto — igual ao que o chat já faz.
      const now = new Date().toISOString();
      const unseenAdminReplies = (replies || []).filter((rep) => rep.sender_role === 'admin' && !rep.read_at);
      if (unseenAdminReplies.length > 0) {
        await supabase.from('support_replies').update({ read_at: now, read_by_user: true })
          .in('id', unseenAdminReplies.map((rep) => rep.id));
        unseenAdminReplies.forEach((rep) => { rep.read_at = now; });
      }
      return { ...r, replies: replies || [] };
    }));
    setSupportThreads(withReplies);
  }

  async function sendSupportReply(requestId) {
    const text = replyText.trim();
    if (!text) return;
    await supabase.from('support_replies').insert({ support_request_id: requestId, sender_role: 'user', message: text });
    setReplyText('');
    loadSupport(userId);
  }

  async function reopenThread(requestId) {
    await supabase.from('support_requests').update({ status: 'aberta' }).eq('id', requestId);
    setSupportThreads((cur) => cur.map((r) => (r.id === requestId ? { ...r, status: 'aberta' } : r)));
  }

  async function deleteThread(requestId) {
    if (!confirm('Apagar esta conversa inteira? Esta ação não pode ser desfeita.')) return;
    await supabase.from('support_replies').delete().eq('support_request_id', requestId);
    await supabase.from('support_requests').delete().eq('id', requestId);
    setSupportThreads((cur) => cur.filter((r) => r.id !== requestId));
    if (activeId === requestId) setActiveId(null);
  }

  async function deleteReply(requestId, replyId) {
    if (!confirm('Apagar esta mensagem? Esta ação não pode ser desfeita.')) return;
    await supabase.from('support_replies').delete().eq('id', replyId);
    setSupportThreads((cur) => cur.map((r) => (
      r.id === requestId ? { ...r, replies: r.replies.filter((rep) => rep.id !== replyId) } : r
    )));
  }

  function formatTime(dateStr) {
    const d = new Date(dateStr);
    const isToday = d.toDateString() === new Date().toDateString();
    const time = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    return isToday ? time : `${d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })} · ${time}`;
  }

  const activeThread = supportThreads.find((r) => r.id === activeId);

  if (loading) return (<><Header /><div className="wrap" style={{ padding: 60, background: 'var(--paper)', borderRadius: 16, marginTop: 24 }}>...</div></>);

  return (
    <>
      <Header />
      <main id="main-content" className="wrap" style={{ padding: '24px 32px 80px', background: 'var(--paper)', borderRadius: 16, marginTop: 24 }}>
        <BackButton fallback="/" />
        <h1 className="display" style={{ fontSize: 26, marginBottom: 20 }}>{t('support_title')}</h1>

        {supportThreads.length === 0 ? (
          <div className="empty-state">{t('support_no_messages_yet')}</div>
        ) : (
          <div className="card chat-grid" style={{ display: 'grid', gridTemplateColumns: '460px 1fr', height: 'calc(100vh - 200px)', minHeight: 420, maxHeight: 700, overflow: 'hidden' }}>
            {/* Coluna da lista de conversas, com a foto da estante como fundo */}
            <div className={`chat-list-col${activeId ? ' chat-hide-mobile' : ''}`} style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, position: 'relative' }}>
              <img src="/mood/estante-livros-v2.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(126,143,106,0.78)', zIndex: 0 }} />
              <div style={{ position: 'relative', zIndex: 1, overflowY: 'auto', flex: 1, minHeight: 0, padding: '14px 0' }}>
                {supportThreads.map((r) => {
                  const lastMsg = r.replies.length > 0 ? r.replies[r.replies.length - 1] : { message: r.message, created_at: r.created_at };
                  const unreadCount = r.replies.filter((rep) => rep.sender_role === 'admin' && !rep.read_at).length;
                  return (
                    <div
                      key={r.id}
                      id={`support-thread-${r.id}`}
                      onClick={() => setActiveId(r.id)}
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 16px', margin: '0 10px 12px',
                        border: (highlightedId === r.id || r.id === activeId) ? '1.5px solid var(--telha)' : '1px solid var(--line)',
                        borderRadius: 8, cursor: 'pointer',
                        background: r.id === activeId ? 'var(--plaster)' : 'rgba(255,255,255,0.8)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                        <b style={{ fontSize: 14.5 }}>Conversa com {agentLabel(r.agent_name)}</b>
                        {unreadCount > 0 && (
                          <span style={{ background: 'var(--telha)', color: '#fff', fontSize: 10.5, fontWeight: 700, borderRadius: 10, padding: '1px 7px' }}>
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lastMsg.message}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>{formatTime(lastMsg.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coluna da conversa aberta */}
            <div className={`chat-thread-col${activeId ? '' : ' chat-hide-mobile'}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              {!activeThread ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-soft)', fontSize: 14 }}>
                  Escolha uma conversa à esquerda.
                </div>
              ) : (
                <>
                  <div style={{ borderBottom: '1px solid var(--line)', flexShrink: 0, padding: '14px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600 }}>
                        <button onClick={() => setActiveId(null)} className="chat-back-btn" aria-label={t('attr_back_to_conversations')}>←</button>
                        Conversa com {agentLabel(activeThread.agent_name)}
                      </span>
                      <button
                        onClick={() => deleteThread(activeThread.id)}
                        aria-label={t('attr_delete_conversation')}
                        title={t('attr_delete_conv_permanent')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a3b2a', fontSize: 15 }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ alignSelf: 'flex-end', maxWidth: '80%', minWidth: 0 }}>
                      <div style={{ background: 'var(--green-vivid)', color: '#fff', padding: '10px 14px', borderRadius: 12, fontSize: 16, lineHeight: 1.4, minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                        {activeThread.message}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 3, textAlign: 'right', paddingRight: 2 }}>
                        {formatTime(activeThread.created_at)}
                        {' · '}
                        {activeThread.read_by_admin ? `Visto${activeThread.read_by_admin_at ? ` às ${new Date(activeThread.read_by_admin_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}` : ''}` : 'Ainda não visto'}
                      </div>
                    </div>
                    {activeThread.replies.map((rep) => (
                      <div key={rep.id} style={{ alignSelf: rep.sender_role === 'admin' ? 'flex-start' : 'flex-end', maxWidth: '80%', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: rep.sender_role === 'admin' ? 'row' : 'row-reverse', minWidth: 0 }}>
                          <div
                            style={{
                              padding: '10px 14px', borderRadius: 12, fontSize: 16, lineHeight: 1.4,
                              minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word',
                              background: rep.sender_role === 'admin' ? 'var(--green-aqua)' : 'var(--green-vivid)',
                              color: '#fff',
                            }}
                          >
                            {rep.message}
                          </div>
                          {rep.sender_role === 'user' && !rep.read_at && (
                            <button
                              onClick={() => deleteReply(activeThread.id, rep.id)}
                              aria-label={t('attr_delete_message')}
                              title={t('attr_delete_message_unseen')}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a3b2a', fontSize: 13, flexShrink: 0 }}
                            >
                              🗑
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 3, textAlign: rep.sender_role === 'admin' ? 'left' : 'right', paddingLeft: rep.sender_role === 'admin' ? 2 : 0, paddingRight: rep.sender_role === 'admin' ? 0 : 2 }}>
                          {formatTime(rep.created_at)}
                          {rep.sender_role === 'user' && (
                            <>{' · '}{rep.read_at ? `Visto às ${new Date(rep.read_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}` : 'Ainda não visto'}</>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 10, padding: 14, borderTop: '1px solid var(--line)', flexShrink: 0 }}>
                    {activeThread.status === 'resolvida' ? (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'var(--plaster)', borderRadius: 8, padding: '10px 14px' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>✓ Esta conversa foi marcada como tratada.</span>
                        <button onClick={() => reopenThread(activeThread.id)} className="btn" style={{ fontSize: 12.5, flexShrink: 0 }}>Reabrir</button>
                      </div>
                    ) : (
                      <>
                        <input
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={t('attr_write_message')}
                          style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid var(--line)', fontSize: 16 }}
                        />
                        <button onClick={() => sendSupportReply(activeThread.id)} className="btn btn-primary" style={{ borderRadius: '50%', width: 40, height: 40, padding: 0 }}>&rarr;</button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default function MensagensSuportePage() {
  return (
    <Suspense fallback={<div className="wrap" style={{ padding: 60, background: 'var(--paper)', borderRadius: 16, marginTop: 24 }}>...</div>}>
      <MensagensSuporteInner />
    </Suspense>
  );
}
