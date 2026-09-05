import React, { useState, useEffect } from 'react';
import { X, UploadCloud, FileText, CheckCircle, Package } from 'lucide-react';
import { lapanganService } from '../services/lapanganService';
import toast from 'react-hot-toast';

const toInputDate = (d = new Date()) => d.toISOString().slice(0, 10);

const BulkSuratJalanModal = ({ isOpen, onClose, items = [], onSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [nomorSJ, setNomorSJ] = useState('');
  const [tanggal, setTanggal] = useState(toInputDate());
  const [fotoBukti, setFotoBukti] = useState(null);
  
  // State untuk input per barang (volume dan catatan)
  const [itemInputs, setItemInputs] = useState({});

  // Reset form tiap kali modal dibuka
  useEffect(() => {
    if (isOpen) {
      setNomorSJ('');
      setTanggal(toInputDate());
      setFotoBukti(null);
      
      const initialInputs = {};
      items.forEach((item) => {
        // Asumsi kita terima sisa volume yang belum diterima
        const sisa = Math.max(0, (item.estimatedVolume || 0) - (item.receivedVolume || 0));
        initialInputs[item.id] = {
          volumeDiterima: sisa,
          catatan: '',
        };
      });
      setItemInputs(initialInputs);
    }
  }, [isOpen, items]);

  if (!isOpen) return null;

  const handleInputChange = (itemId, field, value) => {
    setItemInputs((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const handleFotoChange = (e) => {
    if (e.target.files) {
      setFotoBukti(e.target.files);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nomorSJ.trim()) {
      return toast.error('Nomor Surat Jalan wajib diisi!');
    }
    if (!tanggal) {
      return toast.error('Tanggal penerimaan wajib diisi!');
    }
    
    // Siapkan payload items
    const payloadItems = items.map((item) => ({
      poItemId: item.poItemId,
      volumeDiterima: itemInputs[item.id]?.volumeDiterima || 0,
      catatan: itemInputs[item.id]?.catatan || '',
    }));

    if (payloadItems.length === 0) {
      return toast.error('Tidak ada barang yang dipilih!');
    }

    const formData = new FormData();
    formData.append('nomorSJ', nomorSJ);
    formData.append('tanggal', tanggal);
    formData.append('items', JSON.stringify(payloadItems));

    if (fotoBukti) {
      for (let i = 0; i < fotoBukti.length; i++) {
        formData.append('fotoBukti', fotoBukti[i]);
      }
    }

    setIsUploading(true);
    try {
      await lapanganService.uploadBulkSuratJalan(formData);
      toast.success('Penerimaan borongan berhasil dicatat!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error bulk upload:', err);
      toast.error(err.message || 'Gagal mengunggah Surat Jalan.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={!isUploading ? onClose : undefined} 
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#161513] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-white/10 bg-white/[0.02]">
          <h2 className="text-lg md:text-xl font-bold text-[#d4af37] flex items-center gap-3">
            <Package size={24} />
            Terima Barang Borongan ({items.length} Barang)
          </h2>
          <button 
            onClick={onClose}
            disabled={isUploading}
            className="p-2 rounded-full hover:bg-white/10 text-[#888] hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 scrollbar-thin scrollbar-thumb-[#4a4231] scrollbar-track-transparent">
          <form id="bulkSJForm" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Info Surat Jalan & Tanggal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#ccc] flex items-center gap-2">
                  <FileText size={16} className="text-[#888]" />
                  Nomor Surat Jalan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nomorSJ}
                  onChange={(e) => setNomorSJ(e.target.value)}
                  placeholder="Contoh: SJ-GABUNGAN-001"
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white placeholder:text-[#555] focus:outline-none focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#ccc] flex items-center gap-2">
                  <CheckCircle size={16} className="text-[#888]" />
                  Tanggal Terima <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Upload Foto Bukti */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#ccc] flex items-center gap-2">
                <UploadCloud size={16} className="text-[#888]" />
                Upload Foto Bukti SJ (Bisa pilih banyak) <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                required
                onChange={handleFotoChange}
                className="w-full text-sm text-[#888] file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white/5 file:text-white hover:file:bg-white/10 border border-white/10 rounded-lg p-1.5 bg-black/40"
              />
            </div>

            {/* List Barang */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="text-md font-bold text-white">Daftar Barang yang Datang:</h3>
              <div className="grid grid-cols-1 gap-4">
                {items.map((item, idx) => (
                  <div key={item.id} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="font-bold text-white text-sm">
                          {idx + 1}. {item.itemName || '—'}
                        </div>
                        <div className="text-xs text-[#888] mt-0.5">
                          Estimasi RAB: {item.estimatedVolume} {item.unit} | Sudah Diterima: {item.receivedVolume || 0} {item.unit}
                        </div>
                      </div>
                      <div className="text-xs font-mono text-[#d4af37] bg-[#d4af37]/10 px-2 py-1 rounded">
                        PO: {item.poNumber}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-1">
                        <label className="text-xs text-[#888] mb-1 block">Volume Diterima</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={itemInputs[item.id]?.volumeDiterima ?? ''}
                            onChange={(e) => handleInputChange(item.id, 'volumeDiterima', parseFloat(e.target.value) || 0)}
                            className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-sm text-white focus:outline-none focus:border-[#d4af37]/50"
                          />
                          <span className="absolute right-3 top-2 text-xs text-[#666]">{item.unit}</span>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs text-[#888] mb-1 block">Catatan Kondisi</label>
                        <input
                          type="text"
                          placeholder="Cth: aman, retak 2 dus..."
                          value={itemInputs[item.id]?.catatan ?? ''}
                          onChange={(e) => handleInputChange(item.id, 'catatan', e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#d4af37]/50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-5 md:p-6 border-t border-white/10 bg-[#11100e] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm text-[#ccc] bg-white/5 hover:bg-white/10 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            form="bulkSJForm"
            disabled={isUploading}
            className="px-6 py-2.5 rounded-xl font-bold text-sm text-[#0c0b09] bg-gradient-to-r from-[#d4af37] to-[#a8862a] hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-[#d4af37]/20 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#0c0b09]/30 border-t-[#0c0b09] rounded-full animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan Semua Data'
            )}
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default BulkSuratJalanModal;
