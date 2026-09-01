import { useState, useEffect, useCallback } from 'react';
import { financeService } from '../services/financeService';

export const useMaterialRequests = (projectId) => {
  const [mrItems, setMrItems] = useState([]);
  const [loadingMr, setLoadingMr] = useState(false);
  const [mrError, setMrError] = useState(null);

  const fetchMaterialRequests = useCallback(async () => {
    if (!projectId) {
      setMrItems([]);
      return;
    }
    
    setLoadingMr(true);
    setMrError(null);
    try {
      const data = await financeService.getMaterialRequests(projectId);
      
      if (data && data.length > 0) {
        setMrItems(data[0].items || []);
      } else {
        setMrItems([]);
      }
    } catch (err) {
      setMrError(err.message || 'Gagal memuat data Material Requests');
      setMrItems([]);
    } finally {
      setLoadingMr(false);
    }
  }, [projectId]);

  const updateBulkMaterialRequests = async (items) => {
    try {
      const res = await financeService.updateBulk(items);
      await fetchMaterialRequests();
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal menyimpan perubahan Finance');
    }
  };

  useEffect(() => {
    fetchMaterialRequests();
  }, [fetchMaterialRequests]);

  return {
    mrItems,
    loadingMr,
    mrError,
    refreshMaterialRequests: fetchMaterialRequests,
    updateBulkMaterialRequests
  };
};
