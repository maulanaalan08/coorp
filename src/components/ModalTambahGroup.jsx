import React from 'react';
import styles from '../styles/BackUpVolume.module.css';
import { X } from 'lucide-react';

export default function ModalTambahGroup({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox}>
        <div className={styles.modalHeader}>
          <h3>Tambah Group Pekerjaan Baru</h3>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={styles.formGroup}>
          <label>Kode / Nomor Group</label>
          <input type="text" className={styles.formInput} placeholder="IV" />
        </div>

        <div className={styles.formGroup}>
          <label>Nama Group Pekerjaan</label>
          <input type="text" className={styles.formInput} placeholder="PEKERJAAN ELEKTRIKAL & ARMATUR" />
        </div>

        <div className={styles.formGroup}>
          <label>Keterangan / Catatan (Opsional)</label>
          <textarea className={styles.formTextarea} placeholder="Masukkan detail tambahan atau deskripsi grup pekerjaan di sini..." />
        </div>

        <div className={styles.modalFooter}>
          <div className={styles.grid2Col}>
            <button className={styles.btnCancel} onClick={onClose}>Batal</button>
            <button className={styles.btnGold}>Simpan Group</button>
          </div>
        </div>
      </div>
    </div>
  );
}