import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Banknote,
  Plus,
  Search,
  Save,
  X,
  Edit2,
  CalendarDays,
  Printer,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  RotateCcw,
  Package,
} from 'lucide-react';
import Header from '../components/Header';
import { purchasingService } from '../services/purchasingService';
import { poService } from '../services/poService';
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

// Status Bayar: Akumulasi totalTagihan vs totalTerbayar
const isRecordLunas = (p) => {
  const totalTagihan = Number(p.totalTagihan || p.jumlahBayar || 0);
  const totalTerbayar = Number(p.totalTerbayar ?? p.jumlahBayar ?? 0);
  return (totalTagihan > 0 && totalTerbayar >= totalTagihan) || p.status === 'LUNAS' || p.status === 'PAID';
};

const statusBayarBadge = (p) => {
  return isRecordLunas(p)
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    : 'bg-amber-500/10 text-amber-400 border-amber-500/30';
};

const statusBayarLabel = (p) => {
  return isRecordLunas(p) ? 'Lunas' : 'Tempo';
};

// Cek apakah invoice sudah memiliki aksi pembayaran
const hasPaymentAction = (p) => {
  if (!p) return false;
  const entries = Array.isArray(p.paymentHistory?.entries)
    ? p.paymentHistory.entries
    : Array.isArray(p.paymentHistory)
      ? p.paymentHistory
      : [];
  return entries.length > 0 || Number(p.totalTerbayar || 0) > 0 || Number(p.jumlahBayar || 0) > 0;
};

// Status Approval
const approvalBadge = (status, record) => {
  const s = String(status || '').toUpperCase();
  if (s === 'REJECTED') {
    return 'bg-red-500/10 text-red-400 border-red-500/30';
  }
  if (!hasPaymentAction(record)) {
    return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
  }
  if (s === 'APPROVED' || s === 'APPROVED_ATASAN' || record?.isPostedKasBank) {
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  }
  if (s === 'APPROVED_FINANCE') {
    return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  }
  return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
};

const approvalLabel = (status, record) => {
  const s = String(status || '').toUpperCase();
  if (s === 'REJECTED') return 'Ditolak';
  if (!hasPaymentAction(record)) return 'Pending';
  if (s === 'APPROVED' || s === 'APPROVED_ATASAN' || record?.isPostedKasBank) return 'Disetujui Atasan';
  if (s === 'APPROVED_FINANCE') return 'Menunggu Atasan';
  return 'Menunggu Finance';
};

const METODE_BAYAR = ['TRANSFER', 'CASH', 'CEK', 'GIRO', 'TEMPO'];

const PembayaranMaterialPage = () => {
  const [pembayarans, setPembayarans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterStatusBayar, setFilterStatusBayar] = useState('ALL');
  const [filterApproval, setFilterApproval] = useState('ALL');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJatuhTempoModalOpen, setIsJatuhTempoModalOpen] = useState(false);
  const [detailPembayaran, setDetailPembayaran] = useState(null);
  const [jatuhTempoData, setJatuhTempoData] = useState({ id: null, jatuhTempo: '' });

  // Aksi Pembayaran Modal
  const [isBayarModalOpen, setIsBayarModalOpen] = useState(false);
  const [selectedForBayar, setSelectedForBayar] = useState(null);
  const [bayarForm, setBayarForm] = useState({
    jumlah: '',
    tanggalBayar: new Date().toISOString().split('T')[0],
    metode: 'TRANSFER',
    rekeningBankId: '',
    tipeRekeningId: '',
    keterangan: '',
  });

  const [printingId, setPrintingId] = useState(null);

  // Masters
  const [suppliers, setSuppliers] = useState([]);
  const [pos, setPOs] = useState([]);
  const [rekeningBanks, setRekeningBanks] = useState([]);
  const [tipeRekeningList, setTipeRekeningList] = useState([]);

  // Form State Catat Tagihan
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    supplierId: '',
    poId: '',
    jumlah: '',
    metode: 'TRANSFER',
    status: 'BELUM_BAYAR',
    keterangan: '',
    tanggal: new Date().toISOString().split('T')[0],
    tanggalBayar: '',
    rekeningBankId: '',
    tipeRekeningId: '',
    tambahPembayaran: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPembayarans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await purchasingService.getPembayaranSupplier();
      const all = Array.isArray(data) ? data : [];
      // Tampilkan semua invoice supplier (material / non-jasa)
      const materialOnly = all.filter(
        (p) => !p.jasaId && !p.jasa && p.purchaseOrder?.kategoriPO !== 'JASA',
      );
      setPembayarans(materialOnly);
    } catch {
      toast.error('Gagal memuat data pembayaran');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMasters = useCallback(async () => {
    try {
      const [supData, poData, rekeningRes, tipeRekeningRes] = await Promise.all([
        poService.getSuppliers(),
        poService.getPOs(),
        glBankService.getRekeningBank({ activeOnly: 1 }),
        glBankService.getTipeRekening({ isActive: 1 }),
      ]);
      setSuppliers(Array.isArray(supData) ? supData : []);
      const allPOs = Array.isArray(poData) ? poData : [];
      setPOs(allPOs.filter((p) => p.kategoriPO !== 'JASA' && !p.jasaId && !p.jasa));
      setRekeningBanks(Array.isArray(rekeningRes?.data) ? rekeningRes.data : []);
      setTipeRekeningList(
        Array.isArray(tipeRekeningRes?.data) ? tipeRekeningRes.data : [],
      );
    } catch (err) {
      console.error('Gagal memuat master data:', err);
    }
  }, []);

  useEffect(() => {
    fetchPembayarans();
    fetchMasters();
  }, [fetchPembayarans, fetchMasters]);

  const projectOptions = useMemo(() => {
    const projs = new Map();
    pembayarans.forEach((p) => {
      const proj = p.purchaseOrder?.project;
      if (proj && proj.id) {
        projs.set(proj.id, proj.name);
      }
    });
    return Array.from(projs.entries()).map(([id, name]) => ({ id, name }));
  }, [pembayarans]);

  const supplierOptions = useMemo(() => {
    const sups = new Map();
    pembayarans.forEach((p) => {
      const sup = p.supplier || p.purchaseOrder?.supplier;
      if (sup && sup.id) {
        sups.set(sup.id, sup.name);
      }
    });
    return Array.from(sups.entries()).map(([id, name]) => ({ id, name }));
  }, [pembayarans]);

  const filtered = useMemo(() => {
    let result = pembayarans;

    // Filter per Projek
    if (filterProject) {
      result = result.filter(
        (p) =>
          p.purchaseOrder?.project?.id === filterProject ||
          p.purchaseOrder?.projectId === filterProject ||
          p.project?.id === filterProject,
      );
    }

    // Filter per Supplier
    if (filterSupplier) {
      result = result.filter((p) => {
        const supId = p.supplier?.id || p.purchaseOrder?.supplier?.id;
        return supId === filterSupplier;
      });
    }

    // Filter Status Bayar
    if (filterStatusBayar !== 'ALL') {
      result = result.filter((p) => {
        const isLunas = isRecordLunas(p);
        if (filterStatusBayar === 'LUNAS') return isLunas;
        if (filterStatusBayar === 'TEMPO') return !isLunas;
        return true;
      });
    }

    // Filter Status Approval
    if (filterApproval !== 'ALL') {
      result = result.filter((p) => {
        const s = String(p.approvalStatus || '').toUpperCase();
        const hasAction = hasPaymentAction(p);
        const isAppr = s === 'APPROVED' || s === 'APPROVED_ATASAN' || Boolean(p.isPostedKasBank);

        if (filterApproval === 'REJECTED') {
          return s === 'REJECTED';
        }
        if (filterApproval === 'PENDING') {
          return !hasAction && s !== 'REJECTED';
        }
        if (filterApproval === 'MENUNGGU_FINANCE') {
          return hasAction && (s === 'PENDING' || s === 'MENUNGGU_FINANCE');
        }
        if (filterApproval === 'MENUNGGU_ATASAN') {
          return hasAction && s === 'APPROVED_FINANCE';
        }
        if (filterApproval === 'APPROVED') {
          return isAppr;
        }
        return true;
      });
    }

    // Pencarian
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.keterangan?.toLowerCase().includes(q) ||
          p.supplier?.name?.toLowerCase().includes(q) ||
          p.purchaseOrder?.supplier?.name?.toLowerCase().includes(q) ||
          p.purchaseOrder?.poNumber?.toLowerCase().includes(q) ||
          p.noPembayaran?.toLowerCase().includes(q) ||
          p.purchaseOrder?.project?.name?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [search, pembayarans, filterProject, filterSupplier, filterStatusBayar, filterApproval]);

  // Aksi Pembayaran Modal Handlers
  const handleOpenBayarModal = (p) => {
    setSelectedForBayar(p);
    const isRejected = p.approvalStatus === 'REJECTED';
    const entries = Array.isArray(p.paymentHistory)
      ? p.paymentHistory
      : Array.isArray(p.paymentHistory?.entries)
        ? p.paymentHistory.entries
        : [];
    const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;

    const totalTagihan = Number(p.totalTagihan || p.jumlahBayar || 0);
    const totalTerbayar = Number(p.totalTerbayar ?? p.jumlahBayar ?? 0);
    const sisa = Math.max(0, totalTagihan - totalTerbayar);

    const initialNominal = isRejected && lastEntry?.jumlah
      ? String(lastEntry.jumlah)
      : (sisa > 0 ? String(sisa) : '');

    setBayarForm({
      jumlah: initialNominal,
      tanggalBayar: new Date().toISOString().split('T')[0],
      metode: (isRejected && lastEntry?.metodeBayar) || p.metodeBayar || 'TRANSFER',
      rekeningBankId: (isRejected && lastEntry?.rekeningBankId) || p.rekeningBankId || '',
      tipeRekeningId: (isRejected && lastEntry?.tipeRekeningId) || p.tipeRekeningId || '',
      keterangan: (isRejected && lastEntry?.keterangan) || `Pembayaran PO ${p.purchaseOrder?.poNumber || ''}`,
    });
    setIsBayarModalOpen(true);
  };

  const handleBayarSubmit = async (e) => {
    e.preventDefault();
    if (!selectedForBayar) return;

    const nominal = Number(String(bayarForm.jumlah || 0).replace(/\D/g, '') || 0);
    if (nominal <= 0) {
      toast.error('Nominal bayar harus lebih dari 0');
      return;
    }

    setIsSubmitting(true);
    try {
      await purchasingService.updatePembayaran(selectedForBayar.id, {
        jumlahBayar: nominal,
        tambahPembayaran: true,
        isRevisi: selectedForBayar.approvalStatus === 'REJECTED',
        tanggalBayar: bayarForm.tanggalBayar || null,
        metodeBayar: bayarForm.metode,
        rekeningBankId: bayarForm.rekeningBankId || null,
        tipeRekeningId: bayarForm.tipeRekeningId || null,
        tipeAkunKasBank: bayarForm.rekeningBankId ? 'BANK' : 'KAS',
        keterangan: bayarForm.keterangan || null,
      });
      toast.success(
        selectedForBayar.approvalStatus === 'REJECTED'
          ? 'Revisi pembayaran berhasil diajukan ulang ke Finance'
          : 'Aksi pembayaran berhasil diajukan! Menunggu approval Finance & Atasan.',
      );
      setIsBayarModalOpen(false);
      fetchPembayarans();
    } catch (err) {
      toast.error(err.message || 'Gagal mengajukan pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cetak Invoice PDF Handler
  const handlePrintInvoice = async (id, entryIndex) => {
    const key = entryIndex !== undefined && entryIndex !== null ? `${id}-${entryIndex}` : id;
    setPrintingId(key);
    try {
      await purchasingService.printInvoiceSupplier(id, entryIndex);
      toast.success('Invoice supplier berhasil dibuka');
    } catch (err) {
      toast.error(err.message || 'Gagal mencetak invoice supplier');
    } finally {
      setPrintingId(null);
    }
  };

  const openModal = (pembayaran = null) => {
    if (pembayaran) {
      setEditId(pembayaran.id);
      setFormData({
        supplierId: pembayaran.supplierId || pembayaran.purchaseOrder?.supplierId || '',
        poId: pembayaran.poId || '',
        jumlah: '',
        metode: pembayaran.metodeBayar || pembayaran.metode || 'TRANSFER',
        status: pembayaran.status || 'BELUM_BAYAR',
        keterangan: pembayaran.keterangan || '',
        tanggal: pembayaran.tanggal
          ? new Date(pembayaran.tanggal).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        tanggalBayar: pembayaran.tanggalBayar
          ? new Date(pembayaran.tanggalBayar).toISOString().split('T')[0]
          : '',
        rekeningBankId: pembayaran.rekeningBankId || '',
        tipeRekeningId:
          pembayaran.tipeRekeningId || pembayaran.rekeningBank?.tipeRekeningId || '',
        tambahPembayaran: true,
      });
    } else {
      setEditId(null);
      setFormData({
        supplierId: '',
        poId: '',
        jumlah: '',
        metode: 'TRANSFER',
        status: 'BELUM_BAYAR',
        keterangan: '',
        tanggal: new Date().toISOString().split('T')[0],
        tanggalBayar: '',
        rekeningBankId: '',
        tipeRekeningId: '',
        tambahPembayaran: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const jumlahNominal = Number(String(formData.jumlah || 0).replace(/\D/g, '') || 0);
    if (jumlahNominal < 0) {
      toast.error('Jumlah bayar tidak valid');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      supplierId: formData.supplierId || null,
      jasaId: null,
      poId: formData.poId || null,
      jumlahBayar: jumlahNominal,
      metodeBayar: formData.metode,
      status: formData.status,
      keterangan: formData.keterangan,
      tanggal: formData.tanggal,
      tanggalBayar: formData.tanggalBayar || null,
      tipeAkunKasBank: formData.rekeningBankId ? 'BANK' : 'KAS',
      rekeningBankId: formData.rekeningBankId || null,
      tipeRekeningId: formData.tipeRekeningId || null,
      tambahPembayaran: Boolean(formData.tambahPembayaran),
    };

    try {
      if (editId) {
        await purchasingService.updatePembayaran(editId, payload);
        toast.success('Invoice supplier berhasil diupdate');
      } else {
        await purchasingService.createPembayaran(payload);
        toast.success('Invoice supplier berhasil dibuat & masuk ke antrean approval');
      }
      setIsModalOpen(false);
      fetchPembayarans();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan pembayaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJatuhTempoSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await purchasingService.updatePembayaran(jatuhTempoData.id, {
        jatuhTempo: jatuhTempoData.jatuhTempo || null,
        tambahPembayaran: false,
      });
      toast.success('Jatuh tempo berhasil diupdate');
      setIsJatuhTempoModalOpen(false);
      fetchPembayarans();
    } catch (err) {
      toast.error(err.message || 'Gagal update jatuh tempo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0b09]">
      <Header />
      <div className="px-5 md:px-10 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-[#888] text-xs uppercase tracking-wider mb-1">Finance &amp; Purchasing</p>
            <h2 className="text-2xl md:text-3xl text-[#f2ead9] font-bold">Invoice Supplier</h2>
            <p className="text-[#888] text-sm mt-1">
              Menampilkan invoice tagihan supplier yang telah disetujui Atasan. Aksi pembayaran membutuhkan verifikasi Finance dan persetujuan Atasan.
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-[#d4af37] text-[#0c0b09] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#e8c874] transition-colors w-fit shadow-lg shadow-[#d4af37]/10"
          >
            <Plus size={18} /> Catat Invoice Tagihan
          </button>
        </div>

        <div className="mb-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between flex-wrap">
          <div className="flex flex-col sm:flex-row gap-3 items-center flex-1 flex-wrap">
            <div className="relative w-full sm:w-64">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
              <input
                type="text"
                placeholder="Cari supplier / PO / no inv..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#1a1814] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-[#666] focus:border-[#d4af37] outline-none"
              />
            </div>

            {/* Filter Per Projek */}
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="w-full sm:w-48 bg-[#1a1814] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#d4af37] outline-none"
            >
              <option value="">Semua Proyek</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {/* Filter Status Bayar */}
            <select
              value={filterStatusBayar}
              onChange={(e) => setFilterStatusBayar(e.target.value)}
              className="w-full sm:w-44 bg-[#1a1814] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#d4af37] outline-none"
            >
              <option value="ALL">Semua Status Bayar</option>
              <option value="LUNAS">Lunas</option>
              <option value="TEMPO">Tempo (Belum Lunas)</option>
            </select>

            {/* Filter Status Approval */}
            <select
              value={filterApproval}
              onChange={(e) => setFilterApproval(e.target.value)}
              className="w-full sm:w-48 bg-[#1a1814] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#d4af37] outline-none"
            >
              <option value="ALL">Semua Status Approval</option>
              <option value="PENDING">Pending (Belum Diajukan)</option>
              <option value="MENUNGGU_FINANCE">Menunggu Finance</option>
              <option value="MENUNGGU_ATASAN">Menunggu Atasan</option>
              <option value="APPROVED">Disetujui Atasan</option>
              <option value="REJECTED">Ditolak</option>
            </select>

            {/* Filter Supplier (Opsional) */}
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="w-full sm:w-44 bg-[#1a1814] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#d4af37] outline-none"
            >
              <option value="">Semua Supplier</option>
              {supplierOptions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {(filterProject || filterSupplier || filterStatusBayar !== 'ALL' || filterApproval !== 'ALL' || search) && (
              <button
                type="button"
                onClick={() => {
                  setFilterProject('');
                  setFilterSupplier('');
                  setFilterStatusBayar('ALL');
                  setFilterApproval('ALL');
                  setSearch('');
                }}
                className="text-xs text-[#888] hover:text-[#d4af37] underline transition-colors px-1"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#22201c] text-[#888] text-left">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Supplier &amp; PO</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Proyek</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Tgl Tagihan</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap text-orange-400">Jatuh Tempo</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Total Tagihan</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Total Terbayar</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Sisa Tagihan</th>
                  <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Status Bayar</th>
                  <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Status Approval</th>
                  <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-[#888]">Memuat data...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-[#888]">
                      Belum ada invoice supplier yang disetujui Atasan.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const isLunas = isRecordLunas(p);
                    const canPrint = p.approvalStatus === 'APPROVED' || p.approvalStatus === 'APPROVED_ATASAN' || p.isPostedKasBank;
                    const totalTagihan = Number(p.totalTagihan || p.jumlahBayar || 0);
                    const totalTerbayar = Number(p.totalTerbayar ?? p.jumlahBayar ?? 0);
                    const sisa = Math.max(0, totalTagihan - totalTerbayar);

                    return (
                      <tr
                        key={p.id}
                        onClick={() => setDetailPembayaran(p)}
                        className="border-t border-[#2a2a2a] hover:bg-white/[0.04] transition-colors cursor-pointer group"
                        title="Klik baris untuk melihat rincian item material PO & riwayat pembayaran"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#f2ead9] group-hover:text-[#d4af37] transition-colors flex items-center justify-between">
                            <span>{p.supplier?.name || p.purchaseOrder?.supplier?.name || '-'}</span>
                          </div>
                          <div className="text-xs text-[#888] font-mono mt-0.5">
                            {p.purchaseOrder?.poNumber || p.noPembayaran || '-'}
                          </div>
                          {/* Preview item material PO */}
                          <div className="flex flex-wrap gap-1 mt-1.5 max-w-xs">
                            {(p.purchaseOrder?.items || []).slice(0, 2).map((it, idx) => {
                              const itName = it.description || it.materialRequest?.itemName || it.rabItem?.name || 'Item Material';
                              return (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 bg-[#1e1c18] border border-[#332e26] text-[#e0d6c3] px-1.5 py-0.5 rounded text-[10px] group-hover:border-[#d4af37]/40 transition-colors"
                                  title={itName}
                                >
                                  <Package size={9} className="text-[#d4af37] shrink-0" />
                                  <span className="truncate max-w-[110px]">{itName}</span>
                                </span>
                              );
                            })}
                            {(p.purchaseOrder?.items || []).length > 2 && (
                              <span className="text-[10px] text-[#888] self-center">
                                +{p.purchaseOrder.items.length - 2} item
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#777] mt-1">
                            Diinput: <span className="text-[#d4af37]">{p.paymentHistory?.entries?.[p.paymentHistory?.entries?.length - 1]?.createdByName || p.createdByName || p.createdBy?.name || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#ccc] text-xs">
                          {p.purchaseOrder?.project?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-[#888] text-xs whitespace-nowrap">
                          {fmtTgl(p.tanggal)}
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {(() => {
                            if (!p.jatuhTempo) return <span className="text-[#666] italic">-</span>;
                            const jt = new Date(p.jatuhTempo);
                            const today = new Date();
                            const diffTime = jt.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            const isWarning = diffDays <= 7 && !isLunas;
                            return (
                              <div className="flex flex-col">
                                <span className={isWarning ? 'text-red-400 font-semibold' : 'text-orange-400'}>
                                  {fmtTgl(p.jatuhTempo)}
                                </span>
                                {isWarning && (
                                  <span className="text-[10px] text-red-500 font-bold mt-0.5">
                                    H-{diffDays > 0 ? diffDays : 0} Jatuh Tempo!
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-right text-[#ccc] font-mono whitespace-nowrap">
                          {fmtRp(totalTagihan)}
                        </td>
                        <td className="px-4 py-3 text-right text-[#d4af37] font-mono whitespace-nowrap">
                          {fmtRp(totalTerbayar)}
                        </td>
                        <td className="px-4 py-3 text-right text-[#ccc] font-mono whitespace-nowrap">
                          {fmtRp(sisa)}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusBayarBadge(
                              p,
                            )}`}
                          >
                            {statusBayarLabel(p)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${approvalBadge(
                              p.approvalStatus,
                              p,
                            )}`}
                          >
                            {approvalLabel(p.approvalStatus, p)}
                          </span>
                          {p.approvalStatus === 'REJECTED' && p.rejectReason && (
                            <div className="text-[10px] text-red-400 mt-1 max-w-[130px] truncate mx-auto" title={p.rejectReason}>
                              {p.rejectReason}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Tombol Aksi Bayar / Revisi */}
                            {p.approvalStatus === 'REJECTED' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenBayarModal(p);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/15 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-lg text-xs font-semibold transition-colors"
                                title="Revisi pembayaran yang ditolak"
                              >
                                <RotateCcw size={14} /> Revisi
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenBayarModal(p);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#d4af37]/15 hover:bg-[#d4af37]/30 text-[#d4af37] border border-[#d4af37]/40 rounded-lg text-xs font-semibold transition-colors"
                                title="Lakukan aksi pembayaran cicilan / pelunasan"
                              >
                                <Banknote size={14} /> Bayar
                              </button>
                            )}

                            {/* Tombol Cetak Invoice PDF */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                canPrint && handlePrintInvoice(p.id);
                              }}
                              disabled={!canPrint || printingId === p.id}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                canPrint
                                  ? 'bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/40 cursor-pointer'
                                  : 'bg-white/5 text-[#555] border-white/5 cursor-not-allowed opacity-50'
                              }`}
                              title={
                                canPrint
                                  ? 'Cetak Invoice PDF Resmi'
                                  : 'Cetak invoice aktif setelah disetujui Atasan'
                              }
                            >
                              <Printer size={14} />
                              {printingId === p.id ? 'Memuat...' : 'Cetak'}
                            </button>

                            {/* Tombol Riwayat & Detail Item PO */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailPembayaran(p);
                              }}
                              className="p-1.5 text-[#888] hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                              title="Lihat Detail Item PO & Riwayat Pembayaran"
                            >
                              <Eye size={15} />
                            </button>

                            {/* Tombol Set Jatuh Tempo */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setJatuhTempoData({
                                  id: p.id,
                                  jatuhTempo: p.jatuhTempo ? p.jatuhTempo.split('T')[0] : '',
                                });
                                setIsJatuhTempoModalOpen(true);
                              }}
                              className="p-1.5 text-[#888] hover:text-orange-400 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                              title="Set Jatuh Tempo"
                            >
                              <CalendarDays size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL AKSI PEMBAYARAN (CICILAN / PELUNASAN) */}
      {isBayarModalOpen && selectedForBayar && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          onClick={() => setIsBayarModalOpen(false)}
        >
          <div
            className="bg-[#161513] border border-[#2a2a2a] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Banknote size={20} className="text-[#d4af37]" />
                  Aksi Pembayaran Supplier
                </h2>
                <p className="text-xs text-[#888] mt-0.5">
                  Supplier: {selectedForBayar.supplier?.name || selectedForBayar.purchaseOrder?.supplier?.name || '-'}
                </p>
              </div>
              <button
                onClick={() => setIsBayarModalOpen(false)}
                className="text-[#888] hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBayarSubmit}>
              <div className="p-6 space-y-4">
                {/* Rejection Alert Box if previously rejected */}
                {selectedForBayar.approvalStatus === 'REJECTED' && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 flex gap-2.5 items-start">
                    <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-red-300">
                      <div className="font-semibold text-red-200">Pembayaran Sebelumnya Ditolak</div>
                      <div className="mt-0.5 text-red-300/90">
                        Alasan: <strong className="text-red-100">{selectedForBayar.rejectReason || 'Silakan sesuaikan data pembayaran.'}</strong>
                      </div>
                      <p className="mt-1.5 text-[11px] text-red-200/80 leading-relaxed">
                        Silakan revisi nominal atau rekening di bawah. Setelah diajukan ulang, status akan berubah kembali menjadi <strong>Menunggu Finance</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Summary Box */}
                <div className="grid grid-cols-3 gap-2 bg-[#201d19] border border-[#332e26] rounded-xl p-3 text-center">
                  <div>
                    <p className="text-[11px] text-[#888]">Total Tagihan</p>
                    <p className="text-sm font-bold text-white font-mono mt-0.5">
                      {fmtRp(selectedForBayar.totalTagihan || selectedForBayar.jumlahBayar || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#888]">Sudah Terbayar</p>
                    <p className="text-sm font-bold text-[#d4af37] font-mono mt-0.5">
                      {fmtRp(selectedForBayar.totalTerbayar ?? selectedForBayar.jumlahBayar ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#888]">Sisa Tagihan</p>
                    <p className="text-sm font-bold text-orange-400 font-mono mt-0.5">
                      {fmtRp(
                        Math.max(
                          0,
                          Number(selectedForBayar.totalTagihan || selectedForBayar.jumlahBayar || 0) -
                            Number(selectedForBayar.totalTerbayar ?? selectedForBayar.jumlahBayar ?? 0),
                        ),
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#ccc] mb-1 font-medium">
                    Jumlah Pembayaran Kali Ini (Rp) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={
                      bayarForm.jumlah
                        ? Number(bayarForm.jumlah || 0).toLocaleString('id-ID')
                        : ''
                    }
                    onChange={(e) => {
                      const raw = String(e.target.value || '').replace(/\D/g, '');
                      setBayarForm({ ...bayarForm, jumlah: raw });
                    }}
                    placeholder="0"
                    className="w-full bg-[#0c0b09] border border-[#332e26] rounded-lg px-3.5 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none font-mono text-base"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const sisa = Math.max(
                          0,
                          Number(selectedForBayar.totalTagihan || 0) -
                            Number(selectedForBayar.totalTerbayar || 0),
                        );
                        setBayarForm({ ...bayarForm, jumlah: String(sisa) });
                      }}
                      className="text-[11px] text-[#d4af37] hover:underline"
                    >
                      Bayar Lunas (Sisa: {fmtRp(Math.max(0, Number(selectedForBayar.totalTagihan || 0) - Number(selectedForBayar.totalTerbayar || 0)))})
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#ccc] mb-1 font-medium">Tanggal Bayar</label>
                    <input
                      type="date"
                      value={bayarForm.tanggalBayar}
                      onChange={(e) => setBayarForm({ ...bayarForm, tanggalBayar: e.target.value })}
                      required
                      className="w-full bg-[#0c0b09] border border-[#332e26] rounded-lg px-3 py-2 text-white text-sm focus:border-[#d4af37] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#ccc] mb-1 font-medium">Metode Bayar</label>
                    <select
                      value={bayarForm.metode}
                      onChange={(e) => setBayarForm({ ...bayarForm, metode: e.target.value })}
                      className="w-full bg-[#0c0b09] border border-[#332e26] rounded-lg px-3 py-2 text-white text-sm focus:border-[#d4af37] outline-none"
                    >
                      {METODE_BAYAR.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#ccc] mb-1 font-medium">Rekening Bank Tujuan / Sumber</label>
                  <select
                    value={bayarForm.rekeningBankId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      const selected = rekeningBanks.find((r) => r.id === nextId);
                      setBayarForm({
                        ...bayarForm,
                        rekeningBankId: nextId,
                        tipeRekeningId: selected?.tipeRekeningId || bayarForm.tipeRekeningId || '',
                      });
                    }}
                    className="w-full bg-[#0c0b09] border border-[#332e26] rounded-lg px-3 py-2 text-white text-sm focus:border-[#d4af37] outline-none"
                  >
                    <option value="">-- Pilih Rekening Bank (opsional) --</option>
                    {rekeningBanks.map((r) => (
                      <option key={r.id} value={r.id}>
                        {`${r.namaRekening} - ${r.nomorRekening}${r.namaBank ? ` (${r.namaBank})` : ''}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[#ccc] mb-1 font-medium">Keterangan Pembayaran</label>
                  <textarea
                    value={bayarForm.keterangan}
                    onChange={(e) => setBayarForm({ ...bayarForm, keterangan: e.target.value })}
                    rows={2}
                    placeholder="Contoh: Pembayaran cicilan termin 1, pelunasan material..."
                    className="w-full bg-[#0c0b09] border border-[#332e26] rounded-lg px-3 py-2 text-white text-sm focus:border-[#d4af37] outline-none resize-none"
                  />
                </div>

                <div className="bg-[#1b1f24] border border-[#2b3540] rounded-xl p-3 flex gap-2.5 items-start">
                  <Clock size={16} className="text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-[#9fb3c8] leading-relaxed">
                    Setiap aksi pembayaran akan memerlukan <strong>Approval Finance</strong> di Pembayaran Finance dan dilanjutkan dengan <strong>Approval Atasan</strong> di Permintaan Bayar. Setelah Atasan menyetujui, invoice resmi dapat dicetak.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#2a2a2a] bg-[#121110]">
                <button
                  type="button"
                  onClick={() => setIsBayarModalOpen(false)}
                  className="px-5 py-2.5 text-[#888] hover:text-white font-medium rounded-lg hover:bg-white/5 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-[#d4af37] text-[#0c0b09] font-bold px-6 py-2.5 rounded-lg hover:bg-[#e8c874] transition-colors disabled:opacity-50"
                >
                  <Save size={16} /> {isSubmitting ? 'Memproses...' : (selectedForBayar.approvalStatus === 'REJECTED' ? 'Ajukan Ulang Pembayaran' : 'Ajukan Pembayaran')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL (ITEM PO & RIWAYAT PEMBAYARAN) */}
      {detailPembayaran && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[210] flex items-center justify-center p-4"
          onClick={() => setDetailPembayaran(null)}
        >
          <div
            className="bg-[#161513] border border-[#2a2a2a] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText size={20} className="text-[#d4af37]" />
                  Detail Invoice &amp; Rincian Material PO
                </h3>
                <p className="text-xs text-[#888] mt-0.5">
                  Supplier: <strong className="text-white">{detailPembayaran.supplier?.name || detailPembayaran.purchaseOrder?.supplier?.name || '-'}</strong> | PO: <strong className="text-[#d4af37]">{detailPembayaran.purchaseOrder?.poNumber || detailPembayaran.noPembayaran || '-'}</strong>
                </p>
              </div>
              <button
                onClick={() => setDetailPembayaran(null)}
                className="text-[#888] hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Alert jika ditolak */}
              {detailPembayaran.approvalStatus === 'REJECTED' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 flex gap-2.5 items-start">
                  <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
                  <div className="text-xs text-red-300">
                    <span className="font-semibold text-red-200">Status: Pembayaran Ditolak</span> — {detailPembayaran.rejectReason || 'Silakan lakukan revisi pembayaran.'}
                  </div>
                </div>
              )}

              {/* Financial KPI Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#1e1c18] border border-[#332e26] rounded-xl p-4">
                <div>
                  <p className="text-xs text-[#888]">Total Tagihan</p>
                  <p className="text-base font-bold text-white font-mono mt-0.5">
                    {fmtRp(detailPembayaran.totalTagihan || detailPembayaran.jumlahBayar || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#888]">Total Terbayar</p>
                  <p className="text-base font-bold text-[#d4af37] font-mono mt-0.5">
                    {fmtRp(detailPembayaran.totalTerbayar ?? detailPembayaran.jumlahBayar ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#888]">Sisa Tagihan</p>
                  <p className="text-base font-bold text-orange-400 font-mono mt-0.5">
                    {fmtRp(
                      Math.max(
                        0,
                        Number(detailPembayaran.totalTagihan || detailPembayaran.jumlahBayar || 0) -
                          Number(detailPembayaran.totalTerbayar ?? detailPembayaran.jumlahBayar ?? 0),
                      ),
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#888]">Status Bayar</p>
                  <div className="mt-1">
                    <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold border ${statusBayarBadge(detailPembayaran)}`}>
                      {statusBayarLabel(detailPembayaran)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rincian Item PO */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-[#f2ead9] uppercase tracking-wider flex items-center gap-2">
                    <Package size={16} className="text-[#d4af37]" />
                    Rincian Barang / Material Purchase Order
                  </h4>
                  <span className="text-xs text-[#888]">
                    Proyek: <strong className="text-white">{detailPembayaran.purchaseOrder?.project?.name || '-'}</strong>
                  </span>
                </div>

                <div className="overflow-x-auto border border-[#2a2a2a] rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[#888] bg-[#22201c] border-b border-[#2a2a2a]">
                        <th className="py-2.5 px-3 font-semibold text-center w-12">No</th>
                        <th className="py-2.5 px-4 font-semibold">Nama Item Material</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Qty &amp; Satuan</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Harga Satuan</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detailPembayaran.purchaseOrder?.items || []).map((it, idx) => {
                        const itemName =
                          it.description ||
                          it.materialRequest?.itemName ||
                          it.rabItem?.name ||
                          '-';
                        const qtyNum = Number(it.qty || 0);
                        const unitPrice = Number(it.unitPrice || 0);
                        const total = Number(it.total || qtyNum * unitPrice || 0);

                        return (
                          <tr key={it.id || idx} className="border-b border-[#22201c] hover:bg-white/[0.02]">
                            <td className="py-2.5 px-3 text-center text-[#888] font-mono text-xs">{idx + 1}</td>
                            <td className="py-2.5 px-4 text-[#f2ead9]">
                              <div className="font-medium">{itemName}</div>
                              {it.description2 && (
                                <div className="text-xs text-[#777] mt-0.5">{it.description2}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right text-[#ccc] font-mono">
                              {qtyNum.toLocaleString('id-ID', { maximumFractionDigits: 2 })} {it.unit || ''}
                            </td>
                            <td className="py-2.5 px-4 text-right text-[#ccc] font-mono">{fmtRp(unitPrice)}</td>
                            <td className="py-2.5 px-4 text-right text-[#d4af37] font-semibold font-mono">{fmtRp(total)}</td>
                          </tr>
                        );
                      })}
                      {(detailPembayaran.purchaseOrder?.items || []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-[#888]">
                            Detail item PO tidak tersedia.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {(detailPembayaran.purchaseOrder?.items || []).length > 0 && (
                      <tfoot>
                        <tr className="bg-[#22201c]/80 text-white font-bold border-t border-[#332e26]">
                          <td colSpan={4} className="py-2.5 px-4 text-right text-xs uppercase tracking-wider text-[#aaa]">
                            Total Nilai Item PO:
                          </td>
                          <td className="py-2.5 px-4 text-right text-[#d4af37] font-mono">
                            {fmtRp(
                              (detailPembayaran.purchaseOrder?.items || []).reduce(
                                (sum, it) => sum + Number(it.total || (Number(it.qty || 0) * Number(it.unitPrice || 0))),
                                0,
                              ),
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Riwayat Aksi Pembayaran (Termin) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-[#f2ead9] uppercase tracking-wider">
                    Riwayat Aksi Pembayaran (Termin / Cicilan)
                  </h4>
                  <button
                    onClick={() => {
                      setDetailPembayaran(null);
                      handleOpenBayarModal(detailPembayaran);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#d4af37]/15 hover:bg-[#d4af37]/30 text-[#d4af37] border border-[#d4af37]/40 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Plus size={14} /> Tambah Pembayaran Baru
                  </button>
                </div>

                <div className="overflow-x-auto border border-[#2a2a2a] rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[#888] bg-[#22201c] border-b border-[#2a2a2a]">
                        <th className="py-2.5 px-4 font-semibold text-center w-12">No</th>
                        <th className="py-2.5 px-4 font-semibold">Tgl Bayar</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Nominal</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Metode</th>
                        <th className="py-2.5 px-4 font-semibold">Keterangan</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Status Approval</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(detailPembayaran.paymentHistory) &&
                      detailPembayaran.paymentHistory.length > 0 ? (
                        detailPembayaran.paymentHistory.map((ent, idx) => {
                          const entApproved =
                            ent.approvalStatus === 'APPROVED' ||
                            detailPembayaran.approvalStatus === 'APPROVED' ||
                            detailPembayaran.isPostedKasBank;

                          return (
                            <tr key={ent.id || idx} className="border-b border-[#22201c] hover:bg-white/[0.02]">
                              <td className="py-2.5 px-4 text-center text-[#888]">{idx + 1}</td>
                              <td className="py-2.5 px-4 text-[#ccc] whitespace-nowrap">{fmtTgl(ent.tanggal)}</td>
                              <td className="py-2.5 px-4 text-right text-[#d4af37] font-semibold font-mono whitespace-nowrap">
                                {fmtRp(ent.jumlah)}
                              </td>
                              <td className="py-2.5 px-4 text-center text-[#ccc] text-xs">{ent.metodeBayar || '-'}</td>
                              <td className="py-2.5 px-4 text-[#888] text-xs max-w-xs truncate">{ent.keterangan || '-'}</td>
                              <td className="py-2.5 px-4 text-xs text-[#f2ead9]">
                                <span className="font-medium text-[#d4af37]">{ent.createdByName || ent.createdBy || '-'}</span>
                              </td>
                              <td className="py-2.5 px-4 text-xs">
                                <div className="text-[11px] text-blue-300">Finance: {ent.financeApprovedBy || '-'}</div>
                                <div className="text-[11px] text-emerald-300 mt-0.5">Atasan: {ent.atasanApprovedBy || '-'}</div>
                              </td>
                              <td className="py-2.5 px-4 text-center whitespace-nowrap">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${approvalBadge(
                                    ent.approvalStatus || detailPembayaran.approvalStatus,
                                  )}`}
                                >
                                  {approvalLabel(ent.approvalStatus || detailPembayaran.approvalStatus)}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <button
                                  onClick={() => entApproved && handlePrintInvoice(detailPembayaran.id, idx)}
                                  disabled={!entApproved || printingId === `${detailPembayaran.id}-${idx}`}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border transition-colors mx-auto ${
                                    entApproved
                                      ? 'bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/40 cursor-pointer'
                                      : 'bg-white/5 text-[#555] border-white/5 cursor-not-allowed opacity-50'
                                  }`}
                                  title={
                                    entApproved
                                      ? 'Cetak Invoice PDF Termin Ini'
                                      : 'Cetak invoice aktif setelah disetujui Atasan'
                                  }
                                >
                                  <Printer size={12} />
                                  {printingId === `${detailPembayaran.id}-${idx}` ? '...' : 'Cetak'}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-[#888]">
                            Belum ada riwayat aksi pembayaran yang tercatat. Silakan klik tombol <strong>Bayar</strong> untuk mengajukan pembayaran termin.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-[#2a2a2a] bg-[#121110]">
              {(() => {
                const canPrint = detailPembayaran.approvalStatus === 'APPROVED' || detailPembayaran.isPostedKasBank;
                return (
                  <button
                    onClick={() => canPrint && handlePrintInvoice(detailPembayaran.id)}
                    disabled={!canPrint || printingId === detailPembayaran.id}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                      canPrint
                        ? 'bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-400 border-emerald-500/40 cursor-pointer'
                        : 'bg-white/5 text-[#555] border-white/5 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <Printer size={16} />
                    {printingId === detailPembayaran.id ? 'Mencetak...' : 'Cetak Invoice Lengkap (PDF)'}
                  </button>
                );
              })()}

              <button
                type="button"
                onClick={() => setDetailPembayaran(null)}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CATAT INVOICE BARU / EDIT */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Banknote size={20} className="text-[#d4af37]" />
                {editId ? 'Update Pembayaran' : 'Catat Invoice Tagihan Supplier'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#888] hover:text-white">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto">
              <div className="px-6 py-4 space-y-4">
                {!editId && (
                  <>
                    <div>
                      <label className="block text-sm text-[#888] mb-1">Supplier</label>
                      <select
                        value={formData.supplierId}
                        onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                        className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none"
                      >
                        <option value="">-- Pilih Supplier --</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-[#888] mb-1">Purchase Order (opsional)</label>
                      <select
                        value={formData.poId}
                        onChange={(e) => {
                          const poId = e.target.value;
                          const selectedPo = pos.find((p) => p.id === poId);
                          setFormData({
                            ...formData,
                            poId,
                            supplierId: selectedPo?.supplierId || formData.supplierId,
                          });
                        }}
                        className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none"
                      >
                        <option value="">-- Pilih PO --</option>
                        {pos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.poNumber || `PO-${p.id.slice(0, 8)}`}{p.supplier?.name ? ` - ${p.supplier.name}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm text-[#888] mb-1">Tgl Buat Tagihan</label>
                    <input
                      type="date"
                      value={formData.tanggal}
                      onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                      required
                      className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-green-400 mb-1">Tanggal Bayar</label>
                    <input
                      type="date"
                      value={formData.tanggalBayar}
                      onChange={(e) => setFormData({ ...formData, tanggalBayar: e.target.value })}
                      className="w-full bg-[#0c0b09] border border-green-500/30 rounded-lg px-3 py-2.5 text-white text-sm focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#888] mb-1">Metode Bayar</label>
                    <select
                      value={formData.metode}
                      onChange={(e) => setFormData({ ...formData, metode: e.target.value })}
                      className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none"
                    >
                      {METODE_BAYAR.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#888] mb-1">Status Pembayaran</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none"
                    >
                      <option value="TEMPO">Tempo</option>
                      <option value="LUNAS">Lunas</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-[#888] mb-1">Rekening Bank</label>
                    <select
                      value={formData.rekeningBankId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        const selected = rekeningBanks.find((r) => r.id === nextId);
                        setFormData({
                          ...formData,
                          rekeningBankId: nextId,
                          tipeRekeningId: selected?.tipeRekeningId || formData.tipeRekeningId || '',
                        });
                      }}
                      className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none"
                    >
                      <option value="">-- Pilih Rekening Bank --</option>
                      {rekeningBanks.map((r) => (
                        <option key={r.id} value={r.id}>
                          {`${r.namaRekening} - ${r.nomorRekening}${r.namaBank ? ` (${r.namaBank})` : ''}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-[#22201c] border border-[#2a2a2a] rounded-lg p-3">
                  <label className="flex items-center gap-2 text-xs text-[#ccc] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.tambahPembayaran)}
                      onChange={(e) =>
                        setFormData({ ...formData, tambahPembayaran: e.target.checked })
                      }
                    />
                    Tambah aksi pembayaran baru (cicilan / pelunasan)
                  </label>
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">Jumlah Bayar (Rp)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      formData.jumlah
                        ? Number(formData.jumlah || 0).toLocaleString('id-ID')
                        : ''
                    }
                    onChange={(e) => {
                      const raw = String(e.target.value || '').replace(/\D/g, '');
                      setFormData({ ...formData, jumlah: raw });
                    }}
                    placeholder="0"
                    className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">Keterangan</label>
                  <textarea
                    value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    rows={2}
                    placeholder="Keterangan pembayaran..."
                    className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#2a2a2a]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-[#888] hover:text-white font-medium rounded-lg hover:bg-white/5 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-[#d4af37] text-[#0c0b09] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#e8c874] transition-colors disabled:opacity-50"
                >
                  <Save size={16} /> {isSubmitting ? 'Menyimpan...' : editId ? 'Update' : 'Buat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL JATUH TEMPO */}
      {isJatuhTempoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#161513] border border-[#363024] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-[#363024]">
              <h3 className="text-lg font-bold text-[#f2ead9]">Set Jatuh Tempo</h3>
              <button
                onClick={() => setIsJatuhTempoModalOpen(false)}
                className="text-[#888] hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleJatuhTempoSubmit}>
              <div className="p-6">
                <label className="block text-sm text-orange-400 mb-2">Tanggal Jatuh Tempo</label>
                <input
                  type="date"
                  value={jatuhTempoData.jatuhTempo}
                  onChange={(e) => setJatuhTempoData({ ...jatuhTempoData, jatuhTempo: e.target.value })}
                  required
                  className="w-full bg-[#0c0b09] border border-orange-500/30 rounded-lg px-3 py-3 text-white text-sm focus:border-orange-500 outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#363024]">
                <button
                  type="button"
                  onClick={() => setIsJatuhTempoModalOpen(false)}
                  className="px-5 py-2.5 text-[#888] hover:text-white font-medium rounded-lg hover:bg-white/5 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-orange-500 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PembayaranMaterialPage;
