import { useState, useCallback, useEffect } from 'react';
import { bastService } from '../services/bastService';

export const useBast = (projectId) => {
  const [basts, setBasts] = useState([]);
  const [clientSpks, setClientSpks] = useState([]);
  const [hasIssuedClientSpk, setHasIssuedClientSpk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBasts = useCallback(async () => {
    if (!projectId) {
      setBasts([]);
      setClientSpks([]);
      setHasIssuedClientSpk(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await bastService.getBastList(projectId);
      setBasts(response.data || []);
      const spks = response.clientSpks || [];
      setClientSpks(spks);
      setHasIssuedClientSpk(Boolean(response.hasIssuedClientSpk ?? (spks.length > 0)));
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
    clientSpks,
    hasIssuedClientSpk,
    loading,
    error,
    refresh: fetchBasts,
    createBast,
    updateBast,
    deleteBast,
  };
};
