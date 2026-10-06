import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, Plus, RefreshCw, Save, Send, ShieldCheck, Trash2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import ProjectSelector from '../components/ProjectSelector';
import { useProjects } from '../hooks/useProjects';
import { spkService } from '../services/spkService';

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

const colors = {
  page: '#0c0b09',
  card: '#161513',
  border: '#363024',
  muted: '#999384',
  gold: '#d4af37',
  green: '#65c18c',
  red: '#ef7777',
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#0c0b09',
  border: `1px solid ${colors.border}`,
  color: '#f3f0e8',
  borderRadius: 6,
  padding: '9px 10px',
  fontSize: 13,
};

const buttonStyle = (variant = 'secondary') => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  border: `1px solid ${variant === 'primary' ? colors.gold : colors.border}`,
  background: variant === 'primary' ? colors.gold : '#211e18',
  color: variant === 'primary' ? '#0c0b09' : '#eee9dc',
  borderRadius: 7,
  padding: '9px 13px',
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
});

const statusColor = {
  DRAFT: colors.gold,
  TERBIT: '#72a9ff',
  DITANDATANGANI: colors.green,
  SELESAI: colors.green,
  DIBATALKAN: colors.red,
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

export default function SpkPage({ initialProjectId = null }) {
  const { projects, loading: projectsLoading } = useProjects();
  const [projectId, setProjectId] = useState(initialProjectId || '');
  const [source, setSource] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [type, setType] = useState('CLIENT');
  const [retentionPercent, setRetentionPercent] = useState(0);
  const [terms, setTerms] = useState([newTerm(0)]);
  const [partyData, setPartyData] = useState({ partyName: '', signerName: '', signerPosition: '' });
  const [workDurationDays, setWorkDurationDays] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const selectedValue = useMemo(() => (source?.items || [])
    .filter((item) => selectedItemIds.includes(item.id))
    .reduce((sum, item) => sum + itemContractTotal(item), 0), [source, selectedItemIds]);
  const termsPercent = terms.reduce((sum, term) => sum + numberValue(term.percent), 0);
  const totalPercent = termsPercent + numberValue(retentionPercent);
  const retentionAmount = Math.round(selectedValue * numberValue(retentionPercent) / 100);

  const loadProjectData = async (id = projectId) => {
    if (!id) {
      setSource(null);
      setContracts([]);
      setSelectedItemIds([]);
      return;
    }
    setLoading(true);
    try {
      const [nextSource, nextContracts] = await Promise.all([
        spkService.getRabSource(id),
        spkService.getByProjectId(id),
      ]);
      setSource(nextSource);
      setContracts(nextContracts.contracts || []);
      setSelectedItemIds((nextSource.items || []).map((item) => item.id));
    } catch (error) {
      toast.error(error.message || 'Gagal memuat sumber RAB/SPK.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialProjectId) setProjectId(initialProjectId);
  }, [initialProjectId]);

  useEffect(() => {
    if (type === 'CLIENT') {
      setPartyData({ partyName: '', signerName: '', signerPosition: '' });
    }
  }, [type]);

  useEffect(() => {
    if (projectId) loadProjectData(projectId);
  }, [projectId]);

  useEffect(() => {
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
    setType('CLIENT');
    setRetentionPercent(0);
    setTerms([newTerm(0)]);
    setPartyData({ partyName: '', signerName: '', signerPosition: '' });
    setWorkDurationDays('');
    setStartDate('');
    setEndDate('');
    setNotes('');
  };

  const startEdit = (contract) => {
    if (contract.status !== 'DRAFT') return toast.error('Hanya SPK DRAFT yang dapat diubah.');
    setEditingId(contract.id);
    setType(contract.type || 'CLIENT');
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
    setPartyData({
      partyName: contract.partyData?.name || contract.snapshot?.party?.name || '',
      signerName: contract.partyData?.signerName || '',
      signerPosition: contract.partyData?.signerPosition || '',
    });
    setWorkDurationDays(contract.workDurationDays ? String(contract.workDurationDays) : '');
    setStartDate(dateInput(contract.startDate));
    setEndDate(dateInput(contract.endDate));
    setNotes(contract.notes || '');
    setSelectedItemIds((contract.snapshot?.workScope || [])
      .map((item) => item.rabItemId)
      .filter((id) => (source?.items || []).some((sourceItem) => sourceItem.id === id)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveDraft = async () => {
    if (!projectId) return toast.error('Pilih project terlebih dahulu.');
    if (!selectedItemIds.length) return toast.error('Pilih minimal satu item RAB.');
    setSaving(true);
    try {
      const payload = {
        type,
        rabItemIds: selectedItemIds,
        contractValue: selectedValue,
        terms: terms.map((term) => ({ ...term, percent: numberValue(term.percent), amount: Math.round(selectedValue * numberValue(term.percent) / 100) })),
        retentionPercent: numberValue(retentionPercent),
        partyName: partyData.partyName,
        partyData: { ...partyData },
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
    <div style={{ minHeight: '100%', background: colors.page, color: '#f3f0e8', padding: '30px 34px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ color: colors.gold, fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>PERENCANAAN / KONTRAK</div>
          <h1 style={{ margin: '7px 0 5px', fontSize: 26 }}>SPK Client &amp; Subcon</h1>
          <p style={{ margin: 0, color: colors.muted, fontSize: 13 }}>Nomor global per tipe dan tahun. Draft tidak mengambil nomor resmi.</p>
        </div>
        <button type="button" style={buttonStyle()} onClick={() => loadProjectData()} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <ProjectSelector projectList={projects} projectId={projectId} loading={projectsLoading} onChange={(event) => setProjectId(event.target.value)} />

      {!projectId ? (
        <div style={{ padding: 40, border: `1px dashed ${colors.border}`, color: colors.muted, textAlign: 'center', borderRadius: 10 }}>Pilih project untuk mulai membuat SPK.</div>
      ) : (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, .8fr)', gap: 18, alignItems: 'start' }}>
            <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 17 }}>Sumber nilai kontrak dari RAB</h2>
                  <p style={{ margin: '5px 0 0', color: colors.muted, fontSize: 12 }}>{source?.project?.name || 'Project'} · centang item yang masuk snapshot SPK</p>
                </div>
                <strong style={{ color: colors.gold }}>{money(selectedValue)}</strong>
              </div>
              <div style={{ maxHeight: 330, overflow: 'auto', border: `1px solid ${colors.border}`, borderRadius: 7 }}>
                {(source?.items || []).map((item) => {
                  const checked = selectedItemIds.includes(item.id);
                  return <label key={item.id} style={{ display: 'grid', gridTemplateColumns: '25px 1fr auto', gap: 10, alignItems: 'center', padding: '10px 12px', borderBottom: `1px solid ${colors.border}`, cursor: 'pointer' }}>
                    <input type="checkbox" checked={checked} onChange={() => setSelectedItemIds((ids) => checked ? ids.filter((id) => id !== item.id) : [...ids, item.id])} />
                    <span style={{ fontSize: 12 }}>{item.name}<small style={{ display: 'block', color: colors.muted }}>{item.volume} {item.paymentUnit || ''}</small></span>
                    <strong style={{ fontSize: 12 }}>{money(itemContractTotal(item))}</strong>
                  </label>;
                })}
                {!source?.items?.length && <div style={{ padding: 18, color: colors.muted, fontSize: 12 }}>Belum ada item RAB pada project ini.</div>}
              </div>
            </div>

            <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 20 }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 17 }}>Identitas SPK</h2>
              <label style={{ display: 'block', color: colors.muted, fontSize: 11, marginBottom: 5 }}>TIPE KONTRAK</label>
              <select style={{ ...inputStyle, marginBottom: 12 }} value={type} onChange={(event) => setType(event.target.value)}>
                <option value="CLIENT">SPK Client</option>
                <option value="SUBCON">SPK Subcon</option>
              </select>
              <label style={{ display: 'block', color: colors.muted, fontSize: 11, marginBottom: 5 }}>NAMA PIHAK / KONTRAKTOR</label>
              <input style={{ ...inputStyle, marginBottom: 12 }} value={partyData.partyName} onChange={(event) => setPartyData({ ...partyData, partyName: event.target.value })} placeholder="Nama pihak / kontraktor" />
              <label style={{ display: 'block', color: colors.muted, fontSize: 11, marginBottom: 5 }}>ALAMAT PROJECT</label>
              <div style={{ ...inputStyle, minHeight: 42, marginBottom: 12, color: colors.muted, display: 'flex', alignItems: 'center' }}>
                {source?.project?.location || 'Otomatis dari alamat project'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ display: 'block', color: colors.muted, fontSize: 11, marginBottom: 5 }}>DURASI (HARI)</label><input type="number" min="1" style={inputStyle} value={workDurationDays} onChange={(event) => setWorkDurationDays(event.target.value)} /></div>
                <div><label style={{ display: 'block', color: colors.muted, fontSize: 11, marginBottom: 5 }}>RETENSI (%)</label><input type="number" min="0" max="100" step="0.01" style={inputStyle} value={retentionPercent} onChange={(event) => updateRetention(event.target.value)} /></div>
              </div>
            </div>
          </section>

          <section style={{ marginTop: 18, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div><h2 style={{ margin: 0, fontSize: 17 }}>Termin pembayaran</h2><p style={{ margin: '5px 0 0', color: colors.muted, fontSize: 12 }}>Draft boleh belum 100%; saat Terbitkan harus termin + retensi tepat 100%.</p></div>
              <div style={{ color: Math.abs(totalPercent - 100) < .01 ? colors.green : colors.gold, fontWeight: 800, fontSize: 13 }}>Total {totalPercent.toFixed(2)}%</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ color: colors.muted, textAlign: 'left' }}><th style={{ padding: 8 }}>Label</th><th style={{ padding: 8, width: 120 }}>Persen</th><th style={{ padding: 8 }}>Nominal</th><th style={{ padding: 8 }}>Jatuh tempo / milestone</th><th style={{ padding: 8, width: 50 }} /></tr></thead>
                <tbody>{terms.map((term, index) => <tr key={`${index}-${term.label}`} style={{ borderTop: `1px solid ${colors.border}` }}>
                  <td style={{ padding: 8 }}><input style={inputStyle} value={term.label} onChange={(event) => updateTerm(index, 'label', event.target.value)} /></td>
                  <td style={{ padding: 8 }}><input type="number" min="0" max="100" step="0.01" style={inputStyle} value={term.percent} onChange={(event) => updateTerm(index, 'percent', event.target.value)} /></td>
                  <td style={{ padding: 8, whiteSpace: 'nowrap', color: '#e6dcb9' }}>{money(term.amount)}</td>
                  <td style={{ padding: 8 }}><input style={inputStyle} value={term.dueDescription} placeholder="Contoh: setelah progres 50%" onChange={(event) => updateTerm(index, 'dueDescription', event.target.value)} /></td>
                  <td style={{ padding: 8 }}><button type="button" style={{ ...buttonStyle(), padding: 8 }} onClick={() => setTerms((current) => current.filter((_, termIndex) => termIndex !== index))} disabled={terms.length === 1}><Trash2 size={14} /></button></td>
                </tr>)}</tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
              <button type="button" style={buttonStyle()} onClick={() => setTerms((current) => [...current, newTerm(current.length)])}><Plus size={15} /> Tambah termin</button>
              <span style={{ color: colors.muted, fontSize: 12 }}>Retensi {money(retentionAmount)} · {selectedValue ? `${((selectedValue - retentionAmount) / selectedValue * 100).toFixed(2)}% dibayar` : 'Rp 0'}</span>
            </div>
          </section>

          <section style={{ marginTop: 18, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={{ display: 'block', color: colors.muted, fontSize: 11, marginBottom: 5 }}>TANGGAL MULAI</label><input type="date" style={inputStyle} value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
              <div><label style={{ display: 'block', color: colors.muted, fontSize: 11, marginBottom: 5 }}>TANGGAL SELESAI</label><input type="date" style={inputStyle} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>
            </div>
            <label style={{ display: 'block', color: colors.muted, fontSize: 11, margin: '12px 0 5px' }}>CATATAN</label>
            <textarea style={{ ...inputStyle, minHeight: 65 }} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Catatan khusus draft SPK" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              {editingId && <button type="button" style={buttonStyle()} onClick={resetDraftForm}>Batalkan Edit</button>}
              <button type="button" style={buttonStyle('primary')} onClick={saveDraft} disabled={saving}><Save size={15} /> {saving ? 'Menyimpan...' : editingId ? 'Perbarui Draft SPK' : 'Simpan Draft SPK'}</button>
            </div>
          </section>

          <section style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><FileText size={18} color={colors.gold} /><h2 style={{ margin: 0, fontSize: 18 }}>SPK pada project ini</h2></div>
            <div style={{ display: 'grid', gap: 10 }}>
              {contracts.map((contract) => <div key={contract.id} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 9, padding: 15, display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
                <div><div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><strong>{contract.spkNumber || 'DRAFT / belum bernomor'}</strong><span style={{ color: statusColor[contract.status] || colors.muted, fontSize: 11, fontWeight: 800 }}>{contract.status}</span><span style={{ color: colors.muted, fontSize: 11 }}>{contract.type}</span></div><div style={{ marginTop: 5, color: colors.muted, fontSize: 12 }}>{money(contract.contractValue)} · {contract.contractValueWords}</div></div>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {contract.status === 'DRAFT' && <button type="button" style={buttonStyle()} onClick={() => startEdit(contract)}><FileText size={14} /> Edit</button>}
                  {contract.status === 'DRAFT' && <button type="button" style={buttonStyle('primary')} onClick={() => issue(contract.id)}><Send size={14} /> Terbitkan</button>}
                  {contract.status === 'TERBIT' && <button type="button" style={buttonStyle()} onClick={() => sign(contract.id)}><ShieldCheck size={14} /> Tandai Ditandatangani</button>}
                  {(contract.status === 'DRAFT' || contract.status === 'TERBIT' || contract.status === 'DITANDATANGANI') && <button type="button" style={{ ...buttonStyle(), color: colors.red }} onClick={() => cancel(contract)}><XCircle size={14} /> Batalkan</button>}
                </div>
              </div>)}
              {!contracts.length && <div style={{ padding: 28, color: colors.muted, border: `1px dashed ${colors.border}`, borderRadius: 9, textAlign: 'center' }}>Belum ada draft atau SPK terbit di project ini.</div>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
