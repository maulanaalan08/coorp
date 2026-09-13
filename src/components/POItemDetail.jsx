import React from 'react';
import { Package, Truck, UserCheck, CalendarDays } from 'lucide-react';

const fmtRp = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const fmtNum = (n) =>
  Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 4 });

const fmtTanggal = (d) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

/**
 * Daftar item sebuah PO. Dipakai buat nunjukin "item apa aja yang di-PO kan"
 * di Pengajuan Bayar dan di panel persetujuan atasan.
 */
const POItemDetail = ({ po, compact = false, showHeader = true }) => {
  if (!po) return null;
  const items = po.items || [];

  return (
    <div className="flex flex-col gap-3">
      {showHeader && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-[#38bdf8]">
            <Truck size={12} /> {po.supplier?.name || 'Tanpa Supplier'}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#888]">
            <CalendarDays size={12} /> {fmtTanggal(po.tanggal)}
          </span>
          {po.approvedBy?.name && (
            <span className="inline-flex items-center gap-1.5 text-[#888]">
              <UserCheck size={12} /> Disetujui {po.approvedBy.name}
            </span>
          )}
          {po.kategoriPO && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                po.kategoriPO === 'HABIS_PAKAI'
                  ? 'bg-[#d4af37]/10 text-[#d4af37] border-[#d4af37]/30'
                  : 'bg-white/5 text-[#888] border-white/10'
              }`}
            >
              {po.kategoriPO === 'HABIS_PAKAI' ? 'Habis Pakai' : 'Material'}
            </span>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-xs text-[#666] italic py-2">PO ini belum punya item.</div>
      ) : (
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-white/[0.03] text-[#888] text-left">
                <th className="px-3 py-2 font-semibold">Item</th>
                {!compact && <th className="px-3 py-2 font-semibold text-right">Qty</th>}
                <th className="px-3 py-2 font-semibold text-right">Harga</th>
                {!compact && <th className="px-3 py-2 font-semibold text-right">Jumlah</th>}
                <th className="px-3 py-2 font-semibold text-center">Diterima</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const terima = Number(it.receivedVolume || 0);
                const qty = Number(it.qty || 0);
                const lebih = terima - qty > 0.0001;   // barang kelebihan
                const kurang = terima > 0 && terima < qty - 0.0001;
                const sisa = Math.max(0, qty - terima);
                return (
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
                    {!compact && (
                      <td className="px-3 py-2 text-right font-mono text-[#ccc] whitespace-nowrap">
                        {fmtNum(qty)} {it.unit}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right font-mono text-[#ccc] whitespace-nowrap">
                      {fmtRp(it.unitPrice)}
                    </td>
                    {!compact && (
                      <td className="px-3 py-2 text-right font-mono text-[#d4af37] whitespace-nowrap">
                        {fmtRp(it.total)}
                      </td>
                    )}
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      {terima <= 0 ? (
                        <span className="text-[10px] text-[#666]">belum</span>
                      ) : lebih ? (
                        <span
                          className="text-[10px] font-bold text-red-400"
                          title={`Kelebihan ${fmtNum(terima - qty)} ${it.unit} dari jumlah PO`}
                        >
                          {fmtNum(terima)} {it.unit} · LEBIH {fmtNum(terima - qty)}
                        </span>
                      ) : kurang ? (
                        <span className="text-[10px] text-[#d4af37]">
                          {fmtNum(terima)} {it.unit} · sisa {fmtNum(sisa)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#4caf50] font-bold">
                          {fmtNum(terima)} {it.unit} · lengkap
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default POItemDetail;
