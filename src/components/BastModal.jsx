import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileImage, Trash2 } from 'lucide-react';
import styles from '../styles/BastPage.module.css';

const BastModal = ({ isOpen, onClose, onSubmit, initialData, isSubmitting }) => {
  const [formData, setFormData] = useState({
    bastNumber: '',
    spkNumber: '',
    handoverDate: '',
    pihakPertamaName: '',
    pihakKeduaName: '',
    statusText: '',
  });

  const [existingPhotos, setExistingPhotos] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          bastNumber: initialData.bastNumber || '',
          spkNumber: initialData.spkNumber || '',
          handoverDate: initialData.handoverDate ? new Date(initialData.handoverDate).toISOString().split('T')[0] : '',
          pihakPertamaName: initialData.pihakPertamaName || '',
          pihakKeduaName: initialData.pihakKeduaName || '',
          statusText: initialData.statusText || '',
        });
        setExistingPhotos(initialData.photos || []);
      } else {
        setFormData({
          bastNumber: '',
          spkNumber: '',
          handoverDate: new Date().toISOString().split('T')[0],
          pihakPertamaName: '',
          pihakKeduaName: '',
          statusText: '',
        });
        setExistingPhotos([]);
      }
      setNewPhotos([]);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setNewPhotos((prev) => [...prev, ...filesArray]);
    }
  };

  const handleRemoveExistingPhoto = (photoId) => {
    setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handleRemoveNewPhoto = (index) => {
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    
    // Append text fields
    Object.keys(formData).forEach(key => {
      if (formData[key]) data.append(key, formData[key]);
    });

    // Append new photos (with compression)
    if (newPhotos.length > 0) {
      const { compressFiles } = await import('../utils/imageCompression.js');
      const compressedFiles = await compressFiles(newPhotos);
      compressedFiles.forEach((file) => {
        data.append('photos', file);
      });
    }

    // Append existing photos to keep (only for edit)
    if (initialData) {
      existingPhotos.forEach((photo) => {
        data.append('existingPhotosToKeep', photo.id);
      });
    }

    onSubmit(data);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {initialData ? 'Edit Berita Acara (BAST)' : 'Buat BAST Baru'}
          </h2>
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
                placeholder="Ex: 001/BAST/DJP/2026"
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
            <input
              type="text"
              name="statusText"
              className={styles.input}
              value={formData.statusText}
              onChange={handleChange}
              placeholder="SELESAI DIKERJAKAN 100% dan DITERIMA DENGAN BAIK"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Lampiran Foto Hasil Pekerjaan</label>
            
            <div 
              className={styles.fileInputContainer} 
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} color="#aaa" style={{ margin: '0 auto' }} />
              <p className={styles.fileInputText}>Klik untuk memilih foto (Bisa pilih banyak)</p>
              <input
                type="file"
                ref={fileInputRef}
                className={styles.fileInput}
                multiple
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            {(existingPhotos.length > 0 || newPhotos.length > 0) && (
              <div className={styles.photoPreviewGrid}>
                {existingPhotos.map((photo) => (
                  <div key={photo.id} className={styles.photoPreviewItem}>
                    <img 
                      src={import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}${photo.url}` : `http://localhost:4000${photo.url}`} 
                      alt="Existing BAST" 
                    />
                    <button 
                      type="button" 
                      className={styles.removePhotoButton}
                      onClick={() => handleRemoveExistingPhoto(photo.id)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}

                {newPhotos.map((file, index) => (
                  <div key={`new-${index}`} className={styles.photoPreviewItem}>
                    <img src={URL.createObjectURL(file)} alt={`New BAST ${index}`} />
                    <button 
                      type="button" 
                      className={styles.removePhotoButton}
                      onClick={() => handleRemoveNewPhoto(index)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
              {isSubmitting ? 'Menyimpan...' : (initialData ? 'Simpan Perubahan' : 'Buat BAST')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BastModal;
