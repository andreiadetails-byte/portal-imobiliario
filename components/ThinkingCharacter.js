'use client';

export default function ThinkingCharacter() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
      {/* Balão de pensamento */}
      <div style={{ position: 'relative', animation: 'bubble-in 0.6s ease 0.3s both' }}>
        <div style={{ position: 'absolute', bottom: -10, right: 8, width: 8, height: 8, borderRadius: '50%', background: 'var(--paper)', border: '1px solid var(--line)' }} />
        <div style={{ position: 'absolute', bottom: -20, right: 0, width: 5, height: 5, borderRadius: '50%', background: 'var(--paper)', border: '1px solid var(--line)' }} />
        <div className="card" style={{
          padding: '12px 16px', maxWidth: 220, fontSize: 13, fontWeight: 500, lineHeight: 1.4,
          position: 'relative',
        }}>
          Vender, comprar, alugar?
          <br />
          O <b style={{ color: 'var(--telha)' }}>More·ada</b> ajuda-me. 💭
        </div>
      </div>

      {/* Boneco com mais forma de pessoa, a "flutuar" suavemente */}
      <svg
        width="72" height="92" viewBox="0 0 72 92"
        style={{ animation: 'character-float 3s ease-in-out infinite', flexShrink: 0 }}
      >
        <ellipse cx="36" cy="88" rx="20" ry="4" fill="rgba(0,0,0,0.08)" />

        {/* Braços */}
        <path d="M15 58 C10 65 9 76 12 86" stroke="var(--telha)" strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M57 58 C62 65 63 76 60 86" stroke="var(--telha)" strokeWidth="9" fill="none" strokeLinecap="round" />

        {/* Corpo / blazer */}
        <path d="M16 88 C16 58 20 48 36 48 C52 48 56 58 56 88 Z" fill="var(--telha)" />
        {/* Lapelas */}
        <path d="M36 48 L28 62 L34 58 Z" fill="#3E4A32" />
        <path d="M36 48 L44 62 L38 58 Z" fill="#3E4A32" />
        {/* Camisa */}
        <path d="M31 50 L36 60 L41 50 L36 54 Z" fill="var(--paper)" />

        {/* Pescoço */}
        <rect x="30" y="36" width="12" height="12" rx="4" fill="var(--brass)" />

        {/* Cabeça */}
        <circle cx="36" cy="28" r="17" fill="var(--brass)" />
        {/* Cabelo */}
        <path d="M19 26 C18 12 54 12 53 26 C53 18 46 14 36 14 C26 14 19 18 19 26 Z" fill="#4A3423" />
        <path d="M19 24 C17 30 18 34 21 37 C19 31 20 26 21 23 Z" fill="#4A3423" />
        <path d="M53 24 C55 30 54 34 51 37 C53 31 52 26 51 23 Z" fill="#4A3423" />

        {/* Olhos e sorriso */}
        <circle cx="30" cy="27" r="2" fill="var(--ink)" />
        <circle cx="42" cy="27" r="2" fill="var(--ink)" />
        <path d="M29 34 Q36 39 43 34" stroke="var(--ink)" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}
