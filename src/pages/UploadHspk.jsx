import React, { useState } from 'react';
import styles from '../styles/UploadHspk.module.css';
import { UploadCloud, FileText, AlertCircle } from 'lucide-react';
import Header from '../components/Header';

const GRADE_OPTIONS = {
  SIPIL: ['A', 'B'],
  INTERIOR: ['A', 'B', 'C'],
};

function UploadHspk() {
  const [file, setFile] = useState(null);
  const [period, setPeriod] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [grade, setGrade] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const gradeChoices = discipline ? GRADE_OPTIONS[discipline] : [];

  const handleDisciplineChange = (e) => {
    setDiscipline(e.target.value);
    setGrade('');
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
        setError('Format file tidak didukung. Harap unggah file .xlsx');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Pilih file Excel terlebih dahulu.');
      return;
    }
    if (!period) {
      setError('Isi tahun (period) HSPK.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    form.append('file', file);
    form.append('period', period);
    form.append('discipline', discipline);
    form.append('grade', grade);

    try {
      const res = await fetch('http://localhost:4000/api/upload', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Proses upload gagal.');
      }

      setResult(data);
    } catch (err) {
      setError('Gagal: ' + err.message);
    } finally {
      setLoading(false);
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

        {/* DISIPLIN & GRADE (BARIS 2 KOLOM) */}
        <div className={styles.formRowGrid}>
          <div className={styles.hspkField}>
            <label className={styles.hspkLabel}>DISIPLIN</label>
            <select
              className={styles.hspkSelect}
              value={discipline}
              onChange={handleDisciplineChange}
            >
              <option value="">– Pilih Disiplin –</option>
              <option value="SIPIL">Sipil</option>
              <option value="INTERIOR">Interior</option>
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

        {/* TOMBOL UPLOAD KUNING/GOLD */}
        <button
          className={styles.hspkUploadBtn}
          onClick={handleUpload}
          disabled={loading}
          type="button"
        >
          <UploadCloud size={18} /> {loading ? 'Uploading...' : 'Upload Data'}
        </button>

        {error && (
          <div className={styles.hspkError}>
            <AlertCircle size={16} style={{ display: 'inline', marginRight: '8px' }} />
            {error}
          </div>
        )}

        {result && (
          <pre className={styles.hspkResult}>
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

export default UploadHspk;