import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { toInputDate } from '../services/utils';
import styles from '../styles/BackUpVolume.module.css';

export default function ComplaintEditItemModal({ category, item, onClose, onSave }) {
  const [areaName, setAreaName] = useState(category.name || "");
  const [defectList, setDefectList] = useState(item.defectList || "");
  const [status, setStatus] = useState(item.status || false);
  const [repairDefectReport, setRepairDefectReport] = useState(item.repairDefectReport || "");
  const [repairDate, setRepairDate] = useState(item.repairDate ? toInputDate(item.repairDate) : "");
  
  // Before Photos
  const [existingBefore, setExistingBefore] = useState((item.photos || []).filter(p => p.type === "BEFORE").map(p => p.url));
  const [newBefore, setNewBefore] = useState([]);
  const [newBeforePreviews, setNewBeforePreviews] = useState([]);

  // After Photos
  const [existingAfter, setExistingAfter] = useState((item.photos || []).filter(p => p.type === "AFTER").map(p => p.url));
  const [newAfter, setNewAfter] = useState([]);
  const [newAfterPreviews, setNewAfterPreviews] = useState([]);

  const [isSaving, setIsSaving] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}` : 'http://localhost:4000';

  const handleAddBeforeFiles = (fileList) => {
    const newFiles = Array.from(fileList);
    if (existingBefore.length + newBefore.length + newFiles.length > 20) {
      return toast.error("Maksimal 20 foto Before.");
    }
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setNewBefore([...newBefore, ...newFiles]);
    setNewBeforePreviews([...newBeforePreviews, ...newPreviews]);
  };

  const handleAddAfterFiles = (fileList) => {
    const newFiles = Array.from(fileList);
    if (existingAfter.length + newAfter.length + newFiles.length > 20) {
      return toast.error("Maksimal 20 foto After.");
    }
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setNewAfter([...newAfter, ...newFiles]);
    setNewAfterPreviews([...newAfterPreviews, ...newPreviews]);
  };

  const removeExistingBefore = (index) => {
    const updated = [...existingBefore];
    updated.splice(index, 1);
    setExistingBefore(updated);
  };

  const removeNewBefore = (index) => {
    const updatedF = [...newBefore];
    const updatedP = [...newBeforePreviews];
    URL.revokeObjectURL(updatedP[index]);
    updatedF.splice(index, 1);
    updatedP.splice(index, 1);
    setNewBefore(updatedF);
    setNewBeforePreviews(updatedP);
  };

  const removeExistingAfter = (index) => {
    const updated = [...existingAfter];
    updated.splice(index, 1);
    setExistingAfter(updated);
  };

  const removeNewAfter = (index) => {
    const updatedF = [...newAfter];
    const updatedP = [...newAfterPreviews];
    URL.revokeObjectURL(updatedP[index]);
    updatedF.splice(index, 1);
    updatedP.splice(index, 1);
    setNewAfter(updatedF);
    setNewAfterPreviews(updatedP);
  };

  const handleSave = async () => {
    if (!areaName.trim()) return toast.error("Nama Area wajib diisi.");
    if (!defectList.trim()) return toast.error("Defect List wajib diisi.");
    
    if (status) {
      if (!repairDate) {
        return toast.error("Jika status Selesai, Tanggal Perbaikan wajib diisi.");
      }
      if (existingAfter.length === 0 && newAfter.length === 0) {
        return toast.error("Jika status Selesai, wajib memiliki minimal 1 Foto After.");
      }
    }
    
    if (existingBefore.length === 0 && newBefore.length === 0) {
      return toast.error("Wajib memiliki minimal 1 Foto Before.");
    }

    setIsSaving(true);
    try {
      await onSave({
        categoryId: category.id || category.order,
        itemId: item.id,
        areaName,
        defectList,
        status,
        repairDefectReport,
        repairDate,
        existingBefore,
        newBefore,
        existingAfter,
        newAfter
      });
    } catch (err) {
      // handled in parent
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox} style={{ maxWidth: '600px' }}>
        <div className={styles.modalHeader}>
          <h3>Edit Data Defect</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        
        <div className={styles.formGroup}>
          <label>Nama Area / Header</label>
          <input 
            type="text" 
            value={areaName} 
            onChange={(e) => setAreaName(e.target.value)} 
            placeholder="Contoh: Area Dapur"
          />
        </div>

        <div className={styles.formGroup}>
          <label>Deskripsi Defect</label>
          <input 
            type="text" 
            value={defectList} 
            onChange={(e) => setDefectList(e.target.value)} 
            placeholder="Contoh: Keran bocor"
          />
        </div>
        
        <div className={styles.formGroup}>
          <label>Status Perbaikan</label>
          <select 
            value={status ? "true" : "false"} 
            onChange={(e) => setStatus(e.target.value === "true")}
          >
            <option value="false">On going</option>
            <option value="true">Selesai</option>
          </select>
        </div>

        {/* BEFORE PHOTOS SECTION */}
        <div className={styles.formGroup} style={{ marginTop: '16px', background: '#0c0b09', padding: '16px', borderRadius: '8px', border: '1px solid #2a261e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <label style={{ margin: 0 }}>Foto Before</label>
            <label className={styles.btnSmall} style={{ cursor: 'pointer', textAlign: 'center' }}>
              + Tambah Foto
              <input 
                type="file" multiple accept="image/*" style={{ display: 'none' }}
                onChange={(e) => handleAddBeforeFiles(e.target.files)}
              />
            </label>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {existingBefore.map((url, i) => (
              <div key={`eb-${i}`} style={{ position: 'relative', width: '60px', height: '60px' }}>
                <img src={`${API_URL}${url}`} alt="existing-before" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', border: '1px solid #4a4231' }} />
                <button type="button" onClick={() => removeExistingBefore(i)} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✕</button>
              </div>
            ))}
            {newBeforePreviews.map((preview, i) => (
              <div key={`nb-${i}`} style={{ position: 'relative', width: '60px', height: '60px' }}>
                <img src={preview} alt="new-before" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', border: '2px solid #d4af37' }} />
                <button type="button" onClick={() => removeNewBefore(i)} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✕</button>
              </div>
            ))}
            {existingBefore.length === 0 && newBefore.length === 0 && <span style={{ fontSize: '12px', color: '#6b7280' }}>Tidak ada foto before.</span>}
          </div>
        </div>

        {/* AFTER PHOTOS & REPORT SECTION */}
        <div style={{ marginTop: '24px', opacity: status ? 1 : 0.6, transition: 'opacity 0.2s' }}>
          <h4 style={{ color: '#9ca3af', marginBottom: '12px', fontSize: '12px', textTransform: 'uppercase' }}>Data Hasil Perbaikan</h4>
          
          <div className={styles.formGroup}>
            <label>Laporan Hasil Perbaikan (Opsional)</label>
            <textarea 
              value={repairDefectReport} 
              onChange={(e) => setRepairDefectReport(e.target.value)} 
              placeholder="Keterangan perbaikan..."
              style={{ width: '100%', padding: '10px 12px', background: '#0c0b09', color: '#e5e7eb', border: '1px solid #4a4231', borderRadius: '6px', minHeight: '80px', fontFamily: 'inherit', fontSize: '13px', resize: 'vertical' }}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Tanggal Perbaikan {status && <span style={{color: '#ef4444'}}>*</span>}</label>
            <input 
              type="date" 
              value={repairDate} 
              onChange={(e) => setRepairDate(e.target.value)} 
            />
          </div>

          <div className={styles.formGroup} style={{ marginTop: '16px', background: '#0c0b09', padding: '16px', borderRadius: '8px', border: '1px solid #2a261e' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ margin: 0 }}>Foto After {status && <span style={{color: '#ef4444'}}>*</span>}</label>
              <label className={styles.btnGreen} style={{ cursor: 'pointer', textAlign: 'center' }}>
                + Tambah Foto
                <input 
                  type="file" multiple accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => handleAddAfterFiles(e.target.files)}
                />
              </label>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {existingAfter.map((url, i) => (
                <div key={`ea-${i}`} style={{ position: 'relative', width: '60px', height: '60px' }}>
                  <img src={`${API_URL}${url}`} alt="existing-after" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', border: '1px solid #4a4231' }} />
                  <button type="button" onClick={() => removeExistingAfter(i)} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✕</button>
                </div>
              ))}
              {newAfterPreviews.map((preview, i) => (
                <div key={`na-${i}`} style={{ position: 'relative', width: '60px', height: '60px' }}>
                  <img src={preview} alt="new-after" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', border: '2px solid #10b981' }} />
                  <button type="button" onClick={() => removeNewAfter(i)} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✕</button>
                </div>
              ))}
              {existingAfter.length === 0 && newAfter.length === 0 && <span style={{ fontSize: '12px', color: '#6b7280' }}>Tidak ada foto after.</span>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button type="button" onClick={onClose} disabled={isSaving} className={styles.btnOutline} style={{ borderColor: '#4a4231', color: '#9ca3af' }}>
            Batal
          </button>
          <button type="button" onClick={handleSave} disabled={isSaving} className={styles.btnPrimary}>
            {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}
