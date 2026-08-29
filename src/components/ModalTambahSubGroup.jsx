import React from 'react';
import styles from '../styles/BackUpVolume.module.css';
import { X, Info } from 'lucide-react';

export default function ModalTambahSubGroup({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox}>
        <div className={styles.modalHeader}>
          <h3>Tambah Sub-Group Pekerjaan</h3>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={styles.formGroup}>
          <label>Pilih Group Induk</label>
          <select className={styles.formSelect}>
            <option>I. PEKERJAAN PERSIAPAN</option>
          </select>
        </div>

        <div className={styles.grid2Col}>
          <div className={styles.formGroup}>
            <label>Kode Sub-Group</label>
            <input type="text" className={styles.formInput} placeholder="A" />
          </div>
          <div className={styles.formGroup}>
            <label>Nama Sub-Group</label>
            <input type="text" className={styles.formInput} placeholder="Pekerjaan Site Clearance" />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Target Satuan Total</label>
          <select className={styles.formSelect}>
            <option>Pilih Satuan (m2, m3, kg, dll)</option>
          </select>
        </div>

        <div className={styles.infoBox}>
          <Info size={16} style={{ flexShrink: 0 }} />
          <span>Sub-group ini akan ditambahkan sebagai level 2 di bawah Group Induk yang Anda pilih.</span>
        </div>

        <div className={styles.modalFooter}>
          <div className={styles.grid2Col}>
            <button className={styles.btnCancel} onClick={onClose}>Batal</button>
            <button className={styles.btnGold}>💾 Simpan Sub-Group</button>
          </div>
        </div>
      </div>
    </div>
  );
}