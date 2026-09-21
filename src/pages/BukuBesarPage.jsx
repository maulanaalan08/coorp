import { useEffect, useMemo, useState } from "react";
import {
  Landmark,
  Plus,
  Search,
  Calendar,
  Wallet,
  Banknote,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Pencil,
  X,
  Save,
  Filter,
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react";
import glBankService from "../services/glBankService";
import toast from "react-hot-toast";

const fmtRp = (n) =>
  "Rp " + Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });
const fmtTanggal = (d) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

export default function BukuBesarPage() {
  const [rows, setRows] = useState([]);
  const [saldo, setSaldo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    tipeAkun: "",
    namaAkun: "",
    dari: "",
    sampai: "",
    search: "",
    page: 1,
    limit: 50,
  });
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showAkunModal, setShowAkunModal] = useState(false);
  const [akunList, setAkunList] = useState([]);
  const [akunForm, setAkunForm] = useState({ kodeAkun: "", namaAkun: "", tipeAkun: "KAS", keterangan: "" });
  const [akunEditing, setAkunEditing] = useState(null);
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    tipeAkun: "KAS",
    namaAkun: "",
    jenis: "MASUK",
    nominal: "",
    noReferensi: "",
    pihak: "",
    keterangan: "",
  });

  const tipeOptions = ["", "KAS", "BANK"];
  const jenisOptions = ["MASUK", "KELUAR"];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trxRes, saldoRes] = await Promise.all([
        glBankService.getTransaksi(filter),
        glBankService.getSaldo({ tipeAkun: filter.tipeAkun || undefined }),
      ]);
      setRows(trxRes.data || []);
      setTotal(trxRes.total || 0);
      setSaldo(saldoRes.saldo || []);
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat data buku besar");
    } finally {
      setLoading(false);
    }
  };

  const fetchAkun = async () => {
    try {
      const res = await glBankService.getMasterAkun();
      setAkunList(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat master akun");
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter.tipeAkun, filter.namaAkun, filter.dari, filter.sampai, filter.page, filter.limit]);

  useEffect(() => {
    if (showAkunModal) fetchAkun();
  }, [showAkunModal]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setFilter((f) => ({ ...f, page: 1 }));
      fetchData();
    }, 500);
    return () => clearTimeout(t);
  }, [filter.search]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / filter.limit)), [total, filter.limit]);

  const resetForm = () => {
    setForm({
      tanggal: new Date().toISOString().split("T")[0],
      tipeAkun: "KAS",
      namaAkun: "",
      jenis: "MASUK",
      nominal: "",
      noReferensi: "",
      pihak: "",
      keterangan: "",
    });
    setEditing(null);
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      tanggal: row.tanggal ? new Date(row.tanggal).toISOString().split("T")[0] : "",
      tipeAkun: row.tipeAkun,
      namaAkun: row.namaAkun,
      jenis: row.jenis,
      nominal: row.nominal,
      noReferensi: row.noReferensi || "",
      pihak: row.pihak || "",
      keterangan: row.keterangan || "",
      keteranganVolume: row.keteranganVolume || "",
      keteranganHarga: row.keteranganHarga || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, nominal: Number(form.nominal) };
    if (!form.namaAkun.trim() || !form.tanggal || Number.isNaN(payload.nominal) || payload.nominal <= 0) {
      toast.error("Lengkapi tanggal, nama akun, dan nominal > 0");
      return;
    }
    try {
      if (editing) {
        await glBankService.updateTransaksi(editing.id, payload);
        toast.success("Transaksi diperbarui");
      } else {
        await glBankService.createTransaksi(payload);
        toast.success("Transaksi ditambahkan");
      }
      setShowForm(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Gagal menyimpan transaksi");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus transaksi ini?")) return;
    try {
      await glBankService.deleteTransaksi(id);
      toast.success("Transaksi dihapus");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghapus transaksi");
    }
  };

  const handleAkunSubmit = async (e) => {
    e.preventDefault();
    if (!akunForm.namaAkun.trim() || !akunForm.tipeAkun) {
      toast.error("Nama akun dan tipe akun wajib diisi");
      return;
    }
    try {
      if (akunEditing) {
        await glBankService.updateMasterAkun(akunEditing.id, akunForm);
        toast.success("Akun diperbarui");
      } else {
        await glBankService.createMasterAkun(akunForm);
        toast.success("Akun ditambahkan");
      }
      setAkunEditing(null);
      setAkunForm({ kodeAkun: "", namaAkun: "", tipeAkun: "KAS", keterangan: "" });
      fetchAkun();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Gagal menyimpan akun");
    }
  };

  const handleAkunDelete = async (id) => {
    if (!window.confirm("Hapus akun ini?")) return;
    try {
      await glBankService.deleteMasterAkun(id);
      toast.success("Akun dihapus");
      fetchAkun();
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghapus akun");
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0b09] text-white p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 text-[#d4af37]">
            <Landmark size={28} />
            Buku Besar Kas / Bank
          </h1>
          <p className="text-[#888] text-sm mt-1">Pencatatan transaksi kas & bank harian</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAkunModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#22201c] border border-[#d4af37]/30 hover:bg-[#2a2824] text-[#d4af37] font-semibold rounded-lg transition-colors"
          >
            <Settings size={18} />
            Master Akun
          </button>
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#d4af37] hover:bg-[#b8972e] text-[#0c0b09] font-bold rounded-lg transition-colors"
          >
            <Plus size={18} />
            Tambah Transaksi
          </button>
        </div>
      </div>

      {/* Cards saldo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {saldo.map((s) => (
          <div
            key={`${s.tipeAkun}-${s.namaAkun}`}
            className="bg-[#161513] border border-[#2a2a2a] rounded-xl p-5 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-[#d4af37]/10 flex items-center justify-center text-[#d4af37]">
              {s.tipeAkun === "KAS" ? <Wallet size={22} /> : <Banknote size={22} />}
            </div>
            <div>
              <div className="text-[#888] text-xs uppercase tracking-wide">{s.tipeAkun}</div>
              <div className="text-white font-semibold">{s.namaAkun}</div>
              <div className="text-[#d4af37] font-bold text-lg">{fmtRp(s.saldo)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-[#161513] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 min-w-[180px]">
            <Filter size={16} className="text-[#888]" />
            <select
              value={filter.tipeAkun}
              onChange={(e) => setFilter({ ...filter, tipeAkun: e.target.value, page: 1 })}
              className="bg-transparent text-sm text-white outline-none w-full"
            >
              <option value="">Semua Tipe</option>
              <option value="KAS">KAS</option>
              <option value="BANK">BANK</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 min-w-[220px]">
            <Landmark size={16} className="text-[#888]" />
            <input
              type="text"
              placeholder="Nama akun..."
              value={filter.namaAkun}
              onChange={(e) => setFilter({ ...filter, namaAkun: e.target.value, page: 1 })}
              className="bg-transparent text-sm text-white outline-none w-full placeholder-[#555]"
            />
          </div>
          <div className="flex items-center gap-2 bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2">
            <Calendar size={16} className="text-[#888]" />
            <input
              type="date"
              value={filter.dari}
              onChange={(e) => setFilter({ ...filter, dari: e.target.value, page: 1 })}
              className="bg-transparent text-sm text-white outline-none"
            />
          </div>
          <div className="flex items-center gap-2 bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2">
            <Calendar size={16} className="text-[#888]" />
            <input
              type="date"
              value={filter.sampai}
              onChange={(e) => setFilter({ ...filter, sampai: e.target.value, page: 1 })}
              className="bg-transparent text-sm text-white outline-none"
            />
          </div>
          <div className="flex items-center gap-2 bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 flex-1 min-w-[220px]">
            <Search size={16} className="text-[#888]" />
            <input
              type="text"
              placeholder="Cari referensi, pihak, atau keterangan..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="bg-transparent text-sm text-white outline-none w-full placeholder-[#555]"
            />
          </div>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-[#161513] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#1e1c19] text-[#d4af37]">
              <tr>
                <th className="p-4 text-left font-semibold">Tanggal</th>
                <th className="p-4 text-left font-semibold">Akun</th>
                <th className="p-4 text-left font-semibold">Ref / Pihak</th>
                <th className="p-4 text-left font-semibold">Keterangan</th>
                <th className="p-4 text-left font-semibold">Ket. Volume</th>
                <th className="p-4 text-left font-semibold">Ket. Harga</th>
                <th className="p-4 text-right font-semibold">Masuk</th>
                <th className="p-4 text-right font-semibold">Keluar</th>
                <th className="p-4 text-right font-semibold">Saldo</th>
                <th className="p-4 text-center font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[#888]">
                    Memuat...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[#888]">
                    Belum ada transaksi.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-4 text-white whitespace-nowrap">{fmtTanggal(r.tanggal)}</td>
                    <td className="p-4">
                      <div className="text-white font-medium">{r.namaAkun}</div>
                      <div className="text-[#888] text-xs">{r.tipeAkun}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-white">{r.noReferensi || "-"}</div>
                      <div className="text-[#888] text-xs">{r.pihak || "-"}</div>
                    </td>
                    <td className="p-4 text-[#aaa] max-w-xs truncate">{r.keterangan || "-"}</td>
                    <td className="p-4 text-[#aaa] max-w-xs truncate text-xs">{r.keteranganVolume || "-"}</td>
                    <td className="p-4 text-[#aaa] max-w-xs truncate text-xs">{r.keteranganHarga || "-"}</td>
                    <td className="p-4 text-right text-emerald-400">
                      {r.jenis === "MASUK" ? fmtRp(r.nominal) : "-"}
                    </td>
                    <td className="p-4 text-right text-rose-400">
                      {r.jenis === "KELUAR" ? fmtRp(r.nominal) : "-"}
                    </td>
                    <td className="p-4 text-right font-semibold text-[#d4af37]">{fmtRp(r.saldoBerjalan)}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-[#d4af37]/20 text-[#d4af37] transition-colors"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-rose-400 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-[#2a2a2a]">
          <div className="text-[#888] text-xs">
            {total} transaksi • Halaman {filter.page} / {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={filter.page <= 1}
              onClick={() => setFilter((f) => ({ ...f, page: f.page - 1 }))}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              disabled={filter.page >= totalPages}
              onClick={() => setFilter((f) => ({ ...f, page: f.page + 1 }))}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161513] border border-[#2a2a2a] rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#d4af37]">
                {editing ? "Edit Transaksi" : "Tambah Transaksi"}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg hover:bg-white/5 text-[#888]"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#888] mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={form.tanggal}
                    onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                    className="w-full bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#888] mb-1">Tipe Akun</label>
                  <select
                    value={form.tipeAkun}
                    onChange={(e) => setForm({ ...form, tipeAkun: e.target.value })}
                    className="w-full bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
                  >
                    {tipeOptions.filter(Boolean).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Nama Akun</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kas Kecil / BCA 123456"
                  value={form.namaAkun}
                  onChange={(e) => setForm({ ...form, namaAkun: e.target.value })}
                  className="w-full bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#888] mb-1">Jenis</label>
                  <select
                    value={form.jenis}
                    onChange={(e) => setForm({ ...form, jenis: e.target.value })}
                    className="w-full bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
                  >
                    {jenisOptions.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#888] mb-1">Nominal</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={form.nominal}
                    onChange={(e) => setForm({ ...form, nominal: e.target.value })}
                    className="w-full bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#888] mb-1">No. Referensi</label>
                  <input
                    type="text"
                    value={form.noReferensi}
                    onChange={(e) => setForm({ ...form, noReferensi: e.target.value })}
                    className="w-full bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#888] mb-1">Pihak</label>
                  <input
                    type="text"
                    value={form.pihak}
                    onChange={(e) => setForm({ ...form, pihak: e.target.value })}
                    className="w-full bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Keterangan</label>
                <textarea
                  rows={3}
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  className="w-full bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37] resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg text-[#888] hover:bg-white/5 text-sm font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 bg-[#d4af37] hover:bg-[#b8972e] text-[#0c0b09] font-bold rounded-lg text-sm"
                >
                  <Save size={16} />
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Master Akun */}
      {showAkunModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161513] border border-[#2a2a2a] rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#d4af37] flex items-center gap-2">
                <Settings size={20} /> Master Akun Buku Besar
              </h2>
              <button type="button" onClick={() => setShowAkunModal(false)} className="p-2 rounded-lg hover:bg-white/5 text-[#888]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAkunSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
              <input
                type="text"
                placeholder="Kode (opsional)"
                value={akunForm.kodeAkun}
                onChange={(e) => setAkunForm({ ...akunForm, kodeAkun: e.target.value })}
                className="bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
              />
              <input
                type="text"
                required
                placeholder="Nama akun"
                value={akunForm.namaAkun}
                onChange={(e) => setAkunForm({ ...akunForm, namaAkun: e.target.value })}
                className="bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
              />
              <select
                value={akunForm.tipeAkun}
                onChange={(e) => setAkunForm({ ...akunForm, tipeAkun: e.target.value })}
                className="bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
              >
                <option value="KAS">KAS</option>
                <option value="BANK">BANK</option>
              </select>
              <button type="submit" className="flex items-center justify-center gap-2 px-4 py-2 bg-[#d4af37] hover:bg-[#b8972e] text-[#0c0b09] font-bold rounded-lg text-sm">
                <Save size={16} /> {akunEditing ? "Update" : "Simpan"}
              </button>
              <input
                type="text"
                placeholder="Keterangan"
                value={akunForm.keterangan}
                onChange={(e) => setAkunForm({ ...akunForm, keterangan: e.target.value })}
                className="md:col-span-4 bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
              />
            </form>

            <table className="w-full text-sm">
              <thead className="bg-[#1e1c19] text-[#d4af37]">
                <tr>
                  <th className="p-3 text-left">Kode</th>
                  <th className="p-3 text-left">Nama Akun</th>
                  <th className="p-3 text-left">Tipe</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {akunList.map((a) => (
                  <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 text-[#888]">{a.kodeAkun || "-"}</td>
                    <td className="p-3 text-white">{a.namaAkun}</td>
                    <td className="p-3 text-[#888]">{a.tipeAkun}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => { setAkunEditing(a); setAkunForm({ kodeAkun: a.kodeAkun || "", namaAkun: a.namaAkun, tipeAkun: a.tipeAkun, keterangan: a.keterangan || "" }); }}
                          className="p-2 rounded-lg bg-white/5 hover:bg-[#d4af37]/20 text-[#d4af37]"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAkunDelete(a.id)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-rose-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {akunList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-[#888]">Belum ada akun. Tambahkan akun KAS/BANK pertama.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
