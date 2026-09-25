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
    // Jangan fetch sebelum token tersedia di localStorage
    const token = localStorage.getItem('token');
    if (!token) return;
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

  useEffect(() => {
    const onRefresh = () => fetchPOs();
    window.addEventListener('po-status-changed', onRefresh);
    return () => window.removeEventListener('po-status-changed', onRefresh);
  }, [fetchPOs]);

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

  const reject = async (id, reason) => {
    try {
      const res = await poService.rejectPO(id, reason);
      await fetchPOs();
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal reject PO');
    }
  };

  const cancelReject = async (id) => {
    try {
      const res = await poService.cancelRejectPO(id);
      await fetchPOs();
      return res;
    } catch (err) {
      throw new Error(err.message || 'Gagal membatalkan reject PO');
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
    approve,
    reject,
    cancelReject
  };
};
