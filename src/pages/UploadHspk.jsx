import React, { useState, useEffect, useCallback } from 'react';
import styles from '../styles/UploadHspk.module.css';
import { UploadCloud, FileText, AlertCircle, RotateCcw, Trash2, Loader2, History } from 'lucide-react';
import Header from '../components/Header';
import { hspkService } from '../services/hspkService';
import toast from 'react-hot-toast';

function UploadHspk() {
  const [file, setFile] = useState(null);
  const [period, setPeriod] = useState('');
  const [workCategoryId, setWorkCategoryId] = useState('');
  const [grade, setGrade] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [workCategories, setWorkCategories] = useState([]);

  // Riwayat upload
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingBatch, setEditingBatch] = useState(null);

  // Ambil kategori master dari API
  useEffect(() => {
    fetch(`${(import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '')}/api/work-categories`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setWorkCategories(Array.isArray(data) ? data.filter(c => c.isActive) : []))
      .catch(() => setWorkCategories([]));
  }, []);

  const loadBatches = useCallback(async () => {
    setBatchesLoading(true);
    try {
      const data = await hspkService.getBatches();
      setBatches(Array.isArray(data) ? data : []);
    } catch (err) {
      setBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const selectedCategory = workCategories.find(c => c.id === workCategoryId);
  const gradeChoices = editingBatch
    ? (editingBatch.grades || [])
    : selectedCategory ? ['A', 'B', 'C', 'D'] : [];

  const handleCategoryChange = (e) => {
    setWorkCategoryId(e.target.value);
    setGrade('');
  };

  // EDIT = upload ulang: prefill form sesuai batch, user tinggal pilih file baru
  const handleEditBatch = (batch) => {
    setEditingBatch(batch);
    setPeriod(String(batch.period));
    setWorkCategoryId(batch.workCategory?.id || '');
    setGrade((batch.grades && batch.grades[0]) || '');
    setFile(null);
    setResult(null);
    setError(null);
    // scroll ke form upload
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(`Mode edit: upload ulang untuk "${batch.filename}" (periode ${batch.period}${batch.workCategory ? `, ${batch.workCategory.code}` : ''}). Pilih file baru lalu Upload.`, { icon: '✏️' });
  };

  const handleDeleteBatch = async (batch) => {
    if (!window.confirm(
      `Yakin hapus upload "${batch.filename}" (periode ${batch.period}${batch.workCategory ? ` · ${batch.workCategory.code}` : ''})?\n\n` +
      `Ini menghapus ${batch.jobTypeCount} AHSP dan komponennya. Item BV/RAB yang sudah dipakai tidak dihapus, hanya lepas tautan masternya.`
    )) return;
    setDeletingId(batch.id);
    try {
      const res = await hspkService.deleteBatch(batch.id);
      toast.success(res?.message || 'Upload dihapus.');
      await loadBatches();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus upload.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Pilih file Excel terlebih dahulu.');
      setError('Pilih file Excel terlebih dahulu.');
      return;
    }
    if (!period) {
      toast.error('Isi tahun (period) HSPK.');
      setError('Isi tahun (period) HSPK.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    form.append('file', file);
    form.append('period', period);
    if (workCategoryId) {
      form.append('workCategoryId', workCategoryId);
    } else if (selectedCategory) {
      // Legacy: kirim discipline dari kode kategori terpilih
      form.append('discipline', selectedCategory.code);
    }
    form.append('grade', grade);

    toast.promise(hspkService.upload(form), {
      loading: 'Mengunggah HSPK...',
      success: 'Berhasil mengunggah HSPK!',
      error: 'Gagal mengunggah HSPK.'
    }).then(data => {
      setResult(data);
      setEditingBatch(null);
      loadBatches();
    }).catch(err => {
      setError('Gagal: ' + err.message);
    }).finally(() => {
      setLoading(false);
    });
  };

  // Drag and Drop Handler
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        setFile(droppedFile);
      } else {
        toast.error('Format file tidak didukung. Harap unggah file .xlsx');
        setError('Format file tidak didukung. Harap unggah file .xlsx');
      }
    }
  };

  return (
    <div className={styles.uploadWrapper}>
      <Header />

      <div className={styles.cardContainer}>
        {/* Header Judul & Note Inline */}
        <div className={styles.headerTitleGroup}>
          <h2 className={styles.hspkTitle}>UPLOAD HSPK / AHSP</h2>
          <span className={styles.hspkNote}>
            Upload HSPK hanya sekali jika tidak ada perubahan data master.
          </span>
        </div>

        {/* DRAG & DROP ZONE */}
        <div className={styles.hspkField}>
          <label className={styles.hspkLabel}>FILE EXCEL (.XLSX)</label>
          <div
            className={`${styles.dropZone} ${isDragActive ? styles.dragActive : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className={styles.uploadIconBox}>
              <UploadCloud size={24} />
            </div>
            <p className={styles.dragText}>Drag and drop your Excel file here</p>
            <span className={styles.orText}>or</span>
            <label className={styles.chooseBtn}>
              <FileText size={15} /> Choose File
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files[0] || null)}
                hidden
              />
            </label>
            <span className={styles.supportedFormat}>SUPPORTED FORMAT: .XLSX ONLY</span>
            {file && (
              <span className={styles.fileNameDisplay}>File Terpilih: {file.name}</span>
            )}
          </div>
        </div>

        {/* INPUT TAHUN (PERIOD) */}
        <div className={styles.hspkField}>
          <label className={styles.hspkLabel}>TAHUN (PERIOD)</label>
          <input
            type="number"
            className={styles.hspkInput}
            placeholder="mis. 2026"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>

        {/* KATEGORI PEKERJAAN & GRADE (BARIS 2 KOLOM) */}
        <div className={styles.formRowGrid}>
          <div className={styles.hspkField}>
            <label className={styles.hspkLabel}>KATEGORI PEKERJAAN</label>
            <select
              className={styles.hspkSelect}
              value={workCategoryId}
              onChange={handleCategoryChange}
            >
              <option value="">– Pilih Kategori –</option>
              {workCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name} ({cat.code})</option>
              ))}
            </select>
          </div>

          <div className={styles.hspkField}>
            <label className={styles.hspkLabel}>GRADE</label>
            <select
              className={styles.hspkSelect}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              <option value="">– Pilih Grade –</option>
              {gradeChoices.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        {/* MODE EDIT BANNER */}
        {editingBatch && (
          <div className={styles.editModeBanner}>
            <RotateCcw size={15} />
            <span>
              Mode edit: mengganti upload <strong>{editingBatch.filename}</strong>
              {editingBatch.workCategory ? ` (${editingBatch.workCategory.code})` : ''} periode {editingBatch.period}
              {' '}— pilih file baru lalu klik Upload.
            </span>
            <button
              type="button"
              className={styles.editModeCancel}
              onClick={() => setEditingBatch(null)}
            >
              Batal
            </button>
          </div>
        )}

        {/* TOMBOL UPLOAD KUNING/GOLD */}
        <button
          className={styles.hspkUploadBtn}
          onClick={handleUpload}
          disabled={loading}
          type="button"
        >
          <UploadCloud size={18} /> {loading ? 'Uploading...' : (editingBatch ? 'Upload Ulang (Ganti Data)' : 'Upload Data')}
        </button>

        {error && (
          <div className={styles.hspkError}>
            <AlertCircle size={16} style={{ display: 'inline', marginRight: '8px' }} />
            {error}
          </div>
        )}

      </div>

      {/* ===================== RIWAYAT UPLOAD ===================== */}
      <div className={styles.cardContainer}>
        <div className={styles.headerTitleGroup}>
          <h2 className={styles.hspkTitle}><History size={18} style={{ verticalAlign: '-3px' }} /> RIWAYAT UPLOAD AHSP</h2>
          <span className={styles.hspkNote}>
            Edit berarti upload ulang dengan periode/kategori/grade yang sama — data lama otomatis diganti, tidak double.
          </span>
        </div>

        {batchesLoading ? (
          <div className={styles.historyEmpty}>
            <Loader2 size={22} className={styles.spinIcon} />
            <span>Memuat riwayat...</span>
          </div>
        ) : batches.length === 0 ? (
          <div className={styles.historyEmpty}>
            <span>Belum ada AHSP yang di-upload.</span>
          </div>
        ) : (
          <div className={styles.historyTableWrap}>
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>PERIODE</th>
                  <th>KATEGORI</th>
                  <th>GRADE</th>
                  <th>FILE</th>
                  <th>JOB AHSP</th>
                  <th>HARGA DASAR</th>
                  <th>STATUS</th>
                  <th>DI-UPLOAD</th>
                  <th>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td className={styles.monoCell}>{b.period}</td>
                    <td>
                      <span className={styles.catBadge}>
                        {b.workCategory?.code || b.discipline || '—'}
                      </span>
                    </td>
                    <td className={styles.monoCell}>{(b.grades && b.grades.join(', ')) || '—'}</td>
                    <td className={styles.fileCell} title={b.filename}>{b.filename}</td>
                    <td className={styles.monoCell}>{b.jobTypeCount}</td>
                    <td className={styles.monoCell}>{b.priceItemCount}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${b.status === 'SUCCESS' ? styles.statusSuccess : b.status === 'PARTIAL' ? styles.statusPartial : styles.statusFailed}`}>
                        {b.status === 'SUCCESS' ? 'LENGKAP' : b.status === 'PARTIAL' ? 'SEBAGIAN' : b.status}
                      </span>
                    </td>
                    <td className={styles.monoCell}>
                      {b.createdAt ? new Date(b.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td>
                      <div className={styles.actionBtns}>
                        <button
                          className={styles.iconBtn}
                          onClick={() => handleEditBatch(b)}
                          title="Edit (upload ulang)"
                        >
                          <RotateCcw size={15} />
                        </button>
                        <button
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                          onClick={() => handleDeleteBatch(b)}
                          disabled={deletingId === b.id}
                          title="Hapus"
                        >
                          {deletingId === b.id ? <Loader2 size={15} className={styles.spinIcon} /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default UploadHspk;