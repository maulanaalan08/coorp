import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Save, FileImage, Trash2, History, PlusCircle } from 'lucide-react';
import { lapanganService } from '../services/lapanganService';
import { compressFiles } from '../utils/imageCompression';
import toast from 'react-hot-toast';

const SuratJalanModal = ({ isOpen, onClose, item, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'upload'
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
    if (isOpen && item) {
      setFormData({
        nomorSJ: '',
        volumeDiterima: '',
        catatan: '',
        tanggal: new Date().toISOString().split('T')[0],
      });
      setPhotos([]);
      setIsSubmitting(false);
      setActiveTab('history');
      fetchHistory();
    }
  }, [isOpen, item]);

  const fetchHistory = async () => {
    if (!item?.poItemId) return;
    setLoadingHistory(true);
    try {
      const res = await lapanganService.getSuratJalanHistory(item.poItemId);
      setHistoryData(res.data || []);
      if (res.data && res.data.length === 0) {
        setActiveTab('upload');
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengambil riwayat Surat Jalan');
    } finally {
      setLoadingHistory(false);
    }
  };

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
    <div className="fixed inset-0 bg-black/75 flex justify-center items-center z-[1000] backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-[#1a1a1a] p-0 rounded-xl w-full max-w-lg border border-[#333] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#333] flex justify-between items-center bg-[#222]">
          <h2 className="m-0 text-xl font-bold text-white tracking-wide">Surat Jalan</h2>
          <button onClick={onClose} className="bg-transparent border-none text-[#888] hover:text-white cursor-pointer transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Item Info Box */}
        <div className="p-5 bg-gradient-to-br from-[#2a2a2a] to-[#222] border-b border-[#333]">
          <p className="m-0 text-sm text-[#aaa] mb-1 uppercase tracking-wider text-xs font-semibold">Detail Barang:</p>
          <p className="m-0 font-bold text-white text-lg">{item.description || item.itemName}</p>
          <div className="flex gap-4 mt-3 text-sm text-[#ccc]">
            <span className="bg-[#333] px-3 py-1 rounded-full">Target: <span className="text-white font-bold">{item.estimatedVolume} {item.unit}</span></span>
            <span className="bg-[#333] px-3 py-1 rounded-full text-[#d4af37]">Diterima: <span className="font-bold">{item.receivedVolume || 0} {item.unit}</span></span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-4 gap-2 bg-[#1a1a1a]">
          <button 
            className={`flex-1 py-2 rounded-t-lg font-semibold flex items-center justify-center gap-2 transition-all ${activeTab === 'history' ? 'bg-[#333] text-white border-t-2 border-[#d4af37]' : 'bg-transparent text-[#777] hover:bg-[#222]'}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={16} /> Riwayat Laporan
          </button>
          <button 
            className={`flex-1 py-2 rounded-t-lg font-semibold flex items-center justify-center gap-2 transition-all ${activeTab === 'upload' ? 'bg-[#333] text-white border-t-2 border-[#d4af37]' : 'bg-transparent text-[#777] hover:bg-[#222]'}`}
            onClick={() => setActiveTab('upload')}
          >
            <PlusCircle size={16} /> Upload Baru
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto bg-[#333] flex-1">
          
          {/* TAB: HISTORY */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-4">
              {loadingHistory ? (
                <div className="text-center text-[#888] py-8 animate-pulse">Memuat riwayat...</div>
              ) : historyData.length === 0 ? (
                <div className="text-center text-[#888] py-8">
                  <FileImage size={40} className="mx-auto mb-3 opacity-30" />
                  Belum ada riwayat Surat Jalan untuk barang ini.
                </div>
              ) : (
                historyData.map((sj, idx) => (
                  <div key={idx} className="bg-[#222] p-4 rounded-lg border border-[#444] shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-white font-bold text-base m-0 flex items-center gap-2">
                          {sj.nomorSJ}
                        </h4>
                        <span className="text-xs text-[#aaa]">{new Date(sj.tanggal).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                      <div className="bg-[#4caf50]/20 text-[#4caf50] px-3 py-1 rounded-md font-bold text-sm border border-[#4caf50]/30">
                        +{sj.volumeDiterima} {item.unit}
                      </div>
                    </div>
                    {sj.catatan && (
                      <p className="text-sm text-[#ccc] mt-2 mb-0 italic bg-[#1a1a1a] p-2 rounded">
                        "{sj.catatan}"
                      </p>
                    )}
                    {sj.fotoUrls && sj.fotoUrls.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                        {sj.fotoUrls.map((url, uidx) => (
                          <a key={uidx} href={`http://localhost:4000${url}`} target="_blank" rel="noreferrer" className="block shrink-0">
                            <img src={`http://localhost:4000${url}`} alt="Bukti SJ" className="w-16 h-16 object-cover rounded border border-[#555] hover:opacity-80 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: UPLOAD */}
          {activeTab === 'upload' && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#ccc]">Tanggal Terima</label>
                <input type="date" name="tanggal" value={formData.tanggal} onChange={handleChange} required
                  className="w-full p-2.5 bg-[#222] border border-[#444] rounded-md text-white focus:outline-none focus:border-[#d4af37] transition-colors" />
              </div>

              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#ccc]">Nomor Surat Jalan</label>
                <input type="text" name="nomorSJ" value={formData.nomorSJ} onChange={handleChange} required placeholder="Masukkan nomor SJ..."
                  className="w-full p-2.5 bg-[#222] border border-[#444] rounded-md text-white focus:outline-none focus:border-[#d4af37] transition-colors placeholder:text-[#666]" />
              </div>

              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#ccc]">Volume / Qty Diterima</label>
                <input type="number" step="0.01" name="volumeDiterima" value={formData.volumeDiterima} onChange={handleChange} required placeholder={`Maks: ${item.estimatedVolume - (item.receivedVolume || 0)}`}
                  className="w-full p-2.5 bg-[#222] border border-[#444] rounded-md text-white focus:outline-none focus:border-[#d4af37] transition-colors placeholder:text-[#666]" />
              </div>

              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#ccc]">Catatan / Kondisi Barang</label>
                <textarea name="catatan" value={formData.catatan} onChange={handleChange} placeholder="Contoh: Barang aman, ada sedikit lecet di ujung..."
                  className="w-full p-2.5 bg-[#222] border border-[#444] rounded-md text-white min-h-[80px] font-sans focus:outline-none focus:border-[#d4af37] transition-colors placeholder:text-[#666]" />
              </div>

              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#ccc]">Foto Bukti (Maks. 5)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-[#555] rounded-lg text-center cursor-pointer bg-[#222] hover:bg-[#2a2a2a] transition-colors group">
                  <Upload size={24} className="text-[#888] mx-auto mb-2 group-hover:text-[#d4af37] transition-colors" />
                  <p className="m-0 text-sm text-[#888] group-hover:text-[#ccc] transition-colors">Klik untuk upload foto dari HP / PC</p>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" className="hidden" />

                {photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-3">
                    {photos.map((photo, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-[#444] group">
                        <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => handleRemovePhoto(i)} className="absolute top-1 right-1 bg-black/60 border-none text-[#ff4444] rounded-full p-1 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#444]">
                <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 bg-transparent border border-[#555] rounded-md text-white cursor-pointer hover:bg-[#444] transition-colors font-medium">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-gradient-to-br from-[#d4af37] to-[#a8862a] border-none rounded-md text-[#0c0b09] font-bold cursor-pointer flex items-center gap-2 hover:opacity-90 transition-opacity">
                  {isSubmitting ? 'Menyimpan...' : <><Save size={16} /> Simpan Laporan</>}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default SuratJalanModal;
