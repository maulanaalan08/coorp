import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  Briefcase,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Percent,
  CheckCircle2,
  Package,
  Wrench,
  Receipt,
  FileText,
  AlertCircle,
  Eye,
} from 'lucide-react';
import Header from '../components/Header';
import glBankService from '../services/glBankService';
import { projectService } from '../services/projectService';
import toast from 'react-hot-toast';

const fmtRp = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const fmtTgl = (d) =>
  d
    ? new Date(d).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '-';

export default function LaporanLabaRugiPage() {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [filterDari, setFilterDari] = useState('');
  const [filterSampai, setFilterSampai] = useState('');
  const [labaData, setLabaData] = useState(null);

  // Fetch Projects List
  useEffect(() => {
    projectService
      .getAll()
      .then((res) => {
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        setProjects(list);
        if (list.length > 0 && !selectedProjectId) {
          // default to first project
          setSelectedProjectId(list[0].id);
        }
      })
      .catch((err) => console.error('Gagal mengambil daftar proyek:', err));
  }, []);

  // Fetch Laba Rugi Data
  const fetchLabaRugi = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedProjectId) params.projectId = selectedProjectId;
      if (filterDari) params.dari = filterDari;
      if (filterSampai) params.sampai = filterSampai;

      const data = await glBankService.getLaporanLaba(params);
      setLabaData(data);
    } catch (err) {
      toast.error('Gagal memuat laporan laba rugi: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, filterDari, filterSampai]);

  useEffect(() => {
    fetchLabaRugi();
  }, [fetchLabaRugi]);

  // Handle Export Excel (.xlsx)
  const handleExportExcel = async () => {
    setDownloading(true);
    try {
      const params = {};
      if (selectedProjectId) params.projectId = selectedProjectId;
      if (filterDari) params.dari = filterDari;
      if (filterSampai) params.sampai = filterSampai;

      const blob = await glBankService.exportExcelLabaRugiBlob(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const currentProj = projects.find((p) => p.id === selectedProjectId);
      const safeName = currentProj
        ? String(currentProj.name || 'Proyek').replace(/[^a-zA-Z0-9_-]/g, '_')
        : 'Semua_Proyek';
      a.download = `Laporan-Laba-Rugi-${safeName}.xlsx`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Laporan Excel 1 Sheet berhasil diunduh!');
    } catch (err) {
      toast.error('Gagal mengunduh file Excel: ' + (err.message || ''));
    } finally {
      setDownloading(false);
    }
  };

  const isSpecificProject = Boolean(labaData && labaData.project);
  const summary = labaData?.summary || labaData?.overall || {
    totalPendapatan: 0,
    totalPengeluaran: 0,
    labaRugi: 0,
    profitMargin: 0,
  };

  const isProfit = Number(summary.labaRugi || 0) >= 0;

  return (
    <div className="min-h-screen bg-[#0c0b09] text-[#f2ead9]">
      <Header />

      <div className="px-5 md:px-10 pb-16">
        {/* Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#888] text-xs uppercase tracking-wider">
                Finance &amp; Reporting
              </span>
              <span className="text-[#555]">•</span>
              <span className="text-[#d4af37] text-xs font-semibold">
                Project Profitability
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#f2ead9] flex items-center gap-2.5">
              <TrendingUp className="text-[#d4af37]" size={28} />
              Laporan Laba Rugi per Proyek
            </h1>
            <p className="text-[#888] text-sm mt-1 max-w-3xl">
              Akumulasi realisasi pendapatan total uang masuk dikurangi total pengeluaran uang keluar dari Buku Besar. Dilengkapi pengelompokan PO material/alat, PO jasa, invoice operasional, dan ekspor Excel 1 sheet.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={fetchLabaRugi}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-[#161513] hover:bg-[#1f1d19] border border-[#2a2a2a] hover:border-[#d4af37]/40 text-sm font-medium rounded-xl transition-all"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-[#d4af37]' : 'text-[#888]'} />
              <span>Segarkan</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1b5e20] hover:bg-[#2e7d32] border border-[#388e3c] text-white text-sm font-semibold rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              <FileSpreadsheet size={16} />
              <span>{downloading ? 'Mengunduh...' : 'Cetak Excel (.xlsx)'}</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-[#14120e] border border-[#252320] rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Project Selector */}
            <div className="flex items-center gap-2 min-w-[280px]">
              <Briefcase size={16} className="text-[#d4af37] shrink-0" />
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-[#1b1915] border border-[#2a2a2a] focus:border-[#d4af37] rounded-xl px-3 py-2 text-xs text-[#f2ead9] font-semibold outline-none"
              >
                <option value="">-- Rekap Semua Proyek --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.client?.name ? `(${p.client.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#777]">Periode:</span>
              <input
                type="date"
                value={filterDari}
                onChange={(e) => setFilterDari(e.target.value)}
                className="bg-[#1b1915] border border-[#2a2a2a] rounded-xl px-2.5 py-1.5 text-xs text-[#f2ead9] focus:border-[#d4af37] outline-none"
              />
              <span className="text-xs text-[#555]">s/d</span>
              <input
                type="date"
                value={filterSampai}
                onChange={(e) => setFilterSampai(e.target.value)}
                className="bg-[#1b1915] border border-[#2a2a2a] rounded-xl px-2.5 py-1.5 text-xs text-[#f2ead9] focus:border-[#d4af37] outline-none"
              />
              {(filterDari || filterSampai) && (
                <button
                  onClick={() => {
                    setFilterDari('');
                    setFilterSampai('');
                  }}
                  className="text-xs text-[#888] hover:text-[#d4af37] underline ml-1"
                >Atur Ulang</button>
              )}
            </div>
          </div>

          {isSpecificProject && (
            <div className="text-xs text-[#888]">
              Klien:{' '}
              <span className="font-semibold text-white">
                {labaData.project?.client?.name || '-'}
              </span>
            </div>
          )}
        </div>

        {/* Executive KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Uang Masuk */}
          <div className="bg-[#14120e] border border-[#252320] rounded-2xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-[#888] text-xs mb-1">
              <span className="uppercase tracking-wider font-semibold">Total Pendapatan</span>
              <ArrowUpRight size={16} className="text-emerald-400" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-emerald-400">
              {fmtRp(summary.totalPendapatan)}
            </div>
            <div className="text-[11px] text-[#777] mt-2 pt-2 border-t border-[#222]">
              Akumulasi uang masuk (Buku Besar)
            </div>
          </div>

          {/* Total Uang Keluar */}
          <div className="bg-[#14120e] border border-[#252320] rounded-2xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-[#888] text-xs mb-1">
              <span className="uppercase tracking-wider font-semibold">Total Pengeluaran</span>
              <ArrowDownRight size={16} className="text-red-400" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-red-400">
              {fmtRp(summary.totalPengeluaran)}
            </div>
            <div className="text-[11px] text-[#777] mt-2 pt-2 border-t border-[#222]">
              Akumulasi uang keluar (Buku Besar)
            </div>
          </div>

          {/* Laba / (Rugi) Bersih */}
          <div className={`rounded-2xl p-4 flex flex-col justify-between shadow-sm border ${
            isProfit
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : 'bg-red-950/20 border-red-500/30'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`uppercase tracking-wider font-bold ${
                isProfit ? 'text-emerald-300' : 'text-red-300'
              }`}>
                {isProfit ? 'Laba Bersih (Surplus)' : 'Rugi Bersih (Defisit)'}
              </span>
              {isProfit ? (
                <TrendingUp size={16} className="text-emerald-400" />
              ) : (
                <TrendingDown size={16} className="text-red-400" />
              )}
            </div>
            <div className={`text-xl md:text-2xl font-extrabold ${
              isProfit ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {fmtRp(summary.labaRugi)}
            </div>
            <div className="text-[11px] text-[#888] mt-2 pt-2 border-t border-white/5">
              = Total Masuk - Total Keluar
            </div>
          </div>

          {/* Profit Margin */}
          <div className="bg-[#14120e] border border-[#252320] rounded-2xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-[#888] text-xs mb-1">
              <span className="uppercase tracking-wider font-semibold">Profit Margin</span>
              <Percent size={15} className="text-[#d4af37]" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-[#d4af37]">
              {summary.profitMargin || 0} %
            </div>
            <div className="text-[11px] text-[#777] mt-2 pt-2 border-t border-[#222]">
              Persentase laba terhadap pendapatan
            </div>
          </div>
        </div>

        {/* VIEW 1: JIKA MEMILIH PROYEK SPESIFIK */}
        {isSpecificProject && labaData ? (
          <div className="space-y-8">
            {/* ======================================================== */}
            {/* GROUP 1: PENDAPATAN / UANG MASUK */}
            {/* ======================================================== */}
            <div className="bg-[#14120e] border border-[#252320] rounded-2xl overflow-hidden shadow-lg">
              <div className="px-5 py-4 bg-emerald-950/20 border-b border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <ArrowUpRight size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      I. Pendapatan (Total Uang Masuk)
                    </h3>
                    <p className="text-xs text-[#888]">
                      Penerimaan pembayaran dari Penjualan Desain dan Termin Penjualan Klien
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#888] block">Subtotal Pendapatan:</span>
                  <span className="text-base font-extrabold text-emerald-400">
                    {fmtRp(labaData.pendapatan.totalPendapatan)}
                  </span>
                </div>
              </div>

              {/* Sub-Group 1.A: Penjualan Desain */}
              <div className="p-5 border-b border-[#222]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
                    <FileText size={14} />
                    A. Penjualan Desain (Design Quotation)
                  </h4>
                  <span className="text-xs font-semibold text-white">
                    Subtotal: {fmtRp(labaData.pendapatan.subtotalDesain)}
                  </span>
                </div>

                {labaData.pendapatan.desain.length === 0 ? (
                  <p className="text-xs text-[#666] italic py-2">
                    Belum ada transaksi penerimaan penjualan desain.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#222] text-[#777] uppercase text-[10px]">
                          <th className="py-2 px-3">Tanggal</th>
                          <th className="py-2 px-3">No. Dokumen</th>
                          <th className="py-2 px-3">Pihak / Klien</th>
                          <th className="py-2 px-3">Keterangan</th>
                          <th className="py-2 px-3 text-right">Nominal Masuk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e1c18]">
                        {labaData.pendapatan.desain.map((r) => (
                          <tr key={r.id} className="hover:bg-white/[0.02]">
                            <td className="py-2.5 px-3 text-[#bbb]">{fmtTgl(r.tanggal)}</td>
                            <td className="py-2.5 px-3 font-mono text-[#d4af37]">
                              {r.noReferensi || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-white">{r.pihak || '-'}</td>
                            <td className="py-2.5 px-3 text-[#aaa]">{r.keterangan || '-'}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                              {fmtRp(r.nominal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Sub-Group 1.B: Penjualan Klien / Termin */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
                    <Briefcase size={14} />
                    B. Penjualan Klien / Termin Proyek (SPK Client)
                  </h4>
                  <span className="text-xs font-semibold text-white">
                    Subtotal: {fmtRp(labaData.pendapatan.subtotalKlien)}
                  </span>
                </div>

                {labaData.pendapatan.klien.length === 0 ? (
                  <p className="text-xs text-[#666] italic py-2">
                    Belum ada transaksi penerimaan termin proyek klien.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#222] text-[#777] uppercase text-[10px]">
                          <th className="py-2 px-3">Tanggal</th>
                          <th className="py-2 px-3">No. Dokumen</th>
                          <th className="py-2 px-3">Pihak / Klien</th>
                          <th className="py-2 px-3">Keterangan</th>
                          <th className="py-2 px-3 text-right">Nominal Masuk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e1c18]">
                        {labaData.pendapatan.klien.map((r) => (
                          <tr key={r.id} className="hover:bg-white/[0.02]">
                            <td className="py-2.5 px-3 text-[#bbb]">{fmtTgl(r.tanggal)}</td>
                            <td className="py-2.5 px-3 font-mono text-[#d4af37]">
                              {r.noReferensi || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-white">{r.pihak || '-'}</td>
                            <td className="py-2.5 px-3 text-[#aaa]">{r.keterangan || '-'}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                              {fmtRp(r.nominal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* ======================================================== */}
            {/* GROUP 2: PENGELUARAN / UANG KELUAR */}
            {/* ======================================================== */}
            <div className="bg-[#14120e] border border-[#252320] rounded-2xl overflow-hidden shadow-lg">
              <div className="px-5 py-4 bg-red-950/20 border-b border-red-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30">
                    <ArrowDownRight size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      II. Pengeluaran / Biaya Proyek (Total Uang Keluar)
                    </h3>
                    <p className="text-xs text-[#888]">
                      Realisasi belanja material, alat, mandor/subkon jasa, serta operasional proyek
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#888] block">Subtotal Biaya:</span>
                  <span className="text-base font-extrabold text-red-400">
                    {fmtRp(labaData.pengeluaran.totalPengeluaran)}
                  </span>
                </div>
              </div>

              {/* Sub-Group 2.A: PO Material & Alat */}
              <div className="p-5 border-b border-[#222]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Package size={14} />
                    A. PO Material &amp; Pembelian/Sewa Alat
                  </h4>
                  <span className="text-xs font-semibold text-white">
                    Subtotal: {fmtRp(labaData.pengeluaran.subtotalMaterialAlat)}
                  </span>
                </div>

                {labaData.pengeluaran.materialAlat.length === 0 ? (
                  <p className="text-xs text-[#666] italic py-2">
                    Belum ada pengeluaran PO material atau alat.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#222] text-[#777] uppercase text-[10px]">
                          <th className="py-2 px-3">Tanggal</th>
                          <th className="py-2 px-3">No. PO / Ref</th>
                          <th className="py-2 px-3">Supplier / Toko</th>
                          <th className="py-2 px-3">Rincian Barang / Keterangan</th>
                          <th className="py-2 px-3">Vol / Satuan</th>
                          <th className="py-2 px-3 text-right">Nominal Keluar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e1c18]">
                        {labaData.pengeluaran.materialAlat.map((r) => (
                          <tr key={r.id} className="hover:bg-white/[0.02]">
                            <td className="py-2.5 px-3 text-[#bbb]">{fmtTgl(r.tanggal)}</td>
                            <td className="py-2.5 px-3 font-mono text-[#d4af37]">
                              {r.noReferensi || r.purchaseOrder?.poNumber || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-white">
                              {r.pihak || r.purchaseOrder?.supplier?.name || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-[#aaa] max-w-xs">{r.keterangan || '-'}</td>
                            <td className="py-2.5 px-3 text-[#888]">
                              {r.keteranganVolume || r.purchaseOrder?.items?.map(it => `${it.orderQty}`).join(', ') || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-red-400">
                              {fmtRp(r.nominal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Sub-Group 2.B: PO Jasa & Mandor */}
              <div className="p-5 border-b border-[#222]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Wrench size={14} />
                    B. PO Jasa &amp; Mandor (Subkontraktor / Upah Kerja)
                  </h4>
                  <span className="text-xs font-semibold text-white">
                    Subtotal: {fmtRp(labaData.pengeluaran.subtotalJasa)}
                  </span>
                </div>

                {labaData.pengeluaran.jasa.length === 0 ? (
                  <p className="text-xs text-[#666] italic py-2">
                    Belum ada pengeluaran PO jasa atau mandor.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#222] text-[#777] uppercase text-[10px]">
                          <th className="py-2 px-3">Tanggal</th>
                          <th className="py-2 px-3">No. PO / Ref</th>
                          <th className="py-2 px-3">Nama Mandor / Subkon</th>
                          <th className="py-2 px-3">Rincian Pekerjaan</th>
                          <th className="py-2 px-3 text-right">Nominal Keluar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e1c18]">
                        {labaData.pengeluaran.jasa.map((r) => (
                          <tr key={r.id} className="hover:bg-white/[0.02]">
                            <td className="py-2.5 px-3 text-[#bbb]">{fmtTgl(r.tanggal)}</td>
                            <td className="py-2.5 px-3 font-mono text-[#d4af37]">
                              {r.noReferensi || r.purchaseOrder?.poNumber || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-white">
                              {r.pihak || r.purchaseOrder?.jasa?.nama || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-[#aaa] max-w-xs">{r.keterangan || '-'}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-red-400">
                              {fmtRp(r.nominal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Sub-Group 2.C: Biaya Operasional Proyek */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Receipt size={14} />
                    C. Biaya Operasional Proyek
                  </h4>
                  <span className="text-xs font-semibold text-white">
                    Subtotal: {fmtRp(labaData.pengeluaran.subtotalOperasional)}
                  </span>
                </div>

                {labaData.pengeluaran.operasional.length === 0 ? (
                  <p className="text-xs text-[#666] italic py-2">
                    Belum ada pengeluaran operasional proyek.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#222] text-[#777] uppercase text-[10px]">
                          <th className="py-2 px-3">Tanggal</th>
                          <th className="py-2 px-3">No. Invoice Operasional</th>
                          <th className="py-2 px-3">Jenis Biaya</th>
                          <th className="py-2 px-3">Keterangan</th>
                          <th className="py-2 px-3 text-right">Nominal Keluar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e1c18]">
                        {labaData.pengeluaran.operasional.map((r) => (
                          <tr key={r.id} className="hover:bg-white/[0.02]">
                            <td className="py-2.5 px-3 text-[#bbb]">{fmtTgl(r.tanggal)}</td>
                            <td className="py-2.5 px-3 font-mono text-[#d4af37]">
                              {r.noReferensi || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-white">{r.pihak || 'Operasional'}</td>
                            <td className="py-2.5 px-3 text-[#aaa] max-w-xs">{r.keterangan || '-'}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-red-400">
                              {fmtRp(r.nominal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Final Highlight Card */}
            <div className={`p-6 rounded-2xl border text-center ${
              isProfit
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/20 border-red-500/40 text-red-300'
            }`}>
              <span className="text-xs uppercase tracking-wider block font-semibold text-[#888] mb-1">
                Hasil Akhir Laba Rugi Proyek
              </span>
              <h2 className="text-2xl md:text-4xl font-extrabold mb-1">
                {isProfit ? 'PROYEK SURPLUS / LABA' : 'PROYEK DEFISIT / RUGI'} : {fmtRp(summary.labaRugi)}
              </h2>
              <p className="text-xs text-[#aaa]">
                Margin Keuntungan Bersih: <span className="font-bold text-white">{summary.profitMargin} %</span>
              </p>
            </div>
          </div>
        ) : (
          /* VIEW 2: REKAP SEMUA PROYEK */
          <div className="bg-[#14120e] border border-[#222] rounded-2xl overflow-hidden shadow-lg">
            <div className="px-5 py-4 border-b border-[#252320] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Ringkasan Laba Rugi Seluruh Proyek</h3>
                <p className="text-xs text-[#888]">Klik proyek untuk melihat rincian terperinci</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-[#222] bg-[#1a1814] text-[#888] uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-3.5 px-4 text-center">No</th>
                    <th className="py-3.5 px-4">Nama Proyek</th>
                    <th className="py-3.5 px-4">Klien</th>
                    <th className="py-3.5 px-4 text-right">Total Uang Masuk</th>
                    <th className="py-3.5 px-4 text-right">Total Uang Keluar</th>
                    <th className="py-3.5 px-4 text-right">Laba / (Rugi) Bersih</th>
                    <th className="py-3.5 px-4 text-right">Margin (%)</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1c18]">
                  {(labaData?.projects || []).map((p, idx) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 text-center text-[#777] font-mono">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">{p.name}</td>
                      <td className="py-3.5 px-4 text-[#aaa]">{p.client?.name || '-'}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-emerald-400">
                        {fmtRp(p.totalPendapatan)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-red-400">
                        {fmtRp(p.totalPengeluaran)}
                      </td>
                      <td className={`py-3.5 px-4 text-right font-bold ${
                        p.labaRugi >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {fmtRp(p.labaRugi)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-[#d4af37]">
                        {p.profitMargin} %
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedProjectId(p.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#d4af37]/10 hover:bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30 text-xs font-semibold transition-all inline-flex items-center gap-1"
                        >
                          <Eye size={12} />
                          <span>Rincian</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

