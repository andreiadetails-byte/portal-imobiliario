'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';

export default function MensagensSuportePage() {
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

  async function loadSupport(uid) {
    const { data: requests } = await supabase
      .from('support_requests').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    const withReplies = await Promise.all((requests || []).map(async (r) => {
      const { data: replies } = await supabase
        .from('support_replies').select('*').eq('support_request_id', r.id).order('created_at', { ascending: true });
      // marca respostas do admin como lidas ao abrir a página
      await supabase.from('support_replies').update({ read_by_user: true })
        .eq('support_request_id', r.id).eq('sender_role', 'admin').eq('read_by_user', false);
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

  async function deleteThread(requestId) {
    if (!confirm('Apagar esta conversa? Esta ação não pode ser desfeita.')) return;
    await supabase.from('support_replies').delete().eq('support_request_id', requestId);
    await supabase.from('support_requests').delete().eq('id', requestId);
    setSupportThreads((cur) => cur.filter((r) => r.id !== requestId));
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
        <h1 className="display" style={{ fontSize: 26, marginBottom: 24 }}>Mensagens de suporte</h1>

        {loading ? (
          <p style={{ fontSize: 15, color: 'var(--text-soft)' }}>A carregar...</p>
        ) : supportThreads.length === 0 ? (
          <p className="empty-state">Ainda não enviou nenhuma mensagem de suporte.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {supportThreads.map((r) => (
              <div key={r.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>
                    Conversa com {r.agent_name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12.5, color: r.read_by_admin ? 'var(--azulejo)' : 'var(--text-soft)', fontWeight: r.read_by_admin ? 600 : 400 }}>
                      {r.read_by_admin ? '✓ Visto' : 'Ainda não visto'}
                    </span>
                    {!r.read_by_admin && (
                      <button
                        onClick={() => deleteThread(r.id)}
                        aria-label="Apagar conversa"
                        title="Apagar conversa (ainda não foi vista)"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a3b2a', fontSize: 15 }}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                  <div style={{ alignSelf: 'flex-end', maxWidth: '80%' }}>
                    <div style={{ background: 'var(--telha)', color: '#fff', padding: '10px 14px', borderRadius: 12, fontSize: 16, lineHeight: 1.4 }}>
                      {r.message}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 3, textAlign: 'right', paddingRight: 2 }}>
                      {formatTime(r.created_at)}
                    </div>
                  </div>
                  {r.replies.map((rep) => (
                    <div key={rep.id} style={{ alignSelf: rep.sender_role === 'admin' ? 'flex-start' : 'flex-end', maxWidth: '80%' }}>
                      <div
                        style={{
                          padding: '10px 14px', borderRadius: 12, fontSize: 16, lineHeight: 1.4,
                          background: rep.sender_role === 'admin' ? 'var(--plaster)' : 'var(--telha)',
                          color: rep.sender_role === 'admin' ? 'var(--ink)' : '#fff',
                        }}
                      >
                        {rep.message}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 3, textAlign: rep.sender_role === 'admin' ? 'left' : 'right', paddingLeft: rep.sender_role === 'admin' ? 2 : 0, paddingRight: rep.sender_role === 'admin' ? 0 : 2 }}>
                        {formatTime(rep.created_at)}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={replyText[r.id] || ''}
                    onChange={(e) => setReplyText((cur) => ({ ...cur, [r.id]: e.target.value }))}
                    placeholder="Escreva uma mensagem..."
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid var(--line)', fontSize: 16 }}
                  />
                  <button onClick={() => sendSupportReply(r.id)} className="btn btn-primary" style={{ fontSize: 13.5 }}>Enviar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
