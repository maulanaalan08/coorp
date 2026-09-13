import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileInput, Plus, Search, Check, X, Save, ShieldCheck, Truck,
  ChevronRight, Package, AlertCircle, CalendarDays, UserCheck,
} from 'lucide-react';
import Header from '../components/Header';
import { purchasingService } from '../services/purchasingService';
import { poService } from '../services/poService';
import ApprovalPengajuanPanel from '../components/ApprovalPengajuanPanel';
import POItemDetail from '../components/POItemDetail';
import ProjectSelector from '../components/ProjectSelector';
import { projectService } from '../services/projectService';
import toast from 'react-hot-toast';

const fmtRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const statusBadge = (status) => {
  const map = {
    PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    APPROVED_FINANCE: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    APPROVED: 'bg-green-500/10 text-green-400 border-green-500/30',
    REJECTED: 'bg-red-500/10 text-red-400 border-red-500/30',
  };
  return map[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/30';
};

const statusLabel = (status) => {
  const map = {
    PENDING: 'Menunggu Finance',
    APPROVED_FINANCE: 'Menunggu Atasan',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
  };
  return map[status] || status || 'PENDING';
};

const PengajuanBayarPage = ({ initialProjectId = null }) => {
  const [pengajuans, setPengajuans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // PO yang sudah lolos Finance — ini sumber "item apa saja yang di-PO kan"
  const [poSiap, setPoSiap] = useState([]);
  const [loadingPo, setLoadingPo] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    poId: '',
    supplierId: '',
    totalTagihan: '',
    catatan: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Proyek + refresh silang antar panel approval
  const [projectId, setProjectId] = useState(initialProjectId);
  const [projectList, setProjectList] = useState([]);
  const [approvalTick, setApprovalTick] = useState(0);
  const bumpApproval = () => setApprovalTick((t) => t + 1);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await projectService.getAll();
      setProjectList(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error('Gagal memuat project:', err);
    }
  }, []);

  const fetchPengajuans = useCallback(async () => {
    // Tanpa proyek jangan ambil data — kalau tidak, pengajuan semua proyek
    // tampil duluan lalu "hilang" begitu proyek dipilih.
    if (!projectId) {
      setPengajuans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await purchasingService.getPengajuanBayar(projectId);
      setPengajuans(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Gagal memuat data pengajuan bayar');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Daftar PO hasil approve Finance (belum diajukan bayar)
  const fetchPoSiap = useCallback(async () => {
    // Sama: daftar PO baru diambil setelah proyek dipilih.
    if (!projectId) {
      setPoSiap([]);
      setLoadingPo(false);
      return;
    }
    setLoadingPo(true);
    try {
      const data = await purchasingService.getPOSiapAjukan(projectId);
      setPoSiap(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Gagal memuat PO siap diajukan:', err);
      setPoSiap([]);
    } finally {
      setLoadingPo(false);
    }
  }, [projectId]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => {
    fetchPengajuans();
    fetchPoSiap();
  }, [fetchPengajuans, fetchPoSiap]);

  const filteredPengajuans = useMemo(() => {
    if (!search.trim()) return pengajuans;
    const q = search.toLowerCase();
    return pengajuans.filter((p) =>
      p.noPengajuan?.toLowerCase().includes(q) ||
      p.supplier?.name?.toLowerCase().includes(q)
    );
  }, [pengajuans, search]);

  const filteredPoSiap = useMemo(() => {
    if (!search.trim()) return poSiap;
    const q = search.toLowerCase();
    return poSiap.filter((po) => {
      const cocokHeader =
        po.poNumber?.toLowerCase().includes(q) ||
        po.supplier?.name?.toLowerCase().includes(q);
      const cocokItem = (po.items || []).some((it) =>
        (it.description || '').toLowerCase().includes(q)
      );
      return cocokHeader || cocokItem;
    });
  }, [poSiap, search]);

  // Klik PO -> modal detail item + form pengajuan
  const openModalUntukPO = (po) => {
    setFormData({
      poId: po.id,
      supplierId: po.supplierId || po.supplier?.id || '',
      totalTagihan: String(po.grandTotal ?? ''),
      catatan: '',
    });
    setIsModalOpen(true);
  };

  const openModalKosong = () => {
    setFormData({ poId: '', supplierId: '', totalTagihan: '', catatan: '' });
    setIsModalOpen(true);
  };

  const poDiForm = useMemo(
    () => poSiap.find((p) => p.id === formData.poId) || null,
    [poSiap, formData.poId]
  );

  const handleVerify = async (id) => {
    try {
      await purchasingService.verifyPengajuan(id, '');
      toast.success('Pengajuan diverifikasi, diteruskan ke atasan');
      fetchPengajuans();
      bumpApproval();
    } catch (err) {
      toast.error(err.message || 'Gagal memverifikasi pengajuan');
    }
  };

  const handleApprove = async (id) => {
    try {
      await purchasingService.approvePengajuan(id);
      toast.success('Pengajuan disetujui');
      fetchPengajuans();
      bumpApproval();
    } catch (err) {
      toast.error(err.message || 'Gagal menyetujui pengajuan');
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Masukkan alasan penolakan:');
    if (reason === null) return;
    if (!reason.trim()) { toast.error('Alasan tidak boleh kosong'); return; }
    try {
      await purchasingService.rejectPengajuan(id, reason);
      toast.success('Pengajuan ditolak');
      fetchPengajuans();
      bumpApproval();
    } catch (err) {
      toast.error(err.message || 'Gagal menolak pengajuan');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplierId) { toast.error('Supplier belum terisi — pilih PO-nya dulu'); return; }
    if (!formData.totalTagihan || Number(formData.totalTagihan) <= 0) {
      toast.error('Total tagihan harus lebih dari 0');
      return;
    }
    setIsSubmitting(true);
    try {
      await purchasingService.createPengajuan({
        supplierId: formData.supplierId,
        poId: formData.poId || null,
        projectId: poDiForm?.projectId || projectId || null,
        totalTagihan: Number(formData.totalTagihan),
        catatan: formData.catatan,
      });
      toast.success('Pengajuan pembayaran dibuat!');
      setIsModalOpen(false);
      fetchPengajuans();
      fetchPoSiap();
      bumpApproval();
    } catch (err) {
      toast.error(err.message || 'Gagal membuat pengajuan');
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
            <h2 className="text-2xl md:text-3xl text-[#f2ead9] font-bold">Pengajuan Bayar</h2>
            <p className="text-[#888] text-sm mt-1">
              Pilih proyek, lalu klik PO hasil persetujuan Finance untuk melihat itemnya.
            </p>
          </div>
          <button
            onClick={openModalKosong}
            className="flex items-center gap-2 border border-[#2a2a2a] text-[#ccc] font-semibold px-4 py-2.5 rounded-lg hover:border-[#d4af37] hover:text-[#d4af37] transition-colors w-fit"
          >
            <Plus size={18} /> Pengajuan Manual
          </button>
        </div>

        <ProjectSelector
          projectId={projectId}
          projectList={projectList}
          loading={false}
          onChange={(e) => { setProjectId(e.target.value || null); setSelectedPO(null); }}
        />

        {/* DAFTAR PO: hanya yang sudah disetujui Finance */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Truck size={16} className="text-[#d4af37]" />
            <h3 className="text-sm font-bold text-[#f2ead9] uppercase tracking-wider">
              PO Disetujui Finance
            </h3>
            <span className="text-xs text-[#666]">({filteredPoSiap.length})</span>
          </div>

          {loadingPo ? (
            <div className="text-center py-8 text-[#888] text-sm">Memuat PO...</div>
          ) : filteredPoSiap.length === 0 ? (
            <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-5 py-8 text-center">
              <AlertCircle size={22} className="text-[#555] mx-auto mb-2" />
              <p className="text-sm text-[#888]">
                {projectId
                  ? 'Belum ada PO yang disetujui Finance di proyek ini.'
                  : 'Pilih proyek dulu untuk melihat PO-nya.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredPoSiap.map((po) => {
                const aktif = selectedPO?.id === po.id;
                return (
                  <div
                    key={po.id}
                    className={`bg-[#1a1814] border rounded-xl p-4 transition-colors ${
                      aktif ? 'border-[#d4af37]' : 'border-[#2a2a2a] hover:border-[#d4af37]/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedPO(aktif ? null : po)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-mono text-sm text-[#d4af37] font-bold">
                          {po.poNumber || `PO-${po.id.slice(0, 8)}`}
                        </span>
                        <ChevronRight
                          size={16}
                          className={`text-[#888] shrink-0 transition-transform ${aktif ? 'rotate-90' : ''}`}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#38bdf8] mb-1">
                        <Truck size={11} /> {po.supplier?.name || 'Tanpa Supplier'}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[#888] mb-2">
                        <span className="inline-flex items-center gap-1">
                          <Package size={10} /> {po.items?.length || 0} item
                        </span>
                        {po.tanggal && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays size={10} />
                            {new Date(po.tanggal).toLocaleDateString('id-ID', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#f2ead9] font-mono">
                          {fmtRp(po.grandTotal)}
                        </span>
                        {po.kategoriPO === 'HABIS_PAKAI' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/30">
                            Habis Pakai
                          </span>
                        )}
                      </div>
                    </button>

                    {aktif && (
                      <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                        <p className="text-[11px] text-[#888] uppercase tracking-wider mb-2">
                          Item dalam PO ini
                        </p>
                        <POItemDetail po={po} showHeader={false} />
                        <button
                          onClick={() => openModalUntukPO(po)}
                          className="mt-3 w-full flex items-center justify-center gap-2 bg-[#d4af37] text-[#0c0b09] text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#e8c874] transition-colors"
                        >
                          <FileInput size={15} /> Ajukan Pembayaran PO Ini
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <ApprovalPengajuanPanel
          mode="finance"
          projectId={projectId}
          refreshKey={approvalTick}
          onChanged={() => { fetchPengajuans(); fetchPoSiap(); bumpApproval(); }}
        />

        <ApprovalPengajuanPanel
          mode="atasan"
          projectId={projectId}
          refreshKey={approvalTick}
          onChanged={() => { fetchPengajuans(); fetchPoSiap(); bumpApproval(); }}
        />

        <div className="mb-4 relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
          <input
            type="text"
            placeholder="Cari no pengajuan / supplier / item..."
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
                  <th className="px-4 py-3 font-semibold">No Pengajuan</th>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">PO</th>
                  <th className="px-4 py-3 font-semibold text-right">Total Tagihan</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-[#888]">Memuat data...</td></tr>
                ) : filteredPengajuans.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-[#888]">Belum ada pengajuan bayar</td></tr>
                ) : (
                  filteredPengajuans.map((p) => (
                    <tr key={p.id} className="border-t border-[#2a2a2a] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white font-medium">{p.noPengajuan || `PJ-${p.id}`}</td>
                      <td className="px-4 py-3 text-[#ccc]">{p.supplier?.name || p.supplierName || '-'}</td>
                      <td className="px-4 py-3 text-[#888] font-mono text-xs">
                        {p.purchaseOrder?.poNumber || '-'}
                        {p.purchaseOrder?.items?.length ? (
                          <span className="ml-2 text-[#555]">({p.purchaseOrder.items.length} item)</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right text-[#ccc]">{fmtRp(p.totalTagihan)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge(p.status)}`}>
                          {statusLabel(p.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.status === 'PENDING' && (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleVerify(p.id)} className="text-blue-400 hover:text-blue-300 p-1" title="Verifikasi (Finance)"><ShieldCheck size={16} /></button>
                            <button onClick={() => handleReject(p.id)} className="text-red-400 hover:text-red-300 p-1" title="Tolak"><X size={16} /></button>
                          </div>
                        )}
                        {p.status === 'APPROVED_FINANCE' && (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleApprove(p.id)} className="text-green-400 hover:text-green-300 p-1" title="Setujui (Atasan)"><Check size={16} /></button>
                            <button onClick={() => handleReject(p.id)} className="text-red-400 hover:text-red-300 p-1" title="Tolak"><X size={16} /></button>
                          </div>
                        )}
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
          <div
            className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileInput size={20} className="text-[#d4af37]" /> Ajukan Pembayaran
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#888] hover:text-white"><X size={22} /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
              <div className="px-6 py-4 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-sm text-[#888] mb-1">Purchase Order</label>
                  <select
                    value={formData.poId}
                    onChange={(e) => {
                      const po = poSiap.find((x) => x.id === e.target.value);
                      setFormData({
                        ...formData,
                        poId: e.target.value,
                        supplierId: po?.supplierId || po?.supplier?.id || '',
                        totalTagihan: po ? String(po.grandTotal ?? '') : formData.totalTagihan,
                      });
                    }}
                    className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none"
                  >
                    <option value="">-- Pilih PO (sudah disetujui Finance) --</option>
                    {poSiap.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.poNumber || `PO-${p.id.slice(0, 8)}`} — {p.supplier?.name || 'Tanpa Supplier'} — {fmtRp(p.grandTotal)}
                      </option>
                    ))}
                  </select>
                </div>

                {poDiForm && (
                  <div className="bg-[#0c0b09] border border-[#2a2a2a] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] text-[#888] uppercase tracking-wider">
                        Detail Item PO
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-[#4caf50]">
                        <UserCheck size={11} />
                        {poDiForm.verifiedBy?.name
                          ? `Diverifikasi ${poDiForm.verifiedBy.name}`
                          : 'Disetujui Finance'}
                      </span>
                    </div>
                    <POItemDetail po={poDiForm} />
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#2a2a2a]">
                      <span className="text-xs text-[#888]">Total PO</span>
                      <span className="text-sm font-bold text-[#d4af37] font-mono">
                        {fmtRp(poDiForm.grandTotal)}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-[#888] mb-1">Supplier</label>
                  {formData.supplierId ? (
                    <div className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-[#ccc]">
                      {poSiap.find((p) => p.supplierId === formData.supplierId)?.supplier?.name || 'Terisi dari PO'}
                    </div>
                  ) : (
                    <p className="text-xs text-[#888] italic py-2">
                      Pilih PO dulu — supplier otomatis mengikuti PO.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">Total Tagihan (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.totalTagihan}
                    onChange={(e) => setFormData({ ...formData, totalTagihan: e.target.value })}
                    required
                    placeholder="0"
                    className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none"
                  />
                  <p className="text-[11px] text-[#666] mt-1">
                    Terisi otomatis dari total PO. Ubah kalau yang ditagih cuma sebagian.
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-[#888] mb-1">Catatan</label>
                  <textarea
                    value={formData.catatan}
                    onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                    rows={3}
                    placeholder="Catatan tambahan..."
                    className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#2a2a2a]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-[#888] hover:text-white font-medium rounded-lg hover:bg-white/5 transition-colors">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-[#d4af37] text-[#0c0b09] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#e8c874] transition-colors disabled:opacity-50"
                >
                  <Save size={16} /> {isSubmitting ? 'Menyimpan...' : 'Ajukan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PengajuanBayarPage;
