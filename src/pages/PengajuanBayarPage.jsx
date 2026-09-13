import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileInput, Search, Check, X, ChevronRight, ChevronDown, Package, AlertCircle,
  CalendarDays, UserCheck, Clock,
} from 'lucide-react';
import Header from '../components/Header';
import { purchasingService } from '../services/purchasingService';
import { poService } from '../services/poService';
import POItemDetail from '../components/POItemDetail';
import ProjectSelector from '../components/ProjectSelector';
import { projectService } from '../services/projectService';
import toast from 'react-hot-toast';

const fmtRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });
const fmtNum = (n) => Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 4 });

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
    PENDING: 'Menunggu Atasan',
    APPROVED_FINANCE: 'Menunggu Atasan',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
  };
  return map[status] || status || 'PENDING';
};

const poStatusBadge = (status) => {
  const map = {
    BELUM_APPROVE: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    MENUNGGU_ATASAN: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    APPROVED: 'bg-green-500/10 text-green-400 border-green-500/30',
    REJECTED: 'bg-red-500/10 text-red-400 border-red-500/30',
  };
  return map[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/30';
};

const poStatusLabel = (status) => {
  const map = {
    BELUM_APPROVE: 'Belum Approve',
    MENUNGGU_ATASAN: 'Menunggu Atasan',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
  };
  return map[status] || status || 'BELUM_APPROVE';
};

// Ambil pengajuan terbaru (non-rejected) dari daftar pengajuan sebuah PO
const pengajuanAktif = (po) => {
  const list = (po?.pengajuanPembayaran || []).filter(
    (p) => p.status !== 'REJECTED',
  );
  return list[0] || null;
};

const PengajuanBayarPage = ({ initialProjectId = null }) => {
  const [poApproved, setPoApproved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState({});

  const [poMenungguAtasan, setPoMenungguAtasan] = useState([]);
  const [loadingPo, setLoadingPo] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [expandedPO, setExpandedPO] = useState({});

  const [projectId, setProjectId] = useState(initialProjectId);
  const [projectList, setProjectList] = useState([]);
  const [approvalTick, setApprovalTick] = useState(0);
  const bumpApproval = () => setApprovalTick((t) => t + 1);
  const [busyId, setBusyId] = useState(null);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await projectService.getAll();
      setProjectList(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error('Gagal memuat project:', err);
    }
  }, []);

  const fetchPoApproved = useCallback(async () => {
    if (!projectId) {
      setPoApproved([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await purchasingService.getPOApproved(projectId);
      setPoApproved(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Gagal memuat data PO approved');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchPoMenungguAtasan = useCallback(async () => {
    if (!projectId) {
      setPoMenungguAtasan([]);
      setLoadingPo(false);
      return;
    }
    setLoadingPo(true);
    try {
      const data = await poService.getPOs({ projectId, status: 'MENUNGGU_ATASAN' });
      setPoMenungguAtasan(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Gagal memuat PO menunggu atasan:', err);
      setPoMenungguAtasan([]);
    } finally {
      setLoadingPo(false);
    }
  }, [projectId]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => {
    fetchPoApproved();
    fetchPoMenungguAtasan();
  }, [fetchPoApproved, fetchPoMenungguAtasan, approvalTick]);

  useEffect(() => {
    const onChanged = () => {
      bumpApproval();
      fetchPoApproved();
      fetchPoMenungguAtasan();
    };
    window.addEventListener('po-status-changed', onChanged);
    return () => window.removeEventListener('po-status-changed', onChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const filteredPoApproved = useMemo(() => {
    if (!search.trim()) return poApproved;
    const q = search.toLowerCase();
    return poApproved.filter((po) => {
      const pengajuan = pengajuanAktif(po);
      const cocokHeader =
        po.poNumber?.toLowerCase().includes(q) ||
        po.supplier?.name?.toLowerCase().includes(q) ||
        pengajuan?.noPengajuan?.toLowerCase().includes(q);
      const cocokItem = (po.items || []).some((it) =>
        (it.description || '').toLowerCase().includes(q)
      );
      return cocokHeader || cocokItem;
    });
  }, [poApproved, search]);

  const filteredPoMenunggu = useMemo(() => {
    if (!search.trim()) return poMenungguAtasan;
    const q = search.toLowerCase();
    return poMenungguAtasan.filter((po) => {
      const cocokHeader =
        po.poNumber?.toLowerCase().includes(q) ||
        po.supplier?.name?.toLowerCase().includes(q);
      const cocokItem = (po.items || []).some((it) =>
        (it.description || '').toLowerCase().includes(q)
      );
      return cocokHeader || cocokItem;
    });
  }, [poMenungguAtasan, search]);

  const handleApprovePO = async (po) => {
    setBusyId(po.id);
    try {
      await poService.approvePO(po.id);
      toast.success(`${po.poNumber} disetujui`);
      bumpApproval();
    } catch (err) {
      toast.error(err.message || 'Gagal menyetujui PO');
    } finally {
      setBusyId(null);
    }
  };

  const handleRejectPO = async (po) => {
    const reason = window.prompt(`Alasan menolak ${po.poNumber}:`);
    if (!reason || !reason.trim()) return;
    setBusyId(po.id);
    try {
      await poService.rejectPO(po.id, reason.trim());
      toast.success(`${po.poNumber} ditolak`);
      bumpApproval();
    } catch (err) {
      toast.error(err.message || 'Gagal menolak PO');
    } finally {
      setBusyId(null);
    }
  };

  const toggleRow = (id) =>
    setExpandedRow((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="min-h-screen bg-[#0c0b09]">
      <Header />
      <div className="px-5 md:px-10 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-[#888] text-xs uppercase tracking-wider mb-1">Purchasing</p>
            <h2 className="text-2xl md:text-3xl text-[#f2ead9] font-bold">Pengajuan Bayar</h2>
            <p className="text-[#888] text-sm mt-1">
              PO yang sudah diverifikasi Finance dan menunggu persetujuan Atasan.
            </p>
          </div>
        </div>

        <ProjectSelector
          projectId={projectId}
          projectList={projectList}
          loading={false}
          onChange={(e) => { setProjectId(e.target.value || null); setSelectedPO(null); }}
        />

        <div className="mb-4 relative w-full md:w-80 mt-6">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
          <input
            type="text"
            placeholder="Cari no PO / no PPB / supplier / item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1a1814] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#666] focus:border-[#d4af37] outline-none"
          />
        </div>

        {/* DAFTAR PO MENUNGGU ATASAN */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-[#d4af37]" />
            <h3 className="text-sm font-bold text-[#f2ead9] uppercase tracking-wider">
              Menunggu Persetujuan Atasan
            </h3>
            <span className="text-xs text-[#666]">({filteredPoMenunggu.length})</span>
          </div>

          {loadingPo ? (
            <div className="text-center py-8 text-[#888] text-sm">Memuat PO...</div>
          ) : filteredPoMenunggu.length === 0 ? (
            <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-5 py-8 text-center">
              <AlertCircle size={22} className="text-[#555] mx-auto mb-2" />
              <p className="text-sm text-[#888]">
                {projectId
                  ? 'Tidak ada PO yang menunggu persetujuan Atasan.'
                  : 'Pilih proyek dulu untuk melihat PO-nya.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredPoMenunggu.map((po) => {
                const aktif = selectedPO?.id === po.id;
                const open = !!expandedPO[po.id];
                const busy = busyId === po.id;
                return (
                  <div
                    key={po.id}
                    className={`bg-[#1a1814] border rounded-xl p-4 transition-colors ${
                      aktif ? 'border-[#d4af37]' : 'border-[#2a2a2a] hover:border-[#d4af37]/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedPO((p) => ({ ...p, [po.id]: !p[po.id] }))}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-mono text-sm text-[#d4af37] font-bold">
                          {po.poNumber || `PO-${po.id.slice(0, 8)}`}
                        </span>
                        <ChevronRight
                          size={16}
                          className={`text-[#888] shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#38bdf8] mb-1">
                        <UserCheck size={11} /> {po.supplier?.name || 'Tanpa Supplier'}
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
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${poStatusBadge(po.status)}`}>
                          {poStatusLabel(po.status)}
                        </span>
                      </div>
                    </button>

                    {open && (
                      <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                        <p className="text-[11px] text-[#888] uppercase tracking-wider mb-2">
                          Item dalam PO ini
                        </p>
                        <POItemDetail po={po} showHeader={false} />
                        <div className="mt-3 flex gap-2">
                          <button
                            disabled={busy}
                            onClick={() => handleApprovePO(po)}
                            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Check size={15} /> Setujui
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => handleRejectPO(po)}
                            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <X size={15} /> Tolak
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* DAFTAR PENGAJUAN BAYAR — PO APPROVED, NOMOR PO SEBAGAI INFO UTAMA */}
        <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-2">
            <FileInput size={16} className="text-[#d4af37]" />
            <h3 className="text-sm font-bold text-[#f2ead9] uppercase tracking-wider">Daftar Pengajuan Bayar</h3>
            <span className="text-xs text-[#666]">({filteredPoApproved.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#22201c] text-[#888] text-left">
                  <th className="px-4 py-3 font-semibold w-8"></th>
                  <th className="px-4 py-3 font-semibold">No PO</th>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold text-right">Total Tagihan</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-10 text-[#888]">Memuat data...</td></tr>
                ) : filteredPoApproved.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-[#888]">Belum ada PO yang disetujui</td></tr>
                ) : (
                  filteredPoApproved.map((po) => {
                    const open = !!expandedRow[po.id];
                    const pengajuan = pengajuanAktif(po);
                    const status = pengajuan?.status || po.status;
                    return (
                      <React.Fragment key={po.id}>
                        <tr
                          onClick={() => toggleRow(po.id)}
                          className="border-t border-[#2a2a2a] hover:bg-white/[0.02] cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 text-center text-[#888]">
                            <ChevronDown
                              size={16}
                              className={`mx-auto transition-transform ${open ? 'rotate-180' : ''}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono text-white font-bold">
                                {po.poNumber || `PO-${po.id.slice(0, 8)}`}
                              </span>
                              {pengajuan?.noPengajuan && (
                                <span className="text-[11px] text-[#888] font-mono">
                                  PPB: {pengajuan.noPengajuan}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[#ccc]">
                            <div className="flex items-center gap-1.5">
                              <UserCheck size={12} className="text-[#38bdf8] shrink-0" />
                              {po.supplier?.name || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-[#ccc] font-mono">
                            {fmtRp(po.grandTotal)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge(status)}`}>
                              {statusLabel(status)}
                            </span>
                          </td>
                        </tr>
                        {open && (
                          <tr className="border-t border-[#2a2a2a] bg-[#15130f]">
                            <td colSpan={5} className="px-4 py-4">
                              <div className="flex items-center gap-2 mb-3 text-[11px] text-[#888] uppercase tracking-wider">
                                <Package size={12} className="text-[#d4af37]" />
                                Detail Item PO
                                <span className="text-[#555] normal-case tracking-normal">
                                  · {po.items?.length || 0} item
                                </span>
                              </div>
                              {(po.items || []).length === 0 ? (
                                <p className="text-xs text-[#666] italic py-2">PO ini belum punya item.</p>
                              ) : (
                                <div className="border border-white/10 rounded-lg overflow-hidden">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-white/[0.03] text-[#888] text-left">
                                        <th className="px-3 py-2 font-semibold">Item Name</th>
                                        <th className="px-3 py-2 font-semibold text-right">Qty</th>
                                        <th className="px-3 py-2 font-semibold text-right">Unit</th>
                                        <th className="px-3 py-2 font-semibold text-right">Price</th>
                                        <th className="px-3 py-2 font-semibold text-right">Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {po.items.map((it) => (
                                        <tr key={it.id} className="border-t border-white/5">
                                          <td className="px-3 py-2 text-white">
                                            <div className="flex items-center gap-1.5">
                                              <Package size={11} className="text-[#666] shrink-0" />
                                              <span>{it.description || '—'}</span>
                                            </div>
                                            {it.description2 && (
                                              <div className="text-[10px] text-[#666] mt-0.5">{it.description2}</div>
                                            )}
                                            {it.materialRequest?.groupName && (
                                              <div className="text-[10px] text-[#555] mt-0.5">
                                                {it.materialRequest.groupName}
                                              </div>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 text-right font-mono text-[#ccc] whitespace-nowrap">
                                            {fmtNum(it.qty)}
                                          </td>
                                          <td className="px-3 py-2 text-right text-[#ccc] whitespace-nowrap">
                                            {it.unit || '-'}
                                          </td>
                                          <td className="px-3 py-2 text-right font-mono text-[#ccc] whitespace-nowrap">
                                            {fmtRp(it.unitPrice)}
                                          </td>
                                          <td className="px-3 py-2 text-right font-mono text-[#d4af37] whitespace-nowrap">
                                            {fmtRp(it.total)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              {po.approvedBy?.name && (
                                <div className="mt-3 text-[11px] text-[#888] flex items-center gap-1.5">
                                  <UserCheck size={11} /> Disetujui oleh {po.approvedBy.name}
                                  {po.approvedAt && (
                                    <span className="text-[#555]">
                                      · {new Date(po.approvedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PengajuanBayarPage;