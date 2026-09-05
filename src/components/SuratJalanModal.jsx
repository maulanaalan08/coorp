import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Save, FileImage, Trash2 } from 'lucide-react';
import { lapanganService } from '../services/lapanganService';
import { compressFiles } from '../utils/imageCompression';
import toast from 'react-hot-toast';

const modalOverlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  zIndex: 1000, backdropFilter: 'blur(4px)'
};

const modalContentStyle = {
  backgroundColor: '#1a1a1a', padding: '24px', borderRadius: '12px',
  width: '100%', maxWidth: '500px', border: '1px solid #333',
  maxHeight: '90vh', overflowY: 'auto'
};

const SuratJalanModal = ({ isOpen, onClose, item, onSuccess }) => {
  const [formData, setFormData] = useState({
    nomorSJ: '',
    volumeDiterima: '',
    catatan: '',
    tanggal: new Date().toISOString().split('T')[0],
  });
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        nomorSJ: '',
        volumeDiterima: '',
        catatan: '',
        tanggal: new Date().toISOString().split('T')[0],
      });
      setPhotos([]);
      setIsSubmitting(false);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      if (photos.length + filesArray.length > 5) {
        toast.error('Maksimal 5 foto!');
        return;
      }
      setPhotos(prev => [...prev, ...filesArray]);
    }
  };

  const handleRemovePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!item.poItemId) {
      toast.error('Item ini belum memiliki Surat Jalan / PO yang valid');
      return;
    }

    if (!formData.volumeDiterima || formData.volumeDiterima <= 0) {
      toast.error('Volume diterima harus lebih dari 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('nomorSJ', formData.nomorSJ);
      data.append('volumeDiterima', formData.volumeDiterima);
      data.append('catatan', formData.catatan);
      data.append('tanggal', formData.tanggal);

      if (photos.length > 0) {
        const compressed = await compressFiles(photos);
        compressed.forEach(file => data.append('fotoBukti', file));
      }

      await lapanganService.uploadSuratJalan(item.poItemId, data);
      toast.success('Surat Jalan berhasil disimpan!');
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Gagal menyimpan Surat Jalan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Terima Barang (Surat Jalan)</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
          <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#aaa' }}>Barang:</p>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#fff' }}>{item.description}</p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '0.85rem', color: '#ccc' }}>
            <span>Target: {item.estimatedVolume} {item.unit}</span>
            <span>Telah Diterima: {item.receivedVolume || 0} {item.unit}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#ccc' }}>Tanggal Terima</label>
            <input type="date" name="tanggal" value={formData.tanggal} onChange={handleChange} required
              style={{ width: '100%', padding: '10px', backgroundColor: '#222', border: '1px solid #444', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#ccc' }}>Nomor Surat Jalan</label>
            <input type="text" name="nomorSJ" value={formData.nomorSJ} onChange={handleChange} required placeholder="Masukkan nomor SJ..."
              style={{ width: '100%', padding: '10px', backgroundColor: '#222', border: '1px solid #444', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#ccc' }}>Volume / Qty Diterima</label>
            <input type="number" step="0.01" name="volumeDiterima" value={formData.volumeDiterima} onChange={handleChange} required placeholder={`Maks: ${item.estimatedVolume - (item.receivedVolume || 0)}`}
              style={{ width: '100%', padding: '10px', backgroundColor: '#222', border: '1px solid #444', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#ccc' }}>Catatan / Kondisi Barang</label>
            <textarea name="catatan" value={formData.catatan} onChange={handleChange} placeholder="Aman, ada lecet, dll..."
              style={{ width: '100%', padding: '10px', backgroundColor: '#222', border: '1px solid #444', borderRadius: '6px', color: '#fff', minHeight: '80px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: '#ccc' }}>Foto Bukti (Maks. 5)</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: '20px', border: '2px dashed #444', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', backgroundColor: '#222' }}>
              <Upload size={24} color="#888" style={{ marginBottom: '8px' }} />
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#888' }}>Klik untuk upload foto</p>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" style={{ display: 'none' }} />

            {photos.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                {photos.map((photo, i) => (
                  <div key={i} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #444' }}>
                    <img src={URL.createObjectURL(photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => handleRemovePhoto(i)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#ff4444', borderRadius: '50%', padding: '2px', cursor: 'pointer' }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} disabled={isSubmitting} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid #444', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>Batal</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: '10px 16px', background: 'linear-gradient(135deg, #d4af37, #a8862a)', border: 'none', borderRadius: '6px', color: '#0c0b09', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isSubmitting ? 'Menyimpan...' : <><Save size={16} /> Simpan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SuratJalanModal;
