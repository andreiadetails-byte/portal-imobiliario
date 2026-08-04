'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const NOMES = ['Beatriz', 'Inês', 'Mariana', 'Catarina', 'Carolina', 'Sofia', 'Joana', 'Rita', 'Leonor', 'Matilde'];
const APELIDOS = ['Ferreira', 'Costa', 'Santos', 'Silva', 'Pereira', 'Oliveira', 'Rodrigues', 'Martins'];

function randomAgentName() {
  const nome = NOMES[Math.floor(Math.random() * NOMES.length)];
  const apelido = APELIDOS[Math.floor(Math.random() * APELIDOS.length)];
  return `${nome} ${apelido}`;
}

// Avatar ilustrado simples (não é uma foto real de ninguém)
function AgentAvatar({ size = 46 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ borderRadius: '50%', flexShrink: 0 }}>
      <circle cx="32" cy="32" r="32" fill="#7E8F6A" />
      <circle cx="32" cy="26" r="12" fill="#F1E8D6" />
      <path d="M10 58c0-13 10-20 22-20s22 7 22 20" fill="#F1E8D6" />
    </svg>
  );
}

export default function SupportAgentWidget() {
  const [agentName, setAgentName] = useState(null);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '', message: '' });
  const [user, setUser] = useState(null);

  useEffect(() => {
    setAgentName(randomAgentName());
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
  }, []);

  if (!agentName) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    await supabase.from('support_requests').insert({
      agent_name: agentName,
      name: form.name,
      contact: form.contact,
      message: form.message,
      user_id: user?.id || null,
    });
    setSending(false);
    setSent(true);
  }

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 50 }}>
      {open && (
        <div
          className="card"
          style={{
            width: 300, marginBottom: 12, padding: 18,
            boxShadow: '0 10px 30px rgba(51,46,34,0.22)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <AgentAvatar />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{agentName}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-soft)' }}>Apoio ao cliente · Morada</div>
            </div>
          </div>

          {sent ? (
            <p style={{ fontSize: 13.5 }}>
              Obrigada! A {agentName.split(' ')[0]} vai responder-lhe em breve.
              {user
                ? ' Pode ver a resposta no seu painel, em "As minhas mensagens de suporte".'
                : ' Inicie sessão para poder ver a resposta na app.'}
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 10 }}>
                Precisa de ajuda com alguma questão do portal? Deixe a sua mensagem.
              </p>
              <div className="field">
                <label>Nome</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Email ou telefone</label>
                <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </div>
              <div className="field">
                <label>Mensagem</label>
                <textarea required rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={sending}>
                {sending ? 'A enviar...' : 'Enviar mensagem'}
              </button>
            </form>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px 10px 10px',
          background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 30,
          boxShadow: '0 6px 18px rgba(51,46,34,0.18)', cursor: 'pointer',
        }}
      >
        <AgentAvatar size={36} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
          {open ? 'Fechar' : `Fale com a ${agentName.split(' ')[0]}`}
        </span>
      </button>
    </div>
  );
}
