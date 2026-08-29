'use client';

import { useState, useRef, useEffect } from 'react';
import { distritos, concelhosPorDistrito } from '../lib/locations';
import { useLanguage } from '../lib/i18n';

const AMENITY_WORDS = {
  // Português
  varanda: 'has_balcony', garagem: 'has_parking', 'lugar de garagem': 'has_parking',
  arrumos: 'has_storage', jardim: 'has_garden', piscina: 'has_pool', ginásio: 'has_gym', ginasio: 'has_gym',
  // English
  balcony: 'has_balcony', garage: 'has_parking', 'parking spot': 'has_parking', 'parking space': 'has_parking',
  storage: 'has_storage', garden: 'has_garden', pool: 'has_pool', gym: 'has_gym',
  // Español
  balcón: 'has_balcony', balcon: 'has_balcony', garaje: 'has_parking', trastero: 'has_storage',
  jardín: 'has_garden', jardin: 'has_garden', gimnasio: 'has_gym',
  // Français
  balcon: 'has_balcony', garage: 'has_parking', parking: 'has_parking',
  rangement: 'has_storage', piscine: 'has_pool',
  // Deutsch
  garten: 'has_garden', schwimmbad: 'has_pool', fitnessraum: 'has_gym', abstellraum: 'has_storage',
  stellplatz: 'has_parking', balkon: 'has_balcony',
  // Nederlands
  tuin: 'has_garden', zwembad: 'has_pool', sportschool: 'has_gym', berging: 'has_storage',
  parkeerplaats: 'has_parking',
  // Русский
  балкон: 'has_balcony', гараж: 'has_parking', парковка: 'has_parking',
  кладовая: 'has_storage', сад: 'has_garden', бассейн: 'has_pool', спортзал: 'has_gym',
};

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseDescription(text) {
  const lower = text.toLowerCase();
  const result = { location: '', business: 'Venda', typologies: [], maxPrice: '', amenities: [], elevator: false };

  // Comprar ou arrendar (PT: arrend..., EN: rent, ES: alquil...)
  if (/\barrend|\brent(ing)?\b|\balquil|\blouer|\blocation\b|\bmiete|\bmieten|\bverhuur|\bhuren\b|\bаренд|\bснять\b/.test(lower)) result.business = 'Arrendamento';

  // Tipologias (T0 a T5+) — também aceita "2 bedroom", "2 quartos", "2 habitaciones"
  const typMatches = lower.match(/t\s?([0-5])/g) || [];
  result.typologies = [...new Set(typMatches.map((m) => `T${m.replace(/[^0-5]/g, '')}`))];

  // Preço máximo — PT "até", EN "up to"/"under", ES "hasta"
  const priceMatch = lower.match(/(?:até|up to|under|hasta|jusqu.à|jusqu.a|bis zu|bis|tot maximaal|tot|до)\s*([\d.,]+)\s*(mil|k|thousand|mil euros)?/);
  if (priceMatch) {
    let value = priceMatch[1].replace(/[.,]/g, '');
    if (priceMatch[2]) value += '000';
    result.maxPrice = value;
  }

  // Localidade — procura nomes de distritos e concelhos mencionados no texto
  for (const d of distritos) {
    if (lower.includes(d.toLowerCase())) { result.location = d; break; }
  }
  if (!result.location) {
    const STOPWORDS = ['de', 'da', 'do', 'das', 'dos', 'e', 'vila', 'nova', 'novo', 'são', 'sao', 'santa', 'santo', 'foz'];
    let bestMatch = null;
    let bestWordLength = 0;
    for (const concelhos of Object.values(concelhosPorDistrito)) {
      for (const c of concelhos) {
        const cLower = c.toLowerCase();
        if (lower.includes(cLower)) { bestMatch = c; bestWordLength = 999; break; }
        const words = cLower.split(/\s+/).filter((w) => !STOPWORDS.includes(w) && w.length > 2);
        for (const w of words) {
          if (w.length > bestWordLength && new RegExp(`\\b${escapeRegex(w)}\\b`).test(lower)) {
            bestMatch = c;
            bestWordLength = w.length;
          }
        }
      }
      if (bestWordLength === 999) break;
    }
    if (bestMatch) result.location = bestMatch;
  }

  // Características (PT, EN, ES)
  Object.entries(AMENITY_WORDS).forEach(([word, field]) => {
    if (lower.includes(word) && !result.amenities.includes(field)) result.amenities.push(field);
  });
  if (/elevador|elevator|\blift\b|ascensor|ascenseur|aufzug|лифт/.test(lower)) result.elevator = true;

  return result;
}

