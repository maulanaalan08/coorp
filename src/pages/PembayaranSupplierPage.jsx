import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Banknote, Plus, Search, Save, X, Edit2 } from 'lucide-react';
import Header from '../components/Header';
import { purchasingService } from '../services/purchasingService';
import { poService } from '../services/poService';
import glBankService from '../services/glBankService';
import toast from 'react-hot-toast';

const fmtRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });
const fmtTgl = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const statusBadge = (status) => {
  const map = {
    PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    PARTIAL: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    PAID: 'bg-green-500/10 text-green-400 border-green-500/30',
  };
  return map[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/30';
};

const METODE_BAYAR = ['TRANSFER', 'CASH', 'CEK', 'GIRO', 'TEMPO'];

const PembayaranSupplierPage = () => {
  const [pembayarans, setPembayarans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [suppliers, setSuppliers] = useState([]);
  const [pengajuans, setPengajuans] = useState([]);
  const [pos, setPOs] = useState([]);
  const [rekeningBanks, setRekeningBanks] = useState([]);
  const [tipeRekeningList, setTipeRekeningList] = useState([]);

  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    supplierId: '',
    pengajuanId: '',
    poId: '',
    totalTagihan: '',
    jumlah: '',
    metode: 'TRANSFER',
    status: 'PENDING',
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
    } catch (err) {
      toast.error('Gagal memuat data pembayaran supplier');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMasters = useCallback(async () => {
    try {
      const [supData, pjData, poData, rekeningRes, tipeRekeningRes] = await Promise.all([
        poService.getSuppliers(),
        purchasingService.getPengajuanBayar(),
        poService.getPOs(),
        glBankService.getRekeningBank({ activeOnly: 1 }),
        glBankService.getTipeRekening({ isActive: 1 }),
      ]);
      setSuppliers(Array.isArray(supData) ? supData : []);
      setPengajuans(Array.isArray(pjData) ? pjData : []);
      setPOs(Array.isArray(poData) ? poData : []);
      setRekeningBanks(Array.isArray(rekeningRes?.data) ? rekeningRes.data : []);
      setTipeRekeningList(Array.isArray(tipeRekeningRes?.data) ? tipeRekeningRes.data : []);
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
      p.supplier?.name?.toLowerCase().includes(q) ||
      p.purchaseOrder?.project?.name?.toLowerCase().includes(q)
    );
  }, [pembayarans, search]);

  const openModal = (pembayaran = null) => {
    if (pembayaran) {
      setEditId(pembayaran.id);
      setFormData({
        supplierId: pembayaran.supplierId || '',
        pengajuanId: pembayaran.pengajuanId || '',
        poId: pembayaran.poId || '',
        totalTagihan: pembayaran.totalTagihan || '',
        jumlah: '',
        metode: pembayaran.metodeBayar || pembayaran.metode || 'TRANSFER',
        status: pembayaran.status || 'PENDING',
        keterangan: pembayaran.keterangan || '',
        tanggal: pembayaran.tanggal ? new Date(pembayaran.tanggal).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        jatuhTempo: pembayaran.jatuhTempo ? new Date(pembayaran.jatuhTempo).toISOString().split('T')[0] : '',
        tanggalBayar: pembayaran.tanggalBayar ? new Date(pembayaran.tanggalBayar).toISOString().split('T')[0] : '',
        rekeningBankId: pembayaran.rekeningBankId || '',
        tipeRekeningId: pembayaran.tipeRekeningId || pembayaran.rekeningBank?.tipeRekeningId || '',
        tambahPembayaran: true,
      });
    } else {
      setEditId(null);
      setFormData({
        supplierId: '',
        pengajuanId: '',
        poId: '',
        totalTagihan: '',
        jumlah: '',
        metode: 'TRANSFER',
        status: 'PENDING',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplierId) {
      toast.error('Supplier wajib diisi');
      return;
    }
    setIsSubmitting(true);
    
    const payload = {
      supplierId: formData.supplierId,
      pengajuanId: formData.pengajuanId ? formData.pengajuanId : null,
      poId: formData.poId ? formData.poId : null,
      totalTagihan: Number(formData.totalTagihan || 0),
      jumlahBayar: Number(formData.jumlah),
      metodeBayar: formData.metode,
      status: formData.status,
      keterangan: formData.keterangan,
      tanggal: formData.tanggal,
      jatuhTempo: formData.jatuhTempo ? formData.jatuhTempo : null,
      tanggalBayar: formData.tanggalBayar ? formData.tanggalBayar : null,
      tipeAkunKasBank: formData.rekeningBankId ? 'BANK' : 'KAS',
      rekeningBankId: formData.rekeningBankId || null,
      tipeRekeningId: formData.tipeRekeningId || null,
      tambahPembayaran: Boolean(formData.tambahPembayaran),
    };

    try {
      if (editId) {
        await purchasingService.updatePembayaran(editId, payload);
        toast.success('Pembayaran berhasil diupdate!');
      } else {
        await purchasingService.createPembayaran(payload);
        toast.success('Pembayaran berhasil dibuat!');
      }
      setIsModalOpen(false);
      fetchPembayarans();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan pembayaran');
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
            <p className="text-[#888] text-sm mt-1">Semua riwayat pembayaran ke supplier dari semua proyek.</p>
          </div>
          <button onClick={() => openModal()} className="flex items-center gap-2 bg-[#d4af37] text-[#0c0b09] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#e8c874] transition-colors w-fit">
            <Plus size={18} /> Buat Pembayaran Manual
          </button>
        </div>

        <div className="mb-4 relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
          <input type="text" placeholder="Cari no pembayaran / supplier / proyek..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-[#1a1814] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#666] focus:border-[#d4af37] outline-none" />
        </div>

        <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#22201c] text-[#888] text-left">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">No Pembayaran</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Supplier</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Proyek</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Tgl Buat</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap text-orange-400">Jatuh Tempo</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap text-green-400">Tgl Bayar</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Jumlah</th>
                  <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Cara Bayar</th>
                  <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-10 text-[#888]">Memuat data...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-10 text-[#888]">Belum ada pembayaran</td></tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="border-t border-[#2a2a2a] hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="text-white font-medium font-mono text-sm">{p.noPembayaran || ('PAY-' + p.id.slice(0,8))}</div>
                        {p.purchaseOrder?.poNumber && (
                          <div className="text-[10px] text-[#38bdf8] mt-0.5 font-mono">PO: {p.purchaseOrder.poNumber}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#ccc]">{p.supplier?.name || '-'}</td>
                      <td className="px-4 py-3">
                        {p.purchaseOrder?.project?.name ? (
                          <span className="text-[11px] text-[#aaa] bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                            {p.purchaseOrder.project.name}
                          </span>
                        ) : <span className="text-[#444] text-xs">-</span>}
                      </td>
                      <td className="px-4 py-3 text-[#888] text-xs whitespace-nowrap">{fmtTgl(p.tanggal)}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {p.jatuhTempo ? (
                          <span className="text-orange-400 font-semibold">{fmtTgl(p.jatuhTempo)}</span>
                        ) : <span className="text-[#444]">-</span>}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {p.tanggalBayar ? (
                          <span className="text-green-400 font-semibold">{fmtTgl(p.tanggalBayar)}</span>
                        ) : <span className="text-[#666] italic">Belum Bayar</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-[#ccc] font-mono whitespace-nowrap">
                        {fmtRp(p.jumlahBayar || p.jumlah || 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[#ccc] text-xs">{p.metodeBayar || p.metode || '-'}</span>
                          {p.purchaseOrder?.caraPembayaran && (
                            <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 whitespace-nowrap">
                              PO: {p.purchaseOrder.caraPembayaran}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge(p.status)}`}>
                          {p.status === 'PENDING' ? 'Belum Bayar' : p.status === 'PARTIAL' ? 'Sebagian / Tempo' : p.status === 'PAID' ? 'Lunas' : p.status || 'Belum Bayar'}
                        </span>
                        <div className="text-[10px] text-[#777] mt-1">
                          Dibayar: {fmtRp(p.totalTerbayar ?? p.jumlahBayar ?? 0)}
                        </div>
                        <div className="text-[10px] text-[#777]">
                          Sisa: {fmtRp(p.sisaBayar ?? 0)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openModal(p)}
                          className="p-1.5 text-[#888] hover:text-[#d4af37] bg-white/5 hover:bg-white/10 rounded transition-colors"
                          title="Edit Pembayaran"
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
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Banknote size={20} className="text-[#d4af37]" /> 
                {editId ? 'Update Pembayaran' : 'Bayar Supplier'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#888] hover:text-white"><X size={22} /></button>
            </div>
            <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto">
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
                    {pos.map((p) => <option key={p.id} value={p.id}>{p.poNumber || ('PO-' + p.id)}</option>)}
                  </select>
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
                      <option value="PENDING">Belum Bayar</option>
                      <option value="PARTIAL">Sebagian / Tempo</option>
                      <option value="PAID">Lunas</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#888] mb-1">Tgl Buat Form</label>
                    <input type="date" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })} required className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-orange-400 mb-1">Jatuh Tempo</label>
                    <input type="date" value={formData.jatuhTempo} onChange={(e) => setFormData({ ...formData, jatuhTempo: e.target.value })} className="w-full bg-[#0c0b09] border border-orange-500/30 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-green-400 mb-1">Tanggal Bayar</label>
                    <input type="date" value={formData.tanggalBayar} onChange={(e) => setFormData({ ...formData, tanggalBayar: e.target.value })} className="w-full bg-[#0c0b09] border border-green-500/30 rounded-lg px-3 py-2.5 text-white text-sm focus:border-green-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-[#888] mb-1">Metode Bayar</label>
                    <select value={formData.metode} onChange={(e) => setFormData({ ...formData, metode: e.target.value })} className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none">
                      {METODE_BAYAR.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
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
                      onChange={(e) => setFormData({ ...formData, tambahPembayaran: e.target.checked })}
                    />
                    Edit sebagai cicilan/pelunasan baru (tambahkan histori pembayaran)
                  </label>
                  <p className="text-[10px] text-[#666] mt-1">Jika aktif, nominal dianggap pembayaran tambahan dan otomatis masuk Buku Besar.</p>
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">Jumlah Bayar (Rp)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.jumlah ? Number(formData.jumlah || 0).toLocaleString('id-ID') : ''}
                    onChange={(e) => {
                      const raw = String(e.target.value || '').replace(/\D/g, '');
                      setFormData({ ...formData, jumlah: raw });
                    }}
                    placeholder="0"
                    className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none"
                  />
                  <p className="text-xs text-[#555] mt-1">* Isi jika sudah dibayar</p>
                </div>


                <div>
                  <label className="block text-sm text-[#888] mb-1">Keterangan</label>
                  <textarea value={formData.keterangan} onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })} rows={2} placeholder="Keterangan tambahan..." className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none resize-none" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#2a2a2a]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-[#888] hover:text-white font-medium rounded-lg hover:bg-white/5 transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-[#d4af37] text-[#0c0b09] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#e8c874] transition-colors disabled:opacity-50">
                  <Save size={16} /> {isSubmitting ? 'Menyimpan...' : (editId ? 'Update' : 'Buat')}
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
