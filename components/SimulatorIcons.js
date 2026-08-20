'use client';

export function CreditIcon({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path d="M10 34L32 16l22 18" stroke="var(--telha)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 30v20a2 2 0 0 0 2 2h28a2 2 0 0 0 2-2V30" stroke="var(--telha)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="40" r="7" fill="var(--brass)" />
      <path d="M32 37v6M29.5 38.5h5M29.5 41.5h5" stroke="#5C4E2A" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ImtIcon({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <rect x="14" y="8" width="36" height="48" rx="3" stroke="var(--telha)" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M21 20h22M21 28h22M21 36h14" stroke="var(--telha)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="42" cy="46" r="11" fill="var(--brass)" />
      <path d="M37 46l3.5 3.5L47 43" stroke="#5C4E2A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RentBuyIcon({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path d="M32 10v6" stroke="var(--telha)" strokeWidth="3" strokeLinecap="round" />
      <path d="M14 16h36" stroke="var(--telha)" strokeWidth="3" strokeLinecap="round" />
      <path d="M14 16L8 30h12l-6-14z" stroke="var(--telha)" strokeWidth="3" strokeLinejoin="round" fill="var(--brass)" />
      <path d="M50 16l-6 14h12l-6-14z" stroke="var(--telha)" strokeWidth="3" strokeLinejoin="round" fill="var(--brass)" />
      <path d="M8 30a6 6 0 0 0 12 0M44 30a6 6 0 0 0 12 0" stroke="var(--telha)" strokeWidth="3" strokeLinecap="round" />
      <rect x="24" y="42" width="16" height="14" rx="1.5" stroke="var(--telha)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M24 42l8-8 8 8" stroke="var(--telha)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
