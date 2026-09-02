import React, { useState, useEffect, useMemo } from 'react';
import styles from '../styles/PurchaseOrderModal.module.css';
import { X, ShoppingCart, Plus } from 'lucide-react';
import { poService } from '../services/poService';
import toast from 'react-hot-toast';
import SupplierModal from './SupplierModal';

const fmtRp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

const PurchaseOrderModal = ({ selectedItems, projectId, editingPo, onClose, onSuccess }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // Form Header State
  const [formData, setFormData] = useState({
    poNumber: '',
    tanggal: new Date().toISOString().slice(0, 10),
    supplierId: '',
    kategori: '',
    deliveryDate: '',
    penerimaBarang: '',
    caraPembayaran: '',
    jadwalPenagihan: '',
    keterangan: '',
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
        kategori: editingPo.kategori || '',
        deliveryDate: editingPo.deliveryDate ? new Date(editingPo.deliveryDate).toISOString().slice(0, 10) : '',
        penerimaBarang: editingPo.penerimaBarang || '',
        caraPembayaran: editingPo.caraPembayaran || '',
        jadwalPenagihan: editingPo.jadwalPenagihan || '',
        keterangan: editingPo.keterangan || '',
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
    <>
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
                  className={styles.formInput}
                  value={editingPo ? formData.poNumber : ''}
                  onChange={handleHeaderChange}
                  placeholder={editingPo ? '' : 'Auto-generate oleh sistem'}
                  disabled
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Toko / Supplier</label>
                <div className={styles.supplierSelectGroup}>
                  <select name="supplierId" required className={styles.formSelect} value={formData.supplierId} onChange={handleHeaderChange}>
                    <option value="">-- Pilih Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.addSupplierBtn}
                    onClick={() => setShowSupplierModal(true)}
                    title="Tambah Supplier Baru"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tanggal PO</label>
                <input type="date" name="tanggal" required className={styles.formInput} value={formData.tanggal} onChange={handleHeaderChange} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tanggal Pengiriman</label>
                <input type="date" name="deliveryDate" className={styles.formInput} value={formData.deliveryDate} onChange={handleHeaderChange} />
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Kategori</label>
                <select name="kategori" className={styles.formSelect} value={formData.kategori} onChange={handleHeaderChange}>
                  <option value="">-- Pilih Kategori --</option>
                  <option value="BAHAN">Bahan</option>
                  <option value="ALAT">Alat</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Penerima Barang</label>
                <input type="text" name="penerimaBarang" className={styles.formInput} value={formData.penerimaBarang} onChange={handleHeaderChange} placeholder="Nama penerima di lapangan" />
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Cara Pembayaran</label>
                <select name="caraPembayaran" className={styles.formSelect} value={formData.caraPembayaran} onChange={handleHeaderChange}>
                  <option value="">-- Pilih Cara Bayar --</option>
                  <option value="CASH">Cash / Tunai</option>
                  <option value="TRANSFER">Transfer Bank</option>
                  <option value="TEMPO">Tempo / Kredit</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Jadwal Penagihan</label>
                <input type="text" name="jadwalPenagihan" className={styles.formInput} value={formData.jadwalPenagihan} onChange={handleHeaderChange} placeholder="Cth: Net 30 hari" />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Keterangan</label>
              <textarea name="keterangan" className={styles.formTextarea} value={formData.keterangan} onChange={handleHeaderChange} placeholder="Catatan tambahan untuk supplier..." rows={3} />
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

      {showSupplierModal && (
        <SupplierModal
          onClose={() => setShowSupplierModal(false)}
          onSuccess={(newSupplier) => {
            setShowSupplierModal(false);
            fetchSuppliers();
            if (newSupplier?.id) {
              setFormData(prev => ({ ...prev, supplierId: newSupplier.id }));
            }
          }}
        />
      )}
    </>
  );
};

export default PurchaseOrderModal;
