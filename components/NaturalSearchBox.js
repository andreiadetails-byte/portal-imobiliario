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

  const VOICE_LOCALES = { pt: 'pt-PT', en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', nl: 'nl-NL', ru: 'ru-RU' };

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
        setVoiceError('Precisamos de acesso ao microfone. Verifica as permissões do browser.');
      } else if (event.error === 'no-speech') {
        setVoiceError('Não ouvimos nada. Toca no microfone e tenta outra vez.');
      } else if (event.error !== 'aborted') {
        setVoiceError('Não foi possível usar o microfone agora. Tenta outra vez.');
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
      } catch (err) {
        // Já estava a começar (clique duplo) — para tudo e deixa a pessoa tentar de novo.
        startingRef.current = false;
        try { recognitionRef.current.stop(); } catch (err2) { /* nada a fazer */ }
        setTimeout(() => {
          try { recognitionRef.current.start(); } catch (err3) { setVoiceError('Toca outra vez no microfone.'); }
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

  const UI_TEXT = {
    pt: {
      title: 'O que procuras numa casa?',
      sub: (v) => `Escreve${v ? ' ou fala' : ''} — nós encontramos.`,
      placeholder: 'Gostava de comprar um T2 ou T3 até 350 000€, recente ou novo, em Vila Nova de Gaia, com varanda e lugar de garagem.',
      button: 'Tens o que procuro? 🔍',
    },
    en: {
      title: 'What are you looking for?',
      sub: (v) => `Type${v ? ' or speak' : ''} — we\u2019ll find it.`,
      placeholder: 'I\u2019d like to buy a T2 or T3 up to €350,000, new or recent, in Vila Nova de Gaia, with a balcony and parking.',
      button: 'Do you have what I\u2019m looking for? 🔍',
    },
    es: {
      title: '¿Qué buscas en una casa?',
      sub: (v) => `Escribe${v ? ' o habla' : ''} — nosotros lo encontramos.`,
      placeholder: 'Me gustaría comprar un T2 o T3 hasta 350.000€, nuevo o reciente, en Vila Nova de Gaia, con balcón y garaje.',
      button: '¿Tienes lo que busco? 🔍',
    },
    fr: {
      title: 'Que recherchez-vous dans une maison ?',
      sub: (v) => `Écrivez${v ? ' ou parlez' : ''} — nous trouvons.`,
      placeholder: 'Je voudrais acheter un T2 ou T3 jusqu\u2019à 350 000€, neuf ou récent, à Vila Nova de Gaia, avec balcon et parking.',
      button: 'Avez-vous ce que je cherche ? 🔍',
    },
    de: {
      title: 'Was suchen Sie in einem Zuhause?',
      sub: (v) => `Schreiben${v ? ' oder sprechen' : ''} Sie — wir finden es.`,
      placeholder: 'Ich möchte eine 2- oder 3-Zimmer-Wohnung bis 350.000€ kaufen, neu oder neuwertig, in Vila Nova de Gaia, mit Balkon und Stellplatz.',
      button: 'Haben Sie, was ich suche? 🔍',
    },
    nl: {
      title: 'Wat zoekt u in een huis?',
      sub: (v) => `Typ${v ? ' of spreek' : ''} — wij vinden het.`,
      placeholder: 'Ik zou graag een 2- of 3-kamerwoning kopen tot €350.000, nieuw of recent, in Vila Nova de Gaia, met balkon en parkeerplaats.',
      button: 'Heeft u wat ik zoek? 🔍',
    },
    ru: {
      title: 'Что вы ищете в доме?',
      sub: (v) => `Напишите${v ? ' или скажите' : ''} — мы найдём.`,
      placeholder: 'Я хотел бы купить 2- или 3-комнатную квартиру до 350 000€, новую или недавнюю, в Вила-Нова-де-Гайя, с балконом и парковкой.',
      button: 'Есть ли у вас то, что я ищу? 🔍',
    },
  };
  const ui = UI_TEXT[lang] || UI_TEXT.pt;

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: 24 }}>
      <h3 className="display" style={{ fontSize: 24, marginBottom: 8, fontWeight: 600 }}>{ui.title}</h3>
      <p style={{ fontSize: 15, color: 'var(--text-soft)', marginBottom: 16 }}>
        {ui.sub(voiceSupported)}
      </p>
      <div style={{ position: 'relative', marginTop: 30 }}>
        <div style={{
          position: 'absolute', top: -34, left: 0, right: 0, height: 24,
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
          rows={4}
          value={listening && interimText ? `${text}${text ? ' ' : ''}${interimText}` : text}
          onChange={(e) => { setText(e.target.value); baseTextRef.current = e.target.value; }}
          placeholder={ui.placeholder}
          style={{
            width: '100%', padding: 14, paddingRight: voiceSupported ? 52 : 14, border: listening ? '2px solid #b8452f' : '1px solid var(--line)', borderRadius: 6,
            fontFamily: 'Inter, sans-serif', fontSize: 15.5, resize: 'vertical', boxSizing: 'border-box', marginBottom: 12,
          }}
        />
        {voiceSupported && (
          <button
            type="button"
            onClick={toggleListening}
            aria-label={listening ? 'Parar de gravar' : 'Falar em vez de escrever'}
            title={listening ? 'A gravar... clica para terminar' : 'Falar em vez de escrever'}
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
