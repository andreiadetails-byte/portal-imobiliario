'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../lib/i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';
import LocationAutocomplete from '../components/LocationAutocomplete';
import Header from '../components/Header';
import BigPromoBanner from '../components/BigPromoBanner';
import PricePerM2Lookup from '../components/PricePerM2Lookup';
import TestimonialsCarousel from '../components/TestimonialsCarousel';
import { distritos } from '../lib/locations';
import NewsletterSignup from '../components/NewsletterSignup';
import LazyMount from '../components/LazyMount';
import { getLocalFavoriteIds, toggleLocalFavorite } from '../lib/localFavorites';
import PhoneDisplay from '../components/PhoneDisplay';
import dynamic from 'next/dynamic';
import { Heart } from 'lucide-react';

const MiniMapPreview = dynamic(() => import('../components/MiniMapPreview'), { ssr: false });
import { displayAddress } from '../lib/displayAddress';

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function summarizeToSentence(text, maxLength = 160) {
  if (!text || text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
  if (lastSentenceEnd > 40) return cut.slice(0, lastSentenceEnd + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLength)}…`;
}

export default function HomePage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('');
  const [businessType, setBusinessType] = useState('Venda');
  const [news, setNews] = useState([]);
  const [user, setUser] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    function handler(e) {
      e.preventDefault();
      setInstallPrompt(e);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstallClick() {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }
  const [favoriteIds, setFavoriteIds] = useState([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser(data.user);
        const { data: favs } = await supabase.from('favorites').select('property_id').eq('user_id', data.user.id);
        setFavoriteIds((favs || []).map((f) => f.property_id));
      } else {
        setFavoriteIds(getLocalFavoriteIds());
      }
    });
  }, []);

  async function toggleFavorite(e, propertyId) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      const updated = toggleLocalFavorite(propertyId);
      setFavoriteIds(updated);
      return;
    }
    if (favoriteIds.includes(propertyId)) {
      const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('property_id', propertyId);
      if (error) { console.error('Erro ao remover favorito:', error); alert(`Não foi possível remover dos favoritos: ${error.message}`); return; }
      setFavoriteIds((cur) => cur.filter((id) => id !== propertyId));
    } else {
      const prop = properties.find((p) => p.id === propertyId);
      const { error } = await supabase.from('favorites').insert({ user_id: user.id, property_id: propertyId, price_at_save: prop?.price ?? null });
      if (error) { console.error('Erro ao guardar favorito:', error); alert(`Não foi possível guardar nos favoritos: ${error.message}`); return; }
      setFavoriteIds((cur) => [...cur, propertyId]);
    }
  }

  useEffect(() => {
    async function loadProperties() {
      const { data, error } = await supabase
        .from('properties')
        .select('id, owner_id, title, price, display_name, address, district, municipality, parish, show_full_address, typology, property_type, area, area_util, bedrooms, bathrooms, business_type, featured_status, created_at, property_photos(url, thumbnail_url, position)')
        .eq('status', 'ativo')
        .eq('featured_status', 'active')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Erro ao carregar imóveis em destaque:', error);
      }

      if (!error) {
        const all = data || [];
        // A consulta já só traz imóveis com destaque ativo. Aqui baralhamos
        // a ordem e tentamos ao máximo intercalar donos diferentes — para
        // nunca aparecerem vários imóveis do mesmo empreendimento ao mesmo
        // tempo. Mas se não houver donos suficientes para preencher os 6
        // lugares, prefere mostrar repetidos a deixar lugares vazios (é
        // perfeitamente normal um dono ter vários imóveis em destaque, só
        // não convém verem-se todos juntos na mesma vista).
        const featuredPool = shuffle(all);
        const chosen = [];
        const usedMainPhotoUrls = new Set();
        const usedOwnerIds = new Set();

        // 1ª passagem: só aceita donos ainda não escolhidos.
        for (const p of featuredPool) {
          if (chosen.length >= 3) break;
          if (p.owner_id && usedOwnerIds.has(p.owner_id)) continue;
          const mainPhoto = p.property_photos?.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.url;
          if (mainPhoto && usedMainPhotoUrls.has(mainPhoto)) continue;
          chosen.push(p);
          if (p.owner_id) usedOwnerIds.add(p.owner_id);
          if (mainPhoto) usedMainPhotoUrls.add(mainPhoto);
        }

        // 2ª passagem (só se ainda faltarem lugares): já aceita repetir
        // donos, mas continua a nunca repetir a mesma foto principal.
        if (chosen.length < 6) {
          const chosenIds = new Set(chosen.map((p) => p.id));
          for (const p of featuredPool) {
            if (chosen.length >= 3) break;
            if (chosenIds.has(p.id)) continue;
            const mainPhoto = p.property_photos?.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.url;
            if (mainPhoto && usedMainPhotoUrls.has(mainPhoto)) continue;
            chosen.push(p);
            if (mainPhoto) usedMainPhotoUrls.add(mainPhoto);
          }
        }

        const ownerIds = [...new Set(chosen.map((p) => p.owner_id).filter(Boolean))];
        let ownersById = {};
        if (ownerIds.length > 0) {
          const { data: owners } = await supabase.from('profiles_public').select('*').in('id', ownerIds);
          ownersById = Object.fromEntries((owners || []).map((o) => [o.id, o]));
        }

        setProperties(chosen.map((p) => ({ ...p, profiles: ownersById[p.owner_id] || null })));
      }
      setLoading(false);
    }

    async function loadNews() {
      const { data } = await supabase
        .from('news').select('*').eq('published', true).order('created_at', { ascending: false }).limit(3);
      setNews(data || []);
    }

    loadProperties();
    loadNews();
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    window.location.href = `/results?location=${encodeURIComponent(location)}&business=${businessType}`;
  }

  return (
    <>
      <Header minimal />

      <main id="main-content">
</main>

      <footer style={{ borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
        <div className="wrap" style={{ padding: '48px 32px 32px' }}>
          <div className="newsletter-box" style={{
            display: 'grid', gridTemplateColumns: '260px 1fr', gap: 0, borderRadius: 16, overflow: 'hidden',
            marginBottom: 40, background: 'var(--plaster)', border: '1px solid rgba(126,143,106,0.2)',
          }}>
            <div style={{
              backgroundImage: 'url(/mood/nicho-arco-ceramica.jpg)', backgroundSize: 'cover', backgroundPosition: 'center',
              minHeight: 220,
            }} />
            <div style={{ padding: '32px 36px', textAlign: 'left' }}>
              <h3 className="display" style={{ fontSize: 19, marginBottom: 6 }}>{t('newsletter_title')}</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-soft)', marginBottom: 16, maxWidth: 480 }}>
                {t('newsletter_subtitle')}
              </p>
              <div style={{ maxWidth: 420 }}>
                <NewsletterSignup />
              </div>
            </div>
          </div>
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 32, marginBottom: 32 }}>
            <div>
              <h5 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-soft)', marginBottom: 14 }}>
                {t('footer_search')}
              </h5>
              <Link href="/results" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_buy')}</Link>
              <Link href="/results" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_rent')}</Link>
            </div>
            <div>
              <h5 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-soft)', marginBottom: 14 }}>
                {t('footer_have_property')}
              </h5>
              <Link href="/publish" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_publish')}</Link>
              <Link href="/dashboard" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_dashboard')}</Link>
              <Link href="/simulador-credito" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_sim_credit')}</Link>
              <Link href="/simulador-imt" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_sim_imt')}</Link>
              <Link href="/simulador-investimento" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_sim_investment')}</Link>
            </div>
            <div>
              <h5 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-soft)', marginBottom: 14 }}>
                {t('footer_account')}
              </h5>
              <Link href="/login" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_login')}</Link>
              <Link href="/favorites" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('nav_favorites')}</Link>
              <Link href="/chat" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('nav_chat')}</Link>
            </div>
            <div>
              <h5 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-soft)', marginBottom: 14 }}>
                More·ada
              </h5>
              <Link href="/sobre" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_about_us')}</Link>
              <Link href="/trabalha-connosco" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_careers')}</Link>
              <span style={{ display: 'block', fontSize: 13.5, padding: '5px 0', color: 'var(--text-soft)' }}>{t('footer_about_text')}</span>
            </div>
            <div>
              <h5 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-soft)', marginBottom: 14 }}>
                {t('footer_help_heading')}
              </h5>
              <Link href="/faq" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_faq')}</Link>
              <Link href="/seguranca" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_security')}</Link>
              <Link href="/contacto" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_contact')}</Link>
              <Link href="/privacidade" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_privacy')}</Link>
              <Link href="/cookies" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_cookies_policy')}</Link>
              <Link href="/termos" style={{ display: 'block', fontSize: 13.5, padding: '5px 0' }}>{t('footer_terms')}</Link>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20, fontSize: 13, color: 'var(--text-soft)' }}>
            © 2026 More·ada — {t('footer_tagline')}
            <br />
            <a
              href="https://www.livroreclamacoes.pt/Inicio/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--text-soft)', textDecoration: 'underline' }}
            >
              Livro de Reclamações
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
