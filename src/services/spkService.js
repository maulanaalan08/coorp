import { fetchAPI } from './api';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const authenticatedPdfRequest = async (url) => {
  const token = localStorage.getItem('token');
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || errorData?.error || `Gagal memuat PDF (${response.status}).`);
  }

  return response.blob();
};

export const spkService = {
  getByProjectId: (projectId) =>
    fetchAPI(`/projects/${projectId}/spk-contracts`),

  getRabSource: (projectId) =>
    fetchAPI(`/projects/${projectId}/spk-contracts/rab-source`),

  createDraft: (projectId, payload) =>
    fetchAPI(`/projects/${projectId}/spk-contracts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateDraft: (contractId, payload) =>
    fetchAPI(`/spk-contracts/${contractId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  issueSpk: (contractId) =>
    fetchAPI(`/spk-contracts/${contractId}/issue`, {
      method: 'POST',
    }),

  signSpk: (contractId, payload = {}) =>
    fetchAPI(`/spk-contracts/${contractId}/sign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  cancelSpk: (contractId, reason = '') =>
    fetchAPI(`/spk-contracts/${contractId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  getPdfViewUrl: (contractId) =>
    `${API_ORIGIN}/api/spk-contracts/${contractId}/pdf/view`,

  getPdfDownloadUrl: (contractId) =>
    `${API_ORIGIN}/api/spk-contracts/${contractId}/pdf/download`,

  getPdfView: (contractId) =>
    authenticatedPdfRequest(`${API_ORIGIN}/api/spk-contracts/${contractId}/pdf/view`),

  getPdfDownload: (contractId) =>
    authenticatedPdfRequest(`${API_ORIGIN}/api/spk-contracts/${contractId}/pdf/download`),
};
