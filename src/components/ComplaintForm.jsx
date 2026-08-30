import React, { useState } from 'react';
import { complaintService } from '../services/complaintService';
import "../styles/Complaint.css";

export default function ComplaintForm({ projectId, initialData = null, onSuccess }) {
  const [categories, setCategories] = useState(
    initialData?.categories || [
      // Menambahkan repairDefectReport pada state awal sesuai skema backend[cite: 2, 6]
      { name: '', items: [{ defectList: '', repairDate: '', status: false, repairDefectReport: '', files: [], existingPhotoUrls: [] }] }
    ]
  );
  const [loading, setLoading] = useState(false);

  const handleItemChange = (catIndex, itemIndex, field, value) => {
    const newCategories = [...categories];
    newCategories[catIndex].items[itemIndex][field] = value;
    setCategories(newCategories);
  };

  const handleFileChange = (catIndex, itemIndex, e) => {
    const files = Array.from(e.target.files);
    if (files.length > 20) {
      alert('Maksimal 20 foto per item!');
      return;
    }
    const newCategories = [...categories];
    newCategories[catIndex].items[itemIndex].files = files;
    setCategories(newCategories);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      const complaintData = { categories: [] };
      let globalIndex = 0; // Sinkronisasi index lintas kategori[cite: 2, 6]

      categories.forEach((cat) => {
        const parsedCategory = { name: cat.name, items: [] };

        cat.items.forEach((item) => {
          parsedCategory.items.push({
            id: item.id,
            defectList: item.defectList,
            repairDate: item.repairDate,
            status: item.status,
            repairDefectReport: item.repairDefectReport || '', // Memasukkan repairDefectReport ke JSON[cite: 2, 6]
            existingPhotoUrls: item.existingPhotoUrls || []
          });

          if (item.files && item.files.length > 0) {
            item.files.forEach((file, photoIndex) => {
              formData.append(`photo_${globalIndex}_${photoIndex}`, file);
            });
          }
          
          globalIndex++;
        });

        complaintData.categories.push(parsedCategory);
      });

      formData.append('complaintData', JSON.stringify(complaintData));

      if (initialData?.id) {
        await complaintService.updateComplaint(initialData.id, formData);
      } else {
        await complaintService.createComplaint(projectId, formData);
      }
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error submitting form', error);
      alert(error.message || 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="complaint-form">
      {categories.map((cat, catIndex) => (
        <div key={catIndex} className="category-card">
          <input
            type="text"
            placeholder="Nama Kategori (Misal: Arsitektur)"
            value={cat.name}
            onChange={(e) => {
              const newCat = [...categories];
              newCat[catIndex].name = e.target.value;
              setCategories(newCat);
            }}
            className="input-text input-category"
            required
          />

          {cat.items.map((item, itemIndex) => (
            <div key={itemIndex} className="item-container">
              <input
                type="text"
                placeholder="Defect List (Deskripsi Masalah)"
                value={item.defectList}
                onChange={(e) => handleItemChange(catIndex, itemIndex, 'defectList', e.target.value)}
                className="input-text"
                required
              />

              {/* Tambahan input form untuk Repair Defect Report[cite: 2, 6] */}
              <input
                type="text"
                placeholder="Laporan Perbaikan (Repair Defect Report)"
                value={item.repairDefectReport}
                onChange={(e) => handleItemChange(catIndex, itemIndex, 'repairDefectReport', e.target.value)}
                className="input-text"
              />
              
              <div className="item-row">
                <input
                  type="date"
                  value={item.repairDate || ''}
                  onChange={(e) => handleItemChange(catIndex, itemIndex, 'repairDate', e.target.value)}
                  className="input-text"
                  style={{ marginBottom: 0, width: 'auto' }}
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={item.status}
                    onChange={(e) => handleItemChange(catIndex, itemIndex, 'status', e.target.checked)}
                  />
                  Selesai Diperbaiki
                </label>
              </div>

              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileChange(catIndex, itemIndex, e)}
                className="input-file"
              />
              <small className="help-text">Maksimal 20 foto per item.</small>
            </div>
          ))}
        </div>
      ))}

      <button type="submit" disabled={loading} className="btn-submit">
        {loading ? 'Menyimpan...' : 'Simpan Complaint'}
      </button>
    </form>
  );
}