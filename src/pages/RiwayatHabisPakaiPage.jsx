import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  History, Search, RefreshCw, Package, Truck, AlertTriangle,
  ChevronRight, FileText, CalendarDays, Boxes, TrendingUp,
} from 'lucide-react';
import Header from '../components/Header';
import ProjectSelector from '../components/ProjectSelector';
import PurchaseOrderModal from '../components/PurchaseOrderModal';
import { lapanganService } from '../services/lapanganService';
import { projectService } from '../services/projectService';
import { fileUrl } from '../services/api';
import toast from 'react-hot-toast';

const fmtRp = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const fmtNum = (n) =>
  Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 4 });

const fmtTanggal = (d) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const statusBadge = (s) => {
  const map = {
    PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    PO_DIBUAT: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    FINANCE_APPROVED: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    ATASAN_APPROVED: 'bg-green-500/10 text-green-400 border-green-500/30',
    REJECTED: 'bg-red-500/10 text-red-400 border-red-500/30',
    LINKED: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    BELUM_APPROVE: 'bg-[#d4af37]/10 text-[#d4af37] border-[#d4af37]/30',
    MENUNGGU_ATASAN: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    APPROVED: 'bg-green-500/10 text-green-400 border-green-500/30',
  };
  return map[s] || 'bg-gray-500/10 text-gray-400 border-gray-500/30';
};

const statusLabel = (s) => {
  const map = {
    PENDING: 'Menunggu Purchasing',
    PO_DIBUAT: 'Menunggu Approve Finance',
    FINANCE_APPROVED: 'Menunggu Atasan',
    ATASAN_APPROVED: 'Completed',
    REJECTED: 'Ditolak',
    LINKED: 'Sudah Jadi PO',
    BELUM_APPROVE: 'Belum Approve Finance',
    MENUNGGU_ATASAN: 'Menunggu Atasan',
    APPROVED: 'Disetujui',
  };
  return map[s] || s || '-';
};

/**
 * Halaman sendiri untuk pembelian habis pakai.
 * Tombolnya tetap ada di Item Tracking, tapi daftarnya tidak dicampur
 * dengan material — isinya riwayat habis pakai:
 *   1. permintaan habis pakai dari lapangan + PO hasilnya
 *   2. PO kategori HABIS_PAKAI + surat jalannya
 *   3. kelebihan terima (volume datang > jumlah PO)
 */
const RiwayatHabisPakaiPage = () => {
  const [data, setData] = useState({ permintaan: [], poHabisPakai: [], kelebihan: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('permintaan');

  const [projectId, setProjectId] = useState(null);
  const [projectList, setProjectList] = useState([]);

  const [expandedPO, setExpandedPO] = useState({});
  const [previewSJ, setPreviewSJ] = useState(null);
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [selectedPermintaan, setSelectedPermintaan] = useState(null);

  const fetchProjects = useCallback(async () => {
    try {
      const d = await projectService.getAll();
      setProjectList(Array.isArray(d) ? d : d?.data || []);
    } catch (err) {
      console.error('Gagal memuat project:', err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    // Sebelum proyek dipilih, jangan tampilkan data lintas proyek.
    if (!projectId) {
      setData({ permintaan: [], poHabisPakai: [], kelebihan: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await lapanganService.getRiwayatHabisPakai(projectId);
      const payload = res?.data && !Array.isArray(res) ? res.data : res;
      setData({
        permintaan: Array.isArray(payload?.permintaan) ? payload.permintaan : [],
        poHabisPakai: Array.isArray(payload?.poHabisPakai) ? payload.poHabisPakai : [],
        kelebihan: Array.isArray(payload?.kelebihan) ? payload.kelebihan : [],
      });
    } catch (err) {
      toast.error('Gagal memuat riwayat habis pakai');
      setData({ permintaan: [], poHabisPakai: [], kelebihan: [] });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const cocok = useCallback(
    (teks) => !search.trim() || String(teks || '').toLowerCase().includes(search.toLowerCase()),
    [search]
  );

  const permintaanTampil = useMemo(
    () =>
      data.permintaan.filter(
        (p) =>
          cocok(p.nomor) || cocok(p.itemName) || cocok(p.alasan) ||
          cocok(p.po?.poNumber) || cocok(p.poHabisPakai?.poNumber)
      ),
    [data.permintaan, cocok]
  );

  const poTampil = useMemo(
    () =>
      data.poHabisPakai.filter(
        (po) =>
          cocok(po.poNumber) || cocok(po.supplier?.name) ||
          (po.items || []).some((it) => cocok(it.description))
      ),
    [data.poHabisPakai, cocok]
  );

  const kelebihanTampil = useMemo(
    () =>
      data.kelebihan.filter(
        (k) => cocok(k.description) || cocok(k.poNumber) || cocok(k.supplier?.name)
      ),
    [data.kelebihan, cocok]
  );

  const totalNilaiPO = data.poHabisPakai.reduce((s, po) => s + Number(po.grandTotal || 0), 0);

  const tabs = [
    { key: 'permintaan', label: 'Permintaan Habis Pakai', icon: FileText, jumlah: permintaanTampil.length },
    { key: 'po', label: 'PO Habis Pakai', icon: Boxes, jumlah: poTampil.length },
    { key: 'kelebihan', label: 'Kelebihan Terima', icon: AlertTriangle, jumlah: kelebihanTampil.length },
  ];

  return (
    <div className="min-h-screen bg-[#0c0b09]">
      <Header />
      <div className="px-5 md:px-10 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-[#888] text-xs uppercase tracking-wider mb-1">Pelaksanaan</p>
            <h2 className="text-2xl md:text-3xl text-[#f2ead9] font-bold flex items-center gap-3">
              <History size={26} className="text-[#d4af37]" /> Pembelian Habis Pakai
            </h2>
            <p className="text-[#888] text-sm mt-1">
              Riwayat pembelian habis pakai — terpisah dari daftar material.
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 border border-[#2a2a2a] text-[#ccc] px-4 py-2.5 rounded-lg hover:border-[#d4af37] hover:text-[#d4af37] transition-colors w-fit"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Muat Ulang
          </button>
        </div>

        <ProjectSelector
          projectId={projectId}
          projectList={projectList}
          loading={false}
          onChange={(e) => setProjectId(e.target.value || null)}
        />

        {/* Ringkasan */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-4 py-3">
            <p className="text-[11px] text-[#888] uppercase tracking-wider mb-1">Permintaan</p>
            <p className="text-xl font-bold text-[#f2ead9]">{data.permintaan.length}</p>
          </div>
          <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-4 py-3">
            <p className="text-[11px] text-[#888] uppercase tracking-wider mb-1">PO Habis Pakai</p>
            <p className="text-xl font-bold text-[#f2ead9]">{data.poHabisPakai.length}</p>
          </div>
          <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-4 py-3">
            <p className="text-[11px] text-[#888] uppercase tracking-wider mb-1">Nilai PO</p>
            <p className="text-xl font-bold text-[#d4af37] font-mono">{fmtRp(totalNilaiPO)}</p>
          </div>
          <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-4 py-3">
            <p className="text-[11px] text-[#888] uppercase tracking-wider mb-1">Kelebihan Terima</p>
            <p className={`text-xl font-bold ${data.kelebihan.length ? 'text-red-400' : 'text-[#f2ead9]'}`}>
              {data.kelebihan.length}
            </p>
          </div>
        </div>

        {/* Tab */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {tabs.map((t) => {
            const Icon = t.icon;
            const aktif = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  aktif
                    ? 'bg-[#d4af37]/10 text-[#d4af37] border-[#d4af37]/40'
                    : 'text-[#888] border-[#2a2a2a] hover:text-white hover:border-[#3a3a3a]'
                }`}
              >
                <Icon size={15} /> {t.label}
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  aktif ? 'bg-[#d4af37]/20' : 'bg-white/5'
                }`}>
                  {t.jumlah}
                </span>
              </button>
            );
          })}
        </div>

        {/* Progress tracker */}
        <div className="flex flex-wrap gap-2 mb-4">
          {['PENDING','PO_DIBUAT','FINANCE_APPROVED','ATASAN_APPROVED'].map((s, idx, arr) => (
            <div key={s} className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-1 rounded border ${statusBadge(s)}`}>{statusLabel(s)}</span>
              {idx < arr.length - 1 && <span className="text-[#555]">→</span>}
            </div>
          ))}
        </div>

        <div className="mb-4 relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
          <input
            type="text"
            placeholder="Cari item / nomor / supplier / PO..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1a1814] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#666] focus:border-[#d4af37] outline-none"
          />
        </div>

        {loading ? (
          <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl py-14 text-center text-[#888] text-sm">
            Memuat riwayat...
          </div>
        ) : (
          <>
            {/* TAB 1: permintaan */}
            {tab === 'permintaan' && (
              <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#22201c] text-[#888] text-left">
                        <th className="px-4 py-3 font-semibold">Nomor</th>
                        <th className="px-4 py-3 font-semibold">Item</th>
                        <th className="px-4 py-3 font-semibold text-right">Qty</th>
                        <th className="px-4 py-3 font-semibold">Alasan</th>
                        <th className="px-4 py-3 font-semibold">Ket. Volume</th>
                        <th className="px-4 py-3 font-semibold">Ket. Harga</th>
                        <th className="px-4 py-3 font-semibold">PO Habis Pakai</th>
                        <th className="px-4 py-3 font-semibold text-center">Status</th>
                        <th className="px-4 py-3 font-semibold text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permintaanTampil.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-10 text-[#888]">
                            Belum ada permintaan habis pakai
                          </td>
                        </tr>
                      ) : (
                        permintaanTampil.map((p) => (
                          <tr key={p.id} className="border-t border-[#2a2a2a] hover:bg-white/[0.02]">
                            <td className="px-4 py-3 font-mono text-xs text-[#d4af37] whitespace-nowrap">
                              {p.nomor || '-'}
                              <div className="text-[10px] text-[#666] font-sans">
                                {fmtTanggal(p.createdAt)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-white">
                              <div className="flex items-center gap-1.5">
                                <Package size={12} className="text-[#666] shrink-0" />
                                {p.itemName}
                              </div>
                              {p.catatan && (
                                <div className="text-[10px] text-[#666] mt-0.5">{p.catatan}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-[#ccc] whitespace-nowrap">
                              {fmtNum(p.qty)} {p.unit}
                            </td>
                            <td className="px-4 py-3 text-[#888] text-xs max-w-[240px]">
                              {p.alasan || '-'}
                              {p.requestedBy?.name && (
                                <div className="text-[10px] text-[#555] mt-0.5">
                                  oleh {p.requestedBy.name}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-[#888] text-xs max-w-[160px]">
                              {p.keteranganVolume || '-'}
                            </td>
                            <td className="px-4 py-3 text-[#888] text-xs max-w-[160px]">
                              {p.keteranganHarga || '-'}
                            </td>
                            <td className="px-4 py-3 text-[#38bdf8] font-mono text-xs whitespace-nowrap">
                              {p.poHabisPakai?.poNumber || p.po?.poNumber || '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge(p.status)}`}>
                                {statusLabel(p.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {p.status === 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPermintaan(p);
                                    setPoModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-[#d4af37] text-black text-xs font-bold hover:bg-[#c4a030] transition-colors"
                                >
                                  Buat PO
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: PO habis pakai */}
            {tab === 'po' && (
              <div className="flex flex-col gap-3">
                {poTampil.length === 0 ? (
                  <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl py-14 text-center text-[#888] text-sm">
                    Belum ada PO habis pakai
                  </div>
                ) : (
                  poTampil.map((po) => {
                    const open = !!expandedPO[po.id];
                    const items = po.items || [];
                    return (
                      <div key={po.id} className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedPO((prev) => ({ ...prev, [po.id]: !prev[po.id] }))}
                          className="w-full flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 text-left hover:bg-white/[0.02]"
                        >
                          <ChevronRight
                            size={16}
                            className={`text-[#888] shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
                          />
                          <span className="font-mono font-bold text-[#d4af37]">
                            {po.poNumber || '-'}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#38bdf8]">
                            <Truck size={12} /> {po.supplier?.name || 'Tanpa Supplier'}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#888]">
                            <CalendarDays size={12} /> {fmtTanggal(po.tanggal)}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#888]">
                            <Package size={12} /> {items.length} item
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge(po.status)}`}>
                            {statusLabel(po.status)}
                          </span>
                          <span className="ml-auto font-mono text-sm font-bold text-[#f2ead9]">
                            {fmtRp(po.grandTotal)}
                          </span>
                        </button>

                        {open && (
                          <div className="border-t border-[#2a2a2a] bg-[#100e0a] px-5 py-4">
                            {(po.permintaanHabisPakai || []).length > 0 && (
                              <div className="mb-3 text-xs text-[#888]">
                                <span className="text-[#666]">Dari permintaan: </span>
                                {(po.permintaanHabisPakai || []).map((pm) => (
                                  <span key={pm.id} className="mr-3 text-[#38bdf8] font-mono">
                                    {pm.nomor} ({pm.itemName})
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="border border-[#2a2a2a] rounded-lg overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-white/[0.03] text-[#888] text-left">
                                    <th className="px-3 py-2 font-semibold">Item</th>
                                    <th className="px-3 py-2 font-semibold text-right">Qty PO</th>
                                    <th className="px-3 py-2 font-semibold text-right">Harga</th>
                                    <th className="px-3 py-2 font-semibold text-right">Jumlah</th>
                                    <th className="px-3 py-2 font-semibold">Ket. Volume</th>
                                    <th className="px-3 py-2 font-semibold">Ket. Harga</th>
                                    <th className="px-3 py-2 font-semibold text-center">Diterima</th>
                                    <th className="px-3 py-2 font-semibold text-center">Surat Jalan</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((it) => {
                                    const terima = Number(it.receivedVolume || 0);
                                    const qty = Number(it.qty || 0);
                                    const lebih = terima - qty > 0.0001;
                                    const kurang = terima > 0 && terima < qty - 0.0001;
                                    const sj = it.deliveryReceipts || [];
                                    const overQty = Number(it.overQty || 0);
                                    const overHarga = Number(it.overHarga || 0);
                                    return (
                                      <tr key={it.id} className="border-t border-white/5">
                                        <td className="px-3 py-2 text-white">{it.description}</td>
                                        <td className="px-3 py-2 text-right font-mono text-[#ccc] whitespace-nowrap">
                                          {fmtNum(qty)} {it.unit}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-[#ccc] whitespace-nowrap">
                                          {fmtRp(it.unitPrice)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-[#d4af37] whitespace-nowrap">
                                          {fmtRp(it.total)}
                                        </td>
                                        <td className="px-3 py-2 text-[#888] text-xs max-w-[180px]">
                                          {it.keteranganVolume || '-'}
                                        </td>
                                        <td className="px-3 py-2 text-[#888] text-xs max-w-[180px]">
                                          {it.keteranganHarga || '-'}
                                        </td>
                                        <td className="px-3 py-2 text-center whitespace-nowrap">
                                          {terima <= 0 ? (
                                            <span className="text-[10px] text-[#666]">belum</span>
                                          ) : lebih ? (
                                            <span className="text-[10px] font-bold text-red-400">
                                              {fmtNum(terima)} · LEBIH {fmtNum(terima - qty)}
                                            </span>
                                          ) : kurang ? (
                                            <span className="text-[10px] text-[#d4af37]">
                                              {fmtNum(terima)} · sisa {fmtNum(qty - terima)}
                                            </span>
                                          ) : (
                                            <span className="text-[10px] text-[#4caf50] font-bold">
                                              {fmtNum(terima)} · lengkap
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          {sj.length === 0 ? (
                                            <span className="text-[10px] text-[#666]">-</span>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setPreviewSJ(sj)}
                                              className="text-[10px] text-[#38bdf8] hover:underline"
                                            >
                                              {sj.length} surat jalan
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 3: kelebihan terima */}
            {tab === 'kelebihan' && (
              <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#2a2a2a] flex items-start gap-2">
                  <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-[#888]">
                    Barang yang datang <span className="text-red-400">melebihi jumlah PO</span>.
                    Sistem tidak membuat permintaan otomatis — ini catatan buat pihak perusahaan
                    supaya kelebihannya masuk hitungan habis pakai.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#22201c] text-[#888] text-left">
                        <th className="px-4 py-3 font-semibold">Item</th>
                        <th className="px-4 py-3 font-semibold">PO Asal</th>
                        <th className="px-4 py-3 font-semibold text-right">Qty PO</th>
                        <th className="px-4 py-3 font-semibold text-right">Diterima</th>
                        <th className="px-4 py-3 font-semibold text-right">Kelebihan</th>
                        <th className="px-4 py-3 font-semibold text-center">Surat Jalan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kelebihanTampil.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-[#888]">
                            Tidak ada penerimaan yang melebihi jumlah PO
                          </td>
                        </tr>
                      ) : (
                        kelebihanTampil.map((k) => (
                          <tr key={k.id} className="border-t border-[#2a2a2a] hover:bg-white/[0.02]">
                            <td className="px-4 py-3 text-white">
                              <div className="flex items-center gap-1.5">
                                <TrendingUp size={12} className="text-red-400 shrink-0" />
                                {k.description}
                              </div>
                              {k.groupName && (
                                <div className="text-[10px] text-[#666] mt-0.5">{k.groupName}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-[#38bdf8] font-mono text-xs whitespace-nowrap">
                              {k.poNumber || '-'}
                              {k.supplier?.name && (
                                <div className="text-[10px] text-[#666] font-sans">
                                  {k.supplier.name}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-[#ccc] whitespace-nowrap">
                              {fmtNum(k.qtyPO)} {k.unit}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-[#ccc] whitespace-nowrap">
                              {fmtNum(k.receivedVolume)} {k.unit}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-red-400 whitespace-nowrap">
                              +{fmtNum(k.kelebihan)} {k.unit}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {(k.suratJalan || []).length === 0 ? (
                                <span className="text-[10px] text-[#666]">-</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewSJ(
                                      k.suratJalan.map((r) => ({
                                        id: r.id,
                                        nomorSJ: r.nomorSJ,
                                        tanggal: r.tanggal,
                                        fotoUrls: r.fotoUrls,
                                      }))
                                    )
                                  }
                                  className="text-[10px] text-[#38bdf8] hover:underline"
                                >
                                  {k.suratJalan.length} surat jalan
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Preview surat jalan */}
      {previewSJ && (
        <div
          className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4"
          onClick={() => setPreviewSJ(null)}
        >
          <div
            className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText size={18} className="text-[#d4af37]" /> Surat Jalan
              </h3>
              <button onClick={() => setPreviewSJ(null)} className="text-[#888] hover:text-white">
                ✕
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto space-y-4">
              {previewSJ.map((sj) => {
                let fotos = sj.fotoUrls;
                if (typeof fotos === 'string') {
                  try { fotos = JSON.parse(fotos); } catch { fotos = fotos ? [fotos] : []; }
                }
                if (!Array.isArray(fotos)) fotos = [];
                return (
                  <div key={sj.id} className="border border-[#2a2a2a] rounded-lg p-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 text-xs">
                      <span className="font-mono text-[#d4af37] font-bold">{sj.nomorSJ}</span>
                      <span className="text-[#888]">{fmtTanggal(sj.tanggal)}</span>
                      <span className="text-[#666]">{fmtNum(sj.volumeDiterima)} diterima</span>
                    </div>
                    {sj.catatan && <p className="text-xs text-[#888] mb-2">{sj.catatan}</p>}
                    {fotos.length === 0 ? (
                      <p className="text-xs text-[#666] italic">Tanpa foto</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {fotos.map((f, i) => (
                          <a
                            key={i}
                            href={fileUrl(f)}
                            target="_blank"
                            rel="noreferrer"
                            className="block w-20 h-20 rounded border border-[#2a2a2a] overflow-hidden hover:border-[#d4af37]"
                          >
                            <img src={fileUrl(f)} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Buat PO Habis Pakai */}
      {poModalOpen && selectedPermintaan && (
        <PurchaseOrderModal
          projectId={selectedPermintaan.projectId}
          kategoriPO="HABIS_PAKAI"
          sumberPo={selectedPermintaan.poId || null}
          alasanHabisPakai={selectedPermintaan.alasan || null}
          permintaanHabisPakaiId={selectedPermintaan.id}
          selectedItems={[
            {
              id: `php_${selectedPermintaan.id}`,
              mrItemId: selectedPermintaan.mrItemId || null,
              itemName: selectedPermintaan.itemName,
              description: selectedPermintaan.itemName,
              unit: selectedPermintaan.unit,
              estimatedVolume: Number(selectedPermintaan.qty || 0),
              orderedQty: 0,
              pricePerUnit: 0,
            }
          ]}
          onClose={() => {
            setPoModalOpen(false);
            setSelectedPermintaan(null);
          }}
          onSuccess={() => {
            setPoModalOpen(false);
            setSelectedPermintaan(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default RiwayatHabisPakaiPage;
