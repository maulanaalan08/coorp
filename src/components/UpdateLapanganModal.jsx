import React, { useState, useEffect } from 'react';
import { X, MapPin, Save, AlertCircle } from 'lucide-react';
import { lapanganService } from '../services/lapanganService';
import toast from 'react-hot-toast';

const toInputDate = (val) => {
  if (!val) return '';
  const d = new Date(val);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

/**
 * Catatan progres lapangan (tanggal onsite + keterangan).
 * Volume TIDAK bisa diubah di sini — volume masuk lewat Surat Jalan,
 * karena Surat Jalan yang jadi bukti barang nyampe di lapangan.
 */
const UpdateLapanganModal = ({ isOpen, onClose, item, onSuccess }) => {
  const [tanggalOnsite, setTanggalOnsite] = useState('');
  const [updateLapangan, setUpdateLapangan] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setTanggalOnsite(toInputDate(item.tanggalOnsite));
      setUpdateLapangan(item.updateLapangan || item.catatanRusak || '');
      setIsSaving(false);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const sisa = Math.max(
    0,
    (item.estimatedVolume || 0) - (item.receivedVolume || 0)
  );
  const kurang = sisa > 0.0001;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await lapanganService.updateBulk([
        {
          poItemId: item.poItemId,
          tanggalOnsite: tanggalOnsite || null,
          updateLapangan,
        },
      ]);
      toast.success('Catatan lapangan berhasil disimpan.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Gagal menyimpan catatan lapangan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 flex justify-center items-center z-[1000] backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#161513] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/10 flex justify-between items-start gap-4 bg-white/[0.02]">
          <div>
            <h2 className="m-0 text-lg font-bold text-[#d4af37] flex items-center gap-2">
              <MapPin size={20} /> Catatan Lapangan
            </h2>
            <p className="m-0 mt-1 text-sm text-[#aaa]">
              {item.itemName || item.description || '—'}
            </p>
            <p className="m-0 mt-0.5 text-xs text-[#666] font-mono">
              {item.poNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-[#888] hover:text-white transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="text-[11px] text-[#888] mb-1">Pesan (PO)</div>
              <div className="font-bold text-white">
                {item.estimatedVolume} {item.unit}
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="text-[11px] text-[#888] mb-1">Diterima</div>
              <div className="font-bold text-[#d4af37]">
                {item.receivedVolume || 0} {item.unit}
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="text-[11px] text-[#888] mb-1">Sisa</div>
              <div className={`font-bold ${kurang ? 'text-[#ff8a80]' : 'text-[#4caf50]'}`}>
                {sisa} {item.unit}
              </div>
            </div>
          </div>

          {kurang && (
            <div className="flex gap-2 items-start bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-lg p-3 text-xs text-[#d4af37]">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>
                Barang belum diterima penuh. Volume hanya bisa ditambah lewat
                Surat Jalan — di sini cuma untuk catatan dan tanggal.
              </span>
            </div>
          )}

          <div>
            <label className="block mb-1.5 text-sm font-medium text-[#ccc]">
              Tanggal Onsite
            </label>
            <input
              type="date"
              value={tanggalOnsite}
              onChange={(e) => setTanggalOnsite(e.target.value)}
              className="w-full p-2.5 bg-[#222] border border-[#444] rounded-md text-white focus:outline-none focus:border-[#d4af37] transition-colors [color-scheme:dark]"
            />
            <p className="mt-1 text-xs text-[#666]">
              Kosongkan kalau barang belum sampai lokasi.
            </p>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium text-[#ccc]">
              Update Lapangan
            </label>
            <textarea
              value={updateLapangan}
              onChange={(e) => setUpdateLapangan(e.target.value)}
              placeholder="Contoh: 2 dus pecah di perjalanan, sisa menyusul minggu depan..."
              className="w-full p-2.5 bg-[#222] border border-[#444] rounded-md text-white min-h-[100px] font-sans focus:outline-none focus:border-[#d4af37] transition-colors placeholder:text-[#666]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-transparent border border-[#555] rounded-md text-white cursor-pointer hover:bg-[#444] transition-colors font-medium disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-gradient-to-br from-[#d4af37] to-[#a8862a] border-none rounded-md text-[#0c0b09] font-bold cursor-pointer flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSaving ? (
                'Menyimpan...'
              ) : (
                <>
                  <Save size={16} /> Simpan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateLapanganModal;
