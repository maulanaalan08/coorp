import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeftRight,
  Landmark,
  Calendar,
  Send,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  X,
  CreditCard,
  Building2,
  History,
} from 'lucide-react';
import Header from '../components/Header';
import glBankService from '../services/glBankService';
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

export default function TransferBankPage() {
  const [loading, setLoading] = useState(true);
  const [rekeningList, setRekeningList] = useState([]);
  const [saldoList, setSaldoList] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterDari, setFilterDari] = useState('');
  const [filterSampai, setFilterSampai] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    rekeningAsalId: '',
    rekeningTujuanId: '',
    tanggal: new Date().toISOString().slice(0, 10),
    nominal: '',
    keterangan: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rekRes, saldoRes, trfRes] = await Promise.all([
        glBankService.getRekeningBank({ activeOnly: 1 }).catch(() => ({ data: [] })),
        glBankService.getSaldo({ tipeAkun: 'BANK' }).catch(() => ({ saldo: [] })),
        glBankService.getRiwayatTransfer({
          dari: filterDari || undefined,
          sampai: filterSampai || undefined,
          search: search || undefined,
        }).catch(() => ({ data: [] })),
      ]);

      setRekeningList(Array.isArray(rekRes?.data) ? rekRes.data : []);
      setSaldoList(Array.isArray(saldoRes?.saldo) ? saldoRes.saldo : []);
      setTransfers(Array.isArray(trfRes?.data) ? trfRes.data : []);
    } catch (err) {
      toast.error('Gagal memuat data transfer bank: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  }, [filterDari, filterSampai, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Map rekening with current saldo
  const rekeningWithSaldo = useMemo(() => {
    return rekeningList.map((r) => {
      const s = saldoList.find((x) => x.rekeningBankId === r.id);
      return {
        ...r,
        saldo: s ? s.saldo : 0,
      };
    });
  }, [rekeningList, saldoList]);

  // Total Saldo All Banks
  const totalSaldoBank = useMemo(() => {
    return rekeningWithSaldo.reduce((sum, r) => sum + Number(r.saldo || 0), 0);
  }, [rekeningWithSaldo]);

  const filteredTransfers = useMemo(() => {
    if (!search.trim()) return transfers;
    const q = search.toLowerCase();
    return transfers.filter((t) => {
      const ref = String(t.noReferensi || '').toLowerCase();
      const asal = String(t.rekeningAsal || '').toLowerCase();
      const tujuan = String(t.rekeningTujuan || '').toLowerCase();
      const ket = String(t.keterangan || '').toLowerCase();
      const user = String(t.createdBy || '').toLowerCase();
      return ref.includes(q) || asal.includes(q) || tujuan.includes(q) || ket.includes(q) || user.includes(q);
    });
  }, [transfers, search]);

  const handleOpenModal = () => {
    setForm({
      rekeningAsalId: rekeningList[0]?.id || '',
      rekeningTujuanId: rekeningList[1]?.id || '',
      tanggal: new Date().toISOString().slice(0, 10),
      nominal: '',
      keterangan: '',
    });
    setShowModal(true);
  };

  const handleSubmitTransfer = async (e) => {
    e.preventDefault();
    if (!form.rekeningAsalId || !form.rekeningTujuanId) {
      toast.error('Rekening asal dan tujuan wajib dipilih.');
      return;
    }
    if (form.rekeningAsalId === form.rekeningTujuanId) {
      toast.error('Rekening asal dan tujuan tidak boleh sama.');
      return;
    }
    const nom = Number(String(form.nominal).replace(/\D/g, '') || 0);
    if (nom <= 0) {
      toast.error('Nominal transfer harus lebih besar dari Rp 0.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await glBankService.transferBank({
        rekeningAsalId: form.rekeningAsalId,
        rekeningTujuanId: form.rekeningTujuanId,
        tanggal: form.tanggal,
        nominal: nom,
        keterangan: form.keterangan.trim(),
      });

      toast.success(res.message || 'Transfer antar bank berhasil diposting ke Buku Besar!');
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Gagal melakukan transfer bank');
    } finally {
      setSubmitting(false);
    }
  };

  // Selected asal account saldo check
  const selectedAsalRekening = useMemo(() => {
    return rekeningWithSaldo.find((r) => r.id === form.rekeningAsalId);
  }, [rekeningWithSaldo, form.rekeningAsalId]);

  return (
    <div className="min-h-screen bg-[#0c0b09] text-[#f2ead9]">
      <Header />

      <div className="px-5 md:px-10 pb-16">
        {/* Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#888] text-xs uppercase tracking-wider">
                Finance &amp; Treasury
              </span>
              <span className="text-[#555]">•</span>
              <span className="text-[#d4af37] text-xs font-semibold">
                Internal Cash Movement
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#f2ead9] flex items-center gap-2.5">
              <ArrowLeftRight className="text-[#d4af37]" size={28} />
              Transfer Antar Bank
            </h1>
            <p className="text-[#888] text-sm mt-1 max-w-3xl">
              Pemindahan saldo antar rekening bank internal. Saldo berkurang di bank pengirim dan bertambah di bank penerima, otomatis tercatat di Buku Besar (Double-Entry).
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-[#161513] hover:bg-[#1f1d19] border border-[#2a2a2a] hover:border-[#d4af37]/40 text-sm font-medium rounded-xl transition-all"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-[#d4af37]' : 'text-[#888]'} />
              <span>Segarkan</span>
            </button>
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#d4af37] hover:bg-[#c49f2e] text-black text-sm font-semibold rounded-xl shadow-md transition-all"
            >
              <ArrowLeftRight size={16} />
              <span>+ Transfer Baru</span>
            </button>
          </div>
        </div>

        {/* Bank Balances Overview Cards */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-wider text-[#888] font-semibold flex items-center gap-1.5">
              <Landmark size={14} className="text-[#d4af37]" />
              Rekening Bank Aktif &amp; Saldo Berjalan
            </h3>
            <span className="text-xs text-[#d4af37] font-semibold">
              Total Dana di Bank: {fmtRp(totalSaldoBank)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {rekeningWithSaldo.map((rek) => (
              <div
                key={rek.id}
                className="bg-[#14120e] border border-[#252320] hover:border-[#d4af37]/40 rounded-xl p-4 transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white px-2 py-0.5 rounded bg-white/5 border border-white/10">
                      {rek.namaBank || 'BANK'}
                    </span>
                    <span className="text-[10px] text-[#888]">{rek.tipeRekening?.namaTipe || 'Operasional'}</span>
                  </div>
                  <h4 className="font-semibold text-sm text-[#f2ead9] truncate">{rek.namaRekening}</h4>
                  <p className="text-xs text-[#888] font-mono mt-0.5">{rek.nomorRekening}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#222] flex items-baseline justify-between">
                  <span className="text-[11px] text-[#777]">Saldo:</span>
                  <span className={`text-sm font-bold ${rek.saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmtRp(rek.saldo)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-[#14120e] border border-[#252320] rounded-2xl p-4 mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
              <input
                type="text"
                placeholder="Cari no. ref, nama bank, atau keterangan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#1b1915] border border-[#2a2a2a] rounded-xl pl-9 pr-3 py-2 text-xs text-[#f2ead9] focus:border-[#d4af37] outline-none"
              />
            </div>

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
              {(filterDari || filterSampai || search) && (
                <button
                  onClick={() => {
                    setFilterDari('');
                    setFilterSampai('');
                    setSearch('');
                  }}
                  className="text-xs text-[#888] hover:text-[#d4af37] underline ml-1"
                >Atur Ulang</button>
              )}
            </div>
          </div>

          <div className="text-xs text-[#888]">
            Menampilkan <span className="font-semibold text-white">{filteredTransfers.length}</span> mutasi transfer
          </div>
        </div>

        {/* History Table */}
        <div className="bg-[#14120e] border border-[#222] rounded-2xl overflow-hidden shadow-lg">
          {loading ? (
            <div className="p-16 text-center text-[#888] flex flex-col items-center justify-center gap-3">
              <RefreshCw size={24} className="animate-spin text-[#d4af37]" />
              <p className="text-sm">Memuat riwayat transfer antar bank...</p>
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="p-16 text-center text-[#888] flex flex-col items-center justify-center gap-2">
              <AlertCircle size={32} className="text-[#555] mb-1" />
              <p className="text-sm font-medium text-[#bbb]">Belum ada riwayat transfer antar bank.</p>
              <p className="text-xs text-[#666]">Klik tombol "+ Transfer Baru" untuk melakukan pemindahan dana.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-[#222] bg-[#1a1814] text-[#888] uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-3.5 px-4 text-center">No</th>
                    <th className="py-3.5 px-4">No. Referensi / Tanggal</th>
                    <th className="py-3.5 px-4">Rekening Asal (Keluar)</th>
                    <th className="py-3.5 px-4 text-center">Arah Mutasi</th>
                    <th className="py-3.5 px-4">Rekening Tujuan (Masuk)</th>
                    <th className="py-3.5 px-4 text-right">Nominal Transfer</th>
                    <th className="py-3.5 px-4">Keterangan</th>
                    <th className="py-3.5 px-4 text-center">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1c18]">
                  {filteredTransfers.map((item, idx) => (
                    <tr key={item.noReferensi || idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 text-center text-[#777] font-mono">{idx + 1}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-[#d4af37] block">
                          {item.noReferensi}
                        </span>
                        <span className="text-[11px] text-[#777] flex items-center gap-1 mt-0.5">
                          <Calendar size={11} /> {fmtTgl(item.tanggal)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white flex items-center gap-1.5">
                          <Landmark size={13} className="text-red-400 shrink-0" />
                          <span>{item.rekeningAsal || '-'}</span>
                        </div>
                        <span className="text-[10px] text-red-400 font-semibold block mt-0.5">
                          Saldo Berkurang (-)
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#1b1915] border border-[#333] text-[#d4af37]">
                          <ArrowRight size={14} />
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white flex items-center gap-1.5">
                          <Landmark size={13} className="text-emerald-400 shrink-0" />
                          <span>{item.rekeningTujuan || '-'}</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">
                          Saldo Bertambah (+)
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-white text-sm">
                        {fmtRp(item.nominal)}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-[#bbb] max-w-xs">
                        {item.keterangan || <span className="text-[#666] italic">Tanpa catatan</span>}
                      </td>

                      <td className="py-3.5 px-4 text-center text-xs text-[#888]">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px]">
                          {item.createdBy || 'Finance'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL TRANSFER ANTAR BANK */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/75 z-[200] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-[#14120e] border border-[#2a2a2a] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#252320] flex items-center justify-between bg-[#191713]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#d4af37]/10 text-[#d4af37] rounded-xl border border-[#d4af37]/30">
                  <ArrowLeftRight size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Transfer Antar Rekening Bank</h3>
                  <p className="text-xs text-[#888]">Posting mutasi dana internal ke Buku Besar</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#888] hover:text-white p-1 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitTransfer} className="p-5 space-y-4 text-xs md:text-sm">
              {/* Rekening Asal */}
              <div>
                <label className="block text-xs font-semibold text-[#ccc] mb-1">
                  1. Dari Rekening Bank (Asal Pengirim) *
                </label>
                <select
                  required
                  value={form.rekeningAsalId}
                  onChange={(e) => setForm({ ...form, rekeningAsalId: e.target.value })}
                  className="w-full bg-[#1b1915] border border-[#2a2a2a] focus:border-[#d4af37] rounded-xl px-3 py-2.5 text-white outline-none"
                >
                  <option value="">-- Pilih Rekening Asal --</option>
                  {rekeningWithSaldo.map((r) => (
                    <option key={r.id} value={r.id} disabled={r.id === form.rekeningTujuanId}>
                      {r.namaBank} - {r.namaRekening} ({r.nomorRekening}) — Saldo: {fmtRp(r.saldo)}
                    </option>
                  ))}
                </select>
                {selectedAsalRekening && (
                  <p className="text-[11px] text-[#888] mt-1">
                    Saldo saat ini: <span className="font-semibold text-emerald-400">{fmtRp(selectedAsalRekening.saldo)}</span>
                  </p>
                )}
              </div>

              {/* Rekening Tujuan */}
              <div>
                <label className="block text-xs font-semibold text-[#ccc] mb-1">
                  2. Ke Rekening Bank (Tujuan Penerima) *
                </label>
                <select
                  required
                  value={form.rekeningTujuanId}
                  onChange={(e) => setForm({ ...form, rekeningTujuanId: e.target.value })}
                  className="w-full bg-[#1b1915] border border-[#2a2a2a] focus:border-[#d4af37] rounded-xl px-3 py-2.5 text-white outline-none"
                >
                  <option value="">-- Pilih Rekening Tujuan --</option>
                  {rekeningWithSaldo.map((r) => (
                    <option key={r.id} value={r.id} disabled={r.id === form.rekeningAsalId}>
                      {r.namaBank} - {r.namaRekening} ({r.nomorRekening}) — Saldo: {fmtRp(r.saldo)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tanggal & Nominal Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#ccc] mb-1">
                    Tanggal Transfer *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.tanggal}
                    onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                    className="w-full bg-[#1b1915] border border-[#2a2a2a] focus:border-[#d4af37] rounded-xl px-3 py-2.5 text-white outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#ccc] mb-1">
                    Nominal Transfer (Rp) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 10.000.000"
                    value={
                      form.nominal
                        ? Number(form.nominal).toLocaleString('id-ID')
                        : ''
                    }
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setForm({ ...form, nominal: raw });
                    }}
                    className="w-full bg-[#1b1915] border border-[#2a2a2a] focus:border-[#d4af37] rounded-xl px-3 py-2.5 text-white font-bold outline-none text-xs"
                  />
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-semibold text-[#ccc] mb-1">
                  Keterangan / Berita Transfer (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Misal: Penambahan kas operasional kantor, pemindahan dana cadangan..."
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  className="w-full bg-[#1b1915] border border-[#2a2a2a] focus:border-[#d4af37] rounded-xl px-3 py-2 text-white outline-none resize-none text-xs"
                />
              </div>

              {/* Info Box */}
              <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl flex items-start gap-2.5 text-[11px] text-[#ccc]">
                <ShieldCheck size={16} className="text-[#d4af37] shrink-0 mt-0.5" />
                <p>
                  Sistem akan otomatis menghasilkan nomor referensi berformat <span className="font-mono text-[#d4af37]">TRF/YYYYMMDD/...</span> dan membuat 2 entri buku besar (uang keluar &amp; uang masuk) tanpa terkait proyek.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#252320]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#2a2a2a] text-[#aaa] hover:text-white hover:bg-white/5 transition-all text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#c49f2e] text-black font-bold text-xs transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Posting Transfer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

