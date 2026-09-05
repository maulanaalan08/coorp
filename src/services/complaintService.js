import { fetchAPI } from './api';

// Fallback untuk open new tab (karena fetchAPI dipakai untuk async/await fetch)
const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:4000/api';

export const complaintService = {
  getComplaintsByProject: async (projectId) => {
    return fetchAPI(`/projects/${projectId}/complaints`);
  },

  getComplaintById: async (id) => {
    return fetchAPI(`/complaints/${id}`);
  },

  createComplaint: async (projectId, formData) => {
    return fetchAPI(`/projects/${projectId}/complaints`, {
      method: 'POST',
      body: formData,
      // fetchAPI secara otomatis mengatur boundary untuk multipart/form-data
    });
  },

  updateComplaint: async (id, formData) => {
    return fetchAPI(`/complaints/${id}`, {
      method: 'PUT',
      body: formData,
    });
  },

  deleteComplaint: async (id) => {
    return fetchAPI(`/complaints/${id}`, {
      method: 'DELETE',
    });
  },

  downloadPdf: (id) => {
    window.open(`${API_URL}/complaints/${id}/pdf/view`, '_blank');
  },

  downloadBast2Pdf: (id) => {
    window.open(`${API_URL}/complaints2/${id}/pdf/view`, '_blank');
  }
};