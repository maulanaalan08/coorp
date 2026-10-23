import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Package,
  Building,
  CheckCircle,
  ChevronRight,
  Printer,
  Edit,
  AlertCircle,
} from 'lucide-react';
import styles from '../styles/PurchaseOrderPage.module.css';
import Header from '../components/Header';
import { usePO } from '../hooks/usePO';
import { useProjects } from '../hooks/useProjects';
import ProjectSelector from '../components/ProjectSelector';
import { poService } from '../services/poService';
import PurchaseOrderModal from '../components/PurchaseOrderModal';
import POJasaModal from '../components/POJasaModal';
import SupplierModal from '../components/SupplierModal';
import toast from 'react-hot-toast';

const fmtRp = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const fmtNum = (n) => {
  const num = Number(n || 0);
  return Number.isNaN(num) ? '0' : parseFloat(num.toFixed(4)).toString();
};

const statusChip = (status) => {
  if (status === 'APPROVED') return `${styles.statusBadge} ${styles.statusApproved}`;
  if (status === 'REJECTED') return `${styles.statusBadge} ${styles.statusRejected}`;
  if (status === 'MENUNGGU_ATASAN') return `${styles.statusBadge} ${styles.statusPending}`;
  return `${styles.statusBadge} ${styles.statusNone}`;
};

const statusLabel = (status) => {
  if (status === 'APPROVED') return 'Approved';
  if (status === 'REJECTED') return 'Rejected';
  if (status === 'MENUNGGU_ATASAN') return 'Menunggu Atasan';
  return 'Belum Approve';
};

const getVolumeTone = (orderedQty, rapQty) => {
  if (orderedQty > rapQty) return '#ef4444';
  if (orderedQty < rapQty) return '#f59e0b';
  return '#22c55e';
};

const labelUtamaStyle = {
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  padding: '2px 8px',
  borderRadius: '4px',
  background: 'rgba(59, 130, 246, 0.15)',
  color: '#93c5fd',
  border: '1px solid rgba(59, 130, 246, 0.4)',
  display: 'inline-flex',
  alignItems: 'center',
};

const subLabelStyle = {
  fontSize: '10px',
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: '4px',
  background: '#23201b',
  color: '#d4af37',
  border: '1px solid #4a4231',
  display: 'inline-flex',
  alignItems: 'center',
};

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

