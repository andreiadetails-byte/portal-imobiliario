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

  return (
    <>
      <Header />
      <main id="main-content" className="wrap" style={{ maxWidth: 720, padding: '40px 32px 80px' }}>
        <BackButton fallback="/" />
        <h1 className="display" style={{ fontSize: 26, marginBottom: 24 }}>Mensagens de suporte</h1>

        {loading ? (
          <p style={{ fontSize: 13.5, color: 'var(--text-soft)' }}>A carregar...</p>
        ) : supportThreads.length === 0 ? (
          <p className="empty-state">Ainda não enviou nenhuma mensagem de suporte.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {supportThreads.map((r) => (
              <div key={r.id} className="card" style={{ padding: 16 }}>
                <div className="meta" style={{ marginBottom: 8 }}>
                  Conversa com a agente {r.agent_name} · {new Date(r.created_at).toLocaleDateString('pt-PT')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                  <div style={{ alignSelf: 'flex-end', maxWidth: '80%', background: 'var(--telha)', color: '#fff', padding: '8px 12px', borderRadius: 10, fontSize: 13.5 }}>
                    {r.message}
                  </div>
                  {r.replies.map((rep) => (
                    <div
                      key={rep.id}
                      style={{
                        alignSelf: rep.sender_role === 'admin' ? 'flex-start' : 'flex-end',
                        maxWidth: '80%', padding: '8px 12px', borderRadius: 10, fontSize: 13.5,
                        background: rep.sender_role === 'admin' ? 'var(--plaster)' : 'var(--telha)',
                        color: rep.sender_role === 'admin' ? 'var(--ink)' : '#fff',
                      }}
                    >
                      {rep.message}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={replyText[r.id] || ''}
                    onChange={(e) => setReplyText((cur) => ({ ...cur, [r.id]: e.target.value }))}
                    placeholder="Escreva uma mensagem..."
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 20, border: '1px solid var(--line)', fontSize: 13 }}
                  />
                  <button onClick={() => sendSupportReply(r.id)} className="btn btn-primary" style={{ fontSize: 12.5 }}>Enviar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
