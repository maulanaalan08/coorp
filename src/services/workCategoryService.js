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

  // DELETE /api/work-categories/:id — hapus/nonaktifkan kategori
  remove: (id) =>
    fetchAPI(`/work-categories/${id}`, {
      method: 'DELETE',
    }),
};
