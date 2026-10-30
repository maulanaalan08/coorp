// src/services/api.js
const rawApi = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '');
export const API_BASE_URL = rawApi ? `${rawApi}/api` : '/api';

// Origin server backend (tanpa /api) — dipakai buat buka file upload
export const FILE_BASE_URL = rawApi || '';

// Foto Surat Jalan disimpan sebagai path relatif ("/uploads/surat-jalan/xxx.jpg")
export const fileUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  return `${FILE_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

// Flag untuk mencegah multiple 401 triggers bersamaan
let _authExpiredDispatched = false;

export const fetchAPI = async (endpoint, options = {}) => {
  const headers = { ...options.headers };

  // Tambahkan Authorization token jika tersedia di localStorage
  try {
    const token = localStorage.getItem('token');
    if (token && !headers['Authorization'] && !headers['authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // localStorage mungkin tidak tersedia di environment tertentu
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    // 401 = token expired atau tidak valid.
    // Trigger auto-logout SEKALI saja, lalu lempar error diam-diam
    // (caller tangani via .catch(() => []) dll).
    if (response.status === 401) {
      if (!_authExpiredDispatched) {
        _authExpiredDispatched = true;
        // Hapus token expired dari localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Beri sinyal ke App.jsx untuk redirect ke login
        window.dispatchEvent(new CustomEvent('auth-expired'));
        // Reset flag setelah redirect
        setTimeout(() => { _authExpiredDispatched = false; }, 1000);
      }
      throw new Error('Sesi login telah berakhir. Silakan login kembali.');
    }
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || errorData?.error || `HTTP Error: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export const fetchAPIBlob = async (endpoint, options = {}) => {
  const headers = { ...options.headers };

  try {
    const token = localStorage.getItem('token');
    if (token && !headers['Authorization'] && !headers['authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    if (response.status === 401) {
      if (!_authExpiredDispatched) {
        _authExpiredDispatched = true;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('auth-expired'));
        setTimeout(() => {
          _authExpiredDispatched = false;
        }, 1000);
      }
      throw new Error('Sesi login telah berakhir. Silakan login kembali.');
    }

    const text = await response.text().catch(() => '');
    throw new Error(text || `HTTP Error: ${response.status}`);
  }

  return response.blob();
};