export default function NaturalSearchBox() {
  const { lang } = useLanguage();
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef(null);
  const baseTextRef = useRef('');
  const startingRef = useRef(false);

  const VOICE_LOCALES = { pt: 'pt-PT', en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', nl: 'nl-NL', ru: 'ru-RU', it: 'it-IT', pl: 'pl-PL', sv: 'sv-SE', uk: 'uk-UA', zh: 'zh-CN', ar: 'ar-SA' };

  // O reconhecimento é criado só uma vez. Trocar de idioma a meio de uma gravação
  // não recria o objeto (o que às vezes deixava o microfone num estado confuso).
  useEffect(() => {
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) return;
    setVoiceSupported(true);

    const recognition = new SpeechRecognition();
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => { startingRef.current = false; setListening(true); setVoiceError(''); };

    recognition.onresult = (event) => {
      let finalChunk = '';
      let interimChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalChunk += chunk;
        else interimChunk += chunk;
      }
      if (finalChunk) {
        baseTextRef.current = baseTextRef.current ? `${baseTextRef.current} ${finalChunk}` : finalChunk;
        setText(baseTextRef.current);
        setInterimText('');
      } else {
        setInterimText(interimChunk);
      }
    };
    recognition.onend = () => { startingRef.current = false; setListening(false); setInterimText(''); };
    recognition.onerror = (event) => {
      startingRef.current = false;
      setListening(false);
      setInterimText('');
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setVoiceError(ui.mic_permission);
      } else if (event.error === 'no-speech') {
        setVoiceError(ui.mic_no_sound);
      } else if (event.error !== 'aborted') {
        setVoiceError(ui.mic_unavailable);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try { recognition.stop(); } catch (err) { /* já estava parado */ }
    };
  }, []);

  // Atualiza só o idioma do microfone, sem recriar tudo — evita cortar uma gravação em curso.
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = VOICE_LOCALES[lang] || 'pt-PT';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  function toggleListening() {
    if (!recognitionRef.current || startingRef.current) return;
    setVoiceError('');
    if (listening) {
      try { recognitionRef.current.stop(); } catch (err) { setListening(false); }
    } else {
      baseTextRef.current = text;
      startingRef.current = true;
      try {
        recognitionRef.current.start();
        // Rede de segurança: se o browser pedir permissão para o microfone e a
        // pessoa não reparar/responder a tempo, a gravação nunca chega a começar,
        // e ficava sem nenhuma explicação. Isto avisa a pessoa ao fim de alguns segundos.
        setTimeout(() => {
          if (startingRef.current) {
            startingRef.current = false;
            try { recognitionRef.current.stop(); } catch (err2) { /* nada a fazer */ }
            setVoiceError(ui.mic_no_start);
          }
        }, 4000);
      } catch (err) {
        // Já estava a começar (clique duplo) — para tudo e deixa a pessoa tentar de novo.
        startingRef.current = false;
        try { recognitionRef.current.stop(); } catch (err2) { /* nada a fazer */ }
        setTimeout(() => {
          try { recognitionRef.current.start(); } catch (err3) { setVoiceError(ui.mic_retry); }
        }, 300);
      }
    }
  }

  function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!text.trim()) return;
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop();
      setListening(false);
    }

    let parsed;
    try {
      parsed = parseDescription(text);
    } catch (err) {
      // Se a deteção de palavras falhar por algum motivo, ainda assim vamos para os resultados.
      parsed = { location: '', business: 'Venda', typologies: [], maxPrice: '', amenities: [], elevator: false };
    }

    const params = new URLSearchParams();
    if (parsed.location) params.set('location', parsed.location);
    params.set('business', parsed.business);
    if (parsed.typologies.length > 0) params.set('typologies', parsed.typologies.join(','));
    if (parsed.maxPrice) params.set('maxPrice', parsed.maxPrice);
    if (parsed.amenities.length > 0) params.set('amenities', parsed.amenities.join(','));
    if (parsed.elevator) params.set('elevator', '1');
    params.set('nlsearch', '1');

    window.location.href = `/results?${params.toString()}`;
  }

  // Vários elementos do texto de exemplo mudam aleatoriamente a cada visita, para nunca
  // mostrar sempre a mesma frase. Cada lista está alinhada por posição entre idiomas
  // (o índice 2, por exemplo, é sempre a mesma combinação em todas as línguas).
  // O russo usa listas próprias, porque o alfabeto e a gramática são diferentes.
  const EXAMPLE_CITIES = ['Vila Nova de Gaia', 'Porto', 'Lisboa', 'Cascais', 'Braga', 'Sintra', 'Coimbra', 'Faro', 'Aveiro', 'Setúbal'];
  const EXAMPLE_CITIES_RU = ['Вила-Нова-де-Гайя', 'Порту', 'Лиссабон', 'Кашкайш', 'Брага', 'Синтра', 'Коимбра', 'Фару', 'Авейру', 'Сетубал'];
  const EXAMPLE_CITIES_ZH = ['新盖亚', '波尔图', '里斯本', '卡斯凯什', '布拉加', '辛特拉', '科英布拉', '法鲁', '阿威罗', '塞图巴尔'];
  const EXAMPLE_CITIES_AR = ['فيلا نوفا دي غايا', 'بورتو', 'لشبونة', 'كاشكايش', 'براغا', 'سينترا', 'كويمبرا', 'فارو', 'أفيرو', 'سيتوبال'];

  const EXAMPLE_TYPOLOGIES = ['T2 ou T3', 'T1 ou T2', 'T3 ou T4', 'T2'];
  const EXAMPLE_TYPOLOGIES_EN = ['T2 or T3', 'T1 or T2', 'T3 or T4', 'T2'];
  const EXAMPLE_TYPOLOGIES_DE = ['2- oder 3-Zimmer-Wohnung', '1- oder 2-Zimmer-Wohnung', '3- oder 4-Zimmer-Wohnung', '2-Zimmer-Wohnung'];
  const EXAMPLE_TYPOLOGIES_NL = ['2- of 3-kamerwoning', '1- of 2-kamerwoning', '3- of 4-kamerwoning', '2-kamerwoning'];
  const EXAMPLE_TYPOLOGIES_RU = ['2- или 3-комнатную квартиру', '1- или 2-комнатную квартиру', '3- или 4-комнатную квартиру', '2-комнатную квартиру'];
  const EXAMPLE_TYPOLOGIES_IT = ['bilocale o trilocale', 'monolocale o bilocale', 'trilocale o quadrilocale', 'bilocale'];
  const EXAMPLE_TYPOLOGIES_PL = ['2- lub 3-pokojowe mieszkanie', '1- lub 2-pokojowe mieszkanie', '3- lub 4-pokojowe mieszkanie', '2-pokojowe mieszkanie'];
  const EXAMPLE_TYPOLOGIES_SV = ['2:a eller 3:a', '1:a eller 2:a', '3:a eller 4:a', '2:a'];
  const EXAMPLE_TYPOLOGIES_UK = ['2- або 3-кімнатну квартиру', '1- або 2-кімнатну квартиру', '3- або 4-кімнатну квартиру', '2-кімнатну квартиру'];
  const EXAMPLE_TYPOLOGIES_ZH = ['两居室或三居室', '一居室或两居室', '三居室或四居室', '两居室'];
  const EXAMPLE_TYPOLOGIES_AR = ['شقة من غرفتين أو ثلاث غرف', 'شقة من غرفة أو غرفتين', 'شقة من ثلاث أو أربع غرف', 'شقة من غرفتين'];

  const EXAMPLE_PRICES = ['350 000', '250 000', '450 000', '180 000'];

  const EXAMPLE_AMENITIES = ['varanda e lugar de garagem', 'jardim e piscina', 'elevador e arrumos', 'terraço e vista mar'];
  const EXAMPLE_AMENITIES_EN = ['a balcony and parking', 'a garden and a pool', 'a lift and storage', 'a terrace and sea view'];
  const EXAMPLE_AMENITIES_ES = ['balcón y garaje', 'jardín y piscina', 'ascensor y trastero', 'terraza y vista al mar'];
  const EXAMPLE_AMENITIES_FR = ['balcon et parking', 'jardin et piscine', 'ascenseur et rangement', 'terrasse et vue mer'];
  const EXAMPLE_AMENITIES_DE = ['Balkon und Stellplatz', 'Garten und Pool', 'Aufzug und Abstellraum', 'Terrasse und Meerblick'];
  const EXAMPLE_AMENITIES_NL = ['balkon en parkeerplaats', 'tuin en zwembad', 'lift en berging', 'terras en zeezicht'];
  const EXAMPLE_AMENITIES_RU = ['балконом и парковкой', 'садом и бассейном', 'лифтом и кладовой', 'террасой и видом на море'];
  const EXAMPLE_AMENITIES_IT = ['balcone e posto auto', 'giardino e piscina', 'ascensore e ripostiglio', 'terrazzo e vista mare'];
  const EXAMPLE_AMENITIES_PL = ['balkon i miejsce parkingowe', 'ogród i basen', 'windę i schowek', 'taras i widok na morze'];
  const EXAMPLE_AMENITIES_SV = ['balkong och parkering', 'trädgård och pool', 'hiss och förråd', 'terrass och havsutsikt'];
  const EXAMPLE_AMENITIES_UK = ['балконом і паркінгом', 'садом і басейном', 'ліфтом і коморою', 'терасою з видом на море'];
  const EXAMPLE_AMENITIES_ZH = ['阳台和车位', '花园和游泳池', '电梯和储物间', '露台和海景'];
  const EXAMPLE_AMENITIES_AR = ['شرفة وموقف سيارات', 'حديقة ومسبح', 'مصعد وغرفة تخزين', 'تراس وإطلالة على البحر'];

  // Começa sempre com a combinação 0 (evita a página piscar/mudar de texto ao carregar),
  // e só escolhe a combinação a sério depois de estar mesmo no browser da pessoa — a
  // página inicial é pré-construída uma vez antes de publicar, por isso escolher a
  // combinação "cedo demais" fazia com que ficasse sempre igual para toda a gente.
  const [exampleSeed, setExampleSeed] = useState({ city: 0, typology: 0, price: 0, amenity: 0 });

  useEffect(() => {
    setExampleSeed({
      city: Math.floor(Math.random() * EXAMPLE_CITIES.length),
      typology: Math.floor(Math.random() * EXAMPLE_TYPOLOGIES.length),
      price: Math.floor(Math.random() * EXAMPLE_PRICES.length),
      amenity: Math.floor(Math.random() * EXAMPLE_AMENITIES.length),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exampleCity = EXAMPLE_CITIES[exampleSeed.city];
  const exampleCityRu = EXAMPLE_CITIES_RU[exampleSeed.city];
  const exampleCityZh = EXAMPLE_CITIES_ZH[exampleSeed.city];
  const exampleCityAr = EXAMPLE_CITIES_AR[exampleSeed.city];
  const exampleTypology = EXAMPLE_TYPOLOGIES[exampleSeed.typology];
  const exampleTypologyEn = EXAMPLE_TYPOLOGIES_EN[exampleSeed.typology];
  const exampleTypologyDe = EXAMPLE_TYPOLOGIES_DE[exampleSeed.typology];
  const exampleTypologyNl = EXAMPLE_TYPOLOGIES_NL[exampleSeed.typology];
  const exampleTypologyRu = EXAMPLE_TYPOLOGIES_RU[exampleSeed.typology];
  const exampleTypologyIt = EXAMPLE_TYPOLOGIES_IT[exampleSeed.typology];
  const exampleTypologyPl = EXAMPLE_TYPOLOGIES_PL[exampleSeed.typology];
  const exampleTypologySv = EXAMPLE_TYPOLOGIES_SV[exampleSeed.typology];
  const exampleTypologyUk = EXAMPLE_TYPOLOGIES_UK[exampleSeed.typology];
  const exampleTypologyZh = EXAMPLE_TYPOLOGIES_ZH[exampleSeed.typology];
  const exampleTypologyAr = EXAMPLE_TYPOLOGIES_AR[exampleSeed.typology];
  const examplePrice = EXAMPLE_PRICES[exampleSeed.price];
  const exampleAmenity = EXAMPLE_AMENITIES[exampleSeed.amenity];
  const exampleAmenityEn = EXAMPLE_AMENITIES_EN[exampleSeed.amenity];
  const exampleAmenityEs = EXAMPLE_AMENITIES_ES[exampleSeed.amenity];
  const exampleAmenityFr = EXAMPLE_AMENITIES_FR[exampleSeed.amenity];
  const exampleAmenityDe = EXAMPLE_AMENITIES_DE[exampleSeed.amenity];
  const exampleAmenityNl = EXAMPLE_AMENITIES_NL[exampleSeed.amenity];
  const exampleAmenityRu = EXAMPLE_AMENITIES_RU[exampleSeed.amenity];
  const exampleAmenityIt = EXAMPLE_AMENITIES_IT[exampleSeed.amenity];
  const exampleAmenityPl = EXAMPLE_AMENITIES_PL[exampleSeed.amenity];
  const exampleAmenitySv = EXAMPLE_AMENITIES_SV[exampleSeed.amenity];
  const exampleAmenityUk = EXAMPLE_AMENITIES_UK[exampleSeed.amenity];
  const exampleAmenityZh = EXAMPLE_AMENITIES_ZH[exampleSeed.amenity];
  const exampleAmenityAr = EXAMPLE_AMENITIES_AR[exampleSeed.amenity];

  const UI_TEXT = {
    pt: {
      title: 'O que procuras numa casa?',
      sub: (v) => `Sonhamos contigo. Partilha o que procuras${v ? ' — escreve ou fala' : ''}.`,
      placeholder: `Gostava de comprar um ${exampleTypology} até ${examplePrice}€, recente ou novo, em ${exampleCity}, com ${exampleAmenity}.`,
      button: 'Tens o que procuro? 🔍',
      mic_permission: 'Precisamos de acesso ao microfone. Verifica as permissões do browser.',
      mic_no_sound: 'Não ouvimos nada. Toca no microfone e tenta outra vez.',
      mic_unavailable: 'Não foi possível usar o microfone agora. Tenta outra vez.',
      mic_no_start: 'O microfone não começou a gravar. Verifica se apareceu um pedido de permissão do browser (pode estar escondido junto da barra de endereço), e tenta outra vez.',
      mic_retry: 'Toca outra vez no microfone.',
      mic_stop: 'Parar de gravar',
      mic_start: 'Falar em vez de escrever',
      mic_recording: 'A gravar... clica para terminar',
    },
    en: {
      title: 'What are you looking for?',
      sub: (v) => `We dream with you. Share what you\u2019re looking for${v ? ' — type or speak' : ''}.`,
      placeholder: `I\u2019d like to buy a ${exampleTypologyEn} up to €${examplePrice}, new or recent, in ${exampleCity}, with ${exampleAmenityEn}.`,
      button: 'Do you have what I\u2019m looking for? 🔍',
      mic_permission: 'We need access to your microphone. Check your browser permissions.',
      mic_no_sound: 'We didn\'t hear anything. Tap the microphone and try again.',
      mic_unavailable: 'The microphone isn\'t available right now. Try again.',
      mic_no_start: 'The microphone didn\'t start recording. Check if a browser permission request appeared (it may be hidden near the address bar), and try again.',
      mic_retry: 'Tap the microphone again.',
      mic_stop: 'Stop recording',
      mic_start: 'Speak instead of typing',
      mic_recording: 'Recording... tap to finish',
    },
    es: {
      title: '¿Qué buscas en una casa?',
      sub: (v) => `Soñamos contigo. Comparte lo que buscas${v ? ' — escribe o habla' : ''}.`,
      placeholder: `Me gustaría comprar un ${exampleTypology} hasta ${examplePrice}€, nuevo o reciente, en ${exampleCity}, con ${exampleAmenityEs}.`,
      button: '¿Tienes lo que busco? 🔍',
      mic_permission: 'Necesitamos acceso al micrófono. Compruebe los permisos del navegador.',
      mic_no_sound: 'No hemos oído nada. Toque el micrófono e inténtelo de nuevo.',
      mic_unavailable: 'No se pudo usar el micrófono ahora. Inténtelo de nuevo.',
      mic_no_start: 'El micrófono no empezó a grabar. Compruebe si apareció una solicitud de permiso del navegador (puede estar oculta junto a la barra de direcciones), e inténtelo de nuevo.',
      mic_retry: 'Toque el micrófono otra vez.',
      mic_stop: 'Detener grabación',
      mic_start: 'Hablar en vez de escribir',
      mic_recording: 'Grabando... toque para terminar',
    },
    fr: {
      title: 'Que recherchez-vous dans une maison ?',
      sub: (v) => `Nous rêvons avec vous. Partagez ce que vous cherchez${v ? ' — écrivez ou parlez' : ''}.`,
      placeholder: `Je voudrais acheter un ${exampleTypology} jusqu\u2019à ${examplePrice}€, neuf ou récent, à ${exampleCity}, avec ${exampleAmenityFr}.`,
      button: 'Avez-vous ce que je cherche ? 🔍',
      mic_permission: 'Nous avons besoin d\'accéder à votre microphone. Vérifiez les autorisations du navigateur.',
      mic_no_sound: 'Nous n\'avons rien entendu. Touchez le microphone et réessayez.',
      mic_unavailable: 'Impossible d\'utiliser le microphone pour le moment. Réessayez.',
      mic_no_start: 'Le microphone n\'a pas commencé à enregistrer. Vérifiez si une demande d\'autorisation du navigateur est apparue (elle peut être cachée près de la barre d\'adresse), et réessayez.',
      mic_retry: 'Touchez à nouveau le microphone.',
      mic_stop: 'Arrêter l\'enregistrement',
      mic_start: 'Parler au lieu d\'écrire',
      mic_recording: 'Enregistrement... touchez pour terminer',
    },
    de: {
      title: 'Was suchen Sie in einem Zuhause?',
      sub: (v) => `Wir träumen mit Ihnen. Teilen Sie, wonach Sie suchen${v ? ' — schreiben oder sprechen Sie' : ''}.`,
      placeholder: `Ich möchte eine ${exampleTypologyDe} bis ${examplePrice}€ kaufen, neu oder neuwertig, in ${exampleCity}, mit ${exampleAmenityDe}.`,
      button: 'Haben Sie, was ich suche? 🔍',
      mic_permission: 'Wir benötigen Zugriff auf dein Mikrofon. Überprüfe die Browser-Berechtigungen.',
      mic_no_sound: 'Wir haben nichts gehört. Tippe auf das Mikrofon und versuche es erneut.',
      mic_unavailable: 'Das Mikrofon kann gerade nicht verwendet werden. Versuche es erneut.',
      mic_no_start: 'Das Mikrofon hat nicht mit der Aufnahme begonnen. Prüfe, ob eine Berechtigungsanfrage des Browsers erschienen ist (sie kann in der Nähe der Adressleiste versteckt sein), und versuche es erneut.',
      mic_retry: 'Tippe erneut auf das Mikrofon.',
      mic_stop: 'Aufnahme beenden',
      mic_start: 'Sprechen statt tippen',
      mic_recording: 'Aufnahme läuft... zum Beenden tippen',
    },
    nl: {
      title: 'Wat zoekt u in een huis?',
      sub: (v) => `Wij dromen met u mee. Deel wat u zoekt${v ? ' — typ of spreek' : ''}.`,
      placeholder: `Ik zou graag een ${exampleTypologyNl} kopen tot €${examplePrice}, nieuw of recent, in ${exampleCity}, met ${exampleAmenityNl}.`,
      button: 'Heeft u wat ik zoek? 🔍',
      mic_permission: 'We hebben toegang tot je microfoon nodig. Controleer de browserrechten.',
      mic_no_sound: 'We hebben niets gehoord. Tik op de microfoon en probeer opnieuw.',
      mic_unavailable: 'De microfoon kan nu niet worden gebruikt. Probeer opnieuw.',
      mic_no_start: 'De microfoon is niet begonnen met opnemen. Controleer of er een toestemmingsverzoek van de browser is verschenen (het kan verborgen zijn bij de adresbalk), en probeer opnieuw.',
      mic_retry: 'Tik opnieuw op de microfoon.',
      mic_stop: 'Opname stoppen',
      mic_start: 'Spreken in plaats van typen',
      mic_recording: 'Opname bezig... tik om te stoppen',
    },
    ru: {
      title: 'Что вы ищете в доме?',
      sub: (v) => `Мы мечтаем вместе с вами. Расскажите, что вы ищете${v ? ' — напишите или скажите' : ''}.`,
      placeholder: `Я хотел бы купить ${exampleTypologyRu} до ${examplePrice}€, новую или недавнюю, в ${exampleCityRu}, с ${exampleAmenityRu}.`,
      button: 'Есть ли у вас то, что я ищу? 🔍',
      mic_permission: 'Нам нужен доступ к микрофону. Проверьте разрешения браузера.',
      mic_no_sound: 'Мы ничего не услышали. Нажмите на микрофон и попробуйте снова.',
      mic_unavailable: 'Сейчас микрофон недоступен. Попробуйте снова.',
      mic_no_start: 'Микрофон не начал запись. Проверьте, не появился ли запрос разрешения браузера (он может быть скрыт рядом со строкой адреса), и попробуйте снова.',
      mic_retry: 'Нажмите на микрофон ещё раз.',
      mic_stop: 'Остановить запись',
      mic_start: 'Говорить вместо ввода',
      mic_recording: 'Запись... нажмите, чтобы завершить',
    },
    it: {
      title: 'Cosa cerchi in una casa?',
      sub: (v) => `Sogniamo con te. Condividi cosa cerchi${v ? ' — scrivi o parla' : ''}.`,
      placeholder: `Vorrei comprare un ${exampleTypologyIt} fino a ${examplePrice}€, nuovo o recente, a ${exampleCity}, con ${exampleAmenityIt}.`,
      button: 'Hai quello che cerco? 🔍',
      mic_permission: 'Abbiamo bisogno di accedere al tuo microfono. Controlla le autorizzazioni del browser.',
      mic_no_sound: 'Non abbiamo sentito nulla. Tocca il microfono e riprova.',
      mic_unavailable: 'Il microfono non è disponibile ora. Riprova.',
      mic_no_start: 'Il microfono non ha iniziato a registrare. Controlla se è apparsa una richiesta di autorizzazione del browser (potrebbe essere nascosta vicino alla barra degli indirizzi), e riprova.',
      mic_retry: 'Tocca di nuovo il microfono.',
      mic_stop: 'Ferma registrazione',
      mic_start: 'Parla invece di scrivere',
      mic_recording: 'Registrazione... tocca per terminare',
    },
    pl: {
      title: 'Czego szukasz w domu?',
      sub: (v) => `Marzymy razem z Tobą. Podziel się tym, czego szukasz${v ? ' — napisz lub powiedz' : ''}.`,
      placeholder: `Chciałbym kupić ${exampleTypologyPl} do ${examplePrice}€, nowe lub niedawno wybudowane, w ${exampleCity}, z ${exampleAmenityPl}.`,
      button: 'Masz to, czego szukam? 🔍',
      mic_permission: 'Potrzebujemy dostępu do mikrofonu. Sprawdź uprawnienia przeglądarki.',
      mic_no_sound: 'Nic nie usłyszeliśmy. Dotknij mikrofonu i spróbuj ponownie.',
      mic_unavailable: 'Mikrofon jest teraz niedostępny. Spróbuj ponownie.',
      mic_no_start: 'Mikrofon nie rozpoczął nagrywania. Sprawdź, czy pojawiła się prośba o zgodę przeglądarki (może być ukryta obok paska adresu), i spróbuj ponownie.',
      mic_retry: 'Dotknij mikrofonu ponownie.',
      mic_stop: 'Zatrzymaj nagrywanie',
      mic_start: 'Mów zamiast pisać',
      mic_recording: 'Nagrywanie... dotknij, aby zakończyć',
    },
    sv: {
      title: 'Vad letar du efter i ett hem?',
      sub: (v) => `Vi drömmer med dig. Dela vad du letar efter${v ? ' — skriv eller tala' : ''}.`,
      placeholder: `Jag skulle vilja köpa en ${exampleTypologySv} upp till ${examplePrice}€, ny eller nybyggd, i ${exampleCity}, med ${exampleAmenitySv}.`,
      button: 'Har du det jag letar efter? 🔍',
      mic_permission: 'Vi behöver åtkomst till din mikrofon. Kontrollera webbläsarens behörigheter.',
      mic_no_sound: 'Vi hörde inget. Tryck på mikrofonen och försök igen.',
      mic_unavailable: 'Mikrofonen kan inte användas just nu. Försök igen.',
      mic_no_start: 'Mikrofonen började inte spela in. Kontrollera om en behörighetsförfrågan från webbläsaren visades (den kan vara dold nära adressfältet), och försök igen.',
      mic_retry: 'Tryck på mikrofonen igen.',
      mic_stop: 'Stoppa inspelning',
      mic_start: 'Tala istället för att skriva',
      mic_recording: 'Spelar in... tryck för att avsluta',
    },
    uk: {
      title: 'Що ви шукаєте в домі?',
      sub: (v) => `Ми мріємо разом з вами. Поділіться тим, що ви шукаєте${v ? ' — напишіть або скажіть' : ''}.`,
      placeholder: `Я хотів би купити ${exampleTypologyUk} до ${examplePrice}€, нову або нещодавно збудовану, в ${exampleCity}, з ${exampleAmenityUk}.`,
      button: 'Чи є у вас те, що я шукаю? 🔍',
      mic_permission: 'Нам потрібен доступ до мікрофона. Перевірте дозволи браузера.',
      mic_no_sound: 'Ми нічого не почули. Натисніть на мікрофон і спробуйте ще раз.',
      mic_unavailable: 'Зараз мікрофон недоступний. Спробуйте ще раз.',
      mic_no_start: 'Мікрофон не почав запис. Перевірте, чи не з\'явився запит дозволу браузера (він може бути прихований біля адресного рядка), і спробуйте ще раз.',
      mic_retry: 'Натисніть на мікрофон ще раз.',
      mic_stop: 'Зупинити запис',
      mic_start: 'Говорити замість введення',
      mic_recording: 'Запис... натисніть, щоб завершити',
    },
    zh: {
      title: '您想找什么样的房子？',
      sub: (v) => `我们与您一起憧憬。分享您在寻找什么${v ? ' — 输入或说出来' : ''}。`,
      placeholder: `我想购买一套${exampleTypologyZh}，最高${examplePrice}€，全新或近期建成，位于${exampleCityZh}，带${exampleAmenityZh}。`,
      button: '您有我在找的房子吗？🔍',
      mic_permission: '我们需要访问您的麦克风。请检查浏览器权限。',
      mic_no_sound: '我们没有听到任何声音。请点击麦克风并重试。',
      mic_unavailable: '麦克风目前无法使用。请重试。',
      mic_no_start: '麦克风未开始录音。请检查是否出现浏览器权限请求（可能隐藏在地址栏附近），然后重试。',
      mic_retry: '请再次点击麦克风。',
      mic_stop: '停止录音',
      mic_start: '语音输入而非打字',
      mic_recording: '录音中…点击结束',
    },
    ar: {
      title: 'ماذا تبحث عنه في منزل؟',
      sub: (v) => `نحلم معك. شارك ما تبحث عنه${v ? ' — اكتب أو تحدث' : ''}.`,
      placeholder: `أرغب في شراء ${exampleTypologyAr} حتى ${examplePrice}€، جديدة أو حديثة، في ${exampleCityAr}، مع ${exampleAmenityAr}.`,
      button: 'هل لديك ما أبحث عنه؟ 🔍',
      mic_permission: 'نحتاج إلى الوصول إلى الميكروفون. تحقق من أذونات المتصفح.',
      mic_no_sound: 'لم نسمع أي شيء. اضغط على الميكروفون وحاول مرة أخرى.',
      mic_unavailable: 'لا يمكن استخدام الميكروفون الآن. حاول مرة أخرى.',
      mic_no_start: 'لم يبدأ الميكروفون التسجيل. تحقق مما إذا ظهر طلب إذن من المتصفح (قد يكون مخفياً بالقرب من شريط العنوان)، وحاول مرة أخرى.',
      mic_retry: 'اضغط على الميكروفون مرة أخرى.',
      mic_stop: 'إيقاف التسجيل',
      mic_start: 'تحدث بدلاً من الكتابة',
      mic_recording: 'جارٍ التسجيل... اضغط للإنهاء',
    },
  };
  const ui = UI_TEXT[lang] || UI_TEXT.pt;

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: 18 }}>
      <h3 className="display" style={{ fontSize: 19, marginBottom: 5, fontWeight: 600 }}>{ui.title}</h3>
      <p style={{ fontSize: 13.5, color: 'var(--text-soft)', marginBottom: 12 }}>
        {ui.sub(voiceSupported)}
      </p>
      <div style={{ position: 'relative', marginTop: 26 }}>
        <div style={{
          position: 'absolute', top: -30, left: 0, right: 0, height: 22,
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600,
          cursor: listening ? 'pointer' : 'default',
          color: listening ? '#b8452f' : voiceError ? '#8a3b2a' : 'transparent',
        }}
          onClick={listening ? toggleListening : undefined}
        >
          {listening ? (
            <>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#b8452f', display: 'inline-block', animation: 'icon-breathe 0.9s ease-in-out infinite' }} />
              🔴 A gravar... toca para terminar
            </>
          ) : voiceError ? (
            <span style={{ fontSize: 12.5 }}>⚠️ {voiceError}</span>
          ) : (
            // Espaço reservado, invisível, para o texto nunca "saltar" a caixa de posição.
            <span>&nbsp;</span>
          )}
        </div>
        <textarea
          rows={2}
          value={listening && interimText ? `${text}${text ? ' ' : ''}${interimText}` : text}
          onChange={(e) => { setText(e.target.value); baseTextRef.current = e.target.value; }}
          placeholder=""
          style={{
            width: '100%', padding: 12, paddingRight: voiceSupported ? 52 : 12, border: listening ? '2px solid #b8452f' : '1px solid var(--line)', borderRadius: 6,
            fontFamily: 'Inter, sans-serif', fontSize: 14.5, resize: 'vertical', boxSizing: 'border-box', marginBottom: 10,
          }}
        />
        {voiceSupported && (
          <button
            type="button"
            onClick={toggleListening}
            aria-label={listening ? ui.mic_stop : ui.mic_start}
            title={listening ? ui.mic_recording : ui.mic_start}
            style={{
              position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: '50%',
              border: 'none', cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: listening ? '#b8452f' : 'var(--plaster)',
              color: listening ? '#fff' : 'var(--ink)',
              animation: listening ? 'icon-breathe 1s ease-in-out infinite' : 'none',
            }}
          >
            {listening ? '⏹' : '🎤'}
          </button>
        )}
      </div>
      <button type="submit" onClick={handleSubmit} className="btn btn-primary">{ui.button}</button>
    </form>
  );
}
