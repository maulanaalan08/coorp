import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Banknote, Plus, Search, Save, X } from 'lucide-react';
import Header from '../components/Header';
import { purchasingService } from '../services/purchasingService';
import { poService } from '../services/poService';
import toast from 'react-hot-toast';

const fmtRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const statusBadge = (status) => {
  const map = {
    PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    PAID: 'bg-green-500/10 text-green-400 border-green-500/30',
  };
  return map[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/30';
};

const METODE_BAYAR = ['TRANSFER', 'CASH', 'CEK', 'GIRO'];

const PembayaranSupplierPage = () => {
  const [pembayarans, setPembayarans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [pengajuans, setPengajuans] = useState([]);
  const [pos, setPOs] = useState([]);
  const [formData, setFormData] = useState({
    supplierId: '',
    pengajuanId: '',
    poId: '',
    jumlah: '',
    metode: 'TRANSFER',
    keterangan: '',
    tanggal: new Date().toISOString().split('T')[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPembayarans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await purchasingService.getPembayaranSupplier();
      setPembayarans(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Gagal memuat data pembayaran supplier');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMasters = useCallback(async () => {
    try {
      const [supData, pjData, poData] = await Promise.all([
        poService.getSuppliers(),
        purchasingService.getPengajuanBayar(),
        poService.getPOs(),
      ]);
      setSuppliers(Array.isArray(supData) ? supData : []);
      setPengajuans(Array.isArray(pjData) ? pjData : []);
      setPOs(Array.isArray(poData) ? poData : []);
    } catch (err) {
      console.error('Gagal memuat master data:', err);
    }
  }, []);

  useEffect(() => {
    fetchPembayarans();
    fetchMasters();
  }, [fetchPembayarans, fetchMasters]);

  const filtered = useMemo(() => {
    if (!search.trim()) return pembayarans;
    const q = search.toLowerCase();
    return pembayarans.filter((p) =>
      p.noPembayaran?.toLowerCase().includes(q) ||
      p.supplier?.name?.toLowerCase().includes(q)
    );
  }, [pembayarans, search]);

  const openModal = () => {
    setFormData({
      supplierId: '',
      pengajuanId: '',
      poId: '',
      jumlah: '',
      metode: 'TRANSFER',
      keterangan: '',
      tanggal: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplierId || !formData.jumlah) {
      toast.error('Supplier dan jumlah wajib diisi');
      return;
    }
    setIsSubmitting(true);
    try {
      await purchasingService.createPembayaran({
        supplierId: formData.supplierId,
        pengajuanId: formData.pengajuanId ? formData.pengajuanId : null,
        poId: formData.poId ? formData.poId : null,
        jumlah: Number(formData.jumlah),
        metode: formData.metode,
        keterangan: formData.keterangan,
        tanggal: formData.tanggal,
      });
      toast.success('Pembayaran berhasil dibuat!');
      setIsModalOpen(false);
      fetchPembayarans();
    } catch (err) {
      toast.error(err.message || 'Gagal membuat pembayaran');
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
            <p className="text-[#888] text-xs uppercase tracking-wider mb-1">Purchasing</p>
            <h2 className="text-2xl md:text-3xl text-[#f2ead9] font-bold">Pembayaran Supplier</h2>
            <p className="text-[#888] text-sm mt-1">Riwayat pembayaran ke supplier.</p>
          </div>
          <button onClick={openModal} className="flex items-center gap-2 bg-[#d4af37] text-[#0c0b09] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#e8c874] transition-colors w-fit">
            <Plus size={18} /> Bayar Supplier
          </button>
        </div>

        <div className="mb-4 relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
          <input type="text" placeholder="Cari no pembayaran / supplier..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-[#1a1814] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#666] focus:border-[#d4af37] outline-none" />
        </div>

        <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#22201c] text-[#888] text-left">
                  <th className="px-4 py-3 font-semibold">No Pembayaran</th>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold text-right">Jumlah Bayar</th>
                  <th className="px-4 py-3 font-semibold text-center">Metode</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-[#888]">Memuat data...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-[#888]">Belum ada pembayaran</td></tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="border-t border-[#2a2a2a] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white font-medium">{p.noPembayaran || `PAY-${p.id}`}</td>
                      <td className="px-4 py-3 text-[#ccc]">{p.supplier?.name || p.supplierName || '-'}</td>
                      <td className="px-4 py-3 text-[#888]">{p.tanggal ? new Date(p.tanggal).toLocaleDateString('id-ID') : '-'}</td>
                      <td className="px-4 py-3 text-right text-[#ccc]">{fmtRp(p.jumlah)}</td>
                      <td className="px-4 py-3 text-center text-[#ccc]">{p.metode || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge(p.status)}`}>{p.status || 'PENDING'}</span>
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
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Banknote size={20} className="text-[#d4af37]" /> Bayar Supplier</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#888] hover:text-white"><X size={22} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">Supplier</label>
                  <select value={formData.supplierId} onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })} required className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none">
                    <option value="" disabled>-- Pilih Supplier --</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#888] mb-1">Pengajuan Bayar (opsional)</label>
                  <select value={formData.pengajuanId} onChange={(e) => setFormData({ ...formData, pengajuanId: e.target.value })} className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none">
                    <option value="">-- Pilih Pengajuan --</option>
                    {pengajuans.filter((pj) => !formData.supplierId || String(pj.supplierId) === formData.supplierId).map((pj) => (
                      <option key={pj.id} value={pj.id}>{pj.noPengajuan || `PJ-${pj.id}`} - {fmtRp(pj.totalTagihan)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#888] mb-1">Purchase Order (opsional)</label>
                  <select value={formData.poId} onChange={(e) => setFormData({ ...formData, poId: e.target.value })} className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none">
                    <option value="">-- Pilih PO --</option>
                    {pos.map((p) => <option key={p.id} value={p.id}>{p.poNumber || `PO-${p.id}`}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#888] mb-1">Tanggal</label>
                  <input type="date" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })} required className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#888] mb-1">Jumlah Bayar (Rp)</label>
                    <input type="number" min="0" value={formData.jumlah} onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })} required placeholder="0" className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-[#888] mb-1">Metode Bayar</label>
                    <select value={formData.metode} onChange={(e) => setFormData({ ...formData, metode: e.target.value })} className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none">
                      {METODE_BAYAR.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[#888] mb-1">Keterangan</label>
                  <textarea value={formData.keterangan} onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })} rows={2} placeholder="Keterangan tambahan..." className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none resize-none" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#2a2a2a]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-[#888] hover:text-white font-medium rounded-lg hover:bg-white/5 transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-[#d4af37] text-[#0c0b09] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#e8c874] transition-colors disabled:opacity-50">
                  <Save size={16} /> {isSubmitting ? 'Menyimpan...' : 'Bayar'}
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
