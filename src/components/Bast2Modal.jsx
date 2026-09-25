import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from '../styles/BastPage.module.css';

const Bast2Modal = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState({
    bastNumber: '',
    spkNumber: '',
    handoverDate: '',
    pihakPertamaName: '',
    pihakKeduaName: '',
    statusText: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        bastNumber: '',
        spkNumber: '',
        handoverDate: new Date().toISOString().split('T')[0],
        pihakPertamaName: '',
        pihakKeduaName: '',
        statusText: '',
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Generate BAST 2</h2>
          <button className={styles.closeButton} onClick={onClose} disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nomor BAST</label>
              <input
                type="text"
                name="bastNumber"
                className={styles.input}
                value={formData.bastNumber}
                onChange={handleChange}
                placeholder="Ex: 002/BAST/DJP/2026"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Nomor SPK</label>
              <input
                type="text"
                name="spkNumber"
                className={styles.input}
                value={formData.spkNumber}
                onChange={handleChange}
                placeholder="Ex: 001/SPK/DJP/2026"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Tanggal Serah Terima</label>
            <input
              type="date"
              name="handoverDate"
              className={styles.input}
              value={formData.handoverDate}
              onChange={handleChange}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Pihak Pertama (Pemberi Tugas)</label>
              <input
                type="text"
                name="pihakPertamaName"
                className={styles.input}
                value={formData.pihakPertamaName}
                onChange={handleChange}
                placeholder="Nama Client / PT"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Pihak Kedua (Kontraktor)</label>
              <input
                type="text"
                name="pihakKeduaName"
                className={styles.input}
                value={formData.pihakKeduaName}
                onChange={handleChange}
                placeholder="Nama Perwakilan Kontraktor"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Status / Keterangan (Opsional)</label>
            <textarea
              name="statusText"
              className={styles.input}
              rows={3}
              style={{ resize: 'vertical' }}
              value={formData.statusText}
              onChange={handleChange}
              placeholder="SELESAI DIKERJAKAN 100% dan DITERIMA DENGAN BAIK"
            />
          </div>

          <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
            *Foto "AFTER" dari laporan komplain akan ditambahkan ke dokumen ini secara otomatis.
          </p>

          <div className={styles.modalActions}>
            <button 
              type="button" 
              className={styles.btnCancel} 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button 
              type="submit" 
              className={styles.btnSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Memproses...' : 'Generate PDF'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Bast2Modal;
