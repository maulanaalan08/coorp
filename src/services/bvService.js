// src/services/bvService.js
import { fetchAPI } from './api';

export const bvService = {
  // Ambil semua item BV untuk project tertentu
  getByProjectId: (projectId) =>
    fetchAPI(`/projects/${projectId}/bv-items`),

  // Tambah item BV baru (Header / Regular item / Child item)
  create: (projectId, data) =>
    fetchAPI(`/projects/${projectId}/bv-items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Edit item BV
  update: (id, data) =>
    fetchAPI(`/bv-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Hapus single item BV
  delete: (id) =>
    fetchAPI(`/bv-items/${id}`, { method: 'DELETE' }),

  // Hapus massal item BV
  deleteBulk: (itemIds) =>
    fetchAPI(`/bv-items-bulk`, {
      method: 'DELETE',
      body: JSON.stringify({ itemIds }),
    }),

  // Link single BV item ke RAB
  linkToRab: (id, data = {}) =>
    fetchAPI(`/bv-items/${id}/link-to-rab`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Link massal BV items ke RAB
  linkToRabBulk: (itemIds) =>
    fetchAPI(`/bv-items-bulk/link-to-rab`, {
      method: 'POST',
      body: JSON.stringify({ itemIds }),
    }),
};
