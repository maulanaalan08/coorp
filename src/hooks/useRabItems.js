import { useState, useEffect, useCallback, useRef } from 'react';
import { rabService } from '../services/rabService';

export const useRabItems = (projectId, discipline = '', workCategoryId = null) => {
  const [rabItems, setRabItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Kunci respons ke proyek+filter agar data proyek lama tidak bocor.
  const scopeRef = useRef(projectId);
  scopeRef.current = `${projectId}|${discipline}|${workCategoryId ?? ''}`;
  const scope = `${projectId}|${discipline}|${workCategoryId ?? ''}`;

  const fetchItems = useCallback(async () => {
    const requestScope = scope;
    if (!projectId) {
      setRabItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await rabService.getByProjectId(projectId, discipline, workCategoryId);
      if (scopeRef.current !== requestScope) return;
      setRabItems(Array.isArray(data) ? data : []);
    } catch (err) {
      if (scopeRef.current !== requestScope) return;
      setError(err.message || 'Gagal memuat data RAB');
      setRabItems([]);
    } finally {
      if (scopeRef.current === requestScope) setLoading(false);
    }
  }, [projectId, discipline, workCategoryId, scope]);

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

  const switchJob = useCallback(async (id, newJobTypeId, ohBreakdown, ahspDiscipline, workCategoryId) => {
    try {
      const res = await rabService.switchJob(
        id,
        newJobTypeId,
        ohBreakdown,
        ahspDiscipline,
        workCategoryId,
      );
      await fetchItems();
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal menyuntikkan harga AHSP');
    }
  }, [fetchItems]);

  const bulkPrice = useCallback(async (ids, rapUnitPrice, ohBreakdown) => {
    try {
      const res = await rabService.bulkPrice(ids, rapUnitPrice, ohBreakdown);
      await fetchItems();
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal update harga massal');
    }
  }, [fetchItems]);

  const bulkSwitchJob = useCallback(async (
    ids,
    newJobTypeId,
    ohBreakdown,
    ahspDiscipline,
    workCategoryId,
  ) => {
    try {
      const res = await rabService.bulkSwitchJob(
        ids,
        newJobTypeId,
        ohBreakdown,
        ahspDiscipline,
        workCategoryId,
      );
      await fetchItems();
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal suntik AHSP massal');
    }
  }, [fetchItems]);

  useEffect(() => {
      setRabItems([]);
      setLoading(Boolean(projectId));
      setError(null);
      fetchItems();
    }, [fetchItems, projectId, discipline, workCategoryId]);

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
