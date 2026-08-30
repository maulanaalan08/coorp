// src/services/hspkService.js
import { fetchAPI } from './api';

export const hspkService = {
  // Get available period/discipline/grade combos
  getAvailableCombos: () => fetchAPI('/hspk/available-combos'),

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