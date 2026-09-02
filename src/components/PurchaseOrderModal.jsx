import React, { useState, useEffect, useMemo } from 'react';
import styles from '../styles/PurchaseOrderModal.module.css';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { poService } from '../services/poService';
import SupplierModal from './SupplierModal';
import toast from 'react-hot-toast';

const fmtRp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

const PurchaseOrderModal = ({ selectedItems, projectId, editingPo, onClose, onSuccess }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form Header State
  const [formData, setFormData] = useState({
    poNumber: '',
    tanggal: new Date().toISOString().slice(0, 10),
    deliveryDate: '',
    supplierId: '',
    kategori: 'Material',
    perusahaan: 'PT DIVES JAYA PERKASA',
    penerimaBarang: '',
    caraPembayaran: '',
    jadwalPenagihan: '',
    keterangan: ''
  });

  // Items State (editable)
  const [items, setItems] = useState([]);

  // Discount & Tax State
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [taxNominal, setTaxNominal] = useState(0);

  useEffect(() => {
    fetchSuppliers();
    
    if (editingPo) {
      // Initialize form from editingPo
      setFormData({
        poNumber: editingPo.poNumber,
        tanggal: editingPo.tanggal ? new Date(editingPo.tanggal).toISOString().slice(0, 10) : '',
        deliveryDate: editingPo.deliveryDate ? new Date(editingPo.deliveryDate).toISOString().slice(0, 10) : '',
        supplierId: editingPo.supplierId || '',
        kategori: editingPo.kategori || 'Material',
        perusahaan: editingPo.perusahaan || 'PT DIVES JAYA PERKASA',
        penerimaBarang: editingPo.penerimaBarang || '',
        caraPembayaran: editingPo.caraPembayaran || '',
        jadwalPenagihan: editingPo.jadwalPenagihan || '',
        keterangan: editingPo.keterangan || ''
      });
      setGlobalDiscount(editingPo.globalDiscount || 0);
      setTaxNominal(editingPo.taxNominal || 0);
      
      const initialItems = (editingPo.items || []).map(item => ({
        materialRequestId: item.materialRequestId,
        description: item.description,
        description2: item.description2 || '',
        qty: item.qty,
        unit: item.unit || '',
        unitPrice: item.unitPrice || 0,
        disc1Percent: item.disc1Percent || 0,
        disc2Nominal: item.disc2Nominal || 0,
        total: item.total || 0
      }));
      setItems(initialItems);
    } else {
      // Inisialisasi items dari selectedItems (Buat PO Baru)
      const initialItems = (selectedItems || []).map(item => ({
        materialRequestId: item.id,
        description: item.itemName,
        description2: '',
        qty: Math.max(0, (item.estimatedVolume || 0) - (item.orderedQty || 0)), // default sisa qty
        unit: item.unit || '',
        unitPrice: item.pricePerUnit || 0, // default harga dari RAB
        disc1Percent: 0,
        disc2Nominal: 0,
        total: 0 // dihitung
      }));
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

  const handleSupplierSuccess = (newSupplier) => {
    setShowSupplierModal(false);
    setSuppliers(prev => [...prev, newSupplier].sort((a, b) => a.name.localeCompare(b.name)));
    setFormData(prev => ({ ...prev, supplierId: newSupplier.id }));
  };

  const handleHeaderChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const calculatedItems = useMemo(() => {
    return items.map(item => {
      const qty = Number(item.qty || 0);
      const price = Number(item.unitPrice || 0);
      let total = qty * price;
      
      const discPercent = Number(item.disc1Percent || 0);
      if (discPercent > 0) total -= (total * discPercent / 100);
      
      const discNominal = Number(item.disc2Nominal || 0);
      if (discNominal > 0) total -= discNominal;

      return { ...item, total: total > 0 ? total : 0 };
    });
  }, [items]);

  const subTotal = calculatedItems.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = subTotal - Number(globalDiscount || 0) + Number(taxNominal || 0);

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
      subTotal,
      globalDiscount: Number(globalDiscount),
      taxNominal: Number(taxNominal),
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
          <h2 className={styles.modalTitle}>{editingPo ? 'Edit Purchase Order (PO)' : 'Buat Purchase Order (PO)'}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nomor Surat PO *</label>
              <input type="text" name="poNumber" required className={styles.formInput} value={formData.poNumber} onChange={handleHeaderChange} placeholder="Contoh: PO/GLD/09/2026/014" disabled={!!editingPo} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Supplier / Toko *</label>
              <div className={styles.supplierSelectGroup}>
                <select name="supplierId" required className={styles.formSelect} value={formData.supplierId} onChange={handleHeaderChange} style={{ flex: 1 }}>
                  <option value="">-- Pilih Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button type="button" className={styles.addSupplierBtn} onClick={() => setShowSupplierModal(true)} title="Tambah Supplier Baru">
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tanggal PO *</label>
              <input type="date" name="tanggal" required className={styles.formInput} value={formData.tanggal} onChange={handleHeaderChange} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Delivery Date</label>
              <input type="date" name="deliveryDate" className={styles.formInput} value={formData.deliveryDate} onChange={handleHeaderChange} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Penerima Barang</label>
              <input type="text" name="penerimaBarang" className={styles.formInput} value={formData.penerimaBarang} onChange={handleHeaderChange} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Cara Pembayaran</label>
              <input type="text" name="caraPembayaran" className={styles.formInput} value={formData.caraPembayaran} onChange={handleHeaderChange} placeholder="Contoh: Transfer / Cash" />
            </div>
            
            <div className={styles.formGroupFull}>
              <label className={styles.formLabel}>Keterangan Tambahan</label>
              <input type="text" name="keterangan" className={styles.formInput} value={formData.keterangan} onChange={handleHeaderChange} />
            </div>
          </div>

          <div className={styles.itemsSection}>
            <div className={styles.itemsHeader}>Daftar Pesanan</div>
            <div className={styles.itemsTableWrapper}>
              <table className={styles.itemsTable}>
                <thead>
                  <tr>
                    <th>NAMA BARANG</th>
                    <th>SPESIFIKASI</th>
                    <th className={styles.cellRight}>QTY</th>
                    <th>SATUAN</th>
                    <th className={styles.cellRight}>HARGA SATUAN</th>
                    <th className={styles.cellRight}>TOTAL</th>
                    <th className={styles.cellCenter}>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedItems.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Tidak ada barang yang dipesan.</td></tr>
                  ) : (
                    calculatedItems.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <input type="text" className={styles.smallInputText} value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} style={{ width: '150px' }} />
                        </td>
                        <td>
                          <input type="text" className={styles.smallInputText} value={item.description2} onChange={(e) => handleItemChange(index, 'description2', e.target.value)} placeholder="Opsional" style={{ width: '120px' }} />
                        </td>
                        <td className={styles.cellRight}>
                          <input type="number" step="0.01" className={styles.smallInput} value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} />
                        </td>
                        <td>
                          <input type="text" className={styles.smallInputText} value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} style={{ width: '70px' }} />
                        </td>
                        <td className={styles.cellRight}>
                          <input type="number" className={styles.smallInput} value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)} />
                        </td>
                        <td className={`${styles.cellMono} ${styles.cellRight}`}>
                          {fmtRp(item.total)}
                        </td>
                        <td className={styles.cellCenter}>
                          <button type="button" className={styles.removeBtn} onClick={() => handleRemoveItem(index)}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.summarySection}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Sub Total:</span>
              <span className={styles.summaryValue}>{fmtRp(subTotal)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Discount (Rp):</span>
              <div className={styles.discountInputWrapper}>
                <input type="number" className={styles.smallInput} value={globalDiscount} onChange={(e) => setGlobalDiscount(e.target.value)} />
              </div>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Tax/Pajak (Rp):</span>
              <div className={styles.discountInputWrapper}>
                <input type="number" className={styles.smallInput} value={taxNominal} onChange={(e) => setTaxNominal(e.target.value)} />
              </div>
            </div>
            <div className={`${styles.summaryRow} ${styles.grandTotalRow}`}>
              <span className={styles.summaryLabel} style={{ color: '#d4af37' }}>GRAND TOTAL:</span>
              <span className={styles.summaryValue}>{fmtRp(grandTotal)}</span>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>Batal</button>
            <button type="submit" className={styles.saveBtn} disabled={loading}>
              <Save size={16} /> Buat PO
            </button>
          </div>
        </form>
      </div>

      {showSupplierModal && (
        <SupplierModal 
          onClose={() => setShowSupplierModal(false)}
          onSuccess={handleSupplierSuccess}
        />
      )}
    </div>
  );
};

export default PurchaseOrderModal;
