import React, { useState, useMemo, useEffect } from 'react';
import { Search, CheckCircle, Printer, ShoppingCart, Plus, Package, Edit, AlertCircle, Info, ChevronRight, Building, Truck, PackagePlus } from 'lucide-react';
import styles from '../styles/PurchaseOrderPage.module.css';
import Header from '../components/Header';
import { usePO } from '../hooks/usePO';
import { useMaterialRequests, useFinanceMaterialRequests } from '../hooks/useMaterialRequests';
import { useProjects } from '../hooks/useProjects';
import ProjectSelector from '../components/ProjectSelector';
import { poService } from '../services/poService';
import PurchaseOrderModal from '../components/PurchaseOrderModal';
import SupplierModal from '../components/SupplierModal';
import POFromRabPanel from '../components/POFromRabPanel';
import toast from 'react-hot-toast';

const fmtRp = (n) =>
  "Rp " + Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

const fmtVol = (n) => {
  const num = Number(n || 0);
  return isNaN(num) ? '0' : parseFloat(num.toFixed(2)).toString();
};

const PurchaseOrderPage = () => {
  const [activeTab, setActiveTab] = useState('buat-po');
  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [editingPo, setEditingPo] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedJobs, setExpandedJobs] = useState({});
  const [expandedPOs, setExpandedPOs] = useState({});
  const [expandedMaterials, setExpandedMaterials] = useState({});

  // State untuk Goods Receipt
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceiptItem, setSelectedReceiptItem] = useState(null);
  const [initialSupplierId, setInitialSupplierId] = useState(null);
  const [hpRefresh, setHpRefresh] = useState(0);
  const [hpContext, setHpContext] = useState(null);

  const { projects: projectList, loading: loadingProjects } = useProjects();
  const { mrItems, loadingMr, refreshMaterialRequests, updateBulkMaterialRequests } = useMaterialRequests(projectId);
  const { requests: financeMRs, loading: loadingFinanceMR, refreshFinanceMR } = useFinanceMaterialRequests();
  const { pos, loading, error, approve, reject, cancelReject, refreshPOs } = usePO();

  // Gabungkan data dari finance endpoint (lebih kaya, split per toko)
  // Filter berdasarkan project yang dipilih
  const financeMrItems = useMemo(() => {
    if (!projectId || !financeMRs.length) return [];
    const matched = financeMRs.find(mr => mr.projectId === projectId);
    return matched ? matched.items || [] : [];
  }, [projectId, financeMRs]);

  const handleApprove = async (id) => {
    toast.promise(approve(id), {
      loading: 'Meng-approve PO...',
      success: 'PO berhasil di-approve!',
      error: 'Gagal menyetujui PO'
    });
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Masukkan alasan penolakan PO:');
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error('Alasan penolakan tidak boleh kosong');
      return;
    }
    toast.promise(reject(id, reason), {
      loading: 'Menolak PO...',
      success: 'PO berhasil ditolak!',
      error: 'Gagal menolak PO'
    });
  };

  const handleCancelReject = async (id) => {
    if (!window.confirm('Yakin ingin membatalkan penolakan PO ini? Status akan kembali menjadi Belum Approve.')) return;
    toast.promise(cancelReject(id), {
      loading: 'Membatalkan penolakan...',
      success: 'Penolakan berhasil dibatalkan!',
      error: 'Gagal membatalkan penolakan'
    });
  };

  const handleConfirmReceipt = async (payload) => {
    await updateBulkMaterialRequests(payload);
    refreshFinanceMR();
  };

  // Refresh saat PO berubah status (approve/reject) agar riwayat PO & kebutuhan material sinkron
  useEffect(() => {
    const onPoChanged = () => {
      refreshPOs();
      refreshMaterialRequests();
      refreshFinanceMR();
    };
    window.addEventListener('po-status-changed', onPoChanged);
    return () => window.removeEventListener('po-status-changed', onPoChanged);
  }, [refreshPOs, refreshMaterialRequests, refreshFinanceMR]);

  const handlePrint = (id) => {
    poService.printPO(id);
  };

  const handleEditPo = (fullPo) => {
    setEditingPo(fullPo);
    setIsPoModalOpen(true);
    // Jika PO yang diedit adalah HABIS_PAKAI, set hpContext agar kategoriPO benar
    if (fullPo.kategoriPO === 'HABIS_PAKAI') {
      setHpContext({
        permintaanHabisPakaiId: fullPo.permintaanHabisPakaiId || null,
        sumberPo: fullPo.sumberPo || null,
        alasanHabisPakai: fullPo.alasanHabisPakai || null,
      });
    } else {
      setHpContext(null);
    }
    setSelectedItems(
      (fullPo.items || []).map((it) => ({
        id: it.id,
        mrItemId: it.mrItemId || null,
        itemName: it.description,
        description: it.description,
        unit: it.unit,
        estimatedVolume: Number(it.qty || 0),
        orderedQty: Number(it.qty || 0),
        pricePerUnit: Number(it.unitPrice || 0),
      }))
    );
  };

  const filteredPOs = useMemo(() => {
    // Filter only non-JASA supplier POs (Bahan & Alat)
    let result = pos.filter(po => {
      const supplierType = po.supplier?.type;
      // Kalau supplier type ada dan JASA, exclude. Kalau tidak ada type, include semua (default)
      return supplierType !== 'JASA';
    });
    if (!search.trim()) return result;
    const query = search.toLowerCase();
    return result.filter(
      (po) =>
        po.poNumber?.toLowerCase().includes(query) ||
        po.supplier?.name?.toLowerCase().includes(query) ||
        po.items?.some(i => i.description?.toLowerCase().includes(query))
    );
  }, [pos, search]);

  // Gunakan data finance MR jika tersedia (lebih kaya, split per toko), fallback ke mrItems
  const displayItemsRaw = financeMrItems.length > 0 ? financeMrItems : mrItems;
  const displayItems = displayItemsRaw.filter(item => item.category !== 'UPAH');
  const hasFinanceData = financeMrItems.length > 0;

  // Grouping 4-level: Grup Pekerjaan → Uraian Pekerjaan → Nama Material → Split Items (Riwayat PO)
  const groupedMrItems = useMemo(() => {
    const groups = {};
    displayItems.forEach(item => {
      let gName = item.groupName || 'Tanpa Group';
      let jName = item.jobName || 'Tanpa Uraian';

      // Ekstrak nama uraian dari nama grup (karena dari backend di join pakai " ▸ ")
      if (gName.includes(' ▸ ')) {
        const parts = gName.split(' ▸ ');
        gName = parts[0];
        jName = parts.slice(1).join(' ▸ ');
      }

      if (!groups[gName]) groups[gName] = {};
      if (!groups[gName][jName]) groups[gName][jName] = {};

      const matKey = item.mrItemId || item.id;
      if (!groups[gName][jName][matKey]) groups[gName][jName][matKey] = [];
      groups[gName][jName][matKey].push(item);
    });
    return groups;
  }, [displayItems]);

  // Helper: cek apakah item sudah terpenuhi (tidak bisa di-PO lagi)
  const isItemFulfilled = (item) => item.status === 'COMPLETED' || item.isForceClosed;

  const isMaterialFulfilled = (matItems) => {
    const first = matItems[0];
    if (isItemFulfilled(first) || first.procurementStatus === 'COMPLETED') return true;

    const tEst = matItems.reduce((sum, curr) => sum + (curr.estimatedVolume || 0), 0);
    const tOrd = matItems.reduce((sum, curr) => sum + (curr.orderedVolume || 0), 0);
    return tEst > 0 && tOrd >= tEst;
  };

  // Reset expanded state saat project berubah
  const handleProjectChange = (e) => {
    setProjectId(e.target.value || null);
    setSelectedItems([]);
    setExpandedGroups({});
    setExpandedJobs({});
    setExpandedPOs({});
    setExpandedMaterials({});
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const toggleJob = (jobKey) => {
    setExpandedJobs(prev => ({ ...prev, [jobKey]: !prev[jobKey] }));
  };

  const togglePO = (poId) => {
    setExpandedPOs(prev => ({ ...prev, [poId]: !prev[poId] }));
  };

  const toggleMaterial = (matKey) => {
    setExpandedMaterials(prev => ({ ...prev, [matKey]: !prev[matKey] }));
  };

  const toggleSelectItem = (item) => {
    if (isItemFulfilled(item)) {
      toast.error(`"${item.itemName}" sudah terpenuhi dan tidak bisa di-PO lagi!`, {
        icon: '🚫',
        duration: 3000,
      });
      return;
    }
    setSelectedItems(prev => {
      const isSelected = prev.some(i => i.id === item.id);
      if (isSelected) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, { ...item, orderedQty: item.orderedVolume || 0 }];
      }
    });
  };

  const handleCreatePoClick = () => {
    if (selectedItems.length === 0) {
      toast.error('Pilih minimal 1 item untuk dibuat PO!');
      return;
    }
    setIsPoModalOpen(true);
  };

  const handlePoSuccess = (res) => {
    setIsPoModalOpen(false);
    setEditingPo(null);
    setSelectedItems([]);
    setInitialSupplierId(null);
    refreshMaterialRequests();
    refreshFinanceMR();
    if (refreshPOs) refreshPOs();
    if (res?.warnings?.length) {
      toast((t) => (
        <div style={{ fontSize: '13px' }}>
          <strong style={{ color: '#fb923c' }}>⚠️ Perhatian</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: '16px' }}>
            {res.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      ), { duration: 6000, icon: null });
    }
  };

  // Buat PO langsung dari tab "Dari RAB per Supplier"
  const handleCreateFromPlan = ({ supplierId, items }) => {
    setSelectedItems(items);
    setInitialSupplierId(supplierId);
    setEditingPo(null);
    setIsPoModalOpen(true);
  };

  // Purchasing buat PO HABIS_PAKAI dari permintaan lapangan
  const handleCreateFromHabisPakai = (row) => {
    setHpContext({
      permintaanHabisPakaiId: row.id,
      sumberPo: row.poId || null, // ID PO induk (bukan string 'HABIS_PAKAI')
      alasanHabisPakai: row.alasan || null,
    });
    setSelectedItems([
      {
        id: `php_${row.id}`,
        // Habis pakai bukan bagian sisa MR — jangan kena validasi sisa kebutuhan
        mrItemId: null,
        itemName: row.itemName,
        description: row.itemName,
        unit: row.unit,
        estimatedVolume: Number(row.qty || 0),
        orderedQty: 0,
        pricePerUnit: 0,
      },
    ]);
    setInitialSupplierId(null);
    setEditingPo(null);
    setIsPoModalOpen(true);
  };

  const resetPoModal = () => {
    setIsPoModalOpen(false);
    setEditingPo(null);
    setInitialSupplierId(null);
    setHpContext(null);
  };

  return (
    <div className={styles.poWrapper}>
      <Header />

      <header className={styles.financeHeader}>
        <div className={styles.headerMain}>
          <p className={styles.eyebrow}>Purchase Orders</p>
          <h2 className={styles.title}>Manajemen PO</h2>
          <p className={styles.subtitle}>Kelola pembuatan PO dari material request dan riwayat PO.</p>
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
            <Package size={16} /> Buat PO Material
          </button>

          <button
            className={`${styles.tabBtn} ${activeTab === 'dari-rab' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('dari-rab')}
          >
            <ShoppingCart size={16} /> Dari RAB
          </button>

          <button
            className={`${styles.tabBtn} ${activeTab === 'manage-supplier' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('manage-supplier')}
          >
            <Building size={16} /> Supplier
          </button>
        </div>

        {activeTab === 'dari-rab' && (
          <div className={styles.tabContent}>
            <POFromRabPanel projectId={projectId} onCreatePO={handleCreateFromPlan} />
          </div>
        )}

        {activeTab === 'buat-po' && (
          <div className={styles.tabContent}>
            <div className={styles.toolbar}>
              <div>
                <h3 className={styles.sectionTitle}>Daftar Kebutuhan Material</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>
                  Klik grup untuk expand. Centang item yang belum terpenuhi untuk dibuat Surat PO.
                </p>
              </div>
              <button
                className={styles.createPoBtn}
                onClick={handleCreatePoClick}
                style={selectedItems.length === 0 ? { opacity: 0.5 } : {}}
              >
                <Plus size={16} /> Buat PO ({selectedItems.length} item dipilih)
              </button>
            </div>

            {!projectId ? (
              <div className={styles.emptyState}>
                <Package size={48} className={styles.emptyIcon} />
                <h3>Pilih Project Terlebih Dahulu</h3>
                <p>Gunakan dropdown di pojok kanan atas untuk memilih project dan melihat kebutuhan materialnya.</p>
              </div>
            ) : (loadingMr || loadingFinanceMR) ? (
              <div className={styles.emptyState}>
                <p>⏳ Memuat kebutuhan material...</p>
              </div>
            ) : displayItems.length === 0 ? (
              <div className={styles.emptyState}>
                <Package size={48} className={styles.emptyIcon} />
                <h3>Tidak Ada Material Request</h3>
                <p>Belum ada kebutuhan material yang terdaftar untuk project ini.</p>
              </div>
            ) : (
              <div className={styles.mrGroups}>
                {/* ===== TABEL UTAMA ===== */}
                <div className={styles.tableSection}>
                  <div className={styles.tableWrapper}>
                    <table className={styles.poTable}>
                      <thead>
                        <tr>
                          <th style={{ width: '36px' }} />
                          <th>NAMA GRUP / PEKERJAAN</th>
                          <th style={{ textAlign: 'center' }}>TOTAL ITEM</th>
                          <th style={{ textAlign: 'center' }}>TERPENUHI</th>
                          <th style={{ minWidth: '160px' }}>PROGRES GRUP</th>
                          <th style={{ textAlign: 'center' }}>DIPILIH</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(groupedMrItems).map(([groupName, jobsObj]) => {
                          const isGroupOpen = !!expandedGroups[groupName];

                          // Flatten material unik untuk stats
                          const allGroupMaterials = Object.values(jobsObj).flatMap(matObj => Object.values(matObj));
                          const gCompleted = allGroupMaterials.filter(matItems => isMaterialFulfilled(matItems)).length;
                          const gTotal = allGroupMaterials.length;
                          // Hitung selected berdasarkan 'sisa' item
                          const gSelected = allGroupMaterials.filter(matItems => {
                            const sisaItem = matItems.find(i => i.poItemId === null || i.supplierName === '⏳ Belum di-PO') || matItems[0];
                            return selectedItems.some(s => s.id === sisaItem.id);
                          }).length;
                          const gPct = gTotal > 0 ? (gCompleted / gTotal) * 100 : 0;

                          return (
                            <React.Fragment key={groupName}>
                              {/* ══ LEVEL 1: GRUP PEKERJAAN ══ */}
                              <tr className={styles.groupRow} onClick={() => toggleGroup(groupName)}>
                                <td style={{ textAlign: 'center', padding: '14px 8px' }}>
                                  <ChevronRight size={16} style={{
                                    color: '#d4af37',
                                    transform: isGroupOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease',
                                  }} />
                                </td>
                                <td><span className={styles.groupRowName}>{groupName}</span></td>
                                <td style={{ textAlign: 'center', color: '#888' }}>{gTotal}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className={`${styles.statusBadge} ${gCompleted === gTotal && gTotal > 0 ? styles.statusApproved
                                    : gCompleted > 0 ? styles.statusPending
                                      : styles.statusNone
                                    }`}>{gCompleted}/{gTotal}</span>
                                </td>
                                <td>
                                  <div className={styles.progressWrap}>
                                    <div className={styles.progressBar}>
                                      <div className={styles.progressFill} style={{
                                        width: `${gPct}%`,
                                        background: gPct >= 100 ? '#22c55e' : gPct > 0 ? '#eab308' : '#333',
                                      }} />
                                    </div>
                                    <span className={styles.progressPct}>{Math.round(gPct)}%</span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {gSelected > 0 && <span className={styles.selectedCountBadge}>{gSelected} dipilih</span>}
                                </td>
                              </tr>

                              {/* ══ LEVEL 2: URAIAN PEKERJAAN ══ */}
                              {isGroupOpen && Object.entries(jobsObj).map(([jobName, matObj]) => {
                                const jobKey = `${groupName}::${jobName}`;
                                const isJobOpen = !!expandedJobs[jobKey];

                                const allJobMaterials = Object.values(matObj);
                                const jCompleted = allJobMaterials.filter(matItems => isMaterialFulfilled(matItems)).length;
                                const jTotal = allJobMaterials.length;
                                const jSelected = allJobMaterials.filter(matItems => {
                                  const sisaItem = matItems.find(i => i.poItemId === null || i.supplierName === '⏳ Belum di-PO') || matItems[0];
                                  return selectedItems.some(s => s.id === sisaItem.id);
                                }).length;
                                const jPct = jTotal > 0 ? (jCompleted / jTotal) * 100 : 0;

                                return (
                                  <React.Fragment key={jobKey}>
                                    <tr className={styles.jobRow} onClick={() => toggleJob(jobKey)}>
                                      <td style={{ textAlign: 'center', padding: '11px 8px' }}>
                                        <ChevronRight size={14} style={{
                                          color: '#60a5fa',
                                          transform: isJobOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                                          transition: 'transform 0.2s ease',
                                          marginLeft: '18px',
                                        }} />
                                      </td>
                                      <td>
                                        <span className={styles.jobRowName}>
                                          <span style={{ color: '#444', marginRight: '8px' }}>└</span>
                                          {jobName}
                                        </span>
                                      </td>
                                      <td style={{ textAlign: 'center', color: '#666', fontSize: '12px' }}>{jTotal}</td>
                                      <td style={{ textAlign: 'center' }}>
                                        <span className={`${styles.statusBadge} ${jCompleted === jTotal && jTotal > 0 ? styles.statusApproved
                                          : jCompleted > 0 ? styles.statusPending
                                            : styles.statusNone
                                          }`} style={{ fontSize: '10px', padding: '3px 8px' }}>
                                          {jCompleted}/{jTotal}
                                        </span>
                                      </td>
                                      <td>
                                        <div className={styles.progressWrap}>
                                          <div className={styles.progressBar}>
                                            <div className={styles.progressFill} style={{
                                              width: `${jPct}%`,
                                              background: jPct >= 100 ? '#22c55e' : jPct > 0 ? '#eab308' : '#333',
                                            }} />
                                          </div>
                                          <span className={styles.progressPct}>{Math.round(jPct)}%</span>
                                        </div>
                                      </td>
                                      <td style={{ textAlign: 'center' }}>
                                        {jSelected > 0 && <span className={styles.selectedCountBadge} style={{ fontSize: '10px' }}>{jSelected} dipilih</span>}
                                      </td>
                                    </tr>

                                    {/* ══ LEVEL 3: NAMA MATERIAL (sub-table) ══ */}
                                    {isJobOpen && (
                                      <tr>
                                        <td colSpan={6} style={{ padding: 0, background: 'rgba(0,0,0,0.2)' }}>
                                          <div className={styles.materialTableWrapper}>
                                            <table className={styles.subTable}>
                                              <thead>
                                                <tr>
                                                  <th style={{ width: '40px', textAlign: 'center' }}>PILIH</th>
                                                  <th>NAMA MATERIAL</th>
                                                  <th>SAT.</th>
                                                  <th className={styles.cellRight}>EST. VOL</th>
                                                  <th className={styles.cellRight}>VOL. DIPESAN</th>
                                                  <th className={styles.cellRight}>VOL. DITERIMA</th>
                                                  <th style={{ minWidth: '120px' }}>SISA BUTUH</th>
                                                  <th className={styles.cellRight}>HARGA/SAT</th>
                                                  <th style={{ textAlign: 'center' }}>STATUS</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {Object.entries(matObj).map(([matKey, matItems]) => {
                                                  const isMatOpen = !!expandedMaterials[matKey];
                                                  const firstItem = matItems[0];

                                                  // Hitung total dari seluruh split item
                                                  const totalEstVol = firstItem.estimatedVolume || 0;
                                                  const totalOrdered = matItems.reduce((sum, curr) => sum + (curr.orderedVolume || 0), 0);
                                                  const totalReceivedVol = matItems.reduce((sum, curr) => sum + (curr.receivedVolume || 0), 0);
                                                  const pct = totalEstVol > 0 ? Math.min((totalOrdered / totalEstVol) * 100, 100) : 0;
                                                  const fulfilled = isMaterialFulfilled(matItems);

                                                  // Ambil item sisa (belum di-PO) untuk menjadi target checkbox
                                                  const sisaItem = matItems.find(i => i.poItemId === null || i.supplierName === '⏳ Belum di-PO') || firstItem;
                                                  const isSelected = selectedItems.some(i => i.id === sisaItem.id);

                                                  const poItemsOnly = matItems.filter(i => i.poNumber && i.poNumber !== '-');
                                                  const hasPOs = poItemsOnly.length > 0;

                                                  const isFullyOrdered = totalOrdered >= totalEstVol && totalEstVol > 0;
                                                  const isCompleted = firstItem.procurementStatus === 'COMPLETED' || firstItem.isForceClosed || firstItem.status === 'COMPLETED';

                                                  let statusLabel = 'PENDING';
                                                  let showUpdateBtn = false;
                                                  let statusClass = styles.statusNone;

                                                  const allPOs = poItemsOnly.map(poI => pos.find(p => p.poNumber === poI.poNumber)).filter(Boolean);
                                                  const hasUnapprovedPO = allPOs.length > 0 && allPOs.some(po => !(po.status === 'APPROVED' || po.status === 'approve' || po.status === 'Approved'));

                                                  if (isCompleted) {
                                                    statusLabel = 'COMPLETED';
                                                    statusClass = styles.statusApproved;
                                                    showUpdateBtn = false;
                                                  } else if (isFullyOrdered) {
                                                    if (hasUnapprovedPO) {
                                                      statusLabel = 'Menunggu Approval PO';
                                                      statusClass = styles.statusPending;
                                                      showUpdateBtn = false;
                                                    } else {
                                                      const totalReceived = matItems.reduce((sum, curr) => sum + (curr.receivedVolume || 0), 0);
                                                      if (totalEstVol > 0 && totalReceived >= totalEstVol) {
                                                        statusLabel = 'COMPLETED';
                                                        statusClass = styles.statusApproved;
                                                      } else {
                                                        statusLabel = 'PARTIAL (PO Approved)';
                                                        statusClass = styles.statusPending;
                                                      }
                                                      showUpdateBtn = false;
                                                    }
                                                  } else if (totalOrdered > 0) {
                                                    if (hasUnapprovedPO) {
                                                      statusLabel = 'PARTIAL (Belum Approve)';
                                                    } else {
                                                      statusLabel = 'PARTIAL (PO Approved)';
                                                    }
                                                    statusClass = styles.statusPending;
                                                    showUpdateBtn = false;
                                                  }

                                                  return (
                                                    <React.Fragment key={matKey}>
                                                      <tr
                                                        className={fulfilled ? styles.rowCompleted : isSelected ? styles.selectedRow : styles.subItemRow}
                                                        title={fulfilled ? 'Material ini sudah terpenuhi' : ''}
                                                      >
                                                        <td style={{ textAlign: 'center' }}>
                                                          {fulfilled ? (
                                                            <span className={styles.fulfilledIcon}>
                                                              <CheckCircle size={15} style={{ color: '#22c55e' }} />
                                                            </span>
                                                          ) : (
                                                            <input
                                                              type="checkbox"
                                                              checked={isSelected}
                                                              onChange={() => toggleSelectItem(sisaItem)}
                                                              className={styles.checkbox}
                                                              onClick={e => e.stopPropagation()}
                                                            />
                                                          )}
                                                        </td>
                                                        <td
                                                          onClick={() => hasPOs && toggleMaterial(matKey)}
                                                          style={{ cursor: hasPOs ? 'pointer' : 'default' }}
                                                        >
                                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {hasPOs ? (
                                                              <ChevronRight size={14} style={{
                                                                color: '#a78bfa',
                                                                transform: isMatOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                                                                transition: 'transform 0.2s ease',
                                                              }} />
                                                            ) : (
                                                              <div style={{ width: '14px' }}></div>
                                                            )}
                                                            <span style={{ color: fulfilled ? '#555' : '#ddd', fontSize: '13px' }}>
                                                              {firstItem.itemName}
                                                            </span>
                                                          </div>
                                                        </td>
                                                        <td style={{ color: '#666', fontSize: '12px' }}>{firstItem.unit}</td>
                                                        <td className={`${styles.cellMono} ${styles.cellRight}`}>{fmtVol(totalEstVol)}</td>
                                                        <td className={`${styles.cellMono} ${styles.cellRight}`}
                                                          style={{ color: fulfilled ? '#22c55e' : totalOrdered > 0 ? '#eab308' : '#555' }}
                                                        >
                                                          {fmtVol(totalOrdered)}
                                                        </td>
                                                        <td className={`${styles.cellMono} ${styles.cellRight}`}
                                                          style={{ color: totalReceivedVol > 0 ? (totalReceivedVol >= totalOrdered && totalOrdered > 0 ? '#22c55e' : '#38bdf8') : '#555' }}
                                                          title={`Diterima ${fmtVol(totalReceivedVol)} dari ${fmtVol(totalOrdered)} dipesan`}
                                                        >
                                                          {fmtVol(totalReceivedVol)}
                                                        </td>
                                                        <td>
                                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                              <span style={{ fontSize: '13px', color: (totalEstVol - totalOrdered) > 0 ? '#fb923c' : '#22c55e', fontWeight: '600' }}>
                                                                {(totalEstVol - totalOrdered) > 0 ? `${fmtVol(totalEstVol - totalOrdered)} ${firstItem.unit}` : 'Terpenuhi'}
                                                              </span>
                                                              <span style={{ fontSize: '11px', color: '#888' }}>{Math.round(pct)}%</span>
                                                            </div>
                                                            <div className={styles.progressBar} style={{ height: '4px', minWidth: '100px', margin: 0 }}>
                                                              <div className={styles.progressFill} style={{
                                                                width: `${pct}%`,
                                                                background: pct >= 100 ? '#22c55e' : pct > 0 ? '#eab308' : '#333',
                                                              }} />
                                                            </div>
                                                          </div>
                                                        </td>
                                                        <td className={`${styles.cellMono} ${styles.cellRight}`}>{fmtRp(firstItem.pricePerUnit)}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                            <span className={`${styles.statusBadge} ${statusClass}`}>{statusLabel}</span>

                                                            {showUpdateBtn && (
                                                              <button
                                                                onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  setSelectedReceiptItem(matItems);
                                                                  setReceiptModalOpen(true);
                                                                }}
                                                                style={{
                                                                  fontSize: '10px',
                                                                  padding: '4px 8px',
                                                                  backgroundColor: '#10b981',
                                                                  color: 'white',
                                                                  border: 'none',
                                                                  borderRadius: '4px',
                                                                  cursor: 'pointer',
                                                                  whiteSpace: 'nowrap'
                                                                }}
                                                              >
                                                                Update Penerimaan
                                                              </button>
                                                            )}
                                                          </div>
                                                        </td>
                                                      </tr>

                                                      {/* ══ LEVEL 4: RIWAYAT PO MATERIAL ══ */}
                                                      {isMatOpen && hasPOs && (
                                                        <tr>
                                                          <td colSpan={9} style={{ padding: 0, background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <div style={{ padding: '12px 16px 16px 72px' }}>
                                                              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#a78bfa', fontWeight: '500' }}>Riwayat Pemesanan (PO)</h4>
                                                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                                <thead>
                                                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                                                    <th style={{ textAlign: 'left', padding: '6px', fontSize: '11px', color: '#888' }}>NO. PO</th>
                                                                    <th style={{ textAlign: 'left', padding: '6px', fontSize: '11px', color: '#888' }}>TGL PO</th>
                                                                    <th style={{ textAlign: 'left', padding: '6px', fontSize: '11px', color: '#888' }}>SUPPLIER</th>
                                                                    <th style={{ textAlign: 'left', padding: '6px', fontSize: '11px', color: '#888' }}>CARA BAYAR</th>
                                                                    <th style={{ textAlign: 'right', padding: '6px', fontSize: '11px', color: '#888' }}>QTY DIPESAN</th>
                                                                    <th style={{ textAlign: 'right', padding: '6px', fontSize: '11px', color: '#888' }}>QTY DITERIMA</th>
                                                                    <th style={{ textAlign: 'left', padding: '6px', fontSize: '11px', color: '#ef4444' }}>KET. VOLUME</th>
                                                                    <th style={{ textAlign: 'left', padding: '6px', fontSize: '11px', color: '#f97316' }}>KET. HARGA</th>
                                                                    <th style={{ textAlign: 'center', padding: '6px', fontSize: '11px', color: '#888' }}>AKSI</th>
                                                                  </tr>
                                                                </thead>
                                                                <tbody>
                                                                  {poItemsOnly.map(poI => {
                                                                    const fullPo = pos.find(p => p.poNumber === poI.poNumber);
                                                                    const statusClass =
                                                                      fullPo?.status === 'APPROVED' ? styles.statusApproved :
                                                                      fullPo?.status === 'REJECTED' ? styles.statusRejected :
                                                                      fullPo?.status === 'MENUNGGU_ATASAN' ? styles.statusPending :
                                                                      styles.statusNone;
                                                                    const statusLabel =
                                                                      fullPo?.status === 'APPROVED' ? 'Approved' :
                                                                      fullPo?.status === 'REJECTED' ? 'Rejected' :
                                                                      fullPo?.status === 'MENUNGGU_ATASAN' ? 'Menunggu Atasan' :
                                                                      'Belum Approve';

                                                                    const fullPoItem = fullPo?.items?.find(i => i.id === poI.poItemId);

                                                                    return (
                                                                      <React.Fragment key={poI.id}>
                                                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                          <td className={styles.cellMono} style={{ padding: '6px', fontSize: '12px', color: '#60a5fa' }}>{poI.poNumber}</td>
                                                                          <td style={{ padding: '6px', fontSize: '12px', color: '#ccc' }}>{fullPo?.tanggal ? new Date(fullPo.tanggal).toLocaleDateString('id-ID') : '-'}</td>
                                                                          <td style={{ padding: '6px', fontSize: '12px', color: '#ccc' }}>{poI.supplierName}</td>
                                                                          <td style={{ padding: '6px', fontSize: '12px' }}>
                                                                            {fullPo?.caraPembayaran ? (
                                                                              <span style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, border: '1px solid rgba(59,130,246,0.3)' }}>
                                                                                {fullPo.caraPembayaran}
                                                                              </span>
                                                                            ) : '-'}
                                                                          </td>
                                                                          <td className={styles.cellMono} style={{ padding: '6px', fontSize: '12px', textAlign: 'right', color: '#eab308' }}>{fmtVol(poI.orderedVolume)} {poI.unit}</td>
                                                                          <td className={styles.cellMono} style={{ padding: '6px', fontSize: '12px', textAlign: 'right', color: (poI.receivedVolume || 0) > 0 ? ((poI.receivedVolume || 0) >= (poI.orderedVolume || 0) ? '#22c55e' : '#38bdf8') : '#555' }}>{fmtVol(poI.receivedVolume || 0)} {poI.unit}</td>
                                                                          <td style={{ padding: '6px', fontSize: '11px', color: '#ef4444', maxWidth: '120px' }}>
                                                                            {(() => {
                                                                              if (totalEstVol <= 0) return <span style={{ color: '#444' }}>-</span>;
                                                                              const diffVol = totalOrdered - totalEstVol;
                                                                              if (diffVol > 0) return <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={10} style={{ shrink: 0 }} />Over-volume +{fmtVol(diffVol)}</span>;
                                                                              if (diffVol < 0) return <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}><AlertCircle size={10} style={{ shrink: 0 }} />Under-volume {fmtVol(diffVol)}</span>;
                                                                              return <span style={{ color: '#22c55e' }}>Sesuai RAP</span>;
                                                                            })()}
                                                                          </td>
                                                                          <td style={{ padding: '6px', fontSize: '11px', color: '#f97316', maxWidth: '120px' }}>
                                                                            {(() => {
                                                                              if (!firstItem.pricePerUnit || fullPoItem?.unitPrice == null) return <span style={{ color: '#444' }}>-</span>;
                                                                              const estP = Number(firstItem.pricePerUnit);
                                                                              const curP = Number(fullPoItem.unitPrice);
                                                                              const diffP = curP - estP;
                                                                              if (diffP > 0) return <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={10} style={{ shrink: 0 }} />Over-price +{fmtRp(diffP)}</span>;
                                                                              if (diffP < 0) return <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}><AlertCircle size={10} style={{ shrink: 0 }} />Under-price {fmtRp(diffP)}</span>;
                                                                              return <span style={{ color: '#22c55e' }}>Sesuai RAP</span>;
                                                                            })()}
                                                                          </td>
                                                                          <td style={{ padding: '6px', textAlign: 'center' }}>
                                                                            {fullPo ? (
                                                                              <div className={styles.actionCell} style={{ justifyContent: 'center' }}>
                                                                                <span className={`${styles.statusBadge} ${statusClass}`}>{statusLabel}</span>
                                                                                <button
                                                                                  className={styles.printBtn}
                                                                                  onClick={(e) => { e.stopPropagation(); handlePrint(fullPo.id); }}
                                                                                  title="Cetak PDF"
                                                                                >
                                                                                  <Printer size={14} />
                                                                                </button>
                                                                                {(fullPo?.status === 'REJECTED' || fullPo?.status === 'BELUM_APPROVE') && (
                                                                                  <button
                                                                                    className={styles.printBtn}
                                                                                    onClick={(e) => { e.stopPropagation(); handleEditPo(fullPo); }}
                                                                                    title="Edit PO"
                                                                                  >
                                                                                    <Edit size={14} />
                                                                                  </button>
                                                                                )}
                                                                              </div>
                                                                            ) : (
                                                                              <span style={{ fontSize: '11px', color: '#666' }}>-</span>
                                                                            )}
                                                                          </td>
                                                                        </tr>
                                                                        {fullPo?.status === 'REJECTED' && fullPo.rejectReason && (
                                                                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                            <td colSpan={9} style={{ padding: '4px 6px', fontSize: '11px', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                                                                              <AlertCircle size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                                                                              <strong>Alasan Penolakan:</strong> {fullPo.rejectReason}
                                                                            </td>
                                                                          </tr>
                                                                        )}
                                                                      </React.Fragment>
                                                                    )
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
              </div>
            )}
          </div>
        )}



        {activeTab === 'manage-supplier' && (
          <div className={styles.tabContent}>
            <SupplierModal isInline={true} />
          </div>
        )}
      </main>

      {(isPoModalOpen || editingPo) && (
        <PurchaseOrderModal
          selectedItems={selectedItems}
          projectId={projectId}
          editingPo={editingPo}
          initialSupplierId={initialSupplierId}
          kategoriPO={hpContext ? 'HABIS_PAKAI' : 'MATERIAL'}
          masterMode="supplier"
          sumberPo={hpContext?.sumberPo || null}
          alasanHabisPakai={hpContext?.alasanHabisPakai || null}
          permintaanHabisPakaiId={hpContext?.permintaanHabisPakaiId || null}
          onClose={resetPoModal}
          onSuccess={() => {
            handlePoSuccess();
            setHpRefresh((v) => v + 1);
          }}
        />
      )}

      {receiptModalOpen && (
        <PurchaseOrderModal
          receiptItems={selectedReceiptItem}
          onConfirmReceipt={handleConfirmReceipt}
          onClose={() => {
            setReceiptModalOpen(false);
            setSelectedReceiptItem(null);
          }}
          onSuccess={() => { }}
        />
      )}
    </div>
  );
};

export default PurchaseOrderPage;
