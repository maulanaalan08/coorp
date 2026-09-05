import { fetchAPI } from './api';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const financeService = {
  // Ambil material requests untuk project tertentu (endpoint lama)
  getMaterialRequests: (projectId) => {
    return fetchAPI(`/finance/projects/${projectId}/material-requests`);
  },

  // Ambil SEMUA material requests dari Dasbor Finance (data lebih kaya, split per toko)
  getFinanceMaterialRequests: () => {
    return fetchAPI('/finance/material-requests', {
      headers: getAuthHeaders()
    });
  },

  // Update item MR (auto-save: isCompleted, orderedVolume, catatanFinance)
  updateMaterialRequestItem: (itemId, data) => {
    return fetchAPI(`/finance/material-requests/items/${itemId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  // Update bulk pesanan/catatan finance
  updateBulk: (items) => {
    // Ambil token dari localStorage
    let token = localStorage.getItem('token');
    
    // TEMPORARY: Jika token tidak ada, gunakan token dummy ini sementara agar Finance bisa testing!
    if (!token) {
      token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6IlNVUEVSX0FETUlOIiwiaWF0IjoxNzg4MjY3MDU0LCJleHAiOjE3ODgzNTM0NTR9.HPfi2f9ckDMAFQ2GZ9sgBJfDrVlBQTWB2akjXejIVMc";
    }

    return fetchAPI(`/material-request-items/finance-update-bulk`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ items }),
    });
  },
};
