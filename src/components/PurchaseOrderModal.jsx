import React, { useState, useEffect, useMemo } from 'react';
import styles from '../styles/PurchaseOrderModal.module.css';
import { X, ShoppingCart, Plus, Package, CheckCircle, Search } from 'lucide-react';
import { poService } from '../services/poService';
import toast from 'react-hot-toast';
import SupplierModal from './SupplierModal';

const fmtVol = (n) => {
  const num = Number(n || 0);
  return isNaN(num) ? '0' : parseFloat(num.toFixed(2)).toString();
};

const normalizeQty2 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

const normalizeMrId = (v) => {
  if (!v || v === '' || v === 'null' || v === 'undefined') return null;
  if (String(v).startsWith('php_')) return null;
  return String(v);
};

const fmtRp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

const PurchaseOrderModal = ({ selectedItems, projectId, editingPo, receiptItems, onConfirmReceipt, initialSupplierId, kategoriPO, sumberPo, alasanHabisPakai, permintaanHabisPakaiId, onClose, onSuccess }) => {
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
    globalDiscount: 0,
    taxNominal: 0,
  });

  // Supplier autocomplete
  const [supplierQuery, setSupplierQuery] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  // Receipt Mode States
  const [receivedVol, setReceivedVol] = useState(0);
  const [condition, setCondition] = useState('Baik');
  const [notes, setNotes] = useState('');

  // Items State (editable)
  const [items, setItems] = useState([]);
  const [supplierItems, setSupplierItems] = useState([]);

  useEffect(() => {
    if (formData.supplierId) {
      poService.getSupplierItems(formData.supplierId)
        .then(data => setSupplierItems(data || []))
        .catch(err => console.error('Failed to fetch supplier items', err));
    } else {
      setSupplierItems([]);
    }
  }, [formData.supplierId]);

  useEffect(() => {
    if (receiptItems && receiptItems.length > 0) {
      setReceivedVol(receiptItems.reduce((sum, curr) => sum + (curr.orderedVolume || 0), 0));
      return; // Skip fetching suppliers for receipt mode
    }

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
        globalDiscount: editingPo.globalDiscount || 0,
        taxNominal: editingPo.taxNominal || 0,
      });

      // Saat edit, fetch data MaterialRequest untuk dapatkan estimatedVolume & sisa
      // sehingga EST VOL dan SISA BUTUH tidak menampilkan "-"
      (async () => {
        let mrMap = {};
        const pid = editingPo.projectId;
        if (pid) {
          try {
            const { fetchAPI } = await import('../services/api');
            const token = localStorage.getItem('token');
            const mrData = await fetchAPI(`/finance/projects/${pid}/material-requests`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const arr = Array.isArray(mrData) ? mrData : [];
            arr.forEach(mr => {
              (mr.items || []).forEach(it => {
                if (it.id) mrMap[it.id] = it;
              });
            });
          } catch (e) {
            // Jangan block UI kalau fetch MR gagal — fallback ke '-'
          }
        }

        const initialItems = (editingPo.items || []).map(item => {
          const mr = item.materialRequestId ? mrMap[item.materialRequestId] : null;
          const estVol = mr ? mr.estimatedVolume : null;
          // Sisa = estimated - (ordered - qty item ini, karena qty ini sudah include di ordered)
          let sisaVal = null;
          if (mr) {
            const otherOrdered = (mr.orderedVolume || 0) - Number(item.qty || 0);
            sisaVal = Math.max(0, (mr.estimatedVolume || 0) - otherOrdered);
          }
          return {
            materialRequestId: item.materialRequestId,
            description: item.description,
            description2: item.description2 || '',
            estVol: mr ? `${fmtVol(estVol)} ${item.unit || mr.unit || ''}` : '-',
            sisa: mr ? `${fmtVol(sisaVal)} ${item.unit || mr.unit || ''}` : '-',
            qty: normalizeQty2(item.qty),
            unit: item.unit || '',
            unitPrice: item.unitPrice || 0,
            estimasiRAB: mr?.pricePerUnit || item.unitPrice || 0,
            supplierItemId: '',
            disc1Percent: item.disc1Percent || 0,
            disc2Percent: item.disc2Percent || 0,
            disc2Nominal: item.disc2Nominal || 0,
            kategoriItem: item.kategoriItem || '',
            total: item.total || 0
          };
        });
        setItems(initialItems);
      })();
    } else {
      const initialItems = (selectedItems || []).map(item => {
        const sisaHitung = Math.max(0, (item.estimatedVolume || 0) - (item.orderedQty || 0));
        // Habis pakai: mrItemId null, id berupa "php_xxx" — JANGAN kirim sebagai materialRequestId
        // Hanya kirim materialRequestId yang valid (bukan php_ prefix, bukan null, bukan empty)
        let mrId = item.mrItemId;
        if (!mrId || mrId === '' || mrId === 'null' || mrId === 'undefined' || String(mrId).startsWith('php_')) {
          mrId = null;
        }
        return {
          materialRequestId: mrId,
          description: item.itemName,
          description2: '',
          estVol: `${fmtVol(item.estimatedVolume)} ${item.unit || ''}`,
          sisa: `${fmtVol(sisaHitung)} ${item.unit || ''}`,
          qty: parseFloat(Number(sisaHitung).toFixed(2)),
          unit: item.unit || '',
          unitPrice: item.pricePerUnit || 0,
          estimasiRAB: item.pricePerUnit || 0,
          supplierItemId: '',
          disc1Percent: 0,
          disc2Percent: 0,
          disc2Nominal: 0,
          kategoriItem: '',
          total: 0 // dihitung nanti
        };
      });
      setItems(initialItems);
    }

    if (!editingPo && initialSupplierId) {
      setFormData((prev) => ({ ...prev, supplierId: initialSupplierId }));
    }
  }, [selectedItems, editingPo, receiptItems, initialSupplierId]);

  const fetchSuppliers = async () => {
    try {
      const data = await poService.getSuppliers();
      setSuppliers(data || []);
    } catch (err) {
      toast.error('Gagal mengambil daftar supplier');
    }
  };

  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === formData.supplierId) || null;
  }, [suppliers, formData.supplierId]);

  const filteredSuppliers = useMemo(() => {
    const q = supplierQuery.trim().toLowerCase();
    if (!q) return suppliers.slice(0, 20);
    return suppliers.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.code || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [suppliers, supplierQuery]);

  const handleHeaderChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    if (field === 'qty') {
      const clean = String(value ?? '').replace(',', '.');
      if (clean === '') {
        newItems[index][field] = '';
      } else if (/^\d*\.?\d*$/.test(clean)) {
        const [whole, decimal = ''] = clean.split('.');
        newItems[index][field] = decimal.length > 2 ? `${whole}.${decimal.slice(0, 2)}` : clean;
      }
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const handleMappingChange = async (index, suppItemId) => {
    const selectedItem = supplierItems.find(i => i.id === suppItemId);
    const newItems = [...items];
    newItems[index].supplierItemId = suppItemId;

    if (selectedItem) {
      newItems[index].unitPrice = Number(selectedItem.currentPrice || 0);
      newItems[index].description2 = selectedItem.variantName || '';
      newItems[index].kategoriItem = selectedItem.kategori || '';

      try {
        await poService.saveAhspMapping({
          itemName: newItems[index].description,
          supplierItemId: suppItemId
        });
        toast.success(`Mapping item "${newItems[index].description}" tersimpan otomatis.`);
      } catch (err) {
        console.error('Mapping save failed', err);
      }
    }

    setItems(newItems);
  };

  // Calculations
  const calculatedItems = useMemo(() => {
    return items.map(item => {
      const qty = Number(item.qty || 0);
      const price = Number(item.unitPrice || 0);
      const disc1Pct = Number(item.disc1Percent || 0);
      const disc2Pct = Number(item.disc2Percent || 0);
      const disc2Nom = Number(item.disc2Nominal || 0);

      const basePrice = qty * price;
      const afterDisc1 = basePrice * (1 - disc1Pct / 100);
      const afterDisc2Pct = afterDisc1 * (1 - disc2Pct / 100);
      const total = afterDisc2Pct - disc2Nom;

      return { ...item, total: total > 0 ? total : 0 };
    });
  }, [items]);

  const subTotal = calculatedItems.reduce((sum, item) => sum + item.total, 0);
  const globalDiscount = Number(formData.globalDiscount || 0);
  const taxNominal = Number(formData.taxNominal || 0);
  const grandTotal = Math.max(0, subTotal - globalDiscount + taxNominal);

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
    const payloadItems = calculatedItems.map((item) => {
      const qty = normalizeQty2(item.qty);
      const unitPrice = Number(item.unitPrice || 0);
      const disc1Percent = Number(item.disc1Percent || 0);
      const disc2Percent = Number(item.disc2Percent || 0);
      const disc2Nominal = Number(item.disc2Nominal || 0);
      const totalRaw = qty * unitPrice * (1 - disc1Percent / 100) * (1 - disc2Percent / 100) - disc2Nominal;

      return {
        ...item,
        materialRequestId: normalizeMrId(item.materialRequestId),
        qty,
        unitPrice,
        disc1Percent,
        disc2Percent,
        disc2Nominal,
        total: Number(Math.max(0, totalRaw).toFixed(2)),
      };
    });

    if (payloadItems.some((item) => item.qty <= 0)) {
      toast.error('Qty beli harus lebih dari 0 dan maksimal 2 angka desimal');
      setLoading(false);
      return;
    }

    const payload = {
      ...formData,
      projectId: editingPo ? editingPo.projectId : projectId,
      kategoriPO: kategoriPO || 'MATERIAL',
      sumberPo: sumberPo || null,
      alasanHabisPakai: alasanHabisPakai || null,
      permintaanHabisPakaiId: permintaanHabisPakaiId || null,
      subTotal: subTotal,
      globalDiscount: globalDiscount,
      taxNominal: taxNominal,
      grandTotal: grandTotal,
      items: payloadItems
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

  const handleReceiptSubmit = async (e) => {
    e.preventDefault();
    if (!receiptItems || receiptItems.length === 0) return;
    setLoading(true);
    try {
      const firstItem = receiptItems[0];
      const payload = receiptItems.map(item => ({
        id: item.id,
        status: 'COMPLETED',
        catatanFinance: `[PENERIMAAN BARANG] Vol Diterima: ${receivedVol} ${firstItem.unit}. Kondisi: ${condition}. Catatan: ${notes} | ${item.catatanFinance || ''}`.trim()
      }));

      await onConfirmReceipt(payload);
      toast.success('Penerimaan barang berhasil dikonfirmasi!');
      onClose();
    } catch (error) {
      toast.error('Gagal mengkonfirmasi penerimaan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (receiptItems && receiptItems.length > 0) {
    const firstItem = receiptItems[0];
    const totalOrdered = receiptItems.reduce((sum, curr) => sum + (curr.orderedVolume || 0), 0);
    return (
      <div className={styles.modalOverlay} style={{ zIndex: 1000 }}>
        <div className={styles.modalContent} style={{ maxWidth: '500px' }}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={20} style={{ color: '#60a5fa' }} />
              Konfirmasi Penerimaan Barang
            </h2>
            <button type="button" className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
          </div>
          <form onSubmit={handleReceiptSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#aaa' }}>Nama Material</label>
              <div style={{ padding: '10px', backgroundColor: '#2a2a2a', borderRadius: '6px', color: '#eee', fontSize: '14px' }}>
                {firstItem.itemName}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#aaa' }}>Total Di-order</label>
                <div style={{ padding: '10px', backgroundColor: '#2a2a2a', borderRadius: '6px', color: '#eee', fontSize: '14px' }}>
                  {totalOrdered} {firstItem.unit}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#aaa' }}>Volume Diterima <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={receivedVol}
                  onChange={(e) => setReceivedVol(e.target.value)}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#111', border: '1px solid #444', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#aaa' }}>Kondisi Barang <span style={{ color: '#ef4444' }}>*</span></label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: '#111', border: '1px solid #444', borderRadius: '6px', color: '#fff' }}
              >
                <option value="Baik">Baik (Sesuai Pesanan)</option>
                <option value="Rusak Sebagian">Rusak Sebagian</option>
                <option value="Rusak Total">Rusak Total</option>
                <option value="Tidak Sesuai Spesifikasi">Tidak Sesuai Spesifikasi</option>
                <option value="Kurang Volume">Kurang Volume</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#aaa' }}>Catatan / Keterangan Validasi</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Surat Jalan no. 123, barang diterima oleh mandor..."
                style={{ width: '100%', padding: '10px', backgroundColor: '#111', border: '1px solid #444', borderRadius: '6px', color: '#fff', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid #555', color: '#ccc', borderRadius: '6px', cursor: 'pointer' }}
                disabled={loading}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{ padding: '10px 16px', backgroundColor: '#22c55e', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}
              >
                {loading ? 'Menyimpan...' : <><CheckCircle size={16} /> Konfirmasi Selesai</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

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
                <label className={styles.formLabel}>Toko / Supplier <span style={{ color: '#ef4444' }}>*</span></label>
                <div className={styles.supplierSelectGroup}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                    <input
                      type="text"
                      className={styles.formInput}
                      style={{ paddingLeft: 32 }}
                      placeholder="Cari supplier..."
                      value={selectedSupplier ? selectedSupplier.name : supplierQuery}
                      onChange={(e) => {
                        setSupplierQuery(e.target.value);
                        setShowSupplierDropdown(true);
                        if (selectedSupplier && e.target.value !== selectedSupplier.name) {
                          setFormData(prev => ({ ...prev, supplierId: '' }));
                        }
                      }}
                      onFocus={() => setShowSupplierDropdown(true)}
                      onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 150)}
                    />
                    {showSupplierDropdown && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                        background: '#1a1814', border: '1px solid #444', borderRadius: '6px', marginTop: 4,
                        maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                      }}>
                        {filteredSuppliers.length === 0 ? (
                          <div style={{ padding: 12, color: '#888', fontSize: 12, textAlign: 'center' }}>
                            Supplier tidak ditemukan
                          </div>
                        ) : (
                          filteredSuppliers.map(s => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, supplierId: s.id }));
                                setSupplierQuery('');
                                setShowSupplierDropdown(false);
                              }}
                              style={{
                                display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px',
                                background: 'transparent', border: 'none', color: '#eee', fontSize: 13,
                                borderBottom: '1px solid #2a2a2a', cursor: 'pointer'
                              }}
                              onMouseDown={(e) => e.preventDefault()}
                            >
                              {s.name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
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

            {kategoriPO === 'HABIS_PAKAI' && selectedItems && selectedItems.length > 0 && (
              <div className="bg-[#161513] border border-[#2a2a2a] rounded-xl p-4 mb-4">
                <p className="text-[#666] text-xs uppercase tracking-wider mb-2">Item Habis Pakai</p>
                <p className="text-white font-semibold">{selectedItems[0]?.itemName || selectedItems[0]?.description || '-'}</p>
                <div className="flex gap-4 mt-2 text-xs text-[#888]">
                  <span>Qty: <span className="text-[#ccc]">{fmtVol(selectedItems[0]?.estimatedVolume || selectedItems[0]?.qty || 0)} {selectedItems[0]?.unit || ''}</span></span>
                </div>
                {alasanHabisPakai && (
                  <div className="mt-3 bg-[#d4af37]/10 border border-[#d4af37]/20 rounded-lg p-3 text-xs">
                    <div className="text-[#d4af37] font-semibold mb-1">Pembelian Habis Pakai</div>
                    <div className="text-[#ccc]">{alasanHabisPakai}</div>
                  </div>
                )}
              </div>
            )}

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tanggal PO</label>
                <input type="date" name="tanggal" required className={styles.formInput} value={formData.tanggal} onChange={handleHeaderChange} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Cara Pembayaran</label>
                <select name="caraPembayaran" className={styles.formSelect} value={formData.caraPembayaran} onChange={handleHeaderChange}>
                  <option value="">-- Pilih Cara Bayar --</option>
                  <option value="CASH">Cash / Tunai</option>
                  <option value="TRANSFER">Transfer Bank</option>
                  <option value="TEMPO">Tempo / Kredit</option>
                </select>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Penerima Barang</label>
                <input type="text" name="penerimaBarang" className={styles.formInput} value={formData.penerimaBarang} onChange={handleHeaderChange} placeholder="Nama penerima di lapangan" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Keterangan</label>
                <textarea name="keterangan" className={styles.formTextarea} value={formData.keterangan} onChange={handleHeaderChange} placeholder="Catatan tambahan untuk supplier..." rows={3} />
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
                      <th>Mapping (Pilih Item Toko)</th>
                      <th>Kategori</th>
                      <th>Qty Beli</th>
                      <th>Harga Satuan (Rp)</th>
                      <th>Disc 1 (%)</th>
                      <th>Disc 2 (%)</th>
                      <th>Subtotal (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculatedItems.length === 0 ? (
                      <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>Tidak ada barang yang dipesan.</td></tr>
                    ) : (
                      calculatedItems.map((item, index) => (
                        <tr key={index}>
                          <td>{item.description}</td>
                          <td>
                            <AutocompleteSupplierItem
                              items={supplierItems}
                              value={item.supplierItemId || ''}
                              onChange={(val) => handleMappingChange(index, val)}
                              disabled={!formData.supplierId}
                            />
                          </td>
                          <td>
                            <select
                              className={styles.smallInput}
                              style={{ minWidth: '80px' }}
                              value={item.kategoriItem || ''}
                              onChange={(e) => handleItemChange(index, 'kategoriItem', e.target.value)}
                            >
                              <option value="">-</option>
                              <option value="BAHAN">BAHAN</option>
                              <option value="ALAT">ALAT</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              className={styles.smallInput}
                              value={item.qty}
                              onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                              onBlur={(e) => handleItemChange(index, 'qty', normalizeQty2(e.target.value))}
                              min="0"
                              step="0.01"
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
                            {item.estimasiRAB > 0 && (
                              <div style={{ marginTop: '4px', fontSize: '11px', textAlign: 'center' }}>
                                {(() => {
                                  const diff = Number(item.unitPrice) - Number(item.estimasiRAB);
                                  if (diff === 0) return <span style={{ color: '#888' }}>Sesuai RAB</span>;
                                  if (diff > 0) return <span style={{ color: '#ef4444' }}>▲ Over {fmtRp(diff)}</span>;
                                  return <span style={{ color: '#22c55e' }}>▼ Hemat {fmtRp(Math.abs(diff))}</span>;
                                })()}
                              </div>
                            )}
                          </td>
                          <td>
                            <input
                              type="number"
                              className={styles.smallInput}
                              style={{ width: '60px' }}
                              value={item.disc1Percent}
                              onChange={(e) => handleItemChange(index, 'disc1Percent', e.target.value)}
                              min="0"
                              max="100"
                              step="any"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className={styles.smallInput}
                              style={{ width: '60px' }}
                              value={item.disc2Percent || 0}
                              onChange={(e) => handleItemChange(index, 'disc2Percent', e.target.value)}
                              min="0"
                              max="100"
                              step="any"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className={styles.smallInput}
                              style={{ minWidth: '100px' }}
                              value={item.total > 0 ? fmtRp(item.total) : '0'}
                              readOnly
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className={styles.summarySection} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '300px' }}>
                  <span style={{ color: '#888' }}>Sub Total:</span>
                  <span style={{ color: '#e5e5e5' }}>{fmtRp(subTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '300px', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: '#888' }}>Diskon Global (Rp):</span>
                  <input
                    type="number"
                    name="globalDiscount"
                    style={{ width: '120px', padding: '6px', backgroundColor: '#111', border: '1px solid #444', color: '#fff', borderRadius: '4px', textAlign: 'right' }}
                    value={formData.globalDiscount}
                    onChange={handleHeaderChange}
                    min="0"
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '300px', alignItems: 'center' }}>
                  <span style={{ color: '#888' }}>Pajak / PPN (Rp):</span>
                  <input
                    type="number"
                    name="taxNominal"
                    style={{ width: '120px', padding: '6px', backgroundColor: '#111', border: '1px solid #444', color: '#fff', borderRadius: '4px', textAlign: 'right' }}
                    value={formData.taxNominal}
                    onChange={handleHeaderChange}
                    min="0"
                  />
                </div>
                <div className={styles.grandTotalRow} style={{ width: '300px', borderTop: '1px solid #333', paddingTop: '10px', marginTop: '4px' }}>
                  <span className={styles.grandTotalLabel}>TOTAL KESELURUHAN</span>
                  <span className={styles.grandTotalValue}>{fmtRp(grandTotal)}</span>
                </div>
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

function AutocompleteSupplierItem({ items, value, onChange, disabled }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = items.find(i => i.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 20);
    return items.filter(i =>
      (i.itemName || '').toLowerCase().includes(q) ||
      (i.variantName || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [items, query]);

  return (
    <div style={{ position: 'relative', minWidth: '180px' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Search size={12} style={{ position: 'absolute', left: 8, color: '#888' }} />
        <input
          type="text"
          disabled={disabled}
          placeholder={disabled ? 'Pilih supplier dulu' : 'Cari item toko...'}
          value={selected ? `${selected.itemName}${selected.variantName ? ` (${selected.variantName})` : ''}` : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (selected && e.target.value !== `${selected.itemName}${selected.variantName ? ` (${selected.variantName})` : ''}`) {
              onChange('');
            }
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          style={{
            width: '100%', padding: '6px 8px 6px 26px', backgroundColor: disabled ? '#2a2a2a' : '#111',
            border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '12px'
          }}
        />
      </div>
      {open && !disabled && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#1a1814', border: '1px solid #444', borderRadius: '4px', marginTop: 4,
          maxHeight: 180, overflowY: 'auto', boxShadow: '0 6px 18px rgba(0,0,0,0.5)'
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 10, color: '#888', fontSize: 11, textAlign: 'center' }}>Item tidak ditemukan</div>
          ) : (
            filtered.map(i => (
              <button
                key={i.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(i.id);
                  setQuery('');
                  setOpen(false);
                }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px',
                  background: 'transparent', border: 'none', color: '#eee', fontSize: 12,
                  borderBottom: '1px solid #2a2a2a', cursor: 'pointer'
                }}
              >
                {i.itemName} {i.variantName ? `(${i.variantName})` : ''} — {fmtRp(i.currentPrice)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default PurchaseOrderModal;
