import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, ChevronRight, UserCheck, FileText, Truck, Package } from 'lucide-react';
import { purchasingService } from '../services/purchasingService';
import POItemDetail from './POItemDetail';
import toast from 'react-hot-toast';
import styles from '../styles/ApprovalPengajuanPanel.module.css';

const fmtRp = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const fmtTanggal = (d) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

/**
 * Panel approval pengajuan bayar dua tingkat.
 * mode="finance" -> tingkat 1, status PENDING, aksi Verifikasi
 * mode="atasan"  -> tingkat 2, status APPROVED_FINANCE, aksi Setujui / Tolak
 */
const ApprovalPengajuanPanel = ({ mode = 'finance', projectId = null, refreshKey = 0, onChanged }) => {
  const isAtasan = mode === 'atasan';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = isAtasan
        ? await purchasingService.getInboxAtasanPengajuan(projectId)
        : await purchasingService.getInboxFinancePengajuan(projectId);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(isAtasan ? 'Gagal memuat inbox atasan' : 'Gagal memuat antrian Finance');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Tanpa proyek jangan muat — inbox tanpa filter balikin data semua proyek.
    if (!projectId) {
      setRows([]);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, mode, refreshKey]);

  const handleVerify = async (row) => {
    setBusyId(row.id);
    try {
      await purchasingService.verifyPengajuan(row.id, '');
      toast.success(`${row.noPengajuan} diteruskan ke atasan`);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err.message || 'Gagal verifikasi pengajuan');
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = async (row) => {
    setBusyId(row.id);
    try {
      await purchasingService.approvePengajuan(row.id);
      toast.success(`${row.noPengajuan} disetujui`);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err.message || 'Gagal menyetujui pengajuan');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (row) => {
    const reason = window.prompt(`Alasan menolak ${row.noPengajuan}:`);
    if (!reason || !reason.trim()) return;
    setBusyId(row.id);
    try {
      await purchasingService.rejectPengajuan(row.id, reason.trim());
      toast.success(`${row.noPengajuan} ditolak`);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err.message || 'Gagal menolak pengajuan');
    } finally {
      setBusyId(null);
    }
  };

  const totalNilai = rows.reduce((s, r) => s + Number(r.totalTagihan || 0), 0);

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
        <p className={styles.empty}>Memuat pengajuan...</p>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h3 className={styles.panelTitle}>
            {isAtasan ? 'Menunggu Persetujuan Atasan' : 'Antrian Pengajuan Bayar'}
          </h3>
          <p className={styles.panelSub}>
            {rows.length === 0
              ? 'Pengajuan bayar otomatis dari PO yang sudah di-approve atasan akan muncul di sini.'
              : `${rows.length} pengajuan · total ${fmtRp(totalNilai)}`}
          </p>
        </div>
        {rows.length === 0 ? (
          <span className={styles.badgeKosong}>Tidak ada antrian</span>
        ) : (
          <span className={styles.badgeAntre}>{rows.length} antre</span>
        )}
      </div>

      {rows.length > 0 && (
        <div className={styles.list}>
          {rows.map((row) => {
            const open = !!expanded[row.id];
            const busy = busyId === row.id;
            const poNo = row.purchaseOrder?.poNumber;
            return (
              <div key={row.id} className={styles.card}>
                <button
                  type="button"
                  className={styles.cardHead}
                  onClick={() => setExpanded((p) => ({ ...p, [row.id]: !p[row.id] }))}
                >
                  <ChevronRight
                    size={16}
                    className={styles.chev}
                    style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  />
                  <div className={styles.cardMain}>
                    <div className={styles.noPengajuan}>
                      <FileText size={13} /> {row.noPengajuan || `PPB-${row.id}`}
                    </div>
                    <div className={styles.meta}>
                      <span className={styles.supplier}>{row.supplier?.name || 'Tanpa Supplier'}</span>
                      {poNo && <span className={styles.dot}>·</span>}
                      {poNo && <span>PO {poNo}</span>}
                      <span className={styles.dot}>·</span>
                      <span>{fmtTanggal(row.tanggal)}</span>
                    </div>
                    {isAtasan && row.verifiedBy?.name && (
                      <div className={styles.verified}>
                        <UserCheck size={12} /> Diverifikasi Finance oleh {row.verifiedBy.name}
                      </div>
                    )}
                  </div>
                  <div className={styles.amount}>
                    <div className={styles.total}>{fmtRp(row.totalTagihan)}</div>
                  </div>
                </button>

                {open && (
                  <div className={styles.detail}>
                    {row.catatan && (
                      <p className={styles.catatan}>
                        <strong>Catatan purchasing:</strong> {row.catatan}
                      </p>
                    )}
                    {row.catatanFinance && (
                      <p className={styles.catatan}>
                        <strong>Catatan Finance:</strong> {row.catatanFinance}
                      </p>
                    )}

                    {/* Atasan: cukup lihat PO apa saja yang diajukan + itemnya */}
                    {isAtasan && row.purchaseOrder && (
                      <div className={styles.poBlok}>
                        <div className={styles.poBlokHead}>
                          <span className={styles.poBlokTitle}>
                            <Truck size={13} /> PO {row.purchaseOrder.poNumber || '-'}
                          </span>
                          <span className={styles.poItemCount}>
                            <Package size={11} />{' '}
                            {(row.purchaseOrder.items || []).length} item
                          </span>
                        </div>
                        <POItemDetail po={row.purchaseOrder} showHeader />
                        <div className={styles.poTotal}>
                          <span>Total PO</span>
                          <span className={styles.poTotalVal}>
                            {fmtRp(row.purchaseOrder.grandTotal)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className={styles.actions}>
                      {isAtasan ? (
                        <>
                          <button type="button" className={styles.btnOk} disabled={busy} onClick={() => handleApprove(row)}>
                            <CheckCircle size={14} /> Setujui Pengajuan
                          </button>
                          <button type="button" className={styles.btnNo} disabled={busy} onClick={() => handleReject(row)}>
                            <XCircle size={14} /> Tolak
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" className={styles.btnOk} disabled={busy} onClick={() => handleVerify(row)}>
                            <CheckCircle size={14} /> Verifikasi &amp; Teruskan ke Atasan
                          </button>
                          <button type="button" className={styles.btnNo} disabled={busy} onClick={() => handleReject(row)}>
                            <XCircle size={14} /> Tolak
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ApprovalPengajuanPanel;
