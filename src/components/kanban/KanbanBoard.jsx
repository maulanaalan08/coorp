import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, MoreHorizontal, Calendar as CalendarIcon, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import TaskFormModal from './TaskFormModal';

const KanbanBoard = ({ projectId }) => {
  const [boardData, setBoardData] = useState({ lists: [] });
  const [loading, setLoading] = useState(true);
  const [boardId, setBoardId] = useState(null);
  
  // State untuk modal form task
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTaskData, setModalTaskData] = useState(null); // null = tambah, object = edit
  const [modalListId, setModalListId] = useState(null);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:4000/api/projects/${projectId}/kanban`);
      if (!res.ok) throw new Error('Failed to fetch board');
      const data = await res.json();
      setBoardId(data.data.id);
      setBoardData({ lists: data.data.lists || [] });
    } catch (error) {
      toast.error('Gagal memuat papan Kanban');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchBoard();
  }, [projectId]);

  const onDragEnd = async (result) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const newLists = Array.from(boardData.lists);

    if (type === 'list') {
      const [movedList] = newLists.splice(source.index, 1);
      newLists.splice(destination.index, 0, movedList);
      setBoardData({ lists: newLists });
      
      try {
        await fetch(`http://localhost:4000/api/kanban/boards/${boardId}/reorder`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lists: newLists })
        });
      } catch (e) {
        toast.error('Gagal menyimpan urutan list');
      }
      return;
    }

    // Pindah Card
    const sourceListIndex = newLists.findIndex(l => l.id === source.droppableId);
    const destListIndex = newLists.findIndex(l => l.id === destination.droppableId);
    
    const sourceList = newLists[sourceListIndex];
    const destList = newLists[destListIndex];
    
    const sourceTasks = Array.from(sourceList.tasks || []);
    const destTasks = source.droppableId === destination.droppableId 
      ? sourceTasks 
      : Array.from(destList.tasks || []);

    const [movedTask] = sourceTasks.splice(source.index, 1);
    destTasks.splice(destination.index, 0, movedTask);

    newLists[sourceListIndex] = { ...sourceList, tasks: sourceTasks };
    if (source.droppableId !== destination.droppableId) {
      newLists[destListIndex] = { ...destList, tasks: destTasks };
    }

    setBoardData({ lists: newLists });

    try {
      await fetch(`http://localhost:4000/api/kanban/boards/${boardId}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists: newLists })
      });
    } catch (e) {
      toast.error('Gagal menyimpan posisi tugas');
    }
  };

  const handleAddList = async () => {
    const title = prompt('Nama List Baru:');
    if (!title) return;
    try {
      const res = await fetch(`http://localhost:4000/api/kanban/boards/${boardId}/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      if (res.ok) fetchBoard();
    } catch (e) {
      toast.error('Gagal membuat list');
    }
  };

  const openAddTaskModal = (listId) => {
    setModalListId(listId);
    setModalTaskData(null);
    setIsModalOpen(true);
  };

  const openEditTaskModal = (task) => {
    setModalTaskData(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (taskData) => {
    setIsModalOpen(false);
    toast.loading('Menyimpan tugas...', { id: 'save-task' });
    try {
      if (taskData.id) {
        // Mode Edit
        const res = await fetch(`http://localhost:4000/api/kanban/tasks/${taskData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });
        if (res.ok) {
          toast.success('Tugas diperbarui!', { id: 'save-task' });
          fetchBoard();
        } else throw new Error('Gagal update');
      } else {
        // Mode Tambah
        const res = await fetch(`http://localhost:4000/api/kanban/lists/${modalListId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });
        if (res.ok) {
          toast.success('Tugas dibuat!', { id: 'save-task' });
          fetchBoard();
        } else throw new Error('Gagal buat');
      }
    } catch (e) {
      toast.error('Gagal menyimpan tugas', { id: 'save-task' });
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Hapus tugas ini?')) return;
    try {
      toast.loading('Menghapus...', { id: 'del-task' });
      const res = await fetch(`http://localhost:4000/api/kanban/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Dihapus', { id: 'del-task' });
        fetchBoard();
      }
    } catch (e) {
      toast.error('Gagal menghapus', { id: 'del-task' });
    }
  };

  const handleDeleteList = async (listId) => {
    if (!window.confirm('PERINGATAN: Menghapus List ini akan menghapus SEMUA task di dalamnya secara permanen (termasuk dari Google Calendar). Anda yakin?')) return;
    try {
      toast.loading('Menghapus List...', { id: 'del-list' });
      const res = await fetch(`http://localhost:4000/api/kanban/lists/${listId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('List dihapus', { id: 'del-list' });
        fetchBoard();
      }
    } catch (e) {
      toast.error('Gagal menghapus list', { id: 'del-list' });
    }
  };

  if (loading) return <div className="text-[#888] p-4">Loading Kanban Board...</div>;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="all-lists" direction="horizontal" type="list">
        {(provided) => (
          <div 
            {...provided.droppableProps} 
            ref={provided.innerRef}
            className="flex gap-4 h-full items-start"
          >
            {boardData.lists.map((list, index) => (
              <Draggable key={list.id} draggableId={list.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`bg-[#161513] border border-[#222] rounded-xl w-72 shrink-0 flex flex-col max-h-full ${
                      snapshot.isDragging ? 'shadow-2xl shadow-black/50 rotate-1' : ''
                    }`}
                  >
                    <div 
                      {...provided.dragHandleProps}
                      className="p-3 border-b border-[#222] flex items-center justify-between group"
                    >
                      <h3 className="font-bold text-white text-sm">{list.title}</h3>
                      <button 
                        onClick={() => handleDeleteList(list.id)}
                        className="text-[#555] hover:text-[#ef4444] transition-colors"
                        title="Hapus List"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <Droppable droppableId={list.id} type="task">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`p-2 flex-1 overflow-y-auto min-h-[100px] flex flex-col gap-2 ${
                            snapshot.isDraggingOver ? 'bg-white/5' : ''
                          }`}
                        >
                          {(list.tasks || []).map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-[#222] p-3 rounded-lg border border-[#333] group hover:border-[#555] ${
                                    snapshot.isDragging ? 'shadow-lg rotate-2 z-50 ring-1 ring-[#d4af37]' : ''
                                  }`}
                                >
                                  <div className="flex justify-between items-start mb-2 group/btns">
                                    <p className="text-sm text-white font-medium break-words pr-2">{task.title}</p>
                                    <div className="flex items-center gap-2 opacity-0 group-hover/btns:opacity-100 transition-opacity shrink-0">
                                      <button 
                                        onClick={() => openEditTaskModal(task)}
                                        className="text-[#555] hover:text-[#d4af37]"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="text-[#555] hover:text-[#ef4444]"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {task.description && (
                                    <p className="text-xs text-[#888] line-clamp-2 mb-2 leading-relaxed">
                                      {task.description}
                                    </p>
                                  )}
                                  
                                  {task.dueDate && (
                                    <div className="flex items-center gap-1.5 text-xs text-[#888] mt-2 bg-[#111] w-fit px-2 py-1 rounded">
                                      <CalendarIcon size={12} className={task.googleEventId ? "text-[#3b82f6]" : ""} />
                                      <span className={new Date(task.dueDate) < new Date() ? 'text-[#ef4444]' : ''}>
                                        {new Date(task.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                        {new Date(task.dueDate).getHours() > 0 ? `, ${new Date(task.dueDate).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}` : ''}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>

                    <div className="p-2 pt-0">
                      <button 
                        onClick={() => openAddTaskModal(list.id)}
                        className="w-full py-2 flex items-center justify-center gap-2 text-sm text-[#888] hover:bg-white/5 hover:text-white rounded-lg transition-colors"
                      >
                        <Plus size={16} /> Add Task
                      </button>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            
            {/* Add List Button */}
            <button 
              onClick={handleAddList}
              className="bg-white/5 hover:bg-white/10 border border-dashed border-[#444] hover:border-[#888] text-[#888] hover:text-white rounded-xl w-72 shrink-0 flex items-center justify-center gap-2 h-12 transition-colors"
            >
              <Plus size={16} /> Add Another List
            </button>
          </div>
        )}
      </Droppable>

      {/* MODAL UNTUK ADD / EDIT TASK */}
      <TaskFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        task={modalTaskData}
      />
    </DragDropContext>
  );
};

export default KanbanBoard;
