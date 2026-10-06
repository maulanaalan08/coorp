import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styles from '../styles/PurchaseOrderModal.module.css';
import { X, Save, Building, Plus, Package, Eye, Trash2, Pencil, Search, ChevronLeft, ChevronRight, Filter, Wrench } from 'lucide-react';
import { useSupplier } from '../hooks/useSupplier';
import { poService } from '../services/poService';
import toast from 'react-hot-toast';

const fmtRp = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const SupplierModal = ({ onClose, onSuccess, isInline, masterMode = 'supplier' }) => {
  const isJasaMode = masterMode === 'jasa';

  const {
    suppliers,
    supplierItems,
    loadingSuppliers,
    loadingItems,
    fetchSuppliers,
    fetchSupplierItems,
    createSupplier,
    createSupplierItem,
  } = useSupplier();

  const [activeTab, setActiveTab] = useState('suppliers');
  
  // -- FOR SUPPLIER --
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [selectedDetailSupplier, setSelectedDetailSupplier] = useState(null);

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
    status: 'ACTIVE',
  });

  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierTypeFilter, setSupplierTypeFilter] = useState('');
  const [supplierLimit, setSupplierLimit] = useState(10);
  const [supplierPage, setSupplierPage] = useState(1);

  // -- FOR ITEM --
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [itemForm, setItemForm] = useState({
    supplierId: '',
    itemName: '',
    unit: '',
    currentPrice: '',
    kategori: '',
  });

  const [itemSearch, setItemSearch] = useState('');
  const [itemKategoriFilter, setItemKategoriFilter] = useState('');
  const [itemSupplierFilter, setItemSupplierFilter] = useState('');
  const [itemLimit, setItemLimit] = useState(10);
  const [itemPage, setItemPage] = useState(1);

  const [loading, setLoading] = useState(false);

  // -- JASA MODE (Unchanged) --
  const [jasaList, setJasaList] = useState([]);
  const [loadingJasa, setLoadingJasa] = useState(false);
  const [editingJasaId, setEditingJasaId] = useState(null);
  const [jasaForm, setJasaForm] = useState({
    nama: '',
    bank: '',
    noRekening: '',
    atasNama: '',
    kontakPerson: '',
    isActive: true,
  });

  const fetchJasa = useCallback(async () => {
    if (!isJasaMode) return;
    setLoadingJasa(true);
    try {
      const data = await poService.getJasa();
      setJasaList(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Gagal mengambil data master jasa');
    } finally {
      setLoadingJasa(false);
    }
  }, [isJasaMode]);

  useEffect(() => {
    if (isJasaMode) {
      fetchJasa();
      return;
    }
    if (activeTab === 'items') {
      fetchSupplierItems();
    }
  }, [isJasaMode, fetchJasa, activeTab, fetchSupplierItems]);

  const handleSupplierChange = (e) => {
    setSupplierForm({ ...supplierForm, [e.target.name]: e.target.value });
  };

  const handleItemChange = (e) => {
    setItemForm({ ...itemForm, [e.target.name]: e.target.value });
  };

  // -- SUBMIT SUPPLIER --
  const handleSubmitSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.name) {
      toast.error('Nama Supplier / Toko wajib diisi!');
      return;
    }
    setLoading(true);
    try {
      const payload = { ...supplierForm };
      if (!payload.creditLimit) delete payload.creditLimit;
      else payload.creditLimit = Number(payload.creditLimit);

      if (editingSupplier) {
        await poService.updateSupplier(editingSupplier.id, payload);
        toast.success('Supplier diupdate!');
      } else {
        await poService.createSupplier(payload);
        toast.success('Supplier ditambahkan!');
      }
      
      setSupplierForm({ code: '', name: '', type: 'BAHAN', address: '', address2: '', phone: '', fax: '', taxGroup: 'NON_PPN', npwp: '', email: '', contactName: '', creditLimit: '', bankAccount: '', status: 'ACTIVE' });
      setShowSupplierForm(false);
      setEditingSupplier(null);
      await fetchSuppliers();
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = async (id) => {
    if (!window.confirm("Hapus supplier ini?")) return;
    try {
      await poService.deleteSupplier(id);
      toast.success("Supplier dihapus");
      fetchSuppliers();
    } catch(err) {
      toast.error(err?.message || "Gagal menghapus");
    }
  };

  // -- SUBMIT ITEM --
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!itemForm.supplierId || !itemForm.itemName || !itemForm.unit || !itemForm.currentPrice) {
      toast.error('Mohon lengkapi data item');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        supplierId: itemForm.supplierId,
        itemName: itemForm.itemName,
        unit: itemForm.unit,
        price: parseFloat(itemForm.currentPrice),
        kategori: itemForm.kategori || undefined,
      };

      if (editingItem) {
        await poService.updateSupplierItem(editingItem.id, payload);
        toast.success('Item diupdate');
      } else {
        await poService.createSupplierItem(payload);
        toast.success('Item ditambahkan');
      }
      
      setItemForm({ supplierId: '', itemName: '', unit: '', currentPrice: '', kategori: '' });
      setShowItemForm(false);
      setEditingItem(null);
      fetchSupplierItems();
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan item');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Hapus item ini?")) return;
    try {
      await poService.deleteSupplierItem(id);
      toast.success("Item dihapus");
      fetchSupplierItems();
    } catch(err) {
      toast.error(err?.message || "Gagal menghapus item");
    }
  };

  // -- JASA MODE (Unchanged structure, kept intact) --
  const resetJasaForm = () => {
    setEditingJasaId(null);
    setJasaForm({
      nama: '',
      bank: '',
      noRekening: '',
      atasNama: '',
      kontakPerson: '',
      isActive: true,
    });
  };

  const handleSubmitJasa = async (e) => {
    e.preventDefault();
    if (!jasaForm.nama || !String(jasaForm.nama).trim()) {
      toast.error('Nama jasa wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nama: jasaForm.nama,
        bank: jasaForm.bank || null,
        noRekening: jasaForm.noRekening || null,
        atasNama: jasaForm.atasNama || null,
        kontakPerson: jasaForm.kontakPerson || null,
        isActive: Boolean(jasaForm.isActive),
      };

      let saved;
      if (editingJasaId) {
        saved = await poService.updateJasa(editingJasaId, payload);
        toast.success('Data jasa berhasil diupdate');
      } else {
        saved = await poService.createJasa(payload);
        toast.success('Master jasa berhasil ditambahkan');
      }

      resetJasaForm();
      await fetchJasa();
      if (onSuccess && !isInline) onSuccess(saved);
    } catch (error) {
      toast.error(error?.message || 'Gagal menyimpan data jasa');
    } finally {
      setLoading(false);
    }
  };

  const handleEditJasa = (row) => {
    setEditingJasaId(row.id);
    setJasaForm({
      nama: row.nama || '',
      bank: row.bank || '',
      noRekening: row.noRekening || '',
      atasNama: row.atasNama || '',
      kontakPerson: row.kontakPerson || '',
      isActive: Boolean(row.isActive),
    });
  };

  const handleDeleteJasa = async (row) => {
    if (!window.confirm(`Hapus jasa ${row.nama}?`)) return;
    try {
      await poService.deleteJasa(row.id);
      toast.success('Master jasa dihapus');
      fetchJasa();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus jasa');
    }
  };

  // -- FILTER & PAGINATION SUPPLIER --
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      if (supplierTypeFilter && s.type !== supplierTypeFilter) return false;
      if (supplierSearch && !s.name?.toLowerCase().includes(supplierSearch.toLowerCase())) return false;
      return true;
    });
  }, [suppliers, supplierSearch, supplierTypeFilter]);

  const supplierTotalPages = supplierLimit === 100 ? 1 : Math.ceil(filteredSuppliers.length / supplierLimit);
  const displayedSuppliers = useMemo(() => {
    if (supplierLimit === 100) return filteredSuppliers;
    const start = (supplierPage - 1) * supplierLimit;
    return filteredSuppliers.slice(start, start + supplierLimit);
  }, [filteredSuppliers, supplierPage, supplierLimit]);

  // -- FILTER & PAGINATION ITEM --
  const filteredItems = useMemo(() => {
    return supplierItems.filter(i => {
      if (itemKategoriFilter && i.kategori !== itemKategoriFilter) return false;
      if (itemSupplierFilter && i.supplierId !== itemSupplierFilter) return false;
      if (itemSearch) {
        const searchLow = itemSearch.toLowerCase();
        const matchItem = i.itemName?.toLowerCase().includes(searchLow);
        const matchSupplier = i.supplier?.name?.toLowerCase().includes(searchLow);
        if (!matchItem && !matchSupplier) return false;
      }
      return true;
    });
  }, [supplierItems, itemSearch, itemKategoriFilter, itemSupplierFilter]);

  const itemTotalPages = itemLimit === 100 ? 1 : Math.ceil(filteredItems.length / itemLimit);
  const displayedItems = useMemo(() => {
    if (itemLimit === 100) return filteredItems;
    const start = (itemPage - 1) * itemLimit;
    return filteredItems.slice(start, start + itemLimit);
  }, [filteredItems, itemPage, itemLimit]);

  // If we're rendering the modal forms, they need a clean wrapper inside the modal
  const renderSupplierForm = () => (
    <div className={styles.modalOverlay} style={{ zIndex: 1100 }}>
      <div className={styles.modalContent} style={{ maxWidth: '800px', width: '90%' }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <Building size={18} style={{ color: '#d4af37' }} /> {editingSupplier ? 'Edit Supplier' : 'Tambah Supplier Baru'}
          </h2>
          <button className={styles.closeBtn} onClick={() => { setShowSupplierForm(false); setEditingSupplier(null); }}><X size={20} /></button>
        </div>
        <div className={styles.modalBody}>
          <form onSubmit={handleSubmitSupplier}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Kode Supplier</label>
                <input type="text" className={styles.formInput} placeholder="Auto-generate" disabled />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nama Supplier / Toko *</label>
                <input type="text" name="name" value={supplierForm.name} onChange={handleSupplierChange} className={styles.formInput} placeholder="Contoh: TB. Makmur Jaya" required />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tipe Supplier</label>
                <select name="type" value={supplierForm.type} onChange={handleSupplierChange} className={styles.formSelect}>
                  <option value="BAHAN">BAHAN</option>
                  <option value="ALAT">ALAT</option>
                  <option value="BAHAN_ALAT">BAHAN & ALAT</option>
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
      </div>
    </div>
  );

  const renderItemForm = () => (
    <div className={styles.modalOverlay} style={{ zIndex: 1100 }}>
      <div className={styles.modalContent} style={{ maxWidth: '600px', width: '90%' }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <Package size={18} style={{ color: '#d4af37' }} /> {editingItem ? 'Edit Item Supplier' : 'Tambah Item Supplier'}
          </h2>
          <button className={styles.closeBtn} onClick={() => { setShowItemForm(false); setEditingItem(null); }}><X size={20} /></button>
        </div>
        <div className={styles.modalBody}>
          <form onSubmit={handleAddItem}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.formLabel}>Pilih Supplier *</label>
                <select name="supplierId" value={itemForm.supplierId} onChange={handleItemChange} className={styles.formSelect} required>
                  <option value="">- Pilih Supplier -</option>
                  {suppliers.map((sup) => (
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
                <label className={styles.formLabel}>Kategori Item *</label>
                <select name="kategori" value={itemForm.kategori} onChange={handleItemChange} className={styles.formSelect} required>
                  <option value="">- Pilih -</option>
                  <option value="BAHAN">BAHAN</option>
                  <option value="ALAT">ALAT</option>
                </select>
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
      </div>
    </div>
  );

  // Return Master Jasa Mode
  if (isJasaMode) {
    return (
      <div className={isInline ? '' : styles.modalOverlay}>
        <div className={isInline ? styles.inlineContainer : styles.modalContent}>
          <div className={isInline ? styles.inlineHeader : styles.modalHeader}>
            <h2 className={isInline ? styles.inlineTitle : styles.modalTitle}>
              <Wrench size={isInline ? 24 : 18} style={{ color: '#d4af37' }} /> Master Jasa
            </h2>
            {!isInline && <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>}
          </div>

          <div className={styles.modalBody}>
            <div className={styles.supplierContentGrid}>
              <div className={styles.supplierCard}>
                <h3 className={styles.supplierSectionTitle}>
                  <Plus size={18} /> {editingJasaId ? 'Edit Jasa' : 'Tambah Jasa Baru'}
                </h3>
                <form onSubmit={handleSubmitJasa}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                      <label className={styles.formLabel}>Nama Jasa *</label>
                      <input type="text" name="nama" value={jasaForm.nama} onChange={(e) => setJasaForm({ ...jasaForm, nama: e.target.value })} className={styles.formInput} placeholder="Contoh: Tukang Pasang Keramik" required />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Bank</label>
                      <input type="text" name="bank" value={jasaForm.bank} onChange={(e) => setJasaForm({ ...jasaForm, bank: e.target.value })} className={styles.formInput} placeholder="Misal: BCA" />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>No. Rekening</label>
                      <input type="text" name="noRekening" value={jasaForm.noRekening} onChange={(e) => setJasaForm({ ...jasaForm, noRekening: e.target.value })} className={styles.formInput} placeholder="Misal: 123456789" />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Atas Nama</label>
                      <input type="text" name="atasNama" value={jasaForm.atasNama} onChange={(e) => setJasaForm({ ...jasaForm, atasNama: e.target.value })} className={styles.formInput} placeholder="Misal: Bpk. Budi" />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Kontak Person</label>
                      <input type="text" name="kontakPerson" value={jasaForm.kontakPerson} onChange={(e) => setJasaForm({ ...jasaForm, kontakPerson: e.target.value })} className={styles.formInput} placeholder="Misal: 0812xxxx" />
                    </div>
                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="checkbox" id="isActive" checked={jasaForm.isActive} onChange={(e) => setJasaForm({ ...jasaForm, isActive: e.target.checked })} />
                      <label htmlFor="isActive" style={{ color: '#ccc', cursor: 'pointer', fontSize: '0.9rem' }}>Aktif (Tampil di Dropdown)</label>
                    </div>
                  </div>
                  <div className={styles.modalFooter} style={{ marginTop: '20px' }}>
                    {editingJasaId && (
                      <button type="button" onClick={resetJasaForm} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        Batal Edit
                      </button>
                    )}
                    <button type="submit" className={styles.saveBtn} disabled={loading}>
                      <Save size={16} /> Simpan Jasa
                    </button>
                  </div>
                </form>
              </div>

              <div className={styles.supplierTableSection}>
                <h3 className={styles.supplierSectionTitle}>Daftar Master Jasa</h3>
                {loadingJasa ? (
                  <p style={{ color: '#a3a3a3' }}>Memuat data...</p>
                ) : (
                  <div className={styles.supplierTableWrapper}>
                    <table className={styles.supplierTable}>
                      <thead>
                        <tr>
                          <th>Nama Jasa</th>
                          <th>Kontak</th>
                          <th>Rekening</th>
                          <th style={{ textAlign: 'center' }}>Status</th>
                          <th style={{ textAlign: 'center' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jasaList.map((row) => (
                          <tr key={row.id}>
                            <td style={{ fontWeight: '500', color: '#e5e5e5' }}>{row.nama}</td>
                            <td>{row.kontakPerson || '-'}</td>
                            <td>{row.bank ? `${row.bank} - ${row.noRekening}` : '-'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '99px', background: row.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: row.isActive ? '#22c55e' : '#ef4444' }}>
                                {row.isActive ? 'Aktif' : 'Non-Aktif'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', gap: 8 }}>
                                <button type="button" onClick={() => handleEditJasa(row)} style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 4 }}>
                                  <Pencil size={15} />
                                </button>
                                <button type="button" onClick={() => handleDeleteJasa(row)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}>
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {jasaList.length === 0 && (
                          <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#737373' }}>Belum ada data jasa</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RETURN NORMAL MODE (SUPPLIERS & ITEMS) ---
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
            <div className={styles.supplierTableSection}>
              <div className={styles.supplierTableToolbar} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <h3 className={styles.supplierSectionTitle} style={{ margin: 0 }}>Daftar Supplier Tersimpan</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>Tampilkan:</span>
                    <select value={supplierLimit} onChange={(e) => { setSupplierLimit(Number(e.target.value)); setSupplierPage(1); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', padding: '4px 8px', fontSize: '12px' }}>
                      <option value={10}>10</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#888' }} />
                    <input type="text" placeholder="Cari supplier..." value={supplierSearch} onChange={e => setSupplierSearch(e.target.value)} className={styles.formInput} style={{ paddingLeft: '34px', width: '200px' }} />
                  </div>
                  
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Filter size={16} style={{ position: 'absolute', left: '10px', color: '#888' }} />
                    <select value={supplierTypeFilter} onChange={e => setSupplierTypeFilter(e.target.value)} className={styles.formSelect} style={{ paddingLeft: '34px', width: '150px' }}>
                      <option value="">Semua Tipe</option>
                      <option value="BAHAN">BAHAN</option>
                      <option value="ALAT">ALAT</option>
                      <option value="BAHAN_ALAT">BAHAN & ALAT</option>
                    </select>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingSupplier(null);
                      setSupplierForm({ code: '', name: '', type: 'BAHAN', address: '', address2: '', phone: '', fax: '', taxGroup: 'NON_PPN', npwp: '', email: '', contactName: '', creditLimit: '', bankAccount: '', status: 'ACTIVE' });
                      setShowSupplierForm(true);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(212,175,55,0.1)', border: '1px solid #d4af37', color: '#d4af37', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                  >
                    <Plus size={16} /> Tambah Supplier Baru
                  </button>
                </div>
              </div>

              {loadingSuppliers ? (
                <p style={{ color: '#a3a3a3' }}>Memuat data...</p>
              ) : (
                <div className={styles.supplierTableWrapper} style={{ overflowX: 'auto' }}>
                  <table className={styles.supplierTable} style={{ width: '100%', minWidth: '600px' }}>
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
                      {displayedSuppliers.map((sup) => (
                        <tr key={sup.id}>
                          <td>{sup.code || '-'}</td>
                          <td style={{ fontWeight: '500', color: '#e5e5e5' }}>{sup.name}</td>
                          <td>{sup.phone || '-'}</td>
                          <td>
                            <span className={sup.type === 'BAHAN' ? styles.badgeBahan : styles.badgeJasa}>
                              {sup.type === 'BAHAN_ALAT' ? 'BAHAN & ALAT' : sup.type || '-'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'center' }}>
                              <button
                                onClick={() => setSelectedDetailSupplier(sup)}
                                style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px' }}
                                title="Lihat Detail"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingSupplier(sup);
                                  setSupplierForm({
                                    code: sup.code || '',
                                    name: sup.name || '',
                                    type: sup.type || 'BAHAN',
                                    address: sup.address || '',
                                    address2: sup.address2 || '',
                                    phone: sup.phone || '',
                                    fax: sup.fax || '',
                                    taxGroup: sup.taxGroup || 'NON_PPN',
                                    npwp: sup.npwp || '',
                                    email: sup.email || '',
                                    contactName: sup.contactName || '',
                                    creditLimit: sup.creditLimit || '',
                                    bankAccount: sup.bankAccount || '',
                                    status: sup.status || 'ACTIVE'
                                  });
                                  setShowSupplierForm(true);
                                }}
                                style={{ background: 'transparent', border: 'none', color: '#eab308', cursor: 'pointer', padding: '4px' }}
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteSupplier(sup.id)}
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                title="Hapus"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {displayedSuppliers.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#737373' }}>
                            {suppliers.length === 0 ? 'Belum ada supplier' : 'Data tidak ditemukan'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* PAGINATION SUPPLIER */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
                {supplierTotalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button onClick={() => setSupplierPage(p => Math.max(1, p - 1))} disabled={supplierPage === 1} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: supplierPage === 1 ? '#555' : '#fff', padding: '4px', borderRadius: '4px', cursor: supplierPage === 1 ? 'not-allowed' : 'pointer' }}>
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: '12px', color: '#ccc', margin: '0 8px' }}>Halaman {supplierPage} dari {supplierTotalPages}</span>
                    <button onClick={() => setSupplierPage(p => Math.min(supplierTotalPages, p + 1))} disabled={supplierPage === supplierTotalPages} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: supplierPage === supplierTotalPages ? '#555' : '#fff', padding: '4px', borderRadius: '4px', cursor: supplierPage === supplierTotalPages ? 'not-allowed' : 'pointer' }}>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'items' && (
            <div className={styles.supplierTableSection}>
              <div className={styles.supplierTableToolbar} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <h3 className={styles.supplierSectionTitle} style={{ margin: 0 }}>Katalog Item</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>Tampilkan:</span>
                    <select value={itemLimit} onChange={(e) => { setItemLimit(Number(e.target.value)); setItemPage(1); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', padding: '4px 8px', fontSize: '12px' }}>
                      <option value={10}>10</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#888' }} />
                    <input type="text" placeholder="Cari item / supplier..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} className={styles.formInput} style={{ paddingLeft: '34px', width: '200px' }} />
                  </div>
                  
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Building size={16} style={{ position: 'absolute', left: '10px', color: '#888' }} />
                    <select value={itemSupplierFilter} onChange={e => setItemSupplierFilter(e.target.value)} className={styles.formSelect} style={{ paddingLeft: '34px', width: '150px' }}>
                      <option value="">Semua Supplier</option>
                      {suppliers.map(sup => (
                        <option key={sup.id} value={sup.id}>{sup.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Filter size={16} style={{ position: 'absolute', left: '10px', color: '#888' }} />
                    <select value={itemKategoriFilter} onChange={e => setItemKategoriFilter(e.target.value)} className={styles.formSelect} style={{ paddingLeft: '34px', width: '150px' }}>
                      <option value="">Semua Kategori</option>
                      <option value="BAHAN">BAHAN</option>
                      <option value="ALAT">ALAT</option>
                    </select>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingItem(null);
                      setItemForm({ supplierId: '', itemName: '', unit: '', currentPrice: '', kategori: '' });
                      setShowItemForm(true);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(212,175,55,0.1)', border: '1px solid #d4af37', color: '#d4af37', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                  >
                    <Plus size={16} /> Tambah Item Baru
                  </button>
                </div>
              </div>

              {loadingItems ? (
                <p style={{ color: '#a3a3a3' }}>Memuat item...</p>
              ) : (
                <div className={styles.supplierTableWrapper} style={{ overflowX: 'auto' }}>
                  <table className={styles.supplierTable} style={{ width: '100%', minWidth: '600px' }}>
                    <thead>
                      <tr>
                        <th>Supplier</th>
                        <th>Nama Item</th>
                        <th>Kategori</th>
                        <th>Satuan</th>
                        <th style={{ textAlign: 'right' }}>Harga Terkini</th>
                        <th style={{ textAlign: 'center' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedItems.map((item) => (
                        <tr key={item.id}>
                          <td style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Building size={14} style={{ color: '#737373' }} /> {item.supplier?.name}</td>
                          <td style={{ fontWeight: '500', color: '#f60d0dff' }}>{item.itemName}</td>
                          <td>
                            <span className={item.kategori === 'BAHAN' ? styles.badgeBahan : styles.badgeJasa}>
                              {item.kategori || '-'}
                            </span>
                          </td>
                          <td>{item.unit}</td>
                          <td className={styles.supplierPrice}>{fmtRp(item.currentPrice)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'center' }}>
                              <button
                                onClick={() => {
                                  setEditingItem(item);
                                  setItemForm({
                                    supplierId: item.supplierId || '',
                                    itemName: item.itemName || '',
                                    unit: item.unit || '',
                                    currentPrice: item.currentPrice || '',
                                    kategori: item.kategori || ''
                                  });
                                  setShowItemForm(true);
                                }}
                                style={{ background: 'transparent', border: 'none', color: '#eab308', cursor: 'pointer', padding: '4px' }}
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                title="Hapus"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {displayedItems.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#737373' }}>
                            {supplierItems.length === 0 ? 'Belum ada item' : 'Data tidak ditemukan'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* PAGINATION ITEM */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
                {itemTotalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button onClick={() => setItemPage(p => Math.max(1, p - 1))} disabled={itemPage === 1} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: itemPage === 1 ? '#555' : '#fff', padding: '4px', borderRadius: '4px', cursor: itemPage === 1 ? 'not-allowed' : 'pointer' }}>
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: '12px', color: '#ccc', margin: '0 8px' }}>Halaman {itemPage} dari {itemTotalPages}</span>
                    <button onClick={() => setItemPage(p => Math.min(itemTotalPages, p + 1))} disabled={itemPage === itemTotalPages} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: itemPage === itemTotalPages ? '#555' : '#fff', padding: '4px', borderRadius: '4px', cursor: itemPage === itemTotalPages ? 'not-allowed' : 'pointer' }}>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {showSupplierForm && renderSupplierForm()}
      {showItemForm && renderItemForm()}

      {selectedDetailSupplier && (
        <div className={styles.modalOverlay} style={{ zIndex: 1200, background: 'rgba(0,0,0,0.8)' }}>
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
                    {selectedDetailSupplier.type === 'BAHAN_ALAT' ? 'BAHAN & ALAT' : selectedDetailSupplier.type || '-'}
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
