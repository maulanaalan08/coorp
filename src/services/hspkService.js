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

  // Upload HSPK/AHSP Excel file
  upload: (formData) =>
    fetchAPI('/upload', {
      method: 'POST',
      body: formData,
    }),
};