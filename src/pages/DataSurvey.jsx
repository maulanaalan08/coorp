import React, { useState, useRef } from 'react';
import styles from '../styles/DataSurvey.module.css';
import Header from '../components/Header';
import {
  Plus, FileDown, Eye, Trash2, ChevronDown, ChevronUp,
  X, Map, RefreshCw, Camera, Edit
} from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useSurveys } from '../hooks/useSurveys';
import { surveyService } from '../services/surveyService';
import toast from 'react-hot-toast';

// ================================================================
// KONSTANTA
// ================================================================
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const emptyArea = () => ({
  areaName: '',
  analisa: '',
  penanganan: '',
  informasiTambahan: '',
  photoCaption: '',
  dimensions: [],
  photosFiles: [],
});

const emptyDim = () => ({
  keterangan: '',
  panjang: '',
  lebar: '',
  tinggi: '',
});

// ================================================================
// SUB-KOMPONEN: AREA FORM CARD
// ================================================================
function AreaFormCard({ area, index, onChange, onRemove }) {
  const fileInputRef = useRef(null);

  const handleField = (field, value) => {
    onChange(index, { ...area, [field]: value });
  };

  const addDim = () => {
    onChange(index, { ...area, dimensions: [...area.dimensions, emptyDim()] });
  };

  const removeDim = (di) => {
    const dims = area.dimensions.filter((_, i) => i !== di);
    onChange(index, { ...area, dimensions: dims });
  };

  const handleDimField = (di, field, value) => {
    const dims = area.dimensions.map((d, i) => i === di ? { ...d, [field]: value } : d);
    onChange(index, { ...area, dimensions: dims });
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    onChange(index, { ...area, photosFiles: [...(area.photosFiles || []), ...files] });
  };

  const removePhoto = (pi) => {
    const photos = area.photosFiles.filter((_, i) => i !== pi);
    onChange(index, { ...area, photosFiles: photos });
  };

  const removeExistingPhoto = (pi) => {
    const urls = area.existingPhotoUrls.filter((_, i) => i !== pi);
    onChange(index, { ...area, existingPhotoUrls: urls });
  };

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  return (
    <div className={styles.areaFormCard}>
      <button type="button" className={styles.removeAreaBtn} onClick={() => onRemove(index)}>
        <X size={16} />
      </button>
      <h4>AREA {index + 1}</h4>

      <div className={styles.formGroup} style={{ marginBottom: 12 }}>
        <label>Nama Area / Ruangan</label>
        <input
          type="text"
          placeholder="mis. R. Tamu, R. Tidur 01"
          value={area.areaName}
          onChange={(e) => handleField('areaName', e.target.value)}
        />
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label>Analisa (kondisi existing)</label>
          <textarea
            placeholder="Kondisi saat ini..."
            value={area.analisa}
            onChange={(e) => handleField('analisa', e.target.value)}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Penanganan (solusi)</label>
          <textarea
            placeholder="Solusi yang ditawarkan..."
            value={area.penanganan}
            onChange={(e) => handleField('penanganan', e.target.value)}
          />
        </div>
      </div>

      <div className={styles.formGroup} style={{ marginTop: 12 }}>
        <label>Informasi Tambahan</label>
        <input
          type="text"
          placeholder="Misal: warna gordain, merk keramik, dll."
          value={area.informasiTambahan}
          onChange={(e) => handleField('informasiTambahan', e.target.value)}
        />
      </div>

      {/* DIMENSI */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.72rem', color: '#7d6733', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em' }}>
            DIMENSI RUANGAN
          </span>
          <button type="button" className={styles.btnIcon} onClick={addDim} style={{ padding: '4px 10px', fontSize: '0.72rem' }}>
            <Plus size={12} /> Tambah Baris
          </button>
        </div>
        {area.dimensions.length > 0 && (
          <table className={styles.dimTable}>
            <thead>
              <tr>
                <th>Keterangan</th>
                <th>P (m)</th>
                <th>L (m)</th>
                <th>T (m)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {area.dimensions.map((dim, di) => (
                <tr key={di}>
                  <td>
                    <input
                      type="text"
                      value={dim.keterangan}
                      onChange={(e) => handleDimField(di, 'keterangan', e.target.value)}
                      placeholder="Jendela kiri..."
                      style={{ width: '100%', background: '#221e15', border: 'none', color: '#f2ead9', padding: '4px 6px', borderRadius: '3px', fontSize: '0.78rem' }}
                    />
                  </td>
                  {['panjang', 'lebar', 'tinggi'].map(f => (
                    <td key={f}>
                      <input
                        type="number"
                        value={dim[f]}
                        onChange={(e) => handleDimField(di, f, e.target.value)}
                        placeholder="0"
                        style={{ width: '100%', background: '#221e15', border: 'none', color: '#f2ead9', padding: '4px 6px', borderRadius: '3px', fontSize: '0.78rem' }}
                      />
                    </td>
                  ))}
                  <td>
                    <button type="button" onClick={() => removeDim(di)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                      <X size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* FOTO */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.72rem', color: '#7d6733', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em' }}>
            FOTO ({(area.photosFiles?.length || 0) + (area.existingPhotoUrls?.length || 0)}/20)
          </span>
          <button type="button" className={styles.btnIcon} onClick={() => fileInputRef.current?.click()} style={{ padding: '4px 10px', fontSize: '0.72rem' }}>
            <Camera size={12} /> Pilih Foto
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handlePhotoSelect}
        />
        {((area.photosFiles?.length > 0) || (area.existingPhotoUrls?.length > 0)) && (
          <div className={styles.photoGrid}>
            {area.existingPhotoUrls?.map((url, pi) => (
              <div key={`exist-${pi}`} style={{ position: 'relative' }}>
                <img
                  src={`${API_BASE}${url}`}
                  alt={`foto lama ${pi + 1}`}
                  className={styles.photoThumb}
                />
                <button
                  type="button"
                  onClick={() => removeExistingPhoto(pi)}
                  style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.9)', border: 'none', color: '#fff', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Hapus foto ini"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {area.photosFiles?.map((file, pi) => (
              <div key={`new-${pi}`} style={{ position: 'relative' }}>
                <img
                  src={URL.createObjectURL(file)}
                  alt={`foto baru ${pi + 1}`}
                  className={styles.photoThumb}
                />
                <button
                  type="button"
                  onClick={() => removePhoto(pi)}
                  style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className={styles.formGroup} style={{ marginTop: 8 }}>
          <label>Caption Foto</label>
          <input
            type="text"
            placeholder="Kondisi kain gordain dan rell R.Tamu"
            value={area.photoCaption}
            onChange={(e) => handleField('photoCaption', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

// ================================================================
// MODAL BUAT/EDIT SURVEY
// ================================================================
function SurveyModal({ isOpen, onClose, projectId, onSuccess, initialData }) {
  const [surveyDate, setSurveyDate] = useState('');
  const [surveyorName, setSurveyorName] = useState('');
  const [notes, setNotes] = useState('');
  const [areas, setAreas] = useState([emptyArea()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setSurveyDate(initialData.surveyDate ? new Date(initialData.surveyDate).toISOString().split('T')[0] : '');
        setSurveyorName(initialData.surveyorName || '');
        setNotes(initialData.notes || '');
        if (initialData.areas && initialData.areas.length > 0) {
          setAreas(initialData.areas.map(a => ({
            id: a.id,
            areaName: a.areaName || '',
            analisa: a.analisa || '',
            penanganan: a.penanganan || '',
            informasiTambahan: a.informasiTambahan || '',
            photoCaption: a.photoCaption || '',
            dimensions: a.dimensions && a.dimensions.length > 0 ? a.dimensions : [],
            existingPhotoUrls: a.photos ? a.photos.map(p => p.url) : [],
            photosFiles: []
          })));
        } else {
          setAreas([emptyArea()]);
        }
      } else {
        setSurveyDate('');
        setSurveyorName('');
        setNotes('');
        setAreas([emptyArea()]);
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleAreaChange = (index, updated) => {
    setAreas(prev => prev.map((a, i) => i === index ? updated : a));
  };

  const handleRemoveArea = (index) => {
    setAreas(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!surveyDate || !surveyorName.trim()) {
      toast.error('Tanggal survey dan nama surveyor wajib diisi.');
      setError('Tanggal survey dan nama surveyor wajib diisi.');
      return;
    }
    if (areas.length === 0) {
      toast.error('Minimal harus ada 1 area.');
      setError('Minimal harus ada 1 area.');
      return;
    }
    for (const area of areas) {
      if (!area.areaName.trim()) {
        toast.error('Semua nama area wajib diisi.');
        setError('Semua nama area wajib diisi.');
        return;
      }
    }

    const savePromise = (async () => {
      const surveyData = {
        surveyDate,
        surveyorName: surveyorName.trim(),
        notes: notes.trim() || null,
        areas: areas.map(area => ({
          id: area.id,
          areaName: area.areaName.trim(),
          analisa: area.analisa.trim() || null,
          penanganan: area.penanganan.trim() || null,
          informasiTambahan: area.informasiTambahan.trim() || null,
          photoCaption: area.photoCaption.trim() || null,
          dimensions: area.dimensions
            .filter(d => d.keterangan || d.panjang || d.lebar || d.tinggi)
            .map(d => ({
              keterangan: d.keterangan || null,
              panjang: d.panjang ? parseFloat(d.panjang) : null,
              lebar: d.lebar ? parseFloat(d.lebar) : null,
              tinggi: d.tinggi ? parseFloat(d.tinggi) : null,
            })),
          existingPhotoUrls: area.existingPhotoUrls || [],
        })),
      };

      const formData = new FormData();
      formData.append('surveyData', JSON.stringify(surveyData));

      areas.forEach((area, areaIndex) => {
        (area.photosFiles || []).forEach((file, photoIndex) => {
          formData.append(`photo_${areaIndex}_${photoIndex}`, file);
        });
      });

      if (initialData) {
        await surveyService.update(initialData.id, formData);
      } else {
        await surveyService.create(projectId, formData);
      }
      return true;
    })();

    setSaving(true);
    setError(null);

    toast.promise(savePromise, {
      loading: 'Menyimpan laporan survey...',
      success: 'Berhasil menyimpan laporan survey!',
      error: 'Gagal menyimpan laporan survey.'
    }).then(() => {
      onSuccess();
      onClose();
      // reset
      setSurveyDate('');
      setSurveyorName('');
      setNotes('');
      setAreas([emptyArea()]);
    }).catch((err) => {
      setError(err.message || 'Gagal menyimpan survey. Coba lagi.');
    }).finally(() => {
      setSaving(false);
    });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox}>
        <div className={styles.modalHeader}>
          <h3>{initialData ? 'Edit Laporan Survey' : 'Buat Laporan Survey Baru'}</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={saving}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && <div className={styles.errorBanner}>{error}</div>}

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Tanggal Survey</label>
                <input
                  type="date"
                  value={surveyDate}
                  onChange={(e) => setSurveyDate(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Nama Surveyor</label>
                <input
                  type="text"
                  placeholder="Nama surveyor..."
                  value={surveyorName}
                  onChange={(e) => setSurveyorName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Catatan Umum (Opsional)</label>
              <textarea
                placeholder="Catatan tambahan mengenai kondisi umum..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* AREA LIST */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: '0.78rem', color: '#a89c85', fontWeight: 600 }}>
                  DAFTAR AREA ({areas.length})
                </span>
                <button
                  type="button"
                  className={styles.btnOutline}
                  onClick={() => setAreas(prev => [...prev, emptyArea()])}
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  <Plus size={14} /> Tambah Area
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {areas.map((area, index) => (
                  <AreaFormCard
                    key={index}
                    area={area}
                    index={index}
                    onChange={handleAreaChange}
                    onRemove={handleRemoveArea}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnOutline} onClick={onClose} disabled={saving}>
              Batal
            </button>
            <button type="submit" className={styles.btnGold} disabled={saving}>
              {saving ? <><RefreshCw size={14} className="button-spinner" /> Menyimpan...</> : <><Map size={14} /> Simpan Laporan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ================================================================
// SUB-KOMPONEN: BARIS SURVEY DENGAN EXPAND DETAIL
// ================================================================
function SurveyRow({ survey, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Hapus laporan survey tanggal ${new Date(survey.surveyDate).toLocaleDateString('id-ID')}?`)) return;
    setDeleting(true);
    
    toast.promise(onDelete(survey.id), {
      loading: 'Menghapus survey...',
      success: 'Berhasil menghapus survey!',
      error: 'Gagal menghapus survey.'
    }).catch((err) => {
      console.error(err);
    }).finally(() => {
      setDeleting(false);
    });
  };

  return (
    <>
      <tr>
        <td>
          {new Date(survey.surveyDate).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
          })}
        </td>
        <td>{survey.surveyorName}</td>
        <td>
          <span className={styles.areaBadge}>
            {survey.areas?.length || 0} area
          </span>
        </td>
        <td>{survey.notes ? survey.notes.substring(0, 60) + (survey.notes.length > 60 ? '...' : '') : '-'}</td>
        <td>
          <div className={styles.actionsCell}>
            <button
              className={styles.btnIcon}
              type="button"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? 'Tutup' : 'Detail'}
            </button>
            <button
              className={styles.btnIcon}
              type="button"
              onClick={() => onEdit(survey)}
            >
              <Edit size={14} /> Edit
            </button>
            <a
              href={surveyService.getPdfViewUrl(survey.id)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnIcon}
              style={{ textDecoration: 'none' }}
            >
              <Eye size={14} /> PDF
            </a>
            <a
              href={surveyService.getPdfDownloadUrl(survey.id)}
              className={styles.btnGold}
              style={{ textDecoration: 'none', padding: '7px 12px', fontSize: '0.78rem' }}
            >
              <FileDown size={13} /> Unduh
            </a>
            <button
              className={styles.btnDanger}
              type="button"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 size={13} />
              {deleting ? '...' : ''}
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={5} style={{ padding: 0 }}>
            <div className={styles.detailPanel}>
              <div className={styles.detailGrid}>
                {survey.areas?.map((area, ai) => (
                  <div key={ai} className={styles.areaCard}>
                    <h5>{area.areaName}</h5>
                    {area.analisa && (
                      <p><span style={{ color: '#7d6733' }}>Analisa:</span> {area.analisa}</p>
                    )}
                    {area.penanganan && (
                      <p><span style={{ color: '#7d6733' }}>Penanganan:</span> {area.penanganan}</p>
                    )}
                    {area.informasiTambahan && (
                      <p><span style={{ color: '#7d6733' }}>Info:</span> {area.informasiTambahan}</p>
                    )}

                    {/* DIMENSI */}
                    {area.dimensions?.length > 0 && (
                      <table className={styles.dimTable} style={{ marginTop: 10 }}>
                        <thead>
                          <tr>
                            <th>Ket.</th>
                            <th>P</th>
                            <th>L</th>
                            <th>T</th>
                            <th>Luas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {area.dimensions.map((dim, di) => (
                            <tr key={di}>
                              <td>{dim.keterangan || '-'}</td>
                              <td>{dim.panjang ?? '-'}</td>
                              <td>{dim.lebar ?? '-'}</td>
                              <td>{dim.tinggi ?? '-'}</td>
                              <td style={{ color: '#e8c874' }}>{dim.luasan ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {/* FOTO */}
                    {area.photos?.length > 0 && (
                      <>
                        {area.photoCaption && (
                          <p style={{ marginTop: 8, fontSize: '0.75rem', color: '#7d6733', fontStyle: 'italic' }}>
                            {area.photoCaption}
                          </p>
                        )}
                        <div className={styles.photoGrid} style={{ marginTop: 6 }}>
                          {area.photos.map((photo, pi) => (
                            <a
                              key={pi}
                              href={`${API_BASE}${photo.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={`${API_BASE}${photo.url}`}
                                alt={`foto area ${ai + 1} no ${pi + 1}`}
                                className={styles.photoThumb}
                              />
                            </a>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ================================================================
// KOMPONEN UTAMA — DATA SURVEY PAGE
// ================================================================
const DataSurvey = () => {
  const { projects, loading: loadingProjects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState(null);

  const { surveys, loading: loadingSurveys, error: surveyError, refresh, deleteSurvey } = useSurveys(selectedProjectId);

  React.useEffect(() => {
    if (loadingSurveys) {
      toast.loading('Memuat data survey...', { id: 'loading-surveys' });
    } else {
      toast.dismiss('loading-surveys');
      if (surveyError) {
        toast.error('Gagal memuat data survey');
      }
    }
  }, [loadingSurveys, surveyError]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className={styles.wrapper}>
      <Header />

      {/* PAGE HEADER */}
      <div className={styles.pageHeader}>
        <div className={styles.titleBlock}>
          <h2>DATA SURVEY</h2>
          <p>Kelola laporan survei lapangan dan generate PDF profesional.</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.btnGold}
            type="button"
            onClick={() => { setEditingSurvey(null); setIsModalOpen(true); }}
            disabled={!selectedProjectId}
            title={!selectedProjectId ? 'Pilih project terlebih dahulu' : 'Buat survey baru'}
          >
            <Plus size={16} /> Buat Laporan Survey
          </button>
        </div>
      </div>

      {/* PROJECT SELECTOR */}
      <div className={styles.projectSelector}>
        <div className={styles.selectorLabel}>Pilih Project</div>
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

      {/* STATS */}
      {selectedProjectId && (
        <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <p className={styles.statNum}>{surveys.length}</p>
            <p className={styles.statLbl}>Total Laporan Survey</p>
          </div>
          <div className={styles.statBox}>
            <p className={styles.statNum}>
              {surveys.reduce((acc, s) => acc + (s.areas?.length || 0), 0)}
            </p>
            <p className={styles.statLbl}>Total Area Disurvei</p>
          </div>
          <div className={styles.statBox}>
            <p className={styles.statNum}>
              {surveys.reduce((acc, s) =>
                acc + (s.areas?.reduce((a, area) => a + (area.photos?.length || 0), 0) || 0), 0
              )}
            </p>
            <p className={styles.statLbl}>Total Foto Dokumentasi</p>
          </div>
        </div>
      )}

      {/* TABLE SURVEYS */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <div className={styles.titleAccent} />
            <h3>
              Daftar Laporan Survey
              {selectedProject ? ` — ${selectedProject.name}` : ''}
            </h3>
          </div>
          {selectedProjectId && (
            <button className={styles.btnOutline} type="button" onClick={refresh}>
              <RefreshCw size={14} /> Refresh
            </button>
          )}
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>TANGGAL SURVEY</th>
                <th>SURVEYOR</th>
                <th>AREA</th>
                <th>CATATAN</th>
                <th>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {!selectedProjectId ? (
                <tr>
                  <td colSpan={5} className={styles.noData}>
                    Pilih project untuk melihat data survey.
                  </td>
                </tr>
              ) : loadingSurveys ? (
                <tr>
                  <td colSpan={5} className={styles.noData}>
                    <RefreshCw size={18} style={{ display: 'inline', marginRight: 8 }} />
                    Memuat data survey...
                  </td>
                </tr>
              ) : surveyError ? (
                <tr>
                  <td colSpan={5} className={styles.noData} style={{ color: '#ef4444' }}>
                    {surveyError}
                  </td>
                </tr>
              ) : surveys.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.noData}>
                    Belum ada laporan survey untuk project ini.{' '}
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      style={{ background: 'none', border: 'none', color: '#c9a24b', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.88rem' }}
                    >
                      Buat sekarang
                    </button>
                  </td>
                </tr>
              ) : (
                surveys.map(survey => (
                  <SurveyRow
                    key={survey.id}
                    survey={survey}
                    onDelete={deleteSurvey}
                    onEdit={() => { setEditingSurvey(survey); setIsModalOpen(true); }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL BUAT SURVEY */}
      <SurveyModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingSurvey(null); }}
        projectId={selectedProjectId}
        onSuccess={refresh}
        initialData={editingSurvey}
      />
    </div>
  );
};

export default DataSurvey;
