// src/services/workCategoryService.js
import { fetchAPI } from './api';

export const workCategoryService = {
  // GET /api/work-categories — daftar semua kategori
  getAll: () => fetchAPI('/work-categories'),

  // POST /api/work-categories — buat kategori baru
  create: (data) =>
    fetchAPI('/work-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // PUT /api/work-categories/:id — update kategori
  update: (id, data) =>
    fetchAPI(`/work-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // GET /api/work-categories/:id/references — ringkasan dampak hapus
  getReferences: (id) => fetchAPI(`/work-categories/${id}/references`),

  // DELETE /api/work-categories/:id — hapus permanen kategori
  remove: (id) =>
    fetchAPI(`/work-categories/${id}`, {
      method: 'DELETE',
    }),
};
