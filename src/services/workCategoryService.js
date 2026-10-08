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

  // Subkategori merupakan master global yang selalu berada di bawah kategori.
  getSubcategories: (categoryId) =>
    fetchAPI(`/work-categories/${categoryId}/subcategories`),

  createSubcategory: (categoryId, data) =>
    fetchAPI(`/work-categories/${categoryId}/subcategories`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSubcategory: (categoryId, id, data) =>
    fetchAPI(`/work-categories/${categoryId}/subcategories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getSubcategoryReferences: (categoryId, id) =>
    fetchAPI(`/work-categories/${categoryId}/subcategories/${id}/references`),

  removeSubcategory: (categoryId, id) =>
    fetchAPI(`/work-categories/${categoryId}/subcategories/${id}`, {
      method: 'DELETE',
    }),

  // DELETE /api/work-categories/:id — hapus permanen kategori
  remove: (id) =>
    fetchAPI(`/work-categories/${id}`, {
      method: 'DELETE',
    }),
};
