import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MapPin,
  Package,
  Clock,
  CheckCircle,
  Truck,
  Search,
  AlertCircle,
  RefreshCw,
  FileText,
  PackagePlus,
  History
} from 'lucide-react';
import Header from '../components/Header';
import ProjectSelector from '../components/ProjectSelector';
import { useProjects } from '../hooks/useProjects';
import { lapanganService } from '../services/lapanganService';
import { poService } from '../services/poService';
import toast from 'react-hot-toast';
import BulkSuratJalanModal from '../components/BulkSuratJalanModal';
import HabisPakaiModal from '../components/HabisPakaiModal';
import UpdateLapanganModal from '../components/UpdateLapanganModal';
import SuratJalanModal from '../components/SuratJalanModal';

const toInputDate = (val) => {
  if (!val) return '';
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  } catch { return ''; }
};

const hpStatusBadge = (s) => {
  const map = {
    PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    PO_DIBUAT: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    FINANCE_APPROVED: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    ATASAN_APPROVED: 'bg-green-500/10 text-green-400 border-green-500/30',
    REJECTED: 'bg-red-500/10 text-red-400 border-red-500/30',
  };
  return map[s] || 'bg-gray-500/10 text-gray-400 border-gray-500/30';
};

const hpStatusLabel = (s) => {
  const map = {
    PENDING: 'Menunggu Purchasing',
    PO_DIBUAT: 'Menunggu Approve Finance',
    FINANCE_APPROVED: 'Menunggu Atasan',
    ATASAN_APPROVED: 'Completed',
    REJECTED: 'Ditolak',
  };
  return map[s] || s || '-';
};

const fmtNum = (n) => {
  const num = Number(n || 0);
  return isNaN(num) ? '0' : num.toLocaleString('id-ID', { maximumFractionDigits: 2 });
};

