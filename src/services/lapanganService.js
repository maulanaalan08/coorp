// src/services/lapanganService.js
import { fetchAPI } from './api';

export const lapanganService = {
  // Ambil material requests untuk project tertentu (sudah dipecah per toko)
  getMaterialRequests: (projectId) =>
    fetchAPI(`/finance/projects/${projectId}/material-requests`),

  // Update progress lapangan 1 item (tanggalOnsite, updateLapangan)
  updateItem: (id, data) =>
    fetchAPI(`/material-request-items/${id}/lapangan-update`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Update banyak item sekaligus
  updateBulk: (items) =>
    fetchAPI(`/po-items/lapangan-update-bulk`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    }),

  // Upload Surat Jalan dengan Foto
  uploadSuratJalan: (poItemId, formData) =>
    fetchAPI(`/po-items/${poItemId}/surat-jalan`, {
      method: 'POST',
      body: formData, // FormData doesn't need Content-Type header in fetch API, browser sets it automatically with boundary
    }),

  // Upload Surat Jalan Borongan (Bulk) dengan JSON payload
  uploadBulkSuratJalan: (payload) =>
    fetchAPI(`/surat-jalan/bulk`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Ambil Riwayat Surat Jalan
  getSuratJalanHistory: (poItemId) =>
    fetchAPI(`/surat-jalan/${poItemId}`),
};
