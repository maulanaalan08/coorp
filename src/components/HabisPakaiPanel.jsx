import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, PackagePlus, Send, XCircle, Link2, Edit, Printer } from 'lucide-react';
import { lapanganService } from '../services/lapanganService';
import { poService } from '../services/poService';
import toast from 'react-hot-toast';

const fmtNum = (n) => {
  const num = Number(n || 0);
  return isNaN(num) ? '0' : parseFloat(num.toFixed(2)).toLocaleString('id-ID');
};

const fmtRp = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const STATUS_LABEL = {
  PENDING: 'Menunggu PO',
  LINKED: 'Sudah di-PO',
  REJECTED: 'Ditolak',
};

const PO_STATUS_BADGE = {
  BELUM_APPROVE: { label: 'BELUM APPROVE', cls: 'bg-[#d4af37]/10 text-[#d4af37] border-[#d4af37]/30' },
  MENUNGGU_ATASAN: { label: 'MENUNGGU ATASAN', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  APPROVED: { label: 'APPROVED', cls: 'bg-[#2e7d32]/20 text-[#4caf50] border-[#4caf50]/30' },
  REJECTED: { label: 'REJECTED', cls: 'bg-red-500/10 text-red-400 border-red-500/30' },
};

/**
 * Antrean permintaan pembelian habis pakai dari lapangan (Item Tracking).
 * Purchasing buat PO kategori HABIS_PAKAI dari sini.
 * Termasuk riwayat PO Habis Pakai dengan tombol Edit (untuk REJECTED / BELUM_APPROVE).
 */
const HabisPakaiPanel = ({ projectId, refreshKey, onCreatePO, onEditPo, onChanged }) => {
  const [rows, setRows] = useState([]);
  const [poList, setPoList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('PENDING');

  const load = useCallback(async () => {
    if (!projectId) {
      setRows([]);
      setPoList([]);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    try {
      const [permData, poData] = await Promise.all([
        lapanganService.getPermintaanHabisPakai(projectId, filter || undefined),
        poService.getPOs({ projectId, kategoriPO: 'HABIS_PAKAI' }),
      ]);
      setRows(Array.isArray(permData) ? permData : []);
      setPoList(Array.isArray(poData) ? poData : []);
    } catch (err) {
      const msg = err.message || '';
      if (!msg.includes('Sesi login')) {
        toast.error(msg || 'Gagal memuat data habis pakai');
      }
      setRows([]);
      setPoList([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, filter]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleReject = async (row) => {
    const alasan = window.prompt('Alasan menolak permintaan ini:');
    if (alasan === null) return;
    try {
      await lapanganService.rejectPermintaanHabisPakai(row.id, alasan);
      toast.success('Permintaan ditolak');
      load();
      if (onChanged) onChanged();
    } catch (err) {
      toast.error(err.message || 'Gagal menolak permintaan');
    }
  };

  if (!projectId) {
    return (
      <div className="py-16 text-center text-[#888] text-sm">
        Pilih proyek dulu untuk melihat antrean permintaan habis pakai.
      </div>
    );
  }

  const tabs = [
    { key: 'PENDING', label: 'Antrean' },
    { key: 'LINKED', label: 'Sudah di-PO' },
    { key: 'REJECTED', label: 'Ditolak' },
    { key: '', label: 'Semua' },
  ];

  return (
    <div className="space-y-6">
      {/* ── ANTREAN PERMINTAAN ── */}
      <div className="bg-[#11100e] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-white/5 bg-[#161513] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="m-0 text-lg font-bold flex items-center gap-2 text-white">
              <PackagePlus size={18} className="text-[#d4af37]" />
              Permintaan Habis Pakai
            </h3>
            <p className="text-[#888] text-sm mt-1 mb-0">
              Diajukan lapangan saat barang di PO habis tapi masih butuh. Buat PO kategori HABIS_PAKAI.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {tabs.map((t) => (
              <button
                key={t.key || 'semua'}
                type="button"
                onClick={() => setFilter(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filter === t.key
                  ? 'bg-[#d4af37]/15 text-[#d4af37] border-[#d4af37]/40'
                  : 'bg-transparent text-[#888] border-white/10 hover:text-white'
                  }`}
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={load}
              className="p-2 rounded-lg border border-white/10 text-[#888] hover:text-white transition-colors"
              title="Muat ulang"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="py-12 text-center text-[#888] text-sm">
            {loading ? 'Memuat...' : 'Tidak ada permintaan pada filter ini.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1a1917] border-b border-white/5 text-xs uppercase tracking-wider text-[#888]">
                  <th className="p-4 font-semibold">No. Permintaan</th>
                  <th className="p-4 font-semibold">Item</th>
                  <th className="p-4 font-semibold text-right">Jumlah</th>
                  <th className="p-4 font-semibold">Alasan</th>
                  <th className="p-4 font-semibold">PO Induk</th>
                  <th className="p-4 font-semibold">PO Habis Pakai</th>
                  <th className="p-4 font-semibold text-center">Status</th>
                  <th className="p-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-4 text-[#d4af37] font-mono text-xs">{r.nomor || '-'}</td>
                    <td className="p-4 text-white text-sm font-medium">{r.itemName}</td>
                    <td className="p-4 text-right font-mono text-sm text-[#ccc]">
                      {fmtNum(r.qty)} {r.unit}
                    </td>
                    <td className="p-4 text-[#999] text-xs max-w-[220px]">{r.alasan || '-'}</td>
                    <td className="p-4 text-[#38bdf8] font-mono text-xs">{r.po?.poNumber || '-'}</td>
                    <td className="p-4 text-[#38bdf8] font-mono text-xs">
                      {r.poHabisPakai?.poNumber || '-'}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${r.status === 'LINKED'
                        ? 'bg-[#2e7d32]/20 text-[#4caf50] border-[#4caf50]/30'
                        : r.status === 'REJECTED'
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-[#d4af37]/10 text-[#d4af37] border-[#d4af37]/30'
                        }`}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {r.status === 'PENDING' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => onCreatePO(r)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#d4af37] text-[#0c0b09] hover:bg-[#e8c874] transition-colors"
                          >
                            <Send size={12} /> Buat PO
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(r)}
                            className="p-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Tolak permintaan"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      ) : r.status === 'LINKED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#4caf50]">
                          <Link2 size={12} /> Tertaut
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#555] italic">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── RIWAYAT PO HABIS PAKAI ── */}
      <div className="bg-[#11100e] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-white/5 bg-[#161513]">
          <h3 className="m-0 text-lg font-bold flex items-center gap-2 text-white">
            <Printer size={18} className="text-[#a78bfa]" />
            Riwayat PO Habis Pakai
          </h3>
          <p className="text-[#888] text-sm mt-1 mb-0">
            Daftar PO yang sudah dibuat dari permintaan habis pakai. Klik Edit untuk PO yang belum di-approve atau ditolak.
          </p>
        </div>

        {poList.length === 0 ? (
          <div className="py-12 text-center text-[#888] text-sm">
            {loading ? 'Memuat...' : 'Belum ada PO Habis Pakai untuk proyek ini.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1a1917] border-b border-white/5 text-xs uppercase tracking-wider text-[#888]">
                  <th className="p-4 font-semibold">No. PO</th>
                  <th className="p-4 font-semibold">Tanggal</th>
                  <th className="p-4 font-semibold">Supplier</th>
                  <th className="p-4 font-semibold">Item</th>
                  <th className="p-4 font-semibold text-right">Qty</th>
                  <th className="p-4 font-semibold text-right">Total</th>
                  <th className="p-4 font-semibold text-center">Status</th>
                  <th className="p-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {poList.map((po) => {
                  const badge = PO_STATUS_BADGE[po.status] || { label: po.status, cls: 'bg-gray-500/10 text-gray-400 border-gray-500/30' };
                  const canEdit = po.status === 'REJECTED' || po.status === 'BELUM_APPROVE';
                  const totalQty = (po.items || []).reduce((s, it) => s + Number(it.qty || 0), 0);
                  const totalRp = (po.items || []).reduce((s, it) => s + Number(it.total || 0), 0);
                  return (
                    <tr key={po.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-4 text-[#d4af37] font-mono text-xs">{po.poNumber}</td>
                      <td className="p-4 text-[#ccc] text-xs">
                        {po.tanggal ? new Date(po.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                      </td>
                      <td className="p-4 text-white text-sm">{po.supplier?.name || '-'}</td>
                      <td className="p-4 text-[#ccc] text-sm max-w-[300px]">
                        {(po.items || []).map(it => it.description).join(', ') || '-'}
                      </td>
                      <td className="p-4 text-right font-mono text-sm text-[#ccc]">
                        {fmtNum(totalQty)}
                      </td>
                      <td className="p-4 text-right font-mono text-sm text-[#d4af37]">
                        {fmtRp(totalRp)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {po.status === 'REJECTED' && po.rejectReason && (
                          <div className="mt-1 text-[10px] text-red-400/80 max-w-[200px] mx-auto italic">
                            {po.rejectReason}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {canEdit && onEditPo && (
                            <button
                              type="button"
                              onClick={() => onEditPo(po)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/40 hover:bg-[#d4af37]/25 transition-colors"
                              title="Edit PO"
                            >
                              <Edit size={12} /> Edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => poService.printPO(po.id)}
                            className="p-1.5 rounded-lg text-[#888] hover:text-white hover:bg-white/10 transition-colors"
                            title="Cetak PDF"
                          >
                            <Printer size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HabisPakaiPanel;
