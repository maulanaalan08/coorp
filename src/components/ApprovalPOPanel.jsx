import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, ChevronRight, Package } from 'lucide-react';
import { poService } from '../services/poService';
import toast from 'react-hot-toast';
import styles from '../styles/ApprovalPOPanel.module.css';

const fmtRp = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const fmtTanggal = (d) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

/**
 * Panel approval PO untuk Finance (tingkat 1).
 * PO status BELUM_APPROVE -> aksi Verifikasi (lanjut ke atasan) / Tolak.
 * Panel approval atasan dipindahkan ke halaman Pengajuan Bayar.
 */
const ApprovalPOPanel = ({ projectId = null, refreshKey = 0, onChanged }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    // Jangan fetch sebelum token siap
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    try {
      const data = await poService.getInboxFinance(projectId);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      // Jangan tampilkan toast untuk 401 (sudah ditangani auto-logout)
      if (!err.message?.includes('Sesi login')) {
        toast.error('Gagal memuat inbox verifikasi Finance');
      }
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) {
      setRows([]);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, refreshKey]);

  const handleVerify = async (po) => {
    setBusyId(po.id);
    try {
      await poService.verifyPO(po.id, '');
      toast.success(`${po.poNumber} diteruskan ke atasan`);
      await load();
      onChanged?.();
      window.dispatchEvent(new CustomEvent('po-status-changed', { detail: { poId: po.id, status: 'MENUNGGU_ATASAN' } }));
    } catch (err) {
      toast.error(err.message || 'Gagal verifikasi PO');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (po) => {
    const reason = window.prompt(`Alasan menolak ${po.poNumber}:`);
    if (!reason || !reason.trim()) return;
    setBusyId(po.id);
    try {
      await poService.rejectPO(po.id, reason.trim());
      toast.success(`${po.poNumber} ditolak`);
      await load();
      onChanged?.();
      window.dispatchEvent(new CustomEvent('po-status-changed', { detail: { poId: po.id, status: 'REJECTED' } }));
    } catch (err) {
      toast.error(err.message || 'Gagal menolak PO');
    } finally {
      setBusyId(null);
    }
  };

  const totalNilai = rows.reduce((s, p) => s + Number(p.grandTotal || 0), 0);

  if (!projectId) {
    return (
      <section className={styles.panel}>
        <p className={styles.empty}>Pilih proyek dulu untuk melihat antrean approval.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className={styles.panel}>
        <p className={styles.empty}>⏳ Memuat PO...</p>
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h3 className={styles.panelTitle}>Menunggu Verifikasi Finance</h3>
            <p className={styles.panelSub}>
              PO baru dari purchasing yang belum diverifikasi.
            </p>
          </div>
          <span className={styles.badgeKosong}>Tidak ada antrian</span>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h3 className={styles.panelTitle}>Menunggu Verifikasi Finance</h3>
          <p className={styles.panelSub}>
            {rows.length} PO · total {fmtRp(totalNilai)}
          </p>
        </div>
        <span className={styles.badgeAntre}>{rows.length} antre</span>
      </div>

      <div className={styles.list}>
        {rows.map((po) => {
          const open = !!expanded[po.id];
          const items = po.items || [];
          const busy = busyId === po.id;
          return (
            <div key={po.id} className={styles.card}>
              <button
                type="button"
                className={styles.cardHead}
                onClick={() => setExpanded((p) => ({ ...p, [po.id]: !p[po.id] }))}
              >
                <ChevronRight
                  size={16}
                  className={styles.chev}
                  style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
                />
                <div className={styles.cardMain}>
                  <div className={styles.poNo}>{po.poNumber}</div>
                  <div className={styles.meta}>
                    <span className={styles.supplier}>{po.supplier?.name || 'Tanpa Supplier'}</span>
                    {po.project?.name && <span className={styles.dot}>·</span>}
                    {po.project?.name && <span>{po.project.name}</span>}
                    <span className={styles.dot}>·</span>
                    <span>{fmtTanggal(po.tanggal)}</span>
                    {po.kategoriPO === 'HABIS_PAKAI' && (
                      <span className={styles.tagHabisPakai}>HABIS PAKAI</span>
                    )}
                  </div>
                </div>
                <div className={styles.amount}>
                  <div className={styles.total}>{fmtRp(po.grandTotal)}</div>
                  <div className={styles.jmlItem}>{items.length} item</div>
                </div>
              </button>

              {open && (
                <div className={styles.detail}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>DESKRIPSI</th>
                        <th className={styles.right}>QTY</th>
                        <th className={styles.right}>HARGA</th>
                        <th className={styles.right}>TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => (
                        <tr key={it.id}>
                          <td>
                            {it.description}
                            {it.description2 ? <span className={styles.desc2}> — {it.description2}</span> : null}
                          </td>
                          <td className={styles.right}>
                            {Number(it.qty || 0)} {it.unit || ''}
                          </td>
                          <td className={styles.right}>{fmtRp(it.unitPrice)}</td>
                          <td className={styles.right}>{fmtRp(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.btnOk}
                      disabled={busy}
                      onClick={() => handleVerify(po)}
                    >
                      <CheckCircle size={14} /> Verifikasi &amp; Teruskan ke Atasan
                    </button>
                    <button
                      type="button"
                      className={styles.btnNo}
                      disabled={busy}
                      onClick={() => handleReject(po)}
                    >
                      <XCircle size={14} /> Tolak
                    </button>
                    {po.keterangan && <span className={styles.note}>{po.keterangan}</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ApprovalPOPanel;