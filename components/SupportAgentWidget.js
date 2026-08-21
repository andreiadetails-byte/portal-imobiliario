'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const NOMES_F = ['Beatriz', 'Inês', 'Mariana', 'Catarina', 'Carolina', 'Sofia', 'Joana', 'Rita', 'Leonor', 'Matilde'];
const NOMES_M = ['Tiago', 'Rui', 'André', 'Miguel', 'Diogo', 'Bruno', 'Pedro', 'Ricardo', 'Nuno', 'Gonçalo'];
const APELIDOS = ['Ferreira', 'Costa', 'Santos', 'Silva', 'Pereira', 'Oliveira', 'Rodrigues', 'Martins'];

function randomAgentName() {
  const isFemale = Math.random() < 0.5;
  const nomes = isFemale ? NOMES_F : NOMES_M;
  const nome = nomes[Math.floor(Math.random() * nomes.length)];
  const apelido = APELIDOS[Math.floor(Math.random() * APELIDOS.length)];
  return { fullName: `${nome} ${apelido}`, isFemale };
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
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setAgentName(randomAgentName());
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));

    // Permite que outros sítios do site (ex: a secção de dúvidas na página
    // inicial) abram este balão diretamente, sem duplicar o formulário —
    // e opcionalmente já com um tema pré-preenchido (event.detail).
    function handleOpenRequest(e) {
      setOpen(true);
      const tema = e?.detail;
      if (tema) setForm((f) => ({ ...f, message: `Tenho uma dúvida sobre: ${tema}. ` }));
    }
    window.addEventListener('morada-open-support', handleOpenRequest);
    return () => window.removeEventListener('morada-open-support', handleOpenRequest);
  }, []);

  if (!agentName) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!acceptedPolicy) return;
    setSending(true);
    await supabase.from('support_requests').insert({
      agent_name: agentName.fullName,
      name: form.name,
      contact: form.contact,
      message: form.message,
      user_id: user?.id || null,
    });
    setSending(false);
    setSent(true);
  }

  return (
    <div className="support-widget" style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 50 }}>
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
              <div style={{ fontWeight: 600, fontSize: 14 }}>{agentName.fullName}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-soft)' }}>Apoio ao cliente · Morada</div>
            </div>
          </div>

          {sent ? (
            <p style={{ fontSize: 13.5 }}>
              Obrigada! {agentName.isFemale ? 'A' : 'O'} {agentName.fullName.split(' ')[0]} vai responder-lhe em breve.
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
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 11.5, color: 'var(--text-soft)', marginBottom: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  required
                  checked={acceptedPolicy}
                  onChange={(e) => setAcceptedPolicy(e.target.checked)}
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <span>
                  Li e aceito a{' '}
                  <a href="/privacidade" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--telha)', textDecoration: 'underline' }}>
                    Política de Privacidade
                  </a>{' '}
                  e os{' '}
                  <a href="/termos" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--telha)', textDecoration: 'underline' }}>
                    Termos e Condições
                  </a>.
                </span>
              </label>
              <button type="submit" className="btn btn-primary btn-block" disabled={sending || !acceptedPolicy}>
                {sending ? 'A enviar...' : 'Enviar mensagem'}
              </button>
            </form>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="support-widget-btn"
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px 10px 10px',
          background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 30,
          boxShadow: '0 6px 18px rgba(51,46,34,0.18)', cursor: 'pointer',
        }}
      >
        <AgentAvatar size={36} />
        <span className="support-widget-text" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
          {open ? 'Fechar' : `Fale com ${agentName.isFemale ? 'a' : 'o'} ${agentName.fullName.split(' ')[0]}`}
        </span>
      </button>
    </div>
  );
}
