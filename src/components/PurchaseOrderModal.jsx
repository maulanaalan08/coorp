import React, { useState, useEffect, useMemo } from 'react';
import styles from '../styles/PurchaseOrderModal.module.css';
import { X, ShoppingCart, Plus, Package, CheckCircle } from 'lucide-react';
import { poService } from '../services/poService';
import toast from 'react-hot-toast';
import SupplierModal from './SupplierModal';

const fmtVol = (n) => {
  const num = Number(n || 0);
  return isNaN(num) ? '0' : parseFloat(num.toFixed(2)).toString();
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

      const initialItems = (editingPo.items || []).map(item => ({
        materialRequestId: item.materialRequestId,
        description: item.description,
        description2: item.description2 || '',
        estVol: '-',
        sisa: '-',
        qty: item.qty,
        unit: item.unit || '',
        unitPrice: item.unitPrice || 0,
        estimasiRAB: item.unitPrice || 0,
        supplierItemId: '',
        disc1Percent: item.disc1Percent || 0,
        disc2Nominal: item.disc2Nominal || 0,
        total: item.total || 0
      }));
      setItems(initialItems);
    } else {
      const initialItems = (selectedItems || []).map(item => {
        const sisaHitung = Math.max(0, (item.estimatedVolume || 0) - (item.orderedQty || 0));
        return {
          materialRequestId: item.mrItemId || item.id,
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
          disc2Nominal: 0,
          total: 0 // dihitung nanti
        };
      });
      setItems(initialItems);
    }

    // Supplier sudah ditentukan kalau PO dibuat dari tab "Dari RAB per Supplier"
    if (!editingPo && initialSupplierId) {
      setFormData((prev) => ({ ...prev, supplierId: initialSupplierId }));
    }
  }, [selectedItems, editingPo, receiptItems, initialSupplierId]);

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

  const handleMappingChange = async (index, suppItemId) => {
    const selectedItem = supplierItems.find(i => i.id === suppItemId);
    const newItems = [...items];
    newItems[index].supplierItemId = suppItemId;

    if (selectedItem) {
      newItems[index].unitPrice = Number(selectedItem.currentPrice || 0);
      newItems[index].description2 = selectedItem.variantName || '';

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
      const disc2Nom = Number(item.disc2Nominal || 0);

      const basePrice = qty * price;
      const discount1 = basePrice * (disc1Pct / 100);
      const total = basePrice - discount1 - disc2Nom;

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
                <label className={styles.formLabel}>Kategori</label>
                <select name="kategori" className={styles.formSelect} value={formData.kategori} onChange={handleHeaderChange}>
                  <option value="">-- Pilih Kategori --</option>
                  <option value="BAHAN">Bahan</option>
                  <option value="ALAT">Alat</option>
                </select>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Penerima Barang</label>
                <input type="text" name="penerimaBarang" className={styles.formInput} value={formData.penerimaBarang} onChange={handleHeaderChange} placeholder="Nama penerima di lapangan" />
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
                      <th>Mapping (Pilih Item Toko)</th>
                      <th>Est Vol</th>
                      <th>Sisa Butuh</th>
                      <th>Qty Beli</th>
                      <th>Harga Satuan (Rp)</th>
                      <th>Disc 1 (%)</th>
                      <th>Disc 2 (Rp)</th>
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
                          <td>
                            <select
                              className={styles.smallInput}
                              style={{ minWidth: '150px', backgroundColor: '#111' }}
                              value={item.supplierItemId || ''}
                              onChange={(e) => handleMappingChange(index, e.target.value)}
                              disabled={!formData.supplierId}
                            >
                              <option value="">-- Pilih dari Toko --</option>
                              {supplierItems.map(si => (
                                <option key={si.id} value={si.id}>
                                  {si.itemName} {si.variantName ? `(${si.variantName})` : ''} - {fmtRp(si.currentPrice)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td><span style={{ color: '#888', fontSize: '0.9rem' }}>{item.estVol}</span></td>
                          <td><strong style={{ color: '#fb923c' }}>{item.sisa}</strong></td>
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
                              style={{ width: '90px' }}
                              value={item.disc2Nominal}
                              onChange={(e) => handleItemChange(index, 'disc2Nominal', e.target.value)}
                              min="0"
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
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '300px', alignItems: 'center' }}>
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
                  <span className={styles.grandTotalLabel}>GRAND TOTAL</span>
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

export default PurchaseOrderModal;
