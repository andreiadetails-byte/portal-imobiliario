'use client';

export default function ThinkingCharacter() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
      {/* Boneco simples, a "flutuar" suavemente */}
      <svg
        width="64" height="84" viewBox="0 0 64 84"
        style={{ animation: 'character-float 3s ease-in-out infinite', flexShrink: 0 }}
      >
        <ellipse cx="32" cy="80" rx="18" ry="4" fill="rgba(0,0,0,0.08)" />
        <path d="M14 84 C14 55 18 46 32 46 C46 46 50 55 50 84 Z" fill="var(--telha)" />
        <circle cx="32" cy="26" r="16" fill="var(--brass)" />
        <circle cx="26" cy="24" r="2" fill="var(--ink)" />
        <circle cx="38" cy="24" r="2" fill="var(--ink)" />
        <path d="M25 32 Q32 37 39 32" stroke="var(--ink)" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>

      {/* Balão de pensamento */}
      <div style={{ position: 'relative', animation: 'bubble-in 0.6s ease 0.3s both' }}>
        <div style={{ position: 'absolute', bottom: -10, left: 8, width: 8, height: 8, borderRadius: '50%', background: 'var(--paper)', border: '1px solid var(--line)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: 0, width: 5, height: 5, borderRadius: '50%', background: 'var(--paper)', border: '1px solid var(--line)' }} />
        <div className="card" style={{
          padding: '12px 16px', maxWidth: 220, fontSize: 13, fontWeight: 500, lineHeight: 1.4,
          position: 'relative',
        }}>
          Vender, comprar, alugar?
          <br />
          O <b style={{ color: 'var(--telha)' }}>More·ada</b> ajuda-me. 💭
        </div>
      </div>
    </div>
  );
}
