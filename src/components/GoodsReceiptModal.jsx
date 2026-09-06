import React, { useState } from 'react';
import { X, CheckCircle, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from '../styles/PurchaseOrderPage.module.css'; // Reuse some styles or use inline

const GoodsReceiptModal = ({ isOpen, onClose, matItems, onConfirm }) => {
  const [receivedVol, setReceivedVol] = useState(
    matItems?.reduce((sum, curr) => sum + (curr.orderedVolume || 0), 0) || 0
  );
  const [condition, setCondition] = useState('Baik');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !matItems || matItems.length === 0) return null;

  const firstItem = matItems[0];
  const totalOrdered = matItems.reduce((sum, curr) => sum + (curr.orderedVolume || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Kita akan update semua split items dari material ini menjadi COMPLETED
      // dengan mendistribusikan catatan dan volume secara proporsional jika perlu,
      // namun untuk simpelnya kita set status ke COMPLETED.
      const payload = matItems.map(item => ({
        id: item.id,
        status: 'COMPLETED',
        // Menyimpan data penerimaan di field catatanFinance atau field custom lain
        catatanFinance: `[PENERIMAAN BARANG] Vol Diterima: ${receivedVol} ${firstItem.unit}. Kondisi: ${condition}. Catatan: ${notes} | ${item.catatanFinance || ''}`.trim()
      }));

      await onConfirm(payload);
      toast.success('Penerimaan barang berhasil dikonfirmasi!');
      onClose();
    } catch (error) {
      toast.error('Gagal mengkonfirmasi penerimaan: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div className={styles.modalContent} style={{ backgroundColor: '#1e1e1e', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px', border: '1px solid #333' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
            <Package size={20} style={{ color: '#60a5fa' }} />
            Konfirmasi Penerimaan Barang
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: '10px 16px', backgroundColor: '#22c55e', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}
            >
              {isSubmitting ? 'Menyimpan...' : (
                <>
                  <CheckCircle size={16} /> Konfirmasi Selesai
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoodsReceiptModal;
