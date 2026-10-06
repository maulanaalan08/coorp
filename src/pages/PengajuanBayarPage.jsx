import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileInput,
  Search,
  Check,
  X,
  ChevronDown,
  Package,
  AlertCircle,
  CalendarDays,
  UserCheck,
  Wrench,
} from 'lucide-react';
import Header from '../components/Header';
import { purchasingService } from '../services/purchasingService';
import ProjectSelector from '../components/ProjectSelector';
import { projectService } from '../services/projectService';
import { useRabGroups } from '../hooks/useRabGroups';
import toast from 'react-hot-toast';

const fmtRp = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });
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

const FILTER_TABS = [
  { key: 'SEMUA', label: 'Semua' },
  { key: 'MATERIAL', label: 'PO Material' },
  { key: 'JASA', label: 'PO Jasa' },
  { key: 'HABIS_PAKAI', label: 'PO Habis Pakai' },
];

const STATUS_TABS = [
  { key: 'MENUNGGU', label: 'Menunggu Atasan' },
  { key: 'DISETUJUI', label: 'Disetujui' },
  { key: 'DITOLAK', label: 'Ditolak' },
  { key: 'SEMUA', label: 'Semua' },
];

const typeLabel = (kategori) => {
  if (kategori === 'HABIS_PAKAI') return 'Habis Pakai';
  if (kategori === 'JASA') return 'Jasa';
  return 'Material';
};

const typeBadge = (kategori) => {
  if (kategori === 'HABIS_PAKAI') return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
  if (kategori === 'JASA') return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
  return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
};

