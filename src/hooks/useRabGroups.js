import { useState, useEffect, useCallback } from 'react';
import { groupService } from '../services/groupService';

export const useRabGroups = (projectId, discipline = '', workCategoryId = null) => {
  const [rabGroups, setRabGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [errorGroups, setErrorGroups] = useState(null);

  const fetchGroups = useCallback(async () => {
    if (!projectId) {
      setRabGroups([]);
      return;
    }
    setLoadingGroups(true);
    setErrorGroups(null);
    try {
      const data = await groupService.getByProjectId(projectId, discipline, workCategoryId);
      setRabGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorGroups(err.message || 'Gagal memuat data grup RAB');
      setRabGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  }, [projectId, discipline, workCategoryId]);

  const createGroup = useCallback(async (data) => {
    try {
      const res = await groupService.create(projectId, data);
      await fetchGroups();
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal membuat grup RAB');
    }
  }, [projectId, fetchGroups]);

  const updateGroup = useCallback(async (id, data) => {
    try {
      const res = await groupService.update(id, data);
      await fetchGroups();
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal memperbarui grup RAB');
    }
  }, [fetchGroups]);

  const deleteGroup = useCallback(async (id) => {
    try {
      await groupService.delete(id);
      await fetchGroups();
    } catch (err) {
      throw new Error(err.message || 'Gagal menghapus grup RAB');
    }
  }, [fetchGroups]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return {
    rabGroups,
    loadingGroups,
    errorGroups,
    refreshGroups: fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
  };
};
