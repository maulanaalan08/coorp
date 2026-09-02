// src/pages/ItemTrackingPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MapPin,
  Package,
  Clock,
  CheckCircle,
  Truck,
  Save,
  Search,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import styles from '../styles/ItemTracking.module.css';
import Header from '../components/Header';
import ProjectSelector from '../components/ProjectSelector';
import { useProjects } from '../hooks/useProjects';
import { fetchAPI } from '../services/api';
import { lapanganService } from '../services/lapanganService';
import toast from 'react-hot-toast';

// ΓöÇΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const toInputDate = (val) => {
  if (!val) return '';
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  } catch { return ''; }
};

const fmtNum = (n) => {
  const num = Number(n || 0);
  return isNaN(num) ? '0' : num.toLocaleString('id-ID', { maximumFractionDigits: 2 });
};

// ΓöÇΓöÇΓöÇ Status Badge ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const StatusBadge = ({ status }) => {
  if (status === 'COMPLETED') {
    return <span className={`${styles.badge} ${styles.badgeCompleted}`}><CheckCircle size={12} /> Selesai</span>;
  }
  if (status === 'PARTIAL') {
    return <span className={`${styles.badge} ${styles.badgePartial}`}><Truck size={12} /> Sebagian</span>;
  }
  return <span className={`${styles.badge} ${styles.badgePending}`}><Clock size={12} /> Pending</span>;
};

