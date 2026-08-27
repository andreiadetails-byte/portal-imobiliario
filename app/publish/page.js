'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../lib/i18n';
import Header from '../../components/Header';
import BackButton from '../../components/BackButton';
import { geocodeAddress } from '../../lib/geocode';
import { PAYMENT_INFO } from '../../lib/paymentInfo';
import { isProfessionalAccount } from '../../lib/accountTypes';
import { distritos, concelhosPorDistrito, freguesiasPorConcelho } from '../../lib/locations';
import { containsOffensiveLanguage, containsLink } from '../../lib/contentModeration';

const CARACTERISTICAS = [
  'Elevador', 'Cozinha equipada', 'Aquecimento central', 'Ar condicionado', 'Terraço',
  'Mobilado', 'Painéis solares', 'Vista de mar', 'Vista de rio', 'Portaria / segurança', 'Lareira',
];

const TIPOS_IMOVEL = ['Apartamento', 'Moradia', 'Terreno', 'Espaço comercial', 'Armazém', 'Escritório', 'Quarto'];
const SUBTIPOS_MORADIA = ['Moradia bifamiliar', 'Moradia geminada', 'Moradia em banda', 'Moradia independente'];
const ORIENTACOES = ['Norte', 'Sul', 'Nascente', 'Poente', 'Nordeste', 'Noroeste', 'Sudeste', 'Sudoeste'];
const PISOS = ['R/C', '1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º', '9º', '10º', 'Superior ao 10º'];

