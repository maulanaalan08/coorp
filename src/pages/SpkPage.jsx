import { useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileText, Plus, RefreshCw, Save, Send, ShieldCheck, Trash2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import ProjectSelector from '../components/ProjectSelector';
import { useProjects } from '../hooks/useProjects';
import { spkService } from '../services/spkService';
import {
  buildSpkPartyPayload,
  createClientPartyForm,
  mapContractPartiesToForm,
  validateClientPartyForm,
  validateClientSchedule,
} from '../utils/spkPartyForm';
import '../styles/SpkPage.css';

const money = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
const numberValue = (value) => Number(String(value ?? '').replace(/[^0-9.-]/g, '')) || 0;
const itemContractTotal = (item) => {
  const rabTotal = numberValue(item?.rabTotalPrice);
  return rabTotal > 0 ? rabTotal : numberValue(item?.rapTotalPrice);
};
const dateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const newTerm = (index = 0) => ({
  label: `Termin ${index + 1}`,
  percent: index === 0 ? 100 : 0,
  amount: 0,
  dueDescription: '',
  milestone: '',
});

const rebalanceTermsForRetention = (currentTerms, retentionValue, totalValue = 0) => {
  const retention = Math.min(100, Math.max(0, numberValue(retentionValue)));
  const targetPercent = 100 - retention;
  if (!currentTerms.length) return currentTerms;

  const currentPercent = currentTerms.reduce((sum, term) => sum + numberValue(term.percent), 0);
  if (currentPercent <= 0) {
    return currentTerms.map((term, index) => {
      const percent = index === 0 ? targetPercent : 0;
      return { ...term, percent, amount: Math.round(numberValue(totalValue) * percent / 100) };
    });
  }

  let allocated = 0;
  return currentTerms.map((term, index) => {
    const percent = index === currentTerms.length - 1
      ? Math.round((targetPercent - allocated) * 100) / 100
      : Math.round((numberValue(term.percent) * targetPercent / currentPercent) * 100) / 100;
    allocated += percent;
    return { ...term, percent, amount: Math.round(numberValue(totalValue) * percent / 100) };
  });
};

export default function SpkPage({ initialProjectId = null, type: initialType = 'CLIENT' }) {
  const { projects, loading: projectsLoading } = useProjects();
  const [projectId, setProjectId] = useState(initialProjectId || '');
  const [source, setSource] = useState(null);
  const [project, setProject] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [subCategoryFilter, setSubCategoryFilter] = useState('ALL');
  const [type, setType] = useState(initialType === 'SUBCON' ? 'SUBCON' : 'CLIENT');
  const [retentionPercent, setRetentionPercent] = useState(0);
  const [terms, setTerms] = useState([newTerm(0)]);
  const [subconPartyName, setSubconPartyName] = useState('');
  const [clientParties, setClientParties] = useState(() => createClientPartyForm());
  const [workDurationDays, setWorkDurationDays] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const selectedValue = useMemo(() => Math.round((source?.items || [])
    .filter((item) => selectedItemIds.includes(item.id))
    .reduce((sum, item) => sum + itemContractTotal(item), 0)), [source, selectedItemIds]);
  const categoryOptions = useMemo(() => [...new Set((source?.items || [])
    .map((item) => item.categoryLabel)
    .filter(Boolean))].sort(), [source]);
  const subCategoryOptions = useMemo(() => [...new Set((source?.items || [])
    .filter((item) => categoryFilter === 'ALL' || item.categoryLabel === categoryFilter)
    .map((item) => item.subCategoryLabel)
    .filter(Boolean))].sort(), [source, categoryFilter]);
  const filteredSourceItems = useMemo(() => (source?.items || []).filter((item) =>
    (categoryFilter === 'ALL' || item.categoryLabel === categoryFilter)
    && (subCategoryFilter === 'ALL' || item.subCategoryLabel === subCategoryFilter)),
  [source, categoryFilter, subCategoryFilter]);
  const termsPercent = terms.reduce((sum, term) => sum + numberValue(term.percent), 0);
  const totalPercent = termsPercent + numberValue(retentionPercent);
  const retentionAmount = Math.round(selectedValue * numberValue(retentionPercent) / 100);
  const selectedItemsCount = selectedItemIds.length;
  const sourceItemsCount = source?.items?.length || 0;
  const selectedProjectName = project?.displayName || project?.name || 'Project belum dipilih';
  const selectedProjectLocation = project?.location || clientParties.secondParty.address || 'Lokasi project belum tersedia';
  const partyReady = type === 'CLIENT'
    ? validateClientPartyForm(clientParties).length === 0
    : Boolean(subconPartyName.trim());
  const scheduleReady = type !== 'CLIENT'
    || validateClientSchedule({ workDurationDays, startDate, endDate }).length === 0;
  const paymentReady = Math.abs(totalPercent - 100) < 0.01;

  const toggleAllItems = () => {
    const visibleIds = filteredSourceItems.map((item) => item.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedItemIds.includes(id));
    setSelectedItemIds((current) => allVisibleSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : [...new Set([...current, ...visibleIds])]);
  };

  const loadProjectData = async (id = projectId) => {
    if (!id) {
      setSource(null);
      setProject(null);
      setContracts([]);
      setSelectedItemIds([]);
      return;
    }
    setLoading(true);
    try {
      const sourceRequest = type === 'SUBCON'
        ? spkService.getPoJasaSource(id)
        : spkService.getRabSource(id);
      const [nextSource, nextContracts] = await Promise.all([
        sourceRequest,
        spkService.getByProjectId(id),
      ]);
      setSource(nextSource);
      setContracts(nextContracts.contracts || []);
      const loadedProject = nextContracts.project || nextSource.project || null;
      setProject(loadedProject);
      if (!editingId && type === 'CLIENT') setClientParties(createClientPartyForm(loadedProject));
      setSelectedItemIds((nextSource.items || []).map((item) => item.id));
    } catch (error) {
      toast.error(error.message || 'Gagal memuat sumber RAB/SPK.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Halaman SPK dipisah per tipe: prop `type` adalah sumber kebenaran.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setType(initialType === 'SUBCON' ? 'SUBCON' : 'CLIENT');
  }, [initialType]);

  useEffect(() => {
    // Existing page lifecycle: mirror an externally selected project.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialProjectId) setProjectId(initialProjectId);
  }, [initialProjectId]);

  useEffect(() => {
    // Existing page lifecycle: load when the selected project changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (projectId) loadProjectData(projectId);
  // loadProjectData is intentionally scoped to the selected project.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    // Existing page lifecycle: recalculate derived term amounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTerms((current) => current.map((term) => ({
      ...term,
      amount: Math.round(selectedValue * numberValue(term.percent) / 100),
    })));
  }, [selectedValue]);

  const updateTerm = (index, field, value) => {
    setTerms((current) => current.map((term, termIndex) => {
      if (termIndex !== index) return term;
      const next = { ...term, [field]: value };
      if (field === 'percent') next.amount = Math.round(selectedValue * numberValue(value) / 100);
      return next;
    }));
  };

  const updateRetention = (value) => {
    setRetentionPercent(value);
    setTerms((current) => rebalanceTermsForRetention(current, value, selectedValue));
  };

  const resetDraftForm = () => {
    setEditingId(null);
    setType(initialType === 'SUBCON' ? 'SUBCON' : 'CLIENT');
    setRetentionPercent(0);
    setTerms([newTerm(0)]);
    setSubconPartyName('');
    setClientParties(createClientPartyForm(project));
    setWorkDurationDays('');
    setStartDate('');
    setEndDate('');
    setNotes('');
  };

  const startEdit = (contract) => {
    if (contract.status !== 'DRAFT') return toast.error('Hanya SPK DRAFT yang dapat diubah.');
    setEditingId(contract.id);
    setType(initialType === 'SUBCON' ? 'SUBCON' : 'CLIENT');
    const savedRetention = numberValue(contract.retentionPercent);
    setRetentionPercent(savedRetention);
    const savedTerms = (contract.terms || []).length
      ? contract.terms.map((term, index) => ({
        label: term.label || `Termin ${index + 1}`,
        percent: numberValue(term.percent),
        amount: numberValue(term.amount),
        dueDescription: term.dueDescription || '',
        milestone: term.milestone || '',
      }))
      : [newTerm(0)];
    setTerms(rebalanceTermsForRetention(savedTerms, savedRetention, Number(contract.contractValue)));
    if ((initialType === 'SUBCON' ? 'SUBCON' : 'CLIENT') === 'CLIENT') {
      setClientParties(mapContractPartiesToForm(contract, project));
      setSubconPartyName('');
    } else {
      setSubconPartyName(
        contract.partyData?.contractorName
        || contract.partyData?.name
        || contract.snapshot?.party?.name
        || '',
      );
    }
    setWorkDurationDays(contract.workDurationDays ? String(contract.workDurationDays) : '');
    setStartDate(dateInput(contract.startDate));
    setEndDate(dateInput(contract.endDate));
    setNotes(contract.notes || '');
    setSelectedItemIds((contract.snapshot?.workScope || [])
      .map((item) => item.rabItemId)
      .filter((id) => (source?.items || []).some((sourceItem) => sourceItem.id === id)));
    setCategoryFilter('ALL');
    setSubCategoryFilter('ALL');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveDraft = async () => {
    if (!projectId) return toast.error('Pilih project terlebih dahulu.');
    if (!selectedItemIds.length) return toast.error('Pilih minimal satu item RAB.');
    if (type === 'CLIENT') {
      const partyErrors = validateClientPartyForm(clientParties);
      if (partyErrors.length) return toast.error(partyErrors[0]);
      const scheduleErrors = validateClientSchedule({ workDurationDays, startDate, endDate });
      if (scheduleErrors.length) return toast.error(scheduleErrors[0]);
    } else if (!subconPartyName.trim()) {
      return toast.error('Nama pihak/kontraktor wajib diisi.');
    }
    setSaving(true);
    try {
      const partyPayload = buildSpkPartyPayload(type, { clientParties, subconPartyName });
      const payload = {
        type,
        ...(type === 'SUBCON'
          ? { poJasaItemIds: selectedItemIds }
          : { rabItemIds: selectedItemIds }),
        contractValue: selectedValue,
        terms: terms.map((term) => ({ ...term, percent: numberValue(term.percent), amount: Math.round(selectedValue * numberValue(term.percent) / 100) })),
        retentionPercent: numberValue(retentionPercent),
        ...partyPayload,
        workDurationDays: workDurationDays ? Number(workDurationDays) : null,
        startDate: startDate || null,
        endDate: endDate || null,
        notes,
      };
      if (editingId) {
        await spkService.updateDraft(editingId, payload);
        toast.success('Draft SPK berhasil diperbarui.');
      } else {
        await spkService.createDraft(projectId, payload);
        toast.success('Draft SPK berhasil disimpan.');
      }
      await loadProjectData();
      resetDraftForm();
    } catch (error) {
      toast.error(error.message || 'Gagal menyimpan draft SPK.');
    } finally {
      setSaving(false);
    }
  };

  const handleProjectChange = (event) => {
    resetDraftForm();
    setProjectId(event.target.value);
  };

  // Halaman dipisah per tipe: hanya kontrak bertipe sama yang ditampilkan.
  const visibleContracts = useMemo(
    () => (contracts || []).filter((contract) => (contract.type || 'CLIENT') === type),
    [contracts, type],
  );

  const updateClientParty = (partyKey, field, value) => {
    setClientParties((current) => ({
      ...current,
      [partyKey]: { ...current[partyKey], [field]: value },
    }));
  };

  const viewPdf = async (contract) => {
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) return toast.error('Izinkan pop-up browser untuk melihat PDF.');
    previewWindow.document.write('<p style="font-family:Arial,sans-serif;padding:24px">Memuat PDF SPK...</p>');
    try {
      const blob = await spkService.getPdfView(contract.id);
      const objectUrl = URL.createObjectURL(blob);
      previewWindow.location.href = objectUrl;
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      previewWindow.close();
      toast.error(error.message || 'Gagal melihat PDF SPK.');
    }
  };

  const downloadPdf = async (contract) => {
    try {
      const blob = await spkService.getPdfDownload(contract.id);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeNumber = (contract.spkNumber || `DRAFT-${contract.id}`).replace(/[^a-zA-Z0-9_-]+/g, '-');
      link.href = objectUrl;
      link.download = `SPK-${safeNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast.error(error.message || 'Gagal mengunduh PDF SPK.');
    }
  };

  const issue = async (contractId) => {
    try {
      await spkService.issueSpk(contractId);
      toast.success('SPK berhasil diterbitkan. Nomor resmi sudah terpakai.');
      await loadProjectData();
    } catch (error) {
      toast.error(error.message || 'SPK belum memenuhi syarat terbit.');
    }
  };

  const sign = async (contractId) => {
    try {
      await spkService.signSpk(contractId);
      toast.success('SPK ditandai sudah ditandatangani.');
      await loadProjectData();
    } catch (error) {
      toast.error(error.message || 'Gagal menandai SPK.');
    }
  };

  const cancel = async (contract) => {
    const reason = window.prompt('Alasan pembatalan SPK:', 'Dibatalkan oleh pemilik proyek');
    if (reason === null) return;
    try {
      await spkService.cancelSpk(contract.id, reason);
      toast.success(contract.status === 'DRAFT' ? 'Draft SPK dihapus.' : 'SPK dibatalkan. Nomor tidak akan dipakai ulang.');
      await loadProjectData();
    } catch (error) {
      toast.error(error.message || 'Gagal membatalkan SPK.');
    }
  };

  return (
    <div className="spk-page">
      <header className="spk-header">
        <div>
          <div className="spk-eyebrow">Perencanaan / Kontrak</div>
          <h1>{type === 'SUBCON' ? 'SPK Subcon' : 'SPK Client'}</h1>
          <p>Susun ruang lingkup, para pihak, jadwal, dan termin pembayaran dalam satu alur. Draft tidak mengambil nomor resmi.</p>
        </div>
        <button type="button" className="spk-btn" onClick={() => loadProjectData()} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Muat ulang
        </button>
      </header>

      <div className="spk-project-bar">
        <div className="spk-project-selector">
          <ProjectSelector projectList={projects} projectId={projectId} loading={projectsLoading} onChange={handleProjectChange} />
        </div>
        {projectId && <button type="button" className="spk-btn" onClick={resetDraftForm}>Mulai draft baru</button>}
      </div>

      {!projectId ? (
        <div className="spk-empty-state">
          <FileText size={28} />
          <h2>Pilih project untuk mulai</h2>
          <p>Data RAB, para pihak, dan riwayat SPK akan dimuat berdasarkan project yang dipilih.</p>
        </div>
      ) : (
        <>
          <div className="spk-workspace">
            <div className="spk-form-flow">
              <section className="spk-panel">
                <div className="spk-panel-header">
                  <div className="spk-panel-heading"><span className="spk-step">1</span><div><h2>{type === 'SUBCON' ? 'Ruang lingkup dari PO Jasa Approved' : 'Ruang lingkup dari RAB'}</h2><p>{type === 'SUBCON' ? 'Hanya item PO Jasa yang sudah disetujui dua tingkat.' : 'Pilih item yang akan dibekukan sebagai snapshot kontrak.'}</p></div></div>
                  <strong className="spk-panel-value">{money(selectedValue)}</strong>
                </div>
                <div className="spk-panel-body">
                  {type === 'SUBCON' && (
                    <div className="spk-payment-fields">
                      <label className="spk-field"><span>Label kategori</span><select className="spk-input" value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setSubCategoryFilter('ALL'); }}><option value="ALL">Semua kategori</option>{categoryOptions.map((label) => <option key={label} value={label}>{label}</option>)}</select></label>
                      <label className="spk-field"><span>Label subkategori</span><select className="spk-input" value={subCategoryFilter} onChange={(event) => setSubCategoryFilter(event.target.value)}><option value="ALL">Semua subkategori</option>{subCategoryOptions.map((label) => <option key={label} value={label}>{label}</option>)}</select></label>
                    </div>
                  )}
                  <div className="spk-scope-toolbar">
                    <label className="spk-check-all"><input type="checkbox" checked={filteredSourceItems.length > 0 && filteredSourceItems.every((item) => selectedItemIds.includes(item.id))} onChange={toggleAllItems} /> {type === 'SUBCON' ? 'Pilih semua hasil filter' : 'Pilih semua item'}</label>
                    <span>{selectedItemsCount} dari {sourceItemsCount} item dipilih</span>
                  </div>
                  <div className="spk-scope-list">
                    {filteredSourceItems.map((item) => {
                      const checked = selectedItemIds.includes(item.id);
                      return <label key={item.id} className={`spk-scope-row${checked ? '' : ' is-off'}`}>
                        <input type="checkbox" checked={checked} onChange={() => setSelectedItemIds((ids) => checked ? ids.filter((id) => id !== item.id) : [...ids, item.id])} />
                        <span className="spk-scope-name">{item.name}<small>{item.volume} {item.paymentUnit || ''} · {type === 'SUBCON' ? `${item.poNumber || 'PO Jasa'} · ${item.contractorName || 'Subcon'} · ${item.categoryLabel || 'Tanpa kategori'} / ${item.subCategoryLabel || 'Tanpa subkategori'}` : 'RAB'}</small></span>
                        <span className="spk-scope-tag">{type === 'SUBCON' ? (item.subCategoryLabel || item.categoryLabel || 'Ruang lingkup') : 'Ruang lingkup'}</span>
                        <strong>{money(itemContractTotal(item))}</strong>
                      </label>;
                    })}
                    {!filteredSourceItems.length && <div className="spk-inline-empty">{type === 'SUBCON' ? 'Belum ada item PO Jasa APPROVED yang cocok dengan filter.' : 'Belum ada item RAB pada project ini.'}</div>}
                  </div>
                </div>
              </section>

              <section className="spk-panel">
                <div className="spk-panel-header">
                  <div className="spk-panel-heading"><span className="spk-step">2</span><div><h2>Identitas para pihak</h2><p>{type === 'CLIENT' ? 'Data dicetak pada isi dan area tanda tangan PDF SPK Client.' : 'Tentukan kontraktor pelaksana dan referensi lokasi project.'}</p></div></div>
                </div>
                <div className="spk-panel-body">
                  {type === 'CLIENT' ? (
                    <div className="spk-party-grid">
                      <div className="spk-party-card">
                        <div className="spk-party-heading"><strong>Pihak pertama</strong><span>Perusahaan / internal</span></div>
                        <div className="spk-field-grid">
                          <label className="spk-field"><span>Nama perwakilan</span><input className="spk-input" value={clientParties.firstParty.name} onChange={(event) => updateClientParty('firstParty', 'name', event.target.value)} placeholder="Nama perwakilan internal" /></label>
                          <label className="spk-field"><span>Jabatan</span><input className="spk-input" value={clientParties.firstParty.position} onChange={(event) => updateClientParty('firstParty', 'position', event.target.value)} placeholder="Contoh: Direktur" /></label>
                          <label className="spk-field full"><span>Perusahaan</span><input className="spk-input" value={clientParties.firstParty.companyName} onChange={(event) => updateClientParty('firstParty', 'companyName', event.target.value)} /></label>
                          <label className="spk-field full"><span>Alamat perusahaan</span><textarea className="spk-input" value={clientParties.firstParty.address} onChange={(event) => updateClientParty('firstParty', 'address', event.target.value)} /></label>
                        </div>
                      </div>
                      <div className="spk-party-card">
                        <div className="spk-party-heading"><strong>Pihak kedua</strong><span>Client / pemberi tugas</span></div>
                        <div className="spk-field-grid">
                          <label className="spk-field"><span>Nama client</span><input className="spk-input" value={clientParties.secondParty.name} onChange={(event) => updateClientParty('secondParty', 'name', event.target.value)} placeholder="Otomatis dari client project" /></label>
                          <label className="spk-field"><span>Jabatan</span><input className="spk-input" value={clientParties.secondParty.position} onChange={(event) => updateClientParty('secondParty', 'position', event.target.value)} /></label>
                          <div className="spk-field full"><span>Alamat project · otomatis</span><div className="spk-input spk-readonly">{clientParties.secondParty.address || 'Alamat project belum tersedia'}</div></div>
                          <div className="spk-field full"><div className="spk-notice">PDF menyiapkan area tanda tangan kosong untuk kedua pihak.</div></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="spk-subcon-grid">
                      <label className="spk-field"><span>Nama pihak / kontraktor</span><input className="spk-input" value={subconPartyName} onChange={(event) => setSubconPartyName(event.target.value)} placeholder="Nama pihak / kontraktor" /></label>
                      <div className="spk-field"><span>Alamat project · otomatis</span><div className="spk-input spk-readonly">{project?.location || 'Otomatis dari alamat project'}</div></div>
                    </div>
                  )}
                </div>
              </section>

              <section className="spk-panel">
                <div className="spk-panel-header">
                  <div className="spk-panel-heading"><span className="spk-step">3</span><div><h2>Jadwal &amp; termin pembayaran</h2><p>Termin dan retensi harus tepat 100% saat SPK diterbitkan.</p></div></div>
                  <div className={`spk-percent-total${paymentReady ? ' is-ready' : ''}`}><span>Total</span><strong>{totalPercent.toFixed(2)}%</strong></div>
                </div>
                <div className="spk-panel-body">
                  <div className="spk-payment-fields">
                    <label className="spk-field"><span>Durasi pekerjaan (hari){type === 'CLIENT' ? ' *' : ''}</span><input type="number" min="1" required={type === 'CLIENT'} className="spk-input" value={workDurationDays} onChange={(event) => setWorkDurationDays(event.target.value)} /></label>
                    <label className="spk-field"><span>Retensi (%)</span><input type="number" min="0" max="100" step="0.01" className="spk-input" value={retentionPercent} onChange={(event) => updateRetention(event.target.value)} /></label>
                    <div className="spk-field"><span>Nilai retensi</span><div className="spk-input spk-readonly">{money(retentionAmount)}</div></div>
                  </div>

                  <div className="spk-table-scroll">
                    <table className="spk-term-table">
                      <thead><tr><th>Termin</th><th>Persen</th><th>Nominal</th><th>Jatuh tempo / milestone</th><th /></tr></thead>
                      <tbody>{terms.map((term, index) => <tr key={`${index}-${term.label}`}>
                        <td><input className="spk-input" value={term.label} onChange={(event) => updateTerm(index, 'label', event.target.value)} /></td>
                        <td><input type="number" min="0" max="100" step="0.01" className="spk-input" value={term.percent} onChange={(event) => updateTerm(index, 'percent', event.target.value)} /></td>
                        <td className="spk-term-money">{money(term.amount)}</td>
                        <td><input className="spk-input" value={term.dueDescription} placeholder="Contoh: setelah progres 50%" onChange={(event) => updateTerm(index, 'dueDescription', event.target.value)} /></td>
                        <td><button type="button" className="spk-btn icon danger" aria-label={`Hapus ${term.label}`} onClick={() => setTerms((current) => current.filter((_, termIndex) => termIndex !== index))} disabled={terms.length === 1}><Trash2 size={14} /></button></td>
                      </tr>)}</tbody>
                    </table>
                  </div>
                  <div className="spk-term-footer">
                    <button type="button" className="spk-btn" onClick={() => setTerms((current) => [...current, newTerm(current.length)])}><Plus size={15} /> Tambah termin</button>
                    <span>Termin dibayar <strong>{money(Math.max(0, selectedValue - retentionAmount))}</strong></span>
                  </div>

                  <div className="spk-divider" />
                  <div className="spk-schedule-grid">
                    <label className="spk-field"><span>Tanggal mulai{type === 'CLIENT' ? ' *' : ''}</span><input type="date" required={type === 'CLIENT'} className="spk-input" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
                    <label className="spk-field"><span>Tanggal selesai{type === 'CLIENT' ? ' *' : ''}</span><input type="date" required={type === 'CLIENT'} className="spk-input" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
                    <div className="spk-field"><span>Status nomor</span><div className="spk-input spk-readonly">{editingId ? 'Mengubah draft tanpa nomor' : 'Belum dialokasikan (Draft)'}</div></div>
                  </div>
                  {type === 'CLIENT' && <p className="spk-helper">Durasi dan tanggal wajib diisi; tanggal selesai tidak boleh lebih awal dari tanggal mulai.</p>}
                  <label className="spk-field spk-notes"><span>Catatan kontrak</span><textarea className="spk-input" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Catatan khusus draft SPK" /></label>
                  <div className="spk-save-bar">
                    <span><i className="spk-ready-dot" /> Draft masih dapat diubah sebelum diterbitkan.</span>
                    <div>{editingId && <button type="button" className="spk-btn" onClick={resetDraftForm}>Batalkan edit</button>}<button type="button" className="spk-btn primary" onClick={saveDraft} disabled={saving}><Save size={15} /> {saving ? 'Menyimpan...' : editingId ? 'Perbarui Draft SPK' : 'Simpan Draft SPK'}</button></div>
                  </div>
                </div>
              </section>
            </div>

            <aside className="spk-summary-column">
              <div className="spk-summary-card">
                <div className="spk-summary-label">Ringkasan kontrak</div>
                <h3>{selectedProjectName}</h3><p>{selectedProjectLocation}</p>
                <div className="spk-divider" />
                <dl><div><dt>Tipe</dt><dd>{type === 'CLIENT' ? 'SPK Client' : 'SPK Subcon'}</dd></div><div><dt>Ruang lingkup</dt><dd>{selectedItemsCount} item RAB</dd></div><div><dt>Durasi</dt><dd>{workDurationDays ? `${workDurationDays} hari kerja` : 'Belum diisi'}</dd></div><div><dt>Termin + retensi</dt><dd className={paymentReady ? 'ready' : ''}>{totalPercent.toFixed(2)}%</dd></div></dl>
                <div className="spk-grand-total"><span>Nilai kontrak</span><strong>{money(selectedValue)}</strong></div>
              </div>
              <div className="spk-summary-card">
                <div className="spk-summary-label">Kesiapan draft</div>
                <ul className="spk-readiness"><li className={selectedItemsCount ? 'ready' : ''}>Ruang lingkup dipilih</li><li className={partyReady ? 'ready' : ''}>Identitas pihak lengkap</li><li className={scheduleReady ? 'ready' : ''}>Jadwal pekerjaan lengkap</li><li className={paymentReady ? 'ready' : ''}>Termin seimbang 100%</li></ul>
                <div className="spk-notice">Nomor resmi baru dibuat saat tombol <strong>Terbitkan</strong> digunakan pada daftar SPK.</div>
              </div>
            </aside>
          </div>

          <section className="spk-records">
            <div className="spk-records-header"><div><div className="spk-eyebrow">Riwayat project</div><h2>Draft &amp; SPK terbit</h2></div><span>{visibleContracts.length} dokumen</span></div>
            <div className="spk-record-list">
              {visibleContracts.map((contract) => {
                const partyName = contract.type === 'CLIENT'
                  ? contract.partyData?.secondParty?.name || contract.snapshot?.partyData?.secondParty?.name || project?.clientName || 'Client'
                  : contract.partyData?.contractorName || contract.partyData?.name || contract.snapshot?.party?.name || 'Kontraktor';
                return <article key={contract.id} className="spk-record">
                  <div><span className="spk-record-type">SPK {contract.type === 'CLIENT' ? 'Client' : 'Subcon'}</span><strong>{contract.spkNumber || 'DRAFT / belum bernomor'}</strong></div>
                  <div><strong>{partyName}</strong><span>{money(contract.contractValue)} · {contract.snapshot?.workScope?.length || 0} item ruang lingkup</span></div>
                  <span className={`spk-status status-${String(contract.status).toLowerCase()}`}>{contract.status}</span>
                  <div className="spk-record-actions">
                    {contract.type === 'CLIENT' && <button type="button" className="spk-btn" onClick={() => viewPdf(contract)}><Eye size={14} /> {contract.status === 'DRAFT' ? 'Preview PDF' : 'Lihat PDF'}</button>}
                    {contract.type === 'CLIENT' && <button type="button" className="spk-btn" onClick={() => downloadPdf(contract)}><Download size={14} /> Unduh PDF</button>}
                    {contract.status === 'DRAFT' && <button type="button" className="spk-btn" onClick={() => startEdit(contract)}><FileText size={14} /> Edit</button>}
                    {contract.status === 'DRAFT' && <button type="button" className="spk-btn primary" onClick={() => issue(contract.id)}><Send size={14} /> Terbitkan</button>}
                    {contract.status === 'TERBIT' && <button type="button" className="spk-btn" onClick={() => sign(contract.id)}><ShieldCheck size={14} /> Tandai ditandatangani</button>}
                    {(contract.status === 'DRAFT' || contract.status === 'TERBIT' || contract.status === 'DITANDATANGANI') && <button type="button" className="spk-btn danger" onClick={() => cancel(contract)}><XCircle size={14} /> Batalkan</button>}
                  </div>
                </article>;
              })}
              {!visibleContracts.length && <div className="spk-inline-empty records">Belum ada draft atau SPK terbit di project ini.</div>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
