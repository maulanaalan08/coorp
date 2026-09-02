import React, { useState, useEffect, useMemo } from 'react';
import styles from '../styles/PurchaseOrderModal.module.css';
import { X, ShoppingCart } from 'lucide-react';
import { poService } from '../services/poService';
import toast from 'react-hot-toast';

const fmtRp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

const PurchaseOrderModal = ({ selectedItems, projectId, editingPo, onClose, onSuccess }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form Header State
  const [formData, setFormData] = useState({
    poNumber: '',
    tanggal: new Date().toISOString().slice(0, 10),
    supplierId: '',
  });

  // Items State (editable)
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchSuppliers();
    
    if (editingPo) {
      setFormData({
        poNumber: editingPo.poNumber,
        tanggal: editingPo.tanggal ? new Date(editingPo.tanggal).toISOString().slice(0, 10) : '',
        supplierId: editingPo.supplierId || '',
      });
      
      const initialItems = (editingPo.items || []).map(item => ({
        materialRequestId: item.materialRequestId,
        description: item.description,
        sisa: '-',
        qty: item.qty,
        unit: item.unit || '',
        unitPrice: item.unitPrice || 0,
        total: item.total || 0
      }));
      setItems(initialItems);
    } else {
      const initialItems = (selectedItems || []).map(item => {
        const sisaHitung = Math.max(0, (item.estimatedVolume || 0) - (item.orderedQty || 0));
        return {
          materialRequestId: item.id,
          description: item.itemName,
          sisa: `${sisaHitung} ${item.unit || ''}`,
          qty: sisaHitung,
          unit: item.unit || '',
          unitPrice: item.pricePerUnit || 0,
          total: 0 // dihitung nanti
        };
      });
      setItems(initialItems);
    }
  }, [selectedItems, editingPo]);

  const fetchSuppliers = async () => {
    try {
      const data = await poService.getSuppliers();
      setSuppliers(data);
    } catch (err) {
      toast.error('Gagal mengambil daftar supplier');
    }
  };

  const handleHeaderChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  // Calculations
  const calculatedItems = useMemo(() => {
    return items.map(item => {
      const qty = Number(item.qty || 0);
      const price = Number(item.unitPrice || 0);
      const total = qty * price;
      return { ...item, total: total > 0 ? total : 0 };
    });
  }, [items]);

  const grandTotal = calculatedItems.reduce((sum, item) => sum + item.total, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (calculatedItems.length === 0) {
      toast.error('Pilih minimal 1 barang untuk dibuat PO!');
      return;
    }
    if (!formData.supplierId) {
      toast.error('Pilih Supplier/Toko terlebih dahulu!');
      return;
    }
    if (!formData.poNumber) {
      toast.error('Nomor Surat PO wajib diisi!');
      return;
    }

    setLoading(true);
    const payload = {
      ...formData,
      projectId: editingPo ? editingPo.projectId : projectId,
      subTotal: grandTotal,
      globalDiscount: 0,
      taxNominal: 0,
      grandTotal,
      items: calculatedItems
    };

    const actionPromise = editingPo
      ? poService.updatePO(editingPo.id, payload)
      : poService.createPO(payload);

    toast.promise(actionPromise, {
      loading: editingPo ? 'Mengupdate Surat PO...' : 'Menyimpan Surat PO...',
      success: editingPo ? 'Surat PO berhasil diupdate!' : 'Surat PO berhasil dibuat!',
      error: (err) => err?.response?.data?.error || (editingPo ? 'Gagal mengupdate Surat PO.' : 'Gagal membuat Surat PO.')
    }).then(() => {
      onSuccess();
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setLoading(false);
    });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <ShoppingCart size={20} color="#10b981" /> 
            {editingPo ? 'Edit Purchase Order (PO)' : 'Buat Purchase Order (PO)'}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nomor Transaksi PO</label>
              <input 
                type="text" 
                name="poNumber" 
                required 
                className={styles.formInput} 
                value={formData.poNumber} 
                onChange={handleHeaderChange} 
                placeholder="Cth: PO/09/2026/001" 
                disabled={!!editingPo} 
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Toko / Supplier</label>
              <select name="supplierId" required className={styles.formSelect} value={formData.supplierId} onChange={handleHeaderChange}>
                <option value="">-- Pilih Supplier --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tanggal PO</label>
              <input type="date" name="tanggal" required className={styles.formInput} value={formData.tanggal} onChange={handleHeaderChange} />
            </div>
          </div>

          <div className={styles.separator}></div>

          <div className={styles.itemsSection}>
            <div className={styles.itemsHeader}>Daftar Barang Terpilih:</div>
            <div className={styles.itemsTableWrapper}>
              <table className={styles.itemsTable}>
                <thead>
                  <tr>
                    <th>Deskripsi Barang</th>
                    <th>Sisa Butuh</th>
                    <th>Qty Beli</th>
                    <th>Harga Satuan (Rp)</th>
                    <th>Subtotal (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedItems.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Tidak ada barang yang dipesan.</td></tr>
                  ) : (
                    calculatedItems.map((item, index) => (
                      <tr key={index}>
                        <td>{item.description}</td>
                        <td>{item.sisa}</td>
                        <td>
                          <input 
                            type="number" 
                            className={styles.smallInput} 
                            value={item.qty} 
                            onChange={(e) => handleItemChange(index, 'qty', e.target.value)} 
                            min="0"
                            step="any"
                            required
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            className={styles.smallInput} 
                            value={item.unitPrice} 
                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)} 
                            min="0"
                            required
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            className={styles.smallInput} 
                            value={item.total} 
                            readOnly 
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.grandTotalRow}>
              <span className={styles.grandTotalLabel}>GRAND TOTAL</span>
              <span className={styles.grandTotalValue}>{fmtRp(grandTotal)}</span>
            </div>
          </div>
        </form>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.saveBtn} onClick={handleSubmit} disabled={loading}>
            🚀 Simpan & Terbitkan PO
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderModal;