const PurchaseOrderJasaPage = () => {
  const [activeTab, setActiveTab] = useState('buat-po');
  const [projectId, setProjectId] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState('ALL');
  const [selectedItems, setSelectedItems] = useState([]);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [editingPo, setEditingPo] = useState(null);

  const [rapItems, setRapItems] = useState([]);
  const [loadingRap, setLoadingRap] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedJobs, setExpandedJobs] = useState({});
  const [expandedItems, setExpandedItems] = useState({});

  const { projects: projectList, loading: loadingProjects } = useProjects();
  const { pos, refreshPOs } = usePO();

  const fetchRapPlan = useCallback(async () => {
    if (!projectId) {
      setRapItems([]);
      return;
    }
    setLoadingRap(true);
    try {
      const data = await poService.getPOJasaRapPlan(projectId);
      setRapItems(Array.isArray(data?.items) ? data.items : []);
    } catch (error) {
      toast.error('Gagal memuat RAP plan untuk PO Jasa');
      setRapItems([]);
    } finally {
      setLoadingRap(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchRapPlan();
  }, [fetchRapPlan]);

  const poJasaProject = useMemo(() => {
    return (pos || []).filter((po) => {
      const isJasa = po?.kategoriPO === 'JASA' || !!po?.jasaId || !!po?.jasa;
      const byProject = projectId ? po?.projectId === projectId : true;
      return isJasa && byProject;
    });
  }, [pos, projectId]);

  const rapWithHistory = useMemo(() => {
    return rapItems.map((rap) => {
      const histories = [];
      poJasaProject.forEach((po) => {
        (po.items || []).forEach((it) => {
          const sameRab = Boolean(rap.rabItemId && it.rabItemId && rap.rabItemId === it.rabItemId);
          const sameDesc = String(it.description || '').trim().toLowerCase() === String(rap.itemName || '').trim().toLowerCase();
          if (!sameDesc || (rap.rabItemId && it.rabItemId && !sameRab)) return;
          histories.push({
            poId: po.id,
            poNumber: po.poNumber,
            tanggal: po.tanggal,
            jasaName: po.jasa?.nama || po.supplier?.name || '-',
            status: po.status,
            caraPembayaran: po.caraPembayaran,
            qty: Number(it.qty || 0),
            unitPrice: Number(it.unitPrice || 0),
            total: Number(it.total || 0),
          });
        });
      });

      const orderedQty = histories.reduce((sum, h) => sum + Number(h.qty || 0), 0);
      const rapQty = Number(rap.rapQty || 0);
      const diff = Math.round((orderedQty - rapQty) * 100) / 100;
      let overUnderNotes = rap.notes || null;
      if (diff >= 0.01) overUnderNotes = `${overUnderNotes ? `${overUnderNotes}; ` : ''}Over volume +${fmtNum(diff)} ${rap.unit || ''}`;
      if (diff <= -0.01) overUnderNotes = `${overUnderNotes ? `${overUnderNotes}; ` : ''}Under volume ${fmtNum(Math.abs(diff))} ${rap.unit || ''}`;
      if (Math.abs(diff) < 0.01 && !overUnderNotes) overUnderNotes = 'Sesuai RAP';

      return {
        ...rap,
        rapQty,
        rapPrice: Number(rap.rapPrice || 0),
        orderedQty,
        remainingQty: rapQty - orderedQty,
        histories,
        overUnderNotes,
      };
    });
  }, [rapItems, poJasaProject]);

  const availableCategories = useMemo(() => {
    const set = new Set();
    rapWithHistory.forEach((r) => {
      const code = r.parentWorkCategoryCode || r.workCategoryCode;
      if (code) set.add(code.toUpperCase());
    });
    return Array.from(set).sort();
  }, [rapWithHistory]);

  const availableSubCategories = useMemo(() => {
    const set = new Set();
    rapWithHistory.forEach((r) => {
      const cat = r.parentWorkCategoryCode || r.workCategoryCode;
      if (!selectedCategory || selectedCategory === 'ALL' || String(cat || '').toUpperCase() === selectedCategory.toUpperCase()) {
        const sub = r.parentWorkSubCategoryCode || r.workSubCategoryCode || r.parentWorkSubCategoryName || r.workSubCategoryName;
        if (sub) set.add(sub);
      }
    });
    return Array.from(set).sort();
  }, [rapWithHistory, selectedCategory]);

  const filteredRapRows = useMemo(() => {
    let rows = rapWithHistory;

    if (selectedCategory && selectedCategory !== 'ALL') {
      rows = rows.filter((row) => {
        const cat = String(row.parentWorkCategoryCode || row.workCategoryCode || '').toUpperCase();
        return cat === selectedCategory.toUpperCase();
      });
    }

    if (selectedSubCategory && selectedSubCategory !== 'ALL') {
      rows = rows.filter((row) => {
        const sub = String(row.parentWorkSubCategoryCode || row.workSubCategoryCode || row.parentWorkSubCategoryName || row.workSubCategoryName || '').toLowerCase();
        return sub === selectedSubCategory.toLowerCase();
      });
    }

    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) => {
      const cocokRow =
        String(row.itemName || '').toLowerCase().includes(q) ||
        String(row.groupName || '').toLowerCase().includes(q) ||
        String(row.jobName || '').toLowerCase().includes(q) ||
        String(row.parentWorkCategoryCode || '').toLowerCase().includes(q) ||
        String(row.parentWorkCategoryName || '').toLowerCase().includes(q) ||
        String(row.parentWorkSubCategoryCode || '').toLowerCase().includes(q) ||
        String(row.parentWorkSubCategoryName || '').toLowerCase().includes(q) ||
        String(row.workCategoryCode || '').toLowerCase().includes(q) ||
        String(row.workCategoryName || '').toLowerCase().includes(q) ||
        String(row.workSubCategoryCode || '').toLowerCase().includes(q) ||
        String(row.workSubCategoryName || '').toLowerCase().includes(q);
      const cocokRiwayat = (row.histories || []).some((h) =>
        String(h.poNumber || '').toLowerCase().includes(q) ||
        String(h.jasaName || '').toLowerCase().includes(q),
      );
      return cocokRow || cocokRiwayat;
    });
  }, [rapWithHistory, search, selectedCategory, selectedSubCategory]);

  const groupedRows = useMemo(() => {
    const groups = {};
    filteredRapRows.forEach((row) => {
      const g = row.groupName || 'Tanpa Group';
      const j = row.jobName || 'Tanpa Uraian';
      if (!groups[g]) groups[g] = {};
      if (!groups[g][j]) groups[g][j] = [];
      groups[g][j].push(row);
    });
    return groups;
  }, [filteredRapRows]);

  const toggleSelect = (row) => {
    setSelectedItems((prev) => {
      const uId = row.uniqueId || row.rabItemId;
      const exists = prev.some((x) => (x.uniqueId || x.rabItemId) === uId);
      if (exists) return prev.filter((x) => (x.uniqueId || x.rabItemId) !== uId);

      const suggestedQty = Number(row.remainingQty) > 0 ? Number(row.remainingQty) : Number(row.rapQty || 0);
      return [
        ...prev,
        {
          id: uId,
          uniqueId: uId,
          rabItemId: row.rabItemId,
          itemName: row.itemName,
          description: row.itemName,
          unit: row.unit || '-',
          rapQty: Number(suggestedQty || 0),
          rapPrice: Number(row.rapPrice || 0),
          rapTotal: Number(suggestedQty || 0) * Number(row.rapPrice || 0),
          notes: row.overUnderNotes,
          groupName: row.groupName,
          jobName: row.jobName,
          parentWorkCategoryCode: row.parentWorkCategoryCode,
          parentWorkCategoryName: row.parentWorkCategoryName,
          parentWorkSubCategoryCode: row.parentWorkSubCategoryCode,
          parentWorkSubCategoryName: row.parentWorkSubCategoryName,
          workCategoryCode: row.workCategoryCode,
          workCategoryName: row.workCategoryName,
          workSubCategoryCode: row.workSubCategoryCode,
          workSubCategoryName: row.workSubCategoryName,
        },
      ];
    });
  };

  const handleCreatePoClick = () => {
    if (selectedItems.length === 0) {
      toast.error('Pilih minimal 1 baris jasa dari RAP');
      return;
    }
    setEditingPo(null);
    setIsPoModalOpen(true);
  };

  const handlePoSuccess = () => {
    setIsPoModalOpen(false);
    setEditingPo(null);
    setSelectedItems([]);
    refreshPOs?.();
    fetchRapPlan();
  };

  const handleEditPo = (po) => {
    setEditingPo(po);
    setSelectedItems(
      (po.items || []).map((it) => ({
        id: it.id,
        rabItemId: it.rabItemId || null,
        itemName: it.description,
        description: it.description,
        unit: it.unit,
        rapQty: Number(it.qty || 0),
        rapPrice: Number(it.unitPrice || 0),
        rapTotal: Number(it.total || 0),
      })),
    );
    setIsPoModalOpen(true);
  };

  const handleProjectChange = (e) => {
    setProjectId(e.target.value || null);
    setSelectedItems([]);
    setExpandedGroups({});
    setExpandedJobs({});
    setExpandedItems({});
    setSelectedCategory('ALL');
    setSelectedSubCategory('ALL');
  };

  return (
    <div className={styles.poWrapper}>
      <Header />

      <header className={styles.financeHeader}>
        <div className={styles.headerMain}>
          <p className={styles.eyebrow}>Pelaksanaan</p>
          <h2 className={styles.title}>Kelola Jasa</h2>
          <p className={styles.subtitle}>Kelola jasa berbasis RAP. Qty & harga default mengikuti RAP, over/under diberi catatan.</p>
        </div>
        <div style={{ minWidth: '300px' }}>
          {activeTab === 'buat-po' && (
            <ProjectSelector
              projectId={projectId}
              projectList={projectList}
              loading={loadingProjects}
              onChange={handleProjectChange}
            />
          )}
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'buat-po' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('buat-po')}
          >
            <Package size={16} /> Buat PO Jasa
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'manage-jasa' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('manage-jasa')}
          >
            <Building size={16} /> Master Jasa
          </button>
        </div>

        {activeTab === 'manage-jasa' && (
          <div className={styles.tabContent}>
            <SupplierModal isInline masterMode="jasa" />
          </div>
        )}

        {activeTab === 'buat-po' && (
          <div className={styles.tabContent}>
            <div className={styles.toolbar}>
              <div>
                <h3 className={styles.sectionTitle}>Daftar Kebutuhan Jasa (RAP)</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>
                  Tetap bisa dibuat PO lagi meskipun item sudah pernah di-approve sebelumnya.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div className={styles.searchBox} style={{ width: 300 }}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={styles.searchInput}
                    placeholder="Cari jasa / group / label / no PO..."
                  />
                </div>
                <button
                  className={styles.createPoBtn}
                  onClick={handleCreatePoClick}
                  style={selectedItems.length === 0 ? { opacity: 0.5 } : {}}
                >
                  <Plus size={16} /> Buat PO ({selectedItems.length})
                </button>
              </div>
            </div>

            {projectId && availableCategories.length > 0 && (
              <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: availableSubCategories.length > 0 && selectedCategory !== 'ALL' ? 8 : 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Label Utama (Kategori):
                  </span>
                  <button
                    type="button"
                    onClick={() => { setSelectedCategory('ALL'); setSelectedSubCategory('ALL'); }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: selectedCategory === 'ALL' ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                      background: selectedCategory === 'ALL' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                      color: selectedCategory === 'ALL' ? '#93c5fd' : '#aaa',
                    }}
                  >
                    Semua ({rapWithHistory.length})
                  </button>
                  {availableCategories.map((cat) => {
                    const count = rapWithHistory.filter((r) => String(r.parentWorkCategoryCode || r.workCategoryCode || '').toUpperCase() === cat).length;
                    const isActive = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => { setSelectedCategory(cat); setSelectedSubCategory('ALL'); }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: isActive ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                          background: isActive ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                          color: isActive ? '#93c5fd' : '#ccc',
                        }}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>

                {selectedCategory !== 'ALL' && availableSubCategories.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Sub Label:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSubCategory('ALL')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: selectedSubCategory === 'ALL' ? '1px solid #d4af37' : '1px solid rgba(255,255,255,0.1)',
                        background: selectedSubCategory === 'ALL' ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                        color: selectedSubCategory === 'ALL' ? '#fcd34d' : '#aaa',
                      }}
                    >
                      Semua
                    </button>
                    {availableSubCategories.map((sub) => {
                      const isActive = selectedSubCategory === sub;
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setSelectedSubCategory(sub)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: isActive ? '1px solid #d4af37' : '1px solid #4a4231',
                            background: isActive ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                            color: isActive ? '#fcd34d' : '#999',
                          }}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {!projectId ? (
              <div className={styles.emptyState}>
                <Package size={48} className={styles.emptyIcon} />
                <h3>Pilih Project Terlebih Dahulu</h3>
                <p>Gunakan dropdown project untuk memuat RAP plan jasa.</p>
              </div>
            ) : loadingRap ? (
              <div className={styles.emptyState}><p>⏳ Memuat RAP plan jasa...</p></div>
            ) : filteredRapRows.length === 0 ? (
              <div className={styles.emptyState}>
                <Package size={48} className={styles.emptyIcon} />
                <h3>Belum Ada Data RAP Jasa</h3>
                <p>Pastikan item kategori UPAH/JASA di RAP sudah terisi.</p>
              </div>
            ) : (
              <div className={styles.tableSection}>
                <div className={styles.tableWrapper}>
                  <table className={styles.poTable}>
                    <thead>
                      <tr>
                        <th style={{ width: 36 }} />
                        <th>NAMA GRUP / PEKERJAAN</th>
                        <th style={{ minWidth: 160 }}>LABEL / KATEGORI</th>
                        <th style={{ textAlign: 'center' }}>TOTAL ITEM</th>
                        <th style={{ textAlign: 'center' }}>DIPILIH</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(groupedRows).map(([groupName, jobsObj]) => {
                        const isGroupOpen = !!expandedGroups[groupName];
                        const totalItems = Object.values(jobsObj).reduce((sum, arr) => sum + arr.length, 0);
                        const selectedCount = Object.values(jobsObj)
                          .flatMap((arr) => arr)
                          .filter((row) => selectedItems.some((s) => s.rabItemId === row.rabItemId)).length;
                        return (
                          <React.Fragment key={groupName}>
                            <tr className={styles.groupRow} onClick={() => setExpandedGroups((p) => ({ ...p, [groupName]: !p[groupName] }))}>
                              <td style={{ textAlign: 'center' }}>
                                <ChevronRight
                                  size={16}
                                  style={{ transform: isGroupOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s', color: '#d4af37' }}
                                />
                              </td>
                              <td><span className={styles.groupRowName}>{groupName}</span></td>
                              <td>
                                <span style={{ fontSize: '11px', color: '#555' }}>—</span>
                              </td>
                              <td style={{ textAlign: 'center', color: '#aaa' }}>{totalItems}</td>
                              <td style={{ textAlign: 'center', color: '#d4af37' }}>{selectedCount}</td>
                            </tr>

                            {isGroupOpen && Object.entries(jobsObj).map(([jobName, rows]) => {
                              const jobKey = `${groupName}::${jobName}`;
                              const isJobOpen = !!expandedJobs[jobKey];
                              const firstRow = rows[0] || {};
                              const parentCat = firstRow.parentWorkCategoryCode;
                              const parentCatName = firstRow.parentWorkCategoryName;
                              const parentSub = firstRow.parentWorkSubCategoryCode || firstRow.parentWorkSubCategoryName;
                              const parentSubName = firstRow.parentWorkSubCategoryName;

                              return (
                                <React.Fragment key={jobKey}>
                                  <tr className={styles.jobRow} onClick={() => setExpandedJobs((p) => ({ ...p, [jobKey]: !p[jobKey] }))}>
                                    <td style={{ textAlign: 'center' }}>
                                      <ChevronRight
                                        size={14}
                                        style={{ transform: isJobOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s', color: '#60a5fa', marginLeft: 18 }}
                                      />
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span className={styles.jobRowName}>
                                          <span style={{ color: '#444', marginRight: 8 }}>└</span>
                                          {jobName}
                                        </span>
                                      </div>
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                        {parentCat && (
                                          <span
                                            style={labelUtamaStyle}
                                            title={parentCatName ? `Label Utama: ${parentCatName}` : `Label Utama: ${parentCat}`}
                                          >
                                            {parentCat}
                                          </span>
                                        )}
                                        {parentSub && (
                                          <span
                                            style={subLabelStyle}
                                            title={parentSubName ? `Sub Label: ${parentSubName}` : `Sub Label: ${parentSub}`}
                                          >
                                            {parentSub}
                                          </span>
                                        )}
                                        {!parentCat && !parentSub && (
                                          <span style={{ fontSize: '11px', color: '#666' }}>—</span>
                                        )}
                                      </div>
                                    </td>
                                    <td style={{ textAlign: 'center', color: '#777', fontSize: 12 }}>{rows.length}</td>
                                    <td style={{ textAlign: 'center', color: '#d4af37', fontSize: 12 }}>{rows.filter((r) => selectedItems.some((s) => s.rabItemId === r.rabItemId)).length}</td>
                                  </tr>

                                  {isJobOpen && (
                                    <tr>
                                      <td colSpan={5} style={{ padding: 0, background: 'rgba(0,0,0,.25)' }}>
                                        <div className={styles.materialTableWrapper}>
                                          <table className={styles.subTable}>
                                            <thead>
                                              <tr>
                                                <th style={{ width: 40, textAlign: 'center' }}>PILIH</th>
                                                <th style={{ width: 140 }}>LABEL</th>
                                                <th>NAMA JASA</th>
                                                <th>SAT.</th>
                                                <th className={styles.cellRight}>QTY RAP</th>
                                                <th className={styles.cellRight}>QTY DI-PO</th>
                                                <th className={styles.cellRight}>HARGA RAP</th>
                                                <th style={{ minWidth: 160 }}>CATATAN</th>
                                                <th style={{ textAlign: 'center' }}>STATUS</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {rows.map((row) => {
                                                const uId = row.uniqueId || row.rabItemId;
                                                const selected = selectedItems.some((s) => (s.uniqueId || s.rabItemId) === uId);
                                                const itemKey = uId;
                                                const isItemOpen = !!expandedItems[itemKey];

                                                const itemCat = row.workCategoryCode || row.parentWorkCategoryCode;
                                                const itemCatName = row.workCategoryName || row.parentWorkCategoryName;
                                                const itemSub = row.workSubCategoryCode || row.workSubCategoryName || row.parentWorkSubCategoryCode || row.parentWorkSubCategoryName;
                                                const itemSubName = row.workSubCategoryName || row.parentWorkSubCategoryName;

                                                return (
                                                  <React.Fragment key={itemKey}>
                                                    <tr className={selected ? styles.selectedRow : styles.subItemRow}>
                                                      <td style={{ textAlign: 'center' }}>
                                                        <input
                                                          type="checkbox"
                                                          checked={selected}
                                                          onChange={() => toggleSelect(row)}
                                                          className={styles.checkbox}
                                                        />
                                                      </td>
                                                      <td>
                                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                                                          {itemCat && (
                                                            <span
                                                              style={labelUtamaSmStyle}
                                                              title={itemCatName ? `Label Utama: ${itemCatName}` : `Label Utama: ${itemCat}`}
                                                            >
                                                              {itemCat}
                                                            </span>
                                                          )}
                                                          {itemSub && (
                                                            <span
                                                              style={subLabelSmStyle}
                                                              title={itemSubName ? `Sub Label: ${itemSubName}` : `Sub Label: ${itemSub}`}
                                                            >
                                                              {itemSub}
                                                            </span>
                                                          )}
                                                          {!itemCat && !itemSub && (
                                                            <span style={{ fontSize: '11px', color: '#666' }}>—</span>
                                                          )}
                                                        </div>
                                                      </td>
                                                      <td onClick={() => setExpandedItems((p) => ({ ...p, [itemKey]: !p[itemKey] }))} style={{ cursor: 'pointer' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                          <ChevronRight
                                                            size={14}
                                                            style={{ transform: isItemOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s', color: '#a78bfa' }}
                                                          />
                                                          <span>{row.itemName}</span>
                                                        </div>
                                                      </td>
                                                      <td>{row.unit || '-'}</td>
                                                      <td className={`${styles.cellMono} ${styles.cellRight}`}>{fmtNum(row.rapQty)}</td>
                                                      <td className={`${styles.cellMono} ${styles.cellRight}`} style={{ color: getVolumeTone(row.orderedQty, row.rapQty) }}>
                                                        {fmtNum(row.orderedQty)}
                                                      </td>
                                                      <td className={`${styles.cellMono} ${styles.cellRight}`}>{fmtRp(row.rapPrice)}</td>
                                                      <td style={{ fontSize: 11, color: getVolumeTone(row.orderedQty, row.rapQty) }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                          <AlertCircle size={10} /> {row.overUnderNotes || '-'}
                                                        </span>
                                                      </td>
                                                      <td style={{ textAlign: 'center' }}>
                                                        <span className={`${styles.statusBadge} ${row.orderedQty >= row.rapQty && row.rapQty > 0 ? styles.statusApproved : styles.statusPending}`}>
                                                          {row.orderedQty >= row.rapQty && row.rapQty > 0 ? 'RAP Tercapai' : 'Bisa PO Lagi'}
                                                        </span>
                                                      </td>
                                                    </tr>

                                                    {isItemOpen && (
                                                      <tr>
                                                        <td colSpan={9} style={{ padding: 0, background: 'rgba(0,0,0,.45)' }}>
                                                          <div style={{ padding: '10px 16px 16px 72px' }}>
                                                            <h4 style={{ margin: 0, marginBottom: 8, fontSize: 12, color: '#a78bfa' }}>Riwayat PO Jasa</h4>
                                                            {(row.histories || []).length === 0 ? (
                                                              <p style={{ margin: 0, color: '#666', fontSize: 12 }}>Belum ada PO untuk baris RAP ini.</p>
                                                            ) : (
                                                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                                <thead>
                                                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                                                                    <th style={{ textAlign: 'left', padding: 6, fontSize: 11, color: '#888' }}>NO. PO</th>
                                                                    <th style={{ textAlign: 'left', padding: 6, fontSize: 11, color: '#888' }}>TGL PO</th>
                                                                    <th style={{ textAlign: 'left', padding: 6, fontSize: 11, color: '#888' }}>JASA</th>
                                                                    <th style={{ textAlign: 'left', padding: 6, fontSize: 11, color: '#888' }}>CARA BAYAR</th>
                                                                    <th style={{ textAlign: 'right', padding: 6, fontSize: 11, color: '#888' }}>QTY</th>
                                                                    <th style={{ textAlign: 'right', padding: 6, fontSize: 11, color: '#888' }}>HARGA</th>
                                                                    <th style={{ textAlign: 'center', padding: 6, fontSize: 11, color: '#888' }}>AKSI</th>
                                                                  </tr>
                                                                </thead>
                                                                <tbody>
                                                                  {row.histories.map((h) => {
                                                                    const poFull = poJasaProject.find((p) => p.id === h.poId);
                                                                    return (
                                                                      <tr key={`${h.poId}-${h.poNumber}-${h.qty}`} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                                                                        <td className={styles.cellMono} style={{ padding: 6, fontSize: 12, color: '#60a5fa' }}>
                                                                          <div>{h.poNumber || '-'}</div>
                                                                          {poFull?.createdBy?.name && (
                                                                            <div style={{ fontSize: 10, color: '#888' }}>
                                                                              Oleh: <span style={{ color: '#d4af37' }}>{poFull.createdBy.name}</span>
                                                                            </div>
                                                                          )}
                                                                        </td>
                                                                        <td style={{ padding: 6, fontSize: 12, color: '#ccc' }}>{h.tanggal ? new Date(h.tanggal).toLocaleDateString('id-ID') : '-'}</td>
                                                                        <td style={{ padding: 6, fontSize: 12, color: '#ccc' }}>{h.jasaName || '-'}</td>
                                                                        <td style={{ padding: 6, fontSize: 12, color: '#93c5fd' }}>{h.caraPembayaran || '-'}</td>
                                                                        <td style={{ padding: 6, fontSize: 12, textAlign: 'right', color: '#eab308' }}>{fmtNum(h.qty)} {row.unit || ''}</td>
                                                                        <td style={{ padding: 6, fontSize: 12, textAlign: 'right', color: '#ddd' }}>{fmtRp(h.unitPrice)}</td>
                                                                        <td style={{ padding: 6, textAlign: 'center' }}>
                                                                          {poFull ? (
                                                                            <div className={styles.actionCell} style={{ justifyContent: 'center' }}>
                                                                              <span className={statusChip(poFull.status)}>{statusLabel(poFull.status)}</span>
                                                                              <button className={styles.printBtn} onClick={(e) => { e.stopPropagation(); poService.printPO(poFull.id); }} title="Cetak PDF">
                                                                                <Printer size={14} />
                                                                              </button>
                                                                              {(poFull.status === 'REJECTED' || poFull.status === 'BELUM_APPROVE') && (
                                                                                <button className={styles.printBtn} onClick={(e) => { e.stopPropagation(); handleEditPo(poFull); }} title="Edit PO Jasa">
                                                                                  <Edit size={14} />
                                                                                </button>
                                                                              )}
                                                                            </div>
                                                                          ) : '-'}
                                                                        </td>
                                                                      </tr>
                                                                    );
                                                                  })}
                                                                </tbody>
                                                              </table>
                                                            )}
                                                          </div>
                                                        </td>
                                                      </tr>
                                                    )}
                                                  </React.Fragment>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {(isPoModalOpen || editingPo) && (
        <POJasaModal
          selectedItems={selectedItems}
          projectId={projectId}
          onClose={() => {
            setIsPoModalOpen(false);
            setEditingPo(null);
          }}
          onSuccess={handlePoSuccess}
        />
      )}
    </div>
  );
};

export default PurchaseOrderJasaPage;
