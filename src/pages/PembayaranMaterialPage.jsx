import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Banknote, Plus, Search, Save, X, Edit2, CalendarDays } from 'lucide-react';
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

const PembayaranMaterialPage = () => {
  const [pembayarans, setPembayarans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJatuhTempoModalOpen, setIsJatuhTempoModalOpen] = useState(false);
  const [jatuhTempoData, setJatuhTempoData] = useState({ id: null, jatuhTempo: '' });

  const [suppliers, setSuppliers] = useState([]);
  const [pos, setPOs] = useState([]);
  const [rekeningBanks, setRekeningBanks] = useState([]);
  const [tipeRekeningList, setTipeRekeningList] = useState([]);

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
      // Filter only MATERIAL (non-JASA) pembayaran
      const all = Array.isArray(data) ? data : [];
      const materialOnly = all.filter(
        (p) =>
          !p.jasaId &&
          !p.jasa &&
          p.purchaseOrder?.kategoriPO !== 'JASA',
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
      // Only non-jasa POs
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
    pembayarans.forEach(p => {
      const proj = p.purchaseOrder?.project;
      if (proj && proj.id) {
        projs.set(proj.id, proj.name);
      }
    });
    return Array.from(projs.entries()).map(([id, name]) => ({ id, name }));
  }, [pembayarans]);

  const supplierOptions = useMemo(() => {
    const sups = new Map();
    pembayarans.forEach(p => {
      const sup = p.supplier || p.purchaseOrder?.supplier;
      if (sup && sup.id) {
        sups.set(sup.id, sup.name);
      }
    });
    return Array.from(sups.entries()).map(([id, name]) => ({ id, name }));
  }, [pembayarans]);

  const filtered = useMemo(() => {
    let result = pembayarans;
    if (filterProject) {
      result = result.filter(p => p.purchaseOrder?.project?.id === filterProject);
    }
    if (filterSupplier) {
      result = result.filter(p => {
        const supId = p.supplier?.id || p.purchaseOrder?.supplier?.id;
        return supId === filterSupplier;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.noPembayaran?.toLowerCase().includes(q) ||
        p.keterangan?.toLowerCase().includes(q) ||
        p.supplier?.name?.toLowerCase().includes(q) ||
        p.purchaseOrder?.poNumber?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [search, pembayarans, filterProject, filterSupplier]);

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
        toast.success('Pembayaran berhasil diupdate');
      } else {
        await purchasingService.createPembayaran(payload);
        toast.success('Pembayaran berhasil dibuat');
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
        tambahPembayaran: false
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
            <p className="text-[#888] text-xs uppercase tracking-wider mb-1">Finance</p>
            <h2 className="text-2xl md:text-3xl text-[#f2ead9] font-bold">Pembayaran Supplier</h2>
            <p className="text-[#888] text-sm mt-1">
              Daftar pembayaran supplier material &amp; alat. Nomor pembayaran ter-generate saat aksi pembayaran.
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-[#d4af37] text-[#0c0b09] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#e8c874] transition-colors w-fit"
          >
            <Plus size={18} /> Buat Pembayaran
          </button>
        </div>

        <div className="mb-4 flex flex-col md:flex-row gap-3 items-center">
          <div className="relative w-full md:w-80">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
            <input
              type="text"
              placeholder="Cari no pembayaran / supplier / PO..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1a1814] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#666] focus:border-[#d4af37] outline-none"
            />
          </div>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="w-full md:w-56 bg-[#1a1814] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-white focus:border-[#d4af37] outline-none"
          >
            <option value="">Semua Proyek</option>
            {projectOptions.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            className="w-full md:w-56 bg-[#1a1814] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-white focus:border-[#d4af37] outline-none"
          >
            <option value="">Semua Supplier</option>
            {supplierOptions.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#22201c] text-[#888] text-left">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">No Pembayaran</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Supplier</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">No PO</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Tgl Buat</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap text-orange-400">Jatuh Tempo</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap text-green-400">Tgl Bayar</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Total Tagihan</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Total Terbayar</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Sisa</th>
                  <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Metode</th>
                  <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Status</th>
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
                    <td colSpan={11} className="text-center py-10 text-[#888]">Belum ada data pembayaran supplier</td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="border-t border-[#2a2a2a] hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="text-white font-medium font-mono text-sm">
                          {p.noPembayaran || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#ccc]">
                        {p.supplier?.name || p.purchaseOrder?.supplier?.name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {p.purchaseOrder?.poNumber ? (
                          <span className="font-mono text-[#38bdf8] text-xs">{p.purchaseOrder.poNumber}</span>
                        ) : (
                          <span className="text-[#444] text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#888] text-xs whitespace-nowrap">{fmtTgl(p.tanggal)}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {(() => {
                          if (!p.jatuhTempo) return <span className="text-[#666] italic">-</span>;
                          const jt = new Date(p.jatuhTempo);
                          const today = new Date();
                          const diffTime = jt.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          const isWarning = diffDays <= 7 && p.status !== 'PAID' && p.status !== 'LUNAS';
                          return (
                            <div className="flex flex-col">
                              <span className={isWarning ? "text-red-400 font-semibold" : "text-orange-400"}>
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
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {p.tanggalBayar ? (
                          <span className="text-green-400 font-semibold">{fmtTgl(p.tanggalBayar)}</span>
                        ) : (
                          <span className="text-[#666] italic">Belum Bayar</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-[#ccc] font-mono whitespace-nowrap">{fmtRp(p.totalTagihan || p.jumlahBayar || 0)}</td>
                      <td className="px-4 py-3 text-right text-[#d4af37] font-mono whitespace-nowrap">{fmtRp(p.totalTerbayar ?? p.jumlahBayar ?? 0)}</td>
                      <td className="px-4 py-3 text-right text-[#ccc] font-mono whitespace-nowrap">{fmtRp(p.sisaBayar ?? 0)}</td>
                      <td className="px-4 py-3 text-center text-[#ccc] text-xs">{p.metodeBayar || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge(p.status)}`}>
                          {statusLabel(p.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setJatuhTempoData({
                              id: p.id,
                              jatuhTempo: p.jatuhTempo ? p.jatuhTempo.split('T')[0] : ''
                            });
                            setIsJatuhTempoModalOpen(true);
                          }}
                          className="p-1.5 text-[#888] hover:text-orange-400 bg-white/5 hover:bg-white/10 rounded transition-colors"
                          title="Set Jatuh Tempo"
                        >
                          <CalendarDays size={14} />
                        </button>
                        <button
                          onClick={() => openModal(p)}
                          className="p-1.5 text-[#888] hover:text-[#d4af37] bg-white/5 hover:bg-white/10 rounded transition-colors"
                          title="Update Pembayaran"
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
            className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Banknote size={20} className="text-[#d4af37]" />
                {editId ? 'Update Pembayaran' : 'Buat Pembayaran Supplier'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#888] hover:text-white">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto">
              <div className="px-6 py-4 space-y-4">
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

                <div className="grid grid-cols-1 gap-4">
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
                      <option value="BELUM_BAYAR">Belum Bayar</option>
                      <option value="BON">BON</option>
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
