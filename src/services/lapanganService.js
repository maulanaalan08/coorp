// src/services/lapanganService.js
import { fetchAPI } from './api';

export const lapanganService = {
  // Ambil material requests untuk project tertentu (sudah dipecah per toko)
  getMaterialRequests: (projectId) =>
    fetchAPI(`/projects/${projectId}/material-requests`),

  // Update progress lapangan 1 item (tanggalOnsite, updateLapangan)
  // Hanya bisa jika status Finance bukan PENDING
  updateItem: (id, data) =>
    fetchAPI(`/material-request-items/${id}/lapangan-update`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Update banyak item sekaligus
  // body: { items: [{ id, tanggalOnsite, updateLapangan }, ...] }
  updateBulk: (items) =>
    fetchAPI(`/material-request-items/lapangan-update-bulk`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    }),
};
