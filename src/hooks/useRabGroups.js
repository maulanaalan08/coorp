import { useState, useEffect, useCallback, useRef } from 'react';
import { groupService } from '../services/groupService';

export const useRabGroups = (projectId, discipline = '', workCategoryId = null) => {
  const [rabGroups, setRabGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [errorGroups, setErrorGroups] = useState(null);
  // Kunci respons ke kombinasi proyek+filter agar data proyek lama tidak bocor.
  const scopeRef = useRef(projectId);
  scopeRef.current = `${projectId}|${discipline}|${workCategoryId ?? ''}`;
  const scope = `${projectId}|${discipline}|${workCategoryId ?? ''}`;

  const fetchGroups = useCallback(async () => {
    const requestScope = scope;
    if (!projectId) {
      setRabGroups([]);
      return;
    }
    setLoadingGroups(true);
    setErrorGroups(null);
    try {
      const data = await groupService.getByProjectId(projectId, discipline, workCategoryId);
      if (scopeRef.current !== requestScope) return;
      setRabGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      if (scopeRef.current !== requestScope) return;
      setErrorGroups(err.message || 'Gagal memuat data grup RAB');
      setRabGroups([]);
    } finally {
      if (scopeRef.current === requestScope) setLoadingGroups(false);
    }
  }, [projectId, discipline, workCategoryId, scope]);

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
      setRabGroups([]);
      setLoadingGroups(Boolean(projectId));
      setErrorGroups(null);
      fetchGroups();
    }, [fetchGroups, projectId, discipline, workCategoryId]);

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
