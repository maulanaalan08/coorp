import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, FileCheck2, Wallet, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { poService } from '../services/poService';
import { purchasingService } from '../services/purchasingService';

const fmtRp = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

/**
 * Notifikasi pojok kanan — dipisah tegas per peran biar tidak tercampur:
 *
 *  - FINANCE  : tugasnya VERIFIKASI (tingkat 1). Yang muncul cuma antrian
 *               verifikasi finance (PO BELUM_APPROVE + pengajuan PENDING).
 *  - ATASAN   : tugasnya mengecek hasil kerja finance (tingkat 2). Yang
 *               muncul cuma antrian approve atasan (PO MENUNGGU_ATASAN +
 *               pengajuan APPROVED_FINANCE).
 *
 * SUPER_ADMIN boleh melihat keduanya, tapi tetap dipisah dalam dua grup
 * dengan tujuan halaman berbeda — finance tidak bisa "mengetuk" approval
 * atasan lewat notifikasi ini.
 */
const NotificationBell = ({ onNavigate }) => {
  const { user, token, isLoading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ poFinance: [], poAtasan: [], pjFinance: [], pjAtasan: [], pbWarning: [] });
  const wrapRef = useRef(null);

  const role = user?.role || '';
  const isAdmin = role === 'SUPER_ADMIN';
  const isFinance = role === 'FINANCE' || isAdmin;
  const isAtasan = role === 'PROJECT_MANAGER' || isAdmin;

  const muat = useCallback(async () => {
    // Jangan fetch sampai auth selesai loading & token pasti ada.
    // Mencegah 401 Unauthorized saat dashboard pertama kali dibuka.
    if (authLoading || !token) return;
    try {
      // Penting: tanpa projectId. Ini inbox lintas proyek — jumlahnya
      // dipakai badge, dan tiap item bawa proyeknya sendiri.
      const [poF, poA, pjF, pjA, pbSup] = await Promise.all([
        isFinance ? poService.getInboxFinance().catch(() => []) : Promise.resolve([]),
        isAtasan ? poService.getInboxAtasan().catch(() => []) : Promise.resolve([]),
        isFinance ? purchasingService.getInboxFinancePengajuan().catch(() => []) : Promise.resolve([]),
        isAtasan ? purchasingService.getInboxAtasanPengajuan().catch(() => []) : Promise.resolve([]),
        isFinance ? purchasingService.getPembayaranSupplier().catch(() => []) : Promise.resolve([]),
      ]);
      const arr = (d) => (Array.isArray(d) ? d : []);
      
      const pbArr = arr(pbSup);
      const today = new Date();
      const pbWarning = pbArr.filter(p => {
        if (!p.jatuhTempo) return false;
        if (p.status === 'PAID' || p.status === 'LUNAS') return false;
        const jt = new Date(p.jatuhTempo);
        const diffDays = Math.ceil((jt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      });

      setData({
        poFinance: arr(poF),
        poAtasan: arr(poA),
        pjFinance: arr(pjF),
        pjAtasan: arr(pjA),
        pbWarning,
      });
    } catch {
      /* diam — notifikasi tidak boleh bikin halaman error */
    }
  }, [isFinance, isAtasan, authLoading, token]);

  useEffect(() => {
    muat();
    const t = setInterval(muat, 30000); // ringan: 4 request kecil per setengah menit
    return () => clearInterval(t);
  }, [muat]);

  useEffect(() => {
    const luar = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', luar);
    return () => document.removeEventListener('mousedown', luar);
  }, []);

  const totalFinance = data.poFinance.length + data.pjFinance.length + (data.pbWarning?.length || 0);
  const totalAtasan = data.poAtasan.length + data.pjAtasan.length;
  const total = totalFinance + totalAtasan;

  const buka = (tab, projectId) => {
    setOpen(false);
    onNavigate?.(tab, projectId || null);
  };

  const Baris = ({ icon: Icon, warna, judul, sub, jumlah, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/5 text-left transition-colors"
    >
      <span className={`mt-0.5 shrink-0 ${warna}`}>
        <Icon size={16} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-semibold text-[#e8e3d8]">
          {jumlah} {judul}
        </span>
        {sub && <span className="block text-[11px] text-[#888] mt-0.5 truncate">{sub}</span>}
      </span>
      <ChevronRight size={14} className="text-[#666] shrink-0 mt-1" />
    </button>
  );

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-full text-[#a89c85] hover:text-[#e8c874] hover:bg-white/5 transition-colors relative"
        title="Notifikasi approval"
      >
        <Bell size={20} />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#d4af37] text-[#0c0b09] text-[10px] font-bold flex items-center justify-center">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-[#161513] border border-[#363024] rounded-xl shadow-2xl z-[120] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#363024]">
            <p className="text-xs font-bold text-[#d4af37] uppercase tracking-wider">
              Perlu Tindakan Anda
            </p>
            <p className="text-[11px] text-[#888] mt-0.5">
              {role === 'SUPER_ADMIN'
                ? 'Antrian finance & atasan (dipisah per peran)'
                : isFinance
                  ? 'Antrian verifikasi finance'
                  : 'Antrian approval atasan'}
            </p>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {/* ===== GRUP FINANCE (verifikasi tingkat 1) ===== */}
            {isFinance && (
              <>
                <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-wider">
                    Finance — Verifikasi
                  </span>
                  {totalFinance > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#38bdf8]/10 text-[#38bdf8] font-bold">
                      {totalFinance}
                    </span>
                  )}
                </div>
                {totalFinance === 0 ? (
                  <p className="px-4 pb-2 text-[11px] text-[#666] italic">
                    Tidak ada antrian verifikasi.
                  </p>
                ) : (
                  <>
                    {data.poFinance.length > 0 && (
                      <Baris
                        icon={FileCheck2}
                        warna="text-[#38bdf8]"
                        jumlah={data.poFinance.length}
                        judul="PO perlu verifikasi finance"
                        sub={`Terbaru: ${data.poFinance[0]?.poNumber || '-'} — ${data.poFinance[0]?.supplier?.name || data.poFinance[0]?.supplierName || ''}`}
                        onClick={() => buka('finance', data.poFinance[0]?.projectId)}
                      />
                    )}
                    {data.pjFinance.length > 0 && (
                      <Baris
                        icon={Wallet}
                        warna="text-[#38bdf8]"
                        jumlah={data.pjFinance.length}
                        judul="pengajuan bayar perlu verifikasi"
                        sub={`Terbaru: ${data.pjFinance[0]?.noPengajuan || '-'} — ${fmtRp(data.pjFinance[0]?.totalTagihan)}`}
                        onClick={() => buka('pengajuan-bayar', data.pjFinance[0]?.projectId)}
                      />
                    )}
                    {data.pbWarning?.length > 0 && (
                      <Baris
                        icon={Wallet}
                        warna="text-red-400"
                        jumlah={data.pbWarning.length}
                        judul="pembayaran jatuh tempo (H-7)"
                        sub={`Segera bayar: ${data.pbWarning[0]?.noPembayaran || '-'}`}
                        onClick={() => buka('pembayaran-supplier')}
                      />
                    )}
                  </>
                )}
              </>
            )}

            {/* ===== GRUP ATASAN (approval tingkat 2) ===== */}
            {isAtasan && (
              <>
                <div className="px-4 pt-3 pb-1 flex items-center justify-between border-t border-[#2a2620] mt-1">
                  <span className="text-[10px] font-bold text-[#4ade80] uppercase tracking-wider">
                    Atasan — Approval
                  </span>
                  {totalAtasan > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#4ade80]/10 text-[#4ade80] font-bold">
                      {totalAtasan}
                    </span>
                  )}
                </div>
                {totalAtasan === 0 ? (
                  <p className="px-4 pb-2 text-[11px] text-[#666] italic">
                    Tidak ada antrian approval.
                  </p>
                ) : (
                  <>
                    {data.poAtasan.length > 0 && (
                      <Baris
                        icon={FileCheck2}
                        warna="text-[#4ade80]"
                        jumlah={data.poAtasan.length}
                        judul="PO menunggu approval atasan"
                        sub={`Terbaru: ${data.poAtasan[0]?.poNumber || '-'} — sudah diverifikasi finance`}
                        onClick={() => buka('pengajuan-bayar', data.poAtasan[0]?.projectId)}
                      />
                    )}
                    {data.pjAtasan.length > 0 && (
                      <Baris
                        icon={Wallet}
                        warna="text-[#4ade80]"
                        jumlah={data.pjAtasan.length}
                        judul="pengajuan bayar menunggu approval"
                        sub={`Terbaru: ${data.pjAtasan[0]?.noPengajuan || '-'} — ${fmtRp(data.pjAtasan[0]?.totalTagihan)}`}
                        onClick={() => buka('pengajuan-bayar', data.pjAtasan[0]?.projectId)}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
