import { fetchAPI } from './api';

// Fallback untuk open new tab (karena fetchAPI dipakai untuk async/await fetch)
const rawApi = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '');
const API_URL = rawApi ? `${rawApi}/api` : '/api';

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
  },

  // (Deprecated) previously generate PDF directly, now use createBast2
  generateBast2Pdf: async (id, formData) => {
    const params = new URLSearchParams(formData).toString();
    window.open(`${API_URL}/complaints/${id}/bast2/pdf?${params}`, '_blank');
  },

  // --- NEW: BAST 2 History API ---
  getBast2List: async (projectId) => {
    return fetchAPI(`/projects/${projectId}/bast2`);
  },

  createBast2: async (projectId, complaintReportId, formData) => {
    return fetchAPI(`/projects/${projectId}/bast2`, {
      method: 'POST',
      body: JSON.stringify({
        complaintReportId,
        ...formData
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  },

  deleteBast2: async (bast2Id) => {
    return fetchAPI(`/bast2/${bast2Id}`, {
      method: 'DELETE',
    });
  },

  viewSavedBast2Pdf: (bast2Id) => {
    window.open(`${API_URL}/bast2/${bast2Id}/pdf`, '_blank');
  }
};