import { fetchAPI } from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:4000/api';

export const bastService = {
  // Ambil list BAST berdasarkan project
  getBastList: (projectId) => 
    fetchAPI(`/projects/${projectId}/bast`),

  // Buat BAST baru (menggunakan FormData karena ada file foto)
  createBast: (projectId, formData) => 
    fetchAPI(`/projects/${projectId}/bast`, {
      method: 'POST',
      body: formData,
    }),

  // Update BAST (menggunakan FormData)
  updateBast: (id, formData) => 
    fetchAPI(`/bast/${id}`, {
      method: 'PUT',
      body: formData,
    }),

  // Hapus BAST
  deleteBast: (id) => 
    fetchAPI(`/bast/${id}`, {
      method: 'DELETE',
    }),

  // URL Helpers untuk View & Download PDF
  getPdfViewUrl: (id) => `${API_BASE_URL}/bast/${id}/pdf/view`,
  getPdfDownloadUrl: (id) => `${API_BASE_URL}/bast/${id}/pdf/download`,
};
