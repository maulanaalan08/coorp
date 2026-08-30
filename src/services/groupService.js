// src/services/groupService.js
import { fetchAPI } from './api';

export const groupService = {
  // Ambil tree group untuk project tertentu
  getByProjectId: (projectId, discipline = '') => {
    const query = discipline ? `?discipline=${encodeURIComponent(discipline)}` : '';
    return fetchAPI(`/projects/${projectId}/rab-groups${query}`);
  },

  // Buat Group / Sub-Group baru
  create: (projectId, data) =>
    fetchAPI(`/projects/${projectId}/rab-groups`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Edit Group / Sub-Group
  update: (id, data) =>
    fetchAPI(`/rab-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Preview hapus Group
  deletePreview: (id) =>
    fetchAPI(`/rab-groups/${id}/delete-preview`),

  // Hapus Group
  delete: (id) =>
    fetchAPI(`/rab-groups/${id}`, { method: 'DELETE' }),
};
