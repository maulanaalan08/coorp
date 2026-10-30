import React, { useState } from "react";
import { CheckSquare, LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import NotificationBell from "./NotificationBell";
import QuickTaskDrawer from "./tasks/QuickTaskDrawer";
import { useNav } from "../contexts/NavContext";

const Header = () => {
  const { user, logoutAuth } = useAuth();
  const nav = useNav();
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between w-full px-5 py-6 md:px-10 bg-[#0c0b09] gap-4 pl-16 md:pl-10 relative">
      <div className="flex flex-col">
        <h2 className="font-serif text-2xl md:text-3xl text-[#f2ead9] mb-1 leading-tight">
          Selamat datang kembali, {user?.name || "Pengguna"}.
        </h2>
        <p className="text-[#a89c85] text-xs md:text-sm">
          Berikut adalah ringkasan proyek PT. Dives Jaya Perkasa hari ini.
        </p>
      </div>

      <div className="flex items-center gap-3 md:gap-4 self-end md:self-auto">
        {/* Lonceng Notifikasi PO & Keuangan */}
        <NotificationBell onNavigate={nav} />

        {/* Akses Cepat To-Do & Catatan */}
        <button
          onClick={() => setIsTaskDrawerOpen(true)}
          className="p-2 rounded-full text-[#a89c85] hover:text-[#d4af37] hover:bg-white/5 transition-colors relative"
          type="button"
          title="To-Do & Catatan Cepat"
        >
          <CheckSquare size={20} />
        </button>

        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-[#7d6733] overflow-hidden shrink-0">
          <img 
            src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=d4af37&color=fff`} 
            alt="Avatar Pengguna" 
            title={user?.name}
            className="w-full h-full object-cover"
          />
        </div>

        <button 
          className="p-2 rounded-full text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors" 
          type="button" 
          onClick={logoutAuth} 
          title="Keluar"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* Flyout Drawer To-Do Cepat */}
      <QuickTaskDrawer
        isOpen={isTaskDrawerOpen}
        onClose={() => setIsTaskDrawerOpen(false)}
        onNavigateToBoard={() => {
          if (typeof nav === "function") nav("task-board");
          else window.location.hash = "task-board";
        }}
      />
    </header>
  );
};

export default Header;