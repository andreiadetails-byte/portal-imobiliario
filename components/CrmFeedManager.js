'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Importa os imóveis do CRM da Gold Residence para o More·ada.
// Só visível para a administradora (o dashboard controla isso).
function CrmImportCard() {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState('');
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  async function call(payload) {
    const { data: sessionData } = await supabase.auth.getSession();
    const res = await fetch('/api/sync-gold-crm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData?.session?.access_token}` },
      body: JSON.stringify(payload),
    });
    let data = null;
    try { data = await res.json(); } catch { /* resposta não era JSON */ }
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || `Erro ${res.status} — a rota /api/sync-gold-crm pode não estar publicada.`);
    }
    return data;
  }

  async function run(fn) {
    setBusy(true); setError(''); setSummary(null); setProgress('');
    try { await fn(); } catch (err) { setError(err.message); }
    setBusy(false);
  }

  const doPreview = () => run(async () => { setPreview(await call({ mode: 'preview' })); });

  const doTestOne = () => run(async () => {
    const r = await call({ mode: 'sync', offset: 0, limit: 1 });
    setSummary({ ...r, test: true });
  });

  // Modo de teste: não usa o CRM. Cria 3 imóveis inventados, "Por rever" (não públicos).
  const doDemo = () => run(async () => {
    const r = await call({ mode: 'sync', demo: true });
    setSummary({ ...r, test: true, demo: true });
  });

  const doDeleteDemo = () => run(async () => {
    const r = await call({ mode: 'delete-demo' });
    setSummary({ created: 0, updated: 0, photosChanged: 0, skippedPhotos: 0, errorCount: 0, errors: [], test: true, deletedDemo: r.deleted });
  });

  const doSyncAll = () => run(async () => {
    const total = { created: 0, updated: 0, photosChanged: 0, skippedPhotos: 0, errorCount: 0, errors: [] };
    let offset = 0;
    let done = false;
    let count = null;
    while (!done) {
      setProgress(count != null ? `A importar... ${Math.min(offset, count)}/${count}` : 'A importar...');
      const r = await call({ mode: 'sync', offset });
      total.created += r.created; total.updated += r.updated;
      total.photosChanged += r.photosChanged; total.skippedPhotos += r.skippedPhotos;
      total.errorCount += r.errorCount; total.errors.push(...r.errors);
      count = r.total; offset = r.nextOffset; done = r.done;
    }
    setProgress('A verificar imóveis que já não estão disponíveis...');
    // Só desativa se tudo correu sem erros graves de leitura (as páginas acima lançam erro se falharem).
    const fin = await call({ mode: 'finalize' });
    setProgress('');
    setSummary({ ...total, total: count, deactivated: fin.deactivated, note: fin.note });
  });

  return (
    <div className="card" style={{ padding: 20, marginBottom: 24, border: '1px solid rgba(126,143,106,0.3)' }}>
      <div onClick={() => setExpanded((e) => !e)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
        <div>
          <h2 className="display" style={{ fontSize: 17, marginBottom: 2 }}>Importar do CRM Gold Residence</h2>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: 0 }}>
            Traz os imóveis "Disponível" do CRM para a tua conta. Só leitura no CRM.
          </p>
        </div>
        <span style={{ fontSize: 13, color: 'var(--telha)', fontWeight: 600 }}>{expanded ? 'Fechar ▲' : 'Abrir ▾'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <button type="button" className="btn" onClick={doPreview} disabled={busy}>1. Ver o que há no CRM</button>
            <button type="button" className="btn" onClick={doTestOne} disabled={busy}>2. Importar 1 imóvel (teste)</button>
            <button type="button" className="btn btn-primary" onClick={doSyncAll} disabled={busy}>3. Sincronizar tudo</button>
          </div>

          <div style={{ border: '1px dashed var(--line)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <p style={{ fontSize: 12.5, color: 'var(--text-soft)', margin: '0 0 8px' }}>
              <b>Modo de teste</b> — não usa o CRM. Cria 3 imóveis inventados, que ficam em "Por rever" (não aparecem no site).
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn" onClick={doDemo} disabled={busy}>Testar com dados de exemplo</button>
              <button type="button" className="btn" onClick={doDeleteDemo} disabled={busy}>Apagar dados de exemplo</button>
            </div>
          </div>

          {progress && <p style={{ fontSize: 13.5, fontWeight: 600 }}>{progress}</p>}
          {error && <p className="error-text">{error}</p>}

          {preview && (
            <div style={{ fontSize: 13, marginBottom: 12 }}>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>
                O CRM tem {preview.total ?? '?'} imóvel(is) disponível(is). Amostra:
              </p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {preview.sample.map((s) => (
                  <li key={s.reference}>
                    {s.reference} — {s.title} · {Number(s.price || 0).toLocaleString('pt-PT')} € · {s.typology || 'sem tipologia'} · {s.district || 'sem distrito'} · {s.photos} foto(s){s.hasAddress ? '' : ' · sem morada'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary && (
            <div style={{ fontSize: 13.5, background: 'rgba(126,143,106,0.14)', borderRadius: 8, padding: 14 }}>
              {summary.deletedDemo != null ? (
                <p style={{ margin: 0, fontWeight: 600 }}>Apagados {summary.deletedDemo} imóvel(is) de exemplo.</p>
              ) : (
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {summary.test ? 'Teste concluído' : 'Sincronização concluída'}: {summary.created} novo(s), {summary.updated} atualizado(s)
                  {summary.total != null && !summary.test ? `, de ${summary.total} no CRM` : ''}.
                </p>
              )}
              {summary.demo && (
                <p style={{ margin: '4px 0 0' }}>
                  Vê-os em Admin → Anúncios → "Por rever". Se voltares a carregar no teste, atualiza os mesmos 3 em vez de criar outros.
                </p>
              )}
              <p style={{ margin: '4px 0 0' }}>Fotos gravadas/atualizadas em {summary.photosChanged} imóvel(is).</p>
              {summary.skippedPhotos > 0 && (
                <p style={{ margin: '4px 0 0', color: '#8a6a1f' }}>
                  {summary.skippedPhotos} foto(s) ignorada(s) por terem endereço relativo (sem https://) — não sei de que site vêm.
                </p>
              )}
              {summary.deactivated != null && <p style={{ margin: '4px 0 0' }}>Desativados por já não estarem disponíveis no CRM: {summary.deactivated}.</p>}
              {summary.note && <p style={{ margin: '4px 0 0', color: '#8a6a1f' }}>{summary.note}</p>}
              {summary.errorCount > 0 && (
                <div style={{ marginTop: 8, color: '#8a3b2a' }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{summary.errorCount} com problemas:</p>
                  <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                    {summary.errors.slice(0, 10).map((e, i) => <li key={i}>{e.reference}: {e.message}</li>)}
                  </ul>
                </div>
              )}
              <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--text-soft)' }}>
                Os imóveis importados ainda não têm coordenadas nem traduções: usa "Atribuir coordenadas em falta" e "Traduzir imóveis em falta" em Admin → Definições.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Cartão de diagnóstico: envia um email de teste e mostra a configuração real em uso.
function EmailTestCard() {
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function send() {
    setBusy(true); setResult(null); setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch('/api/admin-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData?.session?.access_token}` },
        body: JSON.stringify({ to: to.trim() }),
      });
      let data = null;
      try { data = await res.json(); } catch { /* não era JSON */ }
      if (!data) throw new Error(`Erro ${res.status} — a rota /api/admin-test-email pode não estar publicada.`);
      if (data.error && !data.config) throw new Error(data.error);
      setResult(data);
    } catch (err) { setError(err.message); }
    setBusy(false);
  }

  return (
    <div className="card" style={{ padding: 20, marginBottom: 24, border: '1px solid rgba(126,143,106,0.3)' }}>
      <h2 className="display" style={{ fontSize: 17, marginBottom: 2 }}>Testar envio de email</h2>
      <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: '0 0 12px' }}>
        Envia um email de teste e mostra que servidor de envio o site está a usar. Deixa em branco para enviar para o teu email.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="email de destino (opcional)" style={{ flex: 1, minWidth: 220 }} />
        <button type="button" className="btn btn-primary" onClick={send} disabled={busy}>{busy ? 'A enviar...' : 'Enviar email de teste'}</button>
      </div>
      {error && <p className="error-text">{error}</p>}
      {result && (
        <div style={{ fontSize: 13.5, background: result.success ? 'rgba(126,143,106,0.14)' : 'rgba(138,59,42,0.08)', borderRadius: 8, padding: 14 }}>
          <p style={{ margin: 0, fontWeight: 600 }}>
            {result.success ? `Enviado para ${result.to}. Confere no Resend → Emails.` : `Falhou: ${result.error}`}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 12.5 }}>
            Servidor em uso: <b>{result.config.usa}</b> · host <b>{result.config.host || '—'}</b> · porta <b>{result.config.porta || '—'}</b> · seguro <b>{result.config.seguro || '—'}</b> · utilizador <b>{result.config.utilizador || '—'}</b> · remetente <b>{result.config.remetente || '—'}</b> · password definida: <b>{result.config.temPassword ? 'sim' : 'não'}</b>
          </p>
        </div>
      )}
    </div>
  );
}

export default function CrmFeedManager() {
  return (
    <>
      <CrmImportCard />
      <EmailTestCard />
    </>
  );
}
