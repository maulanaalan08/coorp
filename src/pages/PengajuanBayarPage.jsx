import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileInput,
  Search,
  Check,
  X,
  ChevronDown,
  Package,
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  UserCheck,
  Wrench,
  CheckSquare,
  Square,
  TrendingUp,
  Layers,
  ArrowRight,
  Info,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import Header from '../components/Header';
import { purchasingService } from '../services/purchasingService';
import ProjectSelector from '../components/ProjectSelector';
import { projectService } from '../services/projectService';
import { useRabGroups } from '../hooks/useRabGroups';
import toast from 'react-hot-toast';

const fmtRp = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });
const fmtNum = (n) =>
  Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });

const statusBadge = (status) => {
  const map = {
    PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    APPROVED_FINANCE: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    APPROVED: 'bg-green-500/10 text-green-400 border-green-500/30',
    REJECTED: 'bg-red-500/10 text-red-400 border-red-500/30',
  };
  return map[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/30';
};

const statusLabel = (status) => {
  const map = {
    PENDING: 'Menunggu Atasan',
    APPROVED_FINANCE: 'Menunggu Atasan',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
  };
  return map[status] || status || 'PENDING';
};

const FILTER_TABS = [
  { key: 'SEMUA', label: 'Semua PO' },
  { key: 'MATERIAL', label: 'PO Material' },
  { key: 'JASA', label: 'PO Jasa' },
  { key: 'HABIS_PAKAI', label: 'PO Habis Pakai' },
];

const STATUS_TABS = [
  { key: 'MENUNGGU', label: 'Menunggu Atasan' },
  { key: 'DISETUJUI', label: 'Disetujui' },
  { key: 'DITOLAK', label: 'Ditolak' },
  { key: 'SEMUA', label: 'Semua' },
];

const typeLabel = (kategori) => {
  if (kategori === 'HABIS_PAKAI') return 'Habis Pakai';
  if (kategori === 'JASA') return 'Jasa';
  return 'Material';
};

const typeBadge = (kategori) => {
  if (kategori === 'HABIS_PAKAI') return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
  if (kategori === 'JASA') return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
  return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
};

const PengajuanBayarPage = ({ initialProjectId = null }) => {
  const [pengajuanList, setPengajuanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState({});
  const [activeFilter, setActiveFilter] = useState('SEMUA');
  const [activeStatus, setActiveStatus] = useState('MENUNGGU');

  const [projectId, setProjectId] = useState(initialProjectId);
  const [projectList, setProjectList] = useState([]);
  const [approvalTick, setApprovalTick] = useState(0);
  const [busyId, setBusyId] = useState(null);

  // Monitoring Budget State
  const [budgetData, setBudgetData] = useState(null);
  const [loadingBudget, setLoadingBudget] = useState(false);
  const [showOverModal, setShowOverModal] = useState(false);
  const [filterOnlyOver, setFilterOnlyOver] = useState(false);

  // Selection state untuk Checklist di level dokumen tabel utama
  const [selectedIds, setSelectedIds] = useState([]);

  // Decision state untuk Checklist di level item dalam 1 PO (Opsi B)
  // Format: { [pengajuanId]: { [itemId]: { status: 'APPROVED' | 'REJECTED', rejectReason: '' } } }
  const [itemDecisions, setItemDecisions] = useState({});

  const { rabGroups: groups = [] } = useRabGroups(projectId);

  const allRabItems = useMemo(() => {
    const list = [];
    groups.forEach((g) => {
      list.push(...(g.items || []));
      (g.children || []).forEach((c) => {
        list.push(...(c.items || []));
      });
    });
    return list;
  }, [groups]);

  const getRapForJasa = useCallback(
    (it) => {
      return (
        allRabItems.find(
          (r) =>
            r.id === it.rabItemId ||
            String(r.itemName || '').trim().toLowerCase() ===
              String(it.description || '').trim().toLowerCase(),
        ) || null
      );
    },
    [allRabItems],
  );

  const bumpApproval = () => setApprovalTick((t) => t + 1);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await projectService.getAll();
      setProjectList(Array.isArray(data) ? data : data?.data || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchPengajuan = useCallback(async () => {
    if (!projectId) {
      setPengajuanList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await purchasingService.getPengajuanBayar(projectId);
      setPengajuanList(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Gagal memuat data pengajuan bayar');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchBudget = useCallback(async () => {
    if (!projectId) {
      setBudgetData(null);
      return;
    }
    setLoadingBudget(true);
    try {
      const data = await purchasingService.getBudgetMonitoring(projectId);
      setBudgetData(data);
    } catch (err) {
      console.error('Failed to load budget monitoring:', err);
    } finally {
      setLoadingBudget(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchPengajuan();
    fetchBudget();
    setSelectedIds([]);
  }, [fetchPengajuan, fetchBudget, approvalTick]);

  useEffect(() => {
    const onChanged = () => {
      bumpApproval();
      fetchPengajuan();
      fetchBudget();
    };
    window.addEventListener('po-status-changed', onChanged);
    return () => window.removeEventListener('po-status-changed', onChanged);
  }, [fetchPengajuan, fetchBudget]);

  // Set PO yang over budget untuk quick lookup
  const overPoIdSet = useMemo(() => {
    return new Set(budgetData?.overPoIds || []);
  }, [budgetData]);

  const filteredRows = useMemo(() => {
    let list = pengajuanList;

    if (activeFilter === 'MATERIAL') {
      list = list.filter(
        (p) =>
          p.purchaseOrder?.kategoriPO === 'MATERIAL' ||
          !p.purchaseOrder?.kategoriPO,
      );
    } else if (activeFilter === 'JASA') {
      list = list.filter(
        (p) =>
          p.purchaseOrder?.kategoriPO === 'JASA' ||
          !!p.jasaId ||
          !!p.purchaseOrder?.jasaId,
      );
    } else if (activeFilter === 'HABIS_PAKAI') {
      list = list.filter((p) => p.purchaseOrder?.kategoriPO === 'HABIS_PAKAI');
    }

    if (activeStatus === 'MENUNGGU') {
      list = list.filter(
        (p) => p.status === 'APPROVED_FINANCE' || p.status === 'PENDING',
      );
    } else if (activeStatus === 'DISETUJUI') {
      list = list.filter((p) => p.status === 'APPROVED');
    } else if (activeStatus === 'DITOLAK') {
      list = list.filter((p) => p.status === 'REJECTED');
    }

    // Filter khusus: Hanya tampilkan PO yang over budget
    if (filterOnlyOver) {
      list = list.filter((p) => overPoIdSet.has(p.poId || p.purchaseOrder?.id));
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();

    return list.filter((p) => {
      const po = p.purchaseOrder || {};
      const jasaName = p.jasa?.nama || po.jasa?.nama || '';
      const supplierName = p.supplier?.name || po.supplier?.name || '';
      const cocokHeader =
        po.poNumber?.toLowerCase().includes(q) ||
        p.noPengajuan?.toLowerCase().includes(q) ||
        supplierName.toLowerCase().includes(q) ||
        jasaName.toLowerCase().includes(q) ||
        typeLabel(po.kategoriPO).toLowerCase().includes(q);
      const cocokItem = (po.items || []).some((it) =>
        String(it.description || '').toLowerCase().includes(q),
      );
      return cocokHeader || cocokItem;
    });
  }, [pengajuanList, activeFilter, activeStatus, search, filterOnlyOver, overPoIdSet]);

  // Checklist Selection Handlers (Tingkat Dokumen Pengajuan)
  const selectableRows = useMemo(() => {
    return filteredRows.filter(
      (p) => p.status === 'APPROVED_FINANCE' || p.status === 'PENDING',
    );
  }, [filteredRows]);

  const allSelected =
    selectableRows.length > 0 && selectedIds.length === selectableRows.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableRows.map((p) => p.id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const totalSelectedRp = useMemo(() => {
    return pengajuanList
      .filter((p) => selectedIds.includes(p.id))
      .reduce(
        (sum, p) =>
          sum +
          Number(p.totalTagihan || p.purchaseOrder?.grandTotal || p.purchaseOrder?.subTotal || 0),
        0,
      );
  }, [pengajuanList, selectedIds]);

  // Bulk Actions
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Setujui ${selectedIds.length} pengajuan yang dipilih sekaligus (Total ${fmtRp(totalSelectedRp)})?`,
      )
    ) {
      return;
    }
    setBusyId('bulk');
    try {
      const res = await purchasingService.bulkApprovePengajuan(selectedIds);
      toast.success(res.message || `${selectedIds.length} pengajuan disetujui`);
      setSelectedIds([]);
      bumpApproval();
    } catch (err) {
      toast.error(err.message || 'Gagal menyetujui pengajuan secara massal');
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    const reason = window.prompt(
      `Alasan menolak ${selectedIds.length} pengajuan yang dipilih:`,
    );
    if (!reason || !reason.trim()) return;
    setBusyId('bulk');
    try {
      const res = await purchasingService.bulkRejectPengajuan(
        selectedIds,
        reason.trim(),
      );
      toast.success(res.message || `${selectedIds.length} pengajuan ditolak`);
      setSelectedIds([]);
      bumpApproval();
    } catch (err) {
      toast.error(err.message || 'Gagal menolak pengajuan secara massal');
    } finally {
      setBusyId(null);
    }
  };

  // Item-level Decisions (Opsi B)
  const toggleRow = (id) => {
    setExpandedRow((prev) => {
      const nextOpen = !prev[id];
      if (nextOpen && !itemDecisions[id]) {
        const p = pengajuanList.find((x) => x.id === id);
        const items = p?.purchaseOrder?.items || [];
        const initMap = {};
        items.forEach((it) => {
          initMap[it.id] = { status: 'APPROVED', rejectReason: '' };
        });
        setItemDecisions((d) => ({ ...d, [id]: initMap }));
      }
      return { ...prev, [id]: nextOpen };
    });
  };

  const handleItemStatusToggle = (pengajuanId, itemId, newStatus) => {
    setItemDecisions((prev) => ({
      ...prev,
      [pengajuanId]: {
        ...prev[pengajuanId],
        [itemId]: {
          ...(prev[pengajuanId]?.[itemId] || {}),
          status: newStatus,
        },
      },
    }));
  };

  const handleItemReasonChange = (pengajuanId, itemId, reason) => {
    setItemDecisions((prev) => ({
      ...prev,
      [pengajuanId]: {
        ...prev[pengajuanId],
        [itemId]: {
          ...(prev[pengajuanId]?.[itemId] || {}),
          rejectReason: reason,
        },
      },
    }));
  };

  const handleSelectAllItemsInPO = (pengajuan, targetStatus) => {
    const items = pengajuan.purchaseOrder?.items || [];
    const updated = {};
    items.forEach((it) => {
      updated[it.id] = {
        status: targetStatus,
        rejectReason:
          targetStatus === 'REJECTED'
            ? itemDecisions[pengajuan.id]?.[it.id]?.rejectReason || ''
            : '',
      };
    });
    setItemDecisions((prev) => ({
      ...prev,
      [pengajuan.id]: updated,
    }));
  };

  const handleProcessItemDecisions = async (pengajuan) => {
    const decisionsMap = itemDecisions[pengajuan.id] || {};
    const items = pengajuan.purchaseOrder?.items || [];
    const decisions = items.map((it) => ({
      itemId: it.id,
      status: decisionsMap[it.id]?.status || 'APPROVED',
      rejectReason: decisionsMap[it.id]?.rejectReason || '',
    }));

    const rejectedCount = decisions.filter((d) => d.status === 'REJECTED').length;
    const approvedCount = decisions.filter((d) => d.status === 'APPROVED').length;

    let generalRejectReason = '';
    if (approvedCount === 0) {
      generalRejectReason = window.prompt(
        'Semua item ditolak. Masukkan alasan penolakan pengajuan ini:',
      );
      if (!generalRejectReason || !generalRejectReason.trim()) return;
    } else if (rejectedCount > 0) {
      if (
        !window.confirm(
          `Konfirmasi keputusan: ${approvedCount} item disetujui, ${rejectedCount} item ditolak. Lanjutkan?`,
        )
      ) {
        return;
      }
    }

    setBusyId(pengajuan.id);
    try {
      const res = await purchasingService.processItemDecisions(
        pengajuan.id,
        decisions,
        generalRejectReason,
      );
      toast.success(res.message || 'Keputusan berhasil diproses');
      bumpApproval();
    } catch (err) {
      toast.error(err.message || 'Gagal memproses keputusan item');
    } finally {
      setBusyId(null);
    }
  };

  // Single Approve / Reject Fallbacks
  const handleApprovePengajuan = async (pengajuan) => {
    setBusyId(pengajuan.id);
    try {
      await purchasingService.approvePengajuan(pengajuan.id);
      toast.success(`${pengajuan.noPengajuan || pengajuan.id} disetujui`);
      bumpApproval();
    } catch (err) {
      toast.error(err.message || 'Gagal menyetujui pengajuan');
    } finally {
      setBusyId(null);
    }
  };

  const handleRejectPengajuan = async (pengajuan) => {
    const reason = window.prompt(
      `Alasan menolak ${pengajuan.noPengajuan || pengajuan.id}:`,
    );
    if (!reason || !reason.trim()) return;
    setBusyId(pengajuan.id);
    try {
      await purchasingService.rejectPengajuan(pengajuan.id, reason.trim());
      toast.success(`${pengajuan.noPengajuan || pengajuan.id} ditolak`);
      bumpApproval();
    } catch (err) {
      toast.error(err.message || 'Gagal menolak pengajuan');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0b09]">
      <Header />
      <div className="px-5 md:px-10 pb-12">
        {/* Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-[#888] text-xs uppercase tracking-wider mb-1">
              Finance & Purchasing
            </p>
            <h2 className="text-2xl md:text-3xl text-[#f2ead9] font-bold">
              Pengajuan Bayar &amp; Monitoring Anggaran
            </h2>
            <p className="text-[#888] text-sm mt-1">
              Verifikasi dan checklist persetujuan pembayaran PO material/jasa dengan kontrol anggaran RAP real-time.
            </p>
          </div>
        </div>

        {/* Project Selector */}
        <ProjectSelector
          projectId={projectId}
          projectList={projectList}
          loading={false}
          onChange={(e) => {
            setProjectId(e.target.value || null);
            setExpandedRow({});
            setSelectedIds([]);
          }}
        />

        {/* ============================================================== */}
        {/* WIDGET MONITORING ANGGARAN RAP VS PEMESANAN PO                 */}
        {/* ============================================================== */}
        {projectId && budgetData && (
          <div className="mt-6 mb-8 bg-[#14120e] border border-[#2a2a2a] rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#252320]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#d4af37]/10 rounded-lg text-[#d4af37]">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#f2ead9]">
                    Monitoring Anggaran RAP vs Realisasi Pemesanan
                  </h3>
                  <p className="text-xs text-[#888]">
                    Alat dijadikan satu dengan Material • Akumulasi mencakup PO Approved dan Menunggu Atasan
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowOverModal(true)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    budgetData.overItems?.length > 0
                      ? 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20'
                      : 'bg-white/5 border-white/10 text-[#aaa] hover:bg-white/10'
                  }`}
                >
                  <AlertCircle size={14} />
                  Rincian Titik Over ({budgetData.overItems?.length || 0})
                </button>

                <button
                  onClick={() => setFilterOnlyOver(!filterOnlyOver)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    filterOnlyOver
                      ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/20'
                      : 'bg-[#1a1814] text-[#ccc] border-[#333] hover:border-[#d4af37]/50'
                  }`}
                >
                  <SlidersHorizontal size={14} />
                  {filterOnlyOver ? 'Tampilkan Semua PO' : 'Saring PO Over Saja'}
                </button>
              </div>
            </div>

            {/* Grid 3 Cards Monitoring */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              {/* Card 1: Material (Bahan & Alat) */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  budgetData.variance?.materialIsOver
                    ? 'bg-red-950/20 border-red-500/40'
                    : 'bg-[#1a1814] border-[#2a2a2a]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Package size={15} className="text-[#38bdf8]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#aaa]">
                      Material (Bahan + Alat)
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                      budgetData.variance?.materialIsOver
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : 'bg-green-500/10 text-green-400 border-green-500/30'
                    }`}
                  >
                    {budgetData.variance?.materialIsOver ? '🔴 OVER BUDGET' : '🟢 AMAN'}
                  </span>
                </div>

                <div className="space-y-1.5 mt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#888]">Budget RAP:</span>
                    <span className="font-mono text-white font-semibold">
                      {fmtRp(budgetData.rap?.material)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#888]">Dipesan (PO Aktif):</span>
                    <span
                      className={`font-mono font-bold ${
                        budgetData.variance?.materialIsOver
                          ? 'text-red-400'
                          : 'text-white'
                      }`}
                    >
                      {fmtRp(budgetData.ordered?.material)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pt-1.5 border-t border-white/5 font-semibold">
                    <span className="text-[#888]">
                      {budgetData.variance?.materialIsOver ? 'Selisih Over:' : 'Sisa Budget:'}
                    </span>
                    <span
                      className={`font-mono ${
                        budgetData.variance?.materialIsOver
                          ? 'text-red-400 font-bold'
                          : 'text-green-400'
                      }`}
                    >
                      {budgetData.variance?.materialIsOver ? '+' : ''}
                      {fmtRp(budgetData.variance?.materialDiff)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#111] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      budgetData.variance?.materialIsOver
                        ? 'bg-red-500'
                        : 'bg-[#38bdf8]'
                    }`}
                    style={{
                      width: `${Math.min(100, budgetData.variance?.materialPercent || 0)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#666] mt-1">
                  <span>Terpakai</span>
                  <span className="font-mono">
                    {budgetData.variance?.materialPercent?.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Card 2: Jasa (Upah / Tenaga Kerja) */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  budgetData.variance?.jasaIsOver
                    ? 'bg-red-950/20 border-red-500/40'
                    : 'bg-[#1a1814] border-[#2a2a2a]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Wrench size={15} className="text-cyan-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#aaa]">
                      Jasa (Upah Kerja)
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                      budgetData.variance?.jasaIsOver
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : 'bg-green-500/10 text-green-400 border-green-500/30'
                    }`}
                  >
                    {budgetData.variance?.jasaIsOver ? '🔴 OVER BUDGET' : '🟢 AMAN'}
                  </span>
                </div>

                <div className="space-y-1.5 mt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#888]">Budget RAP:</span>
                    <span className="font-mono text-white font-semibold">
                      {fmtRp(budgetData.rap?.jasa)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#888]">Dipesan (PO Aktif):</span>
                    <span
                      className={`font-mono font-bold ${
                        budgetData.variance?.jasaIsOver
                          ? 'text-red-400'
                          : 'text-white'
                      }`}
                    >
                      {fmtRp(budgetData.ordered?.jasa)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pt-1.5 border-t border-white/5 font-semibold">
                    <span className="text-[#888]">
                      {budgetData.variance?.jasaIsOver ? 'Selisih Over:' : 'Sisa Budget:'}
                    </span>
                    <span
                      className={`font-mono ${
                        budgetData.variance?.jasaIsOver
                          ? 'text-red-400 font-bold'
                          : 'text-green-400'
                      }`}
                    >
                      {budgetData.variance?.jasaIsOver ? '+' : ''}
                      {fmtRp(budgetData.variance?.jasaDiff)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#111] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      budgetData.variance?.jasaIsOver ? 'bg-red-500' : 'bg-cyan-400'
                    }`}
                    style={{
                      width: `${Math.min(100, budgetData.variance?.jasaPercent || 0)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#666] mt-1">
                  <span>Terpakai</span>
                  <span className="font-mono">
                    {budgetData.variance?.jasaPercent?.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Card 3: Total Akumulasi Proyek */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  budgetData.variance?.totalIsOver
                    ? 'bg-red-950/20 border-red-500/40'
                    : 'bg-[#1a1814] border-[#2a2a2a]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Layers size={15} className="text-[#d4af37]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#aaa]">
                      Total Anggaran Proyek
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                      budgetData.variance?.totalIsOver
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : 'bg-green-500/10 text-green-400 border-green-500/30'
                    }`}
                  >
                    {budgetData.variance?.totalIsOver
                      ? `🔴 OVER ${fmtRp(budgetData.variance?.totalDiff)}`
                      : '🟢 GLOBAL AMAN'}
                  </span>
                </div>

                <div className="space-y-1.5 mt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#888]">Total RAP:</span>
                    <span className="font-mono text-white font-bold">
                      {fmtRp(budgetData.rap?.total)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#888]">Total Dipesan:</span>
                    <span
                      className={`font-mono font-bold ${
                        budgetData.variance?.totalIsOver
                          ? 'text-red-400'
                          : 'text-[#d4af37]'
                      }`}
                    >
                      {fmtRp(budgetData.ordered?.total)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#777]">
                    <span>• Approved: {fmtRp(budgetData.ordered?.approved)}</span>
                    <span>• Pending: {fmtRp(budgetData.ordered?.pending)}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#111] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      budgetData.variance?.totalIsOver
                        ? 'bg-red-500'
                        : 'bg-gradient-to-r from-[#d4af37] to-amber-500'
                    }`}
                    style={{
                      width: `${Math.min(100, budgetData.variance?.totalPercent || 0)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#666] mt-1">
                  <span>Realisasi Total</span>
                  <span className="font-mono">
                    {budgetData.variance?.totalPercent?.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar & Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-4 items-start md:items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 flex-wrap">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveStatus(tab.key);
                    setExpandedRow({});
                    setSelectedIds([]);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    activeStatus === tab.key
                      ? 'bg-[#d4af37] text-black border-[#d4af37]'
                      : 'bg-[#1a1814] text-[#aaa] border-[#2a2a2a] hover:border-[#d4af37]/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveFilter(tab.key);
                    setExpandedRow({});
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    activeFilter === tab.key
                      ? 'bg-[#4a7c9b] text-white border-[#4a7c9b]'
                      : 'bg-[#1a1814] text-[#aaa] border-[#2a2a2a] hover:border-[#4a7c9b]/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              {/* Quick Filter: Over Budget */}
              <button
                onClick={() => setFilterOnlyOver(!filterOnlyOver)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                  filterOnlyOver
                    ? 'bg-red-500/20 text-red-300 border-red-500'
                    : 'bg-[#1a1814] text-[#888] border-[#2a2a2a] hover:border-red-500/40'
                }`}
              >
                <AlertTriangle size={13} className={filterOnlyOver ? 'text-red-400' : ''} />
                Hanya yang Over ({overPoIdSet.size})
              </button>
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]"
            />
            <input
              type="text"
              placeholder="Cari no PO / no PPB / supplier / jasa / item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1a1814] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#666] focus:border-[#d4af37] outline-none"
            />
          </div>
        </div>

        {/* ============================================================== */}
        {/* FLOATING ACTION BAR: BULK SELECTION (CHECKLIST ATASAN)          */}
        {/* ============================================================== */}
        {selectedIds.length > 0 && (
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-[#201d18] to-[#171512] border border-[#d4af37]/40 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#d4af37]/20 text-[#d4af37] rounded-lg">
                <CheckSquare size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {selectedIds.length} Pengajuan Dipilih
                </p>
                <p className="text-xs text-[#aaa]">
                  Total Nilai Tagihan:{' '}
                  <span className="font-mono text-[#d4af37] font-bold">
                    {fmtRp(totalSelectedRp)}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <button
                disabled={busyId === 'bulk'}
                onClick={handleBulkApprove}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white text-xs md:text-sm font-bold px-4 py-2.5 rounded-lg transition-colors shadow-lg shadow-green-600/20 disabled:opacity-50"
              >
                <Check size={16} /> Setujui Semua yang Dipilih
              </button>

              <button
                disabled={busyId === 'bulk'}
                onClick={handleBulkReject}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs md:text-sm font-bold px-4 py-2.5 rounded-lg transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50"
              >
                <X size={16} /> Tolak yang Dipilih
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-2 text-xs text-[#888] hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TABEL DAFTAR PENGAJUAN BAYAR                                  */}
        {/* ============================================================== */}
        <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-xl">
          <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileInput size={16} className="text-[#d4af37]" />
              <h3 className="text-sm font-bold text-[#f2ead9] uppercase tracking-wider">
                Daftar Pengajuan Bayar
              </h3>
              <span className="text-xs text-[#666]">
                ({filteredRows.length})
              </span>
            </div>

            {selectableRows.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="text-xs font-semibold text-[#d4af37] hover:underline flex items-center gap-1.5"
              >
                {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                {allSelected ? 'Batalkan Semua' : 'Pilih Semua'}
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#22201c] text-[#888] text-left">
                  {/* Checkbox Header */}
                  <th className="px-4 py-3 w-10 text-center">
                    {selectableRows.length > 0 && (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={handleSelectAll}
                        className="rounded bg-[#111] border-[#444] text-[#d4af37] focus:ring-0 cursor-pointer w-4 h-4"
                      />
                    )}
                  </th>
                  <th className="px-2 py-3 font-semibold w-8"></th>
                  <th className="px-4 py-3 font-semibold">No PO / No PPB</th>
                  <th className="px-4 py-3 font-semibold">Jenis</th>
                  <th className="px-4 py-3 font-semibold">Supplier / Jasa</th>
                  <th className="px-4 py-3 font-semibold">Cara Bayar</th>
                  <th className="px-4 py-3 font-semibold">Indikator Budget</th>
                  <th className="px-4 py-3 font-semibold text-right">
                    Total Tagihan
                  </th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-[#888]">
                      Memuat data pengajuan bayar...
                    </td>
                  </tr>
                ) : !projectId ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-[#888]">
                      Pilih proyek dulu untuk melihat data.
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-[#888]">
                      {filterOnlyOver
                        ? 'Tidak ada pengajuan PO yang over budget untuk filter ini.'
                        : 'Tidak ada data pengajuan bayar untuk filter ini.'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((pengajuan) => {
                    const po = pengajuan.purchaseOrder || {};
                    const open = !!expandedRow[pengajuan.id];
                    const status = pengajuan.status || 'PENDING';
                    const isJasa =
                      po.kategoriPO === 'JASA' ||
                      !!pengajuan.jasaId ||
                      !!po.jasaId;
                    const isSelectable =
                      status === 'APPROVED_FINANCE' || status === 'PENDING';
                    const isChecked = selectedIds.includes(pengajuan.id);
                    const isOver = overPoIdSet.has(po.id || pengajuan.poId);

                    // Ambil decisions untuk PO ini
                    const decisionsMap = itemDecisions[pengajuan.id] || {};
                    const poItems = po.items || [];
                    const approvedCount = poItems.filter(
                      (it) => decisionsMap[it.id]?.status !== 'REJECTED',
                    ).length;
                    const rejectedCount = poItems.filter(
                      (it) => decisionsMap[it.id]?.status === 'REJECTED',
                    ).length;

                    // Realtime total yang disetujui untuk PO ini
                    const liveApprovedTotal = poItems
                      .filter((it) => decisionsMap[it.id]?.status !== 'REJECTED')
                      .reduce((sum, it) => sum + Number(it.total || 0), 0);

                    return (
                      <React.Fragment key={pengajuan.id}>
                        <tr
                          className={`border-t border-[#2a2a2a] hover:bg-white/[0.02] transition-colors ${
                            isChecked ? 'bg-[#d4af37]/5' : ''
                          }`}
                        >
                          {/* Checkbox Baris */}
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            {isSelectable ? (
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSelect(pengajuan.id)}
                                className="rounded bg-[#111] border-[#444] text-[#d4af37] focus:ring-0 cursor-pointer w-4 h-4"
                              />
                            ) : (
                              <span className="text-[#444]">-</span>
                            )}
                          </td>

                          {/* Toggle Expand */}
                          <td
                            className="px-2 py-3 text-center text-[#888] cursor-pointer"
                            onClick={() => toggleRow(pengajuan.id)}
                          >
                            <ChevronDown
                              size={16}
                              className={`mx-auto transition-transform ${
                                open ? 'rotate-180 text-[#d4af37]' : ''
                              }`}
                            />
                          </td>

                          {/* No PO */}
                          <td
                            className="px-4 py-3 cursor-pointer"
                            onClick={() => toggleRow(pengajuan.id)}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono text-white font-bold">
                                {po.poNumber ||
                                  `PO-${po.id?.slice(0, 8) || pengajuan.id.slice(0, 8)}`}
                              </span>
                              {pengajuan?.noPengajuan && (
                                <span className="text-[11px] text-[#888] font-mono block">
                                  PPB: {pengajuan.noPengajuan}
                                </span>
                              )}
                              <span className="text-[10px] text-[#888] block mt-0.5">
                                Dibuat: <span className="text-[#d4af37]">{pengajuan.createdBy?.name || po.createdBy?.name || '-'}</span>
                              </span>
                            </div>
                          </td>

                          {/* Jenis */}
                          <td
                            className="px-4 py-3 cursor-pointer"
                            onClick={() => toggleRow(pengajuan.id)}
                          >
                            <span
                              className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${typeBadge(
                                po.kategoriPO,
                              )}`}
                            >
                              {typeLabel(po.kategoriPO)}
                            </span>
                          </td>

                          {/* Supplier / Jasa */}
                          <td
                            className="px-4 py-3 text-[#ccc] cursor-pointer"
                            onClick={() => toggleRow(pengajuan.id)}
                          >
                            <div className="flex items-center gap-1.5">
                              {isJasa ? (
                                <Wrench size={12} className="text-cyan-300 shrink-0" />
                              ) : (
                                <UserCheck size={12} className="text-[#38bdf8] shrink-0" />
                              )}
                              <span>
                                {isJasa
                                  ? pengajuan.jasa?.nama || po.jasa?.nama || '-'
                                  : pengajuan.supplier?.name || po.supplier?.name || '-'}
                              </span>
                            </div>
                          </td>

                          {/* Cara Bayar */}
                          <td
                            className="px-4 py-3 cursor-pointer"
                            onClick={() => toggleRow(pengajuan.id)}
                          >
                            {po.caraPembayaran ? (
                              <span className="text-[11px] bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20 font-semibold">
                                {po.caraPembayaran}
                              </span>
                            ) : (
                              <span className="text-[#555] text-xs">-</span>
                            )}
                          </td>

                          {/* Indikator Budget */}
                          <td
                            className="px-4 py-3 cursor-pointer"
                            onClick={() => toggleRow(pengajuan.id)}
                          >
                            {isOver ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                                <AlertTriangle size={12} /> Over Budget
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                                <Check size={12} /> Sesuai RAP
                              </span>
                            )}
                          </td>

                          {/* Total Tagihan */}
                          <td
                            className="px-4 py-3 text-right text-[#ccc] font-mono cursor-pointer"
                            onClick={() => toggleRow(pengajuan.id)}
                          >
                            <span className="font-bold">
                              {fmtRp(pengajuan.totalTagihan || po.grandTotal)}
                            </span>
                          </td>

                          {/* Status */}
                          <td
                            className="px-4 py-3 text-center cursor-pointer"
                            onClick={() => toggleRow(pengajuan.id)}
                          >
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge(
                                status,
                              )}`}
                            >
                              {statusLabel(status)}
                            </span>
                          </td>
                        </tr>

                        {/* ==================================================== */}
                        {/* EXPANDED ROW: DETAIL ITEM & CHECKLIST APPROVAL ITEM  */}
                        {/* ==================================================== */}
                        {open && (
                          <tr className="border-t border-[#2a2a2a] bg-[#14120e]">
                            <td colSpan={9} className="px-6 py-5">
                              {/* Header Kontrol Item & Checklist All */}
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                  <Package size={16} className="text-[#d4af37]" />
                                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                                    Checklist Keputusan Item PO
                                  </h4>
                                  <span className="text-xs text-[#888]">
                                    ({poItems.length} item)
                                  </span>
                                </div>

                                {/* Jika status Menunggu Atasan: Tampilkan Tombol Cepat Checklist Item */}
                                {isSelectable && (
                                  <div className="flex items-center gap-3">
                                    <div className="text-xs text-[#aaa] flex items-center gap-2">
                                      <span>
                                        Disetujui:{' '}
                                        <b className="text-green-400">
                                          {approvedCount} item ({fmtRp(liveApprovedTotal)})
                                        </b>
                                      </span>
                                      <span>•</span>
                                      <span>
                                        Ditolak:{' '}
                                        <b className="text-red-400">
                                          {rejectedCount} item
                                        </b>
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSelectAllItemsInPO(
                                            pengajuan,
                                            'APPROVED',
                                          )
                                        }
                                        className="px-2.5 py-1 text-xs font-semibold rounded bg-green-500/10 text-green-300 border border-green-500/30 hover:bg-green-500/20 transition-colors"
                                      >
                                        ✓ Centang Semua Approve
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSelectAllItemsInPO(
                                            pengajuan,
                                            'REJECTED',
                                          )
                                        }
                                        className="px-2.5 py-1 text-xs font-semibold rounded bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                                      >
                                        ✗ Centang Semua Reject
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {poItems.length === 0 ? (
                                <p className="text-xs text-[#666] italic py-2">
                                  PO ini belum memiliki item barang/jasa.
                                </p>
                              ) : (
                                <div className="border border-white/10 rounded-xl overflow-x-auto shadow-inner bg-[#0d0c0a]">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-white/[0.04] text-[#888] text-left">
                                        {isSelectable && (
                                          <th className="px-3 py-2.5 font-semibold text-center w-28">
                                            Status Pilihan
                                          </th>
                                        )}
                                        <th className="px-3 py-2.5 font-semibold">
                                          Nama Item & Keterangan
                                        </th>
                                        <th className="px-3 py-2.5 font-semibold text-right">
                                          Qty PO
                                        </th>
                                        <th className="px-3 py-2.5 font-semibold">
                                          Satuan
                                        </th>
                                        <th className="px-3 py-2.5 font-semibold text-right">
                                          Harga PO
                                        </th>
                                        <th className="px-3 py-2.5 font-semibold text-right">
                                          Total Subtotal
                                        </th>
                                        <th className="px-3 py-2.5 font-semibold text-right">
                                          Komp. RAP (Qty / Harga)
                                        </th>
                                        <th className="px-3 py-2.5 font-semibold text-right">
                                          Ket. Over
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {poItems.map((it) => {
                                        const rapData = getRapForJasa(it);
                                        const rapVol =
                                          it.materialRequest?.estimatedVolume ||
                                          it.estimatedVolume ||
                                          rapData?.volume ||
                                          0;
                                        const rapPrice =
                                          it.materialRequest?.pricePerUnit ||
                                          it.pricePerUnit ||
                                          rapData?.rapUnitPrice ||
                                          0;

                                        const isOverH =
                                          rapPrice > 0 &&
                                          Number(it.unitPrice || 0) > rapPrice;
                                        const isOverV =
                                          rapVol > 0 &&
                                          Number(it.qty || 0) > rapVol;

                                        const itemDec =
                                          decisionsMap[it.id] || {
                                            status: 'APPROVED',
                                            rejectReason: '',
                                          };
                                        const isItemApproved =
                                          itemDec.status !== 'REJECTED';

                                        // Status historis jika PO sudah final
                                        const historicalItem = (
                                          pengajuan.items || []
                                        ).find(
                                          (sn) =>
                                            sn.id === it.id ||
                                            sn.description === it.description,
                                        );
                                        const historicalRejected =
                                          historicalItem?.status === 'REJECTED';

                                        return (
                                          <tr
                                            key={it.id}
                                            className={`border-t border-white/5 transition-colors ${
                                              !isItemApproved
                                                ? 'bg-red-950/20'
                                                : isOverH || isOverV
                                                  ? 'bg-amber-950/10'
                                                  : ''
                                            }`}
                                          >
                                            {/* Checklist Tombol Pilihan Item */}
                                            {isSelectable && (
                                              <td className="px-3 py-2 text-center align-middle">
                                                <div className="flex items-center justify-center gap-1">
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleItemStatusToggle(
                                                        pengajuan.id,
                                                        it.id,
                                                        'APPROVED',
                                                      )
                                                    }
                                                    className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                                                      isItemApproved
                                                        ? 'bg-green-600 text-white border-green-500 shadow-sm shadow-green-600/30'
                                                        : 'bg-white/5 text-[#888] border-[#333] hover:border-green-500/50'
                                                    }`}
                                                  >
                                                    Approve
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleItemStatusToggle(
                                                        pengajuan.id,
                                                        it.id,
                                                        'REJECTED',
                                                      )
                                                    }
                                                    className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                                                      !isItemApproved
                                                        ? 'bg-red-600 text-white border-red-500 shadow-sm shadow-red-600/30'
                                                        : 'bg-white/5 text-[#888] border-[#333] hover:border-red-500/50'
                                                    }`}
                                                  >
                                                    Reject
                                                  </button>
                                                </div>
                                              </td>
                                            )}

                                            {/* Deskripsi Item */}
                                            <td className="px-3 py-2 text-white">
                                              <div className="flex items-center gap-1.5">
                                                <Package
                                                  size={12}
                                                  className="text-[#666] shrink-0"
                                                />
                                                <span
                                                  className={`font-semibold ${
                                                    !isItemApproved
                                                      ? 'line-through text-[#888]'
                                                      : ''
                                                  }`}
                                                >
                                                  {it.description || '—'}
                                                </span>

                                                {/* Badge Historis jika sudah final */}
                                                {!isSelectable &&
                                                  (historicalRejected ? (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                                      Ditolak
                                                    </span>
                                                  ) : (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                                                      Disetujui
                                                    </span>
                                                  ))}
                                              </div>

                                              {/* Input Alasan jika di-Reject */}
                                              {isSelectable && !isItemApproved && (
                                                <div className="mt-1.5 flex items-center gap-1.5">
                                                  <input
                                                    type="text"
                                                    placeholder="Alasan tolak item ini (opsional)..."
                                                    value={itemDec.rejectReason || ''}
                                                    onChange={(e) =>
                                                      handleItemReasonChange(
                                                        pengajuan.id,
                                                        it.id,
                                                        e.target.value,
                                                      )
                                                    }
                                                    className="w-full bg-[#1e1c18] border border-red-500/40 rounded px-2 py-1 text-[11px] text-red-200 placeholder:text-red-300/40 outline-none focus:border-red-500"
                                                  />
                                                </div>
                                              )}

                                              {/* Catatan reject historis */}
                                              {!isSelectable &&
                                                historicalRejected &&
                                                historicalItem?.rejectReason && (
                                                  <div className="text-[10px] text-red-400 italic mt-0.5">
                                                    Alasan:{' '}
                                                    {historicalItem.rejectReason}
                                                  </div>
                                                )}
                                            </td>

                                            <td className="px-3 py-2 text-right font-mono text-[#ccc]">
                                              {fmtNum(it.qty || 0)}
                                            </td>
                                            <td className="px-3 py-2 text-[#ccc]">
                                              {it.unit || '-'}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono text-[#ccc]">
                                              {fmtRp(it.unitPrice)}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono text-[#d4af37] font-semibold">
                                              {fmtRp(it.total)}
                                            </td>

                                            {/* Komparasi RAP */}
                                            <td className="px-3 py-2 text-right text-[11px] text-[#888] font-mono">
                                              {rapPrice > 0 ? (
                                                <div>
                                                  <span>{fmtRp(rapPrice)}</span>
                                                  <span className="text-[#555] text-[10px] block">
                                                    Vol: {fmtNum(rapVol)}
                                                  </span>
                                                </div>
                                              ) : (
                                                <span className="text-[#555]">-</span>
                                              )}
                                            </td>

                                            {/* Keterangan Over */}
                                            <td className="px-3 py-2 text-right">
                                              {isOverH || isOverV ? (
                                                <div className="text-[11px] font-semibold text-red-400">
                                                  {isOverH && (
                                                    <span>
                                                      Over Harga +{fmtRp(it.unitPrice - rapPrice)}
                                                    </span>
                                                  )}
                                                  {isOverH && isOverV && <br />}
                                                  {isOverV && (
                                                    <span className="text-orange-400">
                                                      Over Vol +{fmtNum(it.qty - rapVol)}
                                                    </span>
                                                  )}
                                                </div>
                                              ) : (
                                                <span className="text-green-400 text-[11px]">
                                                  Sesuai
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Footer Aksi Eksekusi Keputusan Item */}
                              {isSelectable && (
                                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/5">
                                  <div className="text-xs text-[#888]">
                                    Tagihan setelah disetujui:{' '}
                                    <span className="font-mono text-green-400 font-bold text-sm">
                                      {fmtRp(liveApprovedTotal)}
                                    </span>
                                    {rejectedCount > 0 && (
                                      <span className="text-red-400 ml-2">
                                        ({rejectedCount} item akan ditolak)
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                    <button
                                      disabled={busyId === pengajuan.id}
                                      onClick={() =>
                                        handleProcessItemDecisions(pengajuan)
                                      }
                                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#d4af37] hover:bg-[#c29e2e] text-black text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-[#d4af37]/20 disabled:opacity-50"
                                    >
                                      <Check size={14} /> Proses Keputusan Item Ini
                                    </button>

                                    <button
                                      disabled={busyId === pengajuan.id}
                                      onClick={() =>
                                        handleRejectPengajuan(pengajuan)
                                      }
                                      className="px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/20"
                                    >
                                      Tolak Seluruh PO
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Info Approval jika sudah final */}
                              {status === 'APPROVED' && pengajuan.approvedBy?.name && (
                                <div className="mt-4 text-xs text-[#888] flex items-center gap-2 pt-2 border-t border-white/5">
                                  <UserCheck size={13} className="text-green-400" />
                                  <span>
                                    Disetujui oleh{' '}
                                    <b className="text-white">
                                      {pengajuan.approvedBy?.name}
                                    </b>
                                  </span>
                                  {pengajuan.approvedAt && (
                                    <span className="text-[#666]">
                                      ·{' '}
                                      {new Date(
                                        pengajuan.approvedAt,
                                      ).toLocaleDateString('id-ID', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  )}
                                  {pengajuan.rejectReason && (
                                    <span className="text-amber-400 ml-2">
                                      ({pengajuan.rejectReason})
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL RINCIAN TITIK OVER BUDGET (INSTANT OVERVIEW)             */}
      {/* ============================================================== */}
      {showOverModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#14120e] border border-[#2a2a2a] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#252320] flex items-center justify-between bg-[#191713]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Rincian Seluruh Titik Over Budget Proyek
                  </h3>
                  <p className="text-xs text-[#888]">
                    Daftar item PO yang melebihi patokan harga satuan atau volume RAP proyek
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowOverModal(false)}
                className="p-1.5 rounded-lg text-[#888] hover:text-white hover:bg-white/5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1">
              {budgetData?.overItems?.length === 0 ? (
                <div className="text-center py-12 text-[#888]">
                  <Check size={36} className="mx-auto text-green-400 mb-2" />
                  <p className="text-sm font-semibold text-white">
                    Semua Item Sesuai Anggaran!
                  </p>
                  <p className="text-xs text-[#666] mt-1">
                    Tidak ditemukan item PO yang melebihi estimasi volume maupun harga satuan RAP.
                  </p>
                </div>
              ) : (
                <div className="border border-white/10 rounded-xl overflow-x-auto bg-[#0d0c0a]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-white/[0.04] text-[#888] text-left">
                        <th className="px-3 py-2.5 font-semibold">No PO</th>
                        <th className="px-3 py-2.5 font-semibold">Kategori</th>
                        <th className="px-3 py-2.5 font-semibold">Supplier / Jasa</th>
                        <th className="px-3 py-2.5 font-semibold">Nama Item</th>
                        <th className="px-3 py-2.5 font-semibold text-right">
                          Qty PO / RAP
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-right">
                          Harga PO / RAP
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-right">
                          Estimasi Over
                        </th>
                        <th className="px-3 py-2.5 font-semibold text-center">
                          Penyebab
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgetData?.overItems?.map((it, idx) => (
                        <tr
                          key={idx}
                          className="border-t border-white/5 hover:bg-white/[0.02]"
                        >
                          <td className="px-3 py-2 font-mono text-white font-bold">
                            {it.poNumber}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${typeBadge(
                                it.kategoriPO,
                              )}`}
                            >
                              {typeLabel(it.kategoriPO)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[#ccc]">
                            {it.supplierOrJasa}
                          </td>
                          <td className="px-3 py-2 text-white font-semibold">
                            {it.description}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-[#ccc]">
                            <div>
                              <span>{fmtNum(it.qty)}</span> {it.unit}
                              {it.isOverVol && (
                                <span className="block text-[10px] text-orange-400">
                                  RAP: {fmtNum(it.rapVol)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-[#ccc]">
                            <div>
                              <span>{fmtRp(it.unitPrice)}</span>
                              {it.isOverHarga && (
                                <span className="block text-[10px] text-red-400">
                                  RAP: {fmtRp(it.rapUnitPrice)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-red-400">
                            +{fmtRp(it.nominalOver)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                              {it.isOverHarga && it.isOverVol
                                ? 'Harga & Volume'
                                : it.isOverHarga
                                  ? 'Harga Satuan'
                                  : 'Volume'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#252320] flex items-center justify-between bg-[#191713]">
              <span className="text-xs text-[#888]">
                Ditemukan {budgetData?.overItems?.length || 0} item dengan indikasi over budget.
              </span>
              <button
                onClick={() => {
                  setShowOverModal(false);
                  setFilterOnlyOver(true);
                }}
                className="px-4 py-2 bg-[#d4af37] hover:bg-[#c29e2e] text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                Saring Tabel ke PO Over Ini <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PengajuanBayarPage;
