'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/Header';

export default function AdminPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [properties, setProperties] = useState([]);
  const [filter, setFilter] = useState('em_revisao');
  const [section, setSection] = useState('anuncios');
  const [news, setNews] = useState([]);
  const [newsForm, setNewsForm] = useState({ category: 'Habitação', title: '', body: '' });
  const [newsImage, setNewsImage] = useState(null);
  const [savingNews, setSavingNews] = useState(false);
  const [featuredList, setFeaturedList] = useState([]);
  const [agencies, setAgencies] = useState([]);

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
    }
    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAgencies() {
    const { data } = await supabase.from('profiles').select('*').eq('account_type', 'agencia').order('agency_name');
    setAgencies(data || []);
  }

  async function toggleVerified(id, current) {
    await supabase.from('profiles').update({ is_verified: !current }).eq('id', id);
    setAgencies((cur) => cur.map((a) => (a.id === id ? { ...a, is_verified: !current } : a)));
  }

  async function loadFeatured() {
    const { data } = await supabase
      .from('properties').select('id, typology, address, price, featured_status, featured_requested_at')
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
      title: newsForm.title,
      body: newsForm.body,
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
    let query = supabase.from('properties').select('*').order('created_at', { ascending: false });
    if (status !== 'todos') query = query.eq('status', status);
    const { data } = await query;
    setProperties(data || []);
  }

  async function updateStatus(id, status) {
    await supabase.from('properties').update({ status }).eq('id', id);
    setProperties((cur) => cur.filter((p) => p.id !== id));
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
    <div className="wrap" style={{ padding: '40px 32px 80px' }}>
      <h1 className="display" style={{ fontSize: 26, marginBottom: 20 }}>Administração</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 28, borderBottom: '1px solid var(--line)' }}>
        {[['anuncios', 'Anúncios'], ['destaques', 'Destaques'], ['agencias', 'Agências'], ['noticias', 'Notícias']].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setSection(value)}
            style={{
              background: 'none', border: 'none', padding: '0 4px 12px', marginRight: 24, fontWeight: 600,
              fontSize: 14, cursor: 'pointer',
              color: section === value ? 'var(--ink)' : 'var(--text-soft)',
              borderBottom: section === value ? '2px solid var(--telha)' : '2px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'anuncios' && (
        <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          ['em_revisao', 'Por rever'],
          ['ativo', 'Ativos'],
          ['rejeitado', 'Rejeitados'],
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {properties.map((p) => (
          <div key={p.id} className="card" style={{ padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
              <b>{p.typology} · {p.address}</b>
              <div className="meta">
                {Number(p.price).toLocaleString('pt-PT')} € · {p.property_type} · {p.district} · estado atual: {p.status}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-soft)', maxWidth: 500, marginTop: 4 }}>{p.description}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {p.status !== 'ativo' && (
                <button onClick={() => updateStatus(p.id, 'ativo')} className="btn btn-primary" style={{ fontSize: 13 }}>Aprovar</button>
              )}
              {p.status !== 'rejeitado' && (
                <button onClick={() => updateStatus(p.id, 'rejeitado')} className="btn" style={{ fontSize: 13 }}>Rejeitar</button>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {featuredList.map((p) => (
              <div key={p.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
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
            ))}
          </div>
        </>
      )}

      {section === 'agencias' && (
        <>
          {agencies.length === 0 && <p className="empty-state">Ainda não há agências registadas.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {agencies.map((a) => (
              <div key={a.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
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
              <div key={n.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                {n.cover_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.cover_image_url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
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
    </div>
    </>
  );
}
