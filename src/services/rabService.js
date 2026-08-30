// src/services/rabService.js
import { fetchAPI } from './api';

export const rabService = {
  // Ambil semua item RAB untuk project tertentu
  getByProjectId: (projectId, discipline = '') => {
    const query = discipline ? `?discipline=${encodeURIComponent(discipline)}` : '';
    return fetchAPI(`/projects/${projectId}/rab-items${query}`);
  },

  // Update RAB item (modal, overhead %, rincian komponen)
  update: (id, data) =>
    fetchAPI(`/rab-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Hapus single RAB item
  delete: (id) =>
    fetchAPI(`/rab-items/${id}`, { method: 'DELETE' }),

  // Hapus massal RAB items
  deleteBulk: (ids) =>
    fetchAPI(`/rab-items/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // Switch Job Type (Suntik AHSP ke RAB Item)
  switchJob: (id, newJobTypeId, customOverhead) =>
    fetchAPI(`/rab-items/${id}/switch-job`, {
      method: 'PUT',
      body: JSON.stringify({ newJobTypeId, customOverhead }),
    }),

  // Bulk price update
  bulkPrice: (ids, rapUnitPrice, overheadPercent) =>
    fetchAPI(`/rab-items/bulk-price`, {
      method: 'PUT',
      body: JSON.stringify({ ids, rapUnitPrice, overheadPercent }),
    }),

  // Bulk switch job
  bulkSwitchJob: (ids, newJobTypeId, customOverhead) =>
    fetchAPI(`/rab-items/bulk-switch-job`, {
      method: 'PUT',
      body: JSON.stringify({ ids, newJobTypeId, customOverhead }),
    }),

  // Bulk price by name in project
  bulkPriceByName: (projectId, name, newUnitPrice) =>
    fetchAPI(`/projects/${projectId}/rab-items/bulk-price-by-name`, {
      method: 'PUT',
      body: JSON.stringify({ name, newUnitPrice }),
    }),
};