const ItemTrackingPage = ({ onNavigate }) => {
  const { projects: projectList, loading: loadingProjects } = useProjects();

  const [projectId, setProjectId] = useState(null);
  const [mrData, setMrData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // State untuk Checklist & Modal
  const [selectedItems, setSelectedItems] = useState([]);
  const [isBulkSJModalOpen, setIsBulkSJModalOpen] = useState(false);

  // State Pembelian Habis Pakai
  const [habisPakaiItem, setHabisPakaiItem] = useState(null);
  const [permintaanHP, setPermintaanHP] = useState([]);
  const [hpTrackingItems, setHpTrackingItems] = useState([]);

  // State Surat Jalan / catatan per baris
  const [sjItem, setSjItem] = useState(null);
  const [lapanganItem, setLapanganItem] = useState(null);

  const project = useMemo(
    () => projectList.find((p) => p.id === projectId),
    [projectList, projectId]
  );

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    try {
      // 1. Fetch Material Requests
      const data = await lapanganService.getMaterialRequests(projectId);
      const mrList = Array.isArray(data) ? data : [];

      // 2. Fetch all POs (filter by project) to check their status
      let poList = [];
      try {
        const pos = await poService.getPOs({ projectId });
        poList = Array.isArray(pos) ? pos : [];
      } catch (e) {
        console.error('Failed to fetch POs', e);
      }

      // 3. Create a map of PO Number to Status
      const poStatusMap = {};
      const poIdMap = {};
      poList.forEach(po => {
        poStatusMap[po.poNumber] = po.status;
        poIdMap[po.poNumber] = po.id;
      });

      // 4. Inject poStatus into the items
      const enrichedMrList = mrList.map(mr => ({
        ...mr,
        items: (mr.items || []).map(item => ({
          ...item,
          poStatus: item.poNumber && item.poNumber !== '-'
            ? (poStatusMap[item.poNumber] || 'UNKNOWN')
            : null,
          poId: item.poNumber ? (poIdMap[item.poNumber] || null) : null
        }))
      }));

      setMrData(enrichedMrList);
      setSelectedItems([]);

      // 5. Ambil PO HABIS_PAKAI yang APPROVED untuk ditampilkan di Item Tracking
      // (item habis pakai tidak punya materialRequestId, jadi tidak muncul dari MR endpoint)
      const hpApprovedPOs = poList.filter(
        po => po.kategoriPO === 'HABIS_PAKAI' && po.status === 'APPROVED'
      );
      const hpItems = [];
      hpApprovedPOs.forEach(po => {
        (po.items || []).forEach(it => {
          hpItems.push({
            id: `hp_${it.id}`,
            itemName: it.description,
            materialName: it.description,
            unit: it.unit || '',
            estimatedVolume: Number(it.qty || 0),
            orderedVolume: Number(it.qty || 0),
            receivedVolume: 0,
            pricePerUnit: Number(it.unitPrice || 0),
            poNumber: po.poNumber,
            poId: po.id,
            poStatus: po.status,
            supplierName: po.supplier?.name || '—',
            groupName: 'HABIS PAKAI',
            jobName: po.alasanHabisPakai || 'Pembelian Habis Pakai',
            isHabisPakai: true,
            sumberPo: po.sumberPo || null,
            alasanHabisPakai: po.alasanHabisPakai || null,
          });
        });
      });
      setHpTrackingItems(hpItems);

      // 6. Ambil permintaan habis pakai proyek ini (riwayat pengajuan lapangan)
      try {
        const hp = await lapanganService.getPermintaanHabisPakai(projectId);
        setPermintaanHP(Array.isArray(hp) ? hp : []);
      } catch (e) {
        console.error('Gagal memuat permintaan habis pakai', e);
        setPermintaanHP([]);
      }
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
    setSelectedItems([]);
    setSearch('');
    setFilterStatus('ALL');
    fetchData();
  }, [fetchData]);

  const allItems = useMemo(() => {
    const result = [];
    mrData.forEach((mr) => {
      (mr.items || []).forEach((item) => {
        // Filter: Hanya ambil data dari PO yang sudah APPROVED
        if (item.poNumber && item.poNumber !== '-' && item.poStatus === 'APPROVED') {
          // Hitung status secara lokal di frontend per poItem
          let localStatus = 'PENDING';
          const rVol = Number((item.receivedVolume || 0).toFixed(4));
          const oVol = Number((item.orderedVolume || 0).toFixed(4));
          
          if (rVol >= oVol && oVol > 0) {
            localStatus = 'COMPLETED';
          } else if (rVol > 0) {
            localStatus = 'PARTIAL';
          }

          if (item.isForceClosed) {
            localStatus = 'COMPLETED';
          }

          result.push({
            ...item,
            status: localStatus
          });
        }
      });
    });

    // Tambahkan item dari PO HABIS_PAKAI yang APPROVED
    // (item habis pakai tidak punya materialRequestId, jadi tidak muncul dari MR endpoint)
    hpTrackingItems.forEach((item) => {
      let localStatus = 'PENDING';
      if (Number((item.receivedVolume || 0).toFixed(4)) >= Number((item.orderedVolume || 0).toFixed(4)) && item.orderedVolume > 0) {
        localStatus = 'COMPLETED';
      } else if ((item.receivedVolume || 0) > 0) {
        localStatus = 'PARTIAL';
      }
      result.push({
        ...item,
        status: localStatus
      });
    });

    return result;
  }, [mrData, hpTrackingItems]);

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchStatus = filterStatus === 'ALL' || item.status === filterStatus;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        (item.itemName || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.description2 || '').toLowerCase().includes(q) ||
        (item.groupName || '').toLowerCase().includes(q) ||
        (item.jobName || '').toLowerCase().includes(q) ||
        (item.supplierName || '').toLowerCase().includes(q) ||
        (item.poNumber || '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [allItems, filterStatus, search]);

  const stats = useMemo(() => ({
    total: allItems.length,
    pending: allItems.filter((i) => i.status === 'PENDING').length,
    partial: allItems.filter((i) => i.status === 'PARTIAL').length,
    completed: allItems.filter((i) => i.status === 'COMPLETED').length,
  }), [allItems]);

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

  // Handler Checklist
  // Sekarang semua items dalam filteredItems sudah pasti dari PO
  const eligibleItems = filteredItems;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Hanya pilih yang PENDING atau PARTIAL (opsional, jika ingin bisa centang COMPLETED juga, hapus filter ini)
      // Kita biarkan user memilih semua item, termasuk COMPLETED jika ada revisi catatan
      setSelectedItems(eligibleItems);
    } else {
      setSelectedItems([]);
    }
  };

  const handleToggleSelect = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#0c0b09] text-[#f2ead9] font-sans">
      <Header />

      <header className="px-5 py-6 md:px-10 border-b border-white/5 bg-[#11100e] sticky top-0 z-40 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <p className="text-[#d4af37] font-bold text-xs uppercase tracking-widest mb-1.5 flex items-center gap-2">
            <MapPin size={14} /> {project?.name ? `Project: ${project.name}` : 'Pelaksanaan Lapangan'}
          </p>
          <h2 className="text-3xl font-extrabold m-0 text-white tracking-tight">Item Tracking</h2>
          <p className="text-[#888] mt-1 text-sm md:text-base">
            Centang barang yang datang dan catat dalam satu Surat Jalan.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full md:w-auto min-w-[300px]">
          <ProjectSelector
            projectId={projectId}
            projectList={projectList}
            loading={loadingProjects}
            onChange={(e) => setProjectId(e.target.value || null)}
          />
          {projectId && (
            <div className="flex gap-2 justify-end">
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-2 bg-white/5 border border-white/10 text-[#aaa] px-4 py-2 rounded-lg text-sm cursor-pointer hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="p-5 md:p-10 max-w-7xl mx-auto">
        {!projectId && (
          <div className="py-20 flex flex-col items-center justify-center text-center bg-white/5 border border-white/10 rounded-2xl">
            <MapPin size={52} className="text-[#d4af37] mb-4 opacity-80" />
            <h3 className="text-xl font-bold text-white mb-2">Pilih Proyek Terlebih Dahulu</h3>
            <p className="text-[#aaa] max-w-md">Pilih proyek dari dropdown di atas untuk memantau penerimaan material.</p>
          </div>
        )}

        {projectId && isLoading && (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-[#d4af37]/20 border-t-[#d4af37] rounded-full animate-spin"></div>
            <p className="text-[#888] mt-4 font-medium">Memuat data material...</p>
          </div>
        )}

        {projectId && !isLoading && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#151a16] border border-[#2e7d32]/30 p-4 rounded-xl flex flex-col">
                <div className="flex items-center gap-2 text-[#4caf50] font-bold text-sm mb-2">
                  <Package size={16} /> Total Item
                </div>
                <div className="text-3xl font-extrabold text-white mb-1">{stats.total}</div>
                <div className="text-xs text-[#888]">Item dari PO yang sudah disetujui</div>
              </div>
              <div className="bg-[#1f1616] border border-[#d32f2f]/30 p-4 rounded-xl flex flex-col">
                <div className="flex items-center gap-2 text-[#f44336] font-bold text-sm mb-2">
                  <Clock size={16} /> Menunggu
                </div>
                <div className="text-3xl font-extrabold text-white mb-1">{stats.pending}</div>
                <div className="text-xs text-[#888]">Belum diproses Finance</div>
              </div>
              <div className="bg-[#121921] border border-[#1976d2]/30 p-4 rounded-xl flex flex-col">
                <div className="flex items-center gap-2 text-[#38bdf8] font-bold text-sm mb-2">
                  <Truck size={16} /> Sebagian
                </div>
                <div className="text-3xl font-extrabold text-white mb-1">{stats.partial}</div>
                <div className="text-xs text-[#888]">Sudah PO, fisik kurang</div>
              </div>
              <div className="bg-[#1f1c11] border border-[#d4af37]/30 p-4 rounded-xl flex flex-col">
                <div className="flex items-center gap-2 text-[#d4af37] font-bold text-sm mb-2">
                  <CheckCircle size={16} /> Selesai
                </div>
                <div className="text-3xl font-extrabold text-white mb-1">{stats.completed}</div>
                <div className="text-xs text-[#888]">Material lengkap diterima</div>
              </div>
            </div>

            {/* Pembelian habis pakai: riwayatnya di halaman sendiri, tidak dicampur material */}
            <div className="bg-[#11100e] border border-white/5 rounded-2xl px-5 py-4 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
              <div>
                <h3 className="m-0 text-base font-bold flex items-center gap-2 text-white">
                  <PackagePlus size={18} className="text-[#d4af37]" />
                  Pembelian Habis Pakai
                </h3>
                <p className="text-[#888] text-sm mt-1 mb-0">
                  Pengajuan tambahan saat barang di PO sudah habis tapi lapangan masih butuh.
                  Riwayatnya dibuka di halaman terpisah.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.('habis-pakai')}
                className="flex items-center gap-2 bg-[#d4af37] text-[#0c0b09] text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#e8c874] transition-colors w-fit shrink-0"
              >
                <History size={16} /> Riwayat Habis Pakai
                {permintaanHP.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-[#0c0b09]/20 text-[10px] font-bold">
                    {permintaanHP.length}
                  </span>
                )}
              </button>
            </div>

            {/* Ringkasan status permintaan habis pakai */}
            {permintaanHP.length > 0 && (
              <div className="bg-[#11100e] border border-white/5 rounded-2xl px-5 py-4 mb-8 shadow-xl">
                <div className="flex items-center gap-2 mb-3 text-white font-bold text-sm">
                  <PackagePlus size={16} className="text-[#d4af37]" />
                  Status Permintaan Habis Pakai
                </div>
                <div className="flex flex-wrap gap-2">
                  {permintaanHP.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col gap-1 px-3 py-2 rounded-lg border bg-[#1a1814] border-[#2a2a2a] text-xs min-w-[240px]"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[#d4af37]">{p.nomor || p.id.slice(0, 8)}</span>
                        <span className="text-white font-semibold">{p.itemName}</span>
                        <span className="text-[#666]">{fmtNum(p.qty)} {p.unit}</span>
                        <span className={`px-2 py-0.5 rounded-full border ${hpStatusBadge(p.status)}`}>
                          {hpStatusLabel(p.status)}
                        </span>
                      </div>
                      {(p.keteranganVolume || p.keteranganHarga) && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {p.keteranganVolume && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                              <AlertCircle size={10} /> Ket. Volume: {p.keteranganVolume}
                            </span>
                          )}
                          {p.keteranganHarga && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1">
                              <AlertCircle size={10} /> Ket. Harga: {p.keteranganHarga}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[#11100e] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-white/5 bg-[#161513] flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="m-0 text-lg font-bold flex items-center gap-2 text-white">
                    <MapPin size={18} className="text-[#d4af37]" />
                    Daftar Material Lapangan
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 sm:flex-none">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                      <input
                        className="w-full sm:w-56 bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder:text-[#666] focus:outline-none focus:border-[#d4af37] transition-colors"
                        placeholder="Cari item, supplier, PO..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                      {[
                        { key: 'ALL', label: 'Semua', n: stats.total },
                        { key: 'PENDING', label: 'Pending', n: stats.pending },
                        { key: 'PARTIAL', label: 'Sebagian', n: stats.partial },
                        { key: 'COMPLETED', label: 'Selesai', n: stats.completed },
                      ].map(({ key, label, n }) => (
                        <button
                          key={key}
                          onClick={() => setFilterStatus(key)}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all border ${filterStatus === key
                            ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37]'
                            : 'border-white/10 bg-white/5 text-[#888] hover:bg-white/10'
                            }`}
                        >
                          {label} ({n})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tombol Terima Barang Terpilih */}
                <div className="pt-2">
                  <button
                    onClick={() => setIsBulkSJModalOpen(true)}
                    disabled={selectedItems.length === 0}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${selectedItems.length > 0
                      ? 'bg-gradient-to-br from-[#d4af37] to-[#a8862a] text-[#0c0b09] shadow-lg shadow-[#d4af37]/20 hover:scale-[1.02]'
                      : 'bg-white/5 text-[#666] border border-white/10 cursor-not-allowed'
                      }`}
                  >
                    <FileText size={16} />
                    Terima Barang Terpilih ({selectedItems.length})
                  </button>
                </div>
              </div>

              {filteredItems.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <AlertCircle size={44} className="text-[#555] mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">Tidak Ada Data</h3>
                  <p className="text-[#aaa]">
                    Tidak ada item yang cocok dengan filter atau pencarian.
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-full">
                    {/* Desktop View */}
                    <div className="hidden lg:block overflow-x-auto pb-4">
                      <table className="w-full text-left border-collapse min-w-[1200px] table-fixed">
                        <thead>
                          <tr className="bg-[#1a1917] border-b border-white/5 text-xs uppercase tracking-wider text-[#888]">
                            <th className="p-4 font-semibold w-[5%] text-center">
                              <input
                                type="checkbox"
                                className="accent-[#d4af37] w-4 h-4 cursor-pointer"
                                checked={eligibleItems.length > 0 && selectedItems.length === eligibleItems.length}
                                onChange={handleSelectAll}
                              />
                            </th>
                            <th className="p-4 font-semibold w-[18%]">Nama Item</th>
                            <th className="p-4 font-semibold w-[16%]">Pekerjaan</th>
                            <th className="p-4 font-semibold w-[8%]">Vol.</th>
                            <th className="p-4 font-semibold w-[14%]">Supplier / PO</th>
                            <th className="p-4 font-semibold w-[9%]">Status</th>
                            <th className="p-4 font-semibold w-[12%]">Tgl. Onsite</th>
                            <th className="p-4 font-semibold w-[18%]">Update Lapangan</th>
                            <th className="p-4 font-semibold w-[10%] text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(grouped).map(([groupName, items]) => (
                            <React.Fragment key={groupName}>
                              <tr className="bg-[#161513]">
                                <td colSpan={9} className="px-4 py-3 border-b border-white/5">
                                  <div className="flex items-center text-[#d4af37] text-xs font-bold uppercase tracking-wider">
                                    <Package size={14} className="mr-2" /> {groupName}
                                  </div>
                                </td>
                              </tr>
                              {items.map((item, idx) => {
                                const isEligible = item.poStatus === 'APPROVED';
                                const isSelected = selectedItems.some(i => i.id === item.id);

                                return (
                                  <tr key={`${item.id}-${idx}`} className={`border-b border-white/5 transition-colors group ${isSelected ? 'bg-[#d4af37]/5' : 'hover:bg-white/[0.02]'}`}>
                                    <td className="p-4 align-top text-center">
                                      <input
                                        type="checkbox"
                                        disabled={!isEligible}
                                        checked={isSelected}
                                        onChange={() => handleToggleSelect(item)}
                                        className="accent-[#d4af37] w-4 h-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                        title={!isEligible ? 'PO belum di-approve' : 'Pilih item'}
                                      />
                                    </td>
                                    <td className="p-4 align-top">
                                      <div className="font-bold text-white text-sm">{item.itemName || '—'}</div>
                                      <div className="text-xs text-[#888] mt-1 line-clamp-1">{item.description}</div>
                                      {!isEligible && (
                                        <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                          <AlertCircle size={12} /> PO Belum Approve
                                        </div>
                                      )}
                                      {item.unit && (
                                        <div className="text-xs text-[#666] mt-1">
                                          Satuan: {item.unit}
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-4 text-xs text-[#999] align-top break-words">
                                      <div className="line-clamp-3" title={item.jobName || '—'}>
                                        {item.jobName || '—'}
                                      </div>
                                    </td>
                                    <td className="p-4 align-top">
                                      <span className="font-mono text-sm bg-white/5 px-2 py-1 rounded text-[#ccc]">
                                        {fmtNum(item.estimatedVolume)}
                                      </span>
                                    </td>
                                    <td className="p-4 align-top">
                                      <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border bg-[#38bdf8]/10 border-[#38bdf8]/20 text-[#38bdf8]`}>
                                        <Truck size={10} />
                                        {item.supplierName || '—'}
                                      </div>
                                      <div className="text-[11px] text-[#666] mt-1.5 font-mono">
                                        {item.poNumber}
                                      </div>
                                    </td>
                                    <td className="p-4 align-top">
                                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase border shadow-sm ${item.status === 'COMPLETED' ? 'bg-gradient-to-br from-[#2e7d32]/20 to-[#2e7d32]/10 text-[#4caf50] border-[#4caf50]/30' :
                                        item.status === 'PARTIAL' ? 'bg-gradient-to-br from-[#d4af37]/20 to-[#d4af37]/10 text-[#d4af37] border-[#d4af37]/30' :
                                          'bg-white/5 text-[#888] border-white/10'
                                        }`}>
                                        {item.status}
                                      </span>
                                    </td>
                                    <td className="p-4 align-top">
                                      {item.tanggalOnsite ? (
                                        <div className="text-sm text-white">{toInputDate(item.tanggalOnsite)}</div>
                                      ) : (
                                        <div className="text-sm text-[#555] italic">Belum ada</div>
                                      )}
                                    </td>
                                    <td className="p-4 align-top">
                                      <div className={`text-sm ${item.catatanRusak ? 'text-white' : 'text-[#555] italic'}`}>
                                        {item.catatanRusak || 'Belum ada catatan'}
                                      </div>
                                    </td>
                                    <td className="p-4 align-top text-center">
                                      <div className="flex flex-col gap-1.5 items-stretch">
                                        {item.poStatus === 'APPROVED' ? (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => setSjItem(item)}
                                              title="Lihat riwayat / upload Surat Jalan"
                                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/30 hover:bg-[#38bdf8]/20 transition-colors"
                                            >
                                              <Truck size={12} /> Surat Jalan
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setLapanganItem(item)}
                                              title="Catatan & tanggal onsite"
                                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white/5 text-[#aaa] border border-white/10 hover:bg-white/10 transition-colors"
                                            >
                                              <MapPin size={12} /> Catatan
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setHabisPakaiItem(item)}
                                              title="Ajukan pembelian habis pakai"
                                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/30 hover:bg-[#d4af37]/20 transition-colors"
                                            >
                                              <PackagePlus size={12} /> Habis Pakai
                                            </button>
                                          </>
                                        ) : (
                                          <span className="text-[11px] text-[#555] italic">—</span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View */}
                    <div className="lg:hidden flex flex-col p-4 gap-4 bg-[#0a0908]">
                      {Object.entries(grouped).map(([groupName, items]) => (
                        <div key={groupName} className="flex flex-col gap-3">
                          <div className="flex items-center gap-2 text-[#d4af37] text-xs font-bold uppercase tracking-wider mb-1 mt-2">
                            <Package size={14} /> {groupName}
                          </div>

                          {items.map((item, idx) => {
                            const isEligible = true; // Semua item sekarang sudah pasti dari PO
                            const isSelected = selectedItems.some(i => i.id === item.id);

                            return (
                              <div key={`${item.id}-${idx}`} className={`border border-white/10 rounded-xl p-4 flex flex-col gap-4 shadow-sm relative overflow-hidden transition-colors ${isSelected ? 'bg-[#d4af37]/5 border-[#d4af37]/50' : 'bg-[#11100e]'}`}>
                                <div className={`absolute top-0 left-0 w-1 h-full ${item.status === 'COMPLETED' ? 'bg-[#4caf50]' :
                                  item.status === 'PARTIAL' ? 'bg-[#d4af37]' : 'bg-[#555]'
                                  }`}></div>

                                <div className="flex justify-between items-start gap-2 pl-2">
                                  <div className="flex items-start gap-3">
                                    <div className="mt-1">
                                      <input
                                        type="checkbox"
                                        disabled={!isEligible}
                                        checked={isSelected}
                                        onChange={() => handleToggleSelect(item)}
                                        className="accent-[#d4af37] w-5 h-5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                      />
                                    </div>
                                    <div>
                                      <h4 className="text-white font-bold text-base m-0">{item.itemName || '—'}</h4>
                                      <p className="text-[#888] text-xs m-0 mt-0.5">{item.jobName || '—'}</p>
                                    </div>
                                  </div>
                                  <span className={`shrink-0 inline-flex px-2 py-1 rounded text-[10px] font-extrabold uppercase border ${item.status === 'COMPLETED' ? 'bg-[#2e7d32]/20 text-[#4caf50] border-[#4caf50]/30' :
                                    item.status === 'PARTIAL' ? 'bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/30' :
                                      'bg-white/5 text-[#888] border-white/10'
                                    }`}>
                                    {item.status}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pl-2 text-sm border-t border-white/5 pt-3">
                                  <div>
                                    <p className="text-[#666] text-xs mb-1">Vol. Butuh</p>
                                    <p className="font-mono text-[#ccc] m-0">{fmtNum(item.estimatedVolume)} {item.unit}</p>
                                  </div>
                                  <div>
                                    <p className="text-[#666] text-xs mb-1">Supplier</p>
                                    <div className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border bg-[#38bdf8]/10 border-[#38bdf8]/20 text-[#38bdf8]`}>
                                      <Truck size={10} />
                                      {item.supplierName || '—'}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2 pl-2 border-t border-white/5 pt-3">
                                  <p className="text-[#666] text-xs mb-0">Update Lapangan</p>
                                  {item.tanggalOnsite ? (
                                    <div className="text-xs text-white">
                                      <span className="text-[#888]">Tgl:</span> {toInputDate(item.tanggalOnsite)}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-[#555] italic">Belum ada Tgl Onsite</div>
                                  )}
                                  <div className={`text-sm mt-1 ${item.catatanRusak ? 'text-white' : 'text-[#555] italic'}`}>
                                    {item.catatanRusak || 'Belum ada catatan...'}
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2 border-t border-white/5 pt-3">
                                  <button
                                    type="button"
                                    disabled={item.poStatus !== 'APPROVED'}
                                    onClick={() => setSjItem(item)}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/30 hover:bg-[#38bdf8]/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <Truck size={14} /> Surat Jalan
                                  </button>
                                  <button
                                    type="button"
                                    disabled={item.poStatus !== 'APPROVED'}
                                    onClick={() => setLapanganItem(item)}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-white/5 text-[#aaa] border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <MapPin size={14} /> Catatan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setHabisPakaiItem(item)}
                                    title="Ajukan pembelian habis pakai"
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/30 hover:bg-[#d4af37]/20 transition-colors"
                                  >
                                    <PackagePlus size={14} /> Habis Pakai
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 md:px-5 md:py-3 text-xs text-[#666] border-t border-white/5 flex items-center gap-2 bg-[#1a1917]">
                    <AlertCircle size={14} className="text-[#38bdf8] shrink-0" />
                    <span className="flex-1">Pilih item untuk mencatat Surat Jalan / penerimaan barang.</span>
                    <span className="hidden sm:inline">Menampilkan <strong className="text-white">{filteredItems.length}</strong> item.</span>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal Surat Jalan Borongan */}
      <BulkSuratJalanModal
        isOpen={isBulkSJModalOpen}
        onClose={() => setIsBulkSJModalOpen(false)}
        items={selectedItems}
        onSuccess={fetchData}
      />

      {/* Modal Surat Jalan per baris (1 barang = 1 Surat Jalan supplier) */}
      <SuratJalanModal
        isOpen={!!sjItem}
        onClose={() => setSjItem(null)}
        item={sjItem}
        onSuccess={fetchData}
      />

      {/* Modal Catatan Lapangan (tanggal onsite + keterangan) */}
      <UpdateLapanganModal
        isOpen={!!lapanganItem}
        onClose={() => setLapanganItem(null)}
        item={lapanganItem}
        onSuccess={fetchData}
      />

      {/* Modal Pembelian Habis Pakai */}
      <HabisPakaiModal
        isOpen={!!habisPakaiItem}
        onClose={() => setHabisPakaiItem(null)}
        projectId={projectId}
        item={habisPakaiItem}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default ItemTrackingPage;
