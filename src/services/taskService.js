import { fetchAPI } from './api';

export const taskService = {
  /**
   * Mengambil daftar tugas dengan filter opsional
   * @param {Object} params { scope: 'my' | 'all', projectId, priority, status, search }
   */
  async getTasks(params = {}) {
    const query = new URLSearchParams();
    if (params.scope) query.append('scope', params.scope);
    if (params.projectId) query.append('projectId', params.projectId);
    if (params.priority) query.append('priority', params.priority);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);

    const qs = query.toString();
    const endpoint = `/tasks${qs ? `?${qs}` : ''}`;
    const res = await fetchAPI(endpoint);
    return res?.data || [];
  },

  /**
   * Membuat tugas baru
   */
  async createTask(data) {
    const res = await fetchAPI('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res?.data;
  },

  /**
   * Mengedit detail tugas (hanya Creator atau Super Admin)
   */
  async updateTask(id, data) {
    const res = await fetchAPI(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res?.data;
  },

  /**
   * Memindahkan status tugas (To Do -> In Progress -> Done) atau urutan
   */
  async moveTask(id, { status, order }) {
    const res = await fetchAPI(`/tasks/${id}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ status, order }),
    });
    return res?.data;
  },

  /**
   * Menyimpan urutan banyak tugas (setelah drag & drop board)
   */
  async reorderTasks(tasks) {
    const res = await fetchAPI('/tasks/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ tasks }),
    });
    return res;
  },

  /**
   * Menghapus tugas (hanya Creator atau Super Admin)
   */
  async deleteTask(id) {
    const res = await fetchAPI(`/tasks/${id}`, {
      method: 'DELETE',
    });
    return res;
  },

  /**
   * Mengambil daftar semua akun user aktif untuk opsi Assignee
   */
  async getUsers() {
    const res = await fetchAPI('/auth/users');
    return res?.data || [];
  },
};
