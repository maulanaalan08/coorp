import { fetchAPI } from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:4000/api';

// Helper to get auth headers (assuming token might be required)
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const poService = {
  // AHSP Mapping
  getAhspMappingSuggest: (itemName) => {
    return fetchAPI(`/finance/ahsp-mapping/suggest?itemName=${encodeURIComponent(itemName)}`, {
      headers: getAuthHeaders()
    });
  },
  saveAhspMapping: (payload) => {
    return fetchAPI('/finance/ahsp-mapping', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  // Ambil daftar supplier
  getSuppliers: () => {
    return fetchAPI('/suppliers', {
      headers: getAuthHeaders()
    });
  },

  // Ambil daftar master jasa
  getJasa: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return fetchAPI(`/jasa${qs ? `?${qs}` : ''}`, {
      headers: getAuthHeaders()
    });
  },

  createJasa: (payload) => {
    return fetchAPI('/jasa', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  updateJasa: (id, payload) => {
    return fetchAPI(`/jasa/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  deleteJasa: (id) => {
    return fetchAPI(`/jasa/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  // Histori Nilai Kontrak Jasa
  getNilaiKontrakHistory: (jasaId) => {
    return fetchAPI(`/jasa/${jasaId}/nilai-kontrak`, {
      headers: getAuthHeaders(),
    });
  },

  addNilaiKontrak: (jasaId, payload) => {
    return fetchAPI(`/jasa/${jasaId}/nilai-kontrak`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  deleteNilaiKontrak: (entryId) => {
    return fetchAPI(`/jasa/nilai-kontrak/${entryId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  // Tambah supplier baru
  createSupplier: (supplierData) => {
    return fetchAPI('/suppliers', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(supplierData),
    });
  },

  // Ambil daftar item supplier
  getSupplierItems: (supplierId) => {
    const url = supplierId ? `/supplier-items?supplierId=${supplierId}` : '/supplier-items';
    return fetchAPI(url, {
      headers: getAuthHeaders()
    });
  },

  // Tambah item supplier baru
  createSupplierItem: (itemData) => {
    return fetchAPI('/supplier-items', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(itemData),
    });
  },

  // Ambil daftar PO (bisa difilter)
  getPOs: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return fetchAPI(`/finance/po${qs ? `?${qs}` : ''}`, {
      headers: getAuthHeaders()
    });
  },

  // Rencana PO dari data RAB, dikelompokkan per supplier
  getPOPlan: (projectId) => {
    return fetchAPI(`/finance/po-plan?projectId=${encodeURIComponent(projectId)}`, {
      headers: getAuthHeaders()
    });
  },

  // Inbox verifikasi Finance (tingkat 1)
  getInboxFinance: (projectId) => {
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    return fetchAPI(`/finance/po/inbox-finance${qs}`, {
      headers: getAuthHeaders()
    });
  },

  // Inbox persetujuan atasan / PROJECT_MANAGER (tingkat 2)
  getInboxAtasan: (projectId) => {
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    return fetchAPI(`/finance/po/inbox-atasan${qs}`, {
      headers: getAuthHeaders()
    });
  },

  // Tingkat 1 — Finance verifikasi PO
  verifyPO: (id, catatanFinance = '') => {
    return fetchAPI(`/finance/po/${id}/verify`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ catatanFinance }),
    });
  },

  // Ambil detail 1 PO untuk dicetak
  getPOById: (id) => {
    return fetchAPI(`/finance/po/${id}`, {
      headers: getAuthHeaders()
    });
  },

  // Buat PO baru
  createPO: (poData) => {
    return fetchAPI('/finance/po', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(poData),
    });
  },

  // Edit PO
  updatePO: (id, poData) => {
    return fetchAPI(`/finance/po/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(poData),
    });
  },

  // Approve PO
  approvePO: (id) => {
    // Berdasarkan request user: aksi approve merubah status menjadi approve
    return fetchAPI(`/finance/po/${id}/approve`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    });
  },

  // Approve Atasan
  approveOwnerPO: (id) => {
    return fetchAPI(`/finance/po/${id}/approve-owner`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    });
  },

  // Reject PO
  rejectPO: (id, reason) => {
    return fetchAPI(`/finance/po/${id}/reject`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rejectReason: reason }),
    });
  },

  // Cancel Reject PO
  cancelRejectPO: (id) => {
    return fetchAPI(`/finance/po/${id}/cancel-reject`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    });
  },

  // Fungsi khusus buka PDF/Print page di window baru
  printPO: (id) => {
    window.open(`/?print-po=${id}`, '_blank');
  },

  getPOJasaRapPlan: (projectId) => {
    return fetchAPI('/finance/po-jasa/rap-plan', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ projectId }),
    });
  }
};

// Trigger HMR
