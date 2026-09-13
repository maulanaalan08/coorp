import { fetchAPI } from './api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const purchasingService = {
  // ===== RETUR PEMBELIAN =====
  getReturPembelian: () => {
    return fetchAPI('/retur', { headers: getAuthHeaders() });
  },
  getReturDetail: (id) => {
    return fetchAPI(`/retur/${id}`, { headers: getAuthHeaders() });
  },
  createRetur: (data) => {
    return fetchAPI('/retur', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },
  updateRetur: (id, data) => {
    return fetchAPI(`/retur/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },
  deleteRetur: (id) => {
    return fetchAPI(`/retur/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  // ===== PENGAJUAN BAYAR =====
  getPengajuanBayar: (projectId) => {
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    return fetchAPI(`/pengajuan-bayar${qs}`, { headers: getAuthHeaders() });
  },
  getPengajuanDetail: (id) => {
    return fetchAPI(`/pengajuan-bayar/${id}`, { headers: getAuthHeaders() });
  },
  getInboxFinancePengajuan: (projectId) => {
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    return fetchAPI(`/pengajuan-bayar/inbox-finance${qs}`, { headers: getAuthHeaders() });
  },
  getInboxAtasanPengajuan: (projectId) => {
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    return fetchAPI(`/pengajuan-bayar/inbox-atasan${qs}`, { headers: getAuthHeaders() });
  },
  // PO yang sudah APPROVED dan belum diajukan bayar
  getPOSiapAjukan: (projectId) => {
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    return fetchAPI(`/pengajuan-bayar/po-siap-ajukan${qs}`, { headers: getAuthHeaders() });
  },
  // PO APPROVED + pengajuannya (untuk tabel "Daftar Pengajuan Bayar" yang
  // menampilkan NOMOR PO sebagai info utama, nomor PPB sebagai info sekunder)
  getPOApproved: (projectId) => {
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    return fetchAPI(`/pengajuan-bayar/po-approved${qs}`, { headers: getAuthHeaders() });
  },
  // PO yang sudah disetujui finance + pengajuan bayarnya (panel atasan)
  getRiwayatPembelian: (projectId) => {
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    return fetchAPI(`/pengajuan-bayar/riwayat-pembelian${qs}`, { headers: getAuthHeaders() });
  },
  verifyPengajuan: (id, catatanFinance = '') => {
    return fetchAPI(`/pengajuan-bayar/${id}/verify`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ catatanFinance }),
    });
  },
  cancelRejectPengajuan: (id) => {
    return fetchAPI(`/pengajuan-bayar/${id}/cancel-reject`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    });
  },
  createPengajuan: (data) => {
    return fetchAPI('/pengajuan-bayar', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },
  approvePengajuan: (id) => {
    return fetchAPI(`/pengajuan-bayar/${id}/approve`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    });
  },
  rejectPengajuan: (id, reason) => {
    return fetchAPI(`/pengajuan-bayar/${id}/reject`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
  },

  // ===== PEMBAYARAN SUPPLIER =====
  getPembayaranSupplier: () => {
    return fetchAPI('/pembayaran-supplier', { headers: getAuthHeaders() });
  },
  getPembayaranDetail: (id) => {
    return fetchAPI(`/pembayaran-supplier/${id}`, { headers: getAuthHeaders() });
  },
  createPembayaran: (data) => {
    return fetchAPI('/pembayaran-supplier', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },
  updatePembayaran: (id, data) => {
    return fetchAPI(`/pembayaran-supplier/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  // ===== INVOICE PENAGIHAN =====
  getInvoicePenagihan: () => {
    return fetchAPI('/invoice-penagihan', { headers: getAuthHeaders() });
  },
  getInvoiceDetail: (id) => {
    return fetchAPI(`/invoice-penagihan/${id}`, { headers: getAuthHeaders() });
  },
  createInvoice: (data) => {
    return fetchAPI('/invoice-penagihan', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },
  updateInvoice: (id, data) => {
    return fetchAPI(`/invoice-penagihan/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  // ===== LAPORAN HARIAN =====
  getLaporanHarian: (tanggal) => {
    return fetchAPI(`/laporan-harian?tanggal=${encodeURIComponent(tanggal)}`, {
      headers: getAuthHeaders(),
    });
  },
  getLaporanRange: (from, to) => {
    return fetchAPI(`/laporan-harian/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
      headers: getAuthHeaders(),
    });
  },
};
