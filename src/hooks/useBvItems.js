import { useState, useEffect, useCallback } from 'react';
import { bvService } from '../services/bvService';

export const useBvItems = (projectId) => {
  const [bvItems, setBvItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    if (!projectId) {
      setBvItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await bvService.getByProjectId(projectId);
      setBvItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Gagal memuat data BackUp Volume');
      setBvItems([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createBvItem = useCallback(async (data) => {
    try {
      const res = await bvService.create(projectId, data);
      await fetchItems();
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal membuat item BV');
    }
  }, [projectId, fetchItems]);

  const updateBvItem = useCallback(async (id, data) => {
    try {
      const res = await bvService.update(id, data);
      await fetchItems();
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal memperbarui item BV');
    }
  }, [fetchItems]);

  const deleteBvItem = useCallback(async (id) => {
    try {
      await bvService.delete(id);
      await fetchItems();
    } catch (err) {
      throw new Error(err.message || 'Gagal menghapus item BV');
    }
  }, [fetchItems]);

  const deleteBulk = useCallback(async (ids) => {
    try {
      await bvService.deleteBulk(ids);
      await fetchItems();
    } catch (err) {
      throw new Error(err.message || 'Gagal menghapus item massal');
    }
  }, [fetchItems]);

  const linkToRab = useCallback(async (id, data) => {
    try {
      const res = await bvService.linkToRab(id, data);
      await fetchItems();
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal menautkan ke RAB');
    }
  }, [fetchItems]);

  const linkToRabBulk = useCallback(async (ids) => {
    try {
      const res = await bvService.linkToRabBulk(ids);
      await fetchItems();
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal menautkan massal ke RAB');
    }
  }, [fetchItems]);
  
  // 👇 TAMBAHKAN FUNGSI INI 👇
  const syncBvItem = useCallback(async (id) => {
    try {
      const res = await bvService.syncToRab(id);
      await fetchItems(); // Refresh data otomatis setelah sync
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal sinkronisasi ke RAB');
    }
  }, [fetchItems]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const syncBulk = useCallback(async (ids) => {
    try {
      const res = await bvService.syncBulk(ids);
      await fetchItems();
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal mensinkronkan item massal');
    }
  }, [fetchItems]);

  return {
    bvItems,
    loading,
    error,
    refresh: fetchItems,
    createBvItem,
    updateBvItem,
    deleteBvItem,
    deleteBulk,
    linkToRab,
    linkToRabBulk,
    syncBvItem, // 👇 EXPORT FUNGSI DI SINI 👇
    syncBulk,
  };
};
