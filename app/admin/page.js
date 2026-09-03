'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/Header';
import PhoneDisplay from '../../components/PhoneDisplay';
import { useLanguage } from '../../lib/i18n';
import BackButton from '../../components/BackButton';
import { PAYMENT_INFO } from '../../lib/paymentInfo';
import { isProfessionalAccount, accountTypeLabel } from '../../lib/accountTypes';
import { agentLabel } from '../../lib/agentNames';
import { ClipboardList, Flag, MessageCircle, Users, Mail, Footprints, Star, Building2, Newspaper, Megaphone, Settings, Send, Calculator } from 'lucide-react';
import { compressImageFile } from '../../lib/imageCompression';

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
  const { t } = useLanguage();

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
  const [translatingNewsId, setTranslatingNewsId] = useState(null);
  const [newsForm, setNewsForm] = useState({ category: 'Habitação', title: '', body: '' });
  const [newsImage, setNewsImage] = useState(null);
  const [editingNewsId, setEditingNewsId] = useState(null);
  const [savingNews, setSavingNews] = useState(false);
  const [featuredList, setFeaturedList] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [reports, setReports] = useState([]);
  const [supportMessages, setSupportMessages] = useState([]);
  const [mortgageRate, setMortgageRate] = useState('');
  const [savingRate, setSavingRate] = useState(false);
  const [rateSaved, setRateSaved] = useState(false);
  const [euriborRate, setEuriborRate] = useState('');
  const [savingEuribor, setSavingEuribor] = useState(false);
  const [euriborSaved, setEuriborSaved] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [allLeads, setAllLeads] = useState([]);
  const [valuationRequests, setValuationRequests] = useState([]);
  const [leadsRevealed, setLeadsRevealed] = useState(false);
  const [leadsPinInput, setLeadsPinInput] = useState('');
  const [leadsPinError, setLeadsPinError] = useState('');
  const [checkingPin, setCheckingPin] = useState(false);
  const [campaignSubject, setCampaignSubject] = useState('Novidades no More·ada — queremos saber a sua opinião!');
  const [campaignMessage, setCampaignMessage] = useState(
    `<h2 style="font-size:19px; color:#332E22; margin: 0 0 6px;">Obrigada por fazer parte do More·ada 🏡</h2>
<p style="margin:0 0 12px;">Temos vindo a melhorar o portal com novidades como tradução automática de anúncios, calculadoras de crédito e investimento, e um processo de publicação mais simples.</p>
<p style="margin:0 0 12px;">A sua opinião é muito importante para continuarmos a melhorar. Tem 1 minuto para nos dizer como tem sido a sua experiência?</p>`
  );
  const [campaignAudience, setCampaignAudience] = useState('todos');
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [campaignResult, setCampaignResult] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('todos');
  const [supportReplyText, setSupportReplyText] = useState({});
  const [reportReplyText, setReportReplyText] = useState({});
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
      loadAllLeads();
      loadValuationRequests();
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
      const compressedAd = await compressImageFile(adImage, 800);
      const ext = compressedAd.name.split('.').pop();
      const path = `ads/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('property-photos').upload(path, compressedAd, { cacheControl: '31536000' });
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
      const compressedAd = await compressImageFile(editAdImage, 800);
      const ext = compressedAd.name.split('.').pop();
      const path = `ads/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('property-photos').upload(path, compressedAd, { cacheControl: '31536000' });
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

  async function loadAllLeads() {
    const { data } = await supabase
      .from('leads')
      .select('*, properties(id, typology, address, district, owner_id, profiles!owner_id(id, full_name, agency_name))')
      .order('created_at', { ascending: false });
    setAllLeads(data || []);
  }

  async function loadValuationRequests() {
    const { data } = await supabase.from('valuation_requests').select('*').order('created_at', { ascending: false });
    setValuationRequests(data || []);
  }

  async function deleteValuationRequest(id) {
    if (!confirm('Apagar este pedido de avaliação? Esta ação não pode ser desfeita.')) return;
    await supabase.from('valuation_requests').delete().eq('id', id);
    setValuationRequests((cur) => cur.filter((v) => v.id !== id));
  }

  async function markValuationRead(id) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin-update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ table: 'valuation_requests', id, updates: { status: 'lida' } }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      alert(`Não foi possível marcar como lida: ${error || 'erro desconhecido'}`);
      return;
    }
    setValuationRequests((cur) => cur.map((v) => (v.id === id ? { ...v, status: 'lida' } : v)));
  }

  async function markLeadRead(id) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin-update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ table: 'leads', id, updates: { status: 'lida' } }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      alert(`Não foi possível marcar como lida: ${error || 'erro desconhecido'}`);
      return;
    }
    setAllLeads((cur) => cur.map((l) => (l.id === id ? { ...l, status: 'lida' } : l)));
  }

  async function checkLeadsPin(e) {
    e.preventDefault();
    setCheckingPin(true);
    setLeadsPinError('');
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/verify-leads-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ pin: leadsPinInput }),
    });
    if (res.ok) {
      setLeadsRevealed(true);
      setLeadsPinInput('');
    } else {
      const { error } = await res.json();
      setLeadsPinError(error || 'PIN incorreto.');
    }
    setCheckingPin(false);
  }

  async function sendCampaign() {
    const audienceLabel = campaignAudience === 'todos' ? 'TODOS os utilizadores' : campaignAudience === 'agencias' ? 'todas as agências' : 'todos os particulares';
    if (!confirm(`Vai enviar este email a ${audienceLabel}. Tem a certeza?`)) return;

    setSendingCampaign(true);
    setCampaignResult(null);
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch('/api/send-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData?.session?.access_token}`,
        },
        body: JSON.stringify({
          subject: campaignSubject,
          message: campaignMessage,
          audience: campaignAudience,
        }),
      });
      const data = await res.json();
      setCampaignResult(data);
    } catch (err) {
      setCampaignResult({ error: 'Não foi possível enviar a campanha.' });
    }
    setSendingCampaign(false);
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
    const { data } = await supabase.from('settings').select('mortgage_rate, euribor_rate').eq('id', 1).single();
    if (data) {
      setMortgageRate(String(data.mortgage_rate));
      if (data.euribor_rate != null) setEuriborRate(String(data.euribor_rate));
    }
  }

  async function saveMortgageRate(e) {
    e.preventDefault();
    setSavingRate(true);
    await supabase.from('settings').update({ mortgage_rate: Number(mortgageRate), updated_at: new Date().toISOString() }).eq('id', 1);
    setSavingRate(false);
    setRateSaved(true);
    setTimeout(() => setRateSaved(false), 2500);
  }

  async function saveEuriborRate(e) {
    e.preventDefault();
    setSavingEuribor(true);
    await supabase.from('settings').update({ euribor_rate: Number(euriborRate), updated_at: new Date().toISOString() }).eq('id', 1);
    setSavingEuribor(false);
    setEuriborSaved(true);
    setTimeout(() => setEuriborSaved(false), 2500);
  }

  useEffect(() => {
    if (allowed) { loadReports(); loadSupportMessages(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  // Atualiza a lista de suporte em tempo real — assim que um utilizador
  // escreve, aparece logo aqui, sem ser preciso sair e voltar a entrar.
  useEffect(() => {
    if (!allowed) return;
    const channel = supabase
      .channel('admin-support-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_replies' }, () => loadSupportMessages())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_requests' }, () => loadSupportMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [allowed]);

  // Só marca as mensagens de suporte como lidas quando a pessoa abre mesmo essa aba
  // (antes marcava logo ao carregar a página, mesmo sem ver nada — o aviso vermelho nunca aparecia).
  useEffect(() => {
    if (section !== 'suporte' || supportMessages.length === 0) return;
    const unreadIds = supportMessages.filter((m) => !m.read_by_admin).map((m) => m.id);
    if (unreadIds.length === 0) return;
    const now = new Date().toISOString();
    supabase.from('support_requests').update({ read_by_admin: true, read_by_admin_at: now }).in('id', unreadIds).then(() => {
      setSupportMessages((cur) => cur.map((m) => (unreadIds.includes(m.id) ? { ...m, read_by_admin: true, read_by_admin_at: now } : m)));
    });
    // Marca também as respostas do próprio utilizador (não do admin) como lidas, com a hora exata.
    supabase.from('support_replies').select('id').in('support_request_id', unreadIds).eq('sender_role', 'user').is('read_at', null)
      .then(({ data }) => {
        const replyIds = (data || []).map((r) => r.id);
        if (replyIds.length > 0) supabase.from('support_replies').update({ read_at: now }).in('id', replyIds);
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
        read: false,
      });
    }

    setSupportReplyText((cur) => ({ ...cur, [requestId]: '' }));
    loadSupportMessages();
  }

  async function resolveSupportMessage(id) {
    await supabase.from('support_requests').update({ status: 'resolvida' }).eq('id', id);
    setSupportMessages((cur) => cur.map((m) => (m.id === id ? { ...m, status: 'resolvida' } : m)));
  }

  async function reopenSupportMessage(id) {
    await supabase.from('support_requests').update({ status: 'aberta' }).eq('id', id);
    setSupportMessages((cur) => cur.map((m) => (m.id === id ? { ...m, status: 'aberta' } : m)));
  }

  async function deleteSupportMessage(id) {
    if (!confirm('Apagar esta mensagem de suporte? Esta ação não pode ser desfeita.')) return;
    await supabase.from('support_replies').delete().eq('support_request_id', id);
    await supabase.from('support_requests').delete().eq('id', id);
    setSupportMessages((cur) => cur.filter((m) => m.id !== id));
  }

  async function requestTestimonialConsent(id) {
    if (!confirm('Enviar um email a pedir autorização para publicar esta mensagem como testemunho no site?')) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const res = await fetch('/api/request-testimonial-consent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData?.session?.access_token}`,
      },
      body: JSON.stringify({ supportRequestId: id }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Não foi possível enviar o pedido.');
      return;
    }
    setSupportMessages((cur) => cur.map((m) => (m.id === id ? { ...m, testimonial_consent: 'pedido' } : m)));
  }

  async function loadReports() {
    const { data } = await supabase
      .from('reports')
      .select('id, reason, details, reporter_name, reporter_contact, reporter_user_id, status, created_at, properties(id, typology, address, owner_id, profiles!owner_id(id, full_name, agency_name))')
      .order('created_at', { ascending: false });
    setReports(data || []);
  }

  async function resolveReport(id) {
    await supabase.from('reports').update({ status: 'resolvida' }).eq('id', id);
    setReports((cur) => cur.map((r) => (r.id === id ? { ...r, status: 'resolvida' } : r)));
  }

  const [valuationReplyText, setValuationReplyText] = useState({});
  const [valuationReplyFile, setValuationReplyFile] = useState({});
  const [sendingValuationReply, setSendingValuationReply] = useState({});

  async function replyToValuation(v) {
    const text = (valuationReplyText[v.id] || '').trim();
    const file = valuationReplyFile[v.id];
    if (!text && !file) return;
    if (!v.contact?.includes('@')) {
      alert('Este pedido não deixou um email de contacto — não é possível responder por aqui.');
      return;
    }

    setSendingValuationReply((cur) => ({ ...cur, [v.id]: true }));

    let attachmentUrl = null;
    if (file) {
      const { data: { session } } = await supabase.auth.getSession();
      const body = new FormData();
      body.append('file', file);
      body.append('propertyId', `valuation-${v.id}`);
      body.append('type', 'document');
      const res = await fetch('/api/upload-photo-r2', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body,
      });
      if (res.ok) {
        const data = await res.json();
        attachmentUrl = data.url;
      } else {
        alert('Não foi possível enviar o documento. A resposta vai ser enviada só com o texto.');
      }
    }

    const res = await fetch('/api/notify-valuation-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toEmail: v.contact, toName: v.name, address: v.address, replyText: text, attachmentUrl }),
    });

    setSendingValuationReply((cur) => ({ ...cur, [v.id]: false }));

    if (!res.ok) {
      alert('Não foi possível enviar a resposta. Tenta outra vez.');
      return;
    }

    setValuationReplyText((cur) => ({ ...cur, [v.id]: '' }));
    setValuationReplyFile((cur) => ({ ...cur, [v.id]: null }));
    alert('Resposta enviada por email.');
  }

  async function replyToReport(report) {
    const text = (reportReplyText[report.id] || '').trim();
    if (!text) return;

    // Se quem denunciou tinha sessão iniciada nessa altura, a resposta
    // aparece na caixa de mensagens/notificações da conta dela.
    if (report.reporter_user_id) {
      await supabase.from('notifications').insert({
        user_id: report.reporter_user_id,
        message: `Resposta à sua denúncia sobre "${report.reason}": ${text}`,
        link: report.properties?.id ? `/property/${report.properties.id}` : '/dashboard',
        read: false,
      });
    }
    // Se deixou um contacto que parece email, envia também por email —
    // cobre quem denunciou sem ter conta no site.
    if (report.reporter_contact?.includes('@')) {
      await fetch('/api/notify-report-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: report.reporter_contact, reportReason: report.reason, replyText: text }),
      }).catch(() => {});
    }

    setReportReplyText((cur) => ({ ...cur, [report.id]: '' }));
    alert('Resposta enviada.');
  }

  async function deleteReport(id) {
    if (!confirm('Apagar esta denúncia? Esta ação não pode ser desfeita.')) return;
    await supabase.from('reports').delete().eq('id', id);
    setReports((cur) => cur.filter((r) => r.id !== id));
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
      .from('properties').select('id, typology, address, price, featured_status, featured_requested_at, profiles!owner_id(id, full_name, agency_name)')
      .in('featured_status', ['pending', 'active'])
      .order('featured_requested_at', { ascending: false });
    setFeaturedList(data || []);
  }

  async function activateFeatured(id, days) {
    const featuredUntil = new Date();
    featuredUntil.setDate(featuredUntil.getDate() + (days || 7));
    await supabase.from('properties').update({
      featured_status: 'active',
      featured_activated_at: new Date().toISOString(),
      featured_until: featuredUntil.toISOString(),
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

    let cover_image_url = editingNewsId ? undefined : null;
    if (newsImage) {
      const compressedImage = await compressImageFile(newsImage, 800);
      const ext = compressedImage.name.split('.').pop();
      const path = `news/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('property-photos').upload(path, compressedImage, { cacheControl: '31536000' });
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('property-photos').getPublicUrl(path);
        cover_image_url = publicUrlData.publicUrl;
      }
    }

    const payload = {
      category: newsForm.category,
      title: (newsForm.title || '').replace(/\*+/g, ''),
      body: (newsForm.body || '').replace(/\*+/g, ''),
      ...(cover_image_url !== undefined ? { cover_image_url } : {}),
    };

    if (editingNewsId) {
      await supabase.from('news').update(payload).eq('id', editingNewsId);
    } else {
      await supabase.from('news').insert({ ...payload, published: true });
    }

    setNewsForm({ category: 'Habitação', title: '', body: '' });
    setNewsImage(null);
    setEditingNewsId(null);
    setSavingNews(false);
    loadNews();
  }

  function startEditNews(n) {
    setEditingNewsId(n.id);
    setNewsForm({ category: n.category, title: n.title, body: n.body });
    setNewsImage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditNews() {
    setEditingNewsId(null);
    setNewsForm({ category: 'Habitação', title: '', body: '' });
    setNewsImage(null);
  }

  async function translateNews(id) {
    setTranslatingNewsId(id);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/translate-news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ newsId: id }),
    });
    if (res.ok) {
      loadNews();
    } else {
      const { error } = await res.json();
      alert(`Não foi possível traduzir: ${error}`);
    }
    setTranslatingNewsId(null);
  }

  async function deleteNews(id) {
    await supabase.from('news').delete().eq('id', id);
    setNews((cur) => cur.filter((n) => n.id !== id));
  }

  async function loadProperties(status) {
    setFilter(status);
    let query = supabase.from('properties').select('*, profiles!owner_id(id, full_name, agency_name, account_type)').order('created_at', { ascending: false });
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

  async function openDocument(propertyId) {
    const { data: sessionData } = await supabase.auth.getSession();
    const res = await fetch('/api/get-document-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData?.session?.access_token}`,
      },
      body: JSON.stringify({ propertyId }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Não foi possível abrir o documento.');
      return;
    }
    window.open(data.url, '_blank', 'noopener,noreferrer');
  }

  async function cancelProperty(propObj) {
    const reason = prompt('Motivo da anulação (visível ao anunciante):');
    if (!reason) return;
    await supabase.from('properties').update({ status: 'anulado_suporte', cancellation_reason: reason }).eq('id', propObj.id);
    await supabase.from('notifications').insert({
      user_id: propObj.owner_id,
      message: `⚑ Aviso do Morada: o seu anúncio "${propObj.typology} · ${propObj.address}" foi anulado. Motivo: ${reason}`,
      link: '/dashboard',
      read: false,
    });
    setProperties((cur) => cur.filter((p) => p.id !== propObj.id));
    alert('Anúncio anulado. O anunciante não pode republicá-lo — terá de criar um novo.');
  }

  async function adminDeleteProperty(propObj) {
    if (!confirm(`Apagar definitivamente "${propObj.typology} · ${propObj.address}"? Esta ação não pode ser desfeita, e o anunciante vai ser avisado.`)) return;

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/delete-property-permanently', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ propertyId: propObj.id }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      alert(`Não foi possível apagar: ${error}`);
      return;
    }

    setProperties((cur) => cur.filter((p) => p.id !== propObj.id));
    alert('Anúncio apagado definitivamente. O anunciante foi avisado.');
  }

  if (checking) return (<><Header /><div className="wrap" style={{ padding: 60 }}>{t('admin_checking_access')}</div></>);

  if (!allowed) {
    return (
      <>
        <Header />
        <div className="wrap" style={{ padding: 60 }}>
          <h1 className="display" style={{ fontSize: 22 }}>{t('admin_no_access_title')}</h1>
          <p style={{ color: 'var(--text-soft)' }}>{t('admin_no_access_text')}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
    <main id="main-content" className="wrap" style={{ padding: '40px 32px 80px' }}>
      <BackButton fallback="/" />
      <h1 className="display" style={{ fontSize: 26, marginBottom: 20 }}>{t('admin_title')}</h1>

      <div className="admin-tabs" style={{ display: 'flex', gap: 8, marginBottom: 28, borderBottom: '1px solid var(--line)', overflowX: 'auto' }}>
        {[
          ['anuncios', ClipboardList, 'Anúncios', 0],
          ['denuncias', Flag, 'Denúncias', reports.filter((r) => r.status !== 'resolvida').length],
          ['suporte', MessageCircle, 'Suporte', supportMessages.filter((m) => !m.read_by_admin).length],
          ['utilizadores', Users, 'Utilizadores', 0], ['leads', Mail, 'Leads', allLeads.filter((l) => l.status === 'novo').length], ['avaliacoes', Calculator, 'Avaliações', valuationRequests.filter((v) => v.status !== 'lida').length], ['atividade', Footprints, 'Atividade', 0], ['campanha', Send, 'Campanha', 0], ['destaques', Star, 'Destaques', 0], ['agencias', Building2, 'Agências', 0],
          ['noticias', Newspaper, 'Notícias', 0], ['publicidade', Megaphone, 'Publicidade', 0], ['definicoes', Settings, 'Definições', 0],
        ].map(([value, Icon, label, count]) => (
          <button
            key={value}
            onClick={() => setSection(value)}
            style={{
              background: 'none', border: 'none', padding: '0 4px 12px', marginRight: 24, fontWeight: 600,
              fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap',
              color: section === value ? 'var(--ink)' : 'var(--text-soft)',
              borderBottom: section === value ? '2px solid var(--telha)' : '2px solid transparent',
            }}
          >
            <Icon size={16} />
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

      {properties.length === 0 && <p className="empty-state">{t('admin_no_listings_state')}</p>}

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
              {p.moderation_flag_reason && (
                <p style={{ fontSize: 12.5, marginTop: 6, color: '#8a3b2a', fontWeight: 600 }}>
                  ⚠️ Assinalado automaticamente: {p.moderation_flag_reason}
                </p>
              )}
              {p.document_url && (
                <p style={{ fontSize: 12.5, marginTop: 6 }}>
                  <button
                    onClick={() => openDocument(p.id)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--telha)', fontSize: 12.5, textDecoration: 'underline' }}
                  >
                    📄 Ver documento anexado
                  </button>
                  {p.document_verified && <span style={{ color: 'var(--azulejo)', marginLeft: 8 }}>✓ Verificado</span>}
                </p>
              )}
              {p.video_url && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)', marginBottom: 4 }}>
                    🎬 Vídeo do anúncio — não é verificado automaticamente, veja antes de aprovar:
                  </div>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    controls
                    preload="metadata"
                    style={{ width: '100%', maxWidth: 360, maxHeight: 240, borderRadius: 6, border: '1px solid var(--line)', background: '#000' }}
                  >
                    <source src={p.video_url} />
                  </video>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {p.document_url && !p.document_verified && (
                <button onClick={() => verifyDocument(p.id)} className="btn" style={{ fontSize: 13, borderColor: 'var(--azulejo)', color: 'var(--azulejo)' }}>
                  ✓ Confirmar documentação
                </button>
              )}
              {p.status !== 'ativo' && p.status !== 'anulado_suporte' && (
                <button onClick={() => updateStatus(p.id, 'ativo')} className="btn btn-primary" style={{ fontSize: 13 }}>{t('admin_approve')}</button>
              )}
              {p.status !== 'rejeitado' && p.status !== 'anulado_suporte' && (
                <button onClick={() => updateStatus(p.id, 'rejeitado')} className="btn" style={{ fontSize: 13 }}>{t('admin_reject')}</button>
              )}
              {p.status === 'ativo' && (
                <button onClick={() => cancelProperty(p)} className="btn" style={{ fontSize: 13, borderColor: '#8a3b2a', color: '#8a3b2a' }}>{t('admin_cancel_listing')}</button>
              )}
              <button onClick={() => adminDeleteProperty(p)} className="btn" style={{ fontSize: 13, borderColor: '#8a3b2a', color: '#8a3b2a' }}>
                🗑 Apagar definitivamente
              </button>
            </div>
          </div>
        )}
      />
        </>
      )}

      {section === 'denuncias' && (
        <>
          {reports.length === 0 && <p className="empty-state">{t('admin_no_reports')}</p>}
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
                  {r.reporter_contact && (
                    <p style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 4 }}>
                      De: {r.reporter_name || 'sem nome'} · Contacto:{' '}
                      {r.reporter_contact.includes('@') ? r.reporter_contact : (
                        <PhoneDisplay phone={r.reporter_contact} style={{ color: 'var(--telha)', cursor: 'pointer' }}>
                          📞 {r.reporter_contact}
                        </PhoneDisplay>
                      )}
                    </p>
                  )}
                  {(r.reporter_user_id || r.reporter_contact?.includes('@')) && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <input
                        value={reportReplyText[r.id] || ''}
                        onChange={(e) => setReportReplyText((cur) => ({ ...cur, [r.id]: e.target.value }))}
                        placeholder="Responder a quem denunciou..."
                        style={{ flex: 1, padding: '6px 10px', borderRadius: 16, border: '1px solid var(--line)', fontSize: 12.5 }}
                      />
                      <button onClick={() => replyToReport(r)} className="btn" style={{ fontSize: 11.5, padding: '4px 10px' }}>
                        Enviar
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {r.properties && (
                    <a href={`/property/${r.properties.id}`} target="_blank" rel="noopener noreferrer" className="btn" style={{ fontSize: 13 }}>Ver</a>
                  )}
                  {r.status !== 'resolvida' && (
                    <button onClick={() => resolveReport(r.id)} className="btn btn-primary" style={{ fontSize: 13 }}>{t('admin_mark_resolved')}</button>
                  )}
                  {r.status === 'resolvida' && (
                    <button onClick={() => deleteReport(r.id)} className="btn" style={{ fontSize: 13, color: '#b8452f' }}>🗑 Apagar</button>
                  )}
                </div>
              </div>
            )}
          />
        </>
      )}

      {section === 'suporte' && (
        <>
          {supportMessages.length === 0 && <p className="empty-state">{t('admin_no_messages_yet')}</p>}
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
                  Falou com {agentLabel(m.agent_name)} · Contacto: {m.contact || 'não fornecido'}
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
                    placeholder={!m.user_id ? 'Sem conta associada — sem forma de responder na app' : m.status === 'resolvida' ? 'Reabra a conversa para poder escrever' : 'Escreva uma resposta...'}
                    disabled={!m.user_id || m.status === 'resolvida'}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 20, border: '1px solid var(--line)', fontSize: 13 }}
                  />
                  <button
                    onClick={() => sendSupportReply(m.id)}
                    className="btn btn-primary"
                    style={{ fontSize: 12.5 }}
                    disabled={!m.user_id || m.status === 'resolvida'}
                  >
                    Enviar
                  </button>
                  {m.user_id && !m.testimonial_consent && (
                    <button onClick={() => requestTestimonialConsent(m.id)} className="btn" style={{ fontSize: 12.5 }}>
                      💬 Pedir testemunho
                    </button>
                  )}
                  {m.testimonial_consent === 'pedido' && (
                    <span style={{ fontSize: 11.5, color: 'var(--text-soft)', alignSelf: 'center' }}>{t('admin_request_sent')}</span>
                  )}
                  {m.testimonial_consent === 'sim' && (
                    <span style={{ fontSize: 11.5, color: 'var(--telha)', fontWeight: 600, alignSelf: 'center' }}>✓ Autorizado — pode publicar</span>
                  )}
                  {m.testimonial_consent === 'nao' && (
                    <span style={{ fontSize: 11.5, color: '#8a3b2a', alignSelf: 'center' }}>{t('admin_not_authorized')}</span>
                  )}
                  {m.status !== 'resolvida' && (
                    <button onClick={() => resolveSupportMessage(m.id)} className="btn" style={{ fontSize: 12.5 }}>
                      Marcar resolvida
                    </button>
                  )}
                  {m.status === 'resolvida' && (
                    <>
                      <button onClick={() => reopenSupportMessage(m.id)} className="btn" style={{ fontSize: 12.5 }}>
                        Reabrir
                      </button>
                      <button onClick={() => deleteSupportMessage(m.id)} className="btn" style={{ fontSize: 12.5, color: '#b8452f' }}>
                        🗑 Apagar
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          />
        </>
      )}

      {section === 'utilizadores' && (
        <>
          <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              ['todos', 'Todos'],
              ['particular', `Particulares (${allUsers.filter((u) => u.account_type === 'particular').length})`],
              ['agencia', `Agências (${allUsers.filter((u) => u.account_type === 'agencia').length})`],
              ['consultor', `Consultores (${allUsers.filter((u) => u.account_type === 'consultor').length})`],
              ['promotor', `Promotores (${allUsers.filter((u) => u.account_type === 'promotor').length})`],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setUserTypeFilter(value)}
                className={userTypeFilter === value ? 'btn btn-primary' : 'btn'}
                style={{ fontSize: 12.5 }}
              >
                {label}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="🔎 Procurar por nome, email ou telefone..."
              style={{ width: '100%', maxWidth: 420, padding: '10px 14px', borderRadius: 20, border: '1px solid var(--line)', fontSize: 13.5 }}
            />
          </div>
          {allUsers.length === 0 && <p className="empty-state">{t('admin_no_users_yet')}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {allUsers
              .filter((u) => userTypeFilter === 'todos' || u.account_type === userTypeFilter)
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
                      {u.email}{u.phone_real ? (
                        <> · <PhoneDisplay phone={u.phone_real} style={{ color: 'inherit', cursor: 'pointer' }}>📞 {u.phone_real}</PhoneDisplay></>
                      ) : ''}
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
                        <option value="particular">{t('admin_particular_opt')}</option>
                        <option value="agencia">{t('admin_agency_opt')}</option>
                        <option value="consultor">{t('admin_consultant_opt')}</option>
                        <option value="promotor">{t('admin_developer_opt')}</option>
                      </select>
                      {u.account_type === 'particular' && u.agency_name && (
                        <span title="Tem nome de agência preenchido mas está marcado como particular" style={{ color: '#8a6a1f', fontWeight: 700, fontSize: 11 }}>
                          ⚠️ Parece ser agência
                        </span>
                      )}
                      {u.is_admin && ' · Administrador'}
                      {u.is_blocked && <span style={{ color: '#8a3b2a', fontWeight: 700 }}> · Bloqueado</span>}
                      {isProfessionalAccount(u.account_type) && (
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
                  {isProfessionalAccount(u.account_type) && u.subscription_proof_url && u.subscription_status === 'pending' && (
                    <a href={u.subscription_proof_url} target="_blank" rel="noopener noreferrer" className="btn" style={{ fontSize: 13 }}>
                      📄 Ver comprovativo
                    </a>
                  )}
                  {isProfessionalAccount(u.account_type) && u.subscription_status !== 'active' && (
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

      {section === 'leads' && (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 20 }}>
            Aqui vês, como administradora, todas as mensagens de contacto (leads) que os outros utilizadores receberam através dos seus anúncios — de qualquer pessoa, de qualquer utilizador. Serve para apoio e moderação.
          </p>
          {!leadsRevealed ? (
            <form onSubmit={checkLeadsPin} style={{ maxWidth: 280 }}>
              <div className="field">
                <label>🔒 PIN para revelar os leads</label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  value={leadsPinInput}
                  onChange={(e) => { setLeadsPinInput(e.target.value); setLeadsPinError(''); }}
                />
                {leadsPinError && <p style={{ fontSize: 12.5, color: '#b8452f', marginTop: 4 }}>{leadsPinError}</p>}
              </div>
              <button type="submit" disabled={checkingPin || !leadsPinInput} className="btn btn-primary">
                {checkingPin ? 'A confirmar...' : 'Mostrar leads'}
              </button>
            </form>
          ) : allLeads.length === 0 ? (
            <p className="empty-state">{t('admin_no_leads_yet')}</p>
          ) : (
            <GroupedByOwner
              items={allLeads}
              getOwnerKey={(l) => l.properties?.owner_id}
              getOwnerLabel={(l) => l.properties?.profiles?.agency_name || l.properties?.profiles?.full_name || 'Utilizador'}
              noOwnerLabel="Sem anúncio associado"
              renderItem={(l) => (
                <div key={l.id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                    <div>
                      <b style={{ fontSize: 14 }}>{l.name}</b>
                      <div className="meta">
                        {l.email}{l.phone ? (
                          <> · <PhoneDisplay phone={l.phone} style={{ color: 'inherit', cursor: 'pointer' }}>📞 {l.phone}</PhoneDisplay></>
                        ) : ''}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 12, flexShrink: 0,
                      background: l.status === 'novo' ? 'rgba(126,143,106,0.18)' : 'var(--line)',
                      color: l.status === 'novo' ? 'var(--telha)' : 'var(--text-soft)',
                    }}>
                      {l.status === 'novo' ? 'Nova' : l.status === 'lida' ? 'Lida' : 'Respondida'}
                    </span>
                  </div>
                  <p style={{ fontSize: 13.5, marginBottom: 10 }}>{l.message}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    {l.properties ? (
                      <a href={`/property/${l.properties.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: 'var(--telha)' }}>
                        {l.properties.typology} · {l.properties.district}
                      </a>
                    ) : (
                      <span className="meta">{t('admin_listing_no_longer_exists')}</span>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {l.status === 'novo' && (
                        <button onClick={() => markLeadRead(l.id)} className="btn" style={{ fontSize: 11.5, padding: '4px 10px' }}>
                          ✓ Marcar como lida
                        </button>
                      )}
                      <span className="meta">{new Date(l.created_at).toLocaleDateString('pt-PT')}</span>
                    </div>
                  </div>
                </div>
              )}
            />
          )}
        </>
      )}

      {section === 'avaliacoes' && (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 20 }}>
            Pedidos de avaliação de imóvel, enviados através do formulário "Avaliar imóvel" do site.
          </p>
          {valuationRequests.length === 0 ? (
            <p className="empty-state">Ainda não há pedidos de avaliação.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {valuationRequests.map((v) => (
                <div key={v.id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                    <div>
                      <b style={{ fontSize: 14 }}>{v.name}</b>
                      <div className="meta">{v.contact}</div>
                    </div>
                    <span className="meta">{new Date(v.created_at).toLocaleDateString('pt-PT')}</span>
                    {v.status === 'lida' && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 12, background: 'var(--line)', color: 'var(--text-soft)' }}>
                        Lida
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13.5, marginBottom: 6 }}>
                    <b>Morada:</b> {v.address}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 10 }}>
                    {v.typology && `${v.typology} · `}{v.area && `${v.area} m²`}
                  </div>
                  {v.notes && <p style={{ fontSize: 13, marginBottom: 10 }}>{v.notes}</p>}
                  {v.contact?.includes('@') && (
                    <div style={{ marginBottom: 10 }}>
                      <textarea
                        value={valuationReplyText[v.id] || ''}
                        onChange={(e) => setValuationReplyText((cur) => ({ ...cur, [v.id]: e.target.value }))}
                        placeholder="Escreva a sua resposta (opcional se anexar só o documento)..."
                        rows={2}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--line)', fontSize: 12.5, marginBottom: 6, resize: 'vertical' }}
                      />
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => setValuationReplyFile((cur) => ({ ...cur, [v.id]: e.target.files[0] || null }))}
                          style={{ fontSize: 11.5 }}
                        />
                        <button
                          onClick={() => replyToValuation(v)}
                          disabled={sendingValuationReply[v.id]}
                          className="btn btn-primary"
                          style={{ fontSize: 11.5, padding: '5px 12px' }}
                        >
                          {sendingValuationReply[v.id] ? 'A enviar...' : '📧 Enviar avaliação por email'}
                        </button>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {v.status !== 'lida' && (
                      <button onClick={() => markValuationRead(v.id)} className="btn" style={{ fontSize: 11.5, padding: '4px 10px' }}>
                        ✓ Marcar como lida
                      </button>
                    )}
                    <button onClick={() => deleteValuationRequest(v.id)} className="btn" style={{ fontSize: 11.5, padding: '4px 10px', color: '#8a3b2a', borderColor: '#8a3b2a' }}>
                      🗑 Apagar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {section === 'campanha' && (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 20 }}>
            Envia um email a vários utilizadores de uma vez — por exemplo, para falar de novidades do portal e pedir feedback.
            O email inclui automaticamente uma saudação personalizada e um botão para deixar a opinião.
          </p>

          <div className="field">
            <label>{t('admin_subject')}</label>
            <input value={campaignSubject} onChange={(e) => setCampaignSubject(e.target.value)} />
          </div>

          <div className="field">
            <label>Mensagem <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{t('admin_html_hint')}</span></label>
            <textarea
              value={campaignMessage}
              onChange={(e) => setCampaignMessage(e.target.value)}
              rows={10}
              style={{ fontFamily: 'monospace', fontSize: 12.5 }}
            />
          </div>

          <div className="field">
            <label>{t('admin_send_to')}</label>
            <select value={campaignAudience} onChange={(e) => setCampaignAudience(e.target.value)}>
              <option value="todos">{t('admin_all_users')}</option>
              <option value="agencias">{t('admin_agencies_only')}</option>
              <option value="particulares">{t('admin_individuals_only')}</option>
            </select>
          </div>

          <button onClick={sendCampaign} className="btn btn-primary" disabled={sendingCampaign}>
            {sendingCampaign ? 'A enviar...' : 'Enviar campanha'}
          </button>

          {sendingCampaign && (
            <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginTop: 10 }}>
              Isto pode demorar um pouco, consoante o número de utilizadores — não feche esta página.
            </p>
          )}

          {campaignResult && !campaignResult.error && (
            <div style={{ marginTop: 14, background: 'rgba(126,143,106,0.14)', borderRadius: 8, padding: 14, fontSize: 13 }}>
              ✓ Enviado a {campaignResult.sentCount} de {campaignResult.total} utilizadores.
              {campaignResult.failedCount > 0 && ` (${campaignResult.failedCount} falharam, provavelmente sem email disponível.)`}
            </div>
          )}
          {campaignResult?.error && (
            <p className="error-text" style={{ marginTop: 14 }}>{campaignResult.error}</p>
          )}
        </>
      )}

      {section === 'atividade' && (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 20 }}>
            Última vez que cada utilizador com conta visitou o site (atualizado no máximo de hora a hora, por visita).
            Visitantes sem conta não aparecem aqui — para esses, usa o Google Analytics.
          </p>
          {allUsers.filter((u) => u.last_seen_at).length === 0 && (
            <p className="empty-state">{t('admin_no_visit_records')}</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...allUsers]
              .filter((u) => u.last_seen_at)
              .sort((a, b) => new Date(b.last_seen_at) - new Date(a.last_seen_at))
              .map((u) => {
                const diffMs = Date.now() - new Date(u.last_seen_at).getTime();
                const diffMin = Math.floor(diffMs / 60000);
                const diffH = Math.floor(diffMin / 60);
                const diffD = Math.floor(diffH / 24);
                const label = diffMin < 5 ? 'agora mesmo' : diffMin < 60 ? `há ${diffMin} min` : diffH < 24 ? `há ${diffH}h` : `há ${diffD} ${diffD === 1 ? 'dia' : 'dias'}`;
                return (
                  <div key={u.id} className="card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {u.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatar_url} alt="" loading="lazy" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', background: 'var(--azulejo)', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13,
                        }}>
                          {(u.agency_name || u.full_name || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <b style={{ fontSize: 13.5 }}>{u.agency_name || u.full_name}</b>
                        <div className="meta">{u.email}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 12.5, color: diffMin < 30 ? 'var(--telha)' : 'var(--text-soft)', fontWeight: diffMin < 30 ? 600 : 400 }}>
                      {diffMin < 30 && '🟢 '}{label}
                    </span>
                  </div>
                );
              })}
          </div>
        </>
      )}

      {section === 'destaques' && (
        <>
          {featuredList.length === 0 && <p className="empty-state">{t('admin_no_featured_requests')}</p>}
          <GroupedByOwner
            items={featuredList}
            getOwnerKey={(p) => p.profiles?.id}
            getOwnerLabel={(p) => p.profiles?.agency_name || p.profiles?.full_name || 'Utilizador'}
            renderItem={(p) => (
              <div key={p.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <b>{p.typology} · {p.address}</b>
                  <div className="meta">
                    {Number(p.price).toLocaleString('pt-PT')} € · Ref. {p.id.slice(0, 8)}
                    {p.featured_status === 'pending' && p.featured_days && (
                      <> · {p.featured_days} dias pedidos · Total: {(PAYMENT_INFO.activationFee + PAYMENT_INFO.dailyFee * p.featured_days).toFixed(2)} € · Aguarda confirmação de pagamento</>
                    )}
                    {p.featured_status === 'active' && (
                      <> · Destaque ativo{p.featured_until ? ` até ${new Date(p.featured_until).toLocaleDateString('pt-PT')}` : ''}</>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {p.featured_status === 'pending' && (
                    <button onClick={() => activateFeatured(p.id, p.featured_days)} className="btn btn-primary" style={{ fontSize: 13 }}>
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
          {agencies.length === 0 && <p className="empty-state">{t('admin_no_agencies_registered')}</p>}
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
            <h3 className="display" style={{ fontSize: 17, marginBottom: 14 }}>{editingNewsId ? 'Editar notícia' : 'Nova notícia'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>{t('admin_category')}</label>
                <select value={newsForm.category} onChange={(e) => setNewsForm({ ...newsForm, category: e.target.value })}>
                  <option>{t('admin_cat_housing')}</option>
                  <option>{t('admin_cat_credit')}</option>
                  <option>{t('admin_cat_construction')}</option>
                  <option>{t('admin_cat_market')}</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>{t('admin_news_title')}</label>
                <input required value={newsForm.title} onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>{t('admin_news_text')}</label>
              <textarea required rows={3} value={newsForm.body} onChange={(e) => setNewsForm({ ...newsForm, body: e.target.value })} />
            </div>
            <div className="field">
              <label>{t('admin_image')} <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{editingNewsId ? t('admin_keep_current_image') : t('admin_optional')}</span></label>
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
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={savingNews}>
                {savingNews ? 'A guardar...' : editingNewsId ? 'Guardar alterações' : 'Publicar notícia'}
              </button>
              {editingNewsId && (
                <button type="button" onClick={cancelEditNews} className="btn">{t('admin_cancel_edit')}</button>
              )}
            </div>
          </form>

          {news.length === 0 && <p className="empty-state">{t('admin_no_news_yet')}</p>}

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
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, height: 'fit-content' }}>
                  <button
                    onClick={() => translateNews(n.id)}
                    disabled={translatingNewsId === n.id}
                    className="btn"
                    style={{ fontSize: 12, color: n.title_translations ? 'var(--telha)' : 'var(--text-soft)' }}
                    title={n.title_translations ? t('admin_already_translated_hint') : t('admin_not_translated_hint')}
                  >
                    {translatingNewsId === n.id ? t('admin_translating') : n.title_translations ? t('admin_translated') : t('admin_translate_btn')}
                  </button>
                  <button onClick={() => startEditNews(n)} className="btn" style={{ fontSize: 12 }}>{t('admin_edit')}</button>
                  <button onClick={() => deleteNews(n.id)} className="btn" style={{ fontSize: 12 }}>{t('admin_delete')}</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {section === 'publicidade' && (
        <>
          <form onSubmit={createAd} className="card" style={{ padding: 20, marginBottom: 28, overflow: 'visible' }}>
            <h3 className="display" style={{ fontSize: 17, marginBottom: 14 }}>{t('admin_new_banner')}</h3>
            <div className="field">
              <label>{t('admin_banner_title')}</label>
              <input required value={adForm.title} onChange={(e) => setAdForm({ ...adForm, title: e.target.value })} placeholder="ex: Simule já o seu crédito habitação" />
            </div>
            <div className="field">
              <label>{t('admin_link')} <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{t('admin_optional')}</span></label>
              <input value={adForm.link_url} onChange={(e) => setAdForm({ ...adForm, link_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="field">
              <label>{t('admin_image')} <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{t('admin_optional')}</span></label>
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

          {ads.length === 0 && <p className="empty-state">{t('admin_no_banners_yet')}</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ads.map((a) => (
              <div key={a.id} className="card" style={{ padding: 16 }}>
                {editingAdId === a.id ? (
                  <div>
                    <div className="field">
                      <label>{t('admin_title_text')}</label>
                      <input value={editAdForm.title} onChange={(e) => setEditAdForm({ ...editAdForm, title: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>Link</label>
                      <input value={editAdForm.link_url} onChange={(e) => setEditAdForm({ ...editAdForm, link_url: e.target.value })} placeholder="https://..." />
                    </div>
                    <div className="field">
                      <label>{t('admin_image')} <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{t('admin_keep_current')}</span></label>
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
                      <button onClick={() => saveEditAd(a.id)} className="btn btn-primary" style={{ fontSize: 12.5 }}>{t('admin_save')}</button>
                      <button onClick={() => setEditingAdId(null)} className="btn" style={{ fontSize: 12.5 }}>{t('admin_cancel')}</button>
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
                      <button onClick={() => startEditAd(a)} className="btn" style={{ fontSize: 12.5 }}>{t('admin_edit')}</button>
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
          <h3 className="display" style={{ fontSize: 17, marginBottom: 4 }}>{t('admin_mortgage_rate_title')}</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 16 }}>
            Usada como ponto de partida no simulador de crédito, em todas as páginas de imóvel. Atualiza sempre que a taxa média do mercado mudar.
          </p>
          <form onSubmit={saveMortgageRate}>
            <div className="field">
              <label>{t('admin_annual_rate')}</label>
              <input type="number" step="0.1" required value={mortgageRate} onChange={(e) => setMortgageRate(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingRate}>
              {savingRate ? 'A guardar...' : 'Guardar taxa'}
            </button>
            {rateSaved && <span style={{ fontSize: 12.5, color: 'var(--telha)', marginLeft: 12 }}>✓ Guardado</span>}
          </form>
        </div>
      )}

      {section === 'definicoes' && (
        <div className="card" style={{ padding: 20, maxWidth: 400, marginTop: 16 }}>
          <h3 className="display" style={{ fontSize: 17, marginBottom: 4 }}>{t('admin_euribor_ref_title')}</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 16 }}>
            Usada como ponto de partida na "taxa variável" do simulador de crédito misto. Não é atualizada automaticamente — atualiza aqui sempre que a Euribor mudar significativamente (consulta em euribor-rates.eu ou no Banco de Portugal).
          </p>
          <form onSubmit={saveEuriborRate}>
            <div className="field">
              <label>{t('admin_euribor_6m')}</label>
              <input type="number" step="0.01" required value={euriborRate} onChange={(e) => setEuriborRate(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingEuribor}>
              {savingEuribor ? 'A guardar...' : 'Guardar taxa'}
            </button>
            {euriborSaved && <span style={{ fontSize: 12.5, color: 'var(--telha)', marginLeft: 12 }}>✓ Guardado</span>}
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
