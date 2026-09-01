import { fetchAPI } from './api';

export const financeService = {
  // Ambil material requests untuk project tertentu
  getMaterialRequests: (projectId) => {
    return fetchAPI(`/projects/${projectId}/material-requests`);
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
