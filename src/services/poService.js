import { fetchAPI } from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:4000/api';

// Helper to get auth headers (assuming token might be required)
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const poService = {
  // Ambil daftar supplier
  getSuppliers: () => {
    return fetchAPI('/suppliers', {
      headers: getAuthHeaders()
    });
  },

  // Ambil daftar PO
  getPOs: () => {
    return fetchAPI('/po', {
      headers: getAuthHeaders()
    });
  },

  // Ambil detail 1 PO untuk dicetak
  getPOById: (id) => {
    return fetchAPI(`/po/${id}`, {
      headers: getAuthHeaders()
    });
  },

  // Buat PO baru
  createPO: (poData) => {
    return fetchAPI('/po', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(poData),
    });
  },

  // Approve PO
  approvePO: (id) => {
    // Berdasarkan request user: aksi approve merubah status menjadi approve
    return fetchAPI(`/po/${id}/approve`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
  },

  // Fungsi khusus buka PDF/Print page di window baru
  printPO: (id) => {
    window.open(`/?print-po=${id}`, '_blank');
  }
};
