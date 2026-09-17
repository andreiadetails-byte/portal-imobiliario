'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Permite a um utilizador (tipicamente uma agência) ligar o feed XML do
// seu CRM, e sincronizar os anúncios de lá diretamente para o More·ada,
// sem ter de os voltar a publicar um a um manualmente.
export default function CrmFeedManager({ userId }) {
  const [feed, setFeed] = useState(null);
  const [feedUrl, setFeedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('crm_feeds').select('*').eq('user_id', userId).maybeSingle();
      if (data) { setFeed(data); setFeedUrl(data.feed_url); }
      setLoading(false);
    }
    load();
  }, [userId]);

  async function saveFeed(e) {
    e.preventDefault();
    setError('');
    if (!feedUrl.trim()) { setError('Indica o link do feed.'); return; }
    setSaving(true);
    const { data, error: saveErr } = await supabase
      .from('crm_feeds')
      .upsert({ user_id: userId, feed_url: feedUrl.trim() }, { onConflict: 'user_id' })
      .select().single();
    setSaving(false);
    if (saveErr) { setError('Não foi possível guardar o link. Tenta novamente.'); return; }
    setFeed(data);
  }

  async function runSync() {
    setSyncing(true);
    setSyncResult(null);
    setError('');
    const { data: sessionData } = await supabase.auth.getSession();
    try {
      const res = await fetch('/api/sync-crm-feed', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionData?.session?.access_token}` },
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Não foi possível sincronizar.');
      } else {
        setSyncResult(result);
      }
      const { data: refreshed } = await supabase.from('crm_feeds').select('*').eq('user_id', userId).maybeSingle();
      if (refreshed) setFeed(refreshed);
    } catch (err) {
      setError('Não foi possível sincronizar. Verifica a tua ligação e tenta de novo.');
    }
    setSyncing(false);
  }

  if (loading) return null;

  return (
    <div className="card" style={{ padding: 20, marginBottom: 24, border: '1px solid rgba(126,143,106,0.3)' }}>
      <div
        onClick={() => setExpanded((e) => !e)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      >
        <div>
          <h2 className="display" style={{ fontSize: 17, marginBottom: 2 }}>Importar do CRM</h2>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: 0 }}>
            {feed
              ? `Ligado — última sincronização: ${feed.last_sync_at ? new Date(feed.last_sync_at).toLocaleString('pt-PT') : 'ainda não sincronizado'}`
              : 'Liga o feed XML do teu CRM para importar os teus anúncios automaticamente.'}
          </p>
        </div>
        <span style={{ fontSize: 13, color: 'var(--telha)', fontWeight: 600 }}>{expanded ? 'Fechar ▲' : 'Abrir ▾'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 16 }}>
          <form onSubmit={saveFeed} style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <input
              type="url"
              required
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              placeholder="https://o-teu-crm.pt/feed.xml"
              style={{ flex: 1, minWidth: 220 }}
            />
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'A guardar...' : feed ? 'Atualizar link' : 'Guardar link'}
            </button>
          </form>

          {feed && (
            <button type="button" onClick={runSync} className="btn btn-primary" disabled={syncing} style={{ marginBottom: 12 }}>
              {syncing ? 'A sincronizar...' : 'Sincronizar agora'}
            </button>
          )}

          {error && <p className="error-text">{error}</p>}

          {syncResult && (
            <p style={{ fontSize: 13.5, color: 'var(--telha)', fontWeight: 600 }}>
              ✓ {syncResult.created} anúncio(s) novo(s), {syncResult.updated} atualizado(s), de {syncResult.total} no feed.
              {syncResult.errors?.length > 0 && ` (${syncResult.errors.length} com problemas — ver abaixo)`}
            </p>
          )}
          {syncResult?.errors?.length > 0 && (
            <ul style={{ fontSize: 12.5, color: '#8a3b2a', marginTop: 4 }}>
              {syncResult.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          {feed?.last_sync_status === 'error' && feed?.last_sync_error && !syncResult && (
            <p style={{ fontSize: 13, color: '#8a3b2a' }}>Último erro: {feed.last_sync_error}</p>
          )}

          <p style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 10 }}>
            Suportamos os formatos XML mais comuns entre CRMs imobiliários portugueses. Se o teu não for reconhecido, contacta-nos e adicionamos suporte a ele.
          </p>
        </div>
      )}
    </div>
  );
}
