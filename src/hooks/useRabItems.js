import { useState, useEffect, useCallback } from 'react';
import { rabService } from '../services/rabService';

export const useRabItems = (projectId, discipline = '') => {
  const [rabItems, setRabItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    if (!projectId) {
      setRabItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await rabService.getByProjectId(projectId, discipline);
      setRabItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Gagal memuat data RAB');
      setRabItems([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, discipline]);

  const updateRabItem = useCallback(async (id, data) => {
    try {
      const res = await rabService.update(id, data);
      await fetchItems();
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal memperbarui item RAB');
    }
  }, [fetchItems]);

  const deleteRabItem = useCallback(async (id) => {
    try {
      await rabService.delete(id);
      await fetchItems();
    } catch (err) {
      throw new Error(err.message || 'Gagal menghapus item RAB');
    }
  }, [fetchItems]);

  const deleteBulk = useCallback(async (ids) => {
    try {
      await rabService.deleteBulk(ids);
      await fetchItems();
    } catch (err) {
      throw new Error(err.message || 'Gagal menghapus massal item RAB');
    }
  }, [fetchItems]);

  const switchJob = useCallback(async (id, newJobTypeId, customOverhead) => {
    try {
      const res = await rabService.switchJob(id, newJobTypeId, customOverhead);
      await fetchItems();
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal menyuntikkan harga AHSP');
    }
  }, [fetchItems]);

  const bulkPrice = useCallback(async (ids, rapUnitPrice, overheadPercent) => {
    try {
      const res = await rabService.bulkPrice(ids, rapUnitPrice, overheadPercent);
      await fetchItems();
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal update harga massal');
    }
  }, [fetchItems]);

  const bulkSwitchJob = useCallback(async (ids, newJobTypeId, customOverhead) => {
    try {
      const res = await rabService.bulkSwitchJob(ids, newJobTypeId, customOverhead);
      await fetchItems();
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal suntik AHSP massal');
    }
  }, [fetchItems]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    rabItems,
    loading,
    error,
    refresh: fetchItems,
    updateRabItem,
    deleteRabItem,
    deleteBulk,
    switchJob,
    bulkPrice,
    bulkSwitchJob,
  };
};
