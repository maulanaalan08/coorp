import React, { useState } from 'react';
import toast from 'react-hot-toast';
import styles from '../styles/BackUpVolume.module.css';

export default function ComplaintAddHeaderModal({ existingCategory, onClose, onSave }) {
  const [headerName, setHeaderName] = useState(existingCategory ? existingCategory.name : "");
  const [items, setItems] = useState([
    { defectList: "", files: [], filePreviews: [] }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddItem = () => {
    setItems([...items, { defectList: "", files: [], filePreviews: [] }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = [...items];
    newItems[index].filePreviews.forEach(url => URL.revokeObjectURL(url));
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleAddFiles = (index, fileList) => {
    const newItems = [...items];
    const newFiles = Array.from(fileList);
    
    if (newItems[index].files.length + newFiles.length > 20) {
      toast.error("Maksimal 20 foto per defect list.");
      return;
    }
    
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    newItems[index].files = [...newItems[index].files, ...newFiles];
    newItems[index].filePreviews = [...newItems[index].filePreviews, ...newPreviews];
    setItems(newItems);
  };

  const handleRemoveFile = (itemIndex, fileIndex) => {
    const newItems = [...items];
    URL.revokeObjectURL(newItems[itemIndex].filePreviews[fileIndex]);
    newItems[itemIndex].files.splice(fileIndex, 1);
    newItems[itemIndex].filePreviews.splice(fileIndex, 1);
    setItems(newItems);
  };

  const handleSave = async () => {
    if (!headerName.trim()) {
      return toast.error("Nama Header tidak boleh kosong.");
    }
    if (items.length === 0) {
      return toast.error("Minimal harus ada 1 defect list.");
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].defectList.trim()) {
        return toast.error(`Defect List ke-${i + 1} tidak boleh kosong.`);
      }
      if (items[i].files.length === 0) {
        return toast.error(`Defect List ke-${i + 1} wajib menyertakan foto Before.`);
      }
    }

    setIsSaving(true);
    try {
      await onSave({
        categoryId: existingCategory ? (existingCategory.id || existingCategory.order) : undefined,
        name: headerName,
        items: items.map(item => ({
          defectList: item.defectList,
          files: item.files 
        }))
      });
    } catch (err) {
      // error handled in parent
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox}>
        <div className={styles.modalHeader}>
          <h3>{existingCategory ? "Tambah Defect Baru" : "Tambah Complain (Area)"}</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        
        <div className={styles.formGroup} style={{ marginBottom: 24 }}>
          <label>Nama Area / Header</label>
          <input 
            type="text" 
            value={headerName} 
            onChange={(e) => setHeaderName(e.target.value)} 
            placeholder="Contoh: Area Dapur"
            readOnly={!!existingCategory}
            style={{ opacity: existingCategory ? 0.6 : 1, cursor: existingCategory ? 'not-allowed' : 'text' }}
          />
        </div>
        
        <h3 style={{ color: '#d4af37', fontSize: '14px', marginBottom: '12px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>Daftar Defect</h3>
        {items.map((item, index) => (
          <div key={index} style={{ border: '1px solid #2a261e', padding: '16px', marginBottom: '16px', borderRadius: '8px', background: '#0c0b09' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <strong style={{ fontSize: '13px', color: '#9ca3af' }}>Defect #{index + 1}</strong>
              {items.length > 1 && (
                <button type="button" onClick={() => handleRemoveItem(index)} className={styles.btnDanger}>
                  Hapus Defect
                </button>
              )}
            </div>
            
            <div className={styles.formGroup}>
              <label>Deskripsi Masalah</label>
              <input 
                type="text" 
                value={item.defectList} 
                onChange={(e) => handleItemChange(index, 'defectList', e.target.value)} 
                placeholder="misal: Keran bocor"
              />
            </div>
            
            <div className={styles.formGroup} style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Foto Before (Max 20)</label>
                <label className={styles.btnSmall} style={{ cursor: 'pointer', textAlign: 'center' }}>
                  + Tambah Foto
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleAddFiles(index, e.target.files)}
                  />
                </label>
              </div>
              
              {item.filePreviews.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                  {item.filePreviews.map((preview, fIndex) => (
                    <div key={fIndex} style={{ position: 'relative', width: '60px', height: '60px' }}>
                      <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', border: '1px solid #4a4231' }} />
                      <button 
                        type="button" 
                        onClick={() => handleRemoveFile(index, fIndex)}
                        style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        <button type="button" onClick={handleAddItem} className={styles.btnOutline} style={{ width: '100%', borderStyle: 'dashed', marginBottom: '24px' }}>
          + Tambah Defect Lainnya
        </button>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" onClick={onClose} disabled={isSaving} className={styles.btnOutline} style={{ borderColor: '#4a4231', color: '#9ca3af' }}>
            Batal
          </button>
          <button type="button" onClick={handleSave} disabled={isSaving} className={styles.btnPrimary}>
            {isSaving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
