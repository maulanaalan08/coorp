import { fetchAPI } from './api';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const designQuotationService = {
  getByProjectId: (projectId) =>
    fetchAPI(`/projects/${projectId}/design-quotations`),

  create: (projectId, payload) =>
    fetchAPI(`/projects/${projectId}/design-quotations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getPdfViewUrl: (quotationId) =>
    `${API_ORIGIN}/api/design-quotations/${quotationId}/pdf/view`,

  getPdfDownloadUrl: (quotationId) =>
    `${API_ORIGIN}/api/design-quotations/${quotationId}/pdf/download`,
};
