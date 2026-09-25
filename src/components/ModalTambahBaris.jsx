import React from 'react';
import styles from '../styles/BackUpVolume.module.css';
import { X, RefreshCw } from 'lucide-react';

export default function ModalTambahBaris({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox}>
        <div className={styles.modalHeader}>
          <h3>Tambah Baris Pekerjaan (Item BV)</h3>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={styles.formGroup}>
          <label>Pilih Sub-Group Induk</label>
          <select className={styles.formSelect}>
            <option>I. PERSIAPAN &gt; A. MOBILISASI</option>
          </select>
        </div>

        <div className={styles.grid2Col}>
          <div className={styles.formGroup}>
            <label>Nomor Item</label>
            <input type="text" className={styles.formInput} defaultValue="1.3" />
          </div>
          <div className={styles.formGroup}>
            <label>Satuan Pekerjaan</label>
            <select className={styles.formSelect}>
              <option>m2</option>
              <option>m3</option>
              <option>Ls</option>
            </select>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Uraian Pekerjaan</label>
          <textarea className={styles.formTextarea} placeholder="Pemasangan Scaffold Tower H-12m" />
        </div>

        <div className={styles.syncBox}>
          <div>
            <div className={styles.syncText}>
              <RefreshCw size={14} style={{ display: 'inline', marginRight: 6 }} /> Status Sync RAB
            </div>
            <div className={styles.syncSubtext}>Otomatis sinkronkan volume ke lembar RAB utama</div>
          </div>
          <div className={styles.toggleSwitch} />
        </div>

        <div className={styles.modalFooter}>
          <div className={styles.grid2Col}>
            <button className={styles.btnCancel} onClick={onClose}>BATAL</button>
            <button className={styles.btnOutline}>LANJUT INPUT DIMENSI</button>
          </div>
          <button className={styles.btnGold}>💾 SIMPAN ITEM</button>
        </div>
      </div>
    </div>
  );
}