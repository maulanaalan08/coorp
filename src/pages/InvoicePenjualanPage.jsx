import { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Landmark,
  Save,
  X,
  Building2,
  Briefcase,
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

const TAB_DESAIN = 'desain';
const TAB_KLIEN = 'klien';

const makeEmptyDesainForm = () => ({
  projectId: '',
  designQuotationId: '',
  noInvoice: '',
  tanggal: new Date().toISOString().slice(0, 10),
  rekeningBankId: '',
  tipeRekeningId: '',
  jumlahTagihan: '0',
  jumlahDibayar: '',
  keterangan: '',
});

const makeEmptyKlienForm = () => ({
  projectId: '',
  clientId: '',
  spkContractId: '',
  spkTermId: '',
  termLabel: '',
  noInvoice: '',
  tanggal: new Date().toISOString().slice(0, 10),
  rekeningBankId: '',
  tipeRekeningId: '',
  jumlahTagihan: '0',
  jumlahDibayar: '',
  keterangan: '',
});

const tabButtonClass = (active) =>
  `px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
    active
      ? 'bg-[#d4af37] text-[#0c0b09] border-[#d4af37]'
      : 'bg-[#14120e] text-[#aaa] border-[#2a2a2a] hover:text-white'
  }`;

const actionBtnClass =
  'px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed';

function InvoicePenjualanPage() {
  const [activeTab, setActiveTab] = useState(TAB_DESAIN);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [rowsDesain, setRowsDesain] = useState([]);
  const [rowsKlien, setRowsKlien] = useState([]);

  const [designQuotations, setDesignQuotations] = useState([]);
  const [spkContracts, setSpkContracts] = useState([]);
  const [rekeningBanks, setRekeningBanks] = useState([]);
  const [tipeRekeningList, setTipeRekeningList] = useState([]);

  const [showDesainModal, setShowDesainModal] = useState(false);
  const [showKlienModal, setShowKlienModal] = useState(false);

  const [editingDesainId, setEditingDesainId] = useState(null);
  const [editingKlienId, setEditingKlienId] = useState(null);

  const [formDesain, setFormDesain] = useState(makeEmptyDesainForm());
  const [formKlien, setFormKlien] = useState(makeEmptyKlienForm());

  const selectedDesignQuotation = useMemo(
    () => designQuotations.find((q) => q.id === formDesain.designQuotationId) || null,
    [designQuotations, formDesain.designQuotationId]
  );

  const selectedContract = useMemo(
    () => spkContracts.find((c) => c.id === formKlien.spkContractId) || null,
    [spkContracts, formKlien.spkContractId]
  );

  const spkTerms = useMemo(() => {
    if (!selectedContract) return [];
    return Array.isArray(selectedContract.terms) ? selectedContract.terms : [];
  }, [selectedContract]);

  const selectedTerm = useMemo(
    () => spkTerms.find((t) => t.id === formKlien.spkTermId) || null,
    [spkTerms, formKlien.spkTermId]
  );

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

  const fetchListByTab = async () => {
    if (!selectedProjectId) return;
    if (activeTab === TAB_DESAIN) {
      const data = await invoicePenjualanService.listDesain(selectedProjectId);
      setRowsDesain(Array.isArray(data) ? data : []);
    } else {
      const data = await invoicePenjualanService.listKlien(selectedProjectId);
      setRowsKlien(Array.isArray(data) ? data : []);
    }
  };

  const fetchLookupForTab = async () => {
    if (!selectedProjectId) return;
    if (activeTab === TAB_DESAIN) {
      const data = await invoicePenjualanService.getDesignQuotations(selectedProjectId);
      setDesignQuotations(Array.isArray(data) ? data : []);
    } else {
      const data = await invoicePenjualanService.getSpkContracts(selectedProjectId);
      setSpkContracts(Array.isArray(data) ? data : []);
    }
  };

  const fetchMasters = async () => {
    const [rekeningRes, tipeRes] = await Promise.all([
      glBankService.getRekeningBank({ activeOnly: 1 }),
      glBankService.getTipeRekening({ isActive: 1 }),
    ]);
    setRekeningBanks(Array.isArray(rekeningRes?.data) ? rekeningRes.data : []);
    setTipeRekeningList(Array.isArray(tipeRes?.data) ? tipeRes.data : []);
  };

  const generateNoInvoice = async (type, tanggal) => {
    const res = await invoicePenjualanService.getNextNoInvoice(type, tanggal);
    return res?.noInvoice || '';
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      await fetchProjects();
      await fetchMasters();
      if (selectedProjectId) {
        await Promise.all([fetchLookupForTab(), fetchListByTab()]);
      }
    } catch (err) {
      toast.error(err.message || 'Gagal memuat data invoice penjualan');
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
        await Promise.all([fetchLookupForTab(), fetchListByTab()]);
      } catch (err) {
        toast.error(err.message || 'Gagal memuat data project');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, activeTab]);

  useEffect(() => {
    if (activeTab !== TAB_DESAIN) return;
    if (!selectedDesignQuotation || editingDesainId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormDesain((prev) => ({
      ...prev,
      jumlahTagihan: String(Math.round(Number(selectedDesignQuotation.totalQuotation || 0)) || 0),
    }));
  }, [selectedDesignQuotation, activeTab, editingDesainId]);

  useEffect(() => {
    if (activeTab !== TAB_KLIEN) return;
    if (!selectedTerm || editingKlienId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormKlien((prev) => ({
      ...prev,
      termLabel: prev.termLabel || selectedTerm.label || '',
      jumlahTagihan: String(Number(selectedTerm.amount || 0) || 0),
    }));
  }, [selectedTerm, activeTab, editingKlienId]);

  const filteredRows = useMemo(() => {
    const source = activeTab === TAB_DESAIN ? rowsDesain : rowsKlien;
    const q = search.trim().toLowerCase();
    if (!q) return source;
    return source.filter((row) => {
      const noInv = (row.noInvoice || '').toLowerCase();
      const proj = (row.project?.name || '').toLowerCase();
      const ket = (row.keterangan || '').toLowerCase();
      const approval = (row.approvalStatus || '').toLowerCase();
      return noInv.includes(q) || proj.includes(q) || ket.includes(q) || approval.includes(q);
    });
  }, [activeTab, rowsDesain, rowsKlien, search]);

  const openCreateDesain = async () => {
    try {
      setEditingDesainId(null);
      const tanggal = new Date().toISOString().slice(0, 10);
      const noInvoice = await generateNoInvoice('DESAIN', tanggal);
      setFormDesain({ ...makeEmptyDesainForm(), projectId: selectedProjectId || '', tanggal, noInvoice });
      setShowDesainModal(true);
    } catch (err) {
      toast.error(err.message || 'Gagal generate nomor invoice desain');
    }
  };

  const openEditDesain = (row) => {
    setEditingDesainId(row.id);
    setFormDesain({
      projectId: row.projectId || selectedProjectId || '',
      designQuotationId: row.designQuotationId || '',
      noInvoice: row.noInvoice || '',
      tanggal: row.tanggal ? new Date(row.tanggal).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      rekeningBankId: row.rekeningBankId || '',
      tipeRekeningId: row.tipeRekeningId || row.rekeningBank?.tipeRekeningId || '',
      jumlahTagihan: String(Number(row.jumlahTagihan || 0)),
      jumlahDibayar: String(Number(row.jumlahDibayar || 0)),
      keterangan: row.keterangan || '',
    });
    setShowDesainModal(true);
  };

  const openCreateKlien = async () => {
    try {
      setEditingKlienId(null);
      const tanggal = new Date().toISOString().slice(0, 10);
      const noInvoice = await generateNoInvoice('KLIEN', tanggal);
      setFormKlien({ ...makeEmptyKlienForm(), projectId: selectedProjectId || '', tanggal, noInvoice });
      setShowKlienModal(true);
    } catch (err) {
      toast.error(err.message || 'Gagal generate nomor invoice klien');
    }
  };

  const openEditKlien = (row) => {
    setEditingKlienId(row.id);
    setFormKlien({
      projectId: row.projectId || selectedProjectId || '',
      clientId: row.clientId || row.project?.client?.id || '',
      spkContractId: row.spkContractId || '',
      spkTermId: row.spkTermId || '',
      termLabel: row.termLabel || '',
      noInvoice: row.noInvoice || '',
      tanggal: row.tanggal ? new Date(row.tanggal).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      rekeningBankId: row.rekeningBankId || '',
      tipeRekeningId: row.tipeRekeningId || row.rekeningBank?.tipeRekeningId || '',
      jumlahTagihan: String(Number(row.jumlahTagihan || 0)),
      jumlahDibayar: String(Number(row.jumlahDibayar || 0)),
      keterangan: row.keterangan || '',
    });
    setShowKlienModal(true);
  };

  const submitDesain = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        projectId: formDesain.projectId,
        designQuotationId: formDesain.designQuotationId,
        tanggal: formDesain.tanggal,
        rekeningBankId: formDesain.rekeningBankId || null,
        tipeRekeningId: formDesain.tipeRekeningId || null,
        jumlahDibayar: parseDigitInput(formDesain.jumlahDibayar),
        keterangan: formDesain.keterangan || null,
      };

      if (editingDesainId) {
        await invoicePenjualanService.updateDesain(editingDesainId, payload);
        toast.success('Invoice penjualan desain berhasil diupdate.');
      } else {
        await invoicePenjualanService.createDesain(payload);
        toast.success('Invoice penjualan desain berhasil dibuat.');
      }
      setShowDesainModal(false);
      await fetchListByTab();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan invoice penjualan desain');
    } finally {
      setSubmitting(false);
    }
  };

  const submitKlien = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        projectId: formKlien.projectId,
        clientId: formKlien.clientId || null,
        spkContractId: formKlien.spkContractId || null,
        spkTermId: formKlien.spkTermId,
        termLabel: formKlien.termLabel || null,
        tanggal: formKlien.tanggal,
        rekeningBankId: formKlien.rekeningBankId || null,
        tipeRekeningId: formKlien.tipeRekeningId || null,
        jumlahDibayar: parseDigitInput(formKlien.jumlahDibayar),
        keterangan: formKlien.keterangan || null,
      };

      if (editingKlienId) {
        await invoicePenjualanService.updateKlien(editingKlienId, payload);
        toast.success('Invoice penjualan klien berhasil diupdate.');
      } else {
        await invoicePenjualanService.createKlien(payload);
        toast.success('Invoice penjualan klien berhasil dibuat.');
      }
      setShowKlienModal(false);
      await fetchListByTab();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan invoice penjualan klien');
    } finally {
      setSubmitting(false);
    }
  };

  const doApproveFinance = async (id) => {
    try {
      if (activeTab === TAB_DESAIN) await invoicePenjualanService.approveFinanceDesain(id);
      else await invoicePenjualanService.approveFinanceKlien(id);
      toast.success('Approve Finance berhasil.');
      await fetchListByTab();
    } catch (err) {
      toast.error(err.message || 'Gagal approve finance');
    }
  };

  const doApproveFinal = async (id) => {
    try {
      if (activeTab === TAB_DESAIN) await invoicePenjualanService.approveDesain(id);
      else await invoicePenjualanService.approveKlien(id);
      toast.success('Approve final berhasil.');
      await fetchListByTab();
    } catch (err) {
      toast.error(err.message || 'Gagal approve final');
    }
  };

  const doReject = async (id) => {
    const reason = window.prompt('Alasan reject invoice ini:');
    if (reason === null) return;
    try {
      if (activeTab === TAB_DESAIN) await invoicePenjualanService.rejectDesain(id, reason);
      else await invoicePenjualanService.rejectKlien(id, reason);
      toast.success('Invoice berhasil di-reject.');
      await fetchListByTab();
    } catch (err) {
      toast.error(err.message || 'Gagal reject invoice');
    }
  };

  const doPrintPdf = async (row) => {
    try {
      const blob =
        activeTab === TAB_DESAIN
          ? await invoicePenjualanService.getDesainPdfBlob(row.id)
          : await invoicePenjualanService.getKlienPdfBlob(row.id);
      openBlobInNewTab(blob);
    } catch (err) {
      toast.error(err.message || 'Gagal mencetak PDF invoice');
    }
  };

  const doPostGl = async (row) => {
    const nominal = window.prompt('Nominal kirim Kas/Bank (kosong = jumlah dibayar):', String(Number(row.jumlahDibayar || row.jumlahTagihan || 0)));
    if (nominal === null) return;
    const payload = {
      tanggal: new Date().toISOString().slice(0, 10),
      rekeningBankId: row.rekeningBankId || null,
      tipeRekeningId: row.tipeRekeningId || row.rekeningBank?.tipeRekeningId || null,
    };
    if (String(nominal).trim() !== '') payload.nominal = Number(String(nominal).replace(/[^0-9.-]/g, ''));

    try {
      if (activeTab === TAB_DESAIN) await invoicePenjualanService.postGlDesain(row.id, payload);
      else await invoicePenjualanService.postGlKlien(row.id, payload);
      toast.success('Kirim ke Kas/Bank berhasil.');
      await fetchListByTab();
    } catch (err) {
      toast.error(err.message || 'Gagal kirim ke Kas/Bank');
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0b09] text-[#f2ead9]">
      <Header />
      <div className="px-5 md:px-10 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-[#888] text-xs uppercase tracking-wider mb-1">Finance • Penjualan</p>
            <h1 className="text-2xl md:text-3xl font-bold">Invoice Penjualan</h1>
            <p className="text-[#888] text-sm mt-1">
              Satu halaman untuk invoice <strong>Penjualan Desain</strong> dan <strong>Penjualan Klien</strong> (dengan tab), termasuk approval 2-level dan posting buku besar.
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
          <div className="flex items-center gap-2">
            <button className={tabButtonClass(activeTab === TAB_DESAIN)} onClick={() => setActiveTab(TAB_DESAIN)}>
              <FileText size={15} className="inline mr-2" />Penjualan Desain
            </button>
            <button className={tabButtonClass(activeTab === TAB_KLIEN)} onClick={() => setActiveTab(TAB_KLIEN)}>
              <Building2 size={15} className="inline mr-2" />Penjualan Klien
            </button>
          </div>

          <div className="flex-1" />

          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm min-w-[240px]"
          >
            {projects.length === 0 && <option value="">Belum ada proyek</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={activeTab === TAB_DESAIN ? openCreateDesain : openCreateKlien}
            className="px-4 py-2 rounded-xl bg-[#d4af37] text-[#0c0b09] font-semibold text-sm hover:bg-[#e3be4d] transition-all"
          >
            <Plus size={16} className="inline mr-2" />Tambah Invoice
          </button>
        </div>

        <div className="mb-4 relative w-full md:w-96">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor invoice / proyek / keterangan / status..."
            className="w-full pl-9 pr-3 py-2 bg-[#14120e] border border-[#2a2a2a] rounded-xl text-sm outline-none focus:border-[#d4af37]"
          />
        </div>

        <div className="bg-[#14120e] border border-[#23211d] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1a1814] text-[#888] uppercase text-[11px] tracking-wider">
                  <th className="px-4 py-3 text-left">Invoice</th>
                  <th className="px-4 py-3 text-left">Project / Referensi</th>
                  <th className="px-4 py-3 text-right">Tagihan</th>
                  <th className="px-4 py-3 text-right">Dibayar</th>
                  <th className="px-4 py-3 text-right">Sisa</th>
                  <th className="px-4 py-3 text-center">Approval</th>
                  <th className="px-4 py-3 text-center">Bayar</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-[#777]">Memuat data...</td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-[#777]">Belum ada data invoice.</td>
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
                          {row.createdBy?.name && (
                            <div className="text-[10px] text-[#888] mt-0.5">
                              Dibuat: <span className="text-[#d4af37]">{row.createdBy.name}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="text-[#ddd]">{row.project?.name || '-'}</div>
                          <div className="text-[11px] text-[#777]">
                            {activeTab === TAB_DESAIN
                              ? row.designQuotationId
                                ? `Quotation: ${row.designQuotationId.slice(0, 8)}...`
                                : '-'
                              : row.spkTerm?.label || row.termLabel || row.spkContract?.spkNumber || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">{fmtRp(row.jumlahTagihan)}</td>
                        <td className="px-4 py-3 text-right text-emerald-300">{fmtRp(row.jumlahDibayar)}</td>
                        <td className="px-4 py-3 text-right text-yellow-300">{fmtRp(row.sisaTagihan)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-semibold ${APPROVAL_BADGE[approvalStatus] || APPROVAL_BADGE.PENDING}`}>
                            {APPROVAL_LABEL[approvalStatus] || approvalStatus}
                          </span>
                          {row.verifiedBy?.name && (
                            <div className="text-[10px] text-blue-400 mt-0.5">
                              Finance: {row.verifiedBy.name}
                            </div>
                          )}
                          {row.approvedBy?.name && (
                            <div className="text-[10px] text-emerald-400 mt-0.5">
                              Atasan: {row.approvedBy.name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex px-2.5 py-1 rounded-full border text-[11px] border-[#2f2f2f] text-[#ccc]">
                            {STATUS_BAYAR_LABEL[row.statusBayar] || row.statusBayar}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5 justify-center">
                            <button
                              className={`${actionBtnClass} border-[#2b2b2b] text-[#d4af37] hover:bg-[#d4af37]/10`}
                              onClick={() => (activeTab === TAB_DESAIN ? openEditDesain(row) : openEditKlien(row))}
                              disabled={row.postedToGl}
                              title="Ubah faktur"
                            >Ubah</button>
                            <button
                              className={`${actionBtnClass} border-blue-500/40 text-blue-300 hover:bg-blue-500/10`}
                              onClick={() => doApproveFinance(row.id)}
                              disabled={!canApproveFinance}
                              title="Setujui Finance"
                            >
                              <Clock size={12} className="inline mr-1" />Finance
                            </button>
                            <button
                              className={`${actionBtnClass} border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10`}
                              onClick={() => doApproveFinal(row.id)}
                              disabled={!canApproveFinal}
                              title="Approve Final"
                            >
                              <CheckCircle2 size={12} className="inline mr-1" />Final
                            </button>
                            <button
                              className={`${actionBtnClass} border-red-500/40 text-red-300 hover:bg-red-500/10`}
                              onClick={() => doReject(row.id)}
                              disabled={row.postedToGl}
                              title="Reject"
                            >
                              <XCircle size={12} className="inline mr-1" />Reject
                            </button>
                            <button
                              className={`${actionBtnClass} border-purple-500/40 text-purple-300 hover:bg-purple-500/10`}
                              onClick={() => doPrintPdf(row)}
                              title="Cetak PDF"
                            >
                              <Printer size={12} className="inline mr-1" />Cetak
                            </button>
                            <button
                              className={`${actionBtnClass} border-[#d4af37]/50 text-[#d4af37] hover:bg-[#d4af37]/10`}
                              onClick={() => doPostGl(row)}
                              disabled={!canPostGl}
                              title="Kirim Kas/Bank"
                            >
                              <Landmark size={12} className="inline mr-1" />Kas/Bank
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

      {showDesainModal && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4" onClick={() => setShowDesainModal(false)}>
          <div className="bg-[#14120e] border border-[#2a2a2a] rounded-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText size={18} className="text-[#d4af37]" />
                {editingDesainId ? 'Edit Invoice Penjualan Desain' : 'Tambah Invoice Penjualan Desain'}
              </h3>
              <button className="text-[#888] hover:text-white" onClick={() => setShowDesainModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="px-5 py-4 space-y-3" onSubmit={submitDesain}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#888]">Project *</label>
                  <select
                    required
                    value={formDesain.projectId}
                    onChange={(e) => setFormDesain((p) => ({ ...p, projectId: e.target.value, designQuotationId: '' }))}
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2"
                  >
                    <option value="">-- pilih project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[#888]">Design Quotation * (wajib referensi)</label>
                  <select
                    required
                    value={formDesain.designQuotationId}
                    onChange={(e) => setFormDesain((p) => ({ ...p, designQuotationId: e.target.value }))}
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2"
                  >
                    <option value="">-- pilih design quotation --</option>
                    {designQuotations
                      .filter((q) => q.projectId === formDesain.projectId)
                      .map((q) => (
                        <option key={q.id} value={q.id}>
                          {fmtTgl(q.quotationDate)} • {fmtRp(q.totalQuotation)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#888]">No Invoice (Auto)</label>
                  <input
                    required
                    value={formDesain.noInvoice}
                    readOnly
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2 text-[#d4af37]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#888]">Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={formDesain.tanggal}
                    onChange={async (e) => {
                      const tanggal = e.target.value;
                      setFormDesain((p) => ({ ...p, tanggal }));
                      if (!editingDesainId) {
                        try {
                          const next = await generateNoInvoice('DESAIN', tanggal);
                          setFormDesain((p) => ({ ...p, noInvoice: next }));
                        } catch {
                          // keep existing no invoice
                        }
                      }
                    }}
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#888]">Rekening</label>
                  <select
                    value={formDesain.rekeningBankId}
                    onChange={(e) =>
                      setFormDesain((p) => ({
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
                <div>
                  <label className="text-xs text-[#888]">Tipe Rekening</label>
                  <select
                    value={formDesain.tipeRekeningId}
                    onChange={(e) => setFormDesain((p) => ({ ...p, tipeRekeningId: e.target.value }))}
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#888]">Jumlah Tagihan (readonly)</label>
                  <input
                    readOnly
                    value={formatDigitInput(formDesain.jumlahTagihan)}
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2 text-[#f2ead9]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#888]">Jumlah Dibayar</label>
                  <input
                    inputMode="numeric"
                    value={formatDigitInput(formDesain.jumlahDibayar)}
                    onChange={(e) => setFormDesain((p) => ({ ...p, jumlahDibayar: toDigits(e.target.value) }))}
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#888]">Keterangan</label>
                <textarea
                  rows={3}
                  value={formDesain.keterangan}
                  onChange={(e) => setFormDesain((p) => ({ ...p, keterangan: e.target.value }))}
                  className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2a2a2a]">
                <button type="button" className="px-4 py-2 text-[#aaa]" onClick={() => setShowDesainModal(false)}>
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

      {showKlienModal && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4" onClick={() => setShowKlienModal(false)}>
          <div className="bg-[#14120e] border border-[#2a2a2a] rounded-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase size={18} className="text-[#d4af37]" />
                {editingKlienId ? 'Edit Invoice Penjualan Klien' : 'Tambah Invoice Penjualan Klien'}
              </h3>
              <button className="text-[#888] hover:text-white" onClick={() => setShowKlienModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="px-5 py-4 space-y-3" onSubmit={submitKlien}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#888]">Project *</label>
                  <select
                    required
                    value={formKlien.projectId}
                    onChange={(e) => setFormKlien((p) => ({ ...p, projectId: e.target.value, spkContractId: '', spkTermId: '' }))}
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2"
                  >
                    <option value="">-- pilih project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[#888]">SPK Contract *</label>
                  <select
                    required
                    value={formKlien.spkContractId}
                    onChange={(e) => setFormKlien((p) => ({ ...p, spkContractId: e.target.value, spkTermId: '' }))}
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2"
                  >
                    <option value="">-- pilih spk contract --</option>
                    {spkContracts
                      .filter((c) => c.projectId === formKlien.projectId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.spkNumber || c.id.slice(0, 8)} • {fmtRp(c.contractValue)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#888]">Termin SPK * (wajib referensi)</label>
                  <select
                    required
                    value={formKlien.spkTermId}
                    onChange={(e) => {
                      const termId = e.target.value;
                      const term = spkTerms.find((t) => t.id === termId) || null;
                      setFormKlien((p) => ({
                        ...p,
                        spkTermId: termId,
                        termLabel: term?.label || p.termLabel,
                        jumlahTagihan: term ? String(Number(term.amount || 0)) : '0',
                      }));
                    }}
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2"
                    disabled={!formKlien.spkContractId}
                  >
                    <option value="">-- pilih termin spk --</option>
                    {spkTerms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label} • {fmtRp(t.amount)}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#777] mt-1">Jumlah tagihan otomatis dari <code>SpkTerm.amount</code> dan tidak bisa diedit manual.</p>
                </div>

                <div>
                  <label className="text-xs text-[#888]">Label Termin</label>
                  <input
                    value={formKlien.termLabel}
                    onChange={(e) => setFormKlien((p) => ({ ...p, termLabel: e.target.value }))}
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#888]">No Invoice (Auto)</label>
                  <input
                    required
                    value={formKlien.noInvoice}
                    readOnly
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2 text-[#d4af37]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#888]">Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={formKlien.tanggal}
                    onChange={async (e) => {
                      const tanggal = e.target.value;
                      setFormKlien((p) => ({ ...p, tanggal }));
                      if (!editingKlienId) {
                        try {
                          const next = await generateNoInvoice('KLIEN', tanggal);
                          setFormKlien((p) => ({ ...p, noInvoice: next }));
                        } catch {
                          // keep existing no invoice
                        }
                      }
                    }}
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#888]">Rekening</label>
                  <select
                    value={formKlien.rekeningBankId}
                    onChange={(e) =>
                      setFormKlien((p) => ({
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
                <div>
                  <label className="text-xs text-[#888]">Tipe Rekening</label>
                  <select
                    value={formKlien.tipeRekeningId}
                    onChange={(e) => setFormKlien((p) => ({ ...p, tipeRekeningId: e.target.value }))}
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#888]">Jumlah Tagihan (readonly)</label>
                  <input
                    readOnly
                    value={formatDigitInput(formKlien.jumlahTagihan)}
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2 text-[#f2ead9]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#888]">Jumlah Dibayar</label>
                  <input
                    inputMode="numeric"
                    value={formatDigitInput(formKlien.jumlahDibayar)}
                    onChange={(e) => setFormKlien((p) => ({ ...p, jumlahDibayar: toDigits(e.target.value) }))}
                    className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#888]">Keterangan</label>
                <textarea
                  rows={3}
                  value={formKlien.keterangan}
                  onChange={(e) => setFormKlien((p) => ({ ...p, keterangan: e.target.value }))}
                  className="w-full mt-1 bg-[#1a1814] border border-[#2a2a2a] rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2a2a2a]">
                <button type="button" className="px-4 py-2 text-[#aaa]" onClick={() => setShowKlienModal(false)}>
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

export default InvoicePenjualanPage;
