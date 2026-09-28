import { useEffect, useMemo, useRef } from 'react';
import { X, History, Undo2, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBvRabHistory } from '../hooks/useBvRabHistory';
import styles from '../styles/BackUpVolume.module.css';

const FIELD_LABELS = {
  totalVolume: 'Total volume', breakdowns: 'Rincian volume',
  rapUnitPrice: 'RAP satuan', rapTotalPrice: 'Total RAP',
  rabUnitPrice: 'RAB satuan', rabTotalPrice: 'Total RAB',
  overheadPercent: 'Overhead', components: 'Rincian AHSP',
  isByOwner: 'Dikerjakan owner', isStip: 'STIP', sourceJobTypeId: 'Master AHSP',
  keterangan: 'Keterangan', name: 'Nama item', paymentUnit: 'Satuan',
};

const formatValue = (field, value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (field.toLowerCase().includes('price') && Number.isFinite(Number(value))) {
    return `Rp ${Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 })}`;
  }
  if (field === 'totalVolume' && Number.isFinite(Number(value))) {
    return Number(value).toLocaleString('id-ID', { maximumFractionDigits: 4 });
  }
  if (field === 'overheadPercent') return `${value}%`;
  if (Array.isArray(value)) return `${value.length} baris`;
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
  return String(value);
};

const formatDate = (value) => new Date(value).toLocaleString('id-ID', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export default function BvRabHistoryPanel({ projectId, module, open, onClose, onUndone }) {
  const { entries, loading, error, refresh, undo } = useBvRabHistory(projectId, module);
  const closeButtonRef = useRef(null);
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  }, []);
  const userId = useMemo(() => {
    const savedUserId = user?.id || user?.userId || user?._id;
    if (savedUserId) return savedUserId;

    try {
      const tokenPayload = localStorage.getItem('token')?.split('.')[1];
      if (!tokenPayload) return null;
      const base64 = tokenPayload.replace(/-/g, '+').replace(/_/g, '/');
      const claims = JSON.parse(window.atob(base64));
      return claims.userId || claims.id || null;
    } catch {
      return null;
    }
  }, [user]);
  const latestAppliedByItem = useMemo(() => {
    const latest = new Map();
    for (const entry of entries) {
      // Selaras dengan backend: baris UNDO tidak dianggap perubahan yang bisa dibatalkan.
      if (entry.status === 'APPLIED' && entry.action !== 'UNDO' && !latest.has(`${entry.entityType}:${entry.entityId}`)) {
        latest.set(`${entry.entityType}:${entry.entityId}`, entry.id);
      }
    }
    return latest;
  }, [entries]);

  useEffect(() => {
    if (!open) return undefined;
    refresh().catch(() => {});
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const handleKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, refresh, onClose]);

  const handleUndo = async (entry) => {
    if (!window.confirm(`Batalkan perubahan terakhir pada “${entry.itemName || 'item'}”?`)) return;
    try {
      await undo(entry.id);
      await onUndone?.();
      toast.success('Perubahan berhasil dibatalkan.');
    } catch (undoError) {
      toast.error(undoError.message || 'Gagal membatalkan perubahan.');
    }
  };

  if (!open) return null;

  return (
    <div className={styles.historyOverlay} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <aside className={styles.historyDrawer} role="dialog" aria-modal="true" aria-labelledby="bv-rab-history-title">
        <header className={styles.historyHeader}>
          <div>
            <span className={styles.historyEyebrow}>{module === 'BV' ? 'BACK UP VOLUME' : 'RAB & BUDGETING'}</span>
            <h2 id="bv-rab-history-title"><History size={20} /> Riwayat Perubahan</h2>
            <p>Perubahan terbaru untuk proyek ini</p>
          </div>
          <button type="button" className={styles.historyClose} onClick={onClose} aria-label="Tutup riwayat" ref={closeButtonRef}><X size={19} /></button>
        </header>

        <div className={styles.historyToolbar}>
          <span>{entries.length} aktivitas</span>
          <button type="button" onClick={() => refresh().catch(() => {})} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'button-spinner' : ''} /> Muat ulang
          </button>
        </div>

        <div className={styles.historyBody} aria-live="polite">
          {loading && entries.length === 0 ? (
            <div className={styles.historyState}><RefreshCw size={17} className="button-spinner" /> Memuat riwayat...</div>
          ) : error ? (
            <div className={styles.historyState}><AlertCircle size={17} /> {error}</div>
          ) : entries.length === 0 ? (
            <div className={styles.historyState}>Belum ada perubahan yang tercatat.</div>
          ) : entries.map((entry) => {
            const canUndo = entry.status === 'APPLIED'
              && entry.action !== 'UNDO'
              && latestAppliedByItem.get(`${entry.entityType}:${entry.entityId}`) === entry.id
              && entry.actorId
              && entry.actorId === userId;
            return (
              <article key={entry.id} className={styles.historyEntry}>
                <div className={styles.historyEntryTop}>
                  <div className={styles.historyEntryTitle}>
                    <span className={`${styles.historyDot} ${entry.status === 'UNDONE' ? styles.historyDotUndone : ''}`} />
                    <strong>{entry.itemName || 'Item tanpa nama'}</strong>
                  </div>
                  <span className={styles.historyModuleTag}>{entry.entityType === 'BV_ITEM' ? 'BV' : 'RAB'}</span>
                </div>
                <div className={styles.historyMeta}>
                  <span>{entry.actorName || 'Pengguna'}</span><span>·</span><span>{formatDate(entry.createdAt)}</span>
                </div>
                <div className={styles.historyChanges}>
                  {(entry.changes || []).map((change) => (
                    <div className={styles.historyChange} key={change.field}>
                      <span>{FIELD_LABELS[change.field] || change.field}</span>
                      <div><del>{formatValue(change.field, change.before)}</del><b>→</b><strong>{formatValue(change.field, change.after)}</strong></div>
                    </div>
                  ))}
                </div>
                {entry.status === 'UNDONE' ? (
                  <span className={styles.historyUndoneLabel}>Dibatalkan{entry.undoneByName ? ` oleh ${entry.undoneByName}` : ''}</span>
                ) : canUndo ? (
                  <button type="button" className={styles.historyUndo} onClick={() => handleUndo(entry)}>
                    <Undo2 size={14} /> Batalkan perubahan ini
                  </button>
                ) : entry.action === 'UNDO' ? (
                  <span className={styles.historyUndoneLabel}>Catatan pembatalan perubahan</span>
                ) : entry.status === 'APPLIED' ? (
                  <span className={styles.historyUndoneLabel}>Undo tersedia untuk perubahan terakhir oleh pembuatnya</span>
                ) : null}
              </article>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
