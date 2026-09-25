import { useState, useCallback, useEffect } from 'react';
import { bastService } from '../services/bastService';

export const useBast = (projectId) => {
  const [basts, setBasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBasts = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await bastService.getBastList(projectId);
      setBasts(response.data || []);
    } catch (err) {
      setError(err.message || 'Gagal mengambil data BAST');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchBasts();
  }, [fetchBasts]);

  const createBast = useCallback(async (formData) => {
    if (!projectId) throw new Error('Project ID diperlukan');
    try {
      const res = await bastService.createBast(projectId, formData);
      await fetchBasts();
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal membuat BAST');
    }
  }, [projectId, fetchBasts]);

  const updateBast = useCallback(async (id, formData) => {
    try {
      const res = await bastService.updateBast(id, formData);
      await fetchBasts();
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal mengupdate BAST');
    }
  }, [fetchBasts]);

  const deleteBast = useCallback(async (id) => {
    try {
      const res = await bastService.deleteBast(id);
      await fetchBasts();
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal menghapus BAST');
    }
  }, [fetchBasts]);

  return {
    basts,
    loading,
    error,
    refresh: fetchBasts,
    createBast,
    updateBast,
    deleteBast,
  };
};
