// src/services/groupService.js
import { fetchAPI } from './api';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const groupService = {
  // Ambil tree group untuk project tertentu
  getByProjectId: (projectId, discipline = '', workCategoryId = null) => {
    const params = new URLSearchParams();
    if (workCategoryId) params.set('workCategoryId', workCategoryId);
    else if (discipline) params.set('discipline', discipline);
    const query = params.toString();
    return fetchAPI(`/projects/${projectId}/rab-groups${query ? `?${query}` : ''}`, { headers: authHeaders() });
  },

  // Buat Group / Sub-Group baru
  create: (projectId, data) =>
    fetchAPI(`/projects/${projectId}/rab-groups`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }),

  // Edit Group / Sub-Group
  update: (id, data) =>
    fetchAPI(`/rab-groups/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }),

  // Preview hapus Group
  deletePreview: (id) =>
    fetchAPI(`/rab-groups/${id}/delete-preview`, { headers: authHeaders() }),

  // Hapus Group
  delete: (id) =>
    fetchAPI(`/rab-groups/${id}`, { method: 'DELETE', headers: authHeaders() }),
};
