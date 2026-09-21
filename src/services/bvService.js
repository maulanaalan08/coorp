// src/services/bvService.js
import { fetchAPI } from './api';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const bvService = {
  // Ambil semua item BV untuk project tertentu
  getByProjectId: (projectId) =>
    fetchAPI(`/projects/${projectId}/bv-items`, { headers: authHeaders() }),

  // Tambah item BV baru (Header / Regular item / Child item)
  create: (projectId, data) =>
    fetchAPI(`/projects/${projectId}/bv-items`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }),

  // Edit item BV
  update: (id, data) =>
    fetchAPI(`/bv-items/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }),

  // Hapus single item BV
  delete: (id) =>
    fetchAPI(`/bv-items/${id}`, { method: 'DELETE', headers: authHeaders() }),

  // Hapus massal item BV
  deleteBulk: (itemIds) =>
    fetchAPI(`/bv-items-bulk`, {
      method: 'DELETE',
      headers: authHeaders(),
      body: JSON.stringify({ itemIds }),
    }),

  // Link single BV item ke RAB
  linkToRab: (id, data = {}) =>
    fetchAPI(`/bv-items/${id}/link-to-rab`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }),

  // Link massal BV items ke RAB
  linkToRabBulk: (itemIds) =>
    fetchAPI(`/bv-items-bulk/link-to-rab`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ itemIds }),
    }),
    
    // 💡 TAMBAHKAN ENDPOINT SYNC DI SINI 💡
  syncToRab: (id) =>
    fetchAPI(`/bv-items/${id}/sync`, {
      method: 'POST',
      headers: authHeaders(),
    }),

  syncBulk: (itemIds) =>
    fetchAPI(`/bv-items-bulk/sync`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds }),
    }),

  // Export Backup Volume ke Excel
  exportExcel: (projectId) => {
    const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/projects/${projectId}/bv-items/export-excel`, {
      method: 'GET',
      headers,
    }).then(async (res) => {
      if (!res.ok) throw new Error('Gagal export Excel');
      const disposition = res.headers.get('content-disposition');
      let filename = 'Backup_Volume.xlsx';
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    });
  },
};
