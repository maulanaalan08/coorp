// src/services/rabService.js
import { fetchAPI } from './api';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const rabService = {
  // Ambil semua item RAB untuk project tertentu
  getByProjectId: (projectId, discipline = '', workCategoryId = null) => {
    const params = new URLSearchParams();
    if (workCategoryId) params.set('workCategoryId', workCategoryId);
    else if (discipline) params.set('discipline', discipline);
    const query = params.toString();
    return fetchAPI(`/projects/${projectId}/rab-items${query ? `?${query}` : ''}`, { headers: authHeaders() });
  },

  // Update RAB item (modal, overhead %, rincian komponen)
  update: (id, data) =>
    fetchAPI(`/rab-items/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }),

  // Hapus single RAB item
  delete: (id) =>
    fetchAPI(`/rab-items/${id}`, { method: 'DELETE', headers: authHeaders() }),

  // Hapus massal RAB items
  deleteBulk: (ids) =>
    fetchAPI(`/rab-items/bulk-delete`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ids }),
    }),

  // Switch Job Type (Suntik AHSP ke RAB Item)
  switchJob: (id, newJobTypeId, customOverhead, ahspDiscipline, workCategoryId) =>
    fetchAPI(`/rab-items/${id}/switch-job`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ newJobTypeId, customOverhead, ahspDiscipline, workCategoryId }),
    }),

  // Bulk price update
  bulkPrice: async (ids, rapUnitPrice, overheadPercent) => {
    // Frontend workaround for backend route collision (Express PUT /rab-items/:id catching bulk-price)
    const promises = ids.map(id =>
      fetchAPI(`/rab-items/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ rapUnitPrice, overheadPercent }),
      })
    );
    return Promise.all(promises);
  },

  // Bulk switch job
  bulkSwitchJob: async (ids, newJobTypeId, customOverhead) => {
    // Frontend workaround for backend route collision
    const promises = ids.map(id =>
      fetchAPI(`/rab-items/${id}/switch-job`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ newJobTypeId, customOverhead }),
      })
    );
    return Promise.all(promises);
  },

  // Bulk price by name in project
  bulkPriceByName: (projectId, name, newUnitPrice) =>
    fetchAPI(`/projects/${projectId}/rab-items/bulk-price-by-name`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ name, newUnitPrice }),
    }),
};
