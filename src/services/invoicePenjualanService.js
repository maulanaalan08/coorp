import { fetchAPI, fetchAPIBlob } from './api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const invoicePenjualanService = {
  // LOOKUP
  getProjects: () => fetchAPI('/invoice-penjualan/lookup/projects', { headers: getAuthHeaders() }),
  getDesignQuotations: (projectId) =>
    fetchAPI(`/invoice-penjualan/lookup/design-quotations?projectId=${encodeURIComponent(projectId)}`, {
      headers: getAuthHeaders(),
    }),
  getSpkContracts: (projectId) =>
    fetchAPI(`/invoice-penjualan/lookup/spk-contracts?projectId=${encodeURIComponent(projectId)}`, {
      headers: getAuthHeaders(),
    }),
  getNextNoInvoice: (type, tanggal) => {
    const qs = new URLSearchParams({ type: String(type || '').toUpperCase() });
    if (tanggal) qs.append('tanggal', tanggal);
    return fetchAPI(`/invoice-penjualan/lookup/next-no-invoice?${qs.toString()}`, {
      headers: getAuthHeaders(),
    });
  },

  // DESAIN
  listDesain: (projectId = '') =>
    fetchAPI(`/invoice-penjualan/desain${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`, {
      headers: getAuthHeaders(),
    }),
  getDesain: (id) => fetchAPI(`/invoice-penjualan/desain/${id}`, { headers: getAuthHeaders() }),
  createDesain: (payload) =>
    fetchAPI('/invoice-penjualan/desain', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }),
  updateDesain: (id, payload) =>
    fetchAPI(`/invoice-penjualan/desain/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }),
  approveFinanceDesain: (id) =>
    fetchAPI(`/invoice-penjualan/desain/${id}/approve-finance`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    }),
  approveDesain: (id) =>
    fetchAPI(`/invoice-penjualan/desain/${id}/approve`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    }),
  rejectDesain: (id, reason = '') =>
    fetchAPI(`/invoice-penjualan/desain/${id}/reject`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    }),
  postGlDesain: (id, payload = {}) =>
    fetchAPI(`/invoice-penjualan/desain/${id}/post-gl`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }),
  getDesainPdfBlob: (id) =>
    fetchAPIBlob(`/invoice-penjualan/desain/${id}/print-pdf`, {
      headers: getAuthHeaders(),
    }),

  // KLIEN
  listKlien: (projectId = '') =>
    fetchAPI(`/invoice-penjualan/klien${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`, {
      headers: getAuthHeaders(),
    }),
  getKlien: (id) => fetchAPI(`/invoice-penjualan/klien/${id}`, { headers: getAuthHeaders() }),
  createKlien: (payload) =>
    fetchAPI('/invoice-penjualan/klien', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }),
  updateKlien: (id, payload) =>
    fetchAPI(`/invoice-penjualan/klien/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }),
  approveFinanceKlien: (id) =>
    fetchAPI(`/invoice-penjualan/klien/${id}/approve-finance`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    }),
  approveKlien: (id) =>
    fetchAPI(`/invoice-penjualan/klien/${id}/approve`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    }),
  rejectKlien: (id, reason = '') =>
    fetchAPI(`/invoice-penjualan/klien/${id}/reject`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    }),
  postGlKlien: (id, payload = {}) =>
    fetchAPI(`/invoice-penjualan/klien/${id}/post-gl`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }),
  getKlienPdfBlob: (id) =>
    fetchAPIBlob(`/invoice-penjualan/klien/${id}/print-pdf`, {
      headers: getAuthHeaders(),
    }),

  // OPERASIONAL
  listOperasional: (projectId = '') =>
    fetchAPI(`/invoice-operasional${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`, {
      headers: getAuthHeaders(),
    }),
  getOperasional: (id) => fetchAPI(`/invoice-operasional/${id}`, { headers: getAuthHeaders() }),
  createOperasional: (payload) =>
    fetchAPI('/invoice-operasional', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }),
  updateOperasional: (id, payload) =>
    fetchAPI(`/invoice-operasional/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }),
  approveFinanceOperasional: (id) =>
    fetchAPI(`/invoice-operasional/${id}/approve-finance`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    }),
  approveOperasional: (id) =>
    fetchAPI(`/invoice-operasional/${id}/approve`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    }),
  rejectOperasional: (id, reason = '') =>
    fetchAPI(`/invoice-operasional/${id}/reject`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    }),
  postGlOperasional: (id, payload = {}) =>
    fetchAPI(`/invoice-operasional/${id}/post-gl`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }),
  getOperasionalPdfBlob: (id) =>
    fetchAPIBlob(`/invoice-operasional/${id}/print-pdf`, {
      headers: getAuthHeaders(),
    }),
};

export default invoicePenjualanService;
