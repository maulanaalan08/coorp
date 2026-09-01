import React, { useState, useEffect } from 'react';
import ProjectSelector from '../components/ProjectSelector';
import styles from '../styles/BackUpVolume.module.css';
import Header from '../components/Header';
import { useProjects } from '../hooks/useProjects';
import { useBvItems } from '../hooks/useBvItems';
import { groupService } from '../services/groupService';
import { hspkService } from '../services/hspkService';
import { Pencil, Trash2, Plus, RefreshCw } from 'lucide-react';
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
    setIsBvModalOpen(true);
  };

  const handleOpenEditBv = (item) => {
    setEditBvItem(item);
    setBvModalGroupId(item.groupId);
    setBvModalParentId(item.parentBvItemId);
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
            </td>
            <td>{it.paymentUnit || ''}</td>
            <td className="num">{it.isHeaderOnly ? '' : Number(it.totalVolume || 0).toFixed(2)}</td>
            <td className="left">{ketText}</td>

            {hasSingleBreakdown ? (
              <>
                <td className="num">{b0.isPChecked ? '☑ ' : ''}{b0.panjang ?? ''}</td>
                <td className="num">{b0.isLChecked ? '☑ ' : ''}{b0.lebar ?? ''}</td>
                <td className="num">{b0.isTChecked ? '☑ ' : ''}{b0.tinggi ?? ''}</td>
                <td className="num">{b0.isLuasChecked ? '☑ ' : ''}{b0.luas ?? ''}</td>
                <td className="num">{b0.isKelChecked ? '☑ ' : ''}{b0.keliling ?? ''}</td>
                <td className="num">{b0.diameter ?? ''}</td>
                <td className="num">{b0.isBeratChecked ? '☑ ' : ''}{b0.berat ?? ''}</td>
                <td className="num">{b0.jumlahSisi ?? ''}</td>
                <td className="num">{b0.jumlahBh ?? ''}</td>
                <td className="num">{b0.waste ?? 0}</td>
              </>
            ) : (
              <td colSpan={10}></td>
            )}

            <td className="num">{it.isHeaderOnly ? '' : Number(it.totalVolume || 0).toFixed(2)}</td>
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
                <td className="num">{b.isPChecked ? '☑ ' : ''}{b.panjang ?? ''}</td>
                <td className="num">{b.isLChecked ? '☑ ' : ''}{b.lebar ?? ''}</td>
                <td className="num">{b.isTChecked ? '☑ ' : ''}{b.tinggi ?? ''}</td>
                <td className="num">{b.isLuasChecked ? '☑ ' : ''}{b.luas ?? ''}</td>
                <td className="num">{b.isKelChecked ? '☑ ' : ''}{b.keliling ?? ''}</td>
                <td className="num">{b.diameter ?? ''}</td>
                <td className="num">{b.isBeratChecked ? '☑ ' : ''}{b.berat ?? ''}</td>
                <td className="num">{b.jumlahSisi ?? ''}</td>
                <td className="num">{b.jumlahBh ?? ''}</td>
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
          <h2 style={{ fontFamily: "'Fraunces', serif" }}>BV — BACK UP VOLUME</h2>
          <p>{selectedProject ? `${selectedProject.name} (${selectedProject.discipline} ${selectedProject.hspkPeriod})` : 'Kelola struktur Group Pekerjaan, Sub-Group, serta rincian dimensi volume.'}</p>
          <div className={styles.headerActions}>
            <button className={styles.btnPrimary} onClick={() => handleOpenAddGroup(null)} disabled={!selectedProjectId}>
              + Tambah Group Pekerjaan
            </button>
          </div>
        </div>
      </div>

      <ProjectSelector
        projectId={selectedProjectId}
        projectList={projects.map(p => ({
          ...p,
          displayName: `${p.name} — ${p.client?.name || '-'} (${p.discipline} ${p.hspkPeriod})`
        }))}
        loading={loadingProjects}
        onChange={(e) => setSelectedProjectId(e.target.value)}
      />

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