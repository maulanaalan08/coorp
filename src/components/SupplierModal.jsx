import React, { useState } from 'react';
import styles from '../styles/PurchaseOrderModal.module.css';
import { X, Save, Building } from 'lucide-react';
import { poService } from '../services/poService';
import toast from 'react-hot-toast';

const SupplierModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'BAHAN',
    address: '',
    address2: '',
    phone: '',
    fax: '',
    taxGroup: 'NON_PPN',
    npwp: '',
    email: '',
    contactName: '',
    creditLimit: '',
    bankAccount: '',
    status: 'ACTIVE'
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Nama Supplier / Toko wajib diisi!');
      return;
    }

    setLoading(true);
    const promise = poService.createSupplier(formData).then((res) => {
      onSuccess(res); // Pass the newly created supplier back
    });

    toast.promise(promise, {
      loading: 'Menyimpan supplier...',
      success: 'Supplier berhasil ditambahkan!',
      error: 'Gagal menambahkan supplier'
    }).finally(() => {
      setLoading(false);
    });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxWidth: '800px', width: '90%' }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <Building size={18} /> Tambah Supplier Baru
          </h2>
          <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Kode Supplier</label>
              <input type="text" name="code" value={formData.code} onChange={handleChange} className={styles.formInput} placeholder="Contoh: SUP-001" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nama Supplier / Toko *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className={styles.formInput} placeholder="Contoh: TB. Makmur Jaya" required />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tipe Supplier</label>
              <select name="type" value={formData.type} onChange={handleChange} className={styles.formSelect}>
                <option value="BAHAN">BAHAN</option>
                <option value="JASA">JASA</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Grup Pajak</label>
              <select name="taxGroup" value={formData.taxGroup} onChange={handleChange} className={styles.formSelect}>
                <option value="NON_PPN">NON PPN</option>
                <option value="PPN">PPN</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nama Kontak (Attn)</label>
              <input type="text" name="contactName" value={formData.contactName} onChange={handleChange} className={styles.formInput} placeholder="Contoh: Bpk. Budi" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className={styles.formInput} placeholder="Contoh: tbmakmur@gmail.com" />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>No. Telepon</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className={styles.formInput} placeholder="Contoh: 08123456789" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Fax</label>
              <input type="text" name="fax" value={formData.fax} onChange={handleChange} className={styles.formInput} placeholder="Contoh: 021-123456" />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>NPWP</label>
              <input type="text" name="npwp" value={formData.npwp} onChange={handleChange} className={styles.formInput} placeholder="Nomor NPWP" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Rekening Bank</label>
              <input type="text" name="bankAccount" value={formData.bankAccount} onChange={handleChange} className={styles.formInput} placeholder="BCA 123456789 a/n Makmur" />
            </div>

            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label className={styles.formLabel}>Batas Kredit (Rp)</label>
              <input type="number" name="creditLimit" value={formData.creditLimit} onChange={handleChange} className={styles.formInput} placeholder="Contoh: 50000000" />
            </div>

            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label className={styles.formLabel}>Alamat Utama</label>
              <textarea name="address" value={formData.address} onChange={handleChange} className={styles.formInput} placeholder="Alamat lengkap toko" rows={2} />
            </div>
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label className={styles.formLabel}>Alamat Cabang / Lainnya</label>
              <textarea name="address2" value={formData.address2} onChange={handleChange} className={styles.formInput} placeholder="Alamat opsional" rows={2} />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>Batal</button>
            <button type="submit" className={styles.saveBtn} disabled={loading}>
              <Save size={16} /> Simpan Supplier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierModal;
