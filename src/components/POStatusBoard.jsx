import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Package, Truck, ChevronRight, Send, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { poService } from '../services/poService';
import { purchasingService } from '../services/purchasingService';
import toast from 'react-hot-toast';
import styles from '../styles/POStatusBoard.module.css';

const fmtRp = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const fmtTanggal = (d) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const STATUS_META = {
  BELUM_APPROVE: { label: 'Belum Approve', cls: 'stPending', Icon: Clock },
  MENUNGGU_ATASAN: { label: 'Menunggu Atasan', cls: 'stMenunggu', Icon: Clock },
  APPROVED: { label: 'Approved', cls: 'stOk', Icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', cls: 'stNo', Icon: XCircle },
};

const TABS = [
  { key: 'ALL', label: 'Semua' },
  { key: 'BELUM_APPROVE', label: 'Belum Approve' },
  { key: 'MENUNGGU_ATASAN', label: 'Menunggu Atasan' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

/**
 * Board PO per proyek.
 * Finance pilih proyek -> lihat semua PO + status approval -> PO APPROVED
 * bisa langsung diajukan pembayaran (masuk inbox Finance pengajuan).
 */
const POStatusBoard = ({ projectId = null, refreshKey = 0, onChanged, onAjukan }) => {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('ALL');
  const [expanded, setExpanded] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!projectId) {
      setPos([]);
      return;
    }
    setLoading(true);
    try {
      const data = await poService.getPOs({ projectId });
      setPos(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Gagal memuat daftar PO');
      setPos([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const counts = useMemo(() => {
    const c = { ALL: pos.length };
    pos.forEach((p) => {
      c[p.status] = (c[p.status] || 0) + 1;
    });
    return c;
  }, [pos]);

  const rows = useMemo(
    () => (tab === 'ALL' ? pos : pos.filter((p) => p.status === tab)),
    [pos, tab]
  );

  const handleAjukan = async (po) => {
    setBusyId(po.id);
    try {
      await purchasingService.createPengajuan({
        supplierId: po.supplierId,
        poId: po.id,
        projectId,
        totalTagihan: Number(po.grandTotal || 0),
        catatan: `Pengajuan otomatis dari PO ${po.poNumber}`,
      });
      toast.success(`Pengajuan bayar untuk ${po.poNumber} dibuat`);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err.message || 'Gagal mengajukan pembayaran');
    } finally {
      setBusyId(null);
    }
  };

  if (!projectId) {
    return (
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h3 className={styles.panelTitle}>Daftar Purchase Order</h3>
            <p className={styles.panelSub}>Pilih proyek dulu untuk melihat PO.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h3 className={styles.panelTitle}>Daftar Purchase Order</h3>
          <p className={styles.panelSub}>
            {loading ? 'Memuat PO...' : `${pos.length} PO di proyek ini`}
          </p>
        </div>
        <button type="button" className={styles.btnGhost} onClick={load} disabled={loading}>
          <RefreshCw size={14} /> Muat ulang
        </button>
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            <span className={styles.tabCount}>{counts[t.key] || 0}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className={styles.empty}>
          {loading ? 'Memuat...' : 'Tidak ada PO pada filter ini.'}
        </p>
      ) : (
        <div className={styles.list}>
          {rows.map((po) => {
            const meta = STATUS_META[po.status] || STATUS_META.BELUM_APPROVE;
            const open = !!expanded[po.id];
            const items = po.items || [];
            const busy = busyId === po.id;
            const bisaAjukan = po.status === 'APPROVED';

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
                    <div className={styles.poNo}>
                      {po.poNumber}
                      {po.kategoriPO === 'HABIS_PAKAI' && (
                        <span className={styles.tagHabisPakai}>HABIS PAKAI</span>
                      )}
                    </div>
                    <div className={styles.meta}>
                      <span className={styles.supplier}>{po.supplier?.name || 'Tanpa Supplier'}</span>
                      <span className={styles.dot}>·</span>
                      <span>{fmtTanggal(po.tanggal)}</span>
                      <span className={styles.dot}>·</span>
                      <span>{items.length} item</span>
                    </div>
                  </div>
                  <div className={styles.amount}>
                    <div className={styles.total}>{fmtRp(po.grandTotal)}</div>
                    <span className={`${styles.status} ${styles[meta.cls]}`}>
                      <meta.Icon size={11} /> {meta.label}
                    </span>
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

                    <div className={styles.footRow}>
                      <div className={styles.jejak}>
                        {po.verifiedBy?.name && (
                          <span>
                            <Truck size={12} /> Diverifikasi Finance: {po.verifiedBy.name}
                          </span>
                        )}
                        {po.approvedBy?.name && (
                          <span>
                            <CheckCircle2 size={12} /> Disetujui atasan: {po.approvedBy.name}
                          </span>
                        )}
                        {po.rejectReason && (
                          <span className={styles.rejectNote}>Alasan tolak: {po.rejectReason}</span>
                        )}
                      </div>

                      {bisaAjukan && onAjukan && (
                        <button
                          type="button"
                          className={styles.btnOk}
                          disabled={busy}
                          onClick={() => handleAjukan(po)}
                        >
                          <Send size={14} /> Ajukan Pembayaran
                        </button>
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

export default POStatusBoard;
