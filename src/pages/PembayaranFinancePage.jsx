import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Landmark,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  X,
  Check,
  Building2,
  Wrench,
  Package,
  Calendar,
  Wallet,
  ArrowRight,
  TrendingUp,
  FileText,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Info,
} from 'lucide-react';
import Header from '../components/Header';
import { purchasingService } from '../services/purchasingService';
import glBankService from '../services/glBankService';
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

const PembayaranFinancePage = () => {
  const [pembayarans, setPembayarans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, MATERIAL, JASA
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, MENUNGGU_FINANCE, APPROVED_FINANCE, APPROVED_ATASAN, POSTED, REJECTED

  const [rekeningBanks, setRekeningBanks] = useState([]);
  const [tipeRekeningList, setTipeRekeningList] = useState([]);

  // Modal Kirim Kas/Bank
  const [isPostingModalOpen, setIsPostingModalOpen] = useState(false);
  const [selectedPembayaran, setSelectedPembayaran] = useState(null);
  const [postingData, setPostingData] = useState({
    nominal: '',
    rekeningBankId: '',
    tipeRekeningId: '',
    tipeAkunKasBank: 'BANK',
    tanggalBayar: new Date().toISOString().split('T')[0],
    keterangan: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Detail Modal
  const [detailModalItem, setDetailModalItem] = useState(null);

  const fetchPembayarans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await purchasingService.getPembayaranSupplier();
      setPembayarans(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Gagal memuat data pembayaran finance: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMasters = useCallback(async () => {
    try {
      const [rekeningRes, tipeRekeningRes] = await Promise.all([
        glBankService.getRekeningBank({ activeOnly: 1 }),
        glBankService.getTipeRekening({ isActive: 1 }),
      ]);
      setRekeningBanks(Array.isArray(rekeningRes?.data) ? rekeningRes.data : []);
      setTipeRekeningList(
        Array.isArray(tipeRekeningRes?.data) ? tipeRekeningRes.data : [],
      );
    } catch (err) {
      console.error('Gagal memuat master rekening:', err);
    }
  }, []);

  useEffect(() => {
    fetchPembayarans();
    fetchMasters();
  }, [fetchPembayarans, fetchMasters]);

  // Statistik KPI
  const stats = useMemo(() => {
    let totalNominal = 0;
    let countMenungguFinance = 0;
    let nominalMenungguFinance = 0;
    let countMenungguAtasan = 0;
    let nominalMenungguAtasan = 0;
    let countSiapKirim = 0;
    let nominalSiapKirim = 0;
    let countPosted = 0;
    let nominalPosted = 0;

    pembayarans.forEach((p) => {
      const nom = Number(p.jumlahBayar || p.totalTerbayar || p.totalTagihan || 0);
      totalNominal += nom;

      if (p.isPostedKasBank) {
        countPosted++;
        nominalPosted += nom;
      } else if (p.approvalStatus === 'MENUNGGU_FINANCE') {
        countMenungguFinance++;
        nominalMenungguFinance += nom;
      } else if (p.approvalStatus === 'APPROVED_FINANCE') {
        countMenungguAtasan++;
        nominalMenungguAtasan += nom;
      } else if (p.approvalStatus === 'APPROVED_ATASAN') {
        countSiapKirim++;
        nominalSiapKirim += nom;
      }
    });

    return {
      totalNominal,
      countMenungguFinance,
      nominalMenungguFinance,
      countMenungguAtasan,
      nominalMenungguAtasan,
      countSiapKirim,
      nominalSiapKirim,
      countPosted,
      nominalPosted,
    };
  }, [pembayarans]);

  // Filtering list
  const filteredList = useMemo(() => {
    return pembayarans.filter((p) => {
      const isJasa = Boolean(p.jasaId || p.jasa || p.purchaseOrder?.kategoriPO === 'JASA');
      if (filterType === 'MATERIAL' && isJasa) return false;
      if (filterType === 'JASA' && !isJasa) return false;

      if (filterStatus === 'MENUNGGU_FINANCE') {
        if (p.isPostedKasBank || p.approvalStatus !== 'MENUNGGU_FINANCE') return false;
      } else if (filterStatus === 'APPROVED_FINANCE') {
        if (p.isPostedKasBank || p.approvalStatus !== 'APPROVED_FINANCE') return false;
      } else if (filterStatus === 'APPROVED_ATASAN') {
        if (p.isPostedKasBank || p.approvalStatus !== 'APPROVED_ATASAN') return false;
      } else if (filterStatus === 'POSTED') {
        if (!p.isPostedKasBank) return false;
      } else if (filterStatus === 'REJECTED') {
        if (p.approvalStatus !== 'REJECTED') return false;
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

  // Aksi Approve Finance
  const handleApproveFinance = async (item) => {
    if (
      !window.confirm(
        `Setujui tagihan ${item.noPembayaran || item.id} untuk diteruskan ke Permintaan Bayar Atasan?`,
      )
    ) {
      return;
    }

    setActionLoadingId(item.id);
    try {
      await purchasingService.approveFinancePembayaran(item.id);
      toast.success(
        'Tagihan disetujui Finance. Menunggu approval Atasan di Permintaan Bayar.',
      );
      fetchPembayarans();
    } catch (err) {
      toast.error(err.message || 'Gagal menyetujui pembayaran');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Aksi Tolak
  const handleReject = async (item) => {
    const reason = window.prompt(
      `Alasan menolak tagihan ${item.noPembayaran || item.id}:`,
    );
    if (!reason || !reason.trim()) return;

    setActionLoadingId(item.id);
    try {
      await purchasingService.rejectPembayaran(item.id, reason.trim());
      toast.success('Tagihan berhasil ditolak');
      fetchPembayarans();
    } catch (err) {
      toast.error(err.message || 'Gagal menolak tagihan');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Buka Modal Posting Kas/Bank
  const handleOpenPostingModal = (item) => {
    setSelectedPembayaran(item);
    const nominal =
      item.jumlahBayar ||
      (item.sisaBayar > 0 ? item.sisaBayar : item.totalTagihan) ||
      0;

    setPostingData({
      nominal: String(nominal),
      rekeningBankId: item.rekeningBankId || '',
      tipeRekeningId: item.tipeRekeningId || item.rekeningBank?.tipeRekeningId || '',
      tipeAkunKasBank: item.tipeAkunKasBank || (item.rekeningBankId ? 'BANK' : 'KAS'),
      tanggalBayar: new Date().toISOString().split('T')[0],
      keterangan: item.keterangan || '',
    });
    setIsPostingModalOpen(true);
  };

  // Submit Posting Kas/Bank
  const handleSubmitPosting = async (e) => {
    e.preventDefault();
    if (!selectedPembayaran) return;

    const nom = Number(String(postingData.nominal).replace(/\D/g, '') || 0);
    if (nom <= 0) {
      toast.error('Nominal bayar harus lebih dari 0');
      return;
    }

    setIsSubmitting(true);
    try {
      await purchasingService.kirimKasBankPembayaran(selectedPembayaran.id, {
        nominal: nom,
        rekeningBankId: postingData.rekeningBankId || null,
        tipeRekeningId: postingData.tipeRekeningId || null,
        tipeAkunKasBank: postingData.tipeAkunKasBank,
        tanggalBayar: postingData.tanggalBayar,
        keterangan: postingData.keterangan,
      });

      toast.success(
        'Pembayaran berhasil dikirim dan diposting ke Buku Kas/Bank!',
      );
      setIsPostingModalOpen(false);
      setSelectedPembayaran(null);
      fetchPembayarans();
    } catch (err) {
      toast.error(err.message || 'Gagal mengirim pembayaran ke Kas/Bank');
    } finally {
      setIsSubmitting(false);
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
                Finance &amp; Treasury
              </span>
              <span className="text-[#555]">•</span>
              <span className="text-[#d4af37] text-xs font-semibold">
                Multi-Tier Approval
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#f2ead9]">
              Pembayaran Finance
            </h1>
            <p className="text-[#888] text-sm mt-1 max-w-3xl">
              Antrean verifikasi pembayaran tagihan invoice material &amp; jasa.
              Tagihan diverifikasi Finance, divalidasi Atasan pada Permintaan
              Bayar, lalu tombol disbursement Kas/Bank aktif.
            </p>
          </div>

          <button
            onClick={() => fetchPembayarans()}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#161513] hover:bg-[#1f1d19] border border-[#2a2a2a] hover:border-[#d4af37]/40 text-sm font-medium rounded-xl transition-all self-start md:self-auto"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-[#d4af37]' : 'text-[#888]'} />
            <span>Segarkan Data</span>
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
          {/* Total Tagihan */}
          <div className="bg-[#14120e] border border-[#262420] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-[#888] text-xs mb-2">
              <span>Total Tagihan Masuk</span>
              <DollarSign size={16} className="text-[#d4af37]" />
            </div>
            <div className="text-lg md:text-xl font-bold text-[#f2ead9]">
              {fmtRp(stats.totalNominal)}
            </div>
            <div className="text-[11px] text-[#666] mt-1">
              {pembayarans.length} dokumen invoice tercatat
            </div>
          </div>

          {/* Menunggu Approve Finance */}
          <div className="bg-[#14120e] border border-yellow-500/20 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-yellow-500" />
            <div className="flex items-center justify-between text-yellow-400/90 text-xs mb-2">
              <span className="font-medium">Menunggu Finance</span>
              <Clock size={16} className="text-yellow-400" />
            </div>
            <div className="text-lg md:text-xl font-bold text-yellow-300">
              {fmtRp(stats.nominalMenungguFinance)}
            </div>
            <div className="text-[11px] text-yellow-500/70 mt-1">
              {stats.countMenungguFinance} tagihan perlu approve Finance
            </div>
          </div>

          {/* Menunggu Approval Atasan */}
          <div className="bg-[#14120e] border border-blue-500/20 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-500" />
            <div className="flex items-center justify-between text-blue-400/90 text-xs mb-2">
              <span className="font-medium">Menunggu Atasan</span>
              <Building2 size={16} className="text-blue-400" />
            </div>
            <div className="text-lg md:text-xl font-bold text-blue-300">
              {fmtRp(stats.nominalMenungguAtasan)}
            </div>
            <div className="text-[11px] text-blue-400/70 mt-1">
              {stats.countMenungguAtasan} tagihan di Permintaan Bayar
            </div>
          </div>

          {/* Siap Kirim ke Kas/Bank */}
          <div className="bg-[#14120e] border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden bg-gradient-to-br from-[#14120e] to-emerald-950/20">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500" />
            <div className="flex items-center justify-between text-emerald-400 text-xs mb-2">
              <span className="font-medium">Siap Kirim Kas/Bank</span>
              <Send size={16} className="text-emerald-400" />
            </div>
            <div className="text-lg md:text-xl font-bold text-emerald-300">
              {fmtRp(stats.nominalSiapKirim)}
            </div>
            <div className="text-[11px] text-emerald-400/80 mt-1">
              {stats.countSiapKirim} disetujui Atasan (Siap bayar)
            </div>
          </div>

          {/* Terkirim ke Kas/Bank */}
          <div className="bg-[#14120e] border border-[#d4af37]/30 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-[#d4af37]" />
            <div className="flex items-center justify-between text-[#d4af37] text-xs mb-2">
              <span className="font-medium">Terkirim Kas/Bank</span>
              <CheckCircle2 size={16} className="text-[#d4af37]" />
            </div>
            <div className="text-lg md:text-xl font-bold text-[#f2ead9]">
              {fmtRp(stats.nominalPosted)}
            </div>
            <div className="text-[11px] text-[#888] mt-1">
              {stats.countPosted} diposting ke Buku Kas/Bank
            </div>
          </div>
        </div>

        {/* Workflow Info Box */}
        <div className="mb-6 p-3.5 bg-[#161410] border border-[#262420] rounded-xl flex items-start sm:items-center gap-3 text-xs text-[#a8a090]">
          <Info size={18} className="text-[#d4af37] shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1 leading-relaxed">
            <span className="text-[#d4af37] font-semibold">Alur Persetujuan Pembayaran:</span>{' '}
            Tagihan dicatat di menu <strong>Invoice Supplier</strong> / <strong>Invoice Jasa</strong> &rarr; Masuk ke antrean di sini &rarr; Finance klik <strong>[Approve Finance]</strong> &rarr; Atasan menyetujui pada menu <strong>Permintaan Bayar</strong> &rarr; Tombol <strong>[Kirim ke Buku Kas/Bank]</strong> otomatis aktif untuk disbursement.
          </div>
        </div>

        {/* Controls: Search, Type Tabs, Status Filter */}
        <div className="bg-[#14120e] border border-[#222] rounded-2xl p-4 mb-6 shadow-md flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[260px]">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666]"
            />
            <input
              type="text"
              placeholder="Cari no pembayaran, pihak, proyek, no PO..."
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
              <option value="ALL">Semua Status</option>
              <option value="MENUNGGU_FINANCE">Menunggu Approve Finance</option>
              <option value="APPROVED_FINANCE">Menunggu Approval Atasan</option>
              <option value="APPROVED_ATASAN">Disetujui Atasan (Siap Kirim)</option>
              <option value="POSTED">Terkirim ke Kas/Bank</option>
              <option value="REJECTED">Ditolak</option>
            </select>
          </div>
        </div>

        {/* Table List */}
        <div className="bg-[#14120e] border border-[#222] rounded-2xl overflow-hidden shadow-lg">
          {loading ? (
            <div className="p-16 text-center text-[#888] flex flex-col items-center justify-center gap-3">
              <RefreshCw size={24} className="animate-spin text-[#d4af37]" />
              <p className="text-sm">Memuat data pembayaran finance...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-16 text-center text-[#888] flex flex-col items-center justify-center gap-2">
              <AlertCircle size={32} className="text-[#555] mb-1" />
              <p className="text-sm font-medium text-[#bbb]">
                Tidak ada data pembayaran yang sesuai kriteria.
              </p>
              <p className="text-xs text-[#666]">
                Coba sesuaikan pencarian atau filter status di atas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-[#222] bg-[#1a1814] text-[#888] uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-3.5 px-4">No. Dokumen / Tgl</th>
                    <th className="py-3.5 px-4">Tipe &amp; Pihak</th>
                    <th className="py-3.5 px-4">PO / Proyek</th>
                    <th className="py-3.5 px-4">Akun Kas/Bank</th>
                    <th className="py-3.5 px-4 text-right">Nominal Tagihan</th>
                    <th className="py-3.5 px-4 text-center">Status Approval</th>
                    <th className="py-3.5 px-4 text-center">Aksi Disbursement</th>
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

                    const isMenungguFinance =
                      !isPosted && approvalStatus === 'MENUNGGU_FINANCE';
                    const isMenungguAtasan =
                      !isPosted && approvalStatus === 'APPROVED_FINANCE';
                    const isSiapKirim =
                      !isPosted && approvalStatus === 'APPROVED_ATASAN';
                    const isRejected = approvalStatus === 'REJECTED';

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-[#191713] transition-colors"
                      >
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
                            Metode: {item.metodeBayar || 'TRANSFER'}
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

                        {/* Status Approval */}
                        <td className="py-3.5 px-4 align-top text-center">
                          {isPosted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 size={12} />
                              Terkirim ke Kas/Bank
                            </span>
                          ) : isMenungguFinance ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                              <Clock size={12} />
                              Menunggu Approve Finance
                            </span>
                          ) : isMenungguAtasan ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                              <Clock size={12} />
                              Menunggu Approval Atasan
                            </span>
                          ) : isSiapKirim ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/40">
                              <Check size={12} />
                              Disetujui Atasan (Siap Kirim)
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

                          {/* Approval Stamp Details */}
                          {item.financeApprovedAt && (
                            <div className="text-[10px] text-[#666] mt-1">
                              Finance: {fmtTgl(item.financeApprovedAt)}
                            </div>
                          )}
                          {item.atasanApprovedAt && (
                            <div className="text-[10px] text-[#666]">
                              Atasan: {fmtTgl(item.atasanApprovedAt)}
                            </div>
                          )}
                        </td>

                        {/* Aksi Disbursement */}
                        <td className="py-3.5 px-4 align-top text-center">
                          <div className="flex flex-col gap-1.5 items-center justify-center">
                            {/* Tombol Approve Finance (Tingkat 1) */}
                            {isMenungguFinance && (
                              <div className="flex items-center gap-1">
                                <button
                                  disabled={actionLoadingId === item.id}
                                  onClick={() => handleApproveFinance(item)}
                                  className="px-2.5 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 hover:text-yellow-200 border border-yellow-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                                  title="Approve tagihan ini dan teruskan ke inbox Atasan"
                                >
                                  <Check size={12} />
                                  <span>Approve Finance</span>
                                </button>
                                <button
                                  disabled={actionLoadingId === item.id}
                                  onClick={() => handleReject(item)}
                                  className="p-1 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 transition-all disabled:opacity-50"
                                  title="Tolak tagihan"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            )}

                            {/* Tombol Kirim ke Buku Kas/Bank */}
                            {isPosted ? (
                              <div className="text-[11px] text-emerald-400/80 font-medium flex items-center gap-1">
                                <CheckCircle2 size={13} />
                                <span>Sudah Diposting</span>
                              </div>
                            ) : isSiapKirim ? (
                              <button
                                onClick={() => handleOpenPostingModal(item)}
                                className="px-3 py-1.5 bg-gradient-to-r from-[#d4af37] to-[#a8862a] hover:from-[#e5bd3d] hover:to-[#b89433] text-[#0c0b09] font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/30 transition-all transform active:scale-95"
                                title="Kirim & posting pengeluaran ini ke Buku Kas/Bank"
                              >
                                <Landmark size={13} />
                                <span>Kirim ke Kas/Bank</span>
                              </button>
                            ) : (
                              <div className="relative group">
                                <button
                                  disabled
                                  className="px-2.5 py-1.5 bg-[#1b1915] text-[#555] border border-[#2a2a2a] rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-not-allowed opacity-70"
                                >
                                  <Landmark size={13} />
                                  <span>Kirim ke Kas/Bank</span>
                                </button>
                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#0c0b09] text-[#ccc] border border-[#333] text-[10px] rounded px-2 py-1 w-48 text-center shadow-lg z-20 pointer-events-none">
                                  Menunggu approval Atasan di menu Permintaan Bayar sebelum dapat dikirim ke Kas/Bank
                                </div>
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
      {/* MODAL: KONFIRMASI KIRIM KE BUKU KAS/BANK                      */}
      {/* ============================================================== */}
      {isPostingModalOpen && selectedPembayaran && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14120e] border border-[#d4af37]/40 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#252320]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#d4af37]/10 text-[#d4af37] rounded-lg">
                  <Landmark size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Konfirmasi Kirim ke Buku Kas/Bank
                  </h3>
                  <p className="text-xs text-[#888]">
                    Posting pengeluaran kas/bank untuk tagihan ini
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPostingModalOpen(false)}
                className="text-[#888] hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitPosting} className="mt-4 space-y-4">
              {/* Ringkasan Tagihan */}
              <div className="bg-[#1b1915] border border-[#2a2a2a] rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#888]">No. Dokumen:</span>
                  <span className="font-semibold text-white">
                    {selectedPembayaran.noPembayaran || 'Draft Tagihan'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#888]">Pihak Penerima:</span>
                  <span className="font-medium text-white">
                    {selectedPembayaran.supplier?.name ||
                      selectedPembayaran.jasa?.nama ||
                      '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#888]">PO Terkait:</span>
                  <span className="text-[#bbb]">
                    {selectedPembayaran.purchaseOrder?.poNumber || '-'}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#252320]">
                  <span className="text-[#888]">Status Approval:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Check size={12} /> Disetujui Atasan
                  </span>
                </div>
              </div>

              {/* Nominal Bayar */}
              <div>
                <label className="block text-xs font-medium text-[#ccc] mb-1">
                  Nominal yang Diposting *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#888]">
                    Rp
                  </span>
                  <input
                    type="text"
                    required
                    value={
                      postingData.nominal
                        ? Number(postingData.nominal).toLocaleString('id-ID')
                        : ''
                    }
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setPostingData({ ...postingData, nominal: raw });
                    }}
                    className="w-full pl-10 pr-3 py-2 bg-[#1b1915] border border-[#2a2a2a] focus:border-[#d4af37] rounded-xl text-sm font-bold text-white outline-none"
                  />
                </div>
              </div>

              {/* Tipe Akun Kas / Bank */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#ccc] mb-1">
                    Sumber Dana *
                  </label>
                  <select
                    value={postingData.tipeAkunKasBank}
                    onChange={(e) =>
                      setPostingData({
                        ...postingData,
                        tipeAkunKasBank: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-[#1b1915] border border-[#2a2a2a] focus:border-[#d4af37] rounded-xl text-xs text-white outline-none"
                  >
                    <option value="BANK">Bank Transfer</option>
                    <option value="KAS">Kas Kecil (Tunai)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#ccc] mb-1">
                    Tanggal Transaksi *
                  </label>
                  <input
                    type="date"
                    required
                    value={postingData.tanggalBayar}
                    onChange={(e) =>
                      setPostingData({
                        ...postingData,
                        tanggalBayar: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-[#1b1915] border border-[#2a2a2a] focus:border-[#d4af37] rounded-xl text-xs text-white outline-none"
                  />
                </div>
              </div>

              {/* Pilih Master Rekening Bank */}
              {postingData.tipeAkunKasBank === 'BANK' && (
                <div>
                  <label className="block text-xs font-medium text-[#ccc] mb-1">
                    Rekening Bank Sumber *
                  </label>
                  <select
                    value={postingData.rekeningBankId}
                    onChange={(e) =>
                      setPostingData({
                        ...postingData,
                        rekeningBankId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-[#1b1915] border border-[#2a2a2a] focus:border-[#d4af37] rounded-xl text-xs text-white outline-none"
                  >
                    <option value="">-- Pilih Rekening Bank --</option>
                    {rekeningBanks.map((rb) => (
                      <option key={rb.id} value={rb.id}>
                        {rb.namaRekening} - {rb.nomorRekening} ({rb.namaBank})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Kategori Biaya Buku Besar (Tipe Rekening) */}
              <div>
                <label className="block text-xs font-medium text-[#ccc] mb-1">
                  Kategori Akun Buku Besar (Opsional)
                </label>
                <select
                  value={postingData.tipeRekeningId}
                  onChange={(e) =>
                    setPostingData({
                      ...postingData,
                      tipeRekeningId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-[#1b1915] border border-[#2a2a2a] focus:border-[#d4af37] rounded-xl text-xs text-white outline-none"
                >
                  <option value="">-- Otomatis / Sesuai PO --</option>
                  {tipeRekeningList.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.kodeRekening} - {tr.namaTipe}
                    </option>
                  ))}
                </select>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-medium text-[#ccc] mb-1">
                  Catatan / Keterangan Transaksi
                </label>
                <textarea
                  rows={2}
                  value={postingData.keterangan}
                  onChange={(e) =>
                    setPostingData({
                      ...postingData,
                      keterangan: e.target.value,
                    })
                  }
                  placeholder="Keterangan transaksi keluar..."
                  className="w-full px-3 py-2 bg-[#1b1915] border border-[#2a2a2a] focus:border-[#d4af37] rounded-xl text-xs text-white outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-[#252320] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPostingModalOpen(false)}
                  className="px-4 py-2 bg-transparent hover:bg-white/5 text-[#888] hover:text-white rounded-xl text-xs font-medium transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-[#d4af37] to-[#a8862a] text-[#0c0b09] font-bold rounded-xl text-xs flex items-center gap-2 hover:opacity-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Memproses Posting...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Konfirmasi &amp; Kirim ke Kas/Bank</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: DETAIL & RIWAYAT PEMBAYARAN                             */}
      {/* ============================================================== */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14120e] border border-[#2a2a2a] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#252320]">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#d4af37]" />
                <h3 className="text-base font-bold text-white">
                  Detail Pembayaran &amp; Riwayat
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
                  <span className="text-[#888] block text-[11px]">Terbayar:</span>
                  <span className="font-bold text-emerald-400">
                    {fmtRp(detailModalItem.totalTerbayar || detailModalItem.jumlahBayar)}
                  </span>
                </div>
              </div>

              {/* Approval Timeline */}
              <div>
                <h4 className="font-bold text-[#f2ead9] mb-2 text-xs">
                  Riwayat Approval &amp; Posting
                </h4>
                <div className="border-l-2 border-[#2a2a2a] pl-4 space-y-3 ml-2">
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#d4af37]" />
                    <div className="font-medium text-white">Tagihan Dibuat</div>
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
                          Disetujui pada {fmtTgl(detailModalItem.financeApprovedAt)}
                          {detailModalItem.financeApprovedBy && (
                            <> oleh {detailModalItem.financeApprovedBy}</>
                          )}
                        </>
                      ) : (
                        <span className="text-yellow-400/80">
                          Menunggu persetujuan Finance
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
                      Persetujuan Atasan (Permintaan Bayar)
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
                          Menunggu persetujuan Atasan di Permintaan Bayar
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
                      Disbursement Buku Kas/Bank
                    </div>
                    <div className="text-[11px] text-[#777]">
                      {detailModalItem.isPostedKasBank ? (
                        <span className="text-emerald-400">
                          Terkirim &amp; tercatat pada Buku Kas/Bank
                        </span>
                      ) : (
                        <span className="text-[#888]">
                          Belum dikirim ke Buku Kas/Bank
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Installments History if any */}
              {Array.isArray(detailModalItem.paymentHistory) &&
                detailModalItem.paymentHistory.length > 0 && (
                  <div>
                    <h4 className="font-bold text-[#f2ead9] mb-2 text-xs">
                      Rincian Cicilan / Pelunasan ({detailModalItem.paymentHistory.length})
                    </h4>
                    <div className="space-y-1.5">
                      {detailModalItem.paymentHistory.map((ph, idx) => (
                        <div
                          key={ph.id || idx}
                          className="bg-[#1b1915] p-2.5 rounded-lg border border-[#252320] flex justify-between items-center text-xs"
                        >
                          <div>
                            <div className="font-semibold text-white">
                              {ph.tipeEntry || 'PEMBAYARAN'}
                            </div>
                            <div className="text-[10px] text-[#777]">
                              {fmtTgl(ph.tanggal)} • {ph.metodeBayar || 'TRANSFER'}
                            </div>
                          </div>
                          <div className="font-bold text-white">
                            {fmtRp(ph.jumlah)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <div className="mt-6 pt-3 border-t border-[#252320] flex justify-end">
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

export default PembayaranFinancePage;

