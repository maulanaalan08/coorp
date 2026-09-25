import React, { useEffect, useState } from 'react';
import { X, PackagePlus, Send } from 'lucide-react';
import { lapanganService } from '../services/lapanganService';
import toast from 'react-hot-toast';

/**
 * Ajukan pembelian habis pakai dari Item Tracking.
 * Muncul kalau PO induk sudah APPROVED tapi barang masih kurang/habis di lapangan.
 */
const HabisPakaiModal = ({ isOpen, onClose, projectId, item, onSuccess }) => {
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('-');
  const [alasan, setAlasan] = useState('');
  const [catatan, setCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const sisa = Math.max(
        0,
        Number(item?.estimatedVolume || 0) - Number(item?.receivedVolume || 0)
      );
      setQty(sisa > 0 ? sisa : '');
      setUnit(item?.unit || '-');
      setAlasan('');
      setCatatan('');
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!qty || Number(qty) <= 0) {
      return toast.error('Jumlah wajib diisi lebih dari 0');
    }
    setIsSubmitting(true);
    try {
      await lapanganService.createPermintaanHabisPakai({
        projectId,
        poId: item?.poId || null,
        mrItemId: item?.mrItemId || null,
        itemName: item?.itemName || item?.description || 'Tanpa Nama',
        unit,
        qty: Number(qty),
        alasan,
        catatan,
      });
      toast.success('Permintaan habis pakai diajukan ke purchasing');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Gagal mengajukan permintaan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isSubmitting ? onClose : undefined}
      />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg bg-[#161513] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/[0.02]">
          <h2 className="text-lg font-bold text-[#d4af37] flex items-center gap-3">
            <PackagePlus size={20} /> Pembelian Habis Pakai
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#888] hover:text-white transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
            <p className="text-[#666] text-xs uppercase tracking-wider mb-1">Item</p>
            <p className="text-white font-bold">{item?.itemName || item?.description || '-'}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-[#888]">
              <span>PO: <span className="text-[#38bdf8] font-mono">{item?.poNumber || '-'}</span></span>
              <span>Supplier: <span className="text-[#ccc]">{item?.supplierName || '-'}</span></span>
              <span>Dipesan: <span className="text-[#ccc]">{Number(item?.orderedVolume || 0)}</span></span>
              <span>Diterima: <span className="text-[#ccc]">{Number(item?.receivedVolume || 0)}</span></span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#888] mb-1">Jumlah</label>
              <input
                type="number"
                min="0"
                step="any"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                required
                className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-1">Satuan</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#888] mb-1">Alasan pembelian</label>
            <input
              type="text"
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Contoh: habis saat pemasangan, pecah, dsb."
              className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-[#888] mb-1">Catatan lapangan</label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={3}
              placeholder="Catatan tambahan..."
              className="w-full bg-[#0c0b09] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#d4af37] outline-none resize-none"
            />
          </div>

          <p className="text-[11px] text-[#666] m-0">
            Permintaan masuk antrean purchasing. Purchasing membuat PO kategori HABIS_PAKAI,
            lalu lanjut approval Finance dan atasan seperti PO biasa.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/10 bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-[#888] hover:text-white font-medium rounded-lg hover:bg-white/5 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-[#d4af37] text-[#0c0b09] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#e8c874] transition-colors disabled:opacity-50"
          >
            <Send size={16} /> {isSubmitting ? 'Mengirim...' : 'Ajukan'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HabisPakaiModal;
