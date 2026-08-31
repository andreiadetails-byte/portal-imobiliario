'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import { agentLabel } from '../../lib/agentNames';

export default function MensagensSuportePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [supportThreads, setSupportThreads] = useState([]);
  const [replyText, setReplyText] = useState({});
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
    const text = (replyText[requestId] || '').trim();
    if (!text) return;
    await supabase.from('support_replies').insert({ support_request_id: requestId, sender_role: 'user', message: text });
    setReplyText((cur) => ({ ...cur, [requestId]: '' }));
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
    return `${d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return (
    <>
      <Header />
      <main id="main-content" className="wrap" style={{ maxWidth: 760, padding: '40px 32px 80px' }}>
        <BackButton fallback="/" />
        <h1 className="display" style={{ fontSize: 26, marginBottom: 24 }}>{t('support_title')}</h1>

        {loading ? (
          <p style={{ fontSize: 15, color: 'var(--text-soft)' }}>{t('comparar_loading')}</p>
        ) : supportThreads.length === 0 ? (
          <p className="empty-state">{t('support_no_messages_yet')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {supportThreads.map((r) => (
              <div key={r.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>
                    Conversa com {agentLabel(r.agent_name)}
                  </span>
                  <button
                    onClick={() => deleteThread(r.id)}
                    aria-label={t('attr_delete_conversation')}
                    title={t('attr_delete_conv_permanent')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a3b2a', fontSize: 15 }}
                  >
                    🗑
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                  <div style={{ alignSelf: 'flex-end', maxWidth: '80%', minWidth: 0 }}>
                    <div style={{ background: 'var(--telha)', color: '#fff', padding: '10px 14px', borderRadius: 12, fontSize: 16, lineHeight: 1.4, minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                      {r.message}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 3, textAlign: 'right', paddingRight: 2 }}>
                      {formatTime(r.created_at)}
                      {' · '}
                      {r.read_by_admin ? `Visto${r.read_by_admin_at ? ` às ${new Date(r.read_by_admin_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}` : ''}` : 'Ainda não visto'}
                    </div>
                  </div>
                  {r.replies.map((rep) => (
                    <div key={rep.id} style={{ alignSelf: rep.sender_role === 'admin' ? 'flex-start' : 'flex-end', maxWidth: '80%', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: rep.sender_role === 'admin' ? 'row' : 'row-reverse', minWidth: 0 }}>
                        <div
                          style={{
                            padding: '10px 14px', borderRadius: 12, fontSize: 16, lineHeight: 1.4,
                            minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word',
                            background: rep.sender_role === 'admin' ? 'var(--plaster)' : 'var(--telha)',
                            color: rep.sender_role === 'admin' ? 'var(--ink)' : '#fff',
                          }}
                        >
                          {rep.message}
                        </div>
                        {rep.sender_role === 'user' && !rep.read_at && (
                          <button
                            onClick={() => deleteReply(r.id, rep.id)}
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

                <div style={{ display: 'flex', gap: 8 }}>
                  {r.status === 'resolvida' ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'var(--plaster)', borderRadius: 8, padding: '10px 14px' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>✓ Esta conversa foi marcada como tratada.</span>
                      <button onClick={() => reopenThread(r.id)} className="btn" style={{ fontSize: 12.5, flexShrink: 0 }}>Reabrir</button>
                    </div>
                  ) : (
                    <>
                      <input
                        value={replyText[r.id] || ''}
                        onChange={(e) => setReplyText((cur) => ({ ...cur, [r.id]: e.target.value }))}
                        placeholder={t('attr_write_message')}
                        style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid var(--line)', fontSize: 16 }}
                      />
                      <button onClick={() => sendSupportReply(r.id)} className="btn btn-primary" style={{ fontSize: 13.5 }}>{t('support_send')}</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
