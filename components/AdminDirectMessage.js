'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Permite à administradora escolher qualquer utilizador e iniciar uma
// conversa diretamente com ele — reaproveita o sistema de mensagens de
// suporte já existente, para que a pessoa veja a mensagem exatamente onde
// já está habituada a ver respostas da equipa ("As minhas mensagens de
// suporte"), e a administradora consiga continuar a conversa dali.
export default function AdminDirectMessage({ allUsers }) {
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const filteredUsers = query.trim().length < 2 ? [] : allUsers.filter((u) => {
    const q = query.toLowerCase();
    return (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.agency_name || '').toLowerCase().includes(q);
  }).slice(0, 8);

  async function handleSend(e) {
    e.preventDefault();
    if (!selectedUser || !message.trim()) return;
    setSending(true);
    setError('');

    // Cria o pedido de suporte com uma nota interna simples (não é
    // mostrada à pessoa como se fosse uma pergunta dela), e a mensagem em
    // si entra logo a seguir como a primeira resposta da equipa — assim
    // aparece corretamente identificada como tendo vindo do More·ada.
    const { data: request, error: reqErr } = await supabase.from('support_requests').insert({
      agent_name: 'Sofia',
      name: selectedUser.full_name || selectedUser.email || 'Utilizador',
      contact: selectedUser.email || '',
      message: '[Conversa iniciada pela equipa do More·ada]',
      user_id: selectedUser.id,
      read_by_admin: true,
      read_by_admin_at: new Date().toISOString(),
    }).select().single();

    if (reqErr || !request) {
      setError('Não foi possível iniciar a conversa. Tenta novamente.');
      setSending(false);
      return;
    }

    const { error: replyErr } = await supabase.from('support_replies').insert({
      support_request_id: request.id,
      sender_role: 'admin',
      content: message.trim(),
    });

    setSending(false);
    if (replyErr) {
      setError('A conversa foi criada, mas a mensagem não chegou a enviar-se. Tenta responder na secção de mensagens de suporte.');
      return;
    }

    setSent(true);
    setMessage('');
    setSelectedUser(null);
    setQuery('');
    setTimeout(() => setSent(false), 4000);
  }

  return (
    <div className="card" style={{ padding: 20, marginBottom: 24 }}>
      <h2 className="display" style={{ fontSize: 17, marginBottom: 14 }}>Mandar mensagem a um utilizador</h2>

      <form onSubmit={handleSend}>
        {!selectedUser ? (
          <div className="field" style={{ marginBottom: 12, position: 'relative' }}>
            <label>Procurar utilizador (nome ou email)</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ex: joão silva, ou joao@email.com"
            />
            {filteredUsers.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                background: '#fff', border: '1px solid var(--line)', borderRadius: 6,
                boxShadow: '0 6px 18px rgba(51,46,34,0.15)', maxHeight: 240, overflowY: 'auto', marginTop: 2,
              }}>
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => { setSelectedUser(u); setQuery(''); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px',
                      border: 'none', background: '#fff', cursor: 'pointer', fontSize: 13.5,
                    }}
                  >
                    <b>{u.full_name || u.agency_name || 'Sem nome'}</b>
                    <span style={{ color: 'var(--text-soft)', marginLeft: 6 }}>{u.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--plaster)', borderRadius: 6, padding: '9px 14px', marginBottom: 12,
          }}>
            <span style={{ fontSize: 13.5 }}>
              A escrever para: <b>{selectedUser.full_name || selectedUser.agency_name || 'Sem nome'}</b> ({selectedUser.email})
            </span>
            <button type="button" onClick={() => setSelectedUser(null)} className="btn" style={{ padding: '4px 10px', fontSize: 12 }}>
              Trocar
            </button>
          </div>
        )}

        <div className="field" style={{ marginBottom: 12 }}>
          <label>Mensagem</label>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escreve aqui a tua mensagem..."
            disabled={!selectedUser}
          />
        </div>

        {error && <p className="error-text">{error}</p>}
        {sent && <p style={{ fontSize: 13.5, color: 'var(--telha)', fontWeight: 600, marginBottom: 8 }}>✓ Mensagem enviada!</p>}

        <button type="submit" className="btn btn-primary" disabled={!selectedUser || !message.trim() || sending}>
          {sending ? 'A enviar...' : 'Enviar mensagem'}
        </button>
      </form>
    </div>
  );
}
