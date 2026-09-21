import React, { useState, useEffect } from 'react';
import ProjectSelector from '../components/ProjectSelector';
import styles from '../styles/BackUpVolume.module.css';
import Header from '../components/Header';
import { useProjects } from '../hooks/useProjects';
import { useBvItems } from '../hooks/useBvItems';
import { groupService } from '../services/groupService';
import { hspkService } from '../services/hspkService';
import { Pencil, Trash2, Plus, RefreshCw, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const DISCIPLINE_BADGE = { INTERIOR: '#a0522d', SIPIL: '#4682b4', GENERAL: '#666' };

// ================================================================
// MODAL GROUP / SUB-GROUP
// ================================================================
function GroupModal({ isOpen, onClose, projectId, parentId, editGroup, onSuccess }) {
  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setName(editGroup?.name || '');
      setReference(editGroup?.reference || '');
      setError(null);
    }
  }, [isOpen, editGroup]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    try {
      if (editGroup) {
        await groupService.update(editGroup.id, { name: name.trim(), reference: reference.trim() || null });
      } else {
        await groupService.create(projectId, { name: name.trim(), parentId: parentId || null, reference: reference.trim() || null });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan Group');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox} style={{ maxWidth: 440 }}>
        <div className={styles.modalHeader}>
          <h3>{editGroup ? 'Edit Group' : 'Tambah Group Pekerjaan'}</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        {error && <div style={{ color: '#ff6b6b', background: '#3a1c1c', padding: 8, borderRadius: 3, marginBottom: 10, fontSize: 11 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Nama Group</label>
            <input
              type="text"
              placeholder="mis. Pekerjaan Persiapan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className={styles.btnOutline} onClick={onClose} disabled={saving}>Batal</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ================================================================
// MODAL TAMBAH / EDIT ITEM BV
// ================================================================
function BvItemModal({ isOpen, onClose, projectId, groupId, parentBvItemId, parentItem, editItem, project, activeFilter, onSuccess }) {
  const hspkPeriod = project?.hspkPeriod;
  const [mode, setMode] = useState('hspk');
  const [sourceJobTypeId, setSourceJobTypeId] = useState('');
  const [name, setName] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [paymentUnit, setPaymentUnit] = useState('');
  const [ecommerceLink, setEcommerceLink] = useState('');
  // Label disiplin hanya dipilih saat menambah/edit BARIS HEADER (level 1).
  // Sub baris / anak otomatis mengikuti label induknya tanpa input pilihan.
  const isHeaderLevel = !parentBvItemId;
  const inheritedLabel = parentItem?.disciplineLabel || (activeFilter !== 'GENERAL' ? activeFilter : 'GENERAL');
  const [disciplineLabel, setDisciplineLabel] = useState(() => {
    if (editItem) return editItem.disciplineLabel || inheritedLabel || 'GENERAL';
    return inheritedLabel || 'GENERAL';
  });

  const [jobTypes, setJobTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // only reset discipline when the modal opens/closes, not on every discipline/grade change
  useEffect(() => {
    if (isOpen) {
      const nextLabel = editItem?.disciplineLabel || parentItem?.disciplineLabel || (activeFilter !== 'GENERAL' ? activeFilter : 'GENERAL');
      setDisciplineLabel(nextLabel);
    }
  }, [isOpen, activeFilter, editItem?.disciplineLabel, parentItem?.disciplineLabel]);

  const [breakdowns, setBreakdowns] = useState([
    {
      keterangan: '',
      panjang: '', isPChecked: true,
      lebar: '', isLChecked: true,
      tinggi: '', isTChecked: false,
      luas: '', isLuasChecked: false,
      keliling: '', isKelChecked: false,
      diameter: '',
      berat: '', isBeratChecked: false,
      jumlahSisi: 1, jumlahBh: 1, waste: 0,
    }
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const params = { limit: 100 };
      if (hspkPeriod) params.period = hspkPeriod;
      // Saat memilih HSPK, default ke label terpilih agar item master juga
      // tetap terfilter disiplin bila user memilih label INTERIOR/SIPIL.
      if (disciplineLabel && disciplineLabel !== 'GENERAL') {
        params.discipline = disciplineLabel;
        const matchedGrade =
          disciplineLabel === 'INTERIOR'
            ? project?.interiorGrade
            : disciplineLabel === 'SIPIL'
            ? project?.sipilGrade
            : null;
        if (matchedGrade) params.grade = matchedGrade;
      }

      hspkService.getJobTypes(params)
        .then(res => setJobTypes(Array.isArray(res) ? res : res?.data || []))
        .catch((err) => console.error("Gagal load jobTypes:", err));

      if (editItem) {
        if (editItem.isHeaderOnly) {
          setMode('header');
        } else if (editItem.sourceJobTypeId) {
          setMode('hspk');
        } else {
          setMode('custom');
        }
        setSourceJobTypeId(editItem.sourceJobTypeId || '');
        setName(editItem.name || '');
        setKeterangan(editItem.keterangan || '');
        setPaymentUnit(editItem.paymentUnit || '');
        setEcommerceLink(editItem.ecommerceLink || '');
        setDisciplineLabel(editItem.disciplineLabel || 'SIPIL');
        if (editItem.breakdowns?.length > 0) {
          setBreakdowns(editItem.breakdowns.map(b => ({
            keterangan: b.keterangan || '',
            panjang: renderBvNumber(b.panjang), isPChecked: !!b.isPChecked,
            lebar: renderBvNumber(b.lebar), isLChecked: !!b.isLChecked,
            tinggi: renderBvNumber(b.tinggi), isTChecked: !!b.isTChecked,
            luas: renderBvNumber(b.luas), isLuasChecked: !!b.isLuasChecked,
            keliling: renderBvNumber(b.keliling), isKelChecked: !!b.isKelChecked,
            berat: renderBvNumber(b.berat), isBeratChecked: !!b.isBeratChecked,
            diameter: renderBvNumber(b.diameter),
            jumlahSisi: renderBvNumber(b.jumlahSisi) || 1,
            jumlahBh: renderBvNumber(b.jumlahBh) || 1,
            waste: renderBvNumber(b.waste) || 0,
          })));
        }
      } else {
        setMode(parentBvItemId ? 'custom' : 'hspk');
        setSourceJobTypeId('');
        setName('');
        setKeterangan('');
        setPaymentUnit('');
        setEcommerceLink('');
        setBreakdowns([{
          keterangan: '',
          panjang: '', isPChecked: true,
          lebar: '', isLChecked: true,
          tinggi: '', isTChecked: false,
          luas: '', isLuasChecked: false,
          keliling: '', isKelChecked: false,
          diameter: '',
          berat: '', isBeratChecked: false,
          jumlahSisi: 1, jumlahBh: 1, waste: 0,
        }]);
      }
      setError(null);
    }
  }, [
    isOpen,
    editItem,
    parentBvItemId,
    hspkPeriod,
    disciplineLabel,
    project?.interiorGrade,
    project?.sipilGrade,
  ]);

  const filteredJobTypes = jobTypes.filter(j =>
    !searchQuery || j.name?.toLowerCase().includes(searchQuery.toLowerCase()) || (j.code && j.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleJobTypeSelect = (e) => {
    const jtId = e.target.value;
    setSourceJobTypeId(jtId);
    if (jtId) {
      const jt = jobTypes.find(j => j.id === jtId);
      if (jt) {
        setName(jt.name);
        setPaymentUnit(jt.paymentUnit);
        // Jika BV label GENERAL, ambil disiplin dari master AHSP yang dipilih
        if (disciplineLabel === 'GENERAL' && jt.discipline) {
          // disimpan di state lokal untuk dikirim ke backend sebagai ahspDiscipline
          setDisciplineLabel(jt.discipline);
        }
      }
    }
  };

  const handleAddBreakdown = () => {
    setBreakdowns(prev => [...prev, {
      keterangan: '',
      panjang: '', isPChecked: true,
      lebar: '', isLChecked: true,
      tinggi: '', isTChecked: false,
      luas: '', isLuasChecked: false,
      keliling: '', isKelChecked: false,
      diameter: '',
      berat: '', isBeratChecked: false,
      jumlahSisi: 1, jumlahBh: 1, waste: 0,
    }]);
  };

  const normalizeBvInput = (value, field, fallback = null) => {
    const raw = String(value ?? '').trim();
    if (raw === '' || raw === '-') return fallback;
    const number = Number(raw.replace(',', '.'));
    if (!Number.isFinite(number)) throw new Error(`${field} harus berupa angka.`);
    if (number < 0) throw new Error(`${field} tidak boleh negatif.`);
    return number;
  };

  const getBreakdownPayload = (b) => ({
    keterangan: b.keterangan || null,
    diameter: normalizeBvInput(b.diameter, 'Diameter'),
    panjang: normalizeBvInput(b.panjang, 'Panjang'),
    isPChecked: b.isPChecked,
    lebar: normalizeBvInput(b.lebar, 'Lebar'),
    isLChecked: b.isLChecked,
    tinggi: normalizeBvInput(b.tinggi, 'Tinggi'),
    isTChecked: b.isTChecked,
    luas: normalizeBvInput(b.luas, 'Luas'),
    isLuasChecked: b.isLuasChecked,
    keliling: normalizeBvInput(b.keliling, 'Keliling'),
    isKelChecked: b.isKelChecked,
    berat: normalizeBvInput(b.berat, 'Berat'),
    isBeratChecked: b.isBeratChecked,
    jumlahSisi: normalizeBvInput(b.jumlahSisi, 'Jumlah sisi', 1),
    jumlahBh: normalizeBvInput(b.jumlahBh, 'Jumlah buah', 1),
    waste: normalizeBvInput(b.waste, 'Waste', 0),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const isHeaderOnly = mode === 'header';
      const payload = {
        groupId: groupId || null,
        parentBvItemId: parentBvItemId || null,
        isHeaderOnly,
        sourceJobTypeId: mode === 'hspk' ? (sourceJobTypeId || null) : null,
        name: name.trim(),
        keterangan: keterangan.trim() || null,
        paymentUnit: isHeaderOnly ? null : paymentUnit.trim(),
        ecommerceLink: isHeaderOnly ? null : (ecommerceLink.trim() || null),
        disciplineLabel: isHeaderLevel ? disciplineLabel || 'GENERAL' : undefined,
        ahspDiscipline: (disciplineLabel === 'GENERAL' && mode === 'hspk') ? (sourceJobTypeId ? undefined : null) : undefined,
        breakdowns: isHeaderOnly ? [] : breakdowns.map(getBreakdownPayload),
      };

      const { bvService } = await import('../services/bvService');
      if (editItem) {
        await bvService.update(editItem.id, payload);
      } else {
        await bvService.create(projectId, payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan item BV');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox}>
        <div className={styles.modalHeader}>
          <h3>{editItem ? 'Edit Baris Pekerjaan (BV)' : parentBvItemId ? 'Tambah Sub Uraian Pekerjaan' : 'Tambah Baris Pekerjaan (BV)'}</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {error && <div style={{ color: '#ff6b6b', background: '#3a1c1c', padding: 8, borderRadius: 3, marginBottom: 10, fontSize: 11 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="hspk">Dari Master HSPK/AHSP</option>
              <option value="custom">Custom (input manual)</option>
              {!parentBvItemId && <option value="header">Header / Judul Pekerjaan</option>}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Label Disiplin {isHeaderLevel ? '' : <span style={{ color: '#888', fontSize: 11 }}>(otomatis mengikuti induk)</span>}</label>
              <select value={disciplineLabel} onChange={(e) => setDisciplineLabel(e.target.value)} disabled={!isHeaderLevel}>
                <option value="GENERAL">General</option>
                <option value="INTERIOR">Interior</option>
                <option value="SIPIL">Sipil</option>
              </select>
            {isHeaderLevel && (
              <small style={{ color: '#888', fontSize: 10 }}>
                Menentukan master HSPK mana yang tersedia dan saat filter halaman BV.
              </small>
            )}
          </div>

          {mode === 'hspk' && (
            <div className={styles.formGroup}>
              <label>Cari Jenis Pekerjaan</label>
              <input
                type="text"
                placeholder="ketik nama pekerjaan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ marginBottom: 6 }}
              />
              <select
                value={sourceJobTypeId}
                onChange={handleJobTypeSelect}
                size={4}
                style={{ fontSize: 11 }}
              >
                {filteredJobTypes.slice(0, 30).map(j => (
                  <option key={j.id} value={j.id}>
                    [{j.code || 'AHSP'}] {j.name} ({j.paymentUnit})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Uraian Pekerjaan / Judul</label>
            <input
              type="text"
              placeholder="mis. Pasangan Dinding Bata Merah"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {mode !== 'header' && (
            <div className={styles.formGroup}>
              <label>Satuan</label>
              <input
                type="text"
                placeholder="m2 / m1 / m3 / buah"
                value={paymentUnit}
                onChange={(e) => setPaymentUnit(e.target.value)}
                required={mode !== 'header'}
              />
            </div>
          )}

          {mode !== 'header' && (
            <>
              <div className={styles.formGroup}>
                <label>Link E-Commerce (opsional)</label>
                <input
                  type="text"
                  placeholder="nama produk / link"
                  value={ecommerceLink}
                  onChange={(e) => setEcommerceLink(e.target.value)}
                />
              </div>

              <fieldset style={{ border: '1px solid #333', padding: 10, borderRadius: 3, marginTop: 10 }}>
                <legend style={{ fontSize: 11, color: '#aaa', padding: '0 4px' }}>Breakdown Dimensi (kelompokkan per Keterangan)</legend>

                {breakdowns.map((b, i) => (
                  <div key={i} style={{ border: '1px solid #222', background: '#111', padding: 8, borderRadius: 3, marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      <input
                        type="text"
                        placeholder="Keterangan (mis. Main Lobby Area A)"
                        value={b.keterangan}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBreakdowns(prev => prev.map((item, idx) => idx === i ? { ...item, keterangan: val } : item));
                        }}
                        style={{ flex: 1, fontSize: 11, padding: 4, background: '#222', border: '1px solid #333', color: '#fff' }}
                      />
                      {breakdowns.length > 1 && (
                        <button type="button" className={styles.btnSmall} onClick={() => setBreakdowns(prev => prev.filter((_, idx) => idx !== i))}>✕</button>
                      )}
                    </div>

                    <div className={styles.dimHeaderLabel}>Panjang | Lebar | Tinggi | Luas | Keliling | Diameter | Berat</div>
                    <div className={styles.dimGridRow}>
                      {[
                        { key: 'panjang', checkKey: 'isPChecked', label: 'P' },
                        { key: 'lebar', checkKey: 'isLChecked', label: 'L' },
                        { key: 'tinggi', checkKey: 'isTChecked', label: 'T' },
                        { key: 'luas', checkKey: 'isLuasChecked', label: 'Luas' },
                        { key: 'keliling', checkKey: 'isKelChecked', label: 'Kel' },
                        { key: 'diameter', label: 'Dia' },
                        { key: 'berat', checkKey: 'isBeratChecked', label: 'Berat' },
                      ].map(f => (
                        <div key={f.key} className={styles.dimCheckGroup}>
                          {f.checkKey ? (
                            <input
                              type="checkbox"
                              checked={b[f.checkKey]}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setBreakdowns(prev => prev.map((item, idx) => idx === i ? { ...item, [f.checkKey]: checked } : item));
                              }}
                            />
                          ) : <span aria-hidden="true" style={{ width: 13 }} />}
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder={f.label}
                            value={b[f.key]}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBreakdowns(prev => prev.map((item, idx) => idx === i ? { ...item, [f.key]: val } : item));
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11 }}>
                        <span>Sisi:</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={b.jumlahSisi}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBreakdowns(prev => prev.map((item, idx) => idx === i ? { ...item, jumlahSisi: val } : item));
                          }}
                          style={{ width: '100%', fontSize: 11, padding: 3, background: '#222', border: '1px solid #333', color: '#fff' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11 }}>
                        <span>Bh:</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={b.jumlahBh}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBreakdowns(prev => prev.map((item, idx) => idx === i ? { ...item, jumlahBh: val } : item));
                          }}
                          style={{ width: '100%', fontSize: 11, padding: 3, background: '#222', border: '1px solid #333', color: '#fff' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11 }}>
                        <span>Waste%:</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={b.waste}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBreakdowns(prev => prev.map((item, idx) => idx === i ? { ...item, waste: val } : item));
                          }}
                          style={{ width: '100%', fontSize: 11, padding: 3, background: '#222', border: '1px solid #333', color: '#fff' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button type="button" className={styles.btnSmall} onClick={handleAddBreakdown}>+ Tambah Keterangan</button>
              </fieldset>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <button type="button" className={styles.btnOutline} onClick={onClose} disabled={saving}>Batal</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ================================================================
// KOMPONEN UTAMA BACKUP VOLUME
// ================================================================
const FILTER_OPTIONS = ['GENERAL', 'INTERIOR', 'SIPIL'];

function parseBvHash() {
  const raw = window.location.hash.replace('#', '');
  if (!raw.startsWith('bv')) return { tab: 'bv', filter: 'GENERAL' };
  const parts = raw.split('/');
  const filter = parts[1]?.toUpperCase();
  return { tab: 'bv', filter: FILTER_OPTIONS.includes(filter) ? filter : 'GENERAL' };
}

function filterBvByDiscipline(items, label) {
  if (label === 'GENERAL') return items;
  return items.reduce((acc, it) => {
    const matchingChildren = it.children?.length
      ? filterBvByDiscipline(it.children, label)
      : [];
    const itemLabel = it.disciplineLabel || 'GENERAL';
    const match = itemLabel === 'GENERAL' || itemLabel === label;
    if (match || matchingChildren.length > 0) {
      acc.push({ ...it, children: matchingChildren });
    }
    return acc;
  }, []);
}

export default function BackUpVolume({ initialProjectId = null, onProjectChange, onGoToRab }) {
  const { projects, loading: loadingProjects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || '');
  const [activeFilter, setActiveFilter] = useState(() => parseBvHash().filter);
  const [groupPage, setGroupPage] = useState(1);
  const GROUPS_PER_PAGE = 10;

  // Sinkronkan filter dengan hash URL
  useEffect(() => {
    const onHash = () => {
      const { filter } = parseBvHash();
      setActiveFilter(filter);
      setGroupPage(1);
    };
    window.addEventListener('hashchange', onHash);
    onHash();
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Saat tab BV aktif tapi hash belum ada, default ke #bv/GENERAL
  useEffect(() => {
    const raw = window.location.hash.replace('#', '');
    if (!raw.startsWith('bv')) {
      window.location.hash = 'bv/GENERAL';
    }
  }, []);

  React.useEffect(() => {
    if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  React.useEffect(() => {
    setGroupPage(1);
  }, [activeFilter, selectedProjectId]);

  const { bvItems, loading: loadingBv, refresh, deleteBvItem, deleteBulk, linkToRab, linkToRabBulk, syncBvItem, syncBulk } = useBvItems(selectedProjectId);

  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [checkedIds, setCheckedIds] = useState([]);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupModalParentId, setGroupModalParentId] = useState(null);
  const [editGroup, setEditGroup] = useState(null);

  const [isBvModalOpen, setIsBvModalOpen] = useState(false);
  const [bvModalGroupId, setBvModalGroupId] = useState(null);
  const [bvModalParentId, setBvModalParentId] = useState(null);
  const [bvModalParentItem, setBvModalParentItem] = useState(null);
  const [editBvItem, setEditBvItem] = useState(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const fetchGroups = async () => {
    if (!selectedProjectId) {
      setGroups([]);
      return;
    }
    setLoadingGroups(true);
    try {
      const res = await groupService.getByProjectId(selectedProjectId);
      setGroups(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [selectedProjectId]);

  const handleOpenAddGroup = (parentId = null) => {
    setEditGroup(null);
    setGroupModalParentId(parentId);
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroup = (group) => {
    setEditGroup(group);
    setGroupModalParentId(null);
    setIsGroupModalOpen(true);
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      const preview = await groupService.deletePreview(groupId);
      const msg = `Group ini beserta ${preview.subGroupCount} sub-group, ${preview.bvCount} item BV, dan ${preview.rabCount} item RAB di dalamnya akan terhapus. Lanjutkan?`;
      if (!window.confirm(msg)) return;
      
      toast.promise(groupService.delete(groupId), {
        loading: 'Menghapus group...',
        success: 'Berhasil menghapus group!',
        error: 'Gagal menghapus group.'
      }).then(() => {
        fetchGroups();
        refresh();
      }).catch(err => {
        console.error(err);
      });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleOpenAddBv = (groupId = null, parentBvItemId = null) => {
    setEditBvItem(null);
    setBvModalGroupId(groupId);
    setBvModalParentId(parentBvItemId);
    const parent = parentBvItemId ? bvItems.find(i => i.id === parentBvItemId) || null : null;
    setBvModalParentItem(parent);
    setIsBvModalOpen(true);
  };

  const handleOpenEditBv = (item) => {
    setEditBvItem(item);
    setBvModalGroupId(item.groupId);
    setBvModalParentId(item.parentBvItemId);
    const parent = item.parentBvItemId ? bvItems.find(i => i.id === item.parentBvItemId) || null : null;
    setBvModalParentItem(parent);
    setIsBvModalOpen(true);
  };

  const handleToggleCheck = (id) => {
    setCheckedIds(prev => {
      const isChecked = prev.includes(id);
      let newChecked = isChecked ? prev.filter(i => i !== id) : [...prev, id];
      
      const item = bvItems.find(i => i.id === id);
      if (item && (!item.parentBvItemId || item.isHeaderOnly)) {
        const children = bvItems.filter(i => i.parentBvItemId === id).map(i => i.id);
        if (isChecked) {
          newChecked = newChecked.filter(i => !children.includes(i));
        } else {
          newChecked = [...new Set([...newChecked, ...children])];
        }
      }
      return newChecked;
    });
  };

  const getAllIdsFromTable = (items) => {
    let ids = [];
    items.forEach(it => {
      ids.push(it.id);
      if (it.children && it.children.length > 0) {
        ids = ids.concat(getAllIdsFromTable(it.children));
      }
    });
    return ids;
  };

  const handleToggleCheckAll = (itemsInTable) => {
    const tableItemIds = getAllIdsFromTable(itemsInTable);
    const isAllChecked = tableItemIds.length > 0 && tableItemIds.every(id => checkedIds.includes(id));
    
    if (isAllChecked) {
      setCheckedIds(prev => prev.filter(id => !tableItemIds.includes(id)));
    } else {
      setCheckedIds(prev => [...new Set([...prev, ...tableItemIds])]);
    }
  };

  const handleBulkDelete = async () => {
    if (checkedIds.length === 0) return;
    if (!window.confirm(`Yakin ingin menghapus ${checkedIds.length} item secara permanen?`)) return;
    
    toast.promise(deleteBulk(checkedIds), {
      loading: 'Menghapus item terpilih...',
      success: 'Berhasil menghapus item terpilih!',
      error: 'Gagal menghapus item.'
    }).then(() => {
      setCheckedIds([]);
      fetchGroups();
    }).catch((err) => {
      console.error(err);
    });
  };

  const handleBulkLink = async () => {
    if (checkedIds.length === 0) return;
    if (!window.confirm(`Link ${checkedIds.length} item terpilih ke RAB?`)) return;
    
    toast.promise(linkToRabBulk(checkedIds), {
      loading: 'Menautkan item ke RAB...',
      success: 'Berhasil menautkan item ke RAB!',
      error: 'Gagal menautkan item.'
    }).then(() => {
      setCheckedIds([]);
      refresh();
    }).catch(err => {
      console.error(err);
    });
  };

  const handleBulkSync = async () => {
    if (checkedIds.length === 0) return;
    if (!window.confirm(`Sync ${checkedIds.length} item terpilih ke RAB?`)) return;
    
    toast.promise(syncBulk(checkedIds), {
      loading: 'Mensinkronkan item ke RAB...',
      success: 'Berhasil mensinkronkan item ke RAB!',
      error: 'Gagal mensinkronkan item.'
    }).then(() => {
      setCheckedIds([]);
      refresh();
    }).catch(err => {
      console.error(err);
    });
  };

  useEffect(() => {
    if (loadingBv || loadingGroups) {
      toast.loading('Memuat data Back Up Volume...', { id: 'loading-bv' });
    } else {
      toast.dismiss('loading-bv');
    }
  }, [loadingBv, loadingGroups]);

  // SESUAI REQUEST: Disesuaikan dengan struktur tableHeader yang diberikan
  const renderTableHeader = (itemsInTable = []) => {
    const tableItemIds = getAllIdsFromTable(itemsInTable);
    const isAllChecked = tableItemIds.length > 0 && tableItemIds.every(id => checkedIds.includes(id));

    return (
    <thead>
      <tr>
        <th rowSpan={2} style={{ width: 40, textAlign: 'center', verticalAlign: 'middle' }}>
          <input
            type="checkbox"
            onChange={() => handleToggleCheckAll(itemsInTable)}
            checked={isAllChecked}
            title="Pilih/batal semua"
          />
        </th>
        <th rowSpan={2}>NO</th>
        <th rowSpan={2}>URAIAN PEKERJAAN</th>
        <th colSpan={2} rowSpan={1}>VOLUME</th>
        <th rowSpan={2}>KETERANGAN</th>
        <th rowSpan={2}>Panjang<br />(m)</th>
        <th rowSpan={2}>Lebar<br />(m)</th>
        <th rowSpan={2}>Tinggi<br />(m)</th>
        <th rowSpan={2}>Luas<br />(m2)</th>
        <th rowSpan={2}>Keliling<br />(m1)</th>
        <th rowSpan={2}>Dia<br />(m2)</th>
        <th rowSpan={2}>Berat<br />(Kg)</th>
        <th rowSpan={2}>Sisi</th>
        <th rowSpan={2}>Bh</th>
        <th rowSpan={2}>Waste<br />(%)</th>
        <th colSpan={2} rowSpan={1}>TOTAL</th>
        <th rowSpan={2}>LINK<br />E-COMMERCE</th>
        <th rowSpan={2}>Status</th>
        <th rowSpan={2}>AKSI</th>
      </tr>
      <tr>
        <th>Sat.</th>
        <th>Vol.</th>
        <th>Vol.</th>
        <th>Sat.</th>
      </tr>
    </thead>
  )};

  const renderItemRows = (items, counterObj) => {
    return items.map((it) => {
      const no = it.isHeaderOnly ? counterObj.n++ : it.parentBvItemId ? "" : counterObj.n++;
      const isChild = !!it.parentBvItemId;
      const isChecked = checkedIds.includes(it.id);
      const hasSingleBreakdown = it.breakdowns && it.breakdowns.length === 1;
      const b0 = hasSingleBreakdown ? it.breakdowns[0] : null;

      let ketText = it.sourceJobType
        ? "HSPK: " + (it.sourceJobType.reference || "")
        : it.isHeaderOnly ? "" : (it.keterangan || "");

      if (hasSingleBreakdown && b0?.keterangan) {
        ketText = b0.keterangan;
      }

      return (
        <React.Fragment key={it.id}>
          <tr className={it.isHeaderOnly ? styles.headerRow : ''}>
            <td>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggleCheck(it.id)}
              />
            </td>
            <td>{no}</td>
            <td className="left" style={{ paddingLeft: isChild ? 18 : 6 }}>
              {isChild ? '-- ' : ''}{it.name}
              {it.disciplineLabel && it.disciplineLabel !== 'GENERAL' && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 9,
                    textTransform: 'uppercase',
                    padding: '1px 5px',
                    borderRadius: 3,
                    background: DISCIPLINE_BADGE[it.disciplineLabel] || '#666',
                    color: '#fff',
                    verticalAlign: 'middle',
                  }}
                >
                  {it.disciplineLabel}
                </span>
              )}
            </td>
            <td>{it.paymentUnit || ''}</td>
            <td className="num">{it.isHeaderOnly ? '' : renderBvVolume(it.totalVolume)}</td>
            <td className="left">{ketText}</td>

            {hasSingleBreakdown ? (
              <>
                <td className="num">{b0.isPChecked ? '☑ ' : ''}{renderBvNumber(b0.panjang)}</td>
                <td className="num">{b0.isLChecked ? '☑ ' : ''}{renderBvNumber(b0.lebar)}</td>
                <td className="num">{b0.isTChecked ? '☑ ' : ''}{renderBvNumber(b0.tinggi)}</td>
                <td className="num">{b0.isLuasChecked ? '☑ ' : ''}{renderBvNumber(b0.luas)}</td>
                <td className="num">{b0.isKelChecked ? '☑ ' : ''}{renderBvNumber(b0.keliling)}</td>
                <td className="num">{renderBvNumber(b0.diameter)}</td>
                <td className="num">{b0.isBeratChecked ? '☑ ' : ''}{renderBvNumber(b0.berat)}</td>
                <td className="num">{renderBvNumber(b0.jumlahSisi)}</td>
                <td className="num">{renderBvNumber(b0.jumlahBh)}</td>
                <td className="num">{renderBvNumber(b0.waste ?? 0)}</td>
              </>
            ) : (
              <td colSpan={10}></td>
            )}

            <td className="num">{it.isHeaderOnly ? '' : renderBvVolume(it.totalVolume)}</td>
            <td>{it.paymentUnit || ''}</td>
            <td>{renderCleanLink(it.ecommerceLink)}</td>
            {/* KOLOM STATUS */}
            <td>
              {it.isHeaderOnly ? '' : (
                <span className={
                  it.linkStatus === 'SUDAH_DILINK' ? styles.badgeSinkron : 
                  it.linkStatus === 'BELUM_SINKRON' ? styles.badgeWarning : /* Tambahkan style.badgeWarning di CSS Anda (misal warna kuning/oranye) */
                  styles.badgeBelum
                }>
                  {
                    it.linkStatus === 'SUDAH_DILINK' ? 'Sudah di-link' : 
                    it.linkStatus === 'BELUM_SINKRON' ? 'Perlu Sync' : 
                    'Belum di-link'
                  }
                </span>
              )}
            </td>

            {/* KOLOM AKSI */}
            <td>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                <button type="button" className={styles.btnSmall} onClick={() => handleOpenEditBv(it)} title="Edit">
                  <Pencil size={14} />
                </button>
                
                {/* TAMPILKAN TOMBOL LINK JIKA BELUM PERNAH DILINK */}
                {(!it.linkStatus || it.linkStatus === 'BELUM_DILINK') && (
                  <button type="button" className={styles.btnGreen} onClick={() => linkToRab(it.id, { includeChildren: true })}>
                    Link
                  </button>
                )}

                {/* 👇 TAMPILKAN TOMBOL SYNC JIKA STATUSNYA BELUM_SINKRON 👇 */}
                {it.linkStatus === 'BELUM_SINKRON' && (
                  <button 
                    type="button" 
                    className={styles.btnOutline} 
                    style={{ borderColor: '#e2c044', color: '#e2c044', fontSize: '11px', padding: '4px 8px' }} 
                    onClick={() => {
                      toast.promise(syncBvItem(it.id), {
                        loading: 'Sinkronisasi ke RAB...',
                        success: 'Berhasil disinkronkan ke RAB!',
                        error: 'Gagal sinkronisasi.'
                      }).catch(err => console.error(err));
                    }} 
                    title="Dimensi/Volume berubah, sinkronkan ke RAB"
                  >
                    Sync Ulang
                  </button>
                )}

                {!it.parentBvItemId && (
                  <button type="button" className={styles.btnSmall} onClick={() => handleOpenAddBv(it.groupId, it.id)} title="Tambah Sub">
                    <Plus size={14} /> Sub
                  </button>
                )}
                <button type="button" className={styles.btnDanger} onClick={() => deleteBvItem(it.id)} title="Hapus">
                  <Trash2 size={14} />
                </button>
              </div>
            </td>
          </tr>

          {!hasSingleBreakdown && it.breakdowns && it.breakdowns.length > 0 && (
            it.breakdowns.map((b, bi) => (
              <tr key={bi} className={styles.subrow}>
                <td></td>
                <td></td>
                <td className="left"></td>
                <td colSpan={2}></td>
                <td className="left">{b.keterangan || ''}</td>
                <td className="num">{b.isPChecked ? '☑ ' : ''}{renderBvNumber(b.panjang)}</td>
                <td className="num">{b.isLChecked ? '☑ ' : ''}{renderBvNumber(b.lebar)}</td>
                <td className="num">{b.isTChecked ? '☑ ' : ''}{renderBvNumber(b.tinggi)}</td>
                <td className="num">{b.isLuasChecked ? '☑ ' : ''}{renderBvNumber(b.luas)}</td>
                <td className="num">{b.isKelChecked ? '☑ ' : ''}{renderBvNumber(b.keliling)}</td>
                <td className="num">{renderBvNumber(b.diameter)}</td>
                <td className="num">{b.isBeratChecked ? '☑ ' : ''}{renderBvNumber(b.berat)}</td>
                <td className="num">{renderBvNumber(b.jumlahSisi)}</td>
                <td className="num">{renderBvNumber(b.jumlahBh)}</td>
                <td className="num">{renderBvNumber(b.waste ?? 0)}</td>
                <td className="num">{renderBvVolume(b.subTotal)}</td>
                <td colSpan={4}></td>
              </tr>
            ))
          )}

          {it.children && renderItemRows(it.children, counterObj)}
        </React.Fragment>
      );
    });
  };

  const filteredBvItems = filterBvByDiscipline(bvItems, activeFilter);

  const bvByGroup = {};
  filteredBvItems.forEach(it => {
    const gid = it.groupId || 'none';
    if (!bvByGroup[gid]) bvByGroup[gid] = [];
    bvByGroup[gid].push(it);
  });

  // Export seluruh BV ke Excel via backend endpoint
  const exportBvToExcel = async () => {
    if (!selectedProjectId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/projects/${selectedProjectId}/bv-items/export-excel`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Export gagal');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const projectName = (selectedProject?.name || 'proyek').replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `BV_${projectName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export Excel berhasil');
    } catch (err) {
      console.error(err);
      toast.error('Gagal export Excel');
    }
  };
  const sortedGroups = [...groups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const visibleGroups = sortedGroups.filter(g => {
    if (activeFilter === 'GENERAL') return true;
    // Saat filter selain GENERAL, group hanya tampil jika punya item BV dengan label cocok
    return bvByGroup[g.id]?.length > 0;
  });
  const totalGroupPages = Math.max(1, Math.ceil(visibleGroups.length / GROUPS_PER_PAGE));
  const safeGroupPage = Math.min(groupPage, totalGroupPages);
  const pagedGroups = visibleGroups.slice((safeGroupPage - 1) * GROUPS_PER_PAGE, safeGroupPage * GROUPS_PER_PAGE);

  return (
    <div className={styles.bvWrapper}>
      <Header />

      <div className={styles.bvHeader}>
        <div className={styles.headerTitle}>
          <h2 style={{ fontFamily: "'Fraunces', serif" }}>BV — BACK UP VOLUME</h2>
          <p>{selectedProject ? `${selectedProject.name} (${selectedProject.discipline} ${selectedProject.hspkPeriod})` : 'Kelola struktur Group Pekerjaan, Sub-Group, serta rincian dimensi volume.'}</p>
          <div className={styles.headerActions}>
            <button className={styles.btnPrimary} onClick={() => handleOpenAddGroup(null)} disabled={!selectedProjectId}>
              + Tambah Group Pekerjaan
            </button>
            {/* Link antar modul: BV -> RAB dengan proyek yang sama terpilih */}
            <button
              type="button"
              className={styles.btnOutline}
              disabled={!selectedProjectId}
              onClick={() => onGoToRab?.(selectedProjectId)}
              title="Buka RAB untuk proyek ini"
            >
              Lihat RAB &rarr;
            </button>
            <button
              type="button"
              className={styles.btnOutline}
              disabled={!selectedProjectId || filteredBvItems.length === 0}
              onClick={exportBvToExcel}
              title="Export Backup Volume ke Excel"
            >
              <Download size={16} style={{ marginRight: 4 }} />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      <ProjectSelector
        projectId={selectedProjectId}
        projectList={projects.map(p => {
          const int = p.interiorGrade || (p.discipline === 'INTERIOR' ? p.grade : null);
          const sip = p.sipilGrade || (p.discipline === 'SIPIL' ? p.grade : null);
          return {
            ...p,
            displayName: `${p.name} — ${p.client?.name || '-'} (${int ? `Int:${int}` : ''}${int && sip ? ' · ' : ''}${sip ? `Sip:${sip}` : ''}${!int && !sip ? 'General' : ''} ${p.hspkPeriod})`
          };
        })}
        loading={loadingProjects}
        onChange={(e) => {
          setSelectedProjectId(e.target.value);
          onProjectChange?.(e.target.value || null);
        }}
      />

      {selectedProjectId && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#888', fontSize: 12 }}>Filter tampilan:</span>
          {FILTER_OPTIONS.map(opt => (
            <a
              key={opt}
              href={`#bv/${opt}`}
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = `bv/${opt}`;
              }}
              className={`${styles.filterBtn} ${activeFilter === opt ? styles.filterBtnActive : ''}`}
            >
              {opt === 'GENERAL' ? 'General' : opt === 'INTERIOR' ? 'Interior' : 'Sipil'}
            </a>
          ))}
        </div>
      )}

      {selectedProjectId && (
        <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={styles.btnOutline}
            onClick={() => handleToggleCheckAll(filteredBvItems)}
          >
            ☑ Pilih/Batal Semua
          </button>
          <span style={{ color: '#aaa', fontSize: 12 }}>
            {checkedIds.length} item terpilih
          </span>
        </div>
      )}

      {checkedIds.length > 0 && (
        <div style={{ padding: '10px 14px', background: '#1c1c1c', border: '1px dashed #d4af37', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontWeight: 'bold', color: '#f3e5ab' }}>
            {checkedIds.length} Item Terpilih
          </span>
          <button type="button" className={styles.btnDanger} onClick={handleBulkDelete}>
            <Trash2 size={16} style={{ marginRight: 4 }} />
            Hapus Massal
          </button>
          {(() => {
             const selectedItems = bvItems.filter(i => checkedIds.includes(i.id));
             const allBelumSinkron = selectedItems.length > 0 && selectedItems.every(i => i.linkStatus === 'BELUM_SINKRON');
             
             if (allBelumSinkron) {
               return (
                  <button type="button" className={styles.btnPrimary} onClick={handleBulkSync}>
                    <RefreshCw size={16} style={{ marginRight: 4 }} />
                    Sync RAB Massal
                  </button>
               );
             } else {
               return (
                  <button type="button" className={styles.btnPrimary} onClick={handleBulkLink}>
                    Link RAB Massal
                  </button>
               );
             }
          })()}
        </div>
      )}

      {selectedProjectId && (
        <div>
          {loadingGroups || loadingBv ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
              Memuat data BackUp Volume...
            </div>
          ) : visibleGroups.length === 0 ? (
            <div className={styles.groupBlock} style={{ padding: 20, textAlign: 'center', color: '#888' }}>
              {activeFilter === 'GENERAL'
                ? 'Belum ada Group Pekerjaan. Klik "+ Tambah Group Pekerjaan" untuk memulai.'
                : `Tidak ada group yang memiliki baris pekerjaan bertipe ${activeFilter}.`}
            </div>
          ) : (
            <>
            {pagedGroups.map((g, idx) => {
              const counter = { n: 1 };
              const groupItems = bvByGroup[g.id] || [];

              return (
                <div key={g.id} className={styles.groupBlock}>
                  <div className={styles.groupHead}>
                    <span>{ROMAN[idx] || idx + 1}. {g.name}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className={styles.btnSmall} onClick={() => handleOpenAddBv(g.id, null)} title="Tambah Baris">
                        <Plus size={14} /> Baris
                      </button>
                      <button type="button" className={styles.btnSmall} onClick={() => handleOpenEditGroup(g)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button type="button" className={[styles.btnSmall, styles.btnDanger].join(' ')} onClick={() => handleDeleteGroup(g.id)} title="Hapus">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {g.children?.map((sg, sgIdx) => {
                    const subGroupItems = bvByGroup[sg.id] || [];
                    return (
                      <React.Fragment key={sg.id}>
                        <div className={styles.subgroupHead}>
                          <span>{sgIdx + 1}. {sg.name}</span>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button type="button" className={styles.btnSmall} onClick={() => handleOpenAddBv(sg.id, null)} title="Tambah Baris">
                              <Plus size={14} /> Baris
                            </button>
                            <button type="button" className={styles.btnSmall} onClick={() => handleOpenEditGroup(sg)} title="Edit">
                              <Pencil size={14} />
                            </button>
                            <button type="button" className={styles.btnDanger} onClick={() => handleDeleteGroup(sg.id)} title="Hapus">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {subGroupItems.length > 0 ? (
                          <table className={styles.bvTable}>
                            {renderTableHeader(subGroupItems)}
                            <tbody>{renderItemRows(subGroupItems, counter)}</tbody>
                          </table>
                        ) : (
                          <p style={{ padding: '12px 28px', color: '#666', fontSize: 12, margin: 0 }}>Belum ada baris pekerjaan di sub-group ini.</p>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {groupItems.length > 0 && (
                    <table className={styles.bvTable}>
                      {renderTableHeader(groupItems)}
                      <tbody>{renderItemRows(groupItems, counter)}</tbody>
                    </table>
                  )}
                </div>
              );
            })}
            {visibleGroups.length > GROUPS_PER_PAGE && (
              <div className={styles.pagination}>
                <button
                  type="button"
                  className={styles.btnOutline}
                  disabled={safeGroupPage <= 1}
                  onClick={() => setGroupPage(p => p - 1)}
                >
                  Prev
                </button>
                <span style={{ color: '#ccc', fontSize: 12 }}>
                  Halaman {safeGroupPage} dari {totalGroupPages}
                </span>
                <button
                  type="button"
                  className={styles.btnOutline}
                  disabled={safeGroupPage >= totalGroupPages}
                  onClick={() => setGroupPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
            </>
          )}
        </div>
      )}

      <GroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        projectId={selectedProjectId}
        parentId={groupModalParentId}
        editGroup={editGroup}
        onSuccess={fetchGroups}
      />

      <BvItemModal
        isOpen={isBvModalOpen}
        onClose={() => setIsBvModalOpen(false)}
        projectId={selectedProjectId}
        groupId={bvModalGroupId}
        parentBvItemId={bvModalParentId}
        editItem={editBvItem}
        parentItem={bvModalParentItem}
        project={selectedProject}
        activeFilter={activeFilter}
        onSuccess={() => { refresh(); fetchGroups(); }}
      />
    </div>
  );
}

const decimalObjectToString = (value) => {
  if (!value || typeof value !== 'object') return value;
  if (typeof value.toString === 'function' && value.toString !== Object.prototype.toString) {
    const text = value.toString();
    if (text !== '[object Object]') return text;
  }
  if (value.s && Number.isInteger(value.e) && Array.isArray(value.d)) {
    const digits = value.d.map((part, index) => index === 0 ? String(part) : String(part).padStart(7, '0')).join('');
    const decimalIndex = value.e + 1;
    const absolute = decimalIndex <= 0
      ? `0.${'0'.repeat(-decimalIndex)}${digits}`
      : decimalIndex >= digits.length
        ? `${digits}${'0'.repeat(decimalIndex - digits.length)}`
        : `${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
    return value.s < 0 ? `-${absolute}` : absolute;
  }
  return '';
};

const renderBvNumber = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(decimalObjectToString(value));
  return Number.isFinite(number) ? number : '';
};

const renderBvVolume = (value) => {
  const number = Number(decimalObjectToString(value));
  return Number.isFinite(number) ? number.toFixed(2) : '0.00';
};

// Helper untuk mengubah URL penuh menjadi domain bersih + validasi link redirect
const renderCleanLink = (url) => {
  if (!url || url === '-') return '-';

  // 1. Pastikan URL memiliki protocol agar tidak ter-redirect ke localhost
  const validUrl = url.startsWith('http://') || url.startsWith('https://') 
    ? url 
    : `https://${url}`;

  // 2. Ekstrak nama ringkas (misal "www.google.com/search..." -> "google")
  let label = url
    .replace(/^https?:\/\//, '') // Hapus http:// atau https://
    .replace(/^www\./, '')       // Hapus www.
    .split('/')[0]               // Ambil domain utamanya saja
    .split('.')[0];              // Ambil kata pertama sebelum .com/.co.id

  return (
    <a 
      href={validUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      style={{ color: '#e2c044', textDecoration: 'underline' }}
    >
      {label || 'Link'}
    </a>
  );
};



