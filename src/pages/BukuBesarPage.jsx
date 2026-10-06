import { useEffect, useMemo, useState } from "react";
import {
  Landmark,
  Search,
  Calendar,
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
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import glBankService from "../services/glBankService";
import toast from "react-hot-toast";
import { projectService } from "../services/projectService";
import * as XLSX from "xlsx";

const fmtRp = (n) =>
  "Rp " + Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });
const fmtTanggal = (d) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const getTransaksiJenisLabel = (jenis) => {
  if (jenis === "MASUK") return "DEBET";
  if (jenis === "KELUAR") return "KREDIT";
  return "-";
};

const formatDateForExport = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const sanitizeFilePart = (value, fallback = "all") => {
  const text = String(value || "").trim();
  if (!text) return fallback;
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return cleaned || fallback;
};

export default function BukuBesarPage() {
  const [rows, setRows] = useState([]);
  const [saldo, setSaldo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    tipeRekeningId: "",
    rekeningBankId: "",
    projectId: "",
    dari: "",
    sampai: "",
    search: "",
    cursor: "",
    limit: 50,
  });
  const [total, setTotal] = useState(0);
  const [cursorHistory, setCursorHistory] = useState([]);
  const [cursorPage, setCursorPage] = useState(1);
  const [nextCursor, setNextCursor] = useState("");
  const [hasNextPage, setHasNextPage] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [transaksiMode, setTransaksiMode] = useState("MASUK");
  const [showRekeningModal, setShowRekeningModal] = useState(false);
  const [showTipeRekeningModal, setShowTipeRekeningModal] = useState(false);
  const [rekeningBankList, setRekeningBankList] = useState([]);
  const [tipeRekeningList, setTipeRekeningList] = useState([]);
  const [summary, setSummary] = useState({ rapTotal: 0, pengeluaranTotal: 0, selisih: 0 });
  const [projectSummaries, setProjectSummaries] = useState([]);
  const [overrunByBagian, setOverrunByBagian] = useState([]);
  const [showOverrun, setShowOverrun] = useState(false);
  const [projects, setProjects] = useState([]);
  const [tipeRekeningForm, setTipeRekeningForm] = useState({
    namaTipe: "",
    isActive: true,
  });
  const [tipeRekeningEditing, setTipeRekeningEditing] = useState(null);
  const [rekeningForm, setRekeningForm] = useState({
    namaRekening: "",
    tipeRekeningId: "",
    mataUang: "IDR",
    namaBank: "",
    nomorRekening: "",
    isDefault: false,
    isActive: true,
  });
  const [rekeningEditing, setRekeningEditing] = useState(null);
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    tipeAkun: "BANK",
    jenis: "MASUK",
    projectId: "",
    rekeningBankId: "",
    tipeRekeningId: "",
    nominal: "",
    noReferensi: "",
    pihak: "",
    keterangan: "",
  });

  const buildTransaksiQuery = (overrides = {}) => ({
    ...filter,
    tipeAkun: filter.rekeningBankId ? "BANK" : undefined,
    namaAkun: undefined,
    ...overrides,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trxRes, saldoRes, summaryRes] = await Promise.all([
        glBankService.getTransaksi(buildTransaksiQuery()),
        glBankService.getSaldo(),
        glBankService.getSummary({ projectId: filter.projectId || undefined }),
      ]);
      setRows(trxRes.data || []);
      setTotal(trxRes.total || 0);
      setNextCursor(trxRes.nextCursor || "");
      setHasNextPage(Boolean(trxRes.hasNextPage));
      setSaldo(saldoRes.saldo || []);
      setSummary(summaryRes?.summary || { rapTotal: 0, pengeluaranTotal: 0, selisih: 0 });
      setProjectSummaries(Array.isArray(summaryRes?.projectSummaries) ? summaryRes.projectSummaries : []);
      setOverrunByBagian(Array.isArray(summaryRes?.overrunByBagian) ? summaryRes.overrunByBagian : []);
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat data buku besar");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const list = await projectService.getAll();
      setProjects(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRekeningBank = async () => {
    try {
      const res = await glBankService.getRekeningBank({ activeOnly: 1, tipeRekeningId: filter.tipeRekeningId || undefined });
      const list = Array.isArray(res?.data) ? res.data : [];
      setRekeningBankList(list);
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat master rekening bank");
    }
  };

  const fetchTipeRekening = async () => {
    try {
      const res = await glBankService.getTipeRekening({ isActive: 1 });
      setTipeRekeningList(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat master tipe rekening");
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter.tipeRekeningId, filter.rekeningBankId, filter.projectId, filter.dari, filter.sampai, filter.search, filter.cursor, filter.limit]);

  useEffect(() => {
    fetchProjects();
    fetchTipeRekening();
  }, []);

  useEffect(() => {
    fetchRekeningBank();
  }, [filter.tipeRekeningId]);

  useEffect(() => {
    if (showRekeningModal || showTipeRekeningModal) {
      fetchTipeRekening();
      fetchRekeningBank();
    }
  }, [showRekeningModal, showTipeRekeningModal, filter.tipeRekeningId]);

  const resetForm = (mode = "MASUK") => {
    setForm({
      tanggal: new Date().toISOString().split("T")[0],
      tipeAkun: "BANK",
      jenis: mode,
      projectId: "",
      rekeningBankId: "",
      tipeRekeningId: "",
      nominal: "",
      noReferensi: "",
      pihak: "",
      keterangan: "",
    });
    setEditing(null);
  };

  const openNew = (mode = "MASUK") => {
    setTransaksiMode(mode);
    setForm({
      tanggal: new Date().toISOString().split("T")[0],
      tipeAkun: "BANK",
      jenis: mode,
      projectId: "",
      rekeningBankId: "",
      tipeRekeningId: "",
      nominal: "",
      noReferensi: "",
      pihak: "",
      keterangan: "",
    });
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setTransaksiMode(row.jenis || "MASUK");
    setForm({
      tanggal: row.tanggal ? new Date(row.tanggal).toISOString().split("T")[0] : "",
      tipeAkun: "BANK",
      jenis: row.jenis,
      projectId: row.projectId || row.purchaseOrder?.projectId || row.pembayaran?.purchaseOrder?.projectId || "",
      rekeningBankId: row.rekeningBankId || row.rekeningBank?.id || "",
      tipeRekeningId: row.tipeRekeningId || row.rekeningBank?.tipeRekeningId || "",
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

    const rekeningTerpilih = rekeningBankList.find((r) => r.id === form.rekeningBankId);
    const selectedTipeRekeningId = form.tipeRekeningId || rekeningTerpilih?.tipeRekeningId || null;

    const payload = {
      ...form,
      jenis: transaksiMode,
      nominal: Number(form.nominal),
      tipeAkun: "BANK",
      tipeRekeningId: selectedTipeRekeningId,
      sumberTransaksi: "MANUAL",
    };

    if (!form.tanggal || Number.isNaN(payload.nominal) || payload.nominal <= 0) {
      toast.error("Lengkapi tanggal dan nominal > 0");
      return;
    }

    if (!form.projectId) {
      toast.error("Project wajib dipilih");
      return;
    }

    if (!form.rekeningBankId) {
      toast.error("Rekening bank wajib dipilih");
      return;
    }
    if (!rekeningTerpilih) {
      toast.error("Rekening bank tidak valid");
      return;
    }
    if (!selectedTipeRekeningId) {
      toast.error("Tipe rekening wajib dipilih");
      return;
    }

    payload.rekeningBankId = form.rekeningBankId;

    try {
      if (editing) {
        await glBankService.updateTransaksi(editing.id, payload);
        toast.success("Transaksi diperbarui");
      } else {
        await glBankService.createTransaksi(payload);
        toast.success(`Kas/Bank ${transaksiMode === "MASUK" ? "Masuk" : "Keluar"} ditambahkan`);
      }
      setShowForm(false);
      setTransaksiMode("MASUK");
      resetForm("MASUK");
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

  const resetTipeRekeningForm = () => {
    setTipeRekeningForm({ namaTipe: "", isActive: true });
    setTipeRekeningEditing(null);
  };

  const handleTipeRekeningSubmit = async (e) => {
    e.preventDefault();
    if (!tipeRekeningForm.namaTipe.trim()) {
      toast.error("Nama tipe rekening wajib diisi");
      return;
    }

    try {
      if (tipeRekeningEditing) {
        await glBankService.updateTipeRekening(tipeRekeningEditing.id, tipeRekeningForm);
        toast.success("Tipe rekening diperbarui");
      } else {
        await glBankService.createTipeRekening(tipeRekeningForm);
        toast.success("Tipe rekening ditambahkan");
      }
      resetTipeRekeningForm();
      await fetchTipeRekening();
      await fetchRekeningBank();
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Gagal menyimpan tipe rekening");
    }
  };

  const handleTipeRekeningDelete = async (id) => {
    if (!window.confirm("Hapus tipe rekening ini?")) return;
    try {
      await glBankService.deleteTipeRekening(id);
      toast.success("Tipe rekening dihapus");
      await fetchTipeRekening();
      await fetchRekeningBank();
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Gagal menghapus tipe rekening");
    }
  };

  const resetRekeningForm = () => {
    setRekeningForm({
      namaRekening: "",
      tipeRekeningId: "",
      mataUang: "IDR",
      namaBank: "",
      nomorRekening: "",
      isDefault: false,
      isActive: true,
    });
    setRekeningEditing(null);
  };

  const handleRekeningSubmit = async (e) => {
    e.preventDefault();
    if (!rekeningForm.namaRekening.trim() || !rekeningForm.nomorRekening.trim()) {
      toast.error("Nama rekening dan nomor rekening wajib diisi");
      return;
    }
    try {
      if (rekeningEditing) {
        await glBankService.updateRekeningBank(rekeningEditing.id, rekeningForm);
        toast.success("Rekening bank diperbarui");
      } else {
        await glBankService.createRekeningBank(rekeningForm);
        toast.success("Rekening bank ditambahkan");
      }
      resetRekeningForm();
      await fetchRekeningBank();
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Gagal menyimpan rekening bank");
    }
  };

  const filteredRekeningForExport = useMemo(() => {
    if (!filter.rekeningBankId) return null;
    return rekeningBankList.find((r) => r.id === filter.rekeningBankId) || null;
  }, [filter.rekeningBankId, rekeningBankList]);

  const filteredTipeForExport = useMemo(() => {
    if (!filter.tipeRekeningId) return null;
    return tipeRekeningList.find((t) => t.id === filter.tipeRekeningId) || null;
  }, [filter.tipeRekeningId, tipeRekeningList]);

  const saldoMasterBank = useMemo(() => {
    const saldoByRekening = new Map(
      (Array.isArray(saldo) ? saldo : []).map((s) => [s.rekeningBankId || s.key, s]),
    );

    return rekeningBankList.map((rek) => {
      const existing = saldoByRekening.get(rek.id);
      const namaAkun =
        existing?.namaAkun ||
        [rek.namaRekening, rek.nomorRekening].filter(Boolean).join(" - ");

      return {
        key: rek.id,
        tipeAkun: "BANK",
        namaAkun,
        saldo: Number(existing?.saldo || 0),
      };
    });
  }, [saldo, rekeningBankList]);

  const mapRowsForExport = (sourceRows = []) => sourceRows.map((r) => {
    const tipeRek = r.tipeRekening?.namaTipe || r.rekeningBank?.tipeRekening?.namaTipe || "-";
    const project = r.project?.name || r.purchaseOrder?.project?.name || r.pembayaran?.purchaseOrder?.project?.name || "Tanpa Project";
    return {
      "Tanggal": formatDateForExport(r.tanggal),
      "No Referensi": r.noReferensi || "-",
      "Pihak": r.pihak || "-",
      "Project": project,
      "Akun": r.namaAkun || "-",
      "Bank": r.rekeningBank?.namaBank || "-",
      "No Rekening": r.rekeningBank?.nomorRekening || "-",
      "Tipe Rekening": tipeRek,
      "Jenis": getTransaksiJenisLabel(r.jenis),
      "Nominal": Number(r.nominal || 0),
      "Masuk": r.jenis === "MASUK" ? Number(r.nominal || 0) : 0,
      "Keluar": r.jenis === "KELUAR" ? Number(r.nominal || 0) : 0,
      "Saldo Berjalan": Number(r.saldoBerjalan || 0),
      "Keterangan": r.keterangan || "-",
    };
  });

  const fetchAllRowsForExport = async () => {
    const merged = [];
    const seenIds = new Set();
    let cursor = "";
    let guard = 0;

    while (guard < 200) {
      const res = await glBankService.getTransaksi(buildTransaksiQuery({
        cursor,
        limit: 500,
      }));

      const batch = Array.isArray(res?.data) ? res.data : [];
      for (const row of batch) {
        if (row?.id && !seenIds.has(row.id)) {
          seenIds.add(row.id);
          merged.push(row);
        }
      }

      if (!res?.hasNextPage || !res?.nextCursor || batch.length === 0) {
        break;
      }

      if (res.nextCursor === cursor) {
        break;
      }

      cursor = res.nextCursor;
      guard += 1;
    }

    return merged;
  };

  const buildExportFilePrefix = () => {
    const partTipe = sanitizeFilePart(filteredTipeForExport?.namaTipe, "all-tipe");
    const partRek = sanitizeFilePart(filteredRekeningForExport?.namaRekening, "all-rekening");
    const partDateFrom = sanitizeFilePart(filter.dari || "all");
    const partDateTo = sanitizeFilePart(filter.sampai || "all");
    return `rekening-koran-${partTipe}-${partRek}-${partDateFrom}-${partDateTo}`;
  };

  const handleExportExcel = async () => {
    try {
      const sourceRows = await fetchAllRowsForExport();
      const exportRows = mapRowsForExport(sourceRows);

      if (!exportRows.length) {
        toast.error("Data transaksi kosong, tidak ada yang bisa diexport");
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Rekening Koran");

      const fileName = `${buildExportFilePrefix()}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success("Export Excel berhasil");
    } catch (err) {
      console.error(err);
      toast.error("Gagal export Excel");
    }
  };

  const handleExportPdf = async () => {
    try {
      const sourceRows = await fetchAllRowsForExport();
      if (!sourceRows.length) {
        toast.error("Data transaksi kosong, tidak ada yang bisa dicetak");
        return;
      }

      const totalMasuk = sourceRows.reduce((sum, r) => sum + (r.jenis === "MASUK" ? Number(r.nominal || 0) : 0), 0);
      const totalKeluar = sourceRows.reduce((sum, r) => sum + (r.jenis === "KELUAR" ? Number(r.nominal || 0) : 0), 0);
      const saldoAkhir = sourceRows.length ? Number(sourceRows[0]?.saldoBerjalan || 0) : 0;

      const printedAt = new Date().toLocaleString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const filterLabel = {
        tipe: filteredTipeForExport?.namaTipe || "Semua Tipe Rekening",
        rekening: filteredRekeningForExport
          ? `${filteredRekeningForExport.namaRekening} - ${filteredRekeningForExport.nomorRekening}`
          : "Semua Rekening",
        period: filter.dari || filter.sampai
          ? `${filter.dari || "(awal)"} s/d ${filter.sampai || "(akhir)"}`
          : "Semua Periode",
      };

      const tableRowsHtml = sourceRows
        .map((r, idx) => {
          const tipeRek = r.tipeRekening?.namaTipe || r.rekeningBank?.tipeRekening?.namaTipe || "-";
          const project = r.project?.name || r.purchaseOrder?.project?.name || r.pembayaran?.purchaseOrder?.project?.name || "Tanpa Project";
          return `
            <tr>
              <td class="center">${idx + 1}</td>
              <td>${escapeHtml(formatDateForExport(r.tanggal))}</td>
              <td>${escapeHtml(r.noReferensi || "-")}</td>
              <td>${escapeHtml(r.pihak || "-")}</td>
              <td>${escapeHtml(project)}</td>
              <td>${escapeHtml(r.namaAkun || "-")}</td>
              <td>${escapeHtml(tipeRek)}</td>
              <td class="right">${escapeHtml(fmtRp(r.jenis === "MASUK" ? r.nominal : 0))}</td>
              <td class="right">${escapeHtml(fmtRp(r.jenis === "KELUAR" ? r.nominal : 0))}</td>
              <td class="right">${escapeHtml(fmtRp(r.saldoBerjalan || 0))}</td>
              <td>${escapeHtml(r.keterangan || "-")}</td>
            </tr>
          `;
        })
        .join("");

      const html = `
<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Rekening Koran - Buku Besar Kas/Bank</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #111; }
    h1 { margin: 0 0 4px; font-size: 20px; }
    .sub { color: #444; margin-bottom: 12px; font-size: 12px; }
    .meta { width: 100%; border: 1px solid #ddd; border-collapse: collapse; margin-bottom: 10px; }
    .meta td { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; }
    .summary { margin: 10px 0 16px; display: flex; gap: 10px; }
    .box { border: 1px solid #ddd; padding: 8px 10px; font-size: 12px; min-width: 180px; }
    .box b { display: block; font-size: 14px; margin-top: 3px; }
    table.data { width: 100%; border-collapse: collapse; }
    table.data th, table.data td { border: 1px solid #d8d8d8; padding: 6px; font-size: 11px; vertical-align: top; }
    table.data th { background: #f3f3f3; text-align: left; }
    .right { text-align: right; }
    .center { text-align: center; }
    @media print {
      body { margin: 12px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>Rekening Koran • Buku Besar Kas / Bank</h1>
  <div class="sub">Dicetak: ${escapeHtml(printedAt)}</div>

  <table class="meta">
    <tr>
      <td><b>Filter Tipe Rekening</b><br/>${escapeHtml(filterLabel.tipe)}</td>
      <td><b>Filter Rekening</b><br/>${escapeHtml(filterLabel.rekening)}</td>
      <td><b>Periode</b><br/>${escapeHtml(filterLabel.period)}</td>
    </tr>
  </table>

  <div class="summary">
    <div class="box">Total Debet<b>${escapeHtml(fmtRp(totalMasuk))}</b></div>
    <div class="box">Total Kredit<b>${escapeHtml(fmtRp(totalKeluar))}</b></div>
    <div class="box">Saldo Akhir<b>${escapeHtml(fmtRp(saldoAkhir))}</b></div>
  </div>

  <table class="data">
    <thead>
      <tr>
        <th>No</th>
        <th>Tanggal</th>
        <th>No Ref</th>
        <th>Pihak</th>
        <th>Project</th>
        <th>Akun</th>
        <th>Tipe Rekening</th>
        <th class="right">Debet</th>
        <th class="right">Kredit</th>
        <th class="right">Saldo</th>
        <th>Keterangan</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>

  <script>window.onload = () => window.print();</script>
</body>
</html>
`;

      const printWindow = window.open("", "_blank", "width=1280,height=720");
      if (!printWindow) {
        toast.error("Popup diblokir browser. Izinkan popup untuk cetak PDF.");
        return;
      }
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      toast.success("Tampilan cetak PDF rekening koran siap");
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyiapkan cetak PDF");
    }
  };

  const handleRekeningDelete = async (id) => {
    if (!window.confirm("Hapus rekening bank ini?")) return;
    try {
      await glBankService.deleteRekeningBank(id);
      toast.success("Rekening bank dihapus");
      await fetchRekeningBank();
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Gagal menghapus rekening bank");
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
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setShowTipeRekeningModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#22201c] border border-[#d4af37]/30 hover:bg-[#2a2824] text-[#d4af37] font-semibold rounded-lg transition-colors"
          >
            <Settings size={18} />
            Master Tipe Rekening
          </button>
          <button
            type="button"
            onClick={() => setShowRekeningModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#22201c] border border-[#d4af37]/30 hover:bg-[#2a2824] text-[#d4af37] font-semibold rounded-lg transition-colors"
          >
            <Landmark size={18} />
            Master Rekening Bank
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1f2a1f] border border-emerald-500/40 hover:bg-[#243124] text-emerald-300 font-semibold rounded-lg transition-colors"
          >
            <FileSpreadsheet size={18} />
            Cetak Excel
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2a1f1f] border border-rose-500/40 hover:bg-[#332525] text-rose-300 font-semibold rounded-lg transition-colors"
          >
            <FileText size={18} />
            Cetak PDF
          </button>
          <button
            type="button"
            onClick={() => openNew("MASUK")}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors"
          >
            <ArrowDownLeft size={18} />
            Kas/Bank Masuk
          </button>
          <button
            type="button"
            onClick={() => openNew("KELUAR")}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-lg transition-colors"
          >
            <ArrowUpRight size={18} />
            Kas/Bank Keluar
          </button>
        </div>
      </div>

      {/* Cards saldo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {saldoMasterBank.map((s) => (
          <div
            key={s.key}
            className="bg-[#161513] border border-[#2a2a2a] rounded-xl p-5 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-[#d4af37]/10 flex items-center justify-center text-[#d4af37]">
              <Landmark size={22} />
            </div>
            <div>
              <div className="text-[#888] text-xs uppercase tracking-wide">{s.tipeAkun}</div>
              <div className="text-white font-semibold">{s.namaAkun}</div>
              <div className="text-[#d4af37] font-bold text-lg">{fmtRp(s.saldo)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Ringkasan RAP vs Pengeluaran */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#161513] border border-[#2a2a2a] rounded-xl p-4">
          <div className="text-[#888] text-xs uppercase">RAP Total</div>
          <div className="text-[#d4af37] text-2xl font-bold mt-1">{fmtRp(summary.rapTotal)}</div>
        </div>
        <div className="bg-[#161513] border border-[#2a2a2a] rounded-xl p-4">
          <div className="text-[#888] text-xs uppercase">Pengeluaran Total</div>
          <div className="text-white text-2xl font-bold mt-1">{fmtRp(summary.pengeluaranTotal)}</div>
        </div>
        <div className="bg-[#161513] border border-[#2a2a2a] rounded-xl p-4">
          <div className="text-[#888] text-xs uppercase">Selisih (Over/Under)</div>
          <div className={`text-2xl font-bold mt-1 ${summary.selisih > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {fmtRp(summary.selisih)}
          </div>
        </div>
      </div>

      <div className="bg-[#161513] border border-[#2a2a2a] rounded-xl overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-[#2a2a2a] text-[#d4af37] font-semibold">Ringkasan per Project</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#1e1c19] text-[#d4af37]">
              <tr>
                <th className="p-3 text-left">Project</th>
                <th className="p-3 text-right">RAP</th>
                <th className="p-3 text-right">Pengeluaran</th>
                <th className="p-3 text-right">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {projectSummaries.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-[#888]">Belum ada data project.</td></tr>
              ) : (
                projectSummaries.map((p) => (
                  <tr key={p.projectId} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 text-white">{p.projectName || '-'}</td>
                    <td className="p-3 text-right text-[#bbb]">{fmtRp(p.rap)}</td>
                    <td className="p-3 text-right text-[#bbb]">{fmtRp(p.pengeluaran)}</td>
                    <td className={`p-3 text-right font-semibold ${p.selisih > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {fmtRp(p.selisih)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-[#11100e] border border-[#2a2a2a] rounded-2xl p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 min-w-[180px]">
            <Filter size={16} className="text-[#888]" />
            <select
              value={filter.tipeRekeningId}
              onChange={(e) => {
                setFilter((f) => ({ ...f, tipeRekeningId: e.target.value, rekeningBankId: "", cursor: "" }));
                setCursorHistory([]);
                setCursorPage(1);
              }}
              className="bg-transparent text-sm text-white outline-none w-full"
            >
              <option value="">Semua Tipe Rekening</option>
              {tipeRekeningList.map((t) => (
                <option key={t.id} value={t.id}>{t.namaTipe}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 min-w-[220px]">
            <Landmark size={16} className="text-[#888]" />
            <select
              value={filter.rekeningBankId}
              onChange={(e) => {
                setFilter((f) => ({ ...f, rekeningBankId: e.target.value, cursor: "" }));
                setCursorHistory([]);
                setCursorPage(1);
              }}
              className="bg-transparent text-sm text-white outline-none w-full"
            >
              <option value="">Semua Rekening</option>
              {rekeningBankList.map((r) => (
                <option key={r.id} value={r.id}>{`${r.namaRekening} - ${r.nomorRekening}`}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 min-w-[220px]">
            <Landmark size={16} className="text-[#888]" />
            <select
              value={filter.projectId}
              onChange={(e) => {
                setFilter((f) => ({ ...f, projectId: e.target.value, cursor: "" }));
                setCursorHistory([]);
                setCursorPage(1);
              }}
              className="bg-transparent text-sm text-white outline-none w-full"
            >
              <option value="">Semua Project (General)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name || p.projectName || p.id}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2">
            <Calendar size={16} className="text-[#888]" />
            <input
              type="date"
              value={filter.dari}
              onChange={(e) => {
                setFilter((f) => ({ ...f, dari: e.target.value, cursor: "" }));
                setCursorHistory([]);
                setCursorPage(1);
              }}
              className="bg-transparent text-sm text-white outline-none"
            />
          </div>
          <div className="flex items-center gap-2 bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2">
            <Calendar size={16} className="text-[#888]" />
            <input
              type="date"
              value={filter.sampai}
              onChange={(e) => {
                setFilter((f) => ({ ...f, sampai: e.target.value, cursor: "" }));
                setCursorHistory([]);
                setCursorPage(1);
              }}
              className="bg-transparent text-sm text-white outline-none"
            />
          </div>
          <div className="flex items-center gap-2 bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 flex-1 min-w-[220px]">
            <Search size={16} className="text-[#888]" />
            <input
              type="text"
              placeholder="Cari referensi, pihak, atau keterangan..."
              value={filter.search}
              onChange={(e) => {
                setFilter((f) => ({ ...f, search: e.target.value, cursor: "" }));
                setCursorHistory([]);
                setCursorPage(1);
              }}
              className="bg-transparent text-sm text-white outline-none w-full placeholder-[#555]"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#11100e] border border-[#2a2a2a] rounded-2xl p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="inline-flex bg-[#0f0e0c] border border-[#2f2f2f] rounded-2xl p-1 shadow-[0_10px_35px_rgba(0,0,0,0.28)]">
            <button
              type="button"
              onClick={() => setShowOverrun(true)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${showOverrun ? "bg-[#d4af37] text-[#0c0b09]" : "text-[#b9b9b9] hover:text-white"}`}
            >
              Top Overrun
            </button>
            <button
              type="button"
              onClick={() => setShowOverrun(false)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${!showOverrun ? "bg-[#d4af37] text-[#0c0b09]" : "text-[#b9b9b9] hover:text-white"}`}
            >
              Transaksi
            </button>
          </div>

        </div>

        {showOverrun ? (
          <div className="bg-[#161513] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2a2a2a] text-[#d4af37] font-semibold">Top Overrun (Bagian/Item)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#1e1c19] text-[#d4af37]">
                  <tr>
                    <th className="p-3 text-left">Project</th>
                    <th className="p-3 text-left">Bagian</th>
                    <th className="p-3 text-left">Item</th>
                    <th className="p-3 text-right">RAP</th>
                    <th className="p-3 text-right">Realisasi</th>
                    <th className="p-3 text-right">Selisih</th>
                  </tr>
                </thead>
                <tbody>
                  {overrunByBagian.length === 0 ? (
                    <tr><td colSpan={6} className="p-4 text-center text-[#888]">Belum ada data overrun.</td></tr>
                  ) : (
                    overrunByBagian.map((o, idx) => (
                      <tr key={`${o.projectId}-${o.itemName}-${idx}`} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 text-white">{o.projectName || '-'}</td>
                        <td className="p-3 text-[#bbb]">{o.bagian || '-'}</td>
                        <td className="p-3 text-[#bbb]">{o.itemName || '-'}</td>
                        <td className="p-3 text-right text-[#bbb]">{fmtRp(o.rap)}</td>
                        <td className="p-3 text-right text-[#bbb]">{fmtRp(o.realisasi)}</td>
                        <td className="p-3 text-right text-rose-400 font-semibold">{fmtRp(o.selisih)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-[#161513] border border-[#2a2a2a] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2a2a2a] flex flex-wrap items-center justify-between gap-3">
                <div className="text-[#d4af37] font-semibold">Transaksi</div>
                <div className="flex items-center gap-2 text-xs text-[#9a9a9a]">
                  <span className="font-semibold text-[#d4af37] uppercase tracking-wide">Limit per halaman</span>
                  <select
                    value={filter.limit}
                    onChange={(e) => {
                      const nextLimit = Number(e.target.value || 50);
                      setFilter((f) => ({ ...f, limit: nextLimit, cursor: "" }));
                      setCursorHistory([]);
                      setCursorPage(1);
                    }}
                    className="bg-[#0c0b09] border border-[#333] rounded-lg px-2 py-1 text-xs text-white outline-none"
                    title="Limit per halaman"
                  >
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#1e1c19] text-[#d4af37]">
                    <tr>
                      <th className="p-4 text-left font-semibold">Tanggal</th>
                      <th className="p-4 text-left font-semibold">Akun</th>
                      <th className="p-4 text-left font-semibold">Project / Ref / Pihak</th>
                      <th className="p-4 text-left font-semibold">Keterangan</th>
                      <th className="p-4 text-left font-semibold">Tipe Rekening</th>
                      <th className="p-4 text-right font-semibold">Masuk</th>
                      <th className="p-4 text-right font-semibold">Keluar</th>
                      <th className="p-4 text-right font-semibold">Saldo</th>
                      <th className="p-4 text-center font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-[#888]">
                          Memuat...
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-[#888]">
                          Belum ada transaksi.
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => (
                        <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="p-4 text-white whitespace-nowrap">{fmtTanggal(r.tanggal)}</td>
                          <td className="p-4">
                            <div className="text-white font-medium">{r.namaAkun}</div>
                            <div className="text-[#888] text-xs">BANK</div>
                            <div className="text-[#777] text-[11px]">
                              {r.rekeningBank?.nomorRekening ? `${r.rekeningBank?.namaBank || "Bank"} • ${r.rekeningBank.nomorRekening}` : "-"}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-[#9aa] text-xs mb-1">
                              {r.project?.name || r.purchaseOrder?.project?.name || r.pembayaran?.purchaseOrder?.project?.name || "Tanpa Project"}
                            </div>
                            <div className="text-white">{r.noReferensi || "-"}</div>
                            <div className="text-[#888] text-xs">{r.pihak || "-"}</div>
                          </td>
                          <td className="p-4 text-[#aaa] max-w-xs truncate">{r.keterangan || "-"}</td>
                          <td className="p-4 text-[#aaa] max-w-[160px]">
                            <div className="text-white text-xs font-medium">{r.tipeRekening?.namaTipe || r.rekeningBank?.tipeRekening?.namaTipe || "-"}</div>
                            <div className="text-[#777] text-[11px]">BANK</div>
                          </td>
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

              <div className="flex items-center justify-center gap-3 p-4 border-t border-[#2a2a2a]">
                <button
                  type="button"
                  disabled={cursorHistory.length === 0}
                  onClick={() => {
                    if (cursorHistory.length === 0) return;
                    const prevCursor = cursorHistory[cursorHistory.length - 1] || "";
                    setCursorHistory((h) => h.slice(0, -1));
                    setCursorPage((p) => Math.max(1, p - 1));
                    setFilter((f) => ({ ...f, cursor: prevCursor }));
                  }}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="text-[#888] text-xs min-w-[160px] text-center">
                  {total} transaksi • Halaman {cursorPage}
                </div>
                <button
                  type="button"
                  disabled={!hasNextPage || !nextCursor}
                  onClick={() => {
                    if (!hasNextPage || !nextCursor) return;
                    setCursorHistory((h) => [...h, filter.cursor || ""]);
                    setCursorPage((p) => p + 1);
                    setFilter((f) => ({ ...f, cursor: nextCursor }));
                  }}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161513] border border-[#2a2a2a] rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#d4af37]">
                {editing ? "Edit Transaksi Kas/Bank" : transaksiMode === "MASUK" ? "Kas/Bank Masuk" : "Kas/Bank Keluar"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setTransaksiMode("MASUK");
                }}
                className="p-2 rounded-lg hover:bg-white/5 text-[#888]"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#a8a8a8] mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={form.tanggal}
                    onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                    className="w-full bg-[#0c0b09] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#a8a8a8] mb-1">Project</label>
                  <select
                    required
                    value={form.projectId}
                    onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                    className="w-full bg-[#0c0b09] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
                  >
                    <option value="">Pilih Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name || p.projectName || p.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#a8a8a8] mb-1">Rekening Bank (Master)</label>
                  <select
                    required
                    value={form.rekeningBankId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      const selected = rekeningBankList.find((r) => r.id === nextId);
                      setForm({
                        ...form,
                        rekeningBankId: nextId,
                        tipeRekeningId: selected?.tipeRekeningId || form.tipeRekeningId || "",
                      });
                    }}
                    className="w-full bg-[#0c0b09] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
                  >
                    <option value="">Pilih Rekening Bank</option>
                    {rekeningBankList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.namaRekening} - {r.nomorRekening}{r.namaBank ? ` (${r.namaBank})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#a8a8a8] mb-1">Tipe Rekening</label>
                  <select
                    required
                    value={form.tipeRekeningId || ""}
                    onChange={(e) => setForm({ ...form, tipeRekeningId: e.target.value })}
                    className="w-full bg-[#0c0b09] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
                  >
                    <option value="">Pilih Tipe Rekening</option>
                    {tipeRekeningList.map((t) => (
                      <option key={t.id} value={t.id}>{t.namaTipe}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#a8a8a8] mb-1">Jenis</label>
                <input
                  type="text"
                  value={transaksiMode === "MASUK" ? "Kas/Bank Masuk" : "Kas/Bank Keluar"}
                  readOnly
                  className="w-full bg-[#111] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#a8a8a8] mb-1">No. Referensi</label>
                  <input
                    type="text"
                    value={form.noReferensi}
                    onChange={(e) => setForm({ ...form, noReferensi: e.target.value })}
                    className="w-full bg-[#0c0b09] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#a8a8a8] mb-1">Nominal</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={form.nominal}
                    onChange={(e) => setForm({ ...form, nominal: e.target.value })}
                    className="w-full bg-[#0c0b09] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#a8a8a8] mb-1">Pihak</label>
                  <input
                    type="text"
                    value={form.pihak}
                    onChange={(e) => setForm({ ...form, pihak: e.target.value })}
                    className="w-full bg-[#0c0b09] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
                  />
                </div>
                <div />
              </div>

              <div>
                <label className="block text-xs text-[#a8a8a8] mb-1">Keterangan</label>
                <textarea
                  rows={3}
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  className="w-full bg-[#0c0b09] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37] resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setTransaksiMode("MASUK");
                  }}
                  className="px-4 py-2 rounded-lg text-[#b0b0b0] hover:bg-white/5 text-sm font-medium"
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

      {/* Modal Master Rekening Bank */}
      {showRekeningModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161513] border border-[#2a2a2a] rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#d4af37] flex items-center gap-2">
                <Landmark size={20} /> Master Rekening Bank
              </h2>
              <button type="button" onClick={() => setShowRekeningModal(false)} className="p-2 rounded-lg hover:bg-white/5 text-[#888]">
                <X size={20} />
              </button>
            </div>

            <div>
              <form onSubmit={handleRekeningSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <input
                  type="text"
                  required
                  placeholder="Nama rekening"
                  value={rekeningForm.namaRekening}
                  onChange={(e) => setRekeningForm({ ...rekeningForm, namaRekening: e.target.value })}
                  className="bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
                />
                <input
                  type="text"
                  required
                  placeholder="Nomor rekening"
                  value={rekeningForm.nomorRekening}
                  onChange={(e) => setRekeningForm({ ...rekeningForm, nomorRekening: e.target.value })}
                  className="bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
                />
                <input
                  type="text"
                  placeholder="Nama bank"
                  value={rekeningForm.namaBank}
                  onChange={(e) => setRekeningForm({ ...rekeningForm, namaBank: e.target.value })}
                  className="bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
                />
                <select
                  value={rekeningForm.tipeRekeningId}
                  onChange={(e) => setRekeningForm({ ...rekeningForm, tipeRekeningId: e.target.value })}
                  className="bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
                >
                  <option value="">-- Pilih Tipe Rekening --</option>
                  {tipeRekeningList.map((t) => (
                    <option key={t.id} value={t.id}>{t.namaTipe}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm text-[#ccc]">
                  <input
                    type="checkbox"
                    checked={Boolean(rekeningForm.isDefault)}
                    onChange={(e) => setRekeningForm({ ...rekeningForm, isDefault: e.target.checked })}
                  />
                  Default utama
                </label>
                <button type="submit" className="flex items-center justify-center gap-2 px-4 py-2 bg-[#d4af37] hover:bg-[#b8972e] text-[#0c0b09] font-bold rounded-lg text-sm">
                  <Save size={16} /> {rekeningEditing ? "Update Rekening" : "Simpan Rekening"}
                </button>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                <thead className="bg-[#1e1c19] text-[#d4af37]">
                  <tr>
                    <th className="p-3 text-left">Nama Rekening</th>
                    <th className="p-3 text-left">Bank</th>
                    <th className="p-3 text-left">No Rekening</th>
                    <th className="p-3 text-left">Tipe Rekening</th>
                    <th className="p-3 text-center">Default</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rekeningBankList.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-3 text-white">{r.namaRekening}</td>
                      <td className="p-3 text-[#888]">{r.namaBank || '-'}</td>
                      <td className="p-3 text-[#888]">{r.nomorRekening}</td>
                      <td className="p-3 text-[#888]">{r.tipeRekening?.namaTipe || '-'}</td>
                      <td className="p-3 text-center text-[#888]">{r.isDefault ? 'Ya' : 'Tidak'}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRekeningEditing(r);
                              setRekeningForm({
                                namaRekening: r.namaRekening || "",
                                tipeRekeningId: r.tipeRekeningId || "",
                                mataUang: r.mataUang || "IDR",
                                namaBank: r.namaBank || "",
                                nomorRekening: r.nomorRekening || "",
                                isDefault: Boolean(r.isDefault),
                                isActive: Boolean(r.isActive),
                              });
                            }}
                            className="p-2 rounded-lg bg-white/5 hover:bg-[#d4af37]/20 text-[#d4af37]"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRekeningDelete(r.id)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-rose-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rekeningBankList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-[#888]">Belum ada rekening bank.</td>
                    </tr>
                  )}
                </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Master Tipe Rekening */}
      {showTipeRekeningModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161513] border border-[#2a2a2a] rounded-2xl w-full max-w-xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#d4af37] flex items-center gap-2">
                <Settings size={20} /> Master Tipe Rekening
              </h2>
              <button type="button" onClick={() => setShowTipeRekeningModal(false)} className="p-2 rounded-lg hover:bg-white/5 text-[#888]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleTipeRekeningSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 border border-[#2a2a2a] rounded-lg p-3 bg-[#14120f]">
              <input
                type="text"
                required
                placeholder="Nama tipe rekening"
                value={tipeRekeningForm.namaTipe}
                onChange={(e) => setTipeRekeningForm({ ...tipeRekeningForm, namaTipe: e.target.value })}
                className="bg-[#0c0b09] border border-[#333] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#d4af37]"
              />
              <label className="flex items-center gap-2 text-sm text-[#ccc]">
                <input
                  type="checkbox"
                  checked={Boolean(tipeRekeningForm.isActive)}
                  onChange={(e) => setTipeRekeningForm({ ...tipeRekeningForm, isActive: e.target.checked })}
                />
                Aktif
              </label>
              <div className="flex items-center gap-2 justify-end">
                {tipeRekeningEditing && (
                  <button
                    type="button"
                    onClick={resetTipeRekeningForm}
                    className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#ccc] text-sm"
                  >
                    Batal Edit
                  </button>
                )}
                <button type="submit" className="flex items-center justify-center gap-2 px-4 py-2 bg-[#d4af37] hover:bg-[#b8972e] text-[#0c0b09] font-bold rounded-lg text-sm">
                  <Save size={16} /> {tipeRekeningEditing ? "Update Tipe" : "Simpan Tipe"}
                </button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead className="bg-[#1e1c19] text-[#d4af37]">
                <tr>
                  <th className="p-3 text-left">Tipe Rekening</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tipeRekeningList.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 text-white">{t.namaTipe}</td>
                    <td className="p-3 text-center text-[#888]">{t.isActive ? "Aktif" : "Nonaktif"}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTipeRekeningEditing(t);
                            setTipeRekeningForm({ namaTipe: t.namaTipe || "", isActive: Boolean(t.isActive) });
                          }}
                          className="p-2 rounded-lg bg-white/5 hover:bg-[#d4af37]/20 text-[#d4af37]"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTipeRekeningDelete(t.id)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-rose-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tipeRekeningList.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-[#888]">Belum ada tipe rekening.</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
