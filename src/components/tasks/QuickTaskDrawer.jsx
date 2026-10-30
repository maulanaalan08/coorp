import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  FolderKanban,
  ArrowRight,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { taskService } from '../../services/taskService';
import { useAuth } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';

const QuickTaskDrawer = ({ isOpen, onClose, onNavigateToBoard }) => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?.userId;
  const { projects } = useProjects();

  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickProjectId, setQuickProjectId] = useState('none');
  const [submitting, setSubmitting] = useState(false);

  const fetchMyTasks = useCallback(async () => {
    if (!isOpen) return;
    try {
      setLoading(true);
      const data = await taskService.getTasks({ scope: 'my' });
      setMyTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  if (!isOpen) return null;

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    try {
      setSubmitting(true);
      const newTask = await taskService.createTask({
        title: quickTitle.trim(),
        status: 'TODO',
        priority: 'MEDIUM',
        projectId: quickProjectId !== 'none' ? quickProjectId : null,
        assigneeId: currentUserId,
      });
      toast.success('Tugas baru dicatat!');
      setQuickTitle('');
      setMyTasks((prev) => [newTask, ...prev]);
    } catch (err) {
      toast.error('Gagal mencatat tugas');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (task) => {
    const userRole = user?.role || '';
    const isSuperAdmin = userRole === 'OWNER';
    const isCreator = task.creatorId === currentUserId;
    const isDirectAssignee = task.assigneeId && task.assigneeId === currentUserId;
    const isRoleAssignee = task.targetRole && task.targetRole === userRole;
    const isPublicAssignee = !task.assigneeId && !task.targetRole;
    const canChangeStatus = isSuperAdmin || isCreator || isDirectAssignee || isRoleAssignee || isPublicAssignee;

    if (!canChangeStatus) {
      toast.error('Hanya pembuat, penerima tugas, atau Super Admin yang dapat mengubah status tugas ini.');
      return;
    }

    const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    try {
      const updated = await taskService.moveTask(task.id, { status: nextStatus });
      setMyTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      toast.error(err?.message || 'Gagal memperbarui status');
    }
  };

  const activeTasks = myTasks.filter((t) => t.status !== 'DONE');
  const completedTasks = myTasks.filter((t) => t.status === 'DONE');

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-[#14120e] border-l border-[#2e2a22] shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#25221b] bg-[#1a1712] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#d4af37]/15 rounded-xl text-[#d4af37]">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="font-serif text-lg text-[#f2ead9]">To-Do & Catatan Cepat</h2>
              <p className="text-xs text-[#8a8070]">
                {activeTasks.length} tugas aktif untuk Anda
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={fetchMyTasks}
              className="p-1.5 text-[#888] hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              title="Refresh"
            >
              <RotateCcw size={16} className={loading ? 'animate-spin text-[#d4af37]' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#888] hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Input Bar */}
        <form onSubmit={handleQuickAdd} className="p-4 border-b border-[#222019] bg-[#171510] flex flex-col gap-2.5">
          <div className="flex items-center gap-2 bg-[#0c0b09] border border-[#333] rounded-xl px-3 py-2 focus-within:border-[#d4af37] transition-all">
            <input
              type="text"
              placeholder="Catat pekerjaan mendadak / memo..."
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-[#666] focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting || !quickTitle.trim()}
              className="px-2.5 py-1 bg-[#d4af37] text-black font-semibold rounded-lg text-xs hover:bg-[#b08d2c] transition-all disabled:opacity-40 shrink-0"
            >
              + Catat
            </button>
          </div>

          {/* Quick Project Selector */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#888]">
            <FolderKanban size={12} className="text-[#d4af37]" />
            <span>Proyek:</span>
            <select
              value={quickProjectId}
              onChange={(e) => setQuickProjectId(e.target.value)}
              className="bg-transparent text-white border-b border-[#333] focus:outline-none focus:border-[#d4af37] cursor-pointer max-w-[200px] truncate"
            >
              <option value="none" className="bg-[#14120e]">Internal / Umum</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#14120e]">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </form>

        {/* Task List Items */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {activeTasks.length === 0 && completedTasks.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center p-8 text-center text-[#666] my-auto">
              <CheckCircle2 size={36} className="text-[#333] mb-2" />
              <p className="text-sm font-medium text-[#aaa]">Tidak ada to-do aktif</p>
              <p className="text-xs text-[#666] mt-1">Semua pekerjaan Anda telah selesai!</p>
            </div>
          )}

          {/* Active Tasks */}
          {activeTasks.map((t) => {
            const isDone = t.status === 'DONE';
            let isOverdue = false;
            let dateText = null;
            if (t.dueDate) {
              const d = new Date(t.dueDate);
              isOverdue = d < new Date();
              dateText = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            }

            return (
              <div
                key={t.id}
                className="bg-[#191712] border border-[#2b271f] rounded-xl p-3 flex items-start gap-2.5 hover:border-[#443f33] transition-colors group"
              >
                <button
                  type="button"
                  onClick={() => handleToggleStatus(t)}
                  className="mt-0.5 text-[#666] hover:text-[#d4af37] shrink-0"
                >
                  <Circle size={16} />
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#f2ead9] leading-snug break-words">
                    {t.title}
                  </p>

                  <div className="flex items-center gap-2 mt-2 flex-wrap text-[10px]">
                    {t.project ? (
                      <span className="bg-[#d4af37]/10 text-[#d4af37] px-1.5 py-0.5 rounded truncate max-w-[140px]">
                        {t.project.name}
                      </span>
                    ) : (
                      <span className="bg-white/5 text-[#888] px-1.5 py-0.5 rounded">
                        Internal
                      </span>
                    )}

                    {dateText && (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ${
                          isOverdue ? 'bg-red-500/15 text-red-400' : 'text-[#888] bg-white/5'
                        }`}
                      >
                        {isOverdue && <AlertTriangle size={10} />}
                        <Clock size={10} />
                        {dateText}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Completed Tasks Accordion */}
          {completedTasks.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#232018]">
              <p className="text-xs font-semibold text-[#666] mb-2 uppercase tracking-wider">
                Selesai ({completedTasks.length})
              </p>
              <div className="flex flex-col gap-2">
                {completedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="bg-[#161410] border border-[#222019] rounded-xl p-2.5 flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(t)}
                      className="text-[#10b981] hover:text-[#f59e0b] shrink-0"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                    <span className="text-xs text-[#777] line-through truncate flex-1">
                      {t.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#25221b] bg-[#1a1712]">
          <button
            onClick={() => {
              onClose();
              if (onNavigateToBoard) onNavigateToBoard();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#d4af37] text-black font-semibold text-xs hover:bg-[#b08d2c] transition-all shadow-md shadow-[#d4af37]/20"
          >
            <span>Buka Papan Tugas Lengkap</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickTaskDrawer;
