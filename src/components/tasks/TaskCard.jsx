import React from 'react';
import {
  Calendar,
  Clock,
  Edit2,
  Trash2,
  CheckCircle2,
  Circle,
  AlertTriangle,
  FolderKanban,
  Flag,
  Users,
  UserCheck,
  ShieldAlert,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';

const PRIORITY_CONFIG = {
  URGENT: { label: 'Urgent', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  HIGH: { label: 'Tinggi', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  MEDIUM: { label: 'Normal', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  LOW: { label: 'Rendah', bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
};

const ROLE_LABEL = {
  PERENCANA: 'Tim Perencana',
  PELAKSANA: 'Tim Pelaksana',
  FINANCE: 'Tim Finance',
  PURCHASING: 'Tim Purchasing',
  ADMIN: 'Admin',
  OWNER: 'Owner',
};

const getInitials = (name = '') => {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const TaskCard = ({
  task,
  index,
  provided,
  snapshot,
  currentUserId,
  userRole,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const isSuperAdmin = userRole === 'OWNER';
  const isCreator = task.creatorId === currentUserId;
  const isDirectAssignee = task.assigneeId && task.assigneeId === currentUserId;
  const isRoleAssignee = task.targetRole && task.targetRole === userRole;
  const isPublicAssignee = !task.assigneeId && !task.targetRole;

  // HAK AKSES UBAH STATUS (To Do -> In Progress -> Done)
  // Hanya Creator, Super Admin, atau Penerima Tugas (perorangan, divisi, atau publik) yang berhak!
  const canChangeStatus = isSuperAdmin || isCreator || isDirectAssignee || isRoleAssignee || isPublicAssignee;

  // HAK AKSES EDIT & HAPUS DETAIL: Hanya Creator atau Super Admin
  const canModify = isSuperAdmin || isCreator;
  const isDone = task.status === 'DONE';

  // Format Due Date & Urgency
  let dateText = null;
  let isOverdue = false;
  let isToday = false;

  if (task.dueDate) {
    const d = new Date(task.dueDate);
    const now = new Date();
    const isSameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();

    isToday = isSameDay;
    isOverdue = d < now && !isSameDay && !isDone;

    dateText = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    if (d.getHours() !== 23 || d.getMinutes() !== 59) {
      dateText += `, ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
    }
  }

  const priorityStyle = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    if (!canChangeStatus) {
      toast.error('Hanya pembuat, penerima tugas, atau Super Admin yang dapat mengubah status tugas ini.');
      return;
    }
    onToggleStatus(task);
  };

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={`group relative bg-[#181714] border rounded-xl p-3.5 transition-all flex flex-col gap-2.5 ${
        snapshot.isDragging
          ? 'shadow-2xl shadow-black/80 ring-2 ring-[#d4af37] rotate-1 z-50 bg-[#201e19] border-[#d4af37]'
          : isDone
          ? 'border-[#282622] opacity-75 hover:opacity-100 hover:border-[#444]'
          : 'border-[#2d2922] hover:border-[#4a4437] hover:shadow-lg'
      } ${!canChangeStatus ? 'cursor-default' : ''}`}
    >
      {/* Baris Atas: Badge Project, Priority & Action Buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {task.project ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20 px-2 py-0.5 rounded-md truncate max-w-[170px]">
              <FolderKanban size={11} className="shrink-0" />
              <span className="truncate">{task.project.name}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-white/5 text-[#888] border border-white/10 px-2 py-0.5 rounded-md">
              Internal
            </span>
          )}

          {/* Priority Badge */}
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}
          >
            {priorityStyle.label}
          </span>
        </div>

        {/* Edit & Delete Action Buttons (hanya untuk Creator & Super Admin) */}
        {canModify && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              title="Edit Tugas"
              className="p-1 rounded text-[#888] hover:text-[#d4af37] hover:bg-white/5 transition-colors"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              title="Hapus Tugas"
              className="p-1 rounded text-[#888] hover:text-[#ef4444] hover:bg-white/5 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Baris Tengah: Checkbox + Judul Tugas */}
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={handleCheckboxClick}
          title={
            !canChangeStatus
              ? 'Hanya pembuat atau penerima yang dapat mengubah status tugas ini'
              : isDone
              ? 'Tandai belum selesai'
              : 'Tandai selesai'
          }
          className={`mt-0.5 shrink-0 transition-colors ${
            !canChangeStatus
              ? 'opacity-30 cursor-not-allowed text-[#555]'
              : 'text-[#666] hover:text-[#d4af37]'
          }`}
        >
          {isDone ? (
            <CheckCircle2 size={18} className={canChangeStatus ? 'text-[#10b981]' : 'text-zinc-600'} />
          ) : (
            <Circle size={18} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium leading-snug break-words ${
              isDone ? 'line-through text-[#777]' : 'text-[#f2ead9]'
            }`}
          >
            {task.title}
          </p>

          {task.description && (
            <p className="text-xs text-[#8a8070] mt-1 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}
        </div>
      </div>

      {/* Info Pembuat & Ditujukan Kepada (Informasi Akuntabilitas) */}
      <div className="pt-2 border-t border-[#23211c] flex flex-col gap-1.5 text-[11px]">
        {/* Baris: Dibuat Oleh */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[#888]">
            <span className="text-[#666]">Dibuat oleh:</span>
            <span className="text-[#e2dac8] font-medium truncate max-w-[140px]" title={task.creator?.name}>
              {task.creator?.name || 'User'}
            </span>
          </div>

          {/* Indikator Deadline */}
          {dateText ? (
            <div
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                isOverdue
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30 font-semibold'
                  : isToday
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-[#888] bg-white/5'
              }`}
            >
              {isOverdue ? <AlertTriangle size={10} className="text-red-400" /> : <Clock size={10} />}
              <span>{dateText}</span>
            </div>
          ) : (
            <span className="text-[#555] text-[10px]">Tanpa tenggat</span>
          )}
        </div>

        {/* Baris: Ditujukan Kepada (Personal, Divisi, atau Seluruh Tim) */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#1e1c17]">
          <span className="text-[#666] text-[10px]">Ditujukan untuk:</span>

          {task.assignee ? (
            /* Ditujukan ke 1 Akun Spesifik */
            <div
              className="flex items-center gap-1.5 shrink-0"
              title={`Ditujukan kepada: ${task.assignee.name} (${task.assignee.role})`}
            >
              <span className="text-[10px] text-[#bbb] font-medium truncate max-w-[130px]">
                {task.assignee.name}
              </span>
              <div
                className="w-5 h-5 rounded-full bg-[#2a261f] border border-[#d4af37]/40 flex items-center justify-center text-[9px] font-bold text-[#d4af37]"
              >
                {getInitials(task.assignee.name)}
              </div>
            </div>
          ) : task.targetRole ? (
            /* Ditujukan ke Seluruh Divisi / Role */
            <div
              className="flex items-center gap-1 shrink-0"
              title={`Ditujukan untuk seluruh ${ROLE_LABEL[task.targetRole] || task.targetRole}`}
            >
              <span className="text-[10px] font-medium text-sky-400 bg-sky-500/10 border border-sky-500/25 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Users size={11} />
                <span>{ROLE_LABEL[task.targetRole] || task.targetRole}</span>
              </span>
            </div>
          ) : (
            /* Ditujukan ke Seluruh Tim */
            <div
              className="flex items-center gap-1 shrink-0"
              title="Ditujukan untuk semua orang (Seluruh Tim)"
            >
              <span className="text-[10px] font-medium text-[#d4af37] bg-[#d4af37]/10 border border-[#d4af37]/25 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Users size={11} />
                <span>Semua Tim</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