// ΓöÇΓöÇΓöÇ Main Component ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const ItemTrackingPage = () => {
  const { projects: projectList, loading: loadingProjects } = useProjects();

  const [projectId, setProjectId] = useState(null);
  const [mrData, setMrData]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isSaving, setIsSaving]   = useState(false);
  const [edits, setEdits]         = useState({});

  const project = useMemo(
    () => projectList.find((p) => p.id === projectId),
    [projectList, projectId]
  );

  // ΓöÇΓöÇ Fetch data lapangan ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await lapanganService.getMaterialRequests(projectId);
      const safeData = Array.isArray(data) ? data : [];
      setMrData(safeData);

      // Inisialisasi edits dari nilai DB
      const init = {};
      safeData.forEach((mr) => {
        (mr.items || []).forEach((item) => {
          const key = item.id; // Gunakan split ID untuk state lokal (agar baris yang pecah bisa diketik terpisah)
          if (!init[key]) {
            init[key] = {
              tanggalOnsite: toInputDate(item.tanggalOnsite),
              updateLapangan: item.updateLapangan || '',
            };
          }
        });
      });
      setEdits(init);
    } catch (err) {
      console.error('Item Tracking fetch error:', err);
      toast.error('Gagal memuat data lapangan.');
      setMrData([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setMrData([]);
    setEdits({});
    setSearch('');
    setFilterStatus('ALL');
    fetchData();
  }, [fetchData]);

  // ΓöÇΓöÇ Flatten semua items ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const allItems = useMemo(() => {
    const result = [];
    mrData.forEach((mr) => {
      (mr.items || []).forEach((item) => result.push(item));
    });
    return result;
  }, [mrData]);

  // ΓöÇΓöÇ Filter ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchStatus = filterStatus === 'ALL' || item.status === filterStatus;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        (item.itemName || '').toLowerCase().includes(q) ||
        (item.groupName || '').toLowerCase().includes(q) ||
        (item.jobName || '').toLowerCase().includes(q) ||
        (item.supplierName || '').toLowerCase().includes(q) ||
        (item.poNumber || '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [allItems, filterStatus, search]);

  // ΓöÇΓöÇ Stats ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const stats = useMemo(() => ({
    total:     allItems.length,
    pending:   allItems.filter((i) => i.status === 'PENDING').length,
    partial:   allItems.filter((i) => i.status === 'PARTIAL').length,
    completed: allItems.filter((i) => i.status === 'COMPLETED').length,
  }), [allItems]);

  // ΓöÇΓöÇ Handle edit lokal ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const handleEdit = (mrKey, field, value) => {
    setEdits((prev) => ({
      ...prev,
      [mrKey]: { ...(prev[mrKey] || {}), [field]: value },
    }));
  };

  // ΓöÇΓöÇ Save semua (bulk) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const handleSaveAll = async () => {
    const keys = [...new Set(
      allItems
        .filter((item) => item.status !== 'PENDING')
        .map((item) => item.mrItemId || item.id)
    )];

    if (keys.length === 0) {
      toast('Tidak ada item yang bisa diperbarui (semua masih PENDING)', { icon: 'ΓÜá∩╕Å' });
      return;
    }

    const payload = [];
    keys.forEach(key => {
      const item = allItems.find(i => i.id === key);
      if (item && item.status !== 'PENDING') {
        payload.push({
          id: item.mrItemId || item.id, // Backend butuh mrItemId yang asli!
          tanggalOnsite: edits[key]?.tanggalOnsite || null,
          updateLapangan: edits[key]?.updateLapangan || '',
        });
      }
    });

    if (payload.length === 0) {
      toast('Tidak ada item yang bisa disimpan', { icon: '⚠️' });
      return;
    }

    setIsSaving(true);
    toast.promise(
      lapanganService.updateBulk(payload),
      {
        loading: 'Menyimpan progress lapangan...',
        success: `Berhasil simpan ${payload.length} item!`,
        error: 'Gagal menyimpan data lapangan.',
      }
    ).finally(() => setIsSaving(false));
  };

  // ΓöÇΓöÇ Group by groupName ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const grouped = useMemo(() => {
    const map = {};
    filteredItems.forEach((item) => {
      const key = item.groupName || 'Tanpa Grup';
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, [filteredItems]);

  const isLoading = loadingProjects || loading;

  // ── RENDER ──────────────────────────────────────────────────────────
  return (
    <div className={styles.wrapper}>
      <Header />

      {/* ─── TOP HEADER ─── */}
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <p className={styles.eyebrow}>
            {project?.name ? `Project: ${project.name}` : 'Pelaksanaan'}
          </p>
          <h2 className={styles.pageTitle}>Item Tracking</h2>
          <p className={styles.pageSubtitle}>
            Pantau status pengiriman material &amp; update progres lapangan.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 300 }}>
          <ProjectSelector
            projectId={projectId}
            projectList={projectList}
            loading={loadingProjects}
            onChange={(e) => setProjectId(e.target.value || null)}
          />
          {projectId && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={fetchData}
                disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#aaa', padding: '8px 14px', borderRadius: 8,
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                <RefreshCw size={13} /> Refresh
              </button>
              <button
                onClick={handleSaveAll}
                disabled={isSaving || loading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'linear-gradient(135deg,#d4af37,#a8862a)',
                  border: 'none', color: '#0c0b09',
                  padding: '8px 18px', borderRadius: 8,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  opacity: isSaving || loading ? 0.6 : 1,
                }}
              >
                <Save size={13} /> Simpan Semua
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ─── CONTENT ─── */}
      <div className={styles.content}>

        {/* Belum pilih proyek */}
        {!projectId && (
          <div className={styles.emptyState}>
            <MapPin size={52} className={styles.emptyIcon} />
            <h3>Pilih Proyek Terlebih Dahulu</h3>
            <p>Pilih proyek dari dropdown di atas untuk melihat daftar material yang dipantau tim lapangan.</p>
          </div>
        )}

        {/* Loading */}
        {projectId && isLoading && (
          <div className={styles.emptyState}>
            <div style={{
              width: 40, height: 40, border: '3px solid rgba(212,175,55,0.15)',
              borderTopColor: '#d4af37', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ color: '#888', marginTop: 12 }}>Memuat data material...</p>
          </div>
        )}

        {/* Data tersedia */}
        {projectId && !isLoading && (
          <>
            {/* ─── STAT CARDS ─── */}
            <div className={styles.statsGrid}>
              <div className={`${styles.statCard} ${styles.green}`}>
                <div className={styles.statInfo}>
                  <div className={styles.statLabel}>
                    <Package size={16} className={styles.statIcon} />
                    Total Item
                  </div>
                  <div className={styles.statValue}>{stats.total}</div>
                </div>
                <div className={styles.statDesc}>Seluruh item material proyek ini</div>
              </div>

              <div className={`${styles.statCard} ${styles.red}`}>
                <div className={styles.statInfo}>
                  <div className={styles.statLabel}>
                    <Clock size={16} className={styles.statIcon} />
                    Pending
                  </div>
                  <div className={styles.statValue}>{stats.pending}</div>
                </div>
                <div className={styles.statDesc}>Belum diproses Finance / PO</div>
              </div>

              <div className={`${styles.statCard} ${styles.blue}`}>
                <div className={styles.statInfo}>
                  <div className={styles.statLabel}>
                    <Truck size={16} className={styles.statIcon} />
                    Sebagian Diterima
                  </div>
                  <div className={styles.statValue}>{stats.partial}</div>
                </div>
                <div className={styles.statDesc}>Sudah ada PO, belum lengkap</div>
              </div>

              <div className={`${styles.statCard} ${styles.gold}`}>
                <div className={styles.statInfo}>
                  <div className={styles.statLabel}>
                    <CheckCircle size={16} className={styles.statIcon} />
                    Selesai
                  </div>
                  <div className={styles.statValue}>{stats.completed}</div>
                </div>
                <div className={styles.statDesc}>Material lengkap diterima</div>
              </div>
            </div>

            {/* ─── TABLE SECTION ─── */}
            <div className={styles.tableSection}>
              <div className={styles.tableSectionHeader}>
                <h3 className={styles.tableSectionTitle}>
                  <MapPin size={18} color="#d4af37" />
                  Daftar Material Lapangan
                </h3>

                {/* Filter & Search */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Search */}
                  <div className={styles.searchWrap}>
                    <Search size={14} className={styles.searchIcon} />
                    <input
                      className={styles.searchInput}
                      placeholder="Cari item, supplier, PO..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  {/* Filter buttons */}
                  {[
                    { key: 'ALL',       label: 'Semua',    n: stats.total },
                    { key: 'PENDING',   label: 'Pending',  n: stats.pending },
                    { key: 'PARTIAL',   label: 'Sebagian', n: stats.partial },
                    { key: 'COMPLETED', label: 'Selesai',  n: stats.completed },
                  ].map(({ key, label, n }) => (
                    <button
                      key={key}
                      onClick={() => setFilterStatus(key)}
                      style={{
                        padding: '6px 12px', borderRadius: 6, fontSize: 12,
                        fontWeight: 600, cursor: 'pointer', border: '1px solid',
                        borderColor: filterStatus === key ? '#d4af37' : 'rgba(255,255,255,0.1)',
                        background: filterStatus === key ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.03)',
                        color: filterStatus === key ? '#d4af37' : '#888',
                        transition: 'all 0.2s',
                      }}
                    >
                      {label} ({n})
                    </button>
                  ))}
                </div>
              </div>

              {/* Empty state */}
              {filteredItems.length === 0 ? (
                <div className={styles.emptyState}>
                  <AlertCircle size={44} className={styles.emptyIcon} />
                  <h3>Tidak Ada Data</h3>
                  <p>
                    {allItems.length === 0
                      ? 'Proyek ini belum memiliki permintaan material. Kunci RAB dari modul RAB & Budgeting terlebih dahulu.'
                      : 'Tidak ada item yang cocok dengan filter atau pencarian.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th style={{ width: '3%' }}>#</th>
                          <th style={{ width: '22%' }}>Nama Item</th>
                          <th style={{ width: '12%' }}>Pekerjaan</th>
                          <th style={{ width: '9%' }}>Vol. Butuh</th>
                          <th style={{ width: '15%' }}>Supplier / PO</th>
                          <th style={{ width: '9%' }}>Status</th>
                          <th style={{ width: '13%' }}>Tgl. Onsite</th>
                          <th>Update Lapangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(grouped).map(([groupName, items]) => (
                          <React.Fragment key={groupName}>
                            {/* Group header row */}
                              <tr className={styles.groupRow}>
                                <td colSpan={8}>
                                  <div style={{ display: 'flex', alignItems: 'center', color: '#d4af37', fontSize: 12, fontWeight: 700 }}>
                                    <Package size={14} style={{ marginRight: 6 }} /> {groupName}
                                  </div>
                                </td>
                              </tr>

                              {items.map((item, idx) => {
                                const rowKey    = item.id;
                                const edit      = edits[rowKey] || {};
                                const isPending = item.status === 'PENDING';
                                const isFromPO  = item.poNumber !== '-';

                                return (
                                <tr key={`${item.id}-${idx}`}>
                                  <td style={{ color: '#555', fontSize: 12 }}>{idx + 1}</td>

                                  {/* Nama Item */}
                                  <td>
                                    <div style={{ fontWeight: 500, color: '#eee', fontSize: 13 }}>
                                      {item.itemName || 'ΓÇö'}
                                    </div>
                                    {item.unit && (
                                      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                                        Satuan: {item.unit}
                                      </div>
                                    )}
                                  </td>

                                  {/* Pekerjaan */}
                                  <td style={{ fontSize: 12, color: '#999' }}>
                                    {item.jobName || '—'}
                                  </td>

                                  {/* Volume */}
                                  <td className={styles.cellMono}>
                                    {fmtNum(item.estimatedVolume)}
                                  </td>

                                  {/* Supplier & PO */}
                                  <td>
                                    <div style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 5,
                                      fontSize: 12, padding: '3px 10px', borderRadius: 20,
                                      background: isFromPO ? 'rgba(56,189,248,0.08)' : 'rgba(251,146,60,0.08)',
                                      border: `1px solid ${isFromPO ? 'rgba(56,189,248,0.2)' : 'rgba(251,146,60,0.2)'}`,
                                      color: isFromPO ? '#38bdf8' : '#fb923c',
                                    }}>
                                      <Truck size={10} />
                                      {item.supplierName || '—'}
                                    </div>
                                    {item.poNumber && item.poNumber !== '-' && (
                                      <div style={{ fontSize: 11, color: '#666', marginTop: 3 }}>
                                        {item.poNumber}
                                      </div>
                                    )}
                                  </td>

                                  {/* Status */}
                                  <td><StatusBadge status={item.status} /></td>

                                  {/* Tanggal Onsite */}
                                  <td>
                                    <input
                                      type="date"
                                      value={edit.tanggalOnsite || ''}
                                      disabled={isPending || !isFromPO}
                                      onChange={(e) => handleEdit(rowKey, 'tanggalOnsite', e.target.value)}
                                      className={styles.cellInput}
                                      style={{ opacity: (isPending || !isFromPO) ? 0.35 : 1 }}
                                    />
                                    {(isPending || !isFromPO) && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#fb923c', marginTop: 4, fontStyle: 'italic' }}>
                                        <AlertCircle size={12} /> Tunggu PO
                                      </div>
                                    )}
                                  </td>

                                  {/* Update Lapangan */}
                                  <td>
                                    <textarea
                                      value={edit.updateLapangan || ''}
                                      disabled={isPending || !isFromPO}
                                      rows={2}
                                      placeholder={(isPending || !isFromPO) ? 'Menunggu di-PO...' : 'Catatan kondisi barang, kendala...'}
                                      onChange={(e) => handleEdit(rowKey, 'updateLapangan', e.target.value)}
                                      className={`${styles.cellInput} ${styles.cellTextarea}`}
                                      style={{
                                        opacity: (isPending || !isFromPO) ? 0.35 : 1,
                                      }}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer note */}
                  <div style={{
                    padding: '12px 20px', fontSize: 12, color: '#666',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <AlertCircle size={12} style={{ color: '#fb923c', flexShrink: 0 }} />
                    Item <strong style={{ color: '#fb923c' }}>PENDING</strong> tidak bisa diisi &mdash; tunggu Finance memproses Purchase Order.
                    &nbsp; Menampilkan <strong style={{ color: '#eee' }}>{filteredItems.length}</strong> dari {allItems.length} item.
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ─── FLOATING SAVE BUTTON ─── */}
      {projectId && !isLoading && (
        <div style={{
          position: 'fixed',
          bottom: 30,
          right: 40,
          zIndex: 999,
          display: 'flex',
          gap: 12,
          padding: '12px 20px',
          background: 'rgba(12, 11, 9, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', marginRight: 16 }}>
            <span style={{ fontSize: 13, color: '#eee', fontWeight: 600 }}>Simpan Progress</span>
            <span style={{ fontSize: 11, color: '#888' }}>Jangan lupa simpan perubahan</span>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#aaa', padding: '10px 16px', borderRadius: 8,
              fontSize: 13, cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} /> Batal
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg,#d4af37,#a8862a)',
              border: 'none', color: '#0c0b09',
              padding: '10px 24px', borderRadius: 8,
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              opacity: isSaving || loading ? 0.6 : 1,
              boxShadow: '0 4px 12px rgba(212, 175, 55, 0.2)',
              transition: 'all 0.2s'
            }}
          >
            <Save size={16} /> Simpan Lapangan
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ItemTrackingPage;
