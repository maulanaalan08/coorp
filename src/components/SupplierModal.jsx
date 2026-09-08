import React, { useState, useEffect } from 'react';
import styles from '../styles/PurchaseOrderModal.module.css';
import { X, Save, Building, Plus, Package, Eye } from 'lucide-react';
import { useSupplier } from '../hooks/useSupplier';
import toast from 'react-hot-toast';

const fmtRp = (n) =>
  "Rp " + Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

const SupplierModal = ({ onClose, onSuccess, isInline }) => {
  const {
    suppliers,
    supplierItems,
    loadingSuppliers,
    loadingItems,
    fetchSupplierItems,
    createSupplier,
    createSupplierItem
  } = useSupplier();

  const [activeTab, setActiveTab] = useState('suppliers');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedDetailSupplier, setSelectedDetailSupplier] = useState(null);

  // Form states
  const [supplierForm, setSupplierForm] = useState({
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

  const [itemForm, setItemForm] = useState({
    supplierId: '',
    itemName: '',
    unit: '',
    currentPrice: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'items') {
      fetchSupplierItems(selectedSupplierId);
    }
  }, [activeTab, selectedSupplierId, fetchSupplierItems]);

  const handleSupplierChange = (e) => {
    setSupplierForm({ ...supplierForm, [e.target.name]: e.target.value });
  };

  const handleItemChange = (e) => {
    setItemForm({ ...itemForm, [e.target.name]: e.target.value });
  };

  const handleSubmitSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.name) {
      toast.error('Nama Supplier / Toko wajib diisi!');
      return;
    }
    setLoading(true);
    try {
      await createSupplier(supplierForm);
      setSupplierForm({ ...supplierForm, code: '', name: '', phone: '', email: '' });
      if (onSuccess && !isInline) onSuccess();
    } catch (err) {
      // handled in hook
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!itemForm.supplierId || !itemForm.itemName || !itemForm.unit || !itemForm.currentPrice) {
      toast.error('Mohon lengkapi data item');
      return;
    }
    setLoading(true);
    try {
      await createSupplierItem({
        supplierId: itemForm.supplierId,
        itemName: itemForm.itemName,
        unit: itemForm.unit,
        price: parseFloat(itemForm.currentPrice)
      });
      setItemForm({ ...itemForm, itemName: '', unit: '', currentPrice: '' });
      fetchSupplierItems(selectedSupplierId);
    } catch (err) {
      // handled in hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={isInline ? '' : styles.modalOverlay}>
      <div className={isInline ? styles.inlineContainer : styles.modalContent}>
        <div className={isInline ? styles.inlineHeader : styles.modalHeader}>
          <h2 className={isInline ? styles.inlineTitle : styles.modalTitle}>
            <Building size={isInline ? 24 : 18} style={{ color: '#d4af37' }} /> Manage Supplier & Item
          </h2>
          {!isInline && <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>}
        </div>

        <div className={styles.supplierTabs}>
          <button
            className={`${styles.supplierTabBtn} ${activeTab === 'suppliers' ? styles.supplierTabBtnActive : ''}`}
            onClick={() => setActiveTab('suppliers')}
          >
            <Building size={16} /> Data Supplier
          </button>
          <button
            className={`${styles.supplierTabBtn} ${activeTab === 'items' ? styles.supplierTabBtnActive : ''}`}
            onClick={() => setActiveTab('items')}
          >
            <Package size={16} /> Item Supplier
          </button>
        </div>

        <div className={styles.modalBody}>
          {activeTab === 'suppliers' && (
            <div className={styles.supplierContentGrid}>
              <div className={styles.supplierCard}>
                <h3 className={styles.supplierSectionTitle}>
                  <Plus size={18} /> Tambah Supplier Baru
                </h3>
                <form onSubmit={handleSubmitSupplier}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Kode Supplier</label>
                      <input type="text" name="code" className={styles.formInput} placeholder="Auto-generate" disabled />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Nama Supplier / Toko *</label>
                      <input type="text" name="name" value={supplierForm.name} onChange={handleSupplierChange} className={styles.formInput} placeholder="Contoh: TB. Makmur Jaya" required />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Tipe Supplier</label>
                      <select name="type" value={supplierForm.type} onChange={handleSupplierChange} className={styles.formSelect}>
                        <option value="BAHAN">BAHAN</option>
                        <option value="JASA">JASA</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Grup Pajak</label>
                      <select name="taxGroup" value={supplierForm.taxGroup} onChange={handleSupplierChange} className={styles.formSelect}>
                        <option value="NON_PPN">NON PPN</option>
                        <option value="PPN">PPN</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Nama Kontak (Attn)</label>
                      <input type="text" name="contactName" value={supplierForm.contactName} onChange={handleSupplierChange} className={styles.formInput} placeholder="Contoh: Bpk. Budi" />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Email</label>
                      <input type="email" name="email" value={supplierForm.email} onChange={handleSupplierChange} className={styles.formInput} placeholder="Contoh: tbmakmur@gmail.com" />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>No. Telepon</label>
                      <input type="text" name="phone" value={supplierForm.phone} onChange={handleSupplierChange} className={styles.formInput} placeholder="Contoh: 08123456789" />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Rekening Bank</label>
                      <input type="text" name="bankAccount" value={supplierForm.bankAccount} onChange={handleSupplierChange} className={styles.formInput} placeholder="BCA 123456789 a/n Makmur" />
                    </div>

                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                      <label className={styles.formLabel}>Batas Kredit (Rp)</label>
                      <input type="number" name="creditLimit" value={supplierForm.creditLimit} onChange={handleSupplierChange} className={styles.formInput} placeholder="Contoh: 50000000" />
                    </div>

                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                      <label className={styles.formLabel}>Alamat Utama</label>
                      <textarea name="address" value={supplierForm.address} onChange={handleSupplierChange} className={styles.formInput} placeholder="Alamat lengkap toko" rows={2} />
                    </div>
                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                      <label className={styles.formLabel}>Alamat Cabang / Lainnya</label>
                      <textarea name="address2" value={supplierForm.address2} onChange={handleSupplierChange} className={styles.formInput} placeholder="Alamat opsional" rows={2} />
                    </div>
                  </div>

                  <div className={styles.modalFooter} style={{ marginTop: '20px' }}>
                    <button type="submit" className={styles.saveBtn} disabled={loading}>
                      <Save size={16} /> Simpan Supplier
                    </button>
                  </div>
                </form>
              </div>

              <div className={styles.supplierTableSection}>
                <h3 className={styles.supplierSectionTitle}>Daftar Supplier Tersimpan</h3>
                {loadingSuppliers ? (
                  <p style={{ color: '#a3a3a3' }}>Memuat data...</p>
                ) : (
                  <div className={styles.supplierTableWrapper}>
                    <table className={styles.supplierTable}>
                      <thead>
                        <tr>
                          <th>Kode</th>
                          <th>Nama Supplier</th>
                          <th>No. Telepon</th>
                          <th>Tipe</th>
                          <th style={{ textAlign: 'center' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suppliers.map(sup => (
                          <tr key={sup.id}>
                            <td>{sup.code || '-'}</td>
                            <td style={{ fontWeight: '500', color: '#e5e5e5' }}>{sup.name}</td>
                            <td>{sup.phone || '-'}</td>
                            <td>
                              <span className={sup.type === 'BAHAN' ? styles.badgeBahan : styles.badgeJasa}>
                                {sup.type || '-'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                onClick={() => setSelectedDetailSupplier(sup)}
                                style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: '4px' }}
                                title="Lihat Detail"
                              >
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {suppliers.length === 0 && (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#737373' }}>Belum ada supplier</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'items' && (
            <div className={styles.supplierContentGrid}>
              <div className={styles.supplierCard}>
                <h3 className={styles.supplierSectionTitle}>
                  <Plus size={18} /> Tambah Item Supplier
                </h3>
                <form onSubmit={handleAddItem}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                      <label className={styles.formLabel}>Pilih Supplier *</label>
                      <select name="supplierId" value={itemForm.supplierId} onChange={handleItemChange} className={styles.formSelect} required>
                        <option value="">- Pilih Supplier -</option>
                        {suppliers.map(sup => (
                          <option key={sup.id} value={sup.id}>{sup.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                      <label className={styles.formLabel}>Nama Item *</label>
                      <input type="text" name="itemName" value={itemForm.itemName} onChange={handleItemChange} className={styles.formInput} placeholder="Misal: Semen Tiga Roda 50kg" required />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Satuan (Unit) *</label>
                      <input type="text" name="unit" value={itemForm.unit} onChange={handleItemChange} className={styles.formInput} placeholder="Misal: Sak, Kg, Ltr, M2" required />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Harga Satuan *</label>
                      <input type="number" name="currentPrice" value={itemForm.currentPrice} onChange={handleItemChange} className={styles.formInput} placeholder="Misal: 65000" required />
                    </div>
                  </div>

                  <div className={styles.modalFooter} style={{ marginTop: '20px' }}>
                    <button type="submit" className={styles.saveBtn} disabled={loading || !itemForm.supplierId}>
                      <Save size={16} /> Simpan Item
                    </button>
                  </div>
                </form>
              </div>

              <div className={styles.supplierTableSection}>
                <div className={styles.supplierTableToolbar}>
                  <h3 className={styles.supplierSectionTitle} style={{ margin: 0 }}>Katalog Item</h3>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className={styles.formSelect}
                    style={{ width: '200px' }}
                  >
                    <option value="">Semua Supplier</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.name}</option>
                    ))}
                  </select>
                </div>

                {loadingItems ? (
                  <p style={{ color: '#a3a3a3' }}>Memuat item...</p>
                ) : (
                  <div className={styles.supplierTableWrapper}>
                    <table className={styles.supplierTable}>
                      <thead>
                        <tr>
                          <th>Supplier</th>
                          <th>Nama Item</th>
                          <th>Satuan</th>
                          <th style={{ textAlign: 'right' }}>Harga Terkini</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierItems.map(item => (
                          <tr key={item.id}>
                            <td style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Building size={14} style={{ color: '#737373' }} /> {item.supplier?.name}</td>
                            <td style={{ fontWeight: '500', color: '#f60d0dff' }}>{item.itemName}</td>
                            <td>{item.unit}</td>
                            <td className={styles.supplierPrice}>{fmtRp(item.currentPrice)}</td>
                          </tr>
                        ))}
                        {supplierItems.length === 0 && (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#737373' }}>Belum ada item</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal Overlay */}
      {selectedDetailSupplier && (
        <div className={styles.modalOverlay} style={{ zIndex: 1000, background: 'rgba(0,0,0,0.8)' }}>
          <div className={styles.modalContent} style={{ maxWidth: '600px', width: '90%' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Building size={18} style={{ color: '#d4af37' }} /> Detail Supplier
              </h2>
              <button className={styles.closeBtn} onClick={() => setSelectedDetailSupplier(null)}><X size={20} /></button>
            </div>
            <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '0.95rem' }}>
                <span style={{ color: '#888' }}>Kode:</span>
                <span style={{ color: '#e5e5e5', fontWeight: '500' }}>{selectedDetailSupplier.code || '-'}</span>

                <span style={{ color: '#888' }}>Nama Toko:</span>
                <span style={{ color: '#e5e5e5', fontWeight: '600' }}>{selectedDetailSupplier.name}</span>

                <span style={{ color: '#888' }}>Tipe:</span>
                <span>
                  <span className={selectedDetailSupplier.type === 'BAHAN' ? styles.badgeBahan : styles.badgeJasa}>
                    {selectedDetailSupplier.type || '-'}
                  </span>
                </span>

                <span style={{ color: '#888' }}>Grup Pajak:</span>
                <span style={{ color: '#e5e5e5' }}>{selectedDetailSupplier.taxGroup || '-'}</span>

                <span style={{ color: '#888' }}>Kontak:</span>
                <span style={{ color: '#e5e5e5' }}>{selectedDetailSupplier.contactName || '-'}</span>

                <span style={{ color: '#888' }}>Telepon:</span>
                <span style={{ color: '#e5e5e5' }}>{selectedDetailSupplier.phone || '-'}</span>

                <span style={{ color: '#888' }}>Email:</span>
                <span style={{ color: '#e5e5e5' }}>{selectedDetailSupplier.email || '-'}</span>

                <span style={{ color: '#888' }}>Bank:</span>
                <span style={{ color: '#e5e5e5' }}>{selectedDetailSupplier.bankAccount || '-'}</span>

                <span style={{ color: '#888' }}>Batas Kredit:</span>
                <span style={{ color: '#e5e5e5' }}>{selectedDetailSupplier.creditLimit ? fmtRp(selectedDetailSupplier.creditLimit) : '-'}</span>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ color: '#d4af37', fontSize: '0.85rem', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Alamat Utama</h4>
                <p style={{ color: '#ccc', margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>{selectedDetailSupplier.address || '-'}</p>
              </div>

              {selectedDetailSupplier.address2 && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ color: '#d4af37', fontSize: '0.85rem', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Alamat Lainnya</h4>
                  <p style={{ color: '#ccc', margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>{selectedDetailSupplier.address2}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierModal;
