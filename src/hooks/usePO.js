import { useState, useEffect, useCallback } from 'react';
import { poService } from '../services/poService';
import toast from 'react-hot-toast';

export const usePO = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      const data = await poService.getSuppliers();
      setSuppliers(data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      // Suppress error display for now if endpoint not ready
    }
  }, []);

  const fetchPOs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await poService.getPOs();
      setPos(data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat data PO');
    } finally {
      setLoading(false);
    }
  }, []);

  const createNewPO = async (poData) => {
    try {
      const res = await poService.createPO(poData);
      await fetchPOs(); // Refresh data setelah berhasil membuat PO
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal membuat PO');
    }
  };

  const approve = async (id) => {
    try {
      const res = await poService.approvePO(id);
      await fetchPOs(); // Refresh status
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal approve PO');
    }
  };

  // Fetch initial data
  useEffect(() => {
    fetchSuppliers();
    fetchPOs();
  }, [fetchSuppliers, fetchPOs]);

  return {
    suppliers,
    pos,
    loading,
    error,
    refreshPOs: fetchPOs,
    createNewPO,
    approve
  };
};
