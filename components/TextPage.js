'use client';

import Header from './Header';

export default function TextPage({ title, children }) {
  return (
    <>
      <Header />
      <div className="wrap" style={{ maxWidth: 720, padding: '48px 32px 80px' }}>
        <h1 className="display" style={{ fontSize: 30, marginBottom: 24 }}>{title}</h1>
        <div style={{ fontSize: 14.5, color: 'var(--text-soft)', lineHeight: 1.7 }}>
          {children}
        </div>
      </div>
    </>
  );
}
