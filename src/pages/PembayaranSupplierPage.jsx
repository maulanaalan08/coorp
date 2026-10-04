import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Banknote, Plus, Search, Save, X, Edit2, Wrench } from 'lucide-react';
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [suppliers, setSuppliers] = useState([]);
  const [jasaList, setJasaList] = useState([]);
  const [pengajuans, setPengajuans] = useState([]);
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
      const [supData, jasaData, pjData, poData, rekeningRes, tipeRekeningRes] =
        await Promise.all([
          poService.getSuppliers(),
          poService.getJasa({ onlyActive: true }),
          purchasingService.getPengajuanBayar(),
          poService.getPOs(),
          glBankService.getRekeningBank({ activeOnly: 1 }),
          glBankService.getTipeRekening({ isActive: 1 }),
        ]);
      setSuppliers(Array.isArray(supData) ? supData : []);
      setJasaList(Array.isArray(jasaData) ? jasaData : []);
      setPengajuans(Array.isArray(pjData) ? pjData : []);
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
    fetchPembayarans();
    fetchMasters();
  }, [fetchPembayarans, fetchMasters]);

  const jasaRows = useMemo(
    () =>
      (pembayarans || []).filter(
        (p) => p?.purchaseOrder?.kategoriPO === 'JASA' || !!p?.jasaId || !!p?.jasa,
      ),
    [pembayarans],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return jasaRows;
    const q = search.toLowerCase();
    return jasaRows.filter((p) => {
      const jasaName = p.jasa?.nama || p.purchaseOrder?.jasa?.nama || '';
      return (
        p.noPembayaran?.toLowerCase().includes(q) ||
        p.keterangan?.toLowerCase().includes(q) ||
        jasaName.toLowerCase().includes(q) ||
        p.purchaseOrder?.poNumber?.toLowerCase().includes(q)
      );
    });
  }, [search, jasaRows]);


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

  const openModal = (pembayaran = null) => {
    if (pembayaran) {
      setEditId(pembayaran.id);
      setFormData({
        flowType: 'JASA',
        supplierId: '',
        jasaId: pembayaran.jasaId || pembayaran.purchaseOrder?.jasaId || '',
        pengajuanId: pembayaran.pengajuanId || '',
        poId: pembayaran.poId || '',
        totalTagihan: pembayaran.totalTagihan || '',
        jumlah: '',
        metode: pembayaran.metodeBayar || pembayaran.metode || 'TRANSFER',
        status: pembayaran.status || 'BELUM_BAYAR',
        keterangan: pembayaran.keterangan || '',
        tanggal: pembayaran.tanggal
          ? new Date(pembayaran.tanggal).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        jatuhTempo: pembayaran.jatuhTempo
          ? new Date(pembayaran.jatuhTempo).toISOString().split('T')[0]
          : '',
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

    if (jumlahNominal > maxByProgress) {
      toast.error(`Nominal bayar melebihi batas progress JO saat ini (${fmtRp(maxByProgress)})`);
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
    };

    try {
      if (editId) {
        await purchasingService.updatePembayaran(editId, payload);
        toast.success('Pembayaran jasa berhasil diupdate');
      } else {
        await purchasingService.createPembayaran(payload);
        toast.success('Pembayaran jasa berhasil dibuat');
      }
      setIsModalOpen(false);
      fetchPembayarans();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan pembayaran jasa');
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
            <h2 className="text-2xl md:text-3xl text-[#f2ead9] font-bold">Pembayaran Jasa</h2>
            <p className="text-[#888] text-sm mt-1">
              Daftar pembayaran jasa (status: Belum Bayar, BON, Lunas). Nomor pembayaran ter-generate saat aksi pembayaran/update.
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-[#d4af37] text-[#0c0b09] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#e8c874] transition-colors w-fit"
          >
            <Plus size={18} /> Buat Pembayaran Jasa
          </button>
        </div>

        <div className="mb-4 relative w-full md:w-96">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
          <input
            type="text"
            placeholder="Cari no pembayaran / jasa / proyek..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1a1814] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#666] focus:border-[#d4af37] outline-none"
          />
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
                  <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Status</th>
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
                    <td colSpan={10} className="text-center py-10 text-[#888]">Belum ada data pembayaran</td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="border-t border-[#2a2a2a] hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="text-white font-medium font-mono text-sm">
                          {p.noPembayaran || '-'}
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
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge(p.status)}`}>
                          {statusLabel(p.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openModal(p)}
                          className="p-1.5 text-[#888] hover:text-[#d4af37] bg-white/5 hover:bg-white/10 rounded transition-colors"
                          title="Update Pembayaran Jasa"
                        >
                          <Edit2 size={14} />
                        </button>
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
                    <label className="block text-sm text-[#888] mb-1">Tgl Buat Form</label>
                    <input
                      type="date"
                      value={formData.tanggal}
                      onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                      required
                      className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none"
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
                  {maxByProgress <= 0 ? (
                    <p className="text-xs text-red-400 mt-1 font-semibold">
                      Tidak bisa melakukan pembayaran lagi. Harap tunggu progress Joint Opname meningkat.
                    </p>
                  ) : (
                    <p className="text-xs text-[#666] mt-1">Hard block by JO progress: maks {fmtRp(maxByProgress)}</p>
                  )}
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
                  disabled={isSubmitting || maxByProgress <= 0}
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
