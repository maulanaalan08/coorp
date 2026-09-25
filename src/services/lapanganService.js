// src/services/lapanganService.js
import { fetchAPI } from './api';

export const lapanganService = {
  // Ambil material requests untuk project tertentu (sudah dipecah per toko)
  getMaterialRequests: (projectId) =>
    fetchAPI(`/finance/projects/${projectId}/material-requests`),

  // Update progress lapangan 1 baris barang (kirim poItemId, bukan mrItemId)
  updateItem: (poItemId, data) =>
    fetchAPI(`/po-items/${poItemId}/lapangan-update`, {
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

  // Upload Surat Jalan Borongan (Bulk) — multipart (foto + items JSON)
  uploadBulkSuratJalan: (formData) =>
    fetchAPI(`/surat-jalan/bulk`, {
      method: 'POST',
      body: formData,
    }),

  // Ambil Riwayat Surat Jalan
  getSuratJalanHistory: (poItemId) =>
    fetchAPI(`/surat-jalan/${poItemId}`),

  // ===== PERMINTAAN HABIS PAKAI =====
  getPermintaanHabisPakai: (projectId, status) => {
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    if (status) params.set('status', status);
    const qs = params.toString();
    return fetchAPI(`/permintaan-habis-pakai${qs ? `?${qs}` : ''}`);
  },
  createPermintaanHabisPakai: (data) =>
    fetchAPI('/permintaan-habis-pakai', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  linkPermintaanHabisPakai: (id, poHabisPakaiId) =>
    fetchAPI(`/permintaan-habis-pakai/${id}/link`, {
      method: 'PUT',
      body: JSON.stringify({ poHabisPakaiId }),
    }),
  rejectPermintaanHabisPakai: (id, alasan) =>
    fetchAPI(`/permintaan-habis-pakai/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ alasan }),
    }),

  // Riwayat pembelian habis pakai (permintaan + PO habis pakai + kelebihan terima)
  getRiwayatHabisPakai: (projectId) => {
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    return fetchAPI(`/riwayat-habis-pakai${qs}`);
  },
};
