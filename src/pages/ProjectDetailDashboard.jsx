import React, { useState, useEffect } from 'react';
import { ChevronLeft, Wallet, ShoppingCart, Percent, Loader2, Calendar } from 'lucide-react';
import KanbanBoard from '../components/kanban/KanbanBoard';

const ProjectDetailDashboard = ({ projectId, onBack }) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:4000/api/projects/${projectId}`);
        if (!response.ok) throw new Error('Gagal memuat detail proyek');
        const projectData = await response.json();
        
        setProject(projectData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#0c0b09] text-[#888]">
        <Loader2 size={32} className="animate-spin text-[#d4af37] mb-4" />
        <p>Memuat dashboard proyek...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#0c0b09] text-[#ef4444]">
        <p>{error || 'Proyek tidak ditemukan'}</p>
        <button 
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md text-white transition-colors"
        >
          Kembali ke Board
        </button>
      </div>
    );
  }

  // Menghitung Metrik Ringkasan (Bisa disesuaikan jika data datang langsung dari Backend)
  // Untuk contoh kita ambil properti statis atau default
  const totalRAB = project.rabItems?.reduce((sum, item) => sum + (Number(item.rabTotalPrice) || 0), 0) || 0;
  // Di sistem sebenarnya ini mungkin dihitung dari total PurchaseOrder yang statusnya Approved
  const totalPengeluaran = project.purchaseOrders?.reduce((sum, po) => sum + (Number(po.grandTotal) || Number(po.subTotal) || 0), 0) || 0; 
  const progress = project.progress || 0;

  const formatCurrency = (val) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(val);

  return (
    <div className="flex flex-col h-full bg-[#0c0b09] overflow-hidden">
      {/* HEADER TINGKAT ATAS */}
      <header className="flex items-center gap-4 p-6 bg-[#12100d] border-b border-[#222] shrink-0 sticky top-0 z-20 shadow-md">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-white/5 rounded-full text-[#888] hover:text-white transition-colors"
          title="Kembali ke Daftar Proyek"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">{project.name}</h1>
          <p className="text-sm text-[#888] mt-1 flex items-center gap-2">
            <span>Client: {project.client?.name || '-'}</span>
            <span>&bull;</span>
            <span>📍 {project.location || '-'}</span>
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
        
        {/* WIDGET SUMMARY CARD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
          {/* Card: Total RAB (Budget) */}
          <div className="bg-[#161513] border border-[#2a2a2a] p-5 rounded-2xl flex items-start gap-4 shadow-lg hover:border-[#d4af37]/50 transition-colors">
            <div className="p-3 bg-[#d4af37]/10 rounded-xl text-[#d4af37]">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-[#888] text-xs font-bold uppercase tracking-wider mb-1">Total Budget (RAB)</p>
              <p className="text-xl md:text-2xl font-black text-white">{formatCurrency(totalRAB)}</p>
            </div>
          </div>

          {/* Card: Total Pengeluaran */}
          <div className="bg-[#161513] border border-[#2a2a2a] p-5 rounded-2xl flex items-start gap-4 shadow-lg hover:border-[#ef4444]/50 transition-colors">
            <div className="p-3 bg-[#ef4444]/10 rounded-xl text-[#ef4444]">
              <ShoppingCart size={24} />
            </div>
            <div>
              <p className="text-[#888] text-xs font-bold uppercase tracking-wider mb-1">Total Pengeluaran (PO)</p>
              <p className="text-xl md:text-2xl font-black text-white">{formatCurrency(totalPengeluaran)}</p>
            </div>
          </div>

          {/* Card: Progress Proyek */}
          <div className="bg-[#161513] border border-[#2a2a2a] p-5 rounded-2xl flex items-start gap-4 shadow-lg hover:border-[#3b82f6]/50 transition-colors">
            <div className="p-3 bg-[#3b82f6]/10 rounded-xl text-[#3b82f6]">
              <Percent size={24} />
            </div>
            <div className="w-full">
              <p className="text-[#888] text-xs font-bold uppercase tracking-wider mb-1">Progress Proyek</p>
              <div className="flex items-end justify-between mb-2">
                <p className="text-xl md:text-2xl font-black text-white">{progress}%</p>
              </div>
              <div className="w-full h-2 bg-[#222] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] rounded-full" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* KANBAN BOARD SECTION */}
        <div className="flex-1 flex flex-col min-h-[500px] border border-[#222] bg-[#0f0e0c] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#222] bg-[#161513] flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar size={18} className="text-[#d4af37]" />
              Project Task Board
            </h2>
          </div>
          
          <div className="flex-1 overflow-x-auto p-4">
            <KanbanBoard projectId={projectId} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProjectDetailDashboard;
