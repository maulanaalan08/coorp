import React from 'react';

/**
 * Alert — menampilkan pesan sukses atau error dengan icon dan animasi.
 * Gunakan key={message} di parent agar animasi re-trigger setiap pesan baru.
 */
export default function Alert({ message, type }) {
  if (!message) return null;

  const icon = type === 'success' ? '✓' : '✕';

  return (
    <div className={`auth-alert ${type}`}>
      <span className="auth-alert-icon">{icon}</span>
      <span>{message}</span>
    </div>
  );
}