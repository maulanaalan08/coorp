import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlignLeft, Type, FolderKanban, User, Flag, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_OPTIONS = [
  { value: 'PERENCANA', label: 'Seluruh Perencana' },
  { value: 'PELAKSANA', label: 'Seluruh Pelaksana' },
  { value: 'FINANCE', label: 'Seluruh Finance' },
  { value: 'PURCHASING', label: 'Seluruh Purchasing' },
  { value: 'PROJECT_MANAGER', label: 'Seluruh Project Manager' },
  { value: 'SUPER_ADMIN', label: 'Seluruh Super Admin' },
];

const TaskModal = ({
  isOpen,
  onClose,
  onSave,
  task = null,
  projects = [],
  users = [],
  currentUserId = null,
  defaultStatus = 'TODO',
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    projectId: 'none',
    targetSelection: 'ALL', // 'ALL', 'ROLE:<role>', atau 'USER:<userId>'
    dueDate: '',
    dueTime: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (task) {
        let dDate = '';
        let dTime = '';
        if (task.dueDate) {
          const d = new Date(task.dueDate);
          dDate = d.toLocaleDateString('en-CA');
          dTime = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        }

        let selection = 'ALL';
        if (task.targetRole) {
          selection = `ROLE:${task.targetRole}`;
        } else if (task.assigneeId) {
          selection = `USER:${task.assigneeId}`;
        }

        setFormData({
          title: task.title || '',
          description: task.description || '',
          status: task.status || 'TODO',
          priority: task.priority || 'MEDIUM',
          projectId: task.projectId || 'none',
          targetSelection: selection,
          dueDate: dDate,
          dueTime: dTime,
        });
      } else {
        setFormData({
          title: '',
          description: '',
          status: defaultStatus || 'TODO',
          priority: 'MEDIUM',
          projectId: 'none',
          targetSelection: currentUserId ? `USER:${currentUserId}` : 'ALL',
          dueDate: '',
          dueTime: '',
        });
      }
    }
  }, [isOpen, task, currentUserId, defaultStatus]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Judul tugas wajib diisi!');
      return;
    }

    let finalDueDate = null;
    if (formData.dueDate) {
      const timeStr = formData.dueTime ? `${formData.dueTime}:00` : '23:59:59';
      finalDueDate = new Date(`${formData.dueDate}T${timeStr}`).toISOString();
    }

    let finalAssigneeId = null;
    let finalTargetRole = null;

    if (formData.targetSelection.startsWith('ROLE:')) {
      finalTargetRole = formData.targetSelection.replace('ROLE:', '');
      finalAssigneeId = null;
    } else if (formData.targetSelection.startsWith('USER:')) {
      finalAssigneeId = formData.targetSelection.replace('USER:', '');
      finalTargetRole = null;
    } else {
      // 'ALL' -> Seluruh Tim
      finalAssigneeId = null;
      finalTargetRole = null;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        id: task?.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        status: formData.status,
        priority: formData.priority,
        projectId: formData.projectId === 'none' ? null : formData.projectId,
        assigneeId: finalAssigneeId,
        targetRole: finalTargetRole,
        dueDate: finalDueDate,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#161513] border border-[#2e2b26] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Modal */}
        <div className="p-4 px-6 border-b border-[#282622] flex justify-between items-center bg-[#1c1a16]">
          <h2 className="text-lg font-serif text-[#f2ead9] flex items-center gap-2">
            {task ? 'Edit Tugas / Catatan' : 'Tambah Tugas / Catatan Baru'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#888] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[78vh]">
          {/* Judul Tugas */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#a89c85] uppercase tracking-wider mb-1.5">
              <Type size={14} className="text-[#d4af37]" /> Judul Tugas <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-[#0d0c0a] border border-[#333] rounded-xl px-3.5 py-2.5 text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-sm"
              placeholder="Contoh: Follow up persetujuan owner untuk sample cat"
            />
          </div>

          {/* Penerima Tugas & Terkait Proyek (2 Kolom) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ditujukan untuk siapa */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#a89c85] uppercase tracking-wider mb-1.5">
                <Users size={14} className="text-[#d4af37]" /> Ditujukan Kepada <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.targetSelection}
                onChange={(e) => setFormData({ ...formData, targetSelection: e.target.value })}
                className="w-full bg-[#0d0c0a] border border-[#333] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-sm"
              >
                <option value="ALL">Semua Orang (Seluruh Tim)</option>

                <optgroup label="Berdasarkan Divisi / Role" className="bg-[#1a1814] text-[#d4af37] font-semibold">
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={`ROLE:${r.value}`} className="bg-[#0d0c0a] text-white font-normal">
                      {r.label}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="Akun Spesifik" className="bg-[#1a1814] text-[#d4af37] font-semibold">
                  {users.map((u) => (
                    <option key={u.id} value={`USER:${u.id}`} className="bg-[#0d0c0a] text-white font-normal">
                      {u.name} ({u.role}) {u.id === currentUserId ? '— (Saya)' : ''}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Terkait Proyek */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#a89c85] uppercase tracking-wider mb-1.5">
                <FolderKanban size={14} className="text-[#d4af37]" /> Terkait Proyek
              </label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full bg-[#0d0c0a] border border-[#333] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-sm truncate"
              >
                <option value="none">Internal / Non-Proyek</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Kolom Status & Prioritas (2 Kolom) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#a89c85] uppercase tracking-wider mb-1.5">
                Status Kolom
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-[#0d0c0a] border border-[#333] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-sm"
              >
                <option value="TODO">To Do (Belum Dikerjakan)</option>
                <option value="IN_PROGRESS">In Progress (Sedang Dikerjakan)</option>
                <option value="DONE">Done (Selesai)</option>
              </select>
            </div>

            {/* Prioritas */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#a89c85] uppercase tracking-wider mb-1.5">
                <Flag size={14} className="text-[#d4af37]" /> Prioritas
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full bg-[#0d0c0a] border border-[#333] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-sm"
              >
                <option value="LOW">Rendah (Biasa)</option>
                <option value="MEDIUM">Normal (Sedang)</option>
                <option value="HIGH">Tinggi (Penting)</option>
                <option value="URGENT">Mendesak (Urgent)</option>
              </select>
            </div>
          </div>

          {/* Tenggat Waktu (Tanggal & Jam) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#a89c85] uppercase tracking-wider mb-1.5">
                <Calendar size={14} className="text-[#d4af37]" /> Tanggal Tenggat (Deadline)
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full bg-[#0d0c0a] border border-[#333] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-sm [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#a89c85] uppercase tracking-wider mb-1.5">
                <Clock size={14} className="text-[#d4af37]" /> Jam Tenggat
              </label>
              <input
                type="time"
                value={formData.dueTime}
                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                disabled={!formData.dueDate}
                className={`w-full bg-[#0d0c0a] border border-[#333] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-sm [color-scheme:dark] ${
                  !formData.dueDate ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>

          {/* Deskripsi / Detail Catatan */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#a89c85] uppercase tracking-wider mb-1.5">
              <AlignLeft size={14} className="text-[#d4af37]" /> Detail Catatan / Instruksi
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#0d0c0a] border border-[#333] rounded-xl p-3 text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-sm resize-y"
              placeholder="Tuliskan catatan lengkap, link referensi, no telepon pihak terkait, dll..."
            />
          </div>
        </form>

        {/* Footer Modal */}
        <div className="p-4 px-6 border-t border-[#282622] bg-[#1c1a16] flex justify-end gap-3 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#aaa] hover:text-white bg-transparent border border-[#444] hover:border-[#666] rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-5 py-2 text-sm font-semibold text-black bg-[#d4af37] hover:bg-[#b08d2c] rounded-xl transition-all shadow-md shadow-[#d4af37]/20 disabled:opacity-50"
          >
            {isSubmitting ? 'Menyimpan...' : task ? 'Simpan Perubahan' : 'Buat Tugas'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
