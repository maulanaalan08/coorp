import { useState, useCallback, useEffect } from 'react';
import { poService } from '../services/poService';
import toast from 'react-hot-toast';

export const useSupplier = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [supplierItems, setSupplierItems] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    try {
      const data = await poService.getSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengambil data supplier');
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  const fetchSupplierItems = useCallback(async (supplierId) => {
    setLoadingItems(true);
    try {
      const data = await poService.getSupplierItems(supplierId);
      setSupplierItems(data);
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengambil data item supplier');
    } finally {
      setLoadingItems(false);
    }
  }, []);

  const createSupplier = async (supplierData) => {
    try {
      const created = await poService.createSupplier(supplierData);
      toast.success('Supplier berhasil ditambahkan');
      fetchSuppliers();
      return created;
    } catch (error) {
      console.error(error);
      toast.error('Gagal menambahkan supplier');
      throw error;
    }
  };

  const createSupplierItem = async (itemData) => {
    try {
      const created = await poService.createSupplierItem(itemData);
      toast.success('Item supplier berhasil ditambahkan');
      fetchSupplierItems();
      return created;
    } catch (error) {
      console.error(error);
      toast.error('Gagal menambahkan item supplier');
      throw error;
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  return {
    suppliers,
    supplierItems,
    loadingSuppliers,
    loadingItems,
    fetchSuppliers,
    fetchSupplierItems,
    createSupplier,
    createSupplierItem
  };
};
