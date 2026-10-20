import { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Landmark,
  Save,
  X,
  Printer,
} from 'lucide-react';
import Header from '../components/Header';
import { invoicePenjualanService } from '../services/invoicePenjualanService';
import glBankService from '../services/glBankService';
import toast from 'react-hot-toast';

const fmtRp = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const toDigits = (v) => String(v ?? '').replace(/[^0-9]/g, '');
const formatDigitInput = (v) => {
  const digits = toDigits(v);
  return digits ? Number(digits).toLocaleString('id-ID') : '';
};
const parseDigitInput = (v) => Number(toDigits(v) || 0);

const openBlobInNewTab = (blob) => {
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) {
    URL.revokeObjectURL(url);
    throw new Error('Popup diblokir browser. Izinkan popup lalu coba lagi.');
  }
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

const fmtTgl = (d) =>
  d
    ? new Date(d).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '-';

const APPROVAL_BADGE = {
  PENDING: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
  APPROVED_FINANCE: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  APPROVED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  REJECTED: 'bg-red-500/10 text-red-300 border-red-500/30',
};

const APPROVAL_LABEL = {
  PENDING: 'PENDING',
  APPROVED_FINANCE: 'APPROVED_FINANCE',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

const STATUS_BAYAR_LABEL = {
  UNPAID: 'Belum Bayar',
  PARTIAL: 'Sebagian',
  PAID: 'Lunas',
};

const actionBtnClass =
  'px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed';

const makeEmptyForm = () => ({
  projectId: '',
  noInvoice: '',
  tanggal: new Date().toISOString().slice(0, 10),
  jenisBiaya: '',
  jenisKas: 'KELUAR',
  rekeningBankId: '',
  tipeRekeningId: '',
  jumlahDibayar: '',
  keterangan: '',
});

function InvoiceOperasionalPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [rekeningBanks, setRekeningBanks] = useState([]);
  const [tipeRekeningList, setTipeRekeningList] = useState([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(makeEmptyForm());

  const isFinanceRole = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return ['SUPER_ADMIN', 'FINANCE'].includes(parsed?.role);
    } catch {
      return false;
    }
  }, []);

  const fetchProjects = async () => {
    const data = await invoicePenjualanService.getProjects();
    const safe = Array.isArray(data) ? data : [];
    setProjects(safe);
    if (!selectedProjectId && safe.length > 0) setSelectedProjectId(safe[0].id);
  };

  const fetchRows = async () => {
    if (!selectedProjectId) return;
    const data = await invoicePenjualanService.listOperasional(selectedProjectId);
    setRows(Array.isArray(data) ? data : []);
  };

  const fetchMasters = async () => {
    const [rekeningRes, tipeRes] = await Promise.all([
      glBankService.getRekeningBank({ activeOnly: 1 }),
      glBankService.getTipeRekening({ isActive: 1 }),
    ]);
    setRekeningBanks(Array.isArray(rekeningRes?.data) ? rekeningRes.data : []);
    setTipeRekeningList(Array.isArray(tipeRes?.data) ? tipeRes.data : []);
  };

  const generateNoInvoice = async (tanggal) => {
    const res = await invoicePenjualanService.getNextNoInvoice('OPERASIONAL', tanggal);
    return res?.noInvoice || '';
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      await fetchProjects();
      await fetchMasters();
      if (selectedProjectId) await fetchRows();
    } catch (err) {
      toast.error(err.message || 'Gagal memuat invoice operasional');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    (async () => {
      setLoading(true);
      try {
        await fetchRows();
      } catch (err) {
        toast.error(err.message || 'Gagal memuat data project');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const fields = [
        row.noInvoice,
        row.project?.name,
        row.jenisBiaya,
        row.keterangan,
        row.approvalStatus,
        row.jenisKas,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
      return fields.some((v) => v.includes(q));
    });
  }, [rows, search]);

  const openCreate = async () => {
    try {
      setEditingId(null);
      const tanggal = new Date().toISOString().slice(0, 10);
      const noInvoice = await generateNoInvoice(tanggal);
      setForm({ ...makeEmptyForm(), projectId: selectedProjectId || '', tanggal, noInvoice });
      setShowModal(true);
    } catch (err) {
      toast.error(err.message || 'Gagal generate nomor invoice operasional');
    }
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      projectId: row.projectId || selectedProjectId || '',
      noInvoice: row.noInvoice || '',
      tanggal: row.tanggal ? new Date(row.tanggal).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      jenisBiaya: row.jenisBiaya || '',
      jenisKas: row.jenisKas || 'KELUAR',
      rekeningBankId: row.rekeningBankId || '',
      tipeRekeningId: row.tipeRekeningId || row.rekeningBank?.tipeRekeningId || '',
      jumlahDibayar: String(Number(row.jumlahDibayar || 0)),
      keterangan: row.keterangan || '',
    });
    setShowModal(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        projectId: form.projectId,
        tanggal: form.tanggal,
        jenisBiaya: form.jenisBiaya,
        jenisKas: form.jenisKas,
        rekeningBankId: form.rekeningBankId || null,
        tipeRekeningId: form.tipeRekeningId || null,
        jumlahDibayar: parseDigitInput(form.jumlahDibayar),
        keterangan: form.keterangan || null,
      };

      if (editingId) {
        await invoicePenjualanService.updateOperasional(editingId, payload);
        toast.success('Invoice operasional berhasil diupdate.');
      } else {
        await invoicePenjualanService.createOperasional(payload);
        toast.success('Invoice operasional berhasil dibuat.');
      }

      setShowModal(false);
      await fetchRows();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan invoice operasional');
    } finally {
      setSubmitting(false);
    }
  };

  const doApproveFinance = async (id) => {
    try {
      await invoicePenjualanService.approveFinanceOperasional(id);
      toast.success('Approve Finance berhasil.');
      await fetchRows();
    } catch (err) {
      toast.error(err.message || 'Gagal approve finance');
    }
  };

  const doApproveFinal = async (id) => {
    try {
      await invoicePenjualanService.approveOperasional(id);
      toast.success('Approve final berhasil.');
      await fetchRows();
    } catch (err) {
      toast.error(err.message || 'Gagal approve final');
    }
  };

  const doReject = async (id) => {
    const reason = window.prompt('Alasan reject invoice operasional ini:');
    if (reason === null) return;
    try {
      await invoicePenjualanService.rejectOperasional(id, reason);
      toast.success('Invoice operasional berhasil di-reject.');
      await fetchRows();
    } catch (err) {
      toast.error(err.message || 'Gagal reject invoice operasional');
    }
  };

  const doPrintPdf = async (row) => {
    try {
      const blob = await invoicePenjualanService.getOperasionalPdfBlob(row.id);
      openBlobInNewTab(blob);
    } catch (err) {
      toast.error(err.message || 'Gagal mencetak PDF invoice operasional');
    }
  };

  const doPostGl = async (row) => {
    const nominal = window.prompt('Nominal kirim Kas/Bank (kosong = jumlah dibayar):', String(Number(row.jumlahDibayar || 0)));
    if (nominal === null) return;

    const payload = {
      tanggal: new Date().toISOString().slice(0, 10),
      rekeningBankId: row.rekeningBankId || null,
      tipeRekeningId: row.tipeRekeningId || row.rekeningBank?.tipeRekeningId || null,
    };
    if (String(nominal).trim() !== '') payload.nominal = Number(String(nominal).replace(/[^0-9.-]/g, ''));

    try {
      await invoicePenjualanService.postGlOperasional(row.id, payload);
      toast.success('Kirim ke Kas/Bank operasional berhasil.');
      await fetchRows();
    } catch (err) {
      toast.error(err.message || 'Gagal kirim ke Kas/Bank operasional');
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0b09] text-[#f2ead9]">
      <Header />
      <div className="px-5 md:px-10 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-[#888] text-xs uppercase tracking-wider mb-1">Finance • Operasional</p>
            <h1 className="text-2xl md:text-3xl font-bold">Invoice Operasional</h1>
            <p className="text-[#888] text-sm mt-1">
              Invoice operasional berstatus awal PENDING diverifikasi berjenjang di Pembayaran Finance dan Permintaan Bayar sebelum diposting ke Kas/Bank.
            </p>
          </div>
          <button
            onClick={refreshAll}
            className="self-start md:self-auto flex items-center gap-2 px-4 py-2 rounded-xl border border-[#2a2a2a] bg-[#14120e] hover:border-[#d4af37]/60 transition-all text-sm"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-[#d4af37]' : 'text-[#888]'} />
            Segarkan
          </button>
        </div>

        <div className="bg-[#14120e] border border-[#23211d] rounded-2xl p-4 mb-5 flex flex-col lg:flex-row gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm min-w-[260px]"
          >
            {projects.length === 0 && <option value="">Belum ada proyek</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari invoice / jenis biaya / status..."
              className="w-full pl-9 pr-3 py-2 bg-[#1a1814] border border-[#2a2a2a] rounded-xl text-sm outline-none focus:border-[#d4af37]"
            />
          </div>

          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-xl bg-[#d4af37] text-[#0c0b09] font-semibold text-sm hover:bg-[#e3be4d] transition-all"
          >
            <Plus size={16} className="inline mr-2" />Tambah Invoice
          </button>
        </div>

        <div className="bg-[#14120e] border border-[#23211d] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1a1814] text-[#888] uppercase text-[11px] tracking-wider">
                  <th className="px-4 py-3 text-left">Invoice</th>
                  <th className="px-4 py-3 text-left">Project / Jenis Biaya</th>
                  <th className="px-4 py-3 text-center">Jenis Kas</th>
                  <th className="px-4 py-3 text-right">Jumlah Dibayar</th>
                  <th className="px-4 py-3 text-center">Approval</th>
                  <th className="px-4 py-3 text-center">Bayar</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-[#777]">Memuat data...</td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-[#777]">Belum ada data invoice operasional.</td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const approvalStatus = row.approvalStatus || 'PENDING';
                    const canApproveFinance = approvalStatus === 'PENDING' && isFinanceRole;
                    const canApproveFinal = approvalStatus === 'APPROVED_FINANCE';
                    const canPostGl = approvalStatus === 'APPROVED' && !row.postedToGl;

                    return (
                      <tr key={row.id} className="border-t border-[#23211d] hover:bg-white/[0.02]">
                        <td className="px-4 py-3 align-top">
                          <div className="font-semibold text-white">{row.noInvoice}</div>
                          <div className="text-[11px] text-[#777]">{fmtTgl(row.tanggal)}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="text-[#ddd]">{row.project?.name || '-'}</div>
                          <div className="text-[11px] text-[#777]">{row.jenisBiaya || '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex px-2.5 py-1 rounded-full border text-[11px] border-[#2f2f2f] text-[#ccc]">
                            {row.jenisKas === 'MASUK' ? 'MASUK' : 'KELUAR'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-300">{fmtRp(row.jumlahDibayar)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-semibold ${APPROVAL_BADGE[approvalStatus] || APPROVAL_BADGE.PENDING}`}>
                            {APPROVAL_LABEL[approvalStatus] || approvalStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex px-2.5 py-1 rounded-full border text-[11px] border-[#2f2f2f] text-[#ccc]">
                            {STATUS_BAYAR_LABEL[row.statusBayar] || row.statusBayar}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5 justify-center">
                            <button
                              className={`${actionBtnClass} border-purple-500/40 text-purple-300 hover:bg-purple-500/10`}
                              onClick={() => doPrintPdf(row)}
                              title="Cetak PDF"
                            >
                              <Printer size={12} className="inline mr-1" />Cetak
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#14120e] border border-[#2a2a2a] rounded-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase size={18} className="text-[#d4af37]" />
                {editingId ? 'Edit Invoice Operasional' : 'Tambah Invoice Operasional'}
              </h3>
              <button className="text-[#888] hover:text-white" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="px-5 py-4 space-y-3" onSubmit={submitForm}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#888]">Project *</label>
                  <select
                    required
                    value={form.projectId}
                    onChange={(e) => setForm((p) => ({ ...p, projectId: e.target.value }))}
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2"
                  >
                    <option value="">-- pilih project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[#888]">No Invoice (Auto)</label>
                  <input
                    required
                    value={form.noInvoice}
                    readOnly
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2 text-[#d4af37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-[#888]">Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={form.tanggal}
                    onChange={async (e) => {
                      const tanggal = e.target.value;
                      setForm((p) => ({ ...p, tanggal }));
                      if (!editingId) {
                        try {
                          const next = await generateNoInvoice(tanggal);
                          setForm((p) => ({ ...p, noInvoice: next }));
                        } catch {
                          // keep existing no invoice
                        }
                      }
                    }}
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#888]">Jenis Kas *</label>
                  <select
                    value={form.jenisKas}
                    onChange={(e) => setForm((p) => ({ ...p, jenisKas: e.target.value }))}
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2"
                  >
                    <option value="KELUAR">KELUAR</option>
                    <option value="MASUK">MASUK</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#888]">Rekening</label>
                  <select
                    value={form.rekeningBankId}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        rekeningBankId: e.target.value,
                        tipeRekeningId:
                          p.tipeRekeningId ||
                          rekeningBanks.find((rb) => rb.id === e.target.value)?.tipeRekeningId ||
                          '',
                      }))
                    }
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2"
                  >
                    <option value="">-- pilih rekening --</option>
                    {rekeningBanks.map((rb) => (
                      <option key={rb.id} value={rb.id}>
                        {rb.namaRekening} - {rb.nomorRekening}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#888]">Jenis Biaya *</label>
                <input
                  required
                  value={form.jenisBiaya}
                  onChange={(e) => setForm((p) => ({ ...p, jenisBiaya: e.target.value }))}
                  placeholder="Contoh: Biaya administrasi, sewa alat, biaya operasional lapangan"
                  className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#888]">Tipe Rekening</label>
                  <select
                    value={form.tipeRekeningId}
                    onChange={(e) => setForm((p) => ({ ...p, tipeRekeningId: e.target.value }))}
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2"
                  >
                    <option value="">-- pilih tipe rekening --</option>
                    {tipeRekeningList.map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {tr.kodeRekening} - {tr.namaTipe}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#888]">Jumlah Dibayar</label>
                  <input
                    inputMode="numeric"
                    value={formatDigitInput(form.jumlahDibayar)}
                    onChange={(e) => setForm((p) => ({ ...p, jumlahDibayar: toDigits(e.target.value) }))}
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#888]">Keterangan</label>
                <textarea
                  rows={3}
                  value={form.keterangan}
                  onChange={(e) => setForm((p) => ({ ...p, keterangan: e.target.value }))}
                  className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2a2a2a]">
                <button type="button" className="px-4 py-2 text-[#aaa]" onClick={() => setShowModal(false)}>
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#d4af37] text-[#0c0b09] rounded-xl font-semibold">
                  <Save size={14} className="inline mr-1" />
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvoiceOperasionalPage;
