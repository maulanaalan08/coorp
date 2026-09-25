import React, { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Search, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import Header from '../components/Header';
import { purchasingService } from '../services/purchasingService';
import toast from 'react-hot-toast';

const fmtRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const todayStr = () => new Date().toISOString().split('T')[0];

const SummaryCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
      <Icon size={22} />
    </div>
    <div>
      <p className="text-[#888] text-xs uppercase tracking-wider">{label}</p>
      <p className="text-white text-lg font-bold mt-1">{fmtRp(value)}</p>
    </div>
  </div>
);

const LaporanHarianPage = () => {
  const [tanggal, setTanggal] = useState(todayStr());
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [mode, setMode] = useState('harian'); // 'harian' | 'range'
  const [laporan, setLaporan] = useState([]);
  const [summary, setSummary] = useState({ totalPembelian: 0, totalRetur: 0, totalPembayaran: 0, net: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchLaporan = useCallback(async () => {
    setLoading(true);
    try {
      let data;
      if (mode === 'harian') {
        data = await purchasingService.getLaporanHarian(tanggal);
      } else {
        data = await purchasingService.getLaporanRange(from, to);
      }
      const rows = Array.isArray(data?.rows) ? data.rows : Array.isArray(data) ? data : [];
      setLaporan(rows);
      setSummary({
        totalPembelian: data?.totalPembelian || data?.summary?.totalPembelian || 0,
        totalRetur: data?.totalRetur || data?.summary?.totalRetur || 0,
        totalPembayaran: data?.totalPembayaran || data?.summary?.totalPembayaran || 0,
        net: data?.net || data?.summary?.net || 0,
      });
    } catch (err) {
      toast.error('Gagal memuat laporan');
      setLaporan([]);
    } finally {
      setLoading(false);
    }
  }, [mode, tanggal, from, to]);

  useEffect(() => {
    fetchLaporan();
  }, [fetchLaporan]);

  const filtered = search.trim()
    ? laporan.filter((r) => {
        const q = search.toLowerCase();
        return r.noTransaksi?.toLowerCase().includes(q) || r.supplier?.toLowerCase().includes(q) || r.tipe?.toLowerCase().includes(q);
      })
    : laporan;

  const tipeBadge = (tipe) => {
    const map = {
      PO: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      RETUR: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      PEMBAYARAN: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    };
    return map[tipe] || 'bg-gray-500/10 text-gray-400 border-gray-500/30';
  };

  return (
    <div className="min-h-screen bg-[#0c0b09]">
      <Header />
      <div className="px-5 md:px-10 pb-10">
        <div className="mb-6">
          <p className="text-[#888] text-xs uppercase tracking-wider mb-1">Purchasing</p>
          <h2 className="text-2xl md:text-3xl text-[#f2ead9] font-bold">Laporan Harian</h2>
          <p className="text-[#888] text-sm mt-1">Laporan transaksi pembelian harian & range.</p>
        </div>

        {/* Mode Toggle + Date Pickers */}
        <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl p-5 mb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div>
              <label className="block text-sm text-[#888] mb-1">Mode</label>
              <div className="flex gap-2">
                <button onClick={() => setMode('harian')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'harian' ? 'bg-[#d4af37] text-[#0c0b09]' : 'bg-[#0c0b09] text-[#888] border border-[#2a2a2a] hover:text-white'}`}>Harian</button>
                <button onClick={() => setMode('range')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'range' ? 'bg-[#d4af37] text-[#0c0b09]' : 'bg-[#0c0b09] text-[#888] border border-[#2a2a2a] hover:text-white'}`}>Range Tanggal</button>
              </div>
            </div>
            {mode === 'harian' ? (
              <div className="flex-1">
                <label className="block text-sm text-[#888] mb-1">Tanggal</label>
                <div className="relative w-full md:w-64">
                  <CalendarDays size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
                  <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none" />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col sm:flex-row gap-4">
                <div>
                  <label className="block text-sm text-[#888] mb-1">Dari</label>
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full sm:w-48 bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-[#888] mb-1">Sampai</label>
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full sm:w-48 bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none" />
                </div>
              </div>
            )}
            <button onClick={fetchLaporan} className="bg-[#d4af37] text-[#0c0b09] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#e8c874] transition-colors w-fit">
              Tampilkan
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard icon={TrendingUp} label="Total Pembelian" value={summary.totalPembelian} color="bg-blue-500/10 text-blue-400" />
          <SummaryCard icon={TrendingDown} label="Total Retur" value={summary.totalRetur} color="bg-orange-500/10 text-orange-400" />
          <SummaryCard icon={Wallet} label="Total Pembayaran" value={summary.totalPembayaran} color="bg-purple-500/10 text-purple-400" />
          <SummaryCard icon={Wallet} label="Net" value={summary.net} color="bg-[#d4af37]/10 text-[#d4af37]" />
        </div>

        {/* Search */}
        <div className="mb-4 relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
          <input type="text" placeholder="Cari transaksi / supplier..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-[#1a1814] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#666] focus:border-[#d4af37] outline-none" />
        </div>

        {/* Table */}
        <div className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#22201c] text-[#888] text-left">
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">No Transaksi</th>
                  <th className="px-4 py-3 font-semibold text-center">Tipe</th>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold text-right">Masuk</th>
                  <th className="px-4 py-3 font-semibold text-right">Keluar</th>
                  <th className="px-4 py-3 font-semibold text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-[#888]">Memuat laporan...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-[#888]">Tidak ada data untuk periode ini</td></tr>
                ) : (
                  filtered.map((row, idx) => (
                    <tr key={idx} className="border-t border-[#2a2a2a] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-[#888]">{row.tanggal ? new Date(row.tanggal).toLocaleDateString('id-ID') : '-'}</td>
                      <td className="px-4 py-3 text-white font-medium">{row.noTransaksi || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${tipeBadge(row.tipe)}`}>{row.tipe || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-[#ccc]">{row.supplier || '-'}</td>
                      <td className="px-4 py-3 text-right text-green-400">{row.masuk ? fmtRp(row.masuk) : '-'}</td>
                      <td className="px-4 py-3 text-right text-red-400">{row.keluar ? fmtRp(row.keluar) : '-'}</td>
                      <td className="px-4 py-3 text-right text-[#d4af37] font-semibold">{fmtRp(row.saldo)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaporanHarianPage;
