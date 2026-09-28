import React, { useState, useEffect } from 'react';
import ProjectSelector from '../components/ProjectSelector';
import styles from '../styles/BackUpVolume.module.css';
import Header from '../components/Header';
import { useProjects } from '../hooks/useProjects';
import { useBvItems } from '../hooks/useBvItems';
import { groupService } from '../services/groupService';
import { hspkService } from '../services/hspkService';
import { Pencil, Trash2, Plus, RefreshCw, Download, Eye, ChevronDown, History } from 'lucide-react';
import BvRabHistoryPanel from '../components/BvRabHistoryPanel';
import BvRabApprovalBar from '../components/BvRabApprovalBar';
import toast from 'react-hot-toast';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];


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
  const projectCategories = (project?.workCategories || [])
    .filter((entry) => entry.isActive && entry.workCategory?.isActive !== false)
    .sort((a, b) =>
      (a.workCategory?.sortOrder ?? 0) - (b.workCategory?.sortOrder ?? 0)
      || String(a.workCategory?.name || '').localeCompare(String(b.workCategory?.name || '')),
    );
  const selectableProjectCategories = projectCategories.filter(
    (entry) => String(entry.workCategory?.code || '').trim().toUpperCase() !== 'GENERAL',
  );
  const inheritedWorkCategoryId = parentItem?.workCategoryId || null;
  const initialWorkCategoryId = editItem
    ? (editItem.workCategoryId || inheritedWorkCategoryId || '')
    : (inheritedWorkCategoryId || '');
  const [mode, setMode] = useState('custom');
  const [sourceJobTypeId, setSourceJobTypeId] = useState('');
  const [name, setName] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [paymentUnit, setPaymentUnit] = useState('');
  const [ecommerceLink, setEcommerceLink] = useState('');
  const inheritedLabel = parentItem?.disciplineLabel || '';
  const isRootItem = !parentBvItemId;
  const canChooseCategory = isRootItem && !editItem?.parentBvItemId;
  const [workCategoryId, setWorkCategoryId] = useState(initialWorkCategoryId);
  const selectedProjectCategory = projectCategories.find(
    (entry) => entry.workCategoryId === workCategoryId,
  );
  const isLegacyGeneralEdit = Boolean(
    editItem
      && editItem.workCategoryId
      && editItem.workCategoryId === workCategoryId
      && String(selectedProjectCategory?.workCategory?.code || '').trim().toUpperCase() === 'GENERAL',
  );
  const [disciplineLabel, setDisciplineLabel] = useState(() => {
    if (editItem) return editItem.disciplineLabel || 'GENERAL';
    return inheritedLabel;
  });

  const [jobTypes, setJobTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Reset kategori saat modal dibuka; anak selalu mengikuti kategori induk.
  useEffect(() => {
    if (!isOpen) return;
    const nextCategoryId = editItem
      ? (editItem.workCategoryId || parentItem?.workCategoryId || '')
      : (parentItem?.workCategoryId || '');
    setWorkCategoryId(nextCategoryId);
    setDisciplineLabel(editItem?.disciplineLabel || parentItem?.disciplineLabel || '');
  }, [
    isOpen,
    editItem?.workCategoryId,
    editItem?.disciplineLabel,
    parentItem?.workCategoryId,
    parentItem?.disciplineLabel,
    activeFilter,
    project?.id,
  ]);

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

  // Item baru mengikuti mode sumber harga kategori; item edit tidak diubah otomatis.
  useEffect(() => {
    if (!isOpen || editItem) return;
    setMode(selectedProjectCategory?.pricingMode === 'HSPK' ? 'hspk' : 'custom');
  }, [isOpen, editItem?.id, workCategoryId, selectedProjectCategory?.pricingMode]);

  // Muat daftar AHSP saat periode/kategori berubah; pencarian dikirim ke server
  // (debounce) agar tidak terbatas pada 100 item pertama yang ke-load.
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const params = { limit: 100 };
      if (hspkPeriod) params.period = hspkPeriod;
      if (searchQuery.trim().length >= 2) params.search = searchQuery.trim();
      if (selectedProjectCategory) {
        params.workCategoryId = selectedProjectCategory.workCategoryId;
        if (selectedProjectCategory.grade) params.grade = selectedProjectCategory.grade;
      } else if (disciplineLabel && disciplineLabel !== 'GENERAL') {
        params.discipline = disciplineLabel;
        const matchedGrade = disciplineLabel === 'INTERIOR'
          ? project?.interiorGrade
          : disciplineLabel === 'SIPIL'
            ? project?.sipilGrade
            : null;
        if (matchedGrade) params.grade = matchedGrade;
      }

      if (selectedProjectCategory?.pricingMode !== 'CUSTOM' || !selectedProjectCategory) {
        hspkService.getJobTypes(params)
          .then(res => setJobTypes(Array.isArray(res) ? res : res?.data || []))
          .catch((err) => console.error("Gagal load jobTypes:", err));
      } else {
        setJobTypes([]);
        setSourceJobTypeId('');
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [
    isOpen,
    hspkPeriod,
    disciplineLabel,
    workCategoryId,
    searchQuery,
    selectedProjectCategory?.pricingMode,
    selectedProjectCategory?.grade,
    selectedProjectCategory?.workCategoryId,
    project?.interiorGrade,
    project?.sipilGrade,
  ]);

  // Inisialisasi isi form hanya saat modal/data item berubah.
  useEffect(() => {
    if (!isOpen) return;

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
      setDisciplineLabel(editItem.disciplineLabel || 'GENERAL');
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
      setMode('custom');
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
  }, [isOpen, editItem, parentBvItemId]);

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
      if (projectCategories.length > 0 && !workCategoryId && !editItem) {
        throw new Error(parentBvItemId
          ? 'Kategori item induk belum ditetapkan. Edit item induk terlebih dahulu.'
          : 'Pilih kategori pekerjaan.');
      }
      if (projectCategories.length === 0 && !parentBvItemId && !editItem
        && !['SIPIL', 'INTERIOR'].includes(String(disciplineLabel || '').toUpperCase())) {
        throw new Error('Pilih kategori pekerjaan: Sipil atau Interior.');
      }
      if (canChooseCategory && workCategoryId && !isLegacyGeneralEdit) {
        const chosenCode = String(selectedProjectCategory?.workCategory?.code || '').toUpperCase();
        if (chosenCode === 'GENERAL' || !chosenCode) {
          throw new Error('Kategori General tidak dapat dipilih. Pilih kategori pekerjaan.');
        }
      }
      if (mode === 'hspk' && selectedProjectCategory?.pricingMode === 'CUSTOM') {
        throw new Error('Kategori ini memakai mode CUSTOM dan tidak memiliki master AHSP.');
      }
      const selectedCategoryCode = String(selectedProjectCategory?.workCategory?.code || '').toUpperCase();
      const payload = {
        groupId: groupId || null,
        parentBvItemId: parentBvItemId || null,
        isHeaderOnly,
        sourceJobTypeId: mode === 'hspk' ? (sourceJobTypeId || null) : null,
        name: name.trim(),
        keterangan: keterangan.trim() || null,
        paymentUnit: isHeaderOnly ? null : paymentUnit.trim(),
        ecommerceLink: isHeaderOnly ? null : (ecommerceLink.trim() || null),
        disciplineLabel: canChooseCategory
          ? (['SIPIL', 'INTERIOR'].includes(selectedCategoryCode)
            ? selectedCategoryCode
            : disciplineLabel || (editItem?.disciplineLabel ?? null))
          : undefined,
        workCategoryId: canChooseCategory
          ? workCategoryId || (editItem?.workCategoryId ?? null)
          : undefined,
        ahspDiscipline: (!workCategoryId && mode === 'hspk')
          ? (sourceJobTypeId ? undefined : null)
          : undefined,
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
      <div className={`${styles.modalBox} ${styles.bvItemModalBox}`}>
        <div className={styles.modalHeader}>
          <h3>{editItem ? 'Edit Baris Pekerjaan (BV)' : parentBvItemId ? 'Tambah Sub Uraian Pekerjaan' : 'Tambah Baris Pekerjaan (BV)'}</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {error && <div style={{ color: '#ff6b6b', background: '#3a1c1c', padding: 8, borderRadius: 3, marginBottom: 10, fontSize: 11 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.bvInputSection}>
            <div className={styles.bvSectionTitle}>1. Sumber pekerjaan</div>
            <div className={styles.formGroup}>
              <label>Mode input</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="hspk">Dari Master HSPK/AHSP</option>
                <option value="custom">Custom (input manual)</option>
                {!parentBvItemId && <option value="header">Header / Judul Pekerjaan</option>}
              </select>
            </div>
          </div>

          <div className={styles.bvInputSection}>
            <div className={styles.bvSectionTitle}>2. Kategori pekerjaan</div>
            {selectableProjectCategories.length > 0 ? (
              <div className={styles.formGroup}>
                <label>{canChooseCategory ? 'Kategori proyek' : 'Kategori induk (diwariskan)'}</label>
                <select
                  value={workCategoryId}
                  onChange={(event) => {
                    if (!canChooseCategory) return;
                    const nextId = event.target.value;
                    setWorkCategoryId(nextId);
                    const nextCode = String(
                      selectableProjectCategories.find((entry) => entry.workCategoryId === nextId)?.workCategory?.code || '',
                    ).toUpperCase();
                    setDisciplineLabel(['SIPIL', 'INTERIOR'].includes(nextCode) ? nextCode : '');
                  }}
                  disabled={!canChooseCategory}
                  required
                >
                  {canChooseCategory && !workCategoryId && (
                    <option value="">Pilih kategori pekerjaan</option>
                  )}
                  {isLegacyGeneralEdit && (
                    <option value={workCategoryId}>
                      {String(selectedProjectCategory?.workCategory?.code || 'GENERAL').toUpperCase()} (kategori lama)
                    </option>
                  )}
                  {selectableProjectCategories.map((entry) => (
                    <option key={entry.workCategoryId} value={entry.workCategoryId}>
                      {String(entry.workCategory?.code || '').toUpperCase()}
                    </option>
                  ))}
                </select>
                {selectedProjectCategory?.pricingMode === 'CUSTOM' && mode === 'hspk' && (
                  <small className={styles.inheritedHint}>Kategori ini memakai sumber harga CUSTOM.</small>
                )}
              </div>
            ) : projectCategories.length === 0 ? (
              <div className={styles.disciplineChoices}>
                {[
                  { value: 'SIPIL', label: 'Sipil' },
                  { value: 'INTERIOR', label: 'Interior' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.disciplineChoice} ${disciplineLabel === option.value ? styles.disciplineChoiceActive : ''}`}
                    onClick={() => canChooseCategory && setDisciplineLabel(option.value)}
                    disabled={!canChooseCategory}
                  >
                    <span className={styles.disciplineDot} />
                    <strong>{option.label}</strong>
                  </button>
                ))}
              </div>
            ) : (
              <small className={styles.inheritedHint}>
                Kategori General tidak dapat dipilih. Aktifkan minimal satu kategori pekerjaan pada proyek terlebih dahulu.
              </small>
            )}
          </div>

          {mode === 'hspk' && (
            <div className={styles.bvInputSection}>
              <div className={styles.bvSectionTitle}>3. Pilih master AHSP ({selectedProjectCategory ? String(selectedProjectCategory.workCategory?.code || '').toUpperCase() : disciplineLabel})</div>
              <div className={styles.formGroup}>
                <label>Cari jenis pekerjaan</label>
                <input
                  type="text"
                  placeholder="Ketik kode atau nama pekerjaan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ marginBottom: 6 }}
                />
                <select
                  value={sourceJobTypeId}
                  onChange={handleJobTypeSelect}
                  size={5}
                  className={styles.ahspSelectList}
                >
                  {filteredJobTypes.slice(0, 40).map(j => (
                    <option key={j.id} value={j.id}>
                      [{j.reference || j.workCategory?.code || 'AHSP'}] {j.name} ({j.paymentUnit})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className={styles.bvInputSection}>
            <div className={styles.bvSectionTitle}>{mode === 'hspk' ? '4. Rincian uraian' : '3. Rincian uraian'}</div>
            <div className={styles.formGroup}>
              <label>Uraian pekerjaan / judul</label>
              <input
                type="text"
                placeholder="mis. Pasangan Dinding Bata Merah"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {mode !== 'header' && (
              <div className={styles.formGridTwo}>
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
                <div className={styles.formGroup}>
                  <label>Link e-commerce (opsional)</label>
                  <input
                    type="text"
                    placeholder="nama produk / link"
                    value={ecommerceLink}
                    onChange={(e) => setEcommerceLink(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {mode !== 'header' && (
            <>
              <div className={styles.bvInputSection}>
                <div className={styles.bvSectionHeaderRow}>
                  <div className={styles.bvSectionTitle}>{mode === 'hspk' ? '5. Breakdown dimensi' : '4. Breakdown dimensi'}</div>
                  <small className={styles.inheritedHint}>Centang dimensi yang digunakan untuk perhitungan volume</small>
                </div>

                {breakdowns.map((b, i) => (
                  <div key={i} className={styles.breakdownCard}>
                    <div className={styles.breakdownCardHeader}>
                      <span className={styles.breakdownIndex}>{String(i + 1).padStart(2, '0')}</span>
                      <input
                        type="text"
                        placeholder="Keterangan area (mis. Lobby Area A)"
                        value={b.keterangan}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBreakdowns(prev => prev.map((item, idx) => idx === i ? { ...item, keterangan: val } : item));
                        }}
                        className={styles.breakdownDescInput}
                      />
                      {breakdowns.length > 1 && (
                        <button type="button" className={styles.btnDanger} onClick={() => setBreakdowns(prev => prev.filter((_, idx) => idx !== i))}>Hapus</button>
                      )}
                    </div>

                    <div className={styles.dimGridResponsive}>
                      {[
                        { key: 'panjang', checkKey: 'isPChecked', label: 'Panjang' },
                        { key: 'lebar', checkKey: 'isLChecked', label: 'Lebar' },
                        { key: 'tinggi', checkKey: 'isTChecked', label: 'Tinggi' },
                        { key: 'luas', checkKey: 'isLuasChecked', label: 'Luas manual' },
                        { key: 'keliling', checkKey: 'isKelChecked', label: 'Keliling' },
                        { key: 'diameter', label: 'Diameter' },
                        { key: 'berat', checkKey: 'isBeratChecked', label: 'Berat' },
                      ].map(f => {
                        const isChecked = f.checkKey ? !!b[f.checkKey] : true;
                        return (
                          <div key={f.key} className={`${styles.dimFieldCard} ${isChecked ? styles.dimFieldCardActive : ''}`}>
                            <label className={styles.dimFieldLabel}>
                              {f.checkKey ? (
                                <input
                                  type="checkbox"
                                  checked={b[f.checkKey]}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setBreakdowns(prev => prev.map((item, idx) => idx === i ? { ...item, [f.checkKey]: checked } : item));
                                  }}
                                />
                              ) : <span style={{ width: 14 }} />}
                              <span>{f.label}</span>
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder={f.label}
                              value={b[f.key]}
                              disabled={f.checkKey ? !isChecked : false}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBreakdowns(prev => prev.map((item, idx) => idx === i ? { ...item, [f.key]: val } : item));
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className={styles.dimExtraGrid}>
                      <div className={styles.dimExtraItem}>
                        <label>Jumlah sisi</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={b.jumlahSisi}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBreakdowns(prev => prev.map((item, idx) => idx === i ? { ...item, jumlahSisi: val } : item));
                          }}
                        />
                      </div>
                      <div className={styles.dimExtraItem}>
                        <label>Jumlah buah</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={b.jumlahBh}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBreakdowns(prev => prev.map((item, idx) => idx === i ? { ...item, jumlahBh: val } : item));
                          }}
                        />
                      </div>
                      <div className={styles.dimExtraItem}>
                        <label>Waste %</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={b.waste}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBreakdowns(prev => prev.map((item, idx) => idx === i ? { ...item, waste: val } : item));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button type="button" className={styles.btnSmall} onClick={handleAddBreakdown}>+ Tambah Keterangan Area</button>
              </div>
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
const ALL_CATEGORY_FILTER = 'SEMUA';
const LEGACY_BV_ALL_FILTER = 'GENERAL';

function parseBvHash() {
  const raw = window.location.hash.replace('#', '');
  if (!raw.startsWith('bv')) return { tab: 'bv', filter: ALL_CATEGORY_FILTER };
  const filter = raw.split('/')[1]?.trim().toUpperCase();
  // Hash lawas #bv/GENERAL tetap dialihkan ke #bv/SEMUA.
  if (!filter || filter === LEGACY_BV_ALL_FILTER) return { tab: 'bv', filter: ALL_CATEGORY_FILTER };
  return { tab: 'bv', filter };
}

function filterBvByCategory(items, category) {
  if (!category || category === ALL_CATEGORY_FILTER) return items;
  const categoryId = category.workCategoryId || category.id;
  const categoryCode = String(category.code || '').toUpperCase();
  return items.reduce((acc, it) => {
    const matchingChildren = it.children?.length
      ? filterBvByCategory(it.children, category)
      : [];
    const legacyLabel = String(it.disciplineLabel || '').toUpperCase();
    const matchesById = categoryId && it.workCategoryId === categoryId;
    const matchesLegacy = !it.workCategoryId && legacyLabel === categoryCode;
    if (matchesById || matchesLegacy || matchingChildren.length > 0) {
      acc.push({ ...it, children: matchingChildren });
    }
    return acc;
  }, []);
}

export default function BackUpVolume({ initialProjectId = null, onProjectChange, onGoToRab }) {
  const { projects, loading: loadingProjects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || '');
  const projectRef = React.useRef(selectedProjectId);
  projectRef.current = selectedProjectId;
  const [activeFilter, setActiveFilter] = useState(() => parseBvHash().filter);
  const [groupPage, setGroupPage] = useState(1);
  const [expandedGroupIds, setExpandedGroupIds] = useState(() => new Set());
  const GROUPS_PER_PAGE = 10;

  const toggleGroup = (groupId) => {
    setExpandedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

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

  // Saat tab BV aktif tapi hash belum ada, default ke #bv/SEMUA.
  useEffect(() => {
    const raw = window.location.hash.replace('#', '');
    if (!raw.startsWith('bv')) {
      window.location.hash = `bv/${ALL_CATEGORY_FILTER}`;
    } else if (raw.startsWith(`bv/${LEGACY_BV_ALL_FILTER}`)) {
      window.location.hash = `bv/${ALL_CATEGORY_FILTER}`;
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [approvalLocked, setApprovalLocked] = useState(true);
  const [rabBusyMessage, setRabBusyMessage] = useState('');

  // Jalankan aksi ke RAB sambil menampilkan layar proses.
  const runRabAction = async (message, action) => {
    if (rabBusyMessage) return;
    setRabBusyMessage(message);
    try {
      return await action();
    } finally {
      setRabBusyMessage('');
    }
  };

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupModalParentId, setGroupModalParentId] = useState(null);
  const [editGroup, setEditGroup] = useState(null);

  const [isBvModalOpen, setIsBvModalOpen] = useState(false);
  const [bvModalGroupId, setBvModalGroupId] = useState(null);
  const [bvModalParentId, setBvModalParentId] = useState(null);
  const [bvModalParentItem, setBvModalParentItem] = useState(null);
  const [editBvItem, setEditBvItem] = useState(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const configuredProjectCategories = (selectedProject?.workCategories || [])
    .filter((entry) => entry.isActive && entry.workCategory?.isActive !== false)
    .filter((entry) => String(entry.workCategory?.code || '').trim().toUpperCase() !== 'GENERAL')
    .sort((a, b) =>
      (a.workCategory?.sortOrder ?? 0) - (b.workCategory?.sortOrder ?? 0)
      || String(a.workCategory?.name || '').localeCompare(String(b.workCategory?.name || '')),
    );
  const projectCategoryOptions = configuredProjectCategories.length > 0
    ? configuredProjectCategories.map((entry) => ({
        id: entry.workCategoryId,
        workCategoryId: entry.workCategoryId,
        code: String(entry.workCategory?.code || '').toUpperCase(),
        name: String(entry.workCategory?.code || '').toUpperCase(),
        grade: entry.grade || null,
        pricingMode: entry.pricingMode || null,
      }))
    : [
        { id: 'legacy-sipil', workCategoryId: null, code: 'SIPIL', name: 'SIPIL', grade: selectedProject?.sipilGrade || null },
        { id: 'legacy-interior', workCategoryId: null, code: 'INTERIOR', name: 'INTERIOR', grade: selectedProject?.interiorGrade || null },
      ];
  const categoryFilterOptions = [
    { id: ALL_CATEGORY_FILTER, workCategoryId: null, code: ALL_CATEGORY_FILTER, name: 'Semua' },
    ...projectCategoryOptions,
  ];
  const selectedFilterCategory = activeFilter === ALL_CATEGORY_FILTER
    ? ALL_CATEGORY_FILTER
    : projectCategoryOptions.find((category) => category.code === activeFilter) || null;
  const activeCategoryLabel = activeFilter === ALL_CATEGORY_FILTER
    ? 'Semua'
    : selectedFilterCategory?.name || activeFilter;

  useEffect(() => {
    if (!selectedProjectId || activeFilter === ALL_CATEGORY_FILTER) return;
    if (!projectCategoryOptions.some((category) => category.code === activeFilter)) {
      window.location.hash = `bv/${ALL_CATEGORY_FILTER}`;
    }
  }, [selectedProjectId, activeFilter, projectCategoryOptions.map((category) => category.code).join('|')]);

  const fetchGroups = async () => {
      if (!selectedProjectId) {
        setGroups([]);
        return;
      }
      const requestProjectId = selectedProjectId;
      setLoadingGroups(true);
      try {
        const res = await groupService.getByProjectId(requestProjectId);
        // Abaikan respons jika proyek sudah berganti saat request berjalan.
        if (projectRef.current !== requestProjectId) return;
        setGroups(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error(err);
      } finally {
        if (projectRef.current === requestProjectId) setLoadingGroups(false);
      }
    };

  useEffect(() => {
    setGroups([]);
    setLoadingGroups(Boolean(selectedProjectId));
    fetchGroups();
  }, [selectedProjectId]);

  // Tutup seluruh modal dan bersihkan pilihan saat proyek berganti.
  // Tanpa ini, modal/pilihan lama bisa menunjuk record proyek sebelumnya.
  useEffect(() => {
    setCheckedIds([]);
    setIsGroupModalOpen(false);
    setEditGroup(null);
    setGroupModalParentId(null);
    setIsBvModalOpen(false);
    setEditBvItem(null);
    setBvModalGroupId(null);
    setBvModalParentId(null);
    setBvModalParentItem(null);
    setHistoryOpen(false);
  }, [selectedProjectId]);

  // Saat approval mengunci, tutup juga modal/pilihan agar tidak ada aksi
  // yang tertinggal terhadap data yang sedang menunggu review.
  useEffect(() => {
    if (!approvalLocked) return;
    setCheckedIds([]);
    setIsGroupModalOpen(false);
    setEditGroup(null);
    setGroupModalParentId(null);
    setIsBvModalOpen(false);
    setEditBvItem(null);
    setBvModalGroupId(null);
    setBvModalParentId(null);
    setBvModalParentItem(null);
    setHistoryOpen(false);
  }, [approvalLocked]);

  const handleOpenAddGroup = (parentId = null) => {
    if (approvalLocked) {
      toast.error('BV/RAB sedang menunggu review atau sudah disetujui. Buat revisi baru dulu.');
      return;
    }
    setEditGroup(null);
    setGroupModalParentId(parentId);
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroup = (group) => {
    if (approvalLocked) {
      toast.error('BV/RAB sedang menunggu review atau sudah disetujui. Buat revisi baru dulu.');
      return;
    }
    setEditGroup(group);
    setGroupModalParentId(null);
    setIsGroupModalOpen(true);
  };

  const handleDeleteGroup = async (groupId) => {
      if (approvalLocked) {
        toast.error('BV/RAB sedang menunggu review atau sudah disetujui. Buat revisi baru dulu.');
        return;
      }
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
    if (approvalLocked) {
      toast.error('BV/RAB sedang menunggu review atau sudah disetujui. Buat revisi baru dulu.');
      return;
    }
    setEditBvItem(null);
    setBvModalGroupId(groupId);
    setBvModalParentId(parentBvItemId);
    const parent = parentBvItemId ? bvItems.find(i => i.id === parentBvItemId) || null : null;
    setBvModalParentItem(parent);
    setIsBvModalOpen(true);
  };

  const handleOpenEditBv = (item) => {
    if (approvalLocked) {
      toast.error('BV/RAB sedang menunggu review atau sudah disetujui. Buat revisi baru dulu.');
      return;
    }
    setEditBvItem(item);
    setBvModalGroupId(item.groupId);
    setBvModalParentId(item.parentBvItemId);
    const parent = item.parentBvItemId ? bvItems.find(i => i.id === item.parentBvItemId) || null : null;
    setBvModalParentItem(parent);
    setIsBvModalOpen(true);
  };

  const handleToggleCheck = (id) => {
    if (approvalLocked) return;
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
    if (approvalLocked) return;
    const tableItemIds = getAllIdsFromTable(itemsInTable);
    const isAllChecked = tableItemIds.length > 0 && tableItemIds.every(id => checkedIds.includes(id));
    
    if (isAllChecked) {
      setCheckedIds(prev => prev.filter(id => !tableItemIds.includes(id)));
    } else {
      setCheckedIds(prev => [...new Set([...prev, ...tableItemIds])]);
    }
  };

  const handleBulkDelete = async () => {
    if (approvalLocked) {
      toast.error('BV/RAB sedang menunggu review atau sudah disetujui. Buat revisi baru dulu.');
      return;
    }
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
      if (approvalLocked) {
        toast.error('BV/RAB sedang menunggu review atau sudah disetujui. Buat revisi baru dulu.');
        return;
      }
      if (checkedIds.length === 0 || rabBusyMessage) return;
    if (!window.confirm(`Link ${checkedIds.length} item terpilih ke RAB?`)) return;

    const action = runRabAction(
      `Menghubungkan ${checkedIds.length} item BV ke RAB...`,
      () => linkToRabBulk(checkedIds),
    );
    toast.promise(action, {
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
      if (approvalLocked) {
        toast.error('BV/RAB sedang menunggu review atau sudah disetujui. Buat revisi baru dulu.');
        return;
      }
      if (checkedIds.length === 0 || rabBusyMessage) return;
    if (!window.confirm(`Sync ${checkedIds.length} item terpilih ke RAB?`)) return;

    const action = runRabAction(
      `Menyinkronkan ${checkedIds.length} item BV dengan RAB...`,
      () => syncBulk(checkedIds),
    );
    toast.promise(action, {
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
            disabled={approvalLocked}
            title="Pilih/batal semua"
          />
        </th>
        <th rowSpan={2}>NO</th>
        <th rowSpan={2} className={styles.jobDescriptionHeader}>URAIAN PEKERJAAN</th>
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
      const statusLabel = it.linkStatus === 'SUDAH_DILINK'
        ? 'Sudah di-link'
        : it.linkStatus === 'BELUM_SINKRON'
          ? 'Perlu sinkronisasi'
          : 'Belum di-link';
      const statusClass = it.linkStatus === 'SUDAH_DILINK'
        ? styles.statusDotLinked
        : it.linkStatus === 'BELUM_SINKRON'
          ? styles.statusDotWarning
          : styles.statusDotUnlinked;

      let ketText = it.sourceJobType
        ? "HSPK: " + (it.sourceJobType.reference || "")
        : it.isHeaderOnly ? "" : (it.keterangan || "");

      if (hasSingleBreakdown && b0?.keterangan) {
        ketText = b0.keterangan;
      }

      const categoryCode = String(it.workCategory?.code || it.disciplineLabel || 'GENERAL').toUpperCase();
      const categoryLabel = categoryCode !== ALL_CATEGORY_FILTER ? categoryCode : '';
      const categoryClass = categoryCode === 'SIPIL'
        ? styles.disciplineSipil
        : categoryCode === 'INTERIOR'
          ? styles.disciplineInterior
          : '';

      return (
        <React.Fragment key={it.id}>
          <tr className={it.isHeaderOnly ? styles.headerRow : ''}>
            <td>
              <input
                type="checkbox"
                checked={isChecked}
                disabled={approvalLocked}
                onChange={() => handleToggleCheck(it.id)}
              />
            </td>
            <td>{no}</td>
            <td className={styles.jobDescriptionCell} style={{ paddingLeft: isChild ? 18 : 6 }}>
              {isChild ? '-- ' : ''}{it.name}
              {categoryLabel && (
                <span className={`${styles.disciplineBadge} ${categoryClass}`}>
                  {categoryLabel}
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
            <td>
              <span
                className={`${styles.statusDot} ${statusClass}`}
                title={statusLabel}
                aria-label={statusLabel}
                role="img"
              />
            </td>

            {/* KOLOM AKSI */}
                        <td>
                          <div className={styles.rowActions} aria-disabled={approvalLocked} style={approvalLocked ? { pointerEvents: 'none', opacity: 0.5 } : undefined}>
                            <button type="button" className={styles.btnSmall} disabled={approvalLocked} onClick={() => handleOpenEditBv(it)} title="Edit">
                              <Pencil size={14} />
                            </button>
                
                            {/* TAMPILKAN TOMBOL LINK JIKA BELUM PERNAH DILINK */}
                            {(!it.linkStatus || it.linkStatus === 'BELUM_DILINK') && (
                              <button
                                type="button"
                                className={styles.btnGreen}
                                disabled={approvalLocked || Boolean(rabBusyMessage)}
                                onClick={() => {
                      const action = runRabAction(
                        'Menghubungkan BV ke RAB...',
                        () => linkToRab(it.id, { includeChildren: true }),
                      );
                      toast.promise(action, {
                        loading: 'Menautkan item ke RAB...',
                        success: 'Berhasil menautkan item ke RAB!',
                        error: 'Gagal menautkan item.'
                      }).catch(err => console.error(err));
                    }}
                  >
                    Link
                  </button>
                )}

                {/* 👇 TAMPILKAN TOMBOL SYNC JIKA STATUSNYA BELUM_SINKRON 👇 */}
                {it.linkStatus === 'BELUM_SINKRON' && (
                  <button 
                    type="button" 
                    className={`${styles.btnOutline} ${styles.btnSync}`}
                    disabled={approvalLocked || Boolean(rabBusyMessage)}
                    onClick={() => {
                      const treeIds = getAllIdsFromTable([it]);
                      const hasChildren = treeIds.length > 1;
                      const action = runRabAction(
                        hasChildren
                          ? 'Menyinkronkan header dan seluruh baris turunannya...'
                          : 'Menyinkronkan item BV dengan RAB...',
                        () => (hasChildren ? syncBulk(treeIds) : syncBvItem(it.id)),
                      );
                      toast.promise(action, {
                        loading: hasChildren ? 'Sinkronisasi header dan seluruh baris turunannya...' : 'Sinkronisasi ke RAB...',
                        success: hasChildren ? 'Header dan seluruh baris turunannya berhasil disinkronkan!' : 'Berhasil disinkronkan ke RAB!',
                        error: 'Gagal sinkronisasi.'
                      }).catch(err => console.error(err));
                    }} 
                    title="Sinkronkan item beserta seluruh turunannya ke RAB"
                  >
                    Sync Ulang
                  </button>
                )}

                {!it.parentBvItemId && (
                  <button type="button" className={styles.btnSmall} disabled={approvalLocked} onClick={() => handleOpenAddBv(it.groupId, it.id)} title="Tambah Sub">
                    <Plus size={14} /> Sub
                  </button>
                )}
                <button type="button" className={styles.btnDanger} disabled={approvalLocked} onClick={() => deleteBvItem(it.id)} title="Hapus">
                  <Trash2 size={14} />
                </button>
              </div>
            </td>
          </tr>

          {!hasSingleBreakdown && it.breakdowns && it.breakdowns.length > 0 && (
            it.breakdowns.map((b, bi) => (
              <tr key={b.id || `${it.id}-breakdown-${bi}`} className={styles.subrow}>
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

  const filteredBvItems = filterBvByCategory(bvItems, selectedFilterCategory);

  const bvByGroup = {};
  filteredBvItems.forEach(it => {
    const gid = it.groupId || 'none';
    if (!bvByGroup[gid]) bvByGroup[gid] = [];
    bvByGroup[gid].push(it);
  });

  // Buka View BV sesuai kategori aktif dengan autentikasi.
  const viewBv = async () => {
    if (!selectedProjectId) return;

    const viewLabel = activeCategoryLabel;
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
      toast.error('Popup diblokir browser. Izinkan popup untuk membuka View BV.');
      return;
    }

    previewWindow.document.write(`<p style="font-family:Arial,sans-serif;padding:24px">Memuat View BV ${viewLabel}...</p>`);

    try {
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const query = new URLSearchParams();
      if (selectedFilterCategory?.workCategoryId) {
        query.set('workCategoryId', selectedFilterCategory.workCategoryId);
      } else {
        query.set('discipline', activeFilter === ALL_CATEGORY_FILTER ? 'SEMUA' : activeFilter);
      }
      const viewUrl = `${apiBase}/api/projects/${selectedProjectId}/bv-items/view?${query.toString()}`;
      const res = await fetch(viewUrl, {
        headers: token
          ? { Authorization: [String.fromCharCode(66, 101, 97, 114, 101, 114), token].join(' ') }
          : {},
      });
      if (!res.ok) throw new Error(`View BV ${viewLabel} gagal (${res.status})`);

      const html = await res.text();
      previewWindow.document.open();
      previewWindow.document.write(html);
      previewWindow.document.close();
    } catch (err) {
      console.error(err);
      previewWindow.close();
      toast.error(err.message || `Gagal membuka View BV ${viewLabel}`);
    }
  };

  // Export BV ke Excel sesuai kategori proyek aktif.
  const exportBvToExcel = async ({ scope, workCategoryId = null, code, label }) => {
    if (!selectedProjectId) return;
    const exportLabel = label || code || scope;

    try {
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const query = new URLSearchParams();
      if (workCategoryId) query.set('workCategoryId', workCategoryId);
      else query.set('scope', scope || code || ALL_CATEGORY_FILTER);
      const exportUrl = `${apiBase}/api/projects/${selectedProjectId}/bv-items/export-excel?${query.toString()}`;
      const res = await fetch(exportUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || `Export gagal (${res.status})`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const projectName = (selectedProject?.name || 'proyek').replace(/[^a-zA-Z0-9]/g, '_');
      const downloadCode = code || scope || 'BV';
      a.download = `BV_${downloadCode}_${projectName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Export BV ${exportLabel} berhasil`);
    } catch (err) {
      console.error(err);
      toast.error(err.message || `Gagal export BV ${exportLabel}`);
    }
  };
  const sortedGroups = [...groups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const visibleGroups = sortedGroups.filter(g => {
    if (activeFilter === ALL_CATEGORY_FILTER) return true;
    return bvByGroup[g.id]?.length > 0;
  });
  const totalGroupPages = Math.max(1, Math.ceil(visibleGroups.length / GROUPS_PER_PAGE));
  const safeGroupPage = Math.min(groupPage, totalGroupPages);
  const pagedGroups = visibleGroups.slice((safeGroupPage - 1) * GROUPS_PER_PAGE, safeGroupPage * GROUPS_PER_PAGE);

  if (rabBusyMessage) {
    return (
      <div className="auth-splash">
        <div className="splash-logo" style={{ fontSize: '1rem' }}>DIVES CORP.</div>
        <div className="splash-spinner" />
        <div style={{ color: 'var(--auth-gold)', textAlign: 'center' }}>
          {rabBusyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.bvWrapper}>
      <Header />
      <div className={styles.topLine} />

      <div className={styles.bvHeader}>
        <div className={styles.headerTitle}>
          <span className={styles.pageEyebrow}>PERENCANAAN PROYEK</span>
          <h2>BV — BACK UP VOLUME</h2>
          <p>{selectedProject ? `${selectedProject.name} · ${selectedProject.discipline || 'General'} · Periode ${selectedProject.hspkPeriod}` : 'Kelola group pekerjaan, uraian, dan rincian volume proyek.'}</p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnOutline}
            disabled={!selectedProjectId || approvalLocked}
            onClick={() => setHistoryOpen(true)}
            title="Lihat riwayat perubahan BV"
          >
            <History size={16} /> Riwayat
          </button>
          <button className={styles.btnPrimary} onClick={() => handleOpenAddGroup(null)} disabled={!selectedProjectId || approvalLocked}>
            <Plus size={16} /> Tambah Group
          </button>
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
            disabled={!selectedProjectId}
            onClick={viewBv}
            title={`Buka View BV ${activeCategoryLabel}`}
          >
            <Eye size={16} /> View {activeCategoryLabel}
          </button>
          <details className={styles.exportDropdown}>
            <summary
              className={styles.btnOutline}
              aria-disabled={!selectedProjectId}
              onClick={(event) => {
                if (!selectedProjectId) event.preventDefault();
              }}
            >
              <Download size={16} /> Export Excel <ChevronDown size={14} />
            </summary>
            <div className={styles.exportMenu}>
              {[
                ...projectCategoryOptions.map((option) => ({
                  workCategoryId: option.workCategoryId,
                  code: option.code,
                  label: `BV ${option.name}`,
                  key: `category:${option.workCategoryId || option.code}`,
                })),
                {
                  scope: 'ALL',
                  code: 'ALL',
                  label: `BV Semua Kategori — ${projectCategoryOptions.length + 1} Sheet`,
                  key: 'scope:ALL',
                },
              ].map((exportOption) => (
                <button
                  key={exportOption.key}
                  type="button"
                  className={styles.exportMenuItem}
                  disabled={!selectedProjectId}
                  onClick={(event) => {
                    event.currentTarget.closest('details')?.removeAttribute('open');
                    exportBvToExcel(exportOption);
                  }}
                >
                  {exportOption.label}
                </button>
              ))}
            </div>
          </details>
        </div>
      </div>

      <BvRabApprovalBar projectId={selectedProjectId} onLockedChange={setApprovalLocked} />

      <div className={styles.workspaceControls}>
        <div className={styles.projectSelectorShell}>
          <span className={styles.projectActiveLabel}>PROJECT AKTIF</span>
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
              setExpandedGroupIds(new Set());
              setSelectedProjectId(e.target.value);
              setApprovalLocked(true);
              onProjectChange?.(e.target.value || null);
            }}
          />
        </div>

        {selectedProjectId && (
          <div className={styles.controlBar}>
            <div className={styles.filterGroup}>
              <span className={styles.controlLabel}>Kategori</span>
              {categoryFilterOptions.map((option) => (
                <a
                  key={option.id}
                  href={`#bv/${option.code}`}
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.hash = `bv/${option.code}`;
                  }}
                  className={`${styles.filterBtn} ${activeFilter === option.code ? styles.filterBtnActive : ''}`}
                >
                  {option.name}
                </a>
              ))}
            </div>
            <div className={styles.selectionTools}>
              <button
                type="button"
                className={styles.btnSubtle}
                onClick={() => handleToggleCheckAll(filteredBvItems)}
                disabled={approvalLocked}
              >
                Pilih Semua
              </button>
              <span className={`${styles.selectionCount} ${checkedIds.length > 0 ? styles.selectionCountActive : ''}`}>
                {checkedIds.length} terpilih
              </span>
            </div>
          </div>
        )}
      </div>

      {checkedIds.length > 0 && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkSummary}>
            <strong>{checkedIds.length}</strong> item terpilih
          </span>
          <div className={styles.bulkActions} aria-disabled={approvalLocked} style={approvalLocked ? { pointerEvents: 'none', opacity: 0.5 } : undefined}>
            <button type="button" className={styles.btnDanger} disabled={approvalLocked} onClick={handleBulkDelete}>
              <Trash2 size={15} /> Hapus
            </button>
            {(() => {
               const selectedItems = bvItems.filter(i => checkedIds.includes(i.id));
               const allBelumSinkron = selectedItems.length > 0 && selectedItems.every(i => i.linkStatus === 'BELUM_SINKRON');

               if (allBelumSinkron) {
                 return (
                    <button type="button" className={styles.btnPrimary} disabled={approvalLocked} onClick={handleBulkSync}>
                      <RefreshCw size={15} /> Sync ke RAB
                    </button>
                 );
               }

               return (
                  <button type="button" className={styles.btnPrimary} disabled={approvalLocked} onClick={handleBulkLink}>
                    Link ke RAB
                  </button>
               );
            })()}
          </div>
        </div>
      )}

      {selectedProjectId && (
        <div>
          {loadingGroups || loadingBv ? (
            <div className={styles.pageState}>
              Memuat data BackUp Volume...
            </div>
          ) : visibleGroups.length === 0 ? (
            <div className={styles.emptyState}>
              {activeFilter === ALL_CATEGORY_FILTER
                ? 'Belum ada Group Pekerjaan. Klik "+ Tambah Group Pekerjaan" untuk memulai.'
                : `Tidak ada group yang memiliki baris pekerjaan kategori ${activeCategoryLabel}.`}
            </div>
          ) : (
            <>
            {pagedGroups.map((g, idx) => {
              const counter = { n: 1 };
              const groupItems = bvByGroup[g.id] || [];
              const groupOrdinal = ((safeGroupPage - 1) * GROUPS_PER_PAGE) + idx;
              const isExpanded = expandedGroupIds.has(g.id);

              return (
                <div key={g.id} className={`${styles.groupBlock} ${isExpanded ? styles.groupBlockExpanded : ''}`}>
                  <div
                    className={styles.groupHead}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => toggleGroup(g.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleGroup(g.id);
                      }
                    }}
                  >
                    <div className={styles.groupTitle}>
                      <ChevronDown className={`${styles.groupChevron} ${isExpanded ? styles.groupChevronOpen : ''}`} size={17} />
                      <span className={styles.groupIndex}>{ROMAN[groupOrdinal] || groupOrdinal + 1}</span>
                      <span>{g.name}</span>
                    </div>
                    <div className={styles.groupActions} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} aria-disabled={approvalLocked} style={approvalLocked ? { pointerEvents: 'none', opacity: 0.5 } : undefined}>
                      <button type="button" className={styles.btnSmall} disabled={approvalLocked} onClick={() => handleOpenAddBv(g.id, null)} title="Tambah Baris">
                        <Plus size={14} /> Baris
                      </button>
                      <button type="button" className={styles.btnSmall} disabled={approvalLocked} onClick={() => handleOpenEditGroup(g)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button type="button" className={[styles.btnSmall, styles.btnDanger].join(' ')} disabled={approvalLocked} onClick={() => handleDeleteGroup(g.id)} title="Hapus">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className={styles.groupContent}>

                  {g.children?.map((sg, sgIdx) => {
                    const subGroupItems = bvByGroup[sg.id] || [];
                    return (
                      <React.Fragment key={sg.id}>
                        <div className={styles.subgroupHead}>
                          <span className={styles.subgroupTitle}>{sgIdx + 1}. {sg.name}</span>
                          <div className={styles.groupActions} aria-disabled={approvalLocked} style={approvalLocked ? { pointerEvents: 'none', opacity: 0.5 } : undefined}>
                            <button type="button" className={styles.btnSmall} disabled={approvalLocked} onClick={() => handleOpenAddBv(sg.id, null)} title="Tambah Baris">
                              <Plus size={14} /> Baris
                            </button>
                            <button type="button" className={styles.btnSmall} disabled={approvalLocked} onClick={() => handleOpenEditGroup(sg)} title="Edit">
                              <Pencil size={14} />
                            </button>
                            <button type="button" className={styles.btnDanger} disabled={approvalLocked} onClick={() => handleDeleteGroup(sg.id)} title="Hapus">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {subGroupItems.length > 0 ? (
                          <div className={styles.tableWrap}>
                            <table className={styles.bvTable}>
                              {renderTableHeader(subGroupItems)}
                              <tbody>{renderItemRows(subGroupItems, counter)}</tbody>
                            </table>
                          </div>
                        ) : (
                          <p className={styles.subgroupEmpty}>Belum ada baris pekerjaan di sub-group ini.</p>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {groupItems.length > 0 && (
                    <div className={styles.tableWrap}>
                      <table className={styles.bvTable}>
                        {renderTableHeader(groupItems)}
                        <tbody>{renderItemRows(groupItems, counter)}</tbody>
                      </table>
                    </div>
                  )}
                  {groupItems.length === 0 && (!g.children || g.children.length === 0) && (
                    <div className={styles.groupEmpty}>
                      <span>Belum ada baris pekerjaan di group ini.</span>
                      <button type="button" className={styles.btnPrimary} onClick={() => handleOpenAddBv(g.id, null)}>
                        <Plus size={14} /> Tambah Baris
                      </button>
                    </div>
                  )}
                    </div>
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

      <BvRabHistoryPanel
        projectId={selectedProjectId}
        module="BV"
        open={historyOpen && !approvalLocked}
        onClose={() => setHistoryOpen(false)}
        onUndone={() => refresh()}
      />

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



