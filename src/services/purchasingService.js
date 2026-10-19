import { fetchAPI, API_BASE_URL } from './api';

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
  // Monitoring Budget RAP vs PO & Over Budget
  getBudgetMonitoring: (projectId) => {
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    return fetchAPI(`/pengajuan-bayar/budget-monitoring${qs}`, { headers: getAuthHeaders() });
  },
  // Keputusan Approval/Reject di tingkat item (Opsi B)
  processItemDecisions: (id, decisions, generalRejectReason = '') => {
    return fetchAPI(`/pengajuan-bayar/${id}/item-decision`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ decisions, generalRejectReason }),
    });
  },
  // Bulk approve banyak pengajuan
  bulkApprovePengajuan: (ids) => {
    return fetchAPI('/pengajuan-bayar/bulk-approve', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids }),
    });
  },
  // Bulk reject banyak pengajuan
  bulkRejectPengajuan: (ids, reason) => {
    return fetchAPI('/pengajuan-bayar/bulk-reject', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids, reason }),
    });
  },

  // ===== PEMBAYARAN SUPPLIER & FINANCE =====
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
  getInvoiceSupplierPdfBlob: async (id, entryIndex) => {
    const token = localStorage.getItem('token');
    const q = entryIndex !== undefined && entryIndex !== null ? `?entryIndex=${entryIndex}` : '';
    const res = await fetch(`${API_BASE_URL}/pembayaran-supplier/${id}/invoice-pdf${q}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || `Gagal mengunduh invoice PDF (${res.status})`);
    }
    return res.blob();
  },
  printInvoiceSupplier: async (id, entryIndex) => {
    const blob = await purchasingService.getInvoiceSupplierPdfBlob(id, entryIndex);
    const fileURL = URL.createObjectURL(blob);
    window.open(fileURL, '_blank');
  },
  approveFinancePembayaran: (id) => {
    return fetchAPI(`/pembayaran-supplier/${id}/approve-finance`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    });
  },
  approveAtasanPembayaran: (id) => {
    return fetchAPI(`/pembayaran-supplier/${id}/approve-atasan`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    });
  },
  kirimKasBankPembayaran: (id, data = {}) => {
    return fetchAPI(`/pembayaran-supplier/${id}/kirim-kas-bank`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },
  rejectPembayaran: (id, reason) => {
    return fetchAPI(`/pembayaran-supplier/${id}/reject`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
  },
  bulkApproveAtasanPembayaran: (ids) => {
    return fetchAPI('/pembayaran-supplier/bulk-approve-atasan', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids }),
    });
  },
  bulkRejectPembayaran: (ids, reason) => {
    return fetchAPI('/pembayaran-supplier/bulk-reject', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids, reason }),
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
