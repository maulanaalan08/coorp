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

/**
 * Hook khusus Dasbor Finance — data lebih kaya:
 * - Semua MR dari semua project (tanpa perlu pilih project)
 * - Item sudah di-split per toko/supplier
 * - Ada info sisa volume, nomor PO, nama supplier
 */
export const useFinanceMaterialRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await financeService.getFinanceMaterialRequests();
      setRequests(data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat data Finance Material Requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateItem = async (itemId, data) => {
    try {
      const res = await financeService.updateMaterialRequestItem(itemId, data);
      await fetchData(); // Refresh setelah update
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal update item');
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    requests,
    loading,
    error,
    refreshFinanceMR: fetchData,
    updateItem,
  };
};