const PengajuanBayarPage = ({ initialProjectId = null }) => {
  const [pengajuanList, setPengajuanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState({});
  const [activeFilter, setActiveFilter] = useState('SEMUA');
  const [activeStatus, setActiveStatus] = useState('MENUNGGU');

  const [projectId, setProjectId] = useState(initialProjectId);
  const [projectList, setProjectList] = useState([]);
  const [approvalTick, setApprovalTick] = useState(0);
  const [busyId, setBusyId] = useState(null);

  const { rabGroups: groups = [] } = useRabGroups(projectId);

  const allRabItems = useMemo(() => {
    const list = [];
    groups.forEach((g) => {
      list.push(...(g.items || []));
      (g.children || []).forEach((c) => {
        list.push(...(c.items || []));
      });
    });
    return list;
  }, [groups]);

  const getRapForJasa = useCallback((it) => {
    return allRabItems.find(r => 
      r.id === it.rabItemId || 
      String(r.itemName || '').trim().toLowerCase() === String(it.description || '').trim().toLowerCase()
    ) || null;
  }, [allRabItems]);

  const bumpApproval = () => setApprovalTick((t) => t + 1);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await projectService.getAll();
      setProjectList(Array.isArray(data) ? data : data?.data || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchPengajuan = useCallback(async () => {
    if (!projectId) {
      setPengajuanList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await purchasingService.getPengajuanBayar(projectId);
      setPengajuanList(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Gagal memuat data pengajuan bayar');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchPengajuan();
  }, [fetchPengajuan, approvalTick]);

  useEffect(() => {
    const onChanged = () => {
      bumpApproval();
      fetchPengajuan();
    };
    window.addEventListener('po-status-changed', onChanged);
    return () => window.removeEventListener('po-status-changed', onChanged);
  }, [fetchPengajuan]);

  const filteredRows = useMemo(() => {
    let list = pengajuanList;

    if (activeFilter === 'MATERIAL') {
      list = list.filter((p) => p.purchaseOrder?.kategoriPO === 'MATERIAL' || !p.purchaseOrder?.kategoriPO);
    } else if (activeFilter === 'JASA') {
      list = list.filter((p) => p.purchaseOrder?.kategoriPO === 'JASA' || !!p.jasaId || !!p.purchaseOrder?.jasaId);
    } else if (activeFilter === 'HABIS_PAKAI') {
      list = list.filter((p) => p.purchaseOrder?.kategoriPO === 'HABIS_PAKAI');
    }

    if (activeStatus === 'MENUNGGU') list = list.filter((p) => p.status === 'APPROVED_FINANCE');
    else if (activeStatus === 'DISETUJUI') list = list.filter((p) => p.status === 'APPROVED');
    else if (activeStatus === 'DITOLAK') list = list.filter((p) => p.status === 'REJECTED');

    if (!search.trim()) return list;
    const q = search.toLowerCase();

    return list.filter((p) => {
      const po = p.purchaseOrder || {};
      const jasaName = p.jasa?.nama || po.jasa?.nama || '';
      const supplierName = p.supplier?.name || po.supplier?.name || '';
      const cocokHeader =
        po.poNumber?.toLowerCase().includes(q) ||
        p.noPengajuan?.toLowerCase().includes(q) ||
        supplierName.toLowerCase().includes(q) ||
        jasaName.toLowerCase().includes(q) ||
        typeLabel(po.kategoriPO).toLowerCase().includes(q);
      const cocokItem = (po.items || []).some((it) =>
        String(it.description || '').toLowerCase().includes(q),
      );
      return cocokHeader || cocokItem;
    });
  }, [pengajuanList, activeFilter, activeStatus, search]);

  const handleApprovePengajuan = async (pengajuan) => {
    setBusyId(pengajuan.id);
    try {
      await purchasingService.approvePengajuan(pengajuan.id);
      toast.success(`${pengajuan.noPengajuan || pengajuan.id} disetujui`);
      bumpApproval();
    } catch (err) {
      toast.error(err.message || 'Gagal menyetujui pengajuan');
    } finally {
      setBusyId(null);
    }
  };

  const handleRejectPengajuan = async (pengajuan) => {
    const reason = window.prompt(`Alasan menolak ${pengajuan.noPengajuan || pengajuan.id}:`);
    if (!reason || !reason.trim()) return;
    setBusyId(pengajuan.id);
    try {
      await purchasingService.rejectPengajuan(pengajuan.id, reason.trim());
      toast.success(`${pengajuan.noPengajuan || pengajuan.id} ditolak`);
      bumpApproval();
    } catch (err) {
      toast.error(err.message || 'Gagal menolak pengajuan');
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
            <p className="text-[#888] text-xs uppercase tracking-wider mb-1">Finance</p>
            <h2 className="text-2xl md:text-3xl text-[#f2ead9] font-bold">Pengajuan Bayar</h2>
            <p className="text-[#888] text-sm mt-1">
              Daftar PO material/jasa yang sudah diverifikasi finance dan menunggu persetujuan atasan.
            </p>
          </div>
        </div>

        <ProjectSelector
          projectId={projectId}
          projectList={projectList}
          loading={false}
          onChange={(e) => {
            setProjectId(e.target.value || null);
            setExpandedRow({});
          }}
        />

        <div className="flex flex-col md:flex-row gap-4 mt-6 mb-4 items-start md:items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 flex-wrap">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveStatus(tab.key);
                    setExpandedRow({});
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    activeStatus === tab.key
                      ? 'bg-[#d4af37] text-black border-[#d4af37]'
                      : 'bg-[#1a1814] text-[#aaa] border-[#2a2a2a] hover:border-[#d4af37]/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveFilter(tab.key);
                    setExpandedRow({});
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    activeFilter === tab.key
                      ? 'bg-[#4a7c9b] text-white border-[#4a7c9b]'
                      : 'bg-[#1a1814] text-[#aaa] border-[#2a2a2a] hover:border-[#4a7c9b]/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
            <input
              type="text"
              placeholder="Cari no PO / no PPB / supplier / jasa / item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1a1814] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#666] focus:border-[#d4af37] outline-none"
            />
          </div>
        </div>

        <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-2">
            <FileInput size={16} className="text-[#d4af37]" />
            <h3 className="text-sm font-bold text-[#f2ead9] uppercase tracking-wider">Daftar Pengajuan Bayar</h3>
            <span className="text-xs text-[#666]">({filteredRows.length})</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#22201c] text-[#888] text-left">
                  <th className="px-4 py-3 font-semibold w-8"></th>
                  <th className="px-4 py-3 font-semibold">No PO</th>
                  <th className="px-4 py-3 font-semibold">Jenis</th>
                  <th className="px-4 py-3 font-semibold">Supplier / Jasa</th>
                  <th className="px-4 py-3 font-semibold">Cara Bayar</th>
                  <th className="px-4 py-3 font-semibold text-right">Total Tagihan</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-[#888]">Memuat data...</td>
                  </tr>
                ) : !projectId ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-[#888]">Pilih proyek dulu untuk melihat data.</td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-[#888]">Tidak ada data pengajuan bayar untuk filter ini.</td>
                  </tr>
                ) : (
                  filteredRows.map((pengajuan) => {
                    const po = pengajuan.purchaseOrder || {};
                    const open = !!expandedRow[pengajuan.id];
                    const status = pengajuan.status || 'PENDING';
                    const busy = busyId === pengajuan.id;
                    const isJasa = po.kategoriPO === 'JASA' || !!pengajuan.jasaId || !!po.jasaId;
                    return (
                      <React.Fragment key={pengajuan.id}>
                        <tr
                          onClick={() => toggleRow(pengajuan.id)}
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
                                {po.poNumber || `PO-${po.id?.slice(0, 8) || pengajuan.id.slice(0, 8)}`}
                              </span>
                              {pengajuan?.noPengajuan && (
                                <span className="text-[11px] text-[#888] font-mono">PPB: {pengajuan.noPengajuan}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${typeBadge(po.kategoriPO)}`}>
                              {typeLabel(po.kategoriPO)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#ccc]">
                            <div className="flex items-center gap-1.5">
                              {isJasa ? (
                                <Wrench size={12} className="text-cyan-300 shrink-0" />
                              ) : (
                                <UserCheck size={12} className="text-[#38bdf8] shrink-0" />
                              )}
                              {isJasa
                                ? pengajuan.jasa?.nama || po.jasa?.nama || '-'
                                : pengajuan.supplier?.name || po.supplier?.name || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {po.caraPembayaran ? (
                              <span className="text-[11px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 font-semibold">
                                {po.caraPembayaran}
                              </span>
                            ) : (
                              <span className="text-[#555] text-xs">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-[#ccc] font-mono">
                            {fmtRp(pengajuan.totalTagihan || po.grandTotal)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge(status)}`}>
                              {statusLabel(status)}
                            </span>
                          </td>
                        </tr>

                        {open && (
                          <tr className="border-t border-[#2a2a2a] bg-[#15130f]">
                            <td colSpan={7} className="px-4 py-4">
                              <div className="flex items-center gap-2 mb-3 text-[11px] text-[#888] uppercase tracking-wider">
                                <Package size={12} className="text-[#d4af37]" />
                                Detail Item PO
                                <span className="text-[#555] normal-case tracking-normal">
                                  · {po.items?.length || 0} item
                                </span>
                              </div>

                              {(po.keteranganVolume || po.keteranganHarga) && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {po.keteranganVolume && (
                                    <span className="text-[11px] px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                                      <AlertCircle size={10} /> Ket. Volume: {po.keteranganVolume}
                                    </span>
                                  )}
                                  {po.keteranganHarga && (
                                    <span className="text-[11px] px-2 py-1 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1">
                                      <AlertCircle size={10} /> Ket. Harga: {po.keteranganHarga}
                                    </span>
                                  )}
                                </div>
                              )}

                              {po.items?.length === 0 ? (
                                <p className="text-xs text-[#666] italic py-2">PO ini belum punya item.</p>
                              ) : (
                                <div className="border border-white/10 rounded-lg overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-white/[0.03] text-[#888] text-left">
                                        <th className="px-3 py-2 font-semibold">Item Name</th>
                                        <th className="px-3 py-2 font-semibold text-right">Qty</th>
                                        <th className="px-3 py-2 font-semibold">Unit</th>
                                        <th className="px-3 py-2 font-semibold text-right">Price</th>
                                        <th className="px-3 py-2 font-semibold text-right">Subtotal</th>
                                        <th className="px-3 py-2 font-semibold text-right">Ket. Volume</th>
                                        <th className="px-3 py-2 font-semibold text-right">Ket. Harga</th>
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
                                          </td>
                                          <td className="px-3 py-2 text-right font-mono text-[#ccc] whitespace-nowrap">{fmtNum(it.qty || 0)}</td>
                                          <td className="px-3 py-2 text-right text-[#ccc] whitespace-nowrap">{it.unit || '-'}</td>
                                          <td className="px-3 py-2 text-right font-mono text-[#ccc] whitespace-nowrap">{fmtRp(it.unitPrice)}</td>
                                          <td className="px-3 py-2 text-right font-mono text-[#d4af37] whitespace-nowrap">{fmtRp(it.total)}</td>
                                          <td className="px-3 py-2 text-right whitespace-nowrap" style={{ fontSize: 11, color: '#ef4444' }}>
                                            {po.kategoriPO === 'HABIS_PAKAI'
                                              ? (po.keteranganVolume || it.keteranganVolume || '-')
                                              : (() => {
                                                  const rapData = getRapForJasa(it);
                                                  const rap = it.materialRequest?.estimatedVolume || it.estimatedVolume || rapData?.volume || 0;
                                                  if (!rap) return <span style={{ color: '#444' }}>-</span>;
                                                  const diff = Number(it.qty || 0) - Number(rap);
                                                  if (diff > 0) return <span>Over +{fmtNum(diff)}</span>;
                                                  if (diff < 0) return <span style={{ color: '#f59e0b' }}>Under {fmtNum(diff)}</span>;
                                                  return <span style={{ color: '#22c55e' }}>Sesuai</span>;
                                                })()}
                                          </td>
                                          <td className="px-3 py-2 text-right whitespace-nowrap" style={{ fontSize: 11, color: '#f97316' }}>
                                            {po.kategoriPO === 'HABIS_PAKAI'
                                              ? (po.keteranganHarga || it.keteranganHarga || '-')
                                              : (() => {
                                                  const rapData = getRapForJasa(it);
                                                  const rapP = it.materialRequest?.pricePerUnit || it.pricePerUnit || rapData?.rapUnitPrice || 0;
                                                  if (!rapP) return <span style={{ color: '#444' }}>-</span>;
                                                  const diff = Number(it.unitPrice || 0) - Number(rapP);
                                                  if (diff > 0) return <span>Over +{fmtRp(diff)}</span>;
                                                  if (diff < 0) return <span style={{ color: '#f59e0b' }}>Under {fmtRp(diff)}</span>;
                                                  return <span style={{ color: '#22c55e' }}>Sesuai</span>;
                                                })()}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {activeStatus === 'MENUNGGU' && pengajuan.status === 'APPROVED_FINANCE' && (
                                <div className="mt-3 flex gap-2 max-w-md">
                                  <button
                                    disabled={busy}
                                    onClick={() => handleApprovePengajuan(pengajuan)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    <Check size={15} /> Setujui Pembayaran
                                  </button>
                                  <button
                                    disabled={busy}
                                    onClick={() => handleRejectPengajuan(pengajuan)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    <X size={15} /> Tolak Pembayaran
                                  </button>
                                </div>
                              )}

                              {pengajuan.status === 'APPROVED' && pengajuan.approvedBy?.name && (
                                <div className="mt-3 text-[11px] text-[#888] flex items-center gap-1.5">
                                  <UserCheck size={11} /> Disetujui oleh {pengajuan.approvedBy?.name}
                                  {pengajuan.approvedAt && (
                                    <span className="text-[#555]">
                                      ·{' '}
                                      {new Date(pengajuan.approvedAt).toLocaleDateString('id-ID', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      })}
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
