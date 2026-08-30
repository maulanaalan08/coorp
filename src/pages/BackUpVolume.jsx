import React, { useState, useEffect } from 'react';
import styles from '../styles/BackUpVolume.module.css';
import Header from '../components/Header';
import { useProjects } from '../hooks/useProjects';
import { useBvItems } from '../hooks/useBvItems';
import { groupService } from '../services/groupService';
import { hspkService } from '../services/hspkService';

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
          <h3>{editGroup ? 'Edit Group/Sub-Group' : parentId ? 'Tambah Sub-Group Pekerjaan' : 'Tambah Group Pekerjaan'}</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        {error && <div style={{ color: '#ff6b6b', background: '#3a1c1c', padding: 8, borderRadius: 3, marginBottom: 10, fontSize: 11 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Nama</label>
            <input
              type="text"
              placeholder="mis. PEKERJAAN PASANGAN"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Referensi (opsional)</label>
            <input
              type="text"
              placeholder="mis. III / A"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
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
function BvItemModal({ isOpen, onClose, projectId, groupId, parentBvItemId, editItem, hspkPeriod, onSuccess }) {
  const [mode, setMode] = useState('hspk');
  const [sourceJobTypeId, setSourceJobTypeId] = useState('');
  const [name, setName] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [paymentUnit, setPaymentUnit] = useState('');
  const [ecommerceLink, setEcommerceLink] = useState('');

  const [jobTypes, setJobTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [breakdowns, setBreakdowns] = useState([
    {
      keterangan: '',
      panjang: '', isPChecked: true,
      lebar: '', isLChecked: true,
      tinggi: '', isTChecked: false,
      luas: '', isLuasChecked: false,
      keliling: '', isKelChecked: false,
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
        if (editItem.breakdowns?.length > 0) {
          setBreakdowns(editItem.breakdowns.map(b => ({
            keterangan: b.keterangan || '',
            panjang: b.panjang ?? '', isPChecked: !!b.isPChecked,
            lebar: b.lebar ?? '', isLChecked: !!b.isLChecked,
            tinggi: b.tinggi ?? '', isTChecked: !!b.isTChecked,
            luas: b.luas ?? '', isLuasChecked: !!b.isLuasChecked,
            keliling: b.keliling ?? '', isKelChecked: !!b.isKelChecked,
            berat: b.berat ?? '', isBeratChecked: !!b.isBeratChecked,
            jumlahSisi: b.jumlahSisi ?? 1,
            jumlahBh: b.jumlahBh ?? 1,
            waste: b.waste ?? 0,
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
          berat: '', isBeratChecked: false,
          jumlahSisi: 1, jumlahBh: 1, waste: 0,
        }]);
      }
      setError(null);
    }
  }, [isOpen, editItem, parentBvItemId, hspkPeriod]);

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
      berat: '', isBeratChecked: false,
      jumlahSisi: 1, jumlahBh: 1, waste: 0,
    }]);
  };

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
        breakdowns: isHeaderOnly ? [] : breakdowns.map(b => ({
          keterangan: b.keterangan || null,
          panjang: b.panjang !== '' ? parseFloat(b.panjang) : null,
          isPChecked: b.isPChecked,
          lebar: b.lebar !== '' ? parseFloat(b.lebar) : null,
          isLChecked: b.isLChecked,
          tinggi: b.tinggi !== '' ? parseFloat(b.tinggi) : null,
          isTChecked: b.isTChecked,
          luas: b.luas !== '' ? parseFloat(b.luas) : null,
          isLuasChecked: b.isLuasChecked,
          keliling: b.keliling !== '' ? parseFloat(b.keliling) : null,
          isKelChecked: b.isKelChecked,
          berat: b.berat !== '' ? parseFloat(b.berat) : null,
          isBeratChecked: b.isBeratChecked,
          jumlahSisi: b.jumlahSisi !== '' ? parseFloat(b.jumlahSisi) : 1,
          jumlahBh: b.jumlahBh !== '' ? parseFloat(b.jumlahBh) : 1,
          waste: b.waste !== '' ? parseFloat(b.waste) : 0,
        })),
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

                    <div className={styles.dimHeaderLabel}>Panjang | Lebar | Tinggi | Luas | Keliling</div>
                    <div className={styles.dimGridRow}>
                      {[
                        { key: 'panjang', checkKey: 'isPChecked', label: 'P' },
                        { key: 'lebar', checkKey: 'isLChecked', label: 'L' },
                        { key: 'tinggi', checkKey: 'isTChecked', label: 'T' },
                        { key: 'luas', checkKey: 'isLuasChecked', label: 'Luas' },
                        { key: 'keliling', checkKey: 'isKelChecked', label: 'Kel' },
                      ].map(f => (
                        <div key={f.key} className={styles.dimCheckGroup}>
                          <input
                            type="checkbox"
                            checked={b[f.checkKey]}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setBreakdowns(prev => prev.map((item, idx) => idx === i ? { ...item, [f.checkKey]: checked } : item));
                            }}
                          />
                          <input
                            type="number"
                            step="0.01"
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
                          type="number"
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
                          type="number"
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
                          type="number"
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
export default function BackUpVolume() {
  const { projects, loading: loadingProjects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const { bvItems, loading: loadingBv, refresh, deleteBvItem, deleteBulk, linkToRab, linkToRabBulk } = useBvItems(selectedProjectId);

  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [checkedIds, setCheckedIds] = useState([]);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupModalParentId, setGroupModalParentId] = useState(null);
  const [editGroup, setEditGroup] = useState(null);

  const [isBvModalOpen, setIsBvModalOpen] = useState(false);
  const [bvModalGroupId, setBvModalGroupId] = useState(null);
  const [bvModalParentId, setBvModalParentId] = useState(null);
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
      await groupService.delete(groupId);
      fetchGroups();
      refresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenAddBv = (groupId = null, parentBvItemId = null) => {
    setEditBvItem(null);
    setBvModalGroupId(groupId);
    setBvModalParentId(parentBvItemId);
    setIsBvModalOpen(true);
  };

  const handleOpenEditBv = (item) => {
    setEditBvItem(item);
    setBvModalGroupId(item.groupId);
    setBvModalParentId(item.parentBvItemId);
    setIsBvModalOpen(true);
  };

  const handleToggleCheck = (id) => {
    setCheckedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleToggleCheckAll = () => {
    if (checkedIds.length === bvItems.length) {
      setCheckedIds([]);
    } else {
      setCheckedIds(bvItems.map(i => i.id));
    }
  };

  const handleBulkDelete = async () => {
    if (checkedIds.length === 0) return;
    if (!window.confirm(`Yakin ingin menghapus ${checkedIds.length} item secara permanen?`)) return;
    try {
      await deleteBulk(checkedIds);
      setCheckedIds([]);
      fetchGroups();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBulkLink = async () => {
    if (checkedIds.length === 0) return;
    if (!window.confirm(`Link ${checkedIds.length} item terpilih ke RAB?`)) return;
    try {
      await linkToRabBulk(checkedIds);
      setCheckedIds([]);
      refresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // SESUAI REQUEST: Disesuaikan dengan struktur tableHeader yang diberikan
  const renderTableHeader = () => (
    <thead>
      <tr>
        <th rowSpan={2} style={{ width: 40, textAlign: 'center', verticalAlign: 'middle' }}>
          <input
            type="checkbox"
            id="checkAllBv"
            onChange={handleToggleCheckAll}
            checked={checkedIds.length > 0 && checkedIds.length === bvItems.length}
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
  );

  const renderItemRows = (items, counterObj) => {
    return items.map((it) => {
      const no = it.isHeaderOnly ? counterObj.n++ : it.parentBvItemId ? "" : counterObj.n++;
      const isChild = !!it.parentBvItemId;
      const isChecked = checkedIds.includes(it.id);
      const hasSingleBreakdown = it.breakdowns && it.breakdowns.length === 1;
      const b0 = hasSingleBreakdown ? it.breakdowns[0] : null;

      let ketText = it.sourceJobType
        ? "HSPK: " + (it.sourceJobType.reference || "")
        : it.isHeaderOnly ? "" : (it.keterangan || "-");

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
            </td>
            <td>{it.paymentUnit || ''}</td>
            <td className="num">{it.isHeaderOnly ? '' : Number(it.totalVolume || 0).toFixed(2)}</td>
            <td className="left">{ketText}</td>

            {hasSingleBreakdown ? (
              <>
                <td className="num">{b0.isPChecked ? '☑ ' : ''}{b0.panjang ?? '-'}</td>
                <td className="num">{b0.isLChecked ? '☑ ' : ''}{b0.lebar ?? '-'}</td>
                <td className="num">{b0.isTChecked ? '☑ ' : ''}{b0.tinggi ?? '-'}</td>
                <td className="num">{b0.isLuasChecked ? '☑ ' : ''}{b0.luas ?? '-'}</td>
                <td className="num">{b0.isKelChecked ? '☑ ' : ''}{b0.keliling ?? '-'}</td>
                <td className="num">{b0.diameter ?? '-'}</td>
                <td className="num">{b0.isBeratChecked ? '☑ ' : ''}{b0.berat ?? '-'}</td>
                <td className="num">{b0.jumlahSisi ?? '-'}</td>
                <td className="num">{b0.jumlahBh ?? '-'}</td>
                <td className="num">{b0.waste ?? 0}</td>
              </>
            ) : (
              <td colSpan={10}></td>
            )}

            <td className="num">{it.isHeaderOnly ? '' : Number(it.totalVolume || 0).toFixed(2)}</td>
            <td>{it.paymentUnit || ''}</td>
            <td>{it.ecommerceLink || '-'}</td>
            <td>
              {it.isHeaderOnly ? '' : (
                <span className={it.linkStatus === 'SUDAH_DILINK' ? styles.badgeSinkron : styles.badgeBelum}>
                  {it.linkStatus === 'SUDAH_DILINK' ? 'Sudah di-link' : 'Belum di-link'}
                </span>
              )}
            </td>
            <td>
              <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                <button type="button" className={styles.btnSmall} onClick={() => handleOpenEditBv(it)}>Edit</button>
                {(!it.linkStatus || it.linkStatus === 'BELUM_DILINK') && (
                  <button type="button" className={styles.btnGreen} onClick={() => linkToRab(it.id, { includeChildren: true })}>
                    Link
                  </button>
                )}
                {!it.parentBvItemId && (
                  <button type="button" className={styles.btnSmall} onClick={() => handleOpenAddBv(it.groupId, it.id)}>+ Sub</button>
                )}
                <button type="button" className={styles.btnDanger} onClick={() => deleteBvItem(it.id)}>Hapus</button>
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
                <td className="num">{b.isPChecked ? '☑ ' : ''}{b.panjang ?? '-'}</td>
                <td className="num">{b.isLChecked ? '☑ ' : ''}{b.lebar ?? '-'}</td>
                <td className="num">{b.isTChecked ? '☑ ' : ''}{b.tinggi ?? '-'}</td>
                <td className="num">{b.isLuasChecked ? '☑ ' : ''}{b.luas ?? '-'}</td>
                <td className="num">{b.isKelChecked ? '☑ ' : ''}{b.keliling ?? '-'}</td>
                <td className="num">{b.diameter ?? '-'}</td>
                <td className="num">{b.isBeratChecked ? '☑ ' : ''}{b.berat ?? '-'}</td>
                <td className="num">{b.jumlahSisi ?? '-'}</td>
                <td className="num">{b.jumlahBh ?? '-'}</td>
                <td className="num">{b.waste ?? 0}</td>
                <td className="num">{Number(b.subTotal || 0).toFixed(2)}</td>
                <td colSpan={4}></td>
              </tr>
            ))
          )}

          {it.children && renderItemRows(it.children, counterObj)}
        </React.Fragment>
      );
    });
  };

  const bvByGroup = {};
  bvItems.forEach(it => {
    const gid = it.groupId || 'none';
    if (!bvByGroup[gid]) bvByGroup[gid] = [];
    bvByGroup[gid].push(it);
  });

  return (
    <div className={styles.bvWrapper}>
      <Header />

      <div className={styles.bvHeader}>
        <div className={styles.headerTitle}>
          <h2>BV — BACK UP VOLUME</h2>
          <p>{selectedProject ? `${selectedProject.name} (${selectedProject.discipline} ${selectedProject.hspkPeriod})` : 'Kelola struktur Group Pekerjaan, Sub-Group, serta rincian dimensi volume.'}</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnPrimary} onClick={() => handleOpenAddGroup(null)} disabled={!selectedProjectId}>
            + Tambah Group Pekerjaan
          </button>
          <button className={styles.btnOutline} onClick={() => handleOpenAddGroup(null)} disabled={!selectedProjectId}>
            + Tambah Sub-Group Pekerjaan
          </button>
        </div>
      </div>

      <div className={styles.projectCard}>
        <div className={styles.selectorLabel}>PILIH PROJECT</div>
        <select
          className={styles.selectProject}
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
        >
          <option value="">— Pilih Project —</option>
          {loadingProjects ? (
            <option disabled>Memuat projects...</option>
          ) : (
            projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.client?.name || '-'} ({p.discipline} {p.hspkPeriod})
              </option>
            ))
          )}
        </select>
      </div>

      {checkedIds.length > 0 && (
        <div style={{ padding: '10px 14px', background: '#1c1c1c', border: '1px dashed #d4af37', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontWeight: 'bold', color: '#f3e5ab' }}>
            ✅ {checkedIds.length} Item Terpilih
          </span>
          <button type="button" className={styles.btnDanger} onClick={handleBulkDelete}>
            🗑️ Hapus Massal
          </button>
          <button type="button" className={styles.btnGreen} onClick={handleBulkLink}>
            🔗 Link ke RAB Massal
          </button>
        </div>
      )}

      {selectedProjectId && (
        <div>
          {loadingGroups || loadingBv ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
              Memuat data BackUp Volume...
            </div>
          ) : groups.length === 0 && bvItems.length === 0 ? (
            <div className={styles.groupBlock} style={{ padding: 20, textAlign: 'center', color: '#888' }}>
              Belum ada Group Pekerjaan. Klik "+ Tambah Group Pekerjaan" untuk memulai.
            </div>
          ) : (
            groups.map((g, idx) => {
              const counter = { n: 1 };
              const groupItems = bvByGroup[g.id] || [];

              return (
                <div key={g.id} className={styles.groupBlock}>
                  <div className={styles.groupHead}>
                    <span>{ROMAN[idx] || idx + 1}. {g.name}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button type="button" className={styles.btnSmall} onClick={() => handleOpenAddBv(g.id, null)}>+ Baris</button>
                      <button type="button" className={styles.btnSmall} onClick={() => handleOpenAddGroup(g.id)}>+ Sub-Group</button>
                      <button type="button" className={styles.btnSmall} onClick={() => handleOpenEditGroup(g)}>Edit</button>
                      <button type="button" className={styles.btnDanger} onClick={() => handleDeleteGroup(g.id)}>Hapus</button>
                    </div>
                  </div>

                  {g.children?.map((sg, sgIdx) => {
                    const subGroupItems = bvByGroup[sg.id] || [];
                    return (
                      <React.Fragment key={sg.id}>
                        <div className={styles.subgroupHead}>
                          <span>{sgIdx + 1}. {sg.name}</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button type="button" className={styles.btnSmall} onClick={() => handleOpenAddBv(sg.id, null)}>+ Baris</button>
                            <button type="button" className={styles.btnSmall} onClick={() => handleOpenEditGroup(sg)}>Edit</button>
                            <button type="button" className={styles.btnDanger} onClick={() => handleDeleteGroup(sg.id)}>Hapus</button>
                          </div>
                        </div>
                        {subGroupItems.length > 0 ? (
                          <table className={styles.bvTable}>
                            {renderTableHeader()}
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
                      {renderTableHeader()}
                      <tbody>{renderItemRows(groupItems, counter)}</tbody>
                    </table>
                  )}
                </div>
              );
            })
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
        hspkPeriod={selectedProject?.hspkPeriod}
        onSuccess={() => { refresh(); fetchGroups(); }}
      />
    </div>
  );
}