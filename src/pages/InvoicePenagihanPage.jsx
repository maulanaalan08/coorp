import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ReceiptText, Plus, Search, Save, X } from 'lucide-react';
import Header from '../components/Header';
import { purchasingService } from '../services/purchasingService';
import { poService } from '../services/poService';
import toast from 'react-hot-toast';

const fmtRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const statusBadge = (status) => {
  const map = {
    UNPAID: 'bg-red-500/10 text-red-400 border-red-500/30',
    PARTIAL: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    PAID: 'bg-green-500/10 text-green-400 border-green-500/30',
  };
  return map[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/30';
};

const InvoicePenagihanPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [pos, setPOs] = useState([]);
  const [formData, setFormData] = useState({
    supplierId: '',
    poId: '',
    noInvoice: '',
    tanggal: new Date().toISOString().split('T')[0],
    jatuhTempo: '',
    jumlah: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await purchasingService.getInvoicePenagihan();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Gagal memuat data invoice penagihan');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMasters = useCallback(async () => {
    try {
      const [supData, poData] = await Promise.all([poService.getSuppliers(), poService.getPOs()]);
      setSuppliers(Array.isArray(supData) ? supData : []);
      setPOs(Array.isArray(poData) ? poData : []);
    } catch (err) {
      console.error('Gagal memuat master data:', err);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
    fetchMasters();
  }, [fetchInvoices, fetchMasters]);

  const filtered = useMemo(() => {
    if (!search.trim()) return invoices;
    const q = search.toLowerCase();
    return invoices.filter((i) =>
      i.noInvoice?.toLowerCase().includes(q) ||
      i.supplier?.name?.toLowerCase().includes(q)
    );
  }, [invoices, search]);

  const openModal = () => {
    setFormData({
      supplierId: '',
      poId: '',
      noInvoice: '',
      tanggal: new Date().toISOString().split('T')[0],
      jatuhTempo: '',
      jumlah: '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplierId || !formData.noInvoice || !formData.jumlah) {
      toast.error('Supplier, No Invoice, dan Jumlah wajib diisi');
      return;
    }
    setIsSubmitting(true);
    try {
      await purchasingService.createInvoice({
        supplierId: formData.supplierId,
        poId: formData.poId ? formData.poId : null,
        noInvoice: formData.noInvoice,
        tanggal: formData.tanggal,
        jatuhTempo: formData.jatuhTempo || null,
        jumlah: Number(formData.jumlah),
      });
      toast.success('Invoice berhasil dibuat!');
      setIsModalOpen(false);
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || 'Gagal membuat invoice');
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
            <h2 className="text-2xl md:text-3xl text-[#f2ead9] font-bold">Invoice Penagihan</h2>
            <p className="text-[#888] text-sm mt-1">Kelola invoice tagihan dari supplier.</p>
          </div>
          <button onClick={openModal} className="flex items-center gap-2 bg-[#d4af37] text-[#0c0b09] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#e8c874] transition-colors w-fit">
            <Plus size={18} /> Tambah Invoice
          </button>
        </div>

        <div className="mb-4 relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
          <input type="text" placeholder="Cari no invoice / supplier..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-[#1a1814] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#666] focus:border-[#d4af37] outline-none" />
        </div>

        <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#22201c] text-[#888] text-left">
                  <th className="px-4 py-3 font-semibold">No Invoice</th>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">Jatuh Tempo</th>
                  <th className="px-4 py-3 font-semibold text-right">Tagihan</th>
                  <th className="px-4 py-3 font-semibold text-right">Dibayar</th>
                  <th className="px-4 py-3 font-semibold text-right">Sisa</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-10 text-[#888]">Memuat data...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-[#888]">Belum ada invoice</td></tr>
                ) : (
                  filtered.map((inv) => {
                    const sisa = Number(inv.jumlah || 0) - Number(inv.dibayar || 0);
                    return (
                      <tr key={inv.id} className="border-t border-[#2a2a2a] hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-white font-medium">{inv.noInvoice || `INV-${inv.id}`}</td>
                        <td className="px-4 py-3 text-[#ccc]">{inv.supplier?.name || inv.supplierName || '-'}</td>
                        <td className="px-4 py-3 text-[#888]">{inv.tanggal ? new Date(inv.tanggal).toLocaleDateString('id-ID') : '-'}</td>
                        <td className="px-4 py-3 text-[#888]">{inv.jatuhTempo ? new Date(inv.jatuhTempo).toLocaleDateString('id-ID') : '-'}</td>
                        <td className="px-4 py-3 text-right text-[#ccc]">{fmtRp(inv.jumlah)}</td>
                        <td className="px-4 py-3 text-right text-green-400">{fmtRp(inv.dibayar)}</td>
                        <td className="px-4 py-3 text-right text-yellow-400">{fmtRp(sisa)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge(inv.status)}`}>{inv.status || 'UNPAID'}</span>
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><ReceiptText size={20} className="text-[#d4af37]" /> Tambah Invoice</h2>
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
                  <label className="block text-sm text-[#888] mb-1">Purchase Order (opsional)</label>
                  <select value={formData.poId} onChange={(e) => setFormData({ ...formData, poId: e.target.value })} className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none">
                    <option value="">-- Pilih PO --</option>
                    {pos.map((p) => <option key={p.id} value={p.id}>{p.poNumber || `PO-${p.id}`}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#888] mb-1">No Invoice</label>
                  <input type="text" value={formData.noInvoice} onChange={(e) => setFormData({ ...formData, noInvoice: e.target.value })} required placeholder="INV-2026-001" className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#888] mb-1">Tanggal</label>
                    <input type="date" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })} required className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-[#888] mb-1">Jatuh Tempo</label>
                    <input type="date" value={formData.jatuhTempo} onChange={(e) => setFormData({ ...formData, jatuhTempo: e.target.value })} className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[#888] mb-1">Jumlah Tagihan (Rp)</label>
                  <input type="number" min="0" value={formData.jumlah} onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })} required placeholder="0" className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#2a2a2a]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-[#888] hover:text-white font-medium rounded-lg hover:bg-white/5 transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-[#d4af37] text-[#0c0b09] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#e8c874] transition-colors disabled:opacity-50">
                  <Save size={16} /> {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicePenagihanPage;
