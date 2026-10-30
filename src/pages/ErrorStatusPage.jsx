import React from 'react';
import { NavContext } from '../contexts/NavContext';

const ERROR_COPY = {
  403: {
    code: '403',
    label: 'Akses Ditolak',
    title: 'Area terbatas untuk peran Anda.',
    description: 'Halaman ini tidak termasuk ruang kerja yang dibuka untuk role Anda. Jika akses ini seharusnya ada, hubungi Owner agar template akses disesuaikan.',
  },
  404: {
    code: '404',
    label: 'Halaman Tidak Ditemukan',
    title: 'Alamat ini tidak membawa ke mana pun.',
    description: 'Halaman yang Anda cari sudah dipindahkan atau tidak pernah ada. Periksa alamat URL atau kembali ke ruang kerja utama.',
  },
};

// Halaman error profesional: dipakai PageGuard (403) dan fallback rute tidak dikenal (404).
export const ErrorStatusPage = ({ status, pageLabel, onBackHome }) => {
  const navigate = React.useContext(NavContext);
  const copy = ERROR_COPY[status] || ERROR_COPY[404];
  const backHome = onBackHome || (navigate ? () => navigate('dashboard') : null);
  const page = pageLabel || copy.label;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: '48px 24px', background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201,162,75,.07), transparent)' }}>
      <div style={{ maxWidth: 480, textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '.28em', color: '#5e5545' }}>ERROR {copy.code}</span>
          <span style={{ display: 'block', height: 1, width: 48, background: '#3d3422' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '.28em', color: '#c9a24b' }}>{copy.label.toUpperCase()}</span>
        </div>

        <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 300, fontSize: 'clamp(56px, 8vw, 88px)', lineHeight: 1, color: '#f2ead9', marginBottom: 20, letterSpacing: '-0.02em' }}>
          {copy.code}<span style={{ color: '#c9a24b' }}>.</span>
        </div>

        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, fontSize: 'clamp(24px, 3vw, 32px)', lineHeight: 1.2, color: '#f2ead9', margin: '0 0 14px' }}>
          {page !== copy.label ? `${page} — ` : ''}{copy.title}
        </h1>

        <p style={{ fontFamily: "'Manrope', -apple-system, sans-serif", fontSize: 14, lineHeight: 1.7, color: '#a89c85', margin: '0 0 34px' }}>
          {copy.description}
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {backHome ? (
            <button
              type="button"
              onClick={backHome}
              style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: 13, letterSpacing: '.02em', padding: '11px 22px', borderRadius: 6, border: '1px solid #c9a24b', background: '#c9a24b', color: '#0c0b09', cursor: 'pointer' }}
            >
              Ke Dashboard
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => window.history.back()}
            style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: 13, letterSpacing: '.02em', padding: '11px 22px', borderRadius: 6, border: '1px solid #2a2318', background: 'transparent', color: '#a89c85', cursor: 'pointer' }}
          >
            Kembali
          </button>
        </div>
      </div>
    </div>
  );
};
