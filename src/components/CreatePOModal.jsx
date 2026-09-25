import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import styles from '../styles/CreatePOModal.module.css';
import { usePO } from '../hooks/usePO';
import toast from 'react-hot-toast';

const CreatePOModal = ({ isOpen, onClose, selectedItem, mrItem, projectId }) => {
  const { suppliers, createNewPO } = usePO();

  const [formData, setFormData] = useState({
    supplierId: '',
    tanggalPO: new Date().toISOString().split('T')[0],
    qty: '',
    hargaDeal: '',
    keterangan: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default values when modal opens or selectedItem changes
  useEffect(() => {
    if (isOpen && selectedItem) {
      // Prioritize mrItem's orderedVolume if available, otherwise fallback to item's calculation
      const defaultQty = mrItem?.estimatedVolume
        ? Number(mrItem.estimatedVolume)
        : Number(selectedItem.coefficient || 0) * Number(selectedItem.parentVolume || 0);

      setFormData({
        supplierId: suppliers.length > 0 ? suppliers[0].id : '',
        tanggalPO: new Date().toISOString().split('T')[0],
        qty: defaultQty.toFixed(2),
        hargaDeal: selectedItem.unitPrice || 0,
        keterangan: '',
      });
    }
  }, [isOpen, selectedItem, mrItem, suppliers]);

  if (!isOpen || !selectedItem) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplierId) {
      toast.error('Silakan pilih Toko/Supplier');
      return;
    }
    if (!projectId) {
      toast.error('Project belum dipilih');
      return;
    }

    setIsSubmitting(true);
    try {
      const qty = Number(formData.qty || 0);
      const unitPrice = Number(formData.hargaDeal || 0);
      const total = qty * unitPrice;

      // Payload mengikuti skema POST /api/finance/po
      const payload = {
        supplierId: formData.supplierId,
        projectId,
        kategoriPO: 'MATERIAL',
        tanggal: formData.tanggalPO,
        keterangan: formData.keterangan || null,
        subTotal: total,
        globalDiscount: 0,
        taxNominal: 0,
        grandTotal: total,
        items: [
          {
            materialRequestId: mrItem?.id || null,
            description: selectedItem.name,
            description2: null,
            qty,
            unit: selectedItem.unit || mrItem?.unit || '-',
            unitPrice,
            disc1Percent: 0,
            disc2Percent: 0,
            disc2Nominal: 0,
            kategoriItem: '',
            total,
          },
        ],
      };

      await createNewPO(payload);
      toast.success('PO dibuat. Menunggu verifikasi Finance.');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Gagal menyimpan PO');
    } finally {
      setIsSubmitting(false);
    }
  };

  const subTotal = Number(formData.qty || 0) * Number(formData.hargaDeal || 0);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Buat Purchase Order (PO)</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            <div className={styles.formGroup}>
              <label>Item Material</label>
              <input type="text" value={selectedItem.name} disabled />
            </div>

            <div className={styles.formGroup}>
              <label>Toko / Supplier</label>
              <select 
                name="supplierId" 
                value={formData.supplierId} 
                onChange={handleChange}
                required
              >
                <option value="" disabled>-- Pilih Supplier --</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Tanggal PO</label>
              <input 
                type="date" 
                name="tanggalPO" 
                value={formData.tanggalPO} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className={styles.formGroup}>
                <label>Kuantitas (Qty)</label>
                <input 
                  type="number" 
                  name="qty" 
                  value={formData.qty} 
                  onChange={handleChange} 
                  step="any"
                  min="0"
                  required 
                />
              </div>

              <div className={styles.formGroup}>
                <label>Harga Deal per Satuan (Rp)</label>
                <input 
                  type="number" 
                  name="hargaDeal" 
                  value={formData.hargaDeal} 
                  onChange={handleChange} 
                  min="0"
                  required 
                />
              </div>
            </div>

            <div className={styles.subtotalPreview}>
              <span>Preview Subtotal:</span>
              <strong>
                Rp {subTotal.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
              </strong>
            </div>
          </div>

          <div className={styles.footer}>
            <button 
              type="button" 
              className={styles.cancelBtn} 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button 
              type="submit" 
              className={styles.saveBtn}
              disabled={isSubmitting}
            >
              <Save size={16} />
              {isSubmitting ? 'Menyimpan...' : 'Simpan PO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePOModal;
