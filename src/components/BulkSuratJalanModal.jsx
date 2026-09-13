import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, FileText, CheckCircle, Package } from 'lucide-react';
import { lapanganService } from '../services/lapanganService';
import toast from 'react-hot-toast';

import { compressFiles } from '../utils/imageCompression';

const MAX_FOTO = 10;

const toInputDate = (d = new Date()) => d.toISOString().slice(0, 10);

const BulkSuratJalanModal = ({ isOpen, onClose, items = [], onSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [nomorSJ, setNomorSJ] = useState('');
  const [tanggal, setTanggal] = useState(toInputDate());
  const [fotoBukti, setFotoBukti] = useState([]);

  // State untuk input per barang (volume dan catatan)
  const [itemInputs, setItemInputs] = useState({});
  const fileInputRef = useRef(null);

  // Reset form tiap kali modal dibuka
  useEffect(() => {
    if (isOpen) {
      setNomorSJ('');
      setTanggal(toInputDate());
      setFotoBukti([]);

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
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;

    const sisa = MAX_FOTO - fotoBukti.length;
    if (picked.length > sisa) {
      toast.error(`Maksimal ${MAX_FOTO} foto Surat Jalan.`);
      e.target.value = '';
      return;
    }
    setFotoBukti((prev) => [...prev, ...picked]);
    e.target.value = '';
  };

  const handleRemoveFoto = (index) => {
    setFotoBukti((prev) => prev.filter((_, i) => i !== index));
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

      // Barang harus punya baris PO dan volume diterima > 0
      const tanpaPo = items.filter((i) => !i.poItemId);
      if (tanpaPo.length > 0) {
        return toast.error(
          `${tanpaPo.length} barang belum di-PO (baris sisa), tidak bisa dicatat Surat Jalan.`
        );
      }
      const nolVolume = payloadItems.filter((p) => !(Number(p.volumeDiterima) > 0));
      if (nolVolume.length > 0) {
        return toast.error('Volume diterima wajib diisi lebih dari 0 untuk semua barang!');
      }

      // Barang kurang: kalau volume datang < sisa yang dipesan, wajib ada catatan
      // biar jelas kurangnya berapa dan kenapa. Surat Jalan tetap wajib.
      const kurangTanpaCatatan = items.filter((item) => {
        const sisa = Math.max(
          0,
          (item.estimatedVolume || 0) - (item.receivedVolume || 0)
        );
        const datang = Number(itemInputs[item.id]?.volumeDiterima || 0);
        const kurang = sisa - datang;
        const catatan = (itemInputs[item.id]?.catatan || '').trim();
        return kurang > 0.0001 && !catatan;
      });
      if (kurangTanpaCatatan.length > 0) {
        return toast.error(
          `${kurangTanpaCatatan.length} barang datang kurang dari jumlah pesanan. Tulis catatan kekurangannya dulu (misal: "kurang 2 dus, sisa dikirim Jumat").`
        );
      }

      setIsUploading(true);
      try {
        // Foto wajib — Surat Jalan itu bukti barang nyampe lapangan.
        if (fotoBukti.length === 0) {
          setIsUploading(false);
          return toast.error(
            'Foto Surat Jalan wajib dilampirkan minimal 1. Foto adalah bukti barang diterima di lapangan.'
          );
        }

        const data = new FormData();
        data.append('nomorSJ', nomorSJ);
        data.append('tanggal', tanggal);
        data.append('items', JSON.stringify(payloadItems));

        const compressed = await compressFiles(fotoBukti);
        compressed.forEach((file) => data.append('fotoBukti', file));

        await lapanganService.uploadBulkSuratJalan(data);
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
                  Foto Surat Jalan (wajib, maks. {MAX_FOTO}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-[#777] m-0">
                  Semua supplier wajib melampirkan Surat Jalan sebagai bukti barang
                  diterima di lapangan. Ambil foto suratnya dari beberapa sisi —
                  biasanya lebih dari 1 foto.
                </p>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-white/15 rounded-xl text-center cursor-pointer bg-black/40 hover:bg-white/5 transition-colors group"
                >
                  <UploadCloud
                    size={26}
                    className="text-[#888] mx-auto mb-2 group-hover:text-[#d4af37] transition-colors"
                  />
                  <p className="m-0 text-sm text-[#888] group-hover:text-[#ccc] transition-colors">
                    Klik untuk pilih foto dari HP / PC
                  </p>
                  <p className="m-0 text-xs text-[#666] mt-1">
                    {fotoBukti.length}/{MAX_FOTO} foto dipilih
                  </p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/*"
                  onChange={handleFotoChange}
                  className="hidden"
                />

                {fotoBukti.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-3">
                    {fotoBukti.map((file, i) => (
                      <div
                        key={`${file.name}-${i}`}
                        className="relative aspect-square rounded-lg overflow-hidden border border-white/15 group"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Foto SJ ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFoto(i)}
                          title="Hapus foto"
                          className="absolute top-1 right-1 bg-black/70 border-none text-[#ff6b6b] rounded-full p-1 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
