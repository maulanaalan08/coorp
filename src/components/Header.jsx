import React from "react";
import { Search, Bell, Grid, LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth"; 

const Header = () => {
  const { user, logoutAuth } = useAuth(); 

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between w-full px-5 py-6 md:px-10 bg-[#0c0b09] gap-4 pl-16 md:pl-10 relative">
      <div className="flex flex-col">
        <h2 className="font-serif text-2xl md:text-3xl text-[#f2ead9] mb-1 leading-tight">
          Welcome back, {user?.name || "User"}.
        </h2>
        <p className="text-[#a89c85] text-xs md:text-sm">
          Here is the summary of PT. Dives Jaya Perkasa projects today.
        </p>
      </div>

      <div className="flex items-center gap-3 md:gap-4 self-end md:self-auto">
        <button className="p-2 rounded-full text-[#a89c85] hover:text-[#e8c874] hover:bg-white/5 transition-colors" type="button">
          <Bell size={20} />
        </button>

        <button className="p-2 rounded-full text-[#a89c85] hover:text-[#e8c874] hover:bg-white/5 transition-colors" type="button">
          <Grid size={20} />
        </button>

        <div className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-[#7d6733] overflow-hidden shrink-0">
          <img 
            src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=d4af37&color=fff`} 
            alt="User Avatar" 
            title={user?.name}
            className="w-full h-full object-cover"
          />
        </div>

        <button 
          className="p-2 rounded-full text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors" 
          type="button" 
          onClick={logoutAuth} 
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;