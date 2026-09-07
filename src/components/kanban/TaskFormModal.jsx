import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlignLeft, Type } from 'lucide-react';
import toast from 'react-hot-toast';

const TaskFormModal = ({ isOpen, onClose, onSave, task = null }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueTime: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (task) {
        let dDate = '';
        let dTime = '';
        if (task.dueDate) {
          const d = new Date(task.dueDate);
          // format YYYY-MM-DD
          dDate = d.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD
          // format HH:mm
          dTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        }
        setFormData({
          title: task.title || '',
          description: task.description || '',
          dueDate: dDate,
          dueTime: dTime
        });
      } else {
        setFormData({ title: '', description: '', dueDate: '', dueTime: '' });
      }
    }
  }, [isOpen, task]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Judul tugas wajib diisi!');
      return;
    }

    let finalDueDate = null;
    if (formData.dueDate) {
      // Gabungkan tanggal dan jam
      const timeString = formData.dueTime ? `${formData.dueTime}:00` : '00:00:00';
      finalDueDate = new Date(`${formData.dueDate}T${timeString}`).toISOString();
    }

    onSave({
      id: task?.id,
      title: formData.title.trim(),
      description: formData.description.trim(),
      dueDate: finalDueDate
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1917] border border-[#333] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#222]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {task ? 'Edit Tugas' : 'Tambah Tugas Baru'}
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-[#888] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[80vh]">
          
          {/* Judul */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-[#aaa] mb-1.5">
              <Type size={16} /> Judul Tugas <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-[#111] border border-[#333] rounded-lg p-2.5 text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all"
              placeholder="Contoh: Pengecekan Material Baja"
            />
          </div>

          {/* Deskripsi */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-[#aaa] mb-1.5">
              <AlignLeft size={16} /> Deskripsi <span className="text-[#555] text-xs font-normal">(Opsional)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#111] border border-[#333] rounded-lg p-2.5 text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all min-h-[100px] resize-y"
              placeholder="Tambahkan detail tugas, catatan, atau referensi..."
            />
          </div>

          {/* Waktu & Jam (Bersebelahan) */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="flex items-center gap-2 text-sm font-medium text-[#aaa] mb-1.5">
                <Calendar size={16} /> Tanggal Tenggat <span className="text-[#555] text-xs font-normal">(Opsional)</span>
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full bg-[#111] border border-[#333] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all [color-scheme:dark]"
              />
            </div>
            
            <div className="flex-1">
              <label className="flex items-center gap-2 text-sm font-medium text-[#aaa] mb-1.5">
                <Clock size={16} /> Jam <span className="text-[#555] text-xs font-normal">(Opsional)</span>
              </label>
              <input
                type="time"
                value={formData.dueTime}
                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                disabled={!formData.dueDate}
                className={`w-full bg-[#111] border border-[#333] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all [color-scheme:dark] ${!formData.dueDate ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>
          
          <p className="text-xs text-[#666] bg-white/5 p-3 rounded-md border border-[#333]">
            💡 Jika Anda mengisi tanggal dan jam tenggat, tugas ini akan disinkronkan langsung ke <b>Google Calendar</b>.
          </p>

        </form>

        {/* Footer */}
        <div className="p-4 border-t border-[#333] bg-[#222] flex justify-end gap-3 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#aaa] hover:text-white bg-transparent border border-[#555] hover:border-[#888] rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-black bg-[#d4af37] hover:bg-[#b08d2c] rounded-lg transition-colors"
          >
            {task ? 'Simpan Perubahan' : 'Tambah Tugas'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskFormModal;