function YesNoField({ label, value, onChange }) {
  const { t } = useLanguage();
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        {[{ v: true, l: t('yesno_yes') }, { v: false, l: t('yesno_no') }].map((opt) => (
          <button
            key={String(opt.v)}
            type="button"
            onClick={() => onChange(opt.v)}
            style={{
              flex: 1, padding: '9px 0', fontSize: 13.5, fontWeight: 600, borderRadius: 5, cursor: 'pointer',
              border: value === opt.v ? '1.5px solid var(--telha)' : '1px solid var(--line)',
              background: value === opt.v ? 'rgba(126,143,106,0.12)' : 'var(--paper)',
              color: value === opt.v ? 'var(--telha)' : 'var(--text-soft)',
            }}
          >
            {opt.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function PublishForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditMode = !!editId;
  const [user, setUser] = useState(null);
  const [loadingEdit, setLoadingEdit] = useState(isEditMode);
  const [existingPhotoCount, setExistingPhotoCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [accountLimit, setAccountLimit] = useState(50);
  const [isAdmin, setIsAdmin] = useState(false);
  const [originalPrice, setOriginalPrice] = useState(null);
  const [features, setFeatures] = useState(['Elevador', 'Garagem']);
  const [solarOrientations, setSolarOrientations] = useState([]);
  const [addressType, setAddressType] = useState('Rua');
  const [addressRest, setAddressRest] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [municipalityManual, setMunicipalityManual] = useState(false);
  const [parishManual, setParishManual] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState(false);
  const [photos, setPhotos] = useState([]); // { file, preview }
  const [planFile, setPlanFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoError, setVideoError] = useState('');
  const [documentFile, setDocumentFile] = useState(null);

  const [form, setForm] = useState({
    title: '', internal_reference: '', description: '', property_type: 'Apartamento', typology: 'T3',
    business_type: 'Venda', price: '', condo_fee: '', area: '', bedrooms: 3, bathrooms: 2,
    state: '', energy_certificate: '', construction_year: '', address: '', district: '', municipality: '', parish: '',
    floor: '', area_util: '', house_subtype: '', is_top_floor: false,
    has_storage: null, has_parking: null, has_balcony: null,
    has_garden: null, has_pool: null, has_gym: null, has_coworking: null,
    is_furnished: null, pets_allowed: null, near_transit: null,
    show_full_address: null, display_name: '',
  });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUser(data.user);

      const { data: myProfile } = await supabase.from('profiles').select('account_type, subscription_status, subscription_paid_until, is_admin').eq('id', data.user.id).single();
      setIsAdmin(!!myProfile?.is_admin);
      if (PAYMENT_INFO.subscriptionEnforced && isProfessionalAccount(myProfile?.account_type) && !myProfile?.is_admin) {
        const isActive = myProfile.subscription_status === 'active'
          && myProfile.subscription_paid_until
          && new Date(myProfile.subscription_paid_until) >= new Date();
        if (!isActive) { router.push('/assinatura'); return; }
      }

      if (!editId && !myProfile?.is_admin) {
        const accountTypeLimit = isProfessionalAccount(myProfile?.account_type) ? 50 : 3;
        setAccountLimit(accountTypeLimit);
        const { count } = await supabase
          .from('properties').select('id', { count: 'exact', head: true }).eq('owner_id', data.user.id).neq('status', 'eliminado');
        if ((count || 0) >= accountTypeLimit) {
          setLimitReached(true);
          return;
        }
      }

      if (editId) {
        const { data: prop } = await supabase.from('properties').select('*').eq('id', editId).single();
        if (!prop || prop.owner_id !== data.user.id) {
          router.push('/dashboard');
          return;
        }

        // Tenta separar "Rua das Amoreiras" em tipo de via + resto
        const tiposVia = ['Rua', 'Avenida', 'Travessa', 'Urb.', 'Praça', 'Largo', 'Alameda'];
        const partes = (prop.address || '').split(' ');
        const tipoEncontrado = tiposVia.find((t) => partes[0] === t);
        if (tipoEncontrado) {
          setAddressType(tipoEncontrado);
          setAddressRest(partes.slice(1).join(' '));
        } else {
          setAddressRest(prop.address || '');
        }

        setOriginalPrice(prop.price);

        setForm({
          title: prop.title || '', internal_reference: prop.internal_reference || '', display_name: prop.display_name || '', description: prop.description || '', property_type: prop.property_type || 'Apartamento',
          typology: prop.typology || 'T3', business_type: prop.business_type || 'Venda',
          price: prop.price ?? '', condo_fee: prop.condo_fee ?? '', area: prop.area ?? '',
          bedrooms: prop.bedrooms ?? 3, bathrooms: prop.bathrooms ?? 2, state: prop.state || '',
          energy_certificate: prop.energy_certificate || '', construction_year: prop.construction_year || '', address: prop.address || '',
          district: prop.district || '', municipality: prop.municipality || '', parish: prop.parish || '',
          floor: prop.floor || '', area_util: prop.area_util ?? '', house_subtype: prop.house_subtype || '',
          is_top_floor: !!prop.is_top_floor,
          has_storage: prop.has_storage, has_parking: prop.has_parking, has_balcony: prop.has_balcony,
          is_furnished: prop.is_furnished, pets_allowed: prop.pets_allowed, near_transit: prop.near_transit,
          has_garden: prop.has_garden, has_pool: prop.has_pool, has_gym: prop.has_gym, has_coworking: prop.has_coworking,
          show_full_address: prop.show_full_address,
        });
        setFeatures(prop.features || []);
        setSolarOrientations(prop.solar_orientations || []);

        if (prop.municipality && !(concelhosPorDistrito[prop.district] || []).includes(prop.municipality)) {
          setMunicipalityManual(true);
        }
        if (prop.parish && !(freguesiasPorConcelho[prop.municipality] || []).includes(prop.parish)) {
          setParishManual(true);
        }

        const { count } = await supabase.from('property_photos').select('id', { count: 'exact', head: true }).eq('property_id', editId);
        setExistingPhotoCount(count || 0);

        setLoadingEdit(false);
      }
    });
  }, [router, editId]);

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function calcQuality() {
    let score = 0;
    // Fotos — até 30 pontos (12 fotos = pontuação máxima desta parte)
    score += Math.min(photos.length / 12, 1) * 30;
    // Descrição — até 20 pontos (150 caracteres = máximo)
    score += Math.min((form.description || '').length / 150, 1) * 20;
    // Características extra selecionadas — até 15 pontos (6 = máximo)
    score += Math.min(features.length / 6, 1) * 15;
    // Planta anexada — 10 pontos
    if (planFile) score += 10;
    // Orientação solar preenchida — 10 pontos
    if (solarOrientations.length > 0) score += 10;
    // Título personalizado — 5 pontos
    if (form.title) score += 5;
    // Condomínio preenchido — 10 pontos
    if (form.condo_fee) score += 10;
    return Math.round(Math.min(score, 100));
  }

  const quality = calcQuality();
  const qualityLabel = quality >= 75 ? 'Muito bom' : quality >= 50 ? 'Bom' : quality >= 25 ? 'Fraco' : 'Muito fraco';
  const qualityColor = quality >= 75 ? 'var(--telha)' : quality >= 50 ? 'var(--azulejo)' : quality >= 25 ? 'var(--brass)' : '#8a3b2a';

  function toggleFeature(f) {
    setFeatures((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  }

  // Redimensiona e comprime a foto no browser da pessoa, antes de ser enviada —
  // fotos de câmara/telemóvel costumam vir com 5-15MB, o que torna o site lento
  // a carregar. Isto reduz para um tamanho bom para a web, sem perder nitidez visível.
  function compressImage(file) {
    return new Promise((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX_DIMENSION = 1920;
        let { naturalWidth: width, naturalHeight: height } = img;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        // O WebP costuma ficar 25-35% mais leve do que o JPEG com a mesma
        // qualidade visual — poupa espaço e torna o site mais rápido. Todos
        // os browsers atuais (2024 em diante) já sabem criar imagens WebP;
        // no caso raro de algum não conseguir, usamos JPEG como reserva.
        canvas.toBlob(
          (webpBlob) => {
            const gotRealWebp = webpBlob && webpBlob.type === 'image/webp';
            if (gotRealWebp && webpBlob.size < file.size) {
              URL.revokeObjectURL(url);
              const newName = file.name.replace(/\.[^.]+$/, '') + '.webp';
              resolve(new File([webpBlob], newName, { type: 'image/webp' }));
              return;
            }
            // Reserva: tenta JPEG, tal como acontecia antes.
            canvas.toBlob(
              (jpegBlob) => {
                URL.revokeObjectURL(url);
                if (!jpegBlob || jpegBlob.size >= file.size) {
                  resolve(file);
                } else {
                  resolve(new File([jpegBlob], file.name, { type: 'image/jpeg' }));
                }
              },
              'image/jpeg',
              0.85
            );
          },
          'image/webp',
          0.82
        );
      };
      img.onerror = () => resolve(file);
      img.src = url;
    });
  }

  async function handlePhotoSelect(e) {
    const files = Array.from(e.target.files || []);
    for (const originalFile of files) {
      const checkImg = new window.Image();
      const checkUrl = URL.createObjectURL(originalFile);
      const dimensions = await new Promise((resolve) => {
        checkImg.onload = () => resolve({ width: checkImg.naturalWidth, height: checkImg.naturalHeight });
        checkImg.onerror = () => resolve(null);
        checkImg.src = checkUrl;
      });
      URL.revokeObjectURL(checkUrl);

      if (dimensions && (dimensions.width < 800 || dimensions.height < 600)) {
        setError(`A foto "${originalFile.name}" tem resolução baixa (${dimensions.width}×${dimensions.height}px) e pode ficar desfocada no anúncio. Recomendamos pelo menos 800×600px.`);
      }

      const compressedFile = await compressImage(originalFile);
      const preview = URL.createObjectURL(compressedFile);
      setPhotos((cur) => [...cur, { file: compressedFile, preview }].slice(0, 25));
    }
    e.target.value = '';
  }

  function removePhoto(index) {
    setPhotos((cur) => cur.filter((_, i) => i !== index));
  }

  function handlePlanSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('A planta tem de ser uma imagem (JPG, PNG, WEBP) ou um PDF.');
      e.target.value = '';
      return;
    }
    setPlanFile(file);
  }

  function handleVideoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      alert('O ficheiro escolhido não é um vídeo.');
      e.target.value = '';
      return;
    }
    const MAX_VIDEO_MB = 100;
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setVideoError(`O vídeo é demasiado grande (máximo ${MAX_VIDEO_MB}MB). Tente gravar um vídeo mais curto, ou reduza a qualidade nas definições da câmara do telemóvel.`);
      e.target.value = '';
      return;
    }
    setVideoError('');
    setVideoFile(file);
  }

  async function uploadVideo(propertyId) {
    if (!videoFile) return null;
    const { data: { session } } = await supabase.auth.getSession();
    const body = new FormData();
    body.append('file', videoFile);
    body.append('propertyId', propertyId);
    body.append('type', 'video');

    const res = await fetch('/api/upload-photo-r2', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
      body,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.error('Falha ao enviar vídeo para o R2:', errBody);
      return null;
    }
    const { url } = await res.json();
    return url;
  }

  async function uploadPlan(propertyId) {
    if (!planFile) return null;
    const { data: { session } } = await supabase.auth.getSession();
    const body = new FormData();
    body.append('file', planFile);
    body.append('propertyId', propertyId);
    body.append('type', 'plan');

    const res = await fetch('/api/upload-photo-r2', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
      body,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.error('Falha ao enviar planta para o R2:', errBody);
      return null;
    }
    const { url } = await res.json();
    return url;
  }

  async function uploadDocument(propertyId) {
    if (!documentFile) return null;
    const ext = documentFile.name.split('.').pop();
    const path = `${user.id}/${propertyId}/documento.${ext}`;
    const { error: uploadError } = await supabase.storage.from('property-documents').upload(path, documentFile, { upsert: true });
    if (uploadError) return null;
    // Guarda só o caminho — nunca um link público, porque este espaço é
    // privado (o documento pode ter dados sensíveis). O link só é gerado
    // na hora, e só para quem tem autorização, através de uma rota própria.
    return path;
  }

  // Gera uma versão pequena da foto (só para as grelhas de resultados,
  // onde a imagem aparece em tamanho reduzido) — poupa muito tráfego,
  // porque a pessoa só descarrega a foto grande de verdade quando entra
  // na ficha do imóvel.
  function makeThumbnail(file) {
    return new Promise((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX_DIMENSION = 480;
        let { naturalWidth: width, naturalHeight: height } = img;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) { resolve(null); return; }
            resolve(new File([blob], 'thumb.webp', { type: 'image/webp' }));
          },
          'image/webp',
          0.75
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  async function uploadPhotos(propertyId, startPosition = 0) {
    const uploadedUrls = [];
    const { data: { session } } = await supabase.auth.getSession();

    async function uploadOne(file, type) {
      const body = new FormData();
      body.append('file', file);
      body.append('propertyId', propertyId);
      body.append('type', type);

      let res;
      try {
        res = await fetch('/api/upload-photo-r2', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body,
        });
      } catch (networkErr) {
        console.error(`Erro de rede ao enviar ${type}:`, networkErr);
        return null;
      }
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error(`Falha ao enviar ${type} para o R2:`, res.status, errBody);
        return null;
      }
      const { url } = await res.json();
      return url;
    }

    for (let i = 0; i < photos.length; i++) {
      const { file } = photos[i];

      const url = await uploadOne(file, 'photo');
      if (!url) {
        alert('Não foi possível enviar uma das fotos. As outras continuam a ser enviadas.');
        continue; // se uma foto falhar, continua com as outras
      }
      uploadedUrls.push(url);

      // A miniatura é só um "extra" — se por algum motivo falhar, a foto
      // grande já foi enviada com sucesso, e o site usa-a como reserva.
      let thumbnailUrl = null;
      try {
        const thumbFile = await makeThumbnail(file);
        if (thumbFile) {
          thumbnailUrl = await uploadOne(thumbFile, 'thumbnail');
          if (!thumbnailUrl) {
            console.error('Miniatura não foi enviada — uploadOne devolveu vazio.');
            alert('Aviso: não foi possível criar a miniatura desta foto (a foto grande foi enviada bem na mesma).');
          }
        } else {
          console.error('makeThumbnail devolveu null — o navegador não conseguiu gerar a miniatura.');
          alert('Aviso: o navegador não conseguiu gerar a miniatura desta foto (a foto grande foi enviada bem na mesma).');
        }
      } catch (thumbErr) {
        console.error('Erro ao gerar/enviar miniatura:', thumbErr);
        alert(`Aviso: erro ao criar a miniatura (${thumbErr.message}). A foto grande foi enviada bem na mesma.`);
      }

      await supabase.from('property_photos').insert({
        property_id: propertyId,
        url,
        thumbnail_url: thumbnailUrl,
        position: startPosition + i,
      });
    }
    return uploadedUrls;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!isEditMode && !isAdmin) {
      const { count: existingCount } = await supabase
        .from('properties').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).neq('status', 'eliminado');
      if ((existingCount || 0) >= accountLimit) {
        setError(`Já tem ${accountLimit} anúncios publicados, que é o limite da sua conta. Apague um anúncio antigo no seu painel para poder publicar um novo.`);
        return;
      }
    }

    if (!form.district || !form.municipality || !form.parish) {
      setError('Por favor, escolha o distrito, o concelho e a localidade.');
      return;
    }
    if (!form.floor) {
      setError('Por favor, indique o piso.');
      return;
    }
    if (!form.area_util) {
      setError('Por favor, indique a área útil.');
      return;
    }
    if (!form.energy_certificate) {
      setError('Por favor, escolha o certificado energético do imóvel.');
      return;
    }
    if (form.description.trim().length < 50) {
      setError(`A descrição precisa de pelo menos 50 caracteres (tem ${form.description.trim().length}).`);
      return;
    }
    if (containsLink(form.title, form.description)) {
      setError('O título e a descrição não podem conter links (WhatsApp, sites, redes sociais, etc.) — use o chat do site para falar com interessados.');
      return;
    }
    if (form.property_type === 'Moradia' && !form.house_subtype) {
      setError('Por favor, escolha o subtipo de moradia.');
      return;
    }
    const boolFields = ['has_storage', 'has_parking', 'has_balcony', 'has_garden', 'has_pool', 'has_gym', 'has_coworking', 'near_transit'];
    if (form.business_type === 'Arrendamento') {
      boolFields.push('is_furnished', 'pets_allowed'); // só aparecem no formulário para arrendamento
    }
    if (boolFields.some((f) => form[f] === null)) {
      setError('Por favor, responda a todas as perguntas de Sim/Não (arrumos, estacionamento, varanda, jardim, piscina, ginásio, sala coworking).');
      return;
    }
    if (form.show_full_address === null) {
      setError('Por favor, escolha se a morada completa fica visível no anúncio.');
      return;
    }

    if (!isEditMode) {
      if (photos.length < 6) {
        setError(`Por favor, adicione pelo menos 6 fotografias (tem ${photos.length}).`);
        return;
      }
    }

    setSaving(true);

    const fullAddress = [form.address, form.parish, form.municipality, form.district].filter(Boolean).join(', ');
    const { latitude, longitude } = await geocodeAddress(fullAddress);

    // Remove asteriscos (**negrito** de markdown que às vezes vem colado de outro sítio),
    // para o texto nunca aparecer com símbolos estranhos no anúncio.
    const stripAsterisks = (text) => (text || '').replace(/\*+/g, '');

    const propertyFields = {
      title: stripAsterisks(form.title) || `${form.typology || form.property_type} · ${form.address}`,
      internal_reference: form.internal_reference || null,
      display_name: form.display_name || null,
      description: stripAsterisks(form.description),
      property_type: form.property_type,
      typology: form.typology,
      business_type: form.business_type,
      price: Number(form.price),
      condo_fee: form.condo_fee ? Number(form.condo_fee) : null,
      area: form.area ? Number(form.area) : null,
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      state: form.state,
      energy_certificate: form.energy_certificate,
      construction_year: form.construction_year ? Number(form.construction_year) : null,
      address: form.address,
      district: form.district,
      municipality: form.municipality || null,
      parish: form.parish || null,
      latitude,
      longitude,
      floor: form.floor,
      is_top_floor: form.is_top_floor,
      area_util: Number(form.area_util),
      solar_orientations: solarOrientations.length > 0 ? solarOrientations : null,
      house_subtype: form.property_type === 'Moradia' ? form.house_subtype : null,
      has_storage: form.has_storage,
      has_parking: form.has_parking,
      has_balcony: form.has_balcony,
      has_garden: form.has_garden,
      has_pool: form.has_pool,
      has_gym: form.has_gym,
      has_coworking: form.has_coworking,
      is_furnished: form.is_furnished,
      pets_allowed: form.pets_allowed,
      near_transit: form.near_transit,
      show_full_address: form.show_full_address,
      features,
    };

    let propertyId = editId;
    let error;

    // Verifica linguagem ofensiva no título e descrição, para decidir mais
    // tarde se o anúncio pode ser aprovado automaticamente. Um anúncio novo
    // NUNCA fica "ativo" já neste momento — fica sempre "em_revisao" até as
    // fotos terminarem de ser enviadas em segundo plano (só depois é que
    // fica mesmo visível), para nunca aparecer sem fotos por breves segundos.
    const hasOffensiveText = containsOffensiveLanguage(propertyFields.title, propertyFields.description);

    if (isEditMode) {
      if (originalPrice && Number(form.price) < Number(originalPrice)) {
        propertyFields.previous_price = originalPrice;
        propertyFields.price_reduced_at = new Date().toISOString();
      }
      if (hasOffensiveText) {
        propertyFields.status = 'em_revisao';
      }
      const { error: updateError } = await supabase.from('properties').update(propertyFields).eq('id', editId);
      error = updateError;
    } else {
      const { data, error: insertError } = await supabase.from('properties')
        .insert({ ...propertyFields, owner_id: user.id, status: 'em_revisao' }).select().single();
      error = insertError;
      propertyId = data?.id;
    }

    if (error) { setError(error.message); setSaving(false); return; }

    // Traduz o título e descrição em segundo plano — não faz o utilizador esperar.
    if (propertyId) {
      supabase.auth.getSession().then(({ data: sessionData }) => {
        fetch('/api/translate-property', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionData?.session?.access_token}`,
          },
          body: JSON.stringify({ propertyId }),
        }).catch(() => {});
      });
    }

    setSaving(false);
    setPublished(true);
    setTimeout(() => router.push('/dashboard'), 2500);

    // A planta e as fotos continuam a ser enviadas em segundo plano,
    // sem o utilizador ter de esperar a fazer scroll parado no ecrã.
    (async () => {
      const planUrl = await uploadPlan(propertyId);
      if (planUrl) {
        await supabase.from('properties').update({ floor_plan_url: planUrl }).eq('id', propertyId);
      }
      const documentUrl = await uploadDocument(propertyId);
      if (documentUrl) {
        await supabase.from('properties').update({
          document_url: documentUrl, document_submitted_at: new Date().toISOString(), document_verified: false,
        }).eq('id', propertyId);
      }
      const videoUrl = await uploadVideo(propertyId);
      if (videoUrl) {
        await supabase.from('properties').update({ video_url: videoUrl }).eq('id', propertyId);
      }
      let uploadedPhotoUrls = [];
      if (photos.length > 0) {
        uploadedPhotoUrls = await uploadPhotos(propertyId, existingPhotoCount);
      }

      // Verifica as fotos (e a planta, se for uma imagem) só depois de estarem
      // enviadas. Vídeo não é verificado automaticamente (análise de vídeo não
      // é fiável o suficiente neste momento) — fica sempre para revisão manual.
      const imagesToCheck = [...uploadedPhotoUrls];
      if (planUrl && /\.(jpg|jpeg|png|webp)$/i.test(planUrl)) imagesToCheck.push(planUrl);

      let imagesFlagged = false;
      let flagReason = '';

      if (imagesToCheck.length > 0) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const modRes = await fetch('/api/moderate-content', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionData?.session?.access_token}`,
            },
            body: JSON.stringify({ imageUrls: imagesToCheck }),
          });
          const modData = await modRes.json();
          if (modData.flagged) {
            imagesFlagged = true;
            flagReason = modData.reason || 'Conteúdo assinalado para revisão.';
          }
        } catch {
          // Se a verificação falhar, marca para revisão manual em vez de
          // aprovar às cegas — mais seguro do que assumir que está tudo bem.
          imagesFlagged = true;
          flagReason = 'Não foi possível verificar as fotos automaticamente.';
        }
      }

      // Só decide aprovar automaticamente para anúncios NOVOS (não edições) —
      // e só agora, com as fotos já todas prontas, para nunca aparecer "ativo"
      // com um espaço em branco onde deviam estar as fotos.
      if (!isEditMode) {
        if (!hasOffensiveText && !imagesFlagged) {
          await supabase.from('properties').update({ status: 'ativo' }).eq('id', propertyId);
        } else if (imagesFlagged) {
          await supabase.from('properties').update({ status: 'em_revisao', moderation_flag_reason: flagReason }).eq('id', propertyId);
        }
      }
    })();
  }

  if (!user || loadingEdit) return (<><Header /><div className="wrap" style={{ padding: 60 }}>{t('pub_checking_session')}</div></>);

  if (limitReached) {
    return (
      <>
        <Header />
        <div className="wrap" style={{ maxWidth: 480, padding: '80px 32px', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: '#b8452f', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 20px',
          }}>
            !
          </div>
          <h1 className="display" style={{ fontSize: 24, marginBottom: 10 }}>{t('pub_limit_reached').replace('{n}', accountLimit)}</h1>
          <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 24 }}>
            Já tem {accountLimit} anúncios publicados na sua conta, que é o máximo permitido. Para publicar um novo, apague primeiro um anúncio antigo no seu painel.
          </p>
          <Link href="/dashboard" className="btn btn-primary">{t('pub_go_to_dashboard')}</Link>
        </div>
      </>
    );
  }

  if (published) {
    return (
      <>
        <Header />
        <div className="wrap" style={{ maxWidth: 480, padding: '80px 32px', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: 'var(--azulejo)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 20px',
          }}>
            ✓
          </div>
          <h1 className="display" style={{ fontSize: 24, marginBottom: 10 }}>
            {isEditMode ? 'Anúncio atualizado!' : 'Anúncio publicado!'}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 24 }}>
            {isEditMode
              ? 'As alterações foram guardadas. Vamos levá-lo para o painel...'
              : (<>{t('pub_under_review_msg')}</>)}
          </p>
          <Link href="/dashboard" className="btn btn-primary">{t('pub_view_dashboard_now')}</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
    <main id="main-content" className="wrap" style={{ maxWidth: 720, padding: '48px 32px' }}>
      <BackButton fallback="/dashboard" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 28 }}>{isEditMode ? 'Editar anúncio' : t('publish_title')}</h1>
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 20, position: 'sticky', top: 76, zIndex: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{t('pub_listing_quality')}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: qualityColor }}>{quality}% · {qualityLabel}</span>
        </div>
        <div style={{ height: 6, background: 'var(--plaster)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${quality}%`, background: qualityColor, transition: 'width 0.3s ease' }} />
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 8 }}>
          {quality < 100
            ? 'Anúncios mais completos (mais fotos, descrição detalhada, características) recebem mais contactos.'
            : 'O seu anúncio está completo — ótimo trabalho!'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: 32, overflow: 'visible' }}>
        <div className="field">
          <label>{t('pub_title_optional')}</label>
          <input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="ex: T3 remodelado em Campo de Ourique" />
        </div>

        <div className="field">
          <label>{t('pub_internal_ref')} <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{t('pub_internal_ref_hint')}</span></label>
          <input value={form.internal_reference} onChange={(e) => updateField('internal_reference', e.target.value)} placeholder="ex: AGD-2026-014" />
        </div>

        {isAdmin && (
          <div className="field">
            <label>{t('pub_display_name')} <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{t('pub_display_name_hint')}</span></label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={form.display_name}
                onChange={(e) => updateField('display_name', e.target.value)}
                placeholder="ex: Rita Ferreira"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => {
                  const nomes = ['Beatriz', 'Inês', 'Mariana', 'Catarina', 'Carolina', 'Sofia', 'Joana', 'Rita', 'Leonor', 'Matilde', 'André', 'Tiago', 'Diogo', 'Miguel', 'Rui', 'Pedro', 'João', 'Bruno', 'Hugo', 'Ricardo'];
                  const apelidos = ['Ferreira', 'Costa', 'Santos', 'Silva', 'Pereira', 'Oliveira', 'Rodrigues', 'Martins', 'Sousa', 'Fernandes', 'Gomes', 'Lopes', 'Marques', 'Alves', 'Ribeiro'];
                  const nome = `${nomes[Math.floor(Math.random() * nomes.length)]} ${apelidos[Math.floor(Math.random() * apelidos.length)]}`;
                  updateField('display_name', nome);
                }}
                className="btn"
                style={{ fontSize: 13, flexShrink: 0 }}
              >
                🎲 Aleatório
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label>{t('pub_property_type')}</label>
            <select
              value={form.property_type}
              onChange={(e) => {
                updateField('property_type', e.target.value);
                if (e.target.value === 'Quarto') {
                  updateField('business_type', 'Arrendamento');
                  updateField('typology', null);
                  updateField('bedrooms', 1); // um quarto é sempre "1", não precisa de escolher
                } else if (!['Apartamento', 'Moradia'].includes(e.target.value)) {
                  updateField('typology', null);
                  updateField('bedrooms', 0);
                }
              }}
            >
              {TIPOS_IMOVEL.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          {['Apartamento', 'Moradia'].includes(form.property_type) && (
            <div className="field">
              <label>{t('pub_typology')}</label>
              <select
                value={form.typology || 'T0'}
                onChange={(e) => {
                  const novaTipologia = e.target.value;
                  updateField('typology', novaTipologia);
                  const sugerido = { T0: 0, T1: 1, T2: 2, T3: 3, T4: 4, 'T5+': 5 }[novaTipologia];
                  if (sugerido !== undefined) updateField('bedrooms', sugerido);
                }}
              >
                {['T0', 'T1', 'T2', 'T3', 'T4', 'T5+'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>

        {['Apartamento', 'Moradia'].includes(form.property_type) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label>{t('pub_bedrooms')}</label>
            <input type="number" min={0} required value={form.bedrooms} onChange={(e) => updateField('bedrooms', e.target.value)} />
          </div>
          <div className="field">
            <label>{t('pub_bathrooms')}</label>
            <input type="number" min={0} required value={form.bathrooms} onChange={(e) => updateField('bathrooms', e.target.value)} />
          </div>
        </div>
        )}
        {form.property_type === 'Quarto' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label>{t('pub_bathrooms')} <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{t('pub_bathrooms_shared_hint')}</span></label>
            <input type="number" min={0} required value={form.bathrooms} onChange={(e) => updateField('bathrooms', e.target.value)} />
          </div>
        </div>
        )}

        {form.property_type === 'Moradia' && (
          <div className="field">
            <label>{t('pub_house_subtype')}</label>
            <select value={form.house_subtype} onChange={(e) => updateField('house_subtype', e.target.value)}>
              <option value="">{t('pub_choose_option')}</option>
              {SUBTIPOS_MORADIA.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label>Piso</label>
            <select required value={form.floor} onChange={(e) => updateField('floor', e.target.value)}>
              <option value="">{t('pub_choose_option')}</option>
              {PISOS.map((p) => <option key={p}>{p}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontWeight: 400, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_top_floor} onChange={(e) => updateField('is_top_floor', e.target.checked)} />
              É o último piso do prédio
            </label>
          </div>
          <div className="field">
            <label>Área bruta (m²) <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>(opcional)</span></label>
            <input type="number" value={form.area} onChange={(e) => updateField('area', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label>Área útil (m²) <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: '#8a3b2a' }}>(obrigatório)</span></label>
            <input type="number" required value={form.area_util} onChange={(e) => updateField('area_util', e.target.value)} />
          </div>
          <div className="field">
            <label>{t('pub_state')} <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: '#8a3b2a' }}>{t('pub_required')}</span></label>
            <select required value={form.state} onChange={(e) => updateField('state', e.target.value)}>
              <option value="">{t('pub_choose_option')}</option>
              <option value="Novo">Novo</option>
              <option value="Em construção">{t('pub_state_construction')}</option>
              <option value="Para recuperar">{t('pub_state_torenovate')}</option>
              <option value="Usado">{t('pub_state_used')}</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>{t('pub_solar_orientation')} <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{t('pub_solar_hint')}</span></label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ORIENTACOES.map((o) => (
              <span
                key={o}
                onClick={() => setSolarOrientations((cur) => (cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]))}
                style={{
                  fontSize: 13, fontWeight: 500, padding: '8px 16px', borderRadius: 20, cursor: 'pointer',
                  border: '1px solid var(--line)',
                  background: solarOrientations.includes(o) ? 'var(--azulejo)' : 'var(--paper)',
                  color: solarOrientations.includes(o) ? '#fff' : 'var(--text-soft)',
                }}
              >
                {o}
              </span>
            ))}
          </div>
        </div>

        <div className="field">
          <label>{t('pub_energy_cert')} <span style={{ color: '#b8452f', fontWeight: 700 }}>{t('pub_required')}</span></label>
          <select required value={form.energy_certificate} onChange={(e) => updateField('energy_certificate', e.target.value)}>
            <option value="">{t('pub_choose_option')}</option>
            {['A+', 'A', 'B', 'B-', 'C', 'D', 'E', 'F', 'Isento'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="field">
          <label>{t('pub_construction_year')} <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{t('pub_optional')}</span></label>
          <input
            type="number"
            min={1900}
            max={new Date().getFullYear() + 2}
            value={form.construction_year}
            onChange={(e) => updateField('construction_year', e.target.value)}
            placeholder="ex: 2005"
          />
        </div>

        <div className="field">
          <label>{t('pub_address')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={addressType}
              onChange={(e) => { setAddressType(e.target.value); updateField('address', `${e.target.value} ${addressRest}`.trim()); }}
              style={{ flex: '0 0 140px' }}
            >
              {['Rua', 'Avenida', 'Travessa', 'Urb.', 'Praça', 'Largo', 'Alameda'].map((t) => <option key={t}>{t}</option>)}
            </select>
            <input
              required
              value={addressRest}
              onChange={(e) => {
                const v = e.target.value;
                const capitalized = v.charAt(0).toUpperCase() + v.slice(1);
                setAddressRest(capitalized);
                updateField('address', `${addressType} ${capitalized}`.trim());
              }}
              placeholder="das Amoreiras, 12, Lisboa"
              style={{ flex: 1 }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div className="field">
            <label>{t('pub_district')}</label>
            <select
              value={form.district}
              onChange={(e) => {
                updateField('district', e.target.value);
                updateField('municipality', '');
                updateField('parish', '');
              }}
            >
              <option value="">{t('pub_choose')}</option>
              {distritos.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="field">
            <label>{t('pub_municipality')}</label>
            {municipalityManual ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  autoFocus
                  value={form.municipality}
                  onChange={(e) => updateField('municipality', e.target.value)}
                  placeholder={t('attr_write_here')}
                />
                <button
                  type="button"
                  onClick={() => { setMunicipalityManual(false); updateField('municipality', ''); }}
                  className="btn"
                  style={{ fontSize: 12, padding: '0 10px', flexShrink: 0 }}
                >
                  Lista
                </button>
              </div>
            ) : (
              <select
                value={form.municipality}
                onChange={(e) => {
                  if (e.target.value === '__outro__') {
                    setMunicipalityManual(true);
                    updateField('municipality', '');
                    return;
                  }
                  updateField('municipality', e.target.value);
                  updateField('parish', '');
                }}
                disabled={!form.district}
              >
                <option value="">{t('pub_choose')}</option>
                {(concelhosPorDistrito[form.district] || []).map((c) => <option key={c}>{c}</option>)}
                <option value="__outro__">✎ Não encontras o teu? Escreve aqui</option>
              </select>
            )}
          </div>
          <div className="field">
            <label>{t('pub_parish')}</label>
            {parishManual ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  autoFocus
                  required
                  value={form.parish}
                  onChange={(e) => updateField('parish', e.target.value)}
                  placeholder={t('attr_write_here')}
                />
                <button
                  type="button"
                  onClick={() => { setParishManual(false); updateField('parish', ''); }}
                  className="btn"
                  style={{ fontSize: 12, padding: '0 10px', flexShrink: 0 }}
                >
                  Lista
                </button>
              </div>
            ) : (
              <select
                required
                value={form.parish}
                onChange={(e) => {
                  if (e.target.value === '__outro__') {
                    setParishManual(true);
                    updateField('parish', '');
                    return;
                  }
                  updateField('parish', e.target.value);
                }}
                disabled={!form.municipality}
              >
                <option value="">{t('pub_choose_option')}</option>
                {(freguesiasPorConcelho[form.municipality] || []).map((f) => <option key={f}>{f}</option>)}
                <option value="__outro__">✎ Não encontras a tua? Escreve aqui</option>
              </select>
            )}
          </div>
        </div>

        <div className="field">
          <label>{t('pub_show_full_address')}</label>
          <p style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: -2, marginBottom: 8 }}>
            Se escolher "Não", o anúncio mostra apenas a localidade/concelho, não a rua e o número.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ v: true, l: 'Sim, mostrar morada completa' }, { v: false, l: 'Não, mostrar só a localidade' }].map((opt) => (
              <button
                key={String(opt.v)}
                type="button"
                onClick={() => updateField('show_full_address', opt.v)}
                style={{
                  flex: 1, padding: '10px 8px', fontSize: 13, fontWeight: 600, borderRadius: 5, cursor: 'pointer',
                  border: form.show_full_address === opt.v ? '1.5px solid var(--telha)' : '1px solid var(--line)',
                  background: form.show_full_address === opt.v ? 'rgba(126,143,106,0.12)' : 'var(--paper)',
                  color: form.show_full_address === opt.v ? 'var(--telha)' : 'var(--text-soft)',
                }}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>{t('pub_description')} <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{t('pub_min_50_chars')}</span></label>
          <textarea required rows={9} style={{ minHeight: 180 }} value={form.description} onChange={(e) => updateField('description', e.target.value)} />
          <p style={{ fontSize: 11.5, marginTop: 4, color: form.description.length < 50 ? '#8a3b2a' : 'var(--text-soft)' }}>
            {form.description.length}/50 caracteres {form.description.length < 50 && `(faltam ${50 - form.description.length})`}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <YesNoField label={t('pub_storage')} value={form.has_storage} onChange={(v) => updateField('has_storage', v)} />
          <YesNoField label={t('pub_parking')} value={form.has_parking} onChange={(v) => updateField('has_parking', v)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <YesNoField label={t('pub_balcony')} value={form.has_balcony} onChange={(v) => updateField('has_balcony', v)} />
          <YesNoField label={t('pub_garden')} value={form.has_garden} onChange={(v) => updateField('has_garden', v)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <YesNoField label={t('pub_pool')} value={form.has_pool} onChange={(v) => updateField('has_pool', v)} />
          <YesNoField label={t('pub_gym')} value={form.has_gym} onChange={(v) => updateField('has_gym', v)} />
        </div>
        <YesNoField label={t('pub_coworking')} value={form.has_coworking} onChange={(v) => updateField('has_coworking', v)} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <YesNoField label={t('pub_near_transit')} value={form.near_transit} onChange={(v) => updateField('near_transit', v)} />
          {form.business_type === 'Arrendamento' && (
            <YesNoField label={t('pub_furnished')} value={form.is_furnished} onChange={(v) => updateField('is_furnished', v)} />
          )}
        </div>
        {form.business_type === 'Arrendamento' && (
          <YesNoField label={t('pub_pets_allowed')} value={form.pets_allowed} onChange={(v) => updateField('pets_allowed', v)} />
        )}

        <div className="field">
          <label>{t('pub_other_features')}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CARACTERISTICAS.map((f) => (
              <span
                key={f}
                onClick={() => toggleFeature(f)}
                style={{
                  fontSize: 13, padding: '7px 14px', borderRadius: 20, cursor: 'pointer',
                  border: '1px solid var(--line)',
                  background: features.includes(f) ? 'var(--azulejo)' : 'var(--paper)',
                  color: features.includes(f) ? '#fff' : 'var(--text-soft)',
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label>{t('pub_business_type')}</label>
            <select
              value={form.business_type}
              disabled={form.property_type === 'Quarto'}
              onChange={(e) => updateField('business_type', e.target.value)}
            >
              <option value="Venda" disabled={form.property_type === 'Quarto'}>{t('pub_sale')}</option>
              <option value="Arrendamento">{t('pub_rent')}</option>
            </select>
            {form.property_type === 'Quarto' && (
              <span className="hint" style={{ fontSize: 12, color: 'var(--text-soft)' }}>{t('pub_rooms_rent_only')}</span>
            )}
          </div>
          <div className="field">
            <label>{t('pub_price_eur')}</label>
            <input type="number" required value={form.price} onChange={(e) => updateField('price', e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>{t('pub_floor_plan')} <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{isEditMode ? t('pub_replace_current') : t('pub_optional')}</span></label>
          <label
            htmlFor="plan-input"
            style={{
              display: 'block', border: '1.5px dashed var(--line)', borderRadius: 6, padding: '20px 16px',
              textAlign: 'center', color: 'var(--text-soft)', fontSize: 13.5, cursor: 'pointer',
            }}
          >
            {planFile ? `📄 ${planFile.name}` : 'Clique para anexar a planta (imagem ou PDF)'}
          </label>
          <input id="plan-input" type="file" accept="image/*,.pdf" onChange={handlePlanSelect} style={{ display: 'none' }} />
        </div>

        <div className="field">
          <label>{t('pub_video')} <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{isEditMode ? t('pub_replace_current') : t('pub_optional_max100mb')}</span></label>
          <label
            htmlFor="video-input"
            style={{
              display: 'block', border: '1.5px dashed var(--line)', borderRadius: 6, padding: '20px 16px',
              textAlign: 'center', color: 'var(--text-soft)', fontSize: 13.5, cursor: 'pointer',
            }}
          >
            {videoFile ? `🎬 ${videoFile.name}` : 'Clique para anexar um vídeo (gravado pelo telemóvel, por exemplo)'}
          </label>
          <input id="video-input" type="file" accept="video/*" onChange={handleVideoSelect} style={{ display: 'none' }} />
          {videoError && <p className="error-text" style={{ marginTop: 6 }}>{videoError}</p>}
        </div>

        <div className="field">
          <label>
            Documento comprovativo <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>
              (opcional — caderneta predial ou certidão. Se anexar, um administrador confirma e o anúncio fica com o selo "Documentação verificada")
            </span>
          </label>
          <label
            htmlFor="document-input"
            style={{
              display: 'block', border: '1.5px dashed var(--line)', borderRadius: 6, padding: '20px 16px',
              textAlign: 'center', color: 'var(--text-soft)', fontSize: 13.5, cursor: 'pointer',
            }}
          >
            {documentFile ? `📄 ${documentFile.name}` : 'Clique para anexar (imagem ou PDF)'}
          </label>
          <input id="document-input" type="file" accept="image/*,.pdf" onChange={(e) => setDocumentFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
        </div>

        <div className="field">
          <label>{t('pub_photos')} {isEditMode && <span className="hint" style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-soft)' }}>{t('pub_already_has_photos').replace('{n}', existingPhotoCount)}</span>}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <label
              htmlFor="photo-input"
              style={{
                flex: 1, display: 'block', border: '1.5px dashed var(--line)', borderRadius: 6, padding: '28px 16px',
                textAlign: 'center', color: 'var(--text-soft)', fontSize: 13.5, cursor: 'pointer',
              }}
            >
              {isEditMode ? 'Clique para escolher fotografias' : 'Clique para escolher fotografias (mínimo 6, máximo 25)'}
            </label>
            <label
              htmlFor="camera-input"
              style={{
                flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                border: '1.5px dashed var(--line)', borderRadius: 6, padding: '28px 16px',
                textAlign: 'center', color: 'var(--text-soft)', fontSize: 13.5, cursor: 'pointer', minWidth: 110,
              }}
            >
              📷 Tirar foto
            </label>
          </div>
          <input
            id="photo-input" type="file" accept="image/*,.heic,.heif" multiple
            onChange={handlePhotoSelect} style={{ display: 'none' }}
          />
          <input
            id="camera-input" type="file" accept="image/*" capture="environment"
            onChange={handlePhotoSelect} style={{ display: 'none' }}
          />

          {photos.length > 0 && !isEditMode && (
            <p style={{ fontSize: 12.5, marginTop: 8, color: photos.length < 6 ? '#8a3b2a' : 'var(--text-soft)' }}>
              {photos.length}/25 fotografias {photos.length < 6 && `(faltam pelo menos ${6 - photos.length})`}
            </p>
          )}
          {photos.length > 1 && (
            <p style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 4 }}>
              Arraste as fotos para as reordenar. A primeira é a foto principal do anúncio.
            </p>
          )}

          {photos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
              {photos.map((p, i) => (
                <div
                  key={p.file.name + i}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex === null || dragIndex === i) return;
                    setPhotos((cur) => {
                      const next = [...cur];
                      const [moved] = next.splice(dragIndex, 1);
                      next.splice(i, 0, moved);
                      return next;
                    });
                    setDragIndex(null);
                  }}
                  style={{
                    position: 'relative', aspectRatio: '1', borderRadius: 6, overflow: 'hidden', cursor: 'grab',
                    border: i === 0 ? '2px solid var(--telha)' : '2px solid transparent',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt={`Foto ${i + 1} carregada, pré-visualização`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {i === 0 && (
                    <span style={{
                      position: 'absolute', bottom: 4, left: 4, fontSize: 9.5, fontWeight: 700, padding: '2px 7px',
                      borderRadius: 8, background: 'var(--telha)', color: '#fff',
                    }}>
                      PRINCIPAL
                    </span>
                  )}
                  {i !== 0 && (
                    <button
                      type="button"
                      onClick={() => setPhotos((cur) => {
                        const next = [...cur];
                        const [moved] = next.splice(i, 1);
                        next.unshift(moved);
                        return next;
                      })}
                      style={{
                        position: 'absolute', bottom: 4, left: 4, fontSize: 9.5, fontWeight: 600, padding: '2px 7px',
                        borderRadius: 8, background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', color: 'var(--ink)',
                      }}
                    >
                      Definir principal
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    style={{
                      position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? t('pub_saving') : (isEditMode ? t('pub_save_changes') : t('publish_submit'))}
        </button>
        {!isEditMode && (
          <p style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 10, textAlign: 'center' }}>
            {t('publish_review_note')}
          </p>
        )}
      </form>
    </main>
    </>
  );
}

export default function PublishPage() {
  return (
    <Suspense fallback={<div className="wrap" style={{ padding: 60 }}>...</div>}>
      <PublishForm />
    </Suspense>
  );
}
