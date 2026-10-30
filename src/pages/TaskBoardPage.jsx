import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  CircleDashed,
  FolderKanban,
  UserCheck,
  Users,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { taskService } from '../services/taskService';
import { useProjects } from '../hooks/useProjects';
import { useAuth } from '../hooks/useAuth';
import TaskCard from '../components/tasks/TaskCard';
import TaskModal from '../components/tasks/TaskModal';
import Header from '../components/Header';

const COLUMNS = [
  { id: 'TODO', title: 'To Do', icon: CircleDashed, badgeColor: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30' },
  { id: 'IN_PROGRESS', title: 'In Progress', icon: Clock, badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { id: 'DONE', title: 'Done', icon: CheckCircle2, badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
];

const TaskBoardPage = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?.userId;
  const userRole = user?.role || 'PERENCANA';

  const { projects } = useProjects();
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [filterScope, setFilterScope] = useState('my'); // 'my' atau 'all'
  const [filterProject, setFilterProject] = useState('all'); // 'all', 'none', atau projectId
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTask, setModalTask] = useState(null);
  const [modalDefaultStatus, setModalDefaultStatus] = useState('TODO');

  // Inline Quick-Add states per column
  const [inlineTitles, setInlineTitles] = useState({ TODO: '', IN_PROGRESS: '', DONE: '' });
  const [activeInlineCol, setActiveInlineCol] = useState(null);

  // Load Users List for Assignee Dropdown
  const loadUsers = useCallback(async () => {
    try {
      const uList = await taskService.getUsers();
      setUsers(uList);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }, []);

  // Fetch Tasks with filters
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterScope === 'my') params.scope = 'my';
      if (filterProject !== 'all') params.projectId = filterProject;
      if (filterPriority !== 'all') params.priority = filterPriority;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const data = await taskService.getTasks(params);
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Gagal memuat daftar tugas.');
    } finally {
      setLoading(false);
    }
  }, [filterScope, filterProject, filterPriority, searchQuery]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Group tasks into columns
  const columnTasks = useMemo(() => {
    const map = { TODO: [], IN_PROGRESS: [], DONE: [] };
    tasks.forEach((t) => {
      if (map[t.status]) {
        map[t.status].push(t);
      } else {
        map.TODO.push(t);
      }
    });
    // Sort by order ascending
    Object.keys(map).forEach((col) => {
      map[col].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });
    return map;
  }, [tasks]);

  // Handle Drag and Drop
  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;

    const sourceList = Array.from(columnTasks[sourceColId] || []);
    const destList = sourceColId === destColId ? sourceList : Array.from(columnTasks[destColId] || []);

    const [movedTask] = sourceList.splice(source.index, 1);

    // Validasi izin jika memindahkan ke kolom status berbeda
    if (sourceColId !== destColId) {
      const isSuperAdmin = userRole === 'OWNER';
      const isCreator = movedTask.creatorId === currentUserId;
      const isDirectAssignee = movedTask.assigneeId && movedTask.assigneeId === currentUserId;
      const isRoleAssignee = movedTask.targetRole && movedTask.targetRole === userRole;
      const isPublicAssignee = !movedTask.assigneeId && !movedTask.targetRole;
      const canChangeStatus = isSuperAdmin || isCreator || isDirectAssignee || isRoleAssignee || isPublicAssignee;

      if (!canChangeStatus) {
        toast.error('Hanya pembuat, penerima tugas, atau Super Admin yang dapat memindahkan status tugas ini.');
        return;
      }
    }

    const updatedMovedTask = { ...movedTask, status: destColId };
    destList.splice(destination.index, 0, updatedMovedTask);

    // Optimistic UI state update
    const newTasks = tasks.map((t) => (t.id === movedTask.id ? updatedMovedTask : t));
    setTasks(newTasks);

    // Prepare batch reorder payload
    const payload = [];
    if (sourceColId === destColId) {
      destList.forEach((t, idx) => {
        payload.push({ id: t.id, status: destColId, order: idx });
      });
    } else {
      sourceList.forEach((t, idx) => {
        payload.push({ id: t.id, status: sourceColId, order: idx });
      });
      destList.forEach((t, idx) => {
        payload.push({ id: t.id, status: destColId, order: idx });
      });
    }

    try {
      await taskService.reorderTasks(payload);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Gagal menyimpan posisi tugas');
      fetchTasks();
    }
  };

  // Quick Inline Add Task
  const handleInlineAdd = async (status) => {
    const title = inlineTitles[status]?.trim();
    if (!title) return;

    try {
      const created = await taskService.createTask({
        title,
        status,
        projectId: filterProject !== 'all' && filterProject !== 'none' ? filterProject : null,
        assigneeId: currentUserId,
      });
      toast.success('Tugas ditambahkan!');
      setInlineTitles((prev) => ({ ...prev, [status]: '' }));
      setActiveInlineCol(null);
      setTasks((prev) => [created, ...prev]);
    } catch (err) {
      toast.error('Gagal menambahkan tugas');
    }
  };

  // Quick Toggle Complete Checkbox
  const handleToggleStatus = async (task) => {
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
    const nextText = nextStatus === 'DONE' ? 'Tugas selesai!' : 'Tugas dikembalikan ke To Do';
    try {
      const updated = await taskService.moveTask(task.id, { status: nextStatus });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      toast.success(nextText);
    } catch (err) {
      toast.error(err?.message || 'Gagal mengubah status tugas');
    }
  };

  // Open Add Modal
  const openAddModal = (status = 'TODO') => {
    setModalTask(null);
    setModalDefaultStatus(status);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (task) => {
    setModalTask(task);
    setIsModalOpen(true);
  };

  // Save Task (Create or Update)
  const handleSaveTask = async (taskData) => {
    if (taskData.id) {
      // Edit
      const updated = await taskService.updateTask(taskData.id, taskData);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      toast.success('Tugas diperbarui!');
    } else {
      // Create
      const created = await taskService.createTask(taskData);
      setTasks((prev) => [created, ...prev]);
      toast.success('Tugas baru berhasil dibuat!');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Yakin ingin menghapus tugas ini?')) return;
    try {
      await taskService.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success('Tugas berhasil dihapus');
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus tugas');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0b09] overflow-hidden">
      <Header />
      {/* TOP HEADER & TOOLBAR */}
      <div className="p-5 md:p-7 border-b border-[#222] bg-[#12100d] shrink-0 flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif text-[#f2ead9] flex items-center gap-3">
              <span>Papan Tugas & Catatan</span>
              <span className="text-xs font-sans px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30">
                Workspace Central
              </span>
            </h1>
            <p className="text-xs md:text-sm text-[#8a8070] mt-1">
              Pusat to-do list seluruh akun, monitoring pekerjaan tim, dan catatan proyek.
            </p>
          </div>

          {/* Action Button: Tambah Tugas Baru */}
          <button
            onClick={() => openAddModal('TODO')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#d4af37] text-black font-semibold text-sm hover:bg-[#b08d2c] transition-all shadow-md shadow-[#d4af37]/20 shrink-0 self-start md:self-auto"
          >
            <Plus size={18} />
            <span>Tambah Tugas Baru</span>
          </button>
        </div>

        {/* TOOLBAR CONTROLS: Scope Toggle, Filter Proyek, Filter Prioritas, Search */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {/* Toggle: Tugas Saya vs Semua Tugas */}
          <div className="flex items-center bg-[#1a1814] p-1 rounded-xl border border-[#2e2a22]">
            <button
              onClick={() => setFilterScope('my')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterScope === 'my'
                  ? 'bg-[#d4af37] text-black font-semibold shadow-sm'
                  : 'text-[#888] hover:text-white'
              }`}
            >
              <UserCheck size={14} />
              <span>Tugas Saya</span>
            </button>
            <button
              onClick={() => setFilterScope('all')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterScope === 'all'
                  ? 'bg-[#d4af37] text-black font-semibold shadow-sm'
                  : 'text-[#888] hover:text-white'
              }`}
            >
              <Users size={14} />
              <span>Semua Tugas</span>
            </button>
          </div>

          {/* Filter Proyek Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#161513] border border-[#2e2a22] rounded-xl px-3 py-1.5 text-xs">
            <FolderKanban size={14} className="text-[#d4af37] shrink-0" />
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="all" className="bg-[#161513]">Semua Proyek</option>
              <option value="none" className="bg-[#161513]">Non-Proyek / Internal</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#161513]">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Prioritas */}
          <div className="flex items-center gap-1.5 bg-[#161513] border border-[#2e2a22] rounded-xl px-3 py-1.5 text-xs">
            <Filter size={14} className="text-[#888] shrink-0" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#161513]">Semua Prioritas</option>
              <option value="URGENT" className="bg-[#161513]">Urgent</option>
              <option value="HIGH" className="bg-[#161513]">Tinggi</option>
              <option value="MEDIUM" className="bg-[#161513]">Normal</option>
              <option value="LOW" className="bg-[#161513]">Rendah</option>
            </select>
          </div>

          {/* Instant Search Bar */}
          <div className="flex-1 min-w-[200px] relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666]" />
            <input
              type="text"
              placeholder="Cari tugas atau catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#161513] border border-[#2e2a22] rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#d4af37] transition-all"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchTasks}
            title="Muat ulang data"
            className="p-2 rounded-xl bg-[#161513] border border-[#2e2a22] text-[#888] hover:text-white hover:border-[#555] transition-colors"
          >
            <RotateCcw size={14} className={loading ? 'animate-spin text-[#d4af37]' : ''} />
          </button>
        </div>
      </div>

      {/* KANBAN BOARD CONTAINER (3 KOLOM STANDAR) */}
      <div className="flex-1 overflow-x-auto p-5 md:p-7">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-5 h-full items-start min-w-[850px]">
            {COLUMNS.map((column) => {
              const colTasks = columnTasks[column.id] || [];
              const Icon = column.icon;
              const isInlineOpen = activeInlineCol === column.id;

              return (
                <div
                  key={column.id}
                  className="bg-[#13120f] border border-[#26241e] rounded-2xl w-80 shrink-0 flex flex-col max-h-full shadow-xl"
                >
                  {/* Column Header */}
                  <div className="p-3.5 px-4 border-b border-[#22201a] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="text-[#d4af37]" />
                      <h2 className="font-semibold text-white text-sm tracking-wide">
                        {column.title}
                      </h2>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-bold ${column.badgeColor}`}
                      >
                        {colTasks.length}
                      </span>
                    </div>

                    <button
                      onClick={() => openAddModal(column.id)}
                      className="p-1 rounded-md text-[#888] hover:text-[#d4af37] hover:bg-white/5 transition-colors"
                      title={`Tambah tugas ke ${column.title}`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Droppable Task List */}
                  <Droppable droppableId={column.id} type="task">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-3 flex-1 overflow-y-auto min-h-[140px] flex flex-col gap-2.5 transition-colors ${
                          snapshot.isDraggingOver ? 'bg-white/[0.02]' : ''
                        }`}
                      >
                        {colTasks.map((task, index) => {
                          const isSuperAdmin = userRole === 'OWNER';
                          const isCreator = task.creatorId === currentUserId;
                          const isDirectAssignee = task.assigneeId && task.assigneeId === currentUserId;
                          const isRoleAssignee = task.targetRole && task.targetRole === userRole;
                          const isPublicAssignee = !task.assigneeId && !task.targetRole;
                          const canChangeStatus = isSuperAdmin || isCreator || isDirectAssignee || isRoleAssignee || isPublicAssignee;

                          return (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                              isDragDisabled={!canChangeStatus}
                            >
                              {(dragProvided, dragSnapshot) => (
                                <TaskCard
                                  task={task}
                                  index={index}
                                  provided={dragProvided}
                                  snapshot={dragSnapshot}
                                  currentUserId={currentUserId}
                                  userRole={userRole}
                                  onEdit={openEditModal}
                                  onDelete={handleDeleteTask}
                                  onToggleStatus={handleToggleStatus}
                                />
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}

                        {colTasks.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex flex-col items-center justify-center p-6 text-center text-[#555] border border-dashed border-[#26241e] rounded-xl my-2">
                            <p className="text-xs">Belum ada tugas di kolom ini.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>

                  {/* Inline Quick Add at bottom of column */}
                  <div className="p-3 pt-1 border-t border-[#22201a]">
                    {isInlineOpen ? (
                      <div className="flex flex-col gap-2 animate-in fade-in duration-100">
                        <input
                          type="text"
                          autoFocus
                          placeholder="Ketik judul lalu Enter..."
                          value={inlineTitles[column.id] || ''}
                          onChange={(e) =>
                            setInlineTitles((prev) => ({
                              ...prev,
                              [column.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleInlineAdd(column.id);
                            if (e.key === 'Escape') setActiveInlineCol(null);
                          }}
                          className="w-full bg-[#1c1a16] border border-[#d4af37]/50 rounded-xl px-3 py-2 text-xs text-white placeholder-[#666] focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveInlineCol(null)}
                            className="px-2.5 py-1 text-xs text-[#888] hover:text-white"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInlineAdd(column.id)}
                            className="px-3 py-1 bg-[#d4af37] text-black font-semibold rounded-lg text-xs hover:bg-[#b08d2c]"
                          >
                            Tambah
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActiveInlineCol(column.id)}
                        className="w-full py-2 flex items-center justify-center gap-2 text-xs text-[#888] hover:bg-white/5 hover:text-[#f2ead9] rounded-xl transition-colors border border-transparent hover:border-[#333]"
                      >
                        <Plus size={14} />
                        <span>Tambah Kartu Cepat</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* MODAL FORM TAMBAH / EDIT TUGAS */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        task={modalTask}
        projects={projects}
        users={users}
        currentUserId={currentUserId}
        defaultStatus={modalDefaultStatus}
      />
    </div>
  );
};

export default TaskBoardPage;
