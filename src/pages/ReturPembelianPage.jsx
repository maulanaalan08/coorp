import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RotateCcw, Plus, Search, Trash2, Eye, X, Save } from 'lucide-react';
import Header from '../components/Header';
import { purchasingService } from '../services/purchasingService';
import { poService } from '../services/poService';
import toast from 'react-hot-toast';

const fmtRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const statusBadge = (status) => {
  const map = {
    PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    APPROVED: 'bg-green-500/10 text-green-400 border-green-500/30',
    REJECTED: 'bg-red-500/10 text-red-400 border-red-500/30',
  };
  return map[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/30';
};

const ReturPembelianPage = () => {
  const [returs, setReturs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pos, setPOs] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [formData, setFormData] = useState({
    poId: '',
    supplierId: '',
    tanggal: new Date().toISOString().split('T')[0],
    items: [],
    alasan: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReturs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await purchasingService.getReturPembelian();
      setReturs(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Gagal memuat data retur pembelian');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMasters = useCallback(async () => {
    try {
      const [poData, supData] = await Promise.all([
        poService.getPOs(),
        poService.getSuppliers(),
      ]);
      setPOs(Array.isArray(poData) ? poData : []);
      setSuppliers(Array.isArray(supData) ? supData : []);
    } catch (err) {
      console.error('Gagal memuat master data:', err);
    }
  }, []);

  useEffect(() => {
    fetchReturs();
    fetchMasters();
  }, [fetchReturs, fetchMasters]);

  const filteredReturs = useMemo(() => {
    if (!search.trim()) return returs;
    const q = search.toLowerCase();
    return returs.filter((r) =>
      r.noTransaksi?.toLowerCase().includes(q) ||
      r.supplier?.name?.toLowerCase().includes(q)
    );
  }, [returs, search]);

  const openModal = () => {
    setFormData({
      poId: '',
      supplierId: '',
      tanggal: new Date().toISOString().split('T')[0],
      items: [],
      alasan: '',
    });
    setIsModalOpen(true);
  };

  const handlePoChange = (e) => {
    const poId = e.target.value;
    const po = pos.find((p) => String(p.id) === poId);
    setFormData((prev) => ({
      ...prev,
      poId,
      supplierId: po?.supplierId || po?.supplier?.id || prev.supplierId,
      items: po?.items?.map((it) => ({
        itemId: it.id,
        description: it.description || it.itemName || '',
        qty: it.qty || 0,
        qtyRetur: 0,
        unitPrice: it.unitPrice || it.hargaDeal || 0,
      })) || [],
    }));
  };

  const handleItemQtyRetur = (idx, val) => {
    setFormData((prev) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], qtyRetur: Number(val) };
      return { ...prev, items };
    });
  };

  const totalRetur = formData.items.reduce(
    (sum, it) => sum + (it.qtyRetur || 0) * (it.unitPrice || 0),
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.poId || !formData.supplierId) {
      toast.error('Pilih PO dan Supplier terlebih dahulu');
      return;
    }
    if (formData.items.length === 0) {
      toast.error('Tidak ada item untuk diretur');
      return;
    }
    setIsSubmitting(true);
    try {
      await purchasingService.createRetur({
        poId: formData.poId,
        supplierId: formData.supplierId,
        tanggal: formData.tanggal,
        alasan: formData.alasan,
        items: formData.items.filter((it) => it.qtyRetur > 0),
        total: totalRetur,
      });
      toast.success('Retur pembelian berhasil dibuat!');
      setIsModalOpen(false);
      fetchReturs();
    } catch (err) {
      toast.error(err.message || 'Gagal membuat retur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin hapus retur ini?')) return;
    try {
      await purchasingService.deleteRetur(id);
      toast.success('Retur dihapus');
      fetchReturs();
    } catch (err) {
      toast.error('Gagal menghapus retur');
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0b09]">
      <Header />
      <div className="px-5 md:px-10 pb-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-[#888] text-xs uppercase tracking-wider mb-1">Purchasing</p>
            <h2 className="text-2xl md:text-3xl text-[#f2ead9] font-bold">Retur Pembelian</h2>
            <p className="text-[#888] text-sm mt-1">Kelola retur barang ke supplier.</p>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-[#d4af37] text-[#0c0b09] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#e8c874] transition-colors w-fit"
          >
            <Plus size={18} /> Buat Retur
          </button>
        </div>

        {/* Search */}
        <div className="mb-4 relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
          <input
            type="text"
            placeholder="Cari no transaksi / supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1a1814] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#666] focus:border-[#d4af37] outline-none"
          />
        </div>

        {/* Table */}
        <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#22201c] text-[#888] text-left">
                  <th className="px-4 py-3 font-semibold">No Transaksi</th>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold text-right">Total</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-[#888]">Memuat data...</td></tr>
                ) : filteredReturs.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-[#888]">Belum ada retur pembelian</td></tr>
                ) : (
                  filteredReturs.map((r) => (
                    <tr key={r.id} className="border-t border-[#2a2a2a] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white font-medium">{r.noTransaksi || `RT-${r.id}`}</td>
                      <td className="px-4 py-3 text-[#ccc]">{r.supplier?.name || r.supplierName || '-'}</td>
                      <td className="px-4 py-3 text-[#888]">{r.tanggal ? new Date(r.tanggal).toLocaleDateString('id-ID') : '-'}</td>
                      <td className="px-4 py-3 text-right text-[#ccc]">{fmtRp(r.total)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge(r.status)}`}>
                          {r.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-300 p-1" title="Hapus">
                            <Trash2 size={16} />
                          </button>
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

      {/* Modal Buat Retur */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><RotateCcw size={20} className="text-[#d4af37]" /> Buat Retur Pembelian</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#888] hover:text-white"><X size={22} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">Pilih Purchase Order</label>
                  <select value={formData.poId} onChange={handlePoChange} required className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none">
                    <option value="" disabled>-- Pilih PO --</option>
                    {pos.map((p) => (
                      <option key={p.id} value={p.id}>{p.poNumber || `PO-${p.id}`} {p.supplier?.name ? `- ${p.supplier.name}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#888] mb-1">Supplier</label>
                  <select value={formData.supplierId} onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })} required className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none">
                    <option value="" disabled>-- Pilih Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#888] mb-1">Tanggal Retur</label>
                  <input type="date" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })} required className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none" />
                </div>
                {formData.items.length > 0 && (
                  <div>
                    <label className="block text-sm text-[#888] mb-2">Items untuk Diretur</label>
                    <div className="overflow-x-auto border border-[#2a2a2a] rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-[#22201c] text-[#888]">
                          <tr>
                            <th className="px-3 py-2 text-left">Item</th>
                            <th className="px-3 py-2 text-right">Qty PO</th>
                            <th className="px-3 py-2 text-right">Qty Retur</th>
                            <th className="px-3 py-2 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.items.map((it, idx) => (
                            <tr key={idx} className="border-t border-[#2a2a2a]">
                              <td className="px-3 py-2 text-white">{it.description}</td>
                              <td className="px-3 py-2 text-right text-[#888]">{it.qty}</td>
                              <td className="px-3 py-2 text-right">
                                <input type="number" min="0" max={it.qty} step="any" value={it.qtyRetur} onChange={(e) => handleItemQtyRetur(idx, e.target.value)} className="w-20 bg-[#0c0b09] border border-[#2a2a2a] rounded px-2 py-1 text-white text-right text-sm focus:border-[#d4af37] outline-none" />
                              </td>
                              <td className="px-3 py-2 text-right text-[#ccc]">{fmtRp((it.qtyRetur || 0) * (it.unitPrice || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm text-[#888] mb-1">Alasan Retur</label>
                  <textarea value={formData.alasan} onChange={(e) => setFormData({ ...formData, alasan: e.target.value })} rows={3} placeholder="Jelaskan alasan retur..." className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none resize-none" />
                </div>
                {totalRetur > 0 && (
                  <div className="bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-lg px-4 py-3 flex justify-between items-center">
                    <span className="text-[#888] text-sm">Total Retur:</span>
                    <strong className="text-[#d4af37]">{fmtRp(totalRetur)}</strong>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#2a2a2a]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-[#888] hover:text-white font-medium rounded-lg hover:bg-white/5 transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-[#d4af37] text-[#0c0b09] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#e8c874] transition-colors disabled:opacity-50">
                  <Save size={16} /> {isSubmitting ? 'Menyimpan...' : 'Simpan Retur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturPembelianPage;
