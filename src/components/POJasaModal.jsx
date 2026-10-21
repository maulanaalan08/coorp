import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import styles from '../styles/PurchaseOrderModal.module.css'; // Reuse existing styles
import { poService } from '../services/poService';
import toast from 'react-hot-toast';

const fmtNum = (n) => {
  const num = Number(n || 0);
  return Number.isNaN(num) ? '0' : parseFloat(num.toFixed(4)).toString();
};

const fmtRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const labelUtamaSmStyle = {
  fontSize: '9.5px',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  padding: '1px 6px',
  borderRadius: '3px',
  background: 'rgba(59, 130, 246, 0.15)',
  color: '#93c5fd',
  border: '1px solid rgba(59, 130, 246, 0.4)',
  display: 'inline-flex',
  alignItems: 'center',
};

const subLabelSmStyle = {
  fontSize: '9.5px',
  fontWeight: 600,
  padding: '1px 6px',
  borderRadius: '3px',
  background: '#23201b',
  color: '#d4af37',
  border: '1px solid #4a4231',
  display: 'inline-flex',
  alignItems: 'center',
};

const POJasaModal = ({ selectedItems, projectId, onClose, onSuccess }) => {
  const [jasaList, setJasaList] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch Jasa list
    const fetchJasa = async () => {
      try {
        const data = await poService.getJasa();
        setJasaList(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Gagal mengambil data jasa:", e);
      }
    };
    fetchJasa();

    // Initialize items state
    setItems(selectedItems.map(it => ({
      ...it,
      jasaId: '',
      qtyBeli: it.rapQty || 0,
      harga: it.rapPrice || 0,
      notes: it.notes || ''
    })));
  }, [selectedItems]);

  const handleChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.qtyBeli) * Number(item.harga)), 0);
  };

  const handleSimpan = async () => {
    // Validate
    const invalidItem = items.find(it => !it.jasaId);
    if (invalidItem) {
      toast.error(`Pilih Jasa untuk item: ${invalidItem.itemName}`);
      return;
    }

    setLoading(true);
    try {
      // Group by jasaId
      const grouped = items.reduce((acc, item) => {
        if (!acc[item.jasaId]) acc[item.jasaId] = [];
        acc[item.jasaId].push(item);
        return acc;
      }, {});

      // Create PO for each Jasa
      const promises = Object.keys(grouped).map(jasaId => {
        const groupItems = grouped[jasaId];
        const payload = {
          projectId,
          jasaId,
          isJasa: true,
          kategoriPO: 'JASA',
          tanggal: new Date().toISOString(),
          subTotal: groupItems.reduce((sum, it) => sum + (Number(it.qtyBeli) * Number(it.harga)), 0),
          grandTotal: groupItems.reduce((sum, it) => sum + (Number(it.qtyBeli) * Number(it.harga)), 0),
          keterangan: "Dibuat otomatis dari RAP",
          items: groupItems.map(it => {
            // Recalculate notes if qty or price deviates from RAP
            let itemNotes = it.notes || "";
            const diffQty = Math.round((Number(it.qtyBeli) - Number(it.rapQty || 0)) * 100) / 100;
            if (Math.abs(diffQty) >= 0.01) itemNotes += ` (Over/Under Qty: ${fmtNum(diffQty)})`;
            
            return {
              rabItemId: it.rabItemId, // this could be RabItem or RabItemComponent id
              description: it.itemName,
              qty: Number(it.qtyBeli),
              unit: it.unit,
              unitPrice: Number(it.harga),
              total: Number(it.qtyBeli) * Number(it.harga),
              description2: itemNotes // store notes in description2
            };
          })
        };
        return poService.createPO(payload);
      });

      await Promise.all(promises);
      toast.success('PO Jasa berhasil dibuat');
      onSuccess();
    } catch (e) {
      toast.error('Terjadi kesalahan saat menyimpan PO Jasa');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer} style={{ maxWidth: '1000px' }}>
        <div className={styles.modalHeader}>
          <div className="flex items-center gap-2">
            <h2 className={styles.modalTitle}>BUAT PO JASA</h2>
          </div>
          <button onClick={onClose} className={styles.closeBtn} disabled={loading}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-3 rounded text-sm mb-4 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <strong>Informasi PO Jasa</strong>
              <p>Pilih "Nama Jasa" untuk masing-masing baris pekerjaan. Sistem akan memecah dokumen PO secara otomatis berdasarkan Jasa yang dipilih setelah Anda menekan tombol Simpan.</p>
            </div>
          </div>

          <div className={styles.itemsSection}>
            <div className={styles.itemsHeader}>Daftar Item Jasa:</div>
            <div className={styles.itemsTableWrapper}>
              <table className={styles.itemsTable}>
                <thead>
                  <tr>
                    <th>Pilih Jasa</th>
                    <th>Uraian Pekerjaan</th>
                    <th>Qty Beli</th>
                    <th>Satuan</th>
                    <th>Harga Satuan (Rp)</th>
                    <th>Subtotal (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <select
                          className={styles.smallInput}
                          style={{ width: '100%', minWidth: '150px' }}
                          value={item.jasaId}
                          onChange={(e) => handleChange(idx, 'jasaId', e.target.value)}
                        >
                          <option value="">- Pilih Jasa -</option>
                          {jasaList.map(j => (
                            <option key={j.id} value={j.id}>{j.nama || j.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '4px' }}>
                          {item.jobName && (
                            <span style={{ fontSize: '11px', color: '#888', fontWeight: 500 }}>
                              {item.jobName}
                            </span>
                          )}
                          {(item.workCategoryCode || item.parentWorkCategoryCode) && (
                            <span
                              style={labelUtamaSmStyle}
                              title={item.workCategoryName || item.parentWorkCategoryName}
                            >
                              {item.workCategoryCode || item.parentWorkCategoryCode}
                            </span>
                          )}
                          {(item.workSubCategoryCode || item.parentWorkSubCategoryCode) && (
                            <span
                              style={subLabelSmStyle}
                              title={item.workSubCategoryName || item.parentWorkSubCategoryName}
                            >
                              {item.workSubCategoryCode || item.parentWorkSubCategoryCode}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 500, color: '#f1f5f9' }}>{item.itemName}</span>
                        </div>
                        <div style={{ marginTop: 4, fontSize: 11, color: '#888' }}>
                          RAP Qty: {fmtNum(item.rapQty)} | Harga: Rp {Number(item.rapPrice).toLocaleString('id-ID')}
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          className={styles.smallInput}
                          style={{ width: '80px' }}
                          value={item.qtyBeli}
                          onChange={(e) => handleChange(idx, 'qtyBeli', e.target.value)}
                        />
                        {item.rapQty > 0 && (
                          <div style={{ marginTop: '4px', fontSize: '11px', textAlign: 'center' }}>
                            {(() => {
                              const diff = Math.round((Number(item.qtyBeli) - Number(item.rapQty)) * 100) / 100;
                              if (Math.abs(diff) < 0.01) return <span style={{ color: '#888' }}>Sesuai RAP</span>;
                              if (diff >= 0.01) return <span style={{ color: '#ef4444' }}>▲ Over {fmtNum(diff)}</span>;
                              return <span style={{ color: '#22c55e' }}>▼ Under {fmtNum(Math.abs(diff))}</span>;
                            })()}
                          </div>
                        )}
                      </td>
                      <td>{item.unit}</td>
                      <td>
                        <input
                          type="number"
                          className={styles.smallInput}
                          style={{ width: '120px' }}
                          value={item.harga}
                          onChange={(e) => handleChange(idx, 'harga', e.target.value)}
                        />
                        {item.rapPrice > 0 && (
                          <div style={{ marginTop: '4px', fontSize: '11px', textAlign: 'center' }}>
                            {(() => {
                              const diff = Number(item.harga) - Number(item.rapPrice);
                              if (diff === 0) return <span style={{ color: '#888' }}>Sesuai RAP</span>;
                              if (diff > 0) return <span style={{ color: '#ef4444' }}>▲ Over {fmtRp(diff)}</span>;
                              return <span style={{ color: '#22c55e' }}>▼ Hemat {fmtRp(Math.abs(diff))}</span>;
                            })()}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {fmtRp(Number(item.qtyBeli) * Number(item.harga))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'right', padding: '12px', color: '#888' }}>Total Keseluruhan :</td>
                    <td style={{ textAlign: 'right', padding: '12px', color: '#e5e5e5', fontWeight: 'bold' }}>
                      {fmtRp(calculateTotal())}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.cancelBtn} disabled={loading}>Batal</button>
          <button onClick={handleSimpan} className={styles.saveBtn} disabled={loading}>
            <Save size={18} />
            {loading ? 'Menyimpan...' : 'Simpan PO Jasa'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default POJasaModal;
