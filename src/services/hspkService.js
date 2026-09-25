// src/services/hspkService.js
import { fetchAPI } from './api';

export const hspkService = {
  // Get available period/discipline/grade combos
  getAvailableCombos: () => fetchAPI('/hspk/available-combos'),

  // Get grades for a specific period + discipline
  getGradesByPeriodDiscipline: (period, discipline) =>
    fetchAPI(`/hspk/grades?period=${encodeURIComponent(period)}&discipline=${encodeURIComponent(discipline)}`),

  // Get grades for a specific period + dynamic work category
  getGradesByPeriodCategory: (period, workCategoryId) =>
    fetchAPI(`/hspk/grades?period=${encodeURIComponent(period)}&workCategoryId=${encodeURIComponent(workCategoryId)}`),

  // Get job types / AHSP master data for modals
  getJobTypes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/hspk/jobtypes${query ? `?${query}` : ''}`);
  },

  // Riwayat upload (daftar batch AHSP yang sudah masuk)
  getBatches: () => fetchAPI('/uploads'),

  // Hapus satu batch upload beserta data AHSP-nya
  deleteBatch: (id) =>
    fetchAPI(`/uploads/${id}`, { method: 'DELETE' }),

  // Upload HSPK/AHSP Excel file
  upload: (formData) =>
    fetchAPI('/upload', {
      method: 'POST',
      body: formData,
    }),
};