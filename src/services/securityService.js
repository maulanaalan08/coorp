import { fetchAPI, FILE_BASE_URL } from './api';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const download = async (path, filename) => {
  const response = await fetch(`${API_ORIGIN}/api/security${path}`, { headers: authHeaders() });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || `Gagal mengunduh (${response.status}).`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const securityService = {
  getMe: () => fetchAPI('/security/me'),
  updateMe: (payload) => fetchAPI('/security/me', { method: 'PATCH', body: JSON.stringify(payload) }),
  updatePassword: (payload) => fetchAPI('/security/me/password', { method: 'PATCH', body: JSON.stringify(payload) }),
  uploadPhoto: (file) => {
    const form = new FormData(); form.append('photo', file);
    return fetchAPI('/security/me/photo', { method: 'POST', body: form });
  },
  deletePhoto: () => fetchAPI('/security/me/photo', { method: 'DELETE' }),
  getUsers: () => fetchAPI('/security/users'),
  getPermissionTemplates: () => fetchAPI('/security/permissions/templates'),
  updatePermissionTemplate: (role, permissions) => fetchAPI(`/security/permissions/templates/${role}`, { method: 'PUT', body: JSON.stringify({ permissions }) }),
  getLogs: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null));
    return fetchAPI(`/security/activity-logs?${query}`);
  },
  getArchives: () => fetchAPI('/security/archives'),
  getIntegrationStatus: () => fetchAPI('/security/integration-status'),
  downloadLogs: (format) => download(`/activity-logs/export?format=${format}`, `activity-log.${format === 'xlsx' ? 'xlsx' : 'txt'}`),
  downloadArchive: (month, format) => download(`/archives/${month}/download?format=${format}`, `activity-${month}.${format === 'xlsx' ? 'xlsx' : 'txt'}`),
  photoUrl: (path) => path ? `${FILE_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}` : '',
};
