import { useState, useEffect, useMemo, useCallback } from 'react';
import { Banknote, Plus, Search, Save, X, Edit2, Wrench, RotateCcw, AlertCircle, Printer } from 'lucide-react';
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

const statusBadge = (status) => {
  const map = {
    PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    PARTIAL: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    PAID: 'bg-green-500/10 text-green-400 border-green-500/30',
    BELUM_BAYAR: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    BON: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    LUNAS: 'bg-green-500/10 text-green-400 border-green-500/30',
  };
  return map[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/30';
};

const statusLabel = (status) => {
  if (status === 'BELUM_BAYAR') return 'Belum Bayar';
  if (status === 'BON') return 'BON';
  if (status === 'LUNAS') return 'Lunas';
  if (status === 'PENDING') return 'Belum Bayar';
  if (status === 'PARTIAL') return 'Sebagian / Tempo';
  if (status === 'PAID') return 'Lunas';
  return status || '-';
};

const normalizeApprovalStatus = (status) => {
  const s = String(status || '').toUpperCase();
  if (s === 'PENDING' || s === 'MENUNGGU_FINANCE') return 'PENDING';
  if (s === 'APPROVED_FINANCE') return 'APPROVED_FINANCE';
  if (s === 'APPROVED' || s === 'APPROVED_ATASAN') return 'APPROVED';
  if (s === 'REJECTED') return 'REJECTED';
  return s;
};

const hasPaymentAction = (p) => {
  if (!p) return false;
  const entries = Array.isArray(p.paymentHistory?.entries)
    ? p.paymentHistory.entries
    : Array.isArray(p.paymentHistory)
      ? p.paymentHistory
      : [];
  return entries.length > 0 || Number(p.totalTerbayar || 0) > 0 || Number(p.jumlahBayar || 0) > 0;
};

const approvalBadge = (approvalStatus, isPostedKasBank, record) => {
  if (isPostedKasBank) return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40';
  const normalized = normalizeApprovalStatus(approvalStatus);
  if (normalized === 'REJECTED') return 'bg-red-500/10 text-red-400 border-red-500/30';
  if (!hasPaymentAction(record)) return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30';
  const map = {
    PENDING: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    APPROVED_FINANCE: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    APPROVED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40',
  };
  return map[normalized] || 'bg-gray-500/10 text-gray-300 border-gray-500/30';
};

const approvalLabel = (approvalStatus, isPostedKasBank, record) => {
  if (isPostedKasBank) return 'Terkirim Kas/Bank';
  const normalized = normalizeApprovalStatus(approvalStatus);
  if (normalized === 'REJECTED') return 'Ditolak';
  if (!hasPaymentAction(record)) return 'Pending';
  if (normalized === 'PENDING') return 'Menunggu Finance';
  if (normalized === 'APPROVED_FINANCE') return 'Menunggu Atasan';
  if (normalized === 'APPROVED') return 'Disetujui Atasan (Siap Kirim)';
  return normalized || '-';
};

const METODE_BAYAR = ['TRANSFER', 'CASH', 'CEK', 'GIRO', 'TEMPO'];

const normalizePct = (n) => {
  const num = Number(n || 0);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.min(num, 100));
};

const getProgressRecapFromPo = (po) => {
  const rabMap = new Map();
  (po?.items || []).forEach((it) => {
    const rab = it?.rabItem;
    if (!rab?.id) return;

    if (!rabMap.has(rab.id)) {
      rabMap.set(rab.id, {
        id: rab.id,
        name: rab.name || it.description || '-',
        poItemTotal: Number(it.total || 0),
        progressPercent: 0,
      });
    } else {
      rabMap.get(rab.id).poItemTotal += Number(it.total || 0);
    }

    const row = rabMap.get(rab.id);
    const accum = (rab.dailyProgress || []).reduce(
      (sum, dp) => sum + Number(dp.progressPercent || 0),
      0,
    );
    row.progressPercent = normalizePct(Math.max(row.progressPercent, accum));
  });

  const rows = [...rabMap.values()].map((r) => ({
    ...r,
    maxByRow: Number(r.poItemTotal || 0) * (Number(r.progressPercent || 0) / 100),
  }));

  const progressCap = rows.reduce((sum, r) => sum + Number(r.maxByRow || 0), 0);
  return { rows, progressCap };
};

