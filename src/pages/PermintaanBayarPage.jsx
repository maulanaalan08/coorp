import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckSquare,
  Square,
  Check,
  X,
  Search,
  RefreshCw,
  Building2,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileText,
  Landmark,
  Package,
  Wrench,
  UserCheck,
  Info,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import Header from '../components/Header';
import { purchasingService } from '../services/purchasingService';
import toast from 'react-hot-toast';

const fmtRp = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const fmtTgl = (d) =>
  d
    ? new Date(d).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '-';

const PermintaanBayarPage = () => {
  const [pembayarans, setPembayarans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, MATERIAL, JASA
  const [filterStatus, setFilterStatus] = useState('APPROVED_FINANCE'); // Default to awaiting Atasan approval!
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Modal Detail
  const [detailModalItem, setDetailModalItem] = useState(null);

  const fetchPembayarans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await purchasingService.getPembayaranSupplier();
      setPembayarans(Array.isArray(data) ? data : []);
      setSelectedIds([]);
    } catch (err) {
      toast.error('Gagal memuat permintaan bayar: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPembayarans();
  }, [fetchPembayarans]);

  // Statistik KPI
  const stats = useMemo(() => {
    let countMenunggu = 0;
    let nominalMenunggu = 0;
    let countApproved = 0;
    let nominalApproved = 0;
    let countPosted = 0;
    let nominalPosted = 0;
    let countRejected = 0;
    let nominalRejected = 0;

    pembayarans.forEach((p) => {
      const nom = Number(p.jumlahBayar || p.totalTerbayar || p.totalTagihan || 0);
      if (p.isPostedKasBank) {
        countPosted++;
        nominalPosted += nom;
      } else if (p.approvalStatus === 'APPROVED_FINANCE') {
        countMenunggu++;
        nominalMenunggu += nom;
      } else if (p.approvalStatus === 'APPROVED_ATASAN') {
        countApproved++;
        nominalApproved += nom;
      } else if (p.approvalStatus === 'REJECTED') {
        countRejected++;
        nominalRejected += nom;
      }
    });

    return {
      countMenunggu,
      nominalMenunggu,
      countApproved,
      nominalApproved,
      countPosted,
      nominalPosted,
      countRejected,
      nominalRejected,
    };
  }, [pembayarans]);

  // Filter list
  const filteredList = useMemo(() => {
    return pembayarans.filter((p) => {
      const isJasa = Boolean(p.jasaId || p.jasa || p.purchaseOrder?.kategoriPO === 'JASA');
      if (filterType === 'MATERIAL' && isJasa) return false;
      if (filterType === 'JASA' && !isJasa) return false;

      if (filterStatus === 'APPROVED_FINANCE') {
        if (p.isPostedKasBank || p.approvalStatus !== 'APPROVED_FINANCE') return false;
      } else if (filterStatus === 'APPROVED_ATASAN') {
        if (p.isPostedKasBank || p.approvalStatus !== 'APPROVED_ATASAN') return false;
      } else if (filterStatus === 'POSTED') {
        if (!p.isPostedKasBank) return false;
      } else if (filterStatus === 'REJECTED') {
        if (p.approvalStatus !== 'REJECTED') return false;
      } else if (filterStatus === 'MENUNGGU_FINANCE') {
        if (p.isPostedKasBank || p.approvalStatus !== 'MENUNGGU_FINANCE') return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const noPmt = (p.noPembayaran || '').toLowerCase();
        const ket = (p.keterangan || '').toLowerCase();
        const pihak = (p.supplier?.name || p.jasa?.nama || '').toLowerCase();
        const poNum = (p.purchaseOrder?.poNumber || '').toLowerCase();
        const projName = (p.purchaseOrder?.project?.name || '').toLowerCase();
        if (
          !noPmt.includes(q) &&
          !ket.includes(q) &&
          !pihak.includes(q) &&
          !poNum.includes(q) &&
          !projName.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [pembayarans, filterType, filterStatus, search]);

  // Eligible items for bulk approval (status APPROVED_FINANCE and not posted)
  const eligibleBulkIds = useMemo(() => {
    return filteredList
      .filter((p) => !p.isPostedKasBank && p.approvalStatus === 'APPROVED_FINANCE')
      .map((p) => p.id);
  }, [filteredList]);

  const isAllSelected =
    eligibleBulkIds.length > 0 &&
    eligibleBulkIds.every((id) => selectedIds.includes(id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(eligibleBulkIds);
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Single Approve Atasan
  const handleApproveAtasan = async (item) => {
    if (
      !window.confirm(
        `Setujui permintaan bayar invoice ${item.noPembayaran || item.id}? Tombol disbursement kas/bank akan aktif di Pembayaran Finance.`,
      )
    ) {
      return;
    }

    setActionLoadingId(item.id);
    try {
      await purchasingService.approveAtasanPembayaran(item.id);
      toast.success(
        'Permintaan bayar berhasil disetujui! Finance kini dapat mencairkan dana.',
      );
      fetchPembayarans();
    } catch (err) {
      toast.error(err.message || 'Gagal menyetujui permintaan bayar');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Single Reject
  const handleReject = async (item) => {
    const reason = window.prompt(
      `Alasan penolakan permintaan bayar ${item.noPembayaran || item.id}:`,
    );
    if (!reason || !reason.trim()) return;

    setActionLoadingId(item.id);
    try {
      await purchasingService.rejectPembayaran(item.id, reason.trim());
      toast.success('Permintaan bayar ditolak');
      fetchPembayarans();
    } catch (err) {
      toast.error(err.message || 'Gagal menolak permintaan bayar');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Bulk Approve Atasan
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Setujui ${selectedIds.length} permintaan bayar sekaligus? Seluruh invoice yang dipilih akan siap dikirim ke Kas/Bank oleh Finance.`,
      )
    ) {
      return;
    }

    setIsBulkLoading(true);
    try {
      const res = await purchasingService.bulkApproveAtasanPembayaran(selectedIds);
      toast.success(res.message || 'Permintaan bayar massal berhasil disetujui');
      fetchPembayarans();
    } catch (err) {
      toast.error(err.message || 'Gagal menyetujui permintaan bayar massal');
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Bulk Reject
  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    const reason = window.prompt(
      `Alasan penolakan untuk ${selectedIds.length} permintaan bayar yang dipilih:`,
    );
    if (!reason || !reason.trim()) return;

    setIsBulkLoading(true);
    try {
      const res = await purchasingService.bulkRejectPembayaran(
        selectedIds,
        reason.trim(),
      );
      toast.success(res.message || 'Permintaan bayar massal berhasil ditolak');
      fetchPembayarans();
    } catch (err) {
      toast.error(err.message || 'Gagal menolak permintaan bayar massal');
    } finally {
      setIsBulkLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0b09] text-[#f2ead9]">
      <Header />

      <div className="px-5 md:px-10 pb-16">
        {/* Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#888] text-xs uppercase tracking-wider">
                Management Approval
              </span>
              <span className="text-[#555]">•</span>
              <span className="text-[#d4af37] text-xs font-semibold">
                Tingkat 2 (Atasan)
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#f2ead9]">
              Permintaan Bayar (Approval Invoice)
            </h1>
            <p className="text-[#888] text-sm mt-1 max-w-3xl">
              Halaman khusus persetujuan Atasan terhadap tagihan/invoice yang telah
              diverifikasi oleh Finance. Setelah disetujui di sini, tombol pengiriman ke
              Buku Kas/Bank pada halaman Pembayaran Finance akan aktif.
            </p>
          </div>

          <button
            onClick={() => fetchPembayarans()}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#161513] hover:bg-[#1f1d19] border border-[#2a2a2a] hover:border-[#d4af37]/40 text-sm font-medium rounded-xl transition-all self-start md:self-auto"
          >
            <RefreshCw
              size={16}
              className={loading ? 'animate-spin text-[#d4af37]' : 'text-[#888]'}
            />
            <span>Segarkan</span>
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Menunggu Approval Atasan */}
          <div className="bg-[#14120e] border border-blue-500/30 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden bg-gradient-to-br from-[#14120e] to-blue-950/20">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-500" />
            <div className="flex items-center justify-between text-blue-400 text-xs mb-2">
              <span className="font-semibold uppercase tracking-wider">
                Menunggu Approval Atasan
              </span>
              <Clock size={16} className="text-blue-400" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-blue-300">
              {fmtRp(stats.nominalMenunggu)}
            </div>
            <div className="text-[11px] text-blue-400/80 mt-1">
              {stats.countMenunggu} invoice menunggu persetujuan Anda
            </div>
          </div>

          {/* Telah Disetujui Atasan */}
          <div className="bg-[#14120e] border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500" />
            <div className="flex items-center justify-between text-emerald-400 text-xs mb-2">
              <span className="font-semibold uppercase tracking-wider">
                Disetujui (Siap Bayar)
              </span>
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-emerald-300">
              {fmtRp(stats.nominalApproved)}
            </div>
            <div className="text-[11px] text-emerald-400/80 mt-1">
              {stats.countApproved} invoice siap dicairkan Finance
            </div>
          </div>

          {/* Telah Dicairkan ke Kas/Bank */}
          <div className="bg-[#14120e] border border-[#d4af37]/30 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-[#d4af37]" />
            <div className="flex items-center justify-between text-[#d4af37] text-xs mb-2">
              <span className="font-semibold uppercase tracking-wider">
                Tercairkan Kas/Bank
              </span>
              <Landmark size={16} className="text-[#d4af37]" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-[#f2ead9]">
              {fmtRp(stats.nominalPosted)}
            </div>
            <div className="text-[11px] text-[#888] mt-1">
              {stats.countPosted} transaksi sudah dicairkan
            </div>
          </div>

          {/* Ditolak */}
          <div className="bg-[#14120e] border border-red-500/20 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-red-500" />
            <div className="flex items-center justify-between text-red-400 text-xs mb-2">
              <span className="font-semibold uppercase tracking-wider">
                Ditolak
              </span>
              <X size={16} className="text-red-400" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-red-300">
              {fmtRp(stats.nominalRejected)}
            </div>
            <div className="text-[11px] text-red-400/70 mt-1">
              {stats.countRejected} invoice ditolak
            </div>
          </div>
        </div>

        {/* Workflow Info Box */}
        <div className="mb-6 p-3.5 bg-[#161410] border border-[#262420] rounded-xl flex items-start sm:items-center gap-3 text-xs text-[#a8a090]">
          <Info size={18} className="text-[#d4af37] shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1 leading-relaxed">
            <span className="text-[#d4af37] font-semibold">
              Peran Menu Permintaan Bayar:
            </span>{' '}
            Tagihan invoice yang sudah dicek Finance masuk ke sini. Anda dapat menyetujui
            secara satuan atau memilih beberapa tagihan sekaligus menggunakan checklist
            di bawah.
          </div>
        </div>

        {/* Controls: Search, Type Tabs, Status Filter, Bulk Actions */}
        <div className="bg-[#14120e] border border-[#222] rounded-2xl p-4 mb-4 shadow-md flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[260px]">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666]"
            />
            <input
              type="text"
              placeholder="Cari no invoice, pihak, proyek, no PO..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1b1915] border border-[#2a2a2a] focus:border-[#d4af37] rounded-xl text-xs md:text-sm text-white placeholder-[#666] outline-none transition-all"
            />
          </div>

          {/* Filter Type Pills */}
          <div className="flex items-center gap-1.5 bg-[#1b1915] p-1 rounded-xl border border-[#2a2a2a] shrink-0">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterType === 'ALL'
                  ? 'bg-[#d4af37] text-[#0c0b09] font-bold shadow-sm'
                  : 'text-[#888] hover:text-white'
              }`}
            >
              Semua Tipe
            </button>
            <button
              onClick={() => setFilterType('MATERIAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                filterType === 'MATERIAL'
                  ? 'bg-[#d4af37] text-[#0c0b09] font-bold shadow-sm'
                  : 'text-[#888] hover:text-white'
              }`}
            >
              <Package size={13} />
              Material
            </button>
            <button
              onClick={() => setFilterType('JASA')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                filterType === 'JASA'
                  ? 'bg-[#d4af37] text-[#0c0b09] font-bold shadow-sm'
                  : 'text-[#888] hover:text-white'
              }`}
            >
              <Wrench size={13} />
              Jasa
            </button>
          </div>

          {/* Filter Status Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-[#777] hidden sm:inline">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#1b1915] border border-[#2a2a2a] text-xs text-[#f2ead9] rounded-xl px-3 py-2 outline-none focus:border-[#d4af37] cursor-pointer"
            >
              <option value="APPROVED_FINANCE">Menunggu Approval Atasan (Fokus)</option>
              <option value="APPROVED_ATASAN">Sudah Disetujui Atasan</option>
              <option value="POSTED">Sudah Dicairkan ke Kas/Bank</option>
              <option value="REJECTED">Ditolak</option>
              <option value="MENUNGGU_FINANCE">Menunggu Verifikasi Finance</option>
              <option value="ALL">Semua Dokumen</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Bar (muncul jika ada yang dipilih) */}
        {selectedIds.length > 0 && (
          <div className="bg-[#1b1915] border border-[#d4af37]/40 rounded-xl p-3 mb-4 flex items-center justify-between gap-4 shadow-lg animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#f2ead9]">
              <CheckSquare size={16} className="text-[#d4af37]" />
              <span>{selectedIds.length} permintaan bayar dipilih</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={isBulkLoading}
                onClick={handleBulkApprove}
                className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
              >
                <Check size={14} />
                <span>Setujui Semua ({selectedIds.length})</span>
              </button>
              <button
                disabled={isBulkLoading}
                onClick={handleBulkReject}
                className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <X size={14} />
                <span>Tolak yang Dipilih</span>
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs text-[#888] hover:text-white px-2 py-1"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Table List */}
        <div className="bg-[#14120e] border border-[#222] rounded-2xl overflow-hidden shadow-lg">
          {loading ? (
            <div className="p-16 text-center text-[#888] flex flex-col items-center justify-center gap-3">
              <RefreshCw size={24} className="animate-spin text-[#d4af37]" />
              <p className="text-sm">Memuat daftar permintaan bayar...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-16 text-center text-[#888] flex flex-col items-center justify-center gap-2">
              <AlertCircle size={32} className="text-[#555] mb-1" />
              <p className="text-sm font-medium text-[#bbb]">
                Tidak ada permintaan bayar yang perlu diproses pada filter ini.
              </p>
              <p className="text-xs text-[#666]">
                Ubah filter status ke "Semua Dokumen" atau "Sudah Disetujui" untuk melihat riwayat lainnya.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-[#222] bg-[#1a1814] text-[#888] uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-3.5 px-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        title="Pilih Semua yang Menunggu Approval"
                        className="text-[#888] hover:text-white"
                      >
                        {isAllSelected ? (
                          <CheckSquare size={16} className="text-[#d4af37]" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </th>
                    <th className="py-3.5 px-4">No. Dokumen / Tgl</th>
                    <th className="py-3.5 px-4">Tipe &amp; Pihak</th>
                    <th className="py-3.5 px-4">PO / Proyek</th>
                    <th className="py-3.5 px-4">Akun Sumber Dana</th>
                    <th className="py-3.5 px-4 text-right">Nominal Tagihan</th>
                    <th className="py-3.5 px-4">Verifikasi Finance</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Persetujuan Atasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1c18]">
                  {filteredList.map((item) => {
                    const isJasa = Boolean(
                      item.jasaId ||
                        item.jasa ||
                        item.purchaseOrder?.kategoriPO === 'JASA',
                    );
                    const pihakName =
                      item.supplier?.name ||
                      item.jasa?.nama ||
                      item.purchaseOrder?.supplier?.name ||
                      item.purchaseOrder?.jasa?.nama ||
                      '-';
                    const projectName =
                      item.purchaseOrder?.project?.name || '-';
                    const nominal = Number(
                      item.jumlahBayar ||
                        item.totalTerbayar ||
                        item.totalTagihan ||
                        0,
                    );
                    const isPosted = Boolean(item.isPostedKasBank);
                    const approvalStatus = item.approvalStatus;

                    const isMenungguAtasan =
                      !isPosted && approvalStatus === 'APPROVED_FINANCE';
                    const isDisetujuiAtasan =
                      !isPosted && approvalStatus === 'APPROVED_ATASAN';
                    const isRejected = approvalStatus === 'REJECTED';
                    const isMenungguFinance =
                      !isPosted && approvalStatus === 'MENUNGGU_FINANCE';

                    const isSelected = selectedIds.includes(item.id);

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-[#191713] transition-colors ${
                          isSelected ? 'bg-[#1f1c16]' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-3 text-center align-top">
                          {isMenungguAtasan ? (
                            <button
                              type="button"
                              onClick={() => handleToggleRow(item.id)}
                              className="text-[#888] hover:text-white"
                            >
                              {isSelected ? (
                                <CheckSquare size={16} className="text-[#d4af37]" />
                              ) : (
                                <Square size={16} />
                              )}
                            </button>
                          ) : (
                            <span className="text-[#444]">—</span>
                          )}
                        </td>

                        {/* Dokumen & Tgl */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-semibold text-white">
                            {item.noPembayaran || (
                              <span className="text-[#666] italic">
                                Draft Tagihan
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#777] flex items-center gap-1 mt-0.5">
                            <Calendar size={11} />
                            {fmtTgl(item.tanggal)}
                          </div>
                          {item.jatuhTempo && (
                            <div className="text-[10px] text-yellow-500/80 mt-0.5">
                              Jatuh tempo: {fmtTgl(item.jatuhTempo)}
                            </div>
                          )}
                        </td>

                        {/* Tipe & Pihak */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isJasa
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {isJasa ? 'JASA / SUBCON' : 'MATERIAL'}
                            </span>
                          </div>
                          <div className="font-medium text-[#f2ead9]">
                            {pihakName}
                          </div>
                          {item.keterangan && (
                            <div className="text-[11px] text-[#777] line-clamp-1 max-w-[200px] mt-0.5">
                              {item.keterangan}
                            </div>
                          )}
                        </td>

                        {/* PO & Proyek */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-medium text-[#bbb]">
                            {item.purchaseOrder?.poNumber || '-'}
                          </div>
                          <div className="text-[11px] text-[#777]">
                            {projectName}
                          </div>
                        </td>

                        {/* Akun Kas/Bank */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="text-xs text-[#ddd]">
                            {item.rekeningBank
                              ? `${item.rekeningBank.namaRekening} - ${item.rekeningBank.nomorRekening}`
                              : item.tipeAkunKasBank === 'KAS'
                              ? 'Kas Kecil (Tunai)'
                              : 'Bank Transfer'}
                          </div>
                          <div className="text-[10px] text-[#777]">
                            {item.metodeBayar || 'TRANSFER'}
                          </div>
                        </td>

                        {/* Nominal Tagihan */}
                        <td className="py-3.5 px-4 align-top text-right">
                          <div className="font-bold text-white">
                            {fmtRp(nominal)}
                          </div>
                          {Number(item.totalTagihan || 0) > nominal && (
                            <div className="text-[11px] text-[#777]">
                              Total: {fmtRp(item.totalTagihan)}
                            </div>
                          )}
                        </td>

                        {/* Verifikasi Finance */}
                        <td className="py-3.5 px-4 align-top">
                          {item.financeApprovedAt ? (
                            <div className="text-xs text-blue-300 font-medium flex items-center gap-1">
                              <UserCheck size={12} className="text-blue-400" />
                              <span>{item.financeApprovedBy || 'Finance'}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#666]">
                              Belum verifikasi
                            </span>
                          )}
                          {item.financeApprovedAt && (
                            <div className="text-[10px] text-[#777] mt-0.5">
                              {fmtTgl(item.financeApprovedAt)}
                            </div>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 align-top text-center">
                          {isPosted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 size={12} />
                              Tercairkan
                            </span>
                          ) : isMenungguAtasan ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30 animate-pulse">
                              <Clock size={12} />
                              Menunggu Atasan
                            </span>
                          ) : isDisetujuiAtasan ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/40">
                              <Check size={12} />
                              Disetujui Atasan
                            </span>
                          ) : isMenungguFinance ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                              <Clock size={12} />
                              Di Meja Finance
                            </span>
                          ) : isRejected ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                              <X size={12} />
                              Ditolak
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/30">
                              {approvalStatus || 'Draft'}
                            </span>
                          )}
                        </td>

                        {/* Kolom Aksi Atasan */}
                        <td className="py-3.5 px-4 align-top text-center">
                          <div className="flex flex-col gap-1.5 items-center justify-center">
                            {isMenungguAtasan && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  disabled={actionLoadingId === item.id}
                                  onClick={() => handleApproveAtasan(item)}
                                  className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm transition-all disabled:opacity-50"
                                  title="Setujui permintaan bayar ini"
                                >
                                  <Check size={13} />
                                  <span>Setujui</span>
                                </button>
                                <button
                                  disabled={actionLoadingId === item.id}
                                  onClick={() => handleReject(item)}
                                  className="p-1 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 transition-all disabled:opacity-50"
                                  title="Tolak permintaan bayar"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            )}

                            {isDisetujuiAtasan && (
                              <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                                <Check size={12} />
                                <span>Sudah Disetujui</span>
                              </div>
                            )}

                            {isPosted && (
                              <div className="text-[11px] text-[#888] flex items-center gap-1">
                                <CheckCircle2 size={12} className="text-emerald-400" />
                                <span>Kas/Bank Terposting</span>
                              </div>
                            )}

                            <button
                              onClick={() => setDetailModalItem(item)}
                              className="text-[11px] text-[#888] hover:text-[#d4af37] transition-colors mt-0.5"
                            >
                              Detail &amp; Riwayat
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: DETAIL & RIWAYAT PERMINTAAN BAYAR                       */}
      {/* ============================================================== */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14120e] border border-[#2a2a2a] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#252320]">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#d4af37]" />
                <h3 className="text-base font-bold text-white">
                  Rincian Permintaan Bayar
                </h3>
              </div>
              <button
                onClick={() => setDetailModalItem(null)}
                className="text-[#888] hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-[#1b1915] p-3.5 rounded-xl border border-[#252320]">
                <div>
                  <span className="text-[#888] block text-[11px]">No. Dokumen:</span>
                  <span className="font-bold text-white">
                    {detailModalItem.noPembayaran || 'Draft'}
                  </span>
                </div>
                <div>
                  <span className="text-[#888] block text-[11px]">Tanggal:</span>
                  <span className="text-white">
                    {fmtTgl(detailModalItem.tanggal)}
                  </span>
                </div>
                <div>
                  <span className="text-[#888] block text-[11px]">Pihak:</span>
                  <span className="font-medium text-white">
                    {detailModalItem.supplier?.name ||
                      detailModalItem.jasa?.nama ||
                      '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[#888] block text-[11px]">No. PO:</span>
                  <span className="text-[#bbb]">
                    {detailModalItem.purchaseOrder?.poNumber || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[#888] block text-[11px]">Total Tagihan:</span>
                  <span className="font-bold text-[#d4af37]">
                    {fmtRp(detailModalItem.totalTagihan)}
                  </span>
                </div>
                <div>
                  <span className="text-[#888] block text-[11px]">Nominal Diajukan:</span>
                  <span className="font-bold text-emerald-400">
                    {fmtRp(
                      detailModalItem.jumlahBayar ||
                        detailModalItem.totalTerbayar ||
                        detailModalItem.totalTagihan,
                    )}
                  </span>
                </div>
              </div>

              {/* Approval Timeline */}
              <div>
                <h4 className="font-bold text-[#f2ead9] mb-2 text-xs">
                  Riwayat Persetujuan
                </h4>
                <div className="border-l-2 border-[#2a2a2a] pl-4 space-y-3 ml-2">
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#d4af37]" />
                    <div className="font-medium text-white">Invoice Dicatat</div>
                    <div className="text-[11px] text-[#777]">
                      {fmtTgl(detailModalItem.createdAt || detailModalItem.tanggal)}
                    </div>
                  </div>

                  <div className="relative">
                    <div
                      className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${
                        detailModalItem.financeApprovedAt
                          ? 'bg-blue-400'
                          : 'bg-gray-600'
                      }`}
                    />
                    <div className="font-medium text-white">
                      Verifikasi Finance (Tingkat 1)
                    </div>
                    <div className="text-[11px] text-[#777]">
                      {detailModalItem.financeApprovedAt ? (
                        <>
                          Diverifikasi pada {fmtTgl(detailModalItem.financeApprovedAt)}
                          {detailModalItem.financeApprovedBy && (
                            <> oleh {detailModalItem.financeApprovedBy}</>
                          )}
                        </>
                      ) : (
                        <span className="text-yellow-400/80">
                          Menunggu verifikasi Finance
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <div
                      className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${
                        detailModalItem.atasanApprovedAt
                          ? 'bg-emerald-400'
                          : 'bg-gray-600'
                      }`}
                    />
                    <div className="font-medium text-white">
                      Persetujuan Atasan (Tingkat 2)
                    </div>
                    <div className="text-[11px] text-[#777]">
                      {detailModalItem.atasanApprovedAt ? (
                        <>
                          Disetujui pada {fmtTgl(detailModalItem.atasanApprovedAt)}
                          {detailModalItem.atasanApprovedBy && (
                            <> oleh {detailModalItem.atasanApprovedBy}</>
                          )}
                        </>
                      ) : (
                        <span className="text-yellow-400/80">
                          Menunggu persetujuan Anda di halaman ini
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <div
                      className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${
                        detailModalItem.isPostedKasBank
                          ? 'bg-[#d4af37]'
                          : 'bg-gray-600'
                      }`}
                    />
                    <div className="font-medium text-white">
                      Disbursement Kas/Bank
                    </div>
                    <div className="text-[11px] text-[#777]">
                      {detailModalItem.isPostedKasBank ? (
                        <span className="text-emerald-400">
                          Telah diposting ke Buku Kas/Bank
                        </span>
                      ) : (
                        <span className="text-[#888]">
                          Belum dicairkan oleh Finance
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-[#252320] flex justify-end gap-2">
              <button
                onClick={() => setDetailModalItem(null)}
                className="px-4 py-2 bg-[#1f1d19] hover:bg-[#282520] text-white rounded-xl text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermintaanBayarPage;

