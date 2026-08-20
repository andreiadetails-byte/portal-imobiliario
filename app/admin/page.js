'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/Header';

function GroupedByOwner({ items, getOwnerKey, getOwnerLabel, renderItem, noOwnerLabel = 'Sem conta' }) {
  const [openGroups, setOpenGroups] = useState({});

  const groups = {};
  const order = [];
  items.forEach((item) => {
    const key = getOwnerKey(item) || '__none__';
    if (!groups[key]) { groups[key] = []; order.push(key); }
    groups[key].push(item);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {order.map((key) => {
        const groupItems = groups[key];
        const isOpen = !!openGroups[key];
        const label = key === '__none__' ? noOwnerLabel : getOwnerLabel(groupItems[0]);
        return (
          <div key={key} className="card" style={{ overflow: 'hidden' }}>
            <button
              onClick={() => setOpenGroups((cur) => ({ ...cur, [key]: !cur[key] }))}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <b style={{ fontSize: 14.5 }}>{isOpen ? '▾' : '▸'} {label}</b>
              <span style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>{groupItems.length} {groupItems.length === 1 ? 'item' : 'itens'}</span>
            </button>
            {isOpen && (
              <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {groupItems.map(renderItem)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AdminInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Edita o perfil de OUTRO utilizador, em segurança (usa a chave especial do servidor,
  // por baixo, contorna as regras normais que impedem um utilizador de editar o de outro).
  async function updateOtherUserProfile(userId, updates) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('A tua sessão expirou. Atualiza a página e entra outra vez.');
        return false;
      }
      const res = await fetch('/api/admin-update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId, updates }),
      });

      let data = null;
      try { data = await res.json(); } catch (parseErr) { /* resposta não era JSON */ }

      if (!res.ok) {
        alert(`Não foi possível guardar (${res.status}): ${data?.error || 'erro desconhecido'}`);
        return false;
      }
      return true;
    } catch (err) {
      alert(`Não foi possível guardar: ${err.message}`);
      return false;
    }
  }

  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [properties, setProperties] = useState([]);
  const [filter, setFilter] = useState('em_revisao');
  const [section, setSection] = useState(searchParams.get('tab') || 'anuncios');
  const [news, setNews] = useState([]);
  const [newsForm, setNewsForm] = useState({ category: 'Habitação', title: '', body: '' });
  const [newsImage, setNewsImage] = useState(null);
  const [savingNews, setSavingNews] = useState(false);
  const [featuredList, setFeaturedList] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [reports, setReports] = useState([]);
  const [supportMessages, setSupportMessages] = useState([]);
  const [mortgageRate, setMortgageRate] = useState('');
  const [savingRate, setSavingRate] = useState(false);
  const [rateSaved, setRateSaved] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [supportReplyText, setSupportReplyText] = useState({});
  const [ads, setAds] = useState([]);
  const [adForm, setAdForm] = useState({ title: '', link_url: '' });
  const [adImage, setAdImage] = useState(null);
  const [savingAd, setSavingAd] = useState(false);
  const [editingAdId, setEditingAdId] = useState(null);
  const [editAdForm, setEditAdForm] = useState({ title: '', link_url: '' });
  const [editAdImage, setEditAdImage] = useState(null);

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
      if (!profile?.is_admin) { setChecking(false); return; }

      setAllowed(true);
      setChecking(false);
      loadProperties('em_revisao');
      loadNews();
      loadFeatured();
      loadAgencies();
      loadMortgageRate();
      loadAllUsers();
      loadAds();
    }
    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAds() {
    const { data } = await supabase.from('ads').select('*').order('created_at', { ascending: false });
    setAds(data || []);
  }

  async function createAd(e) {
    e.preventDefault();
    setSavingAd(true);

    let image_url = null;
    if (adImage) {
      const ext = adImage.name.split('.').pop();
      const path = `ads/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('property-photos').upload(path, adImage);
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('property-photos').getPublicUrl(path);
        image_url = publicUrlData.publicUrl;
      }
    }

    await supabase.from('ads').insert({
      title: adForm.title,
      link_url: adForm.link_url || null,
      image_url,
      active: true,
    });

    setAdForm({ title: '', link_url: '' });
    setAdImage(null);
    setSavingAd(false);
    loadAds();
  }

  async function toggleAdActive(id, current) {
    await supabase.from('ads').update({ active: !current }).eq('id', id);
    setAds((cur) => cur.map((a) => (a.id === id ? { ...a, active: !current } : a)));
  }

  async function deleteAd(id) {
    await supabase.from('ads').delete().eq('id', id);
    setAds((cur) => cur.filter((a) => a.id !== id));
  }

  function startEditAd(ad) {
    setEditingAdId(ad.id);
    setEditAdForm({ title: ad.title, link_url: ad.link_url || '' });
    setEditAdImage(null);
  }

  async function saveEditAd(id) {
    let image_url;
    if (editAdImage) {
      const ext = editAdImage.name.split('.').pop();
      const path = `ads/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('property-photos').upload(path, editAdImage);
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('property-photos').getPublicUrl(path);
        image_url = publicUrlData.publicUrl;
      }
    }

    const updates = { title: editAdForm.title, link_url: editAdForm.link_url || null, ...(image_url && { image_url }) };
    await supabase.from('ads').update(updates).eq('id', id);
    setAds((cur) => cur.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    setEditingAdId(null);
  }

  async function loadAllUsers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setAllUsers(data || []);
  }

  async function activateSubscription(userId) {
    // Exatamente um mês a contar de hoje (mesmo dia do mês seguinte), não "30 dias".
    // Ex: paga a 9 de agosto → fica ativo até 9 de setembro.
    const paidUntil = new Date();
    const originalDate = paidUntil.getDate();
    paidUntil.setMonth(paidUntil.getMonth() + 1);
    // Se o mês seguinte não tiver esse dia (ex: 31 de janeiro → fevereiro), usa o último dia desse mês.
    if (paidUntil.getDate() !== originalDate) paidUntil.setDate(0);
    const paidUntilStr = paidUntil.toISOString().slice(0, 10);

    const ok = await updateOtherUserProfile(userId, { subscription_status: 'active', subscription_paid_until: paidUntilStr });
    if (ok) {
      setAllUsers((cur) => cur.map((u) => (u.id === userId ? { ...u, subscription_status: 'active', subscription_paid_until: paidUntilStr } : u)));
    }
  }

  async function toggleBlockUser(userId, currentlyBlocked) {
    const ok = await updateOtherUserProfile(userId, { is_blocked: !currentlyBlocked });
    if (ok) setAllUsers((cur) => cur.map((u) => (u.id === userId ? { ...u, is_blocked: !currentlyBlocked } : u)));
  }

  async function changeAccountType(userId, newType) {
    const ok = await updateOtherUserProfile(userId, { account_type: newType });
    if (ok) setAllUsers((cur) => cur.map((u) => (u.id === userId ? { ...u, account_type: newType } : u)));
  }

  async function deleteUserAccount(userId, userName) {
    if (!confirm(`Tem a certeza que quer eliminar a conta de "${userName}"? Isto apaga a conta e todos os dados associados, e não pode ser desfeito.`)) return;

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin-delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ userId }),
    });

    if (res.ok) {
      setAllUsers((cur) => cur.filter((u) => u.id !== userId));
    } else {
      const data = await res.json();
      alert(`Não foi possível eliminar: ${data.error || 'erro desconhecido'}`);
    }
  }

  async function loadMortgageRate() {
    const { data } = await supabase.from('settings').select('mortgage_rate').eq('id', 1).single();
    if (data) setMortgageRate(String(data.mortgage_rate));
  }

  async function saveMortgageRate(e) {
    e.preventDefault();
    setSavingRate(true);
    await supabase.from('settings').update({ mortgage_rate: Number(mortgageRate), updated_at: new Date().toISOString() }).eq('id', 1);
    setSavingRate(false);
    setRateSaved(true);
    setTimeout(() => setRateSaved(false), 2500);
  }

  useEffect(() => {
    if (allowed) { loadReports(); loadSupportMessages(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  // Só marca as mensagens de suporte como lidas quando a pessoa abre mesmo essa aba
  // (antes marcava logo ao carregar a página, mesmo sem ver nada — o aviso vermelho nunca aparecia).
  useEffect(() => {
    if (section !== 'suporte' || supportMessages.length === 0) return;
    const unreadIds = supportMessages.filter((m) => !m.read_by_admin).map((m) => m.id);
    if (unreadIds.length === 0) return;
    supabase.from('support_requests').update({ read_by_admin: true }).in('id', unreadIds).then(() => {
      setSupportMessages((cur) => cur.map((m) => (unreadIds.includes(m.id) ? { ...m, read_by_admin: true } : m)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  async function loadSupportMessages() {
    const { data } = await supabase.from('support_requests').select('*').order('created_at', { ascending: false });
    const withReplies = await Promise.all((data || []).map(async (m) => {
      const { data: replies } = await supabase
        .from('support_replies').select('*').eq('support_request_id', m.id).order('created_at', { ascending: true });
      return { ...m, replies: replies || [] };
    }));

    const userIds = [...new Set(withReplies.map((m) => m.user_id).filter(Boolean))];
    let usersById = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase.from('profiles').select('id, full_name, agency_name').in('id', userIds);
      usersById = Object.fromEntries((users || []).map((u) => [u.id, u]));
    }

    setSupportMessages(withReplies.map((m) => ({ ...m, accountProfile: m.user_id ? usersById[m.user_id] : null })));
  }

  async function sendSupportReply(requestId) {
    const text = (supportReplyText[requestId] || '').trim();
    if (!text) return;
    await supabase.from('support_replies').insert({ support_request_id: requestId, sender_role: 'admin', message: text });

    // Avisa o utilizador (se tiver conta) de que recebeu uma resposta.
    const request = supportMessages.find((m) => m.id === requestId);
    if (request?.user_id) {
      await supabase.from('notifications').insert({
        user_id: request.user_id,
        message: '💬 Mensagem do suporte: recebeu uma resposta à sua mensagem.',
        link: '/dashboard',
      });
    }

    setSupportReplyText((cur) => ({ ...cur, [requestId]: '' }));
    loadSupportMessages();
  }

  async function resolveSupportMessage(id) {
    await supabase.from('support_requests').update({ status: 'resolvida' }).eq('id', id);
    setSupportMessages((cur) => cur.map((m) => (m.id === id ? { ...m, status: 'resolvida' } : m)));
  }

  async function loadReports() {
    const { data } = await supabase
      .from('reports')
      .select('id, reason, details, reporter_name, reporter_contact, status, created_at, properties(id, typology, address, owner_id, profiles(id, full_name, agency_name))')
      .order('created_at', { ascending: false });
    setReports(data || []);
  }

  async function resolveReport(id) {
    await supabase.from('reports').update({ status: 'resolvida' }).eq('id', id);
    setReports((cur) => cur.map((r) => (r.id === id ? { ...r, status: 'resolvida' } : r)));
  }

  async function loadAgencies() {
    const { data } = await supabase.from('profiles').select('*').eq('account_type', 'agencia').order('agency_name');
    setAgencies(data || []);
  }

  async function toggleVerified(id, current) {
    const ok = await updateOtherUserProfile(id, { is_verified: !current });
    if (ok) setAgencies((cur) => cur.map((a) => (a.id === id ? { ...a, is_verified: !current } : a)));
  }

  async function loadFeatured() {
    const { data } = await supabase
      .from('properties').select('id, typology, address, price, featured_status, featured_requested_at, profiles(id, full_name, agency_name)')
      .in('featured_status', ['pending', 'active'])
      .order('featured_requested_at', { ascending: false });
    setFeaturedList(data || []);
  }

  async function activateFeatured(id) {
    await supabase.from('properties').update({
      featured_status: 'active',
      featured_activated_at: new Date().toISOString(),
    }).eq('id', id);
    loadFeatured();
  }

  async function deactivateFeatured(id) {
    await supabase.from('properties').update({ featured_status: 'none' }).eq('id', id);
    loadFeatured();
  }

  async function loadNews() {
    const { data } = await supabase.from('news').select('*').order('created_at', { ascending: false });
    setNews(data || []);
  }

  async function createNews(e) {
    e.preventDefault();
    setSavingNews(true);

    let cover_image_url = null;
    if (newsImage) {
      const ext = newsImage.name.split('.').pop();
      const path = `news/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('property-photos').upload(path, newsImage);
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('property-photos').getPublicUrl(path);
        cover_image_url = publicUrlData.publicUrl;
      }
    }

    await supabase.from('news').insert({
      category: newsForm.category,
      title: (newsForm.title || '').replace(/\*+/g, ''),
      body: (newsForm.body || '').replace(/\*+/g, ''),
      cover_image_url,
      published: true,
    });
    setNewsForm({ category: 'Habitação', title: '', body: '' });
    setNewsImage(null);
    setSavingNews(false);
    loadNews();
  }

  async function deleteNews(id) {
    await supabase.from('news').delete().eq('id', id);
    setNews((cur) => cur.filter((n) => n.id !== id));
  }

  async function loadProperties(status) {
    setFilter(status);
    let query = supabase.from('properties').select('*, profiles(id, full_name, agency_name, account_type)').order('created_at', { ascending: false });
    if (status !== 'todos') query = query.eq('status', status);
    const { data } = await query;
    setProperties(data || []);
  }

  async function updateStatus(id, status) {
    await supabase.from('properties').update({ status }).eq('id', id);
    setProperties((cur) => cur.filter((p) => p.id !== id));
  }

  async function verifyDocument(propId) {
    await supabase.from('properties').update({ document_verified: true }).eq('id', propId);
    setProperties((cur) => cur.map((p) => (p.id === propId ? { ...p, document_verified: true } : p)));
  }

  async function cancelProperty(propObj) {
    const reason = prompt('Motivo da anulação (visível ao anunciante):');
    if (!reason) return;
    await supabase.from('properties').update({ status: 'anulado_suporte', cancellation_reason: reason }).eq('id', propObj.id);
    await supabase.from('notifications').insert({
      user_id: propObj.owner_id,
      message: `⚑ Aviso do Morada: o seu anúncio "${propObj.typology} · ${propObj.address}" foi anulado. Motivo: ${reason}`,
      link: '/dashboard',
    });
    setProperties((cur) => cur.filter((p) => p.id !== propObj.id));
    alert('Anúncio anulado. O anunciante não pode republicá-lo — terá de criar um novo.');
  }

  if (checking) return (<><Header /><div className="wrap" style={{ padding: 60 }}>A verificar acesso...</div></>);

  if (!allowed) {
    return (
      <>
        <Header />
        <div className="wrap" style={{ padding: 60 }}>
          <h1 className="display" style={{ fontSize: 22 }}>Sem acesso</h1>
          <p style={{ color: 'var(--text-soft)' }}>Esta página é só para administradores.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
    <main id="main-content" className="wrap" style={{ padding: '40px 32px 80px' }}>
      <h1 className="display" style={{ fontSize: 26, marginBottom: 20 }}>Administração</h1>

      <div className="admin-tabs" style={{ display: 'flex', gap: 8, marginBottom: 28, borderBottom: '1px solid var(--line)', overflowX: 'auto' }}>
        {[
          ['anuncios', '📋 Anúncios', 0],
          ['denuncias', '⚑ Denúncias', reports.filter((r) => r.status !== 'resolvida').length],
          ['suporte', '💬 Suporte', supportMessages.filter((m) => !m.read_by_admin).length],
          ['utilizadores', '👤 Utilizadores', 0], ['destaques', '★ Destaques', 0], ['agencias', '🏢 Agências', 0],
          ['noticias', '📰 Notícias', 0], ['publicidade', '📣 Publicidade', 0], ['definicoes', '⚙ Definições', 0],
        ].map(([value, label, count]) => (
          <button
            key={value}
            onClick={() => setSection(value)}
            style={{
              background: 'none', border: 'none', padding: '0 4px 12px', marginRight: 24, fontWeight: 600,
              fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              color: section === value ? 'var(--ink)' : 'var(--text-soft)',
              borderBottom: section === value ? '2px solid var(--telha)' : '2px solid transparent',
            }}
          >
            {label}
            {count > 0 && (
              <span style={{
                background: '#b8452f', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 10,
                padding: '1px 7px', minWidth: 18, textAlign: 'center', lineHeight: 1.5,
              }}>
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>
        ))}
      </div>

      {section === 'anuncios' && (
        <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          ['em_revisao', 'Por rever'],
          ['ativo', 'Ativos'],
          ['desativado', 'Desativados'],
          ['rejeitado', 'Rejeitados'],
          ['anulado_suporte', 'Anulados'],
          ['todos', 'Todos'],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => loadProperties(value)}
            className="btn"
            style={{
              fontSize: 13, padding: '8px 14px',
              background: filter === value ? 'var(--telha)' : 'transparent',
              color: filter === value ? '#fff' : 'var(--ink)',
              borderColor: filter === value ? 'var(--telha)' : 'var(--ink)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {properties.length === 0 && <p className="empty-state">Não há anúncios neste estado.</p>}

      <GroupedByOwner
        items={properties}
        getOwnerKey={(p) => p.profiles?.id || p.owner_id}
        getOwnerLabel={(p) => p.profiles?.agency_name || p.profiles?.full_name || 'Utilizador'}
        renderItem={(p) => (
          <div key={p.id} className="card" style={{ padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <b>{p.typology} · {p.address}</b>
              <div className="meta">
                {Number(p.price).toLocaleString('pt-PT')} € · {p.property_type} · {p.district} · publicado em {new Date(p.created_at).toLocaleDateString('pt-PT')} · estado atual: {p.status}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-soft)', maxWidth: 500, marginTop: 4 }}>{p.description}</p>
              {p.document_url && (
                <p style={{ fontSize: 12.5, marginTop: 6 }}>
                  <a href={p.document_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--telha)' }}>
                    📄 Ver documento anexado
                  </a>
                  {p.document_verified && <span style={{ color: 'var(--azulejo)', marginLeft: 8 }}>✓ Verificado</span>}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {p.document_url && !p.document_verified && (
                <button onClick={() => verifyDocument(p.id)} className="btn" style={{ fontSize: 13, borderColor: 'var(--azulejo)', color: 'var(--azulejo)' }}>
                  ✓ Confirmar documentação
                </button>
              )}
              {p.status !== 'ativo' && p.status !== 'anulado_suporte' && (
                <button onClick={() => updateStatus(p.id, 'ativo')} className="btn btn-primary" style={{ fontSize: 13 }}>Aprovar</button>
              )}
              {p.status !== 'rejeitado' && p.status !== 'anulado_suporte' && (
                <button onClick={() => updateStatus(p.id, 'rejeitado')} className="btn" style={{ fontSize: 13 }}>Rejeitar</button>
              )}
              {p.status === 'ativo' && (
                <button onClick={() => cancelProperty(p)} className="btn" style={{ fontSize: 13, borderColor: '#8a3b2a', color: '#8a3b2a' }}>Anular</button>
              )}
            </div>
          </div>
        )}
      />
        </>
      )}

      {section === 'denuncias' && (
        <>
          {reports.length === 0 && <p className="empty-state">Não há denúncias.</p>}
          <GroupedByOwner
            items={reports}
            getOwnerKey={(r) => r.properties?.profiles?.id || r.properties?.owner_id}
            getOwnerLabel={(r) => r.properties?.profiles?.agency_name || r.properties?.profiles?.full_name || 'Utilizador'}
            noOwnerLabel="Imóvel removido / sem anunciante associado"
            renderItem={(r) => (
              <div key={r.id} className="card" style={{
                padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap',
                opacity: r.status === 'resolvida' ? 0.55 : 1,
              }}>
                <div>
                  <b>{r.reason}</b>
                  <div className="meta">
                    {r.properties ? `${r.properties.typology} · ${r.properties.address}` : 'Imóvel removido'} · {r.status}
                  </div>
                  {r.details && <p style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 4, maxWidth: 460 }}>{r.details}</p>}
                  {r.reporter_contact && <p style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 4 }}>De: {r.reporter_name || 'sem nome'} · Contacto: {r.reporter_contact}</p>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {r.properties && (
                    <a href={`/property/${r.properties.id}`} target="_blank" rel="noopener noreferrer" className="btn" style={{ fontSize: 13 }}>Ver</a>
                  )}
                  {r.status !== 'resolvida' && (
                    <button onClick={() => resolveReport(r.id)} className="btn btn-primary" style={{ fontSize: 13 }}>Marcar resolvida</button>
                  )}
                </div>
              </div>
            )}
          />
        </>
      )}

      {section === 'suporte' && (
        <>
          {supportMessages.length === 0 && <p className="empty-state">Ainda não chegou nenhuma mensagem.</p>}
          <GroupedByOwner
            items={supportMessages}
            getOwnerKey={(m) => m.accountProfile?.id}
            getOwnerLabel={(m) => m.accountProfile?.agency_name || m.accountProfile?.full_name || 'Utilizador'}
            noOwnerLabel="Sem conta (visitantes)"
            renderItem={(m) => (
              <div key={m.id} className="card" style={{ padding: 16, opacity: m.status === 'resolvida' ? 0.55 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <b style={{ fontSize: 14 }}>{m.name}</b>
                    {!m.user_id && (
                      <span style={{ fontSize: 10.5, color: 'var(--text-soft)' }}>(sem conta — não vai ver a resposta na app)</span>
                    )}
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      background: m.status === 'resolvida' ? 'var(--line)' : 'rgba(126,143,106,0.18)',
                      color: m.status === 'resolvida' ? 'var(--text-soft)' : 'var(--telha)',
                    }}>
                      {m.status === 'resolvida' ? 'Resolvida' : 'Por responder'}
                    </span>
                  </div>
                  <span style={{ fontSize: 11.5, color: 'var(--text-soft)' }}>
                    {new Date(m.created_at).toLocaleString('pt-PT')}
                  </span>
                </div>
                <div className="meta" style={{ marginBottom: 10 }}>
                  Falou com a "agente" {m.agent_name} · Contacto: {m.contact || 'não fornecido'}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                  <div style={{ alignSelf: 'flex-start', maxWidth: '80%', background: 'var(--plaster)', padding: '8px 12px', borderRadius: 10, fontSize: 13.5 }}>
                    {m.message}
                  </div>
                  {(m.replies || []).map((rep) => (
                    <div
                      key={rep.id}
                      style={{
                        alignSelf: rep.sender_role === 'admin' ? 'flex-end' : 'flex-start',
                        maxWidth: '80%', padding: '8px 12px', borderRadius: 10, fontSize: 13.5,
                        background: rep.sender_role === 'admin' ? 'var(--telha)' : 'var(--plaster)',
                        color: rep.sender_role === 'admin' ? '#fff' : 'var(--ink)',
                      }}
                    >
                      {rep.message}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    value={supportReplyText[m.id] || ''}
                    onChange={(e) => setSupportReplyText((cur) => ({ ...cur, [m.id]: e.target.value }))}
                    placeholder={m.user_id ? 'Escreva uma resposta...' : 'Sem conta associada — sem forma de responder na app'}
                    disabled={!m.user_id}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 20, border: '1px solid var(--line)', fontSize: 13 }}
                  />
                  <button
                    onClick={() => sendSupportReply(m.id)}
                    className="btn btn-primary"
                    style={{ fontSize: 12.5 }}
                    disabled={!m.user_id}
                  >
                    Enviar
                  </button>
                  {m.status !== 'resolvida' && (
                    <button onClick={() => resolveSupportMessage(m.id)} className="btn" style={{ fontSize: 12.5 }}>
                      Marcar resolvida
                    </button>
                  )}
                </div>
              </div>
            )}
          />
        </>
      )}

      {section === 'utilizadores' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="🔎 Procurar por nome, email ou telefone..."
              style={{ width: '100%', maxWidth: 420, padding: '10px 14px', borderRadius: 20, border: '1px solid var(--line)', fontSize: 13.5 }}
            />
          </div>
          {allUsers.length === 0 && <p className="empty-state">Ainda não há utilizadores.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {allUsers
              .filter((u) => {
                const q = userSearch.trim().toLowerCase();
                if (!q) return true;
                return [u.full_name, u.agency_name, u.email, u.phone_real].filter(Boolean).some((v) => v.toLowerCase().includes(q));
              })
              .map((u) => (
              <div key={u.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar_url} alt="" loading="lazy" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', background: 'var(--azulejo)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600,
                    }}>
                      {(u.agency_name || u.full_name || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <b style={{ fontSize: 14 }}>{u.agency_name || u.full_name}</b>
                    <div className="meta">
                      {u.email}{u.phone_real ? ` · 📞 ${u.phone_real}` : ''}
                    </div>
                    <div className="meta" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <select
                        value={u.account_type}
                        onChange={(e) => changeAccountType(u.id, e.target.value)}
                        disabled={u.is_admin}
                        style={{
                          fontSize: 12, padding: '2px 6px', borderRadius: 5, border: '1px solid var(--line)',
                          background: 'var(--paper)', color: 'var(--ink)', cursor: u.is_admin ? 'default' : 'pointer',
                        }}
                      >
                        <option value="particular">Particular</option>
                        <option value="agencia">Agência</option>
                      </select>
                      {u.account_type === 'particular' && u.agency_name && (
                        <span title="Tem nome de agência preenchido mas está marcado como particular" style={{ color: '#8a6a1f', fontWeight: 700, fontSize: 11 }}>
                          ⚠️ Parece ser agência
                        </span>
                      )}
                      {u.is_admin && ' · Administrador'}
                      {u.is_blocked && <span style={{ color: '#8a3b2a', fontWeight: 700 }}> · Bloqueado</span>}
                      {u.account_type === 'agencia' && (
                        <>
                          {' · '}
                          <span style={{
                            fontWeight: 700,
                            color: u.subscription_status === 'active' ? 'var(--telha)' : u.subscription_status === 'pending' ? '#8a6a1f' : '#8a3b2a',
                          }}>
                            {u.subscription_status === 'active' ? `Ativa até ${u.subscription_paid_until ? new Date(u.subscription_paid_until).toLocaleDateString('pt-PT') : '—'}`
                              : u.subscription_status === 'pending' ? 'Pagamento pendente'
                              : u.subscription_status === 'expired' ? 'Expirada'
                              : 'Sem subscrição'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                  {u.account_type === 'agencia' && u.subscription_proof_url && u.subscription_status === 'pending' && (
                    <a href={u.subscription_proof_url} target="_blank" rel="noopener noreferrer" className="btn" style={{ fontSize: 13 }}>
                      📄 Ver comprovativo
                    </a>
                  )}
                  {u.account_type === 'agencia' && u.subscription_status !== 'active' && (
                    <button onClick={() => activateSubscription(u.id)} className="btn btn-primary" style={{ fontSize: 13 }}>
                      Confirmar pagamento (1 mês)
                    </button>
                  )}
                  <a href={`/admin/utilizador/${u.id}`} className="btn" style={{ fontSize: 13 }}>
                    👤 Ver imóveis
                  </a>
                  {!u.is_admin && (
                    <>
                      <button
                        onClick={() => toggleBlockUser(u.id, u.is_blocked)}
                        className="btn"
                        style={{ fontSize: 13, borderColor: u.is_blocked ? 'var(--azulejo)' : '#8a3b2a', color: u.is_blocked ? 'var(--azulejo)' : '#8a3b2a' }}
                      >
                        {u.is_blocked ? '✓ Desbloquear' : '🚫 Bloquear'}
                      </button>
                      <button
                        onClick={() => deleteUserAccount(u.id, u.agency_name || u.full_name)}
                        className="btn"
                        style={{ fontSize: 13, borderColor: '#8a3b2a', color: '#8a3b2a' }}
                      >
                        🗑 Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {section === 'destaques' && (
        <>
          {featuredList.length === 0 && <p className="empty-state">Não há pedidos de destaque.</p>}
          <GroupedByOwner
            items={featuredList}
            getOwnerKey={(p) => p.profiles?.id}
            getOwnerLabel={(p) => p.profiles?.agency_name || p.profiles?.full_name || 'Utilizador'}
            renderItem={(p) => (
              <div key={p.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <b>{p.typology} · {p.address}</b>
                  <div className="meta">
                    {Number(p.price).toLocaleString('pt-PT')} € · Ref. {p.id.slice(0, 8)} ·{' '}
                    {p.featured_status === 'pending' ? 'Aguarda confirmação de pagamento' : 'Destaque ativo'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {p.featured_status === 'pending' && (
                    <button onClick={() => activateFeatured(p.id)} className="btn btn-primary" style={{ fontSize: 13 }}>
                      Confirmar pagamento e ativar
                    </button>
                  )}
                  {p.featured_status === 'active' && (
                    <button onClick={() => deactivateFeatured(p.id)} className="btn" style={{ fontSize: 13 }}>
                      Terminar destaque
                    </button>
                  )}
                </div>
              </div>
            )}
          />
        </>
      )}

      {section === 'agencias' && (
        <>
          {agencies.length === 0 && <p className="empty-state">Ainda não há agências registadas.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {agencies.map((a) => (
              <div key={a.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <b>{a.agency_name || a.full_name}</b>
                  <div className="meta">{a.agency_license || 'sem licença AMI registada'}</div>
                </div>
                <button
                  onClick={() => toggleVerified(a.id, a.is_verified)}
                  className="btn"
                  style={{
                    fontSize: 13,
                    background: a.is_verified ? 'var(--telha)' : 'transparent',
                    color: a.is_verified ? '#fff' : 'var(--ink)',
                    borderColor: a.is_verified ? 'var(--telha)' : 'var(--ink)',
                  }}
                >
                  {a.is_verified ? '✓ Verificado' : 'Marcar como verificado'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {section === 'noticias' && (
        <>
          <form onSubmit={createNews} className="card" style={{ padding: 20, marginBottom: 28, overflow: 'visible' }}>
            <h3 className="display" style={{ fontSize: 17, marginBottom: 14 }}>Nova notícia</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Categoria</label>
                <select value={newsForm.category} onChange={(e) => setNewsForm({ ...newsForm, category: e.target.value })}>
                  <option>Habitação</option>
                  <option>Crédito</option>
                  <option>Construção</option>
                  <option>Mercado</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Título</label>
                <input required value={newsForm.title} onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Texto</label>
              <textarea required rows={3} value={newsForm.body} onChange={(e) => setNewsForm({ ...newsForm, body: e.target.value })} />
            </div>
            <div className="field">
              <label>Imagem <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>(opcional)</span></label>
              <label
                htmlFor="news-image-input"
                style={{
                  display: 'block', border: '1.5px dashed var(--line)', borderRadius: 6, padding: '14px 16px',
                  textAlign: 'center', color: 'var(--text-soft)', fontSize: 13, cursor: 'pointer',
                }}
              >
                {newsImage ? `🖼️ ${newsImage.name}` : 'Clique para escolher uma imagem'}
              </label>
              <input id="news-image-input" type="file" accept="image/*" onChange={(e) => setNewsImage(e.target.files?.[0] || null)} style={{ display: 'none' }} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingNews}>
              {savingNews ? 'A publicar...' : 'Publicar notícia'}
            </button>
          </form>

          {news.length === 0 && <p className="empty-state">Ainda não publicaste nenhuma notícia.</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {news.map((n) => (
              <div key={n.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                {n.cover_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.cover_image_url} alt={n.title} loading="lazy" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--telha)', textTransform: 'uppercase' }}>{n.category}</span>
                  <div style={{ fontWeight: 600, fontSize: 14, margin: '4px 0' }}>{n.title}</div>
                  <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>{n.body}</p>
                </div>
                <button onClick={() => deleteNews(n.id)} className="btn" style={{ fontSize: 12, flexShrink: 0, height: 'fit-content' }}>Apagar</button>
              </div>
            ))}
          </div>
        </>
      )}

      {section === 'publicidade' && (
        <>
          <form onSubmit={createAd} className="card" style={{ padding: 20, marginBottom: 28, overflow: 'visible' }}>
            <h3 className="display" style={{ fontSize: 17, marginBottom: 14 }}>Novo banner</h3>
            <div className="field">
              <label>Título / texto do anúncio</label>
              <input required value={adForm.title} onChange={(e) => setAdForm({ ...adForm, title: e.target.value })} placeholder="ex: Simule já o seu crédito habitação" />
            </div>
            <div className="field">
              <label>Link <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>(opcional)</span></label>
              <input value={adForm.link_url} onChange={(e) => setAdForm({ ...adForm, link_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="field">
              <label>Imagem <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>(opcional)</span></label>
              <label
                htmlFor="ad-image-input"
                style={{
                  display: 'block', border: '1.5px dashed var(--line)', borderRadius: 6, padding: '16px', textAlign: 'center',
                  color: 'var(--text-soft)', fontSize: 13, cursor: 'pointer',
                }}
              >
                {adImage ? `🖼️ ${adImage.name}` : 'Clique para escolher uma imagem'}
              </label>
              <input
                id="ad-image-input"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const img = new Image();
                  const url = URL.createObjectURL(file);
                  img.onload = () => {
                    if (img.naturalWidth < 300 || img.naturalHeight < 200) {
                      alert(`Esta imagem tem resolução baixa (${img.naturalWidth}×${img.naturalHeight}px) e pode ficar desfocada. Recomendamos pelo menos 300×200px.`);
                    }
                    setAdImage(file);
                  };
                  img.src = url;
                }}
                style={{ display: 'none' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingAd}>
              {savingAd ? 'A publicar...' : 'Publicar banner'}
            </button>
          </form>

          {ads.length === 0 && <p className="empty-state">Ainda não criaste nenhum banner.</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ads.map((a) => (
              <div key={a.id} className="card" style={{ padding: 16 }}>
                {editingAdId === a.id ? (
                  <div>
                    <div className="field">
                      <label>Título / texto</label>
                      <input value={editAdForm.title} onChange={(e) => setEditAdForm({ ...editAdForm, title: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>Link</label>
                      <input value={editAdForm.link_url} onChange={(e) => setEditAdForm({ ...editAdForm, link_url: e.target.value })} placeholder="https://..." />
                    </div>
                    <div className="field">
                      <label>Imagem <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>(deixe em branco para manter a atual)</span></label>
                      <label
                        htmlFor={`edit-ad-image-${a.id}`}
                        style={{
                          display: 'block', border: '1.5px dashed var(--line)', borderRadius: 6, padding: '12px', textAlign: 'center',
                          color: 'var(--text-soft)', fontSize: 12.5, cursor: 'pointer',
                        }}
                      >
                        {editAdImage ? `🖼️ ${editAdImage.name}` : 'Clique para trocar a imagem'}
                      </label>
                      <input id={`edit-ad-image-${a.id}`} type="file" accept="image/*" onChange={(e) => setEditAdImage(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => saveEditAd(a.id)} className="btn btn-primary" style={{ fontSize: 12.5 }}>Guardar</button>
                      <button onClick={() => setEditingAdId(null)} className="btn" style={{ fontSize: 12.5 }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    {a.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.image_url} alt={a.title} loading="lazy" style={{ width: 64, height: 48, objectFit: 'contain', background: '#fff', border: '1px solid var(--line)', borderRadius: 5, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 64, height: 48, borderRadius: 5, background: 'linear-gradient(135deg, var(--brass), #9C7A42)', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <b style={{ fontSize: 14 }}>{a.title}</b>
                      <div className="meta">{a.link_url || 'sem link'} · {a.active ? 'ativo' : 'desativado'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => startEditAd(a)} className="btn" style={{ fontSize: 12.5 }}>Editar</button>
                      <button onClick={() => toggleAdActive(a.id, a.active)} className="btn" style={{ fontSize: 12.5 }}>
                        {a.active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button onClick={() => deleteAd(a.id)} className="btn" style={{ fontSize: 12.5, borderColor: '#8a3b2a', color: '#8a3b2a' }}>
                        Apagar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {section === 'definicoes' && (
        <div className="card" style={{ padding: 20, maxWidth: 400 }}>
          <h3 className="display" style={{ fontSize: 17, marginBottom: 4 }}>Taxa de crédito habitação</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 16 }}>
            Usada como ponto de partida no simulador de crédito, em todas as páginas de imóvel. Atualiza sempre que a taxa média do mercado mudar.
          </p>
          <form onSubmit={saveMortgageRate}>
            <div className="field">
              <label>Taxa de juro anual (%)</label>
              <input type="number" step="0.1" required value={mortgageRate} onChange={(e) => setMortgageRate(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingRate}>
              {savingRate ? 'A guardar...' : 'Guardar taxa'}
            </button>
            {rateSaved && <span style={{ fontSize: 12.5, color: 'var(--telha)', marginLeft: 12 }}>✓ Guardado</span>}
          </form>
        </div>
      )}
    </main>
    </>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="wrap" style={{ padding: 60 }}>...</div>}>
      <AdminInner />
    </Suspense>
  );
}
