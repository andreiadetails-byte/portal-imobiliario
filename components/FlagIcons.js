// Bandeiras desenhadas diretamente em SVG, simplificadas mas reconhecíveis.
// Isto evita dois problemas que já tivemos: emojis de bandeira que o
// Windows não sabe desenhar (mostra "PT" em vez do símbolo), e imagens
// vindas de um serviço externo que pode falhar ou ficar bloqueado.

const flagStyle = { display: 'block', borderRadius: 2, flexShrink: 0 };

export function FlagPT({ size = 18 }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 30 20" style={flagStyle}>
      <rect width="30" height="20" fill="#FF0000" />
      <rect width="12" height="20" fill="#006600" />
      <circle cx="12" cy="10" r="4" fill="#FFCC00" stroke="#FF0000" strokeWidth="0.5" />
    </svg>
  );
}
export function FlagGB({ size = 18 }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 30 20" style={flagStyle}>
      <rect width="30" height="20" fill="#00247D" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#fff" strokeWidth="4" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#CF142B" strokeWidth="1.5" />
      <path d="M15,0 V20 M0,10 H30" stroke="#fff" strokeWidth="6" />
      <path d="M15,0 V20 M0,10 H30" stroke="#CF142B" strokeWidth="3" />
    </svg>
  );
}
export function FlagES({ size = 18 }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 30 20" style={flagStyle}>
      <rect width="30" height="20" fill="#AA151B" />
      <rect y="5" width="30" height="10" fill="#F1BF00" />
    </svg>
  );
}
export function FlagFR({ size = 18 }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 30 20" style={flagStyle}>
      <rect width="10" height="20" fill="#0055A4" />
      <rect x="10" width="10" height="20" fill="#fff" />
      <rect x="20" width="10" height="20" fill="#EF4135" />
    </svg>
  );
}
export function FlagDE({ size = 18 }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 30 20" style={flagStyle}>
      <rect width="30" height="6.67" fill="#000" />
      <rect y="6.67" width="30" height="6.67" fill="#DD0000" />
      <rect y="13.33" width="30" height="6.67" fill="#FFCE00" />
    </svg>
  );
}
export function FlagNL({ size = 18 }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 30 20" style={flagStyle}>
      <rect width="30" height="6.67" fill="#AE1C28" />
      <rect y="6.67" width="30" height="6.67" fill="#fff" />
      <rect y="13.33" width="30" height="6.67" fill="#21468B" />
    </svg>
  );
}
export function FlagRU({ size = 18 }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 30 20" style={flagStyle}>
      <rect width="30" height="6.67" fill="#fff" />
      <rect y="6.67" width="30" height="6.67" fill="#0039A6" />
      <rect y="13.33" width="30" height="6.67" fill="#D52B1E" />
    </svg>
  );
}
export function FlagIT({ size = 18 }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 30 20" style={flagStyle}>
      <rect width="10" height="20" fill="#009246" />
      <rect x="10" width="10" height="20" fill="#fff" />
      <rect x="20" width="10" height="20" fill="#CE2B37" />
    </svg>
  );
}
export function FlagPL({ size = 18 }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 30 20" style={flagStyle}>
      <rect width="30" height="10" fill="#fff" />
      <rect y="10" width="30" height="10" fill="#DC143C" />
    </svg>
  );
}
export function FlagSE({ size = 18 }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 30 20" style={flagStyle}>
      <rect width="30" height="20" fill="#006AA7" />
      <rect x="11" width="4" height="20" fill="#FECC00" />
      <rect y="8" width="30" height="4" fill="#FECC00" />
    </svg>
  );
}
export function FlagUA({ size = 18 }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 30 20" style={flagStyle}>
      <rect width="30" height="10" fill="#005BBB" />
      <rect y="10" width="30" height="10" fill="#FFD500" />
    </svg>
  );
}
export function FlagCN({ size = 18 }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 30 20" style={flagStyle}>
      <rect width="30" height="20" fill="#DE2910" />
      <path d="M5,3 L6.2,6.5 L9.8,6.5 L6.9,8.6 L8,12 L5,9.9 L2,12 L3.1,8.6 L0.2,6.5 L3.8,6.5 Z" fill="#FFDE00" />
      <circle cx="12" cy="2.5" r="1" fill="#FFDE00" />
      <circle cx="14" cy="5" r="1" fill="#FFDE00" />
      <circle cx="14" cy="8.5" r="1" fill="#FFDE00" />
      <circle cx="12" cy="10.5" r="1" fill="#FFDE00" />
    </svg>
  );
}
export function FlagSA({ size = 18 }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 30 20" style={flagStyle}>
      <rect width="30" height="20" fill="#006C35" />
      <rect y="8" width="30" height="1.4" fill="#fff" />
      <rect y="11.5" width="18" height="1.4" fill="#fff" />
    </svg>
  );
}

export const FLAG_COMPONENTS = {
  pt: FlagPT, gb: FlagGB, es: FlagES, fr: FlagFR, de: FlagDE, nl: FlagNL,
  ru: FlagRU, it: FlagIT, pl: FlagPL, se: FlagSE, ua: FlagUA, cn: FlagCN, sa: FlagSA,
};
