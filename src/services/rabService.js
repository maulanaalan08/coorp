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

  // Switch Job Type (Suntik AHSP ke RAB Item).
  // Setelah AHSP ditarik, breakdown OH ditulis ulang agar tiga komponen tidak
  // runtuh menjadi satu nilai operasional.
  switchJob: async (id, newJobTypeId, ohBreakdown, ahspDiscipline, workCategoryId) => {
    const totalOh = ohBreakdown
      ? Number(ohBreakdown.operationalPercent || 0) +
        Number(ohBreakdown.wastePercent || 0) +
        Number(ohBreakdown.profitPercent || 0)
      : undefined;
    const switched = await fetchAPI(`/rab-items/${id}/switch-job`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ newJobTypeId, customOverhead: totalOh, ahspDiscipline, workCategoryId }),
    });
    if (ohBreakdown) {
      await fetchAPI(`/rab-items/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(ohBreakdown),
      });
    }
    return switched;
  },

  // Bulk price update — OH selalu tiga komponen.
  bulkPrice: async (ids, rapUnitPrice, ohBreakdown) => {
    const promises = ids.map(id =>
      fetchAPI(`/rab-items/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ rapUnitPrice, ...ohBreakdown }),
      })
    );
    return Promise.all(promises);
  },

  // Bulk switch job — setelah AHSP ditarik, simpan breakdown OH per item.
  bulkSwitchJob: async (
    ids,
    newJobTypeId,
    ohBreakdown,
    ahspDiscipline,
    workCategoryId,
  ) => {
    const totalOh = ohBreakdown
      ? Number(ohBreakdown.operationalPercent || 0) +
        Number(ohBreakdown.wastePercent || 0) +
        Number(ohBreakdown.profitPercent || 0)
      : undefined;
    const switched = await Promise.all(ids.map(id =>
      fetchAPI(`/rab-items/${id}/switch-job`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          newJobTypeId,
          customOverhead: totalOh,
          ahspDiscipline,
          workCategoryId,
        }),
      })
    ));
    if (ohBreakdown) {
      await Promise.all(ids.map(id =>
        fetchAPI(`/rab-items/${id}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(ohBreakdown),
        })
      ));
    }
    return switched;
  },

  // Bulk price by name in project
  bulkPriceByName: (projectId, name, newUnitPrice) =>
    fetchAPI(`/projects/${projectId}/rab-items/bulk-price-by-name`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ name, newUnitPrice }),
    }),
};
