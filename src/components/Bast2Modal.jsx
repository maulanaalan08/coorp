import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from '../styles/BastPage.module.css';

const Bast2Modal = ({ isOpen, onClose, onSubmit, isSubmitting, clientSpks = [] }) => {
  const [formData, setFormData] = useState({
    bastNumber: '',
    spkNumber: '',
    handoverDate: '',
    pihakPertamaName: '',
    pihakKeduaName: '',
    statusText: '',
  });

  const availableSpkOptions = [...(clientSpks || [])];

  useEffect(() => {
    if (isOpen) {
      const defaultSpk = (clientSpks && clientSpks.length === 1) 
        ? clientSpks[0].spkNumber 
        : (clientSpks?.[0]?.spkNumber || '');
      const matchedSpkObj = clientSpks?.find((s) => s.spkNumber === defaultSpk);
      setFormData({
        bastNumber: '',
        spkNumber: defaultSpk,
        handoverDate: new Date().toISOString().split('T')[0],
        pihakPertamaName: matchedSpkObj?.clientName || '',
        pihakKeduaName: 'JIMMY CHRISTIAN, S.Ds.',
        statusText: 'SELESAI DIKERJAKAN 100% dan DITERIMA DENGAN BAIK',
      });
    }
  }, [isOpen, clientSpks]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSpkChange = (e) => {
    const selectedVal = e.target.value;
    const matchedSpk = clientSpks?.find((s) => s.spkNumber === selectedVal);
    setFormData((prev) => ({
      ...prev,
      spkNumber: selectedVal,
      pihakPertamaName: (!prev.pihakPertamaName || clientSpks?.some((s) => s.clientName === prev.pihakPertamaName))
        ? (matchedSpk?.clientName || prev.pihakPertamaName)
        : prev.pihakPertamaName,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.spkNumber) {
      alert('Nomor SPK Client wajib dipilih!');
      return;
    }
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
              <label className={styles.label}>
                Nomor SPK Client <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {availableSpkOptions.length === 0 ? (
                <div style={{ color: '#ef4444', fontSize: '13px', padding: '10px 0' }}>
                  ⚠️ Belum ada Nomor SPK Client yang terbit.
                </div>
              ) : availableSpkOptions.length === 1 ? (
                <div>
                  <select
                    name="spkNumber"
                    className={styles.input}
                    value={formData.spkNumber}
                    onChange={handleSpkChange}
                    required
                  >
                    <option value={availableSpkOptions[0].spkNumber}>
                      {availableSpkOptions[0].spkNumber} {availableSpkOptions[0].status ? `(${availableSpkOptions[0].status})` : ''}
                    </option>
                  </select>
                  <span style={{ fontSize: '11px', color: '#10b981', display: 'block', marginTop: '4px' }}>
                    ✓ Otomatis dari dokumen SPK Client
                  </span>
                </div>
              ) : (
                <div>
                  <select
                    name="spkNumber"
                    className={styles.input}
                    value={formData.spkNumber}
                    onChange={handleSpkChange}
                    required
                  >
                    <option value="">-- Pilih Nomor SPK Client --</option>
                    {availableSpkOptions.map((spk) => (
                      <option key={spk.id || spk.spkNumber} value={spk.spkNumber}>
                        {spk.spkNumber} {spk.status ? `(${spk.status})` : ''}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '11px', color: '#aaa', display: 'block', marginTop: '4px' }}>
                    Pilih Nomor SPK Client yang diterbitkan
                  </span>
                </div>
              )}
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