const PembayaranSupplierPage = () => {
  const [pembayarans, setPembayarans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [joProgressData, setJoProgressData] = useState(null);
  const [printingId, setPrintingId] = useState(null);

  const handlePrintInvoice = async (id) => {
    try {
      setPrintingId(id);
      await purchasingService.printInvoiceSupplier(id);
    } catch (err) {
      toast.error(err.message || 'Gagal mencetak invoice jasa');
    } finally {
      setPrintingId(null);
    }
  };

  const [jasaList, setJasaList] = useState([]);
  const [pos, setPOs] = useState([]);
  const [rekeningBanks, setRekeningBanks] = useState([]);
  const [tipeRekeningList, setTipeRekeningList] = useState([]);

  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    flowType: 'JASA',
    supplierId: '',
    jasaId: '',
    pengajuanId: '',
    poId: '',
    totalTagihan: '',
    jumlah: '',
    metode: 'TRANSFER',
    status: 'BELUM_BAYAR',
    keterangan: '',
    tanggal: new Date().toISOString().split('T')[0],
    jatuhTempo: '',
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
      setPembayarans(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Gagal memuat data pembayaran');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMasters = useCallback(async () => {
    try {
      const [jasaData, poData, rekeningRes, tipeRekeningRes] = await Promise.all([
        poService.getJasa({ onlyActive: true }),
        poService.getPOs(),
        glBankService.getRekeningBank({ activeOnly: 1 }),
        glBankService.getTipeRekening({ isActive: 1 }),
      ]);
      setJasaList(Array.isArray(jasaData) ? jasaData : []);
      setPOs(Array.isArray(poData) ? poData : []);
      setRekeningBanks(Array.isArray(rekeningRes?.data) ? rekeningRes.data : []);
      setTipeRekeningList(
        Array.isArray(tipeRekeningRes?.data) ? tipeRekeningRes.data : [],
      );
    } catch (err) {
      console.error('Gagal memuat master data:', err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPembayarans();
    fetchMasters();
  }, [fetchPembayarans, fetchMasters]);

  const jasaRows = useMemo(
    () =>
      (pembayarans || []).filter(
        (p) =>
          (p?.purchaseOrder?.kategoriPO === 'JASA' || !!p?.jasaId || !!p?.jasa) &&
          (p.pengajuan?.status === 'APPROVED' || (!p.pengajuan && p.purchaseOrder?.status === 'APPROVED')),
      ),
    [pembayarans],
  );

  const projectOptions = useMemo(() => {
    const projs = new Map();
    jasaRows.forEach(p => {
      const proj = p.purchaseOrder?.project;
      if (proj && proj.id) {
        projs.set(proj.id, proj.name);
      }
    });
    return Array.from(projs.entries()).map(([id, name]) => ({ id, name }));
  }, [jasaRows]);

  const filtered = useMemo(() => {
    let result = jasaRows;
    if (filterProject) {
      result = result.filter(p => p.purchaseOrder?.project?.id === filterProject);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => {
        const jasaName = p.jasa?.nama || p.purchaseOrder?.jasa?.nama || '';
        return (
          p.noPembayaran?.toLowerCase().includes(q) ||
          p.keterangan?.toLowerCase().includes(q) ||
          jasaName.toLowerCase().includes(q) ||
          p.purchaseOrder?.poNumber?.toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [search, jasaRows, filterProject]);


  const poOptions = useMemo(
    () => (pos || []).filter((p) => p?.kategoriPO === 'JASA' || !!p?.jasaId || !!p?.jasa),
    [pos],
  );

  const selectedPo = useMemo(
    () => poOptions.find((p) => p.id === formData.poId) || null,
    [poOptions, formData.poId],
  );

  const progressRecap = useMemo(
    () => getProgressRecapFromPo(selectedPo),
    [selectedPo],
  );

  const totalSudahDibayar = useMemo(() => {
    if (!formData.poId) return 0;
    return (pembayarans || [])
      .filter((p) => p.poId === formData.poId && p.id !== editId)
      .reduce((sum, p) => sum + Number(p.totalTerbayar || p.jumlahBayar || 0), 0);
  }, [pembayarans, formData.poId, editId]);

  const maxByProgress = useMemo(() => {
    const sisaByProgress = Math.max(0, progressRecap.progressCap - totalSudahDibayar);
    const totalTagihanNum = Number(formData.totalTagihan || 0);
    if (totalTagihanNum <= 0) return sisaByProgress;
    const sisaTagihan = Math.max(0, totalTagihanNum - totalSudahDibayar);
    return Math.min(sisaTagihan, sisaByProgress);
  }, [formData.totalTagihan, progressRecap.progressCap, totalSudahDibayar]);


  const effectiveMaxBayar = useMemo(() => {
    if (joProgressData && typeof joProgressData.sisaPlafonBayar === 'number') {
      return Math.max(0, joProgressData.sisaPlafonBayar);
    }
    return maxByProgress;
  }, [joProgressData, maxByProgress]);

  const openModal = (pembayaran = null) => {
    if (pembayaran) {
      setEditId(pembayaran.id);
      const isRejected = pembayaran.approvalStatus === 'REJECTED';
      const entries = Array.isArray(pembayaran.paymentHistory)
        ? pembayaran.paymentHistory
        : Array.isArray(pembayaran.paymentHistory?.entries)
          ? pembayaran.paymentHistory.entries
          : [];
      const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;

      setFormData({
        flowType: 'JASA',
        supplierId: '',
        jasaId: pembayaran.jasaId || pembayaran.purchaseOrder?.jasaId || '',
        pengajuanId: pembayaran.pengajuanId || '',
        poId: pembayaran.poId || '',
        totalTagihan: pembayaran.totalTagihan || '',
        jumlah: isRejected && lastEntry?.jumlah ? String(lastEntry.jumlah) : '',
        metode: (isRejected && lastEntry?.metodeBayar) || pembayaran.metodeBayar || pembayaran.metode || 'TRANSFER',
        status: pembayaran.status || 'BELUM_BAYAR',
        keterangan: (isRejected && lastEntry?.keterangan) || pembayaran.keterangan || '',
        tanggal: pembayaran.tanggal
          ? new Date(pembayaran.tanggal).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        jatuhTempo: pembayaran.jatuhTempo
          ? new Date(pembayaran.jatuhTempo).toISOString().split('T')[0]
          : '',
        tanggalBayar: pembayaran.tanggalBayar
          ? new Date(pembayaran.tanggalBayar).toISOString().split('T')[0]
          : '',
        rekeningBankId: (isRejected && lastEntry?.rekeningBankId) || pembayaran.rekeningBankId || '',
        tipeRekeningId:
          (isRejected && lastEntry?.tipeRekeningId) || pembayaran.tipeRekeningId || pembayaran.rekeningBank?.tipeRekeningId || '',
        tambahPembayaran: true,
      });
    } else {
      setEditId(null);
      setJoProgressData(null);
      setFormData({
        flowType: 'JASA',
        supplierId: '',
        jasaId: '',
        pengajuanId: '',
        poId: '',
        totalTagihan: '',
        jumlah: '',
        metode: 'TRANSFER',
        status: 'BELUM_BAYAR',
        keterangan: '',
        tanggal: new Date().toISOString().split('T')[0],
        jatuhTempo: '',
        tanggalBayar: '',
        rekeningBankId: '',
        tipeRekeningId: '',
        tambahPembayaran: true,
      });
    }
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!selectedPo) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData((prev) => ({
      ...prev,
      jasaId: prev.jasaId || selectedPo.jasaId || '',
      totalTagihan:
        prev.totalTagihan ||
        Number(selectedPo.grandTotal || selectedPo.subTotal || 0) ||
        '',
      metode: prev.metode || (selectedPo.caraPembayaran || 'TRANSFER'),
      status: prev.status || 'BELUM_BAYAR',
    }));
  }, [selectedPo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.jasaId) {
      toast.error('Jasa wajib diisi');
      return;
    }

    const jumlahNominal = Number(String(formData.jumlah || 0).replace(/\D/g, '') || 0);
    if (jumlahNominal < 0) {
      toast.error('Jumlah bayar tidak valid');
      return;
    }

    if (jumlahNominal > effectiveMaxBayar) {
      toast.error(`Nominal bayar melebihi batas progress JO saat ini (${fmtRp(effectiveMaxBayar)})`);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      supplierId: null,
      jasaId: formData.jasaId,
      pengajuanId: formData.pengajuanId || null,
      poId: formData.poId || null,
      totalTagihan: Number(formData.totalTagihan || 0),
      jumlahBayar: jumlahNominal,
      metodeBayar: formData.metode,
      status: formData.status,
      keterangan: formData.keterangan,
      tanggal: formData.tanggal,
      jatuhTempo: formData.jatuhTempo || null,
      tanggalBayar: formData.tanggalBayar || null,
      tipeAkunKasBank: formData.rekeningBankId ? 'BANK' : 'KAS',
      rekeningBankId: formData.rekeningBankId || null,
      tipeRekeningId: formData.tipeRekeningId || null,
      tambahPembayaran: Boolean(formData.tambahPembayaran),
      isRevisi: editId && pembayarans.find((p) => p.id === editId)?.approvalStatus === 'REJECTED',
    };

    try {
      if (editId) {
        await purchasingService.updatePembayaran(editId, payload);
        toast.success('Invoice jasa berhasil diupdate');
      } else {
        await purchasingService.createPembayaran(payload);
        toast.success('Invoice jasa berhasil dibuat & masuk ke Pembayaran Finance');
      }
      setIsModalOpen(false);
      fetchPembayarans();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan invoice jasa');
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
            <p className="text-[#888] text-xs uppercase tracking-wider mb-1">Finance</p>
            <h2 className="text-2xl md:text-3xl text-[#f2ead9] font-bold">Invoice Jasa</h2>
            <p className="text-[#888] text-sm mt-1">
              Daftar invoice &amp; SPK/JO Jasa dan Subkon. Tagihan yang dicatat akan masuk ke antrean Pembayaran Finance untuk verifikasi dan persetujuan.
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-[#d4af37] text-[#0c0b09] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#e8c874] transition-colors w-fit"
          >
            <Plus size={18} /> Catat Invoice Jasa
          </button>
        </div>

        <div className="mb-4 flex flex-col md:flex-row gap-3 items-center">
          <div className="relative w-full md:w-96">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
            <input
              type="text"
              placeholder="Cari no pembayaran / jasa / proyek..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1a1814] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#666] focus:border-[#d4af37] outline-none"
            />
          </div>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="w-full md:w-64 bg-[#1a1814] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-white focus:border-[#d4af37] outline-none"
          >
            <option value="">Semua Proyek</option>
            {projectOptions.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#22201c] text-[#888] text-left">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">No Pembayaran</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Jasa</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Proyek</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Item Pekerjaan</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap text-green-400">Tgl Bayar</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Total Tagihan</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Total Terbayar</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Sisa</th>
                  <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Status Approval</th>
                  <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Status Bayar</th>
                  <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="text-center py-10 text-[#888]">Memuat data...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-10 text-[#888]">Belum ada data pembayaran</td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="border-t border-[#2a2a2a] hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="text-white font-medium font-mono text-sm">
                          {p.noPembayaran || '-'}
                        </div>
                        <div className="text-[10px] text-[#888] mt-0.5">
                          Diinput: <span className="text-[#d4af37]">{p.paymentHistory?.entries?.[p.paymentHistory?.entries?.length - 1]?.createdByName || p.createdByName || p.createdBy?.name || '-'}</span>
                        </div>
                        {p.purchaseOrder?.poNumber && (
                          <div className="text-[10px] text-[#38bdf8] mt-0.5 font-mono">
                            PO: {p.purchaseOrder.poNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#ccc]">
                        <div className="inline-flex items-center gap-1.5">
                          <Wrench size={12} className="text-cyan-300" />
                          {p.jasa?.nama || p.purchaseOrder?.jasa?.nama || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.purchaseOrder?.project?.name ? (
                          <span className="text-[11px] text-[#aaa] bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                            {p.purchaseOrder.project.name}
                          </span>
                        ) : (
                          <span className="text-[#444] text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#888] text-xs">
                        {p.purchaseOrder?.items?.map(it => it.description).join(', ') || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {p.tanggalBayar ? (
                          <span className="text-green-400 font-semibold">{fmtTgl(p.tanggalBayar)}</span>
                        ) : (
                          <span className="text-[#666] italic">Belum Bayar</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-[#ccc] font-mono whitespace-nowrap">{fmtRp(p.totalTagihan || 0)}</td>
                      <td className="px-4 py-3 text-right text-[#d4af37] font-mono whitespace-nowrap">{fmtRp(p.totalTerbayar ?? p.jumlahBayar ?? 0)}</td>
                      <td className="px-4 py-3 text-right text-[#ccc] font-mono whitespace-nowrap">{fmtRp(p.sisaBayar ?? 0)}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold border ${approvalBadge(p.approvalStatus || 'PENDING', p.isPostedKasBank, p)}`}
                        >
                          {approvalLabel(p.approvalStatus || 'PENDING', p.isPostedKasBank, p)}
                        </span>
                        {p.approvalStatus === 'REJECTED' && p.rejectReason && (
                          <div className="text-[10px] text-red-400 mt-0.5 truncate max-w-[120px] mx-auto" title={p.rejectReason}>
                            {p.rejectReason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge(p.status)}`}>
                          {statusLabel(p.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {p.approvalStatus === 'REJECTED' ? (
                            <button
                              onClick={() => openModal(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-300 bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 rounded transition-colors"
                              title="Revisi Pembayaran Jasa"
                            >
                              <RotateCcw size={12} /> Revisi
                            </button>
                          ) : (
                            <button
                              onClick={() => openModal(p)}
                              className="p-1.5 text-[#888] hover:text-[#d4af37] bg-white/5 hover:bg-white/10 rounded transition-colors"
                              title="Update Pembayaran Jasa"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}

                          {(() => {
                            const canPrint = p.approvalStatus === 'APPROVED' || p.approvalStatus === 'APPROVED_ATASAN' || p.isPostedKasBank;
                            return (
                              <button
                                onClick={() => canPrint && handlePrintInvoice(p.id)}
                                disabled={!canPrint || printingId === p.id}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
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
                                <Printer size={13} />
                                {printingId === p.id ? '...' : 'Cetak'}
                              </button>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Banknote size={20} className="text-[#d4af37]" />
                {editId ? 'Update Pembayaran Jasa' : 'Bayar Jasa'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#888] hover:text-white">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto">
              <div className="px-6 py-4 space-y-4">
                {editId && pembayarans.find((p) => p.id === editId)?.approvalStatus === 'REJECTED' && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 flex gap-2.5 items-start">
                    <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-red-300">
                      <div className="font-semibold text-red-200">Tagihan Jasa Sebelumnya Ditolak</div>
                      <div className="mt-0.5 text-red-300/90">
                        Alasan: <strong className="text-red-100">{pembayarans.find((p) => p.id === editId)?.rejectReason || 'Silakan sesuaikan data pembayaran.'}</strong>
                      </div>
                      <p className="mt-1 text-[11px] text-red-200/80">
                        Silakan perbaiki nominal atau informasi pembayaran di bawah. Setelah disimpan, status akan berubah kembali menjadi <strong>Menunggu Finance</strong>.
                      </p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#888] mb-1">Nama Jasa *</label>
                    <select
                      value={formData.jasaId}
                      onChange={(e) => setFormData({ ...formData, jasaId: e.target.value })}
                      required
                      className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none"
                    >
                      <option value="" disabled>-- Pilih Jasa --</option>
                      {jasaList.map((j) => (
                        <option key={j.id} value={j.id}>{j.nama}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-[#888] mb-1">PO Jasa</label>
                    <select
                      value={formData.poId}
                      onChange={(e) => setFormData({ ...formData, poId: e.target.value })}
                      className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none"
                    >
                      <option value="">-- Pilih PO Jasa --</option>
                      {poOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.poNumber || `PO-${p.id.slice(0, 8)}`} {p.jasa?.nama ? `- ${p.jasa.nama}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#888] mb-1">Total Tagihan (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.totalTagihan}
                      onChange={(e) => setFormData({ ...formData, totalTagihan: e.target.value })}
                      placeholder="0"
                      className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#888] mb-1">Status Pembayaran</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none"
                    >
                      <option value="BELUM_BAYAR">Belum Bayar</option>
                      <option value="BON">BON</option>
                      <option value="LUNAS">Lunas</option>
                    </select>
                  </div>
                </div>

                {selectedPo && (
                  <div className="bg-[#22201c] border border-[#2a2a2a] rounded-lg p-3">
                    <div className="text-xs text-[#d4af37] font-semibold mb-2">Joint Opname · Progress Rekap</div>
                    {progressRecap.rows.length === 0 ? (
                      <p className="text-xs text-[#777]">Belum ada progress JO untuk item RAP PO ini.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-[#888] border-b border-white/10">
                              <th className="text-left py-1">Baris Pekerjaan</th>
                              <th className="text-right py-1">Progress Akumulasi</th>
                              <th className="text-right py-1">Maks Bayar</th>
                            </tr>
                          </thead>
                          <tbody>
                            {progressRecap.rows.map((r) => (
                              <tr key={r.id} className="border-b border-white/5">
                                <td className="py-1 text-[#ddd]">{r.name}</td>
                                <td className="py-1 text-right text-[#ccc]">{Number(r.progressPercent || 0).toFixed(2)}%</td>
                                <td className="py-1 text-right text-[#d4af37]">{fmtRp(r.maxByRow)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="mt-2 text-xs text-[#cbd5e1]">
                      Hard block maksimum bayar saat ini: <strong>{fmtRp(maxByProgress)}</strong>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#888] mb-1">Item Pekerjaan</label>
                    <input
                      type="text"
                      value={selectedPo?.items?.map(it => it.description || it.rabItem?.name).join(', ') || ''}
                      readOnly
                      className="w-full bg-[#1a1814] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#888] text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-green-400 mb-1">Tanggal Bayar</label>
                    <input
                      type="date"
                      value={formData.tanggalBayar}
                      onChange={(e) => setFormData({ ...formData, tanggalBayar: e.target.value })}
                      className="w-full bg-[#0c0b09] border border-green-500/30 rounded-lg px-3 py-2.5 text-white text-sm focus:border-green-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-sm text-[#888] mb-1">Tipe Rekening</label>
                  <select
                    value={formData.tipeRekeningId}
                    onChange={(e) => setFormData({ ...formData, tipeRekeningId: e.target.value })}
                    className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none"
                  >
                    <option value="">-- Pilih Tipe Rekening --</option>
                    {tipeRekeningList.map((t) => (
                      <option key={t.id} value={t.id}>{t.namaTipe}</option>
                    ))}
                  </select>
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
                    Tambah cicilan / pelunasan baru (otomatis posting ke Buku Besar)
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
                  {/* KOTAK INFORMASI JO & PLAFON */}
                  <div className="bg-[#14120e] border border-[#2a2a2a] rounded-xl p-3 mb-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-2">
                      <span className="text-[#888]">Progress Join Opname (JO):</span>
                      <span className="text-cyan-300 font-bold font-mono">
                        {joProgressData ? `${joProgressData.progressJoPercent}%` : `${progressRecap.rows?.[0]?.progressPercent || 0}%`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[#aaa]">
                      <div>Total Tagihan: <b className="text-white font-mono">{fmtRp(formData.totalTagihan)}</b></div>
                      <div>Plafon JO Kumulatif: <b className="text-white font-mono">{fmtRp(joProgressData ? joProgressData.maxPlafonBayar : progressRecap.progressCap)}</b></div>
                      <div>Sudah Terbayar: <b className="text-amber-300 font-mono">{fmtRp(joProgressData ? joProgressData.totalTerbayar : totalSudahDibayar)}</b></div>
                      <div>Maks Boleh Dibayar: <b className="text-emerald-400 font-mono">{fmtRp(effectiveMaxBayar)}</b></div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                      <span className="text-[#888]">Status Pembayaran Ini:</span>
                      <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {Number(formData.jumlah || 0) + (joProgressData ? joProgressData.totalTerbayar : totalSudahDibayar) >= Number(formData.totalTagihan || 0) && Number(formData.totalTagihan || 0) > 0
                          ? 'LUNAS'
                          : 'BON (Cicilan JO)'}
                      </span>
                    </div>
                  </div>
                  {effectiveMaxBayar <= 0 ? (
                    <p className="text-xs text-red-400 mt-1 font-semibold">
                      Tidak bisa melakukan pembayaran lagi. Harap tunggu progress Joint Opname lapangan meningkat.
                    </p>
                  ) : Number(formData.jumlah || 0) > effectiveMaxBayar ? (
                    <p className="text-xs text-red-400 mt-1 font-semibold">
                      Nominal melebihi sisa plafon JO ({fmtRp(effectiveMaxBayar)})!
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">Keterangan</label>
                  <textarea
                    value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    rows={2}
                    placeholder="Keterangan pembayaran jasa..."
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
                  disabled={isSubmitting || effectiveMaxBayar <= 0 || Number(formData.jumlah || 0) > effectiveMaxBayar}
                  className="flex items-center gap-2 bg-[#d4af37] text-[#0c0b09] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#e8c874] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} /> {isSubmitting ? 'Menyimpan...' : editId ? 'Update' : 'Buat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PembayaranSupplierPage;
