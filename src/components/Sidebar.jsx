import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  KanbanSquare,
  Wallet,
  FileText,
  Plus,
  Settings,
  HelpCircle,
  Upload,
  ClipboardList,
  History,
  ClipboardCheck,
  Map,
  MapPin,
  ChevronDown,
  ChevronRight,
  Layers,
  Wrench,
  PieChart,
  ShoppingCart,
  Package,
  RotateCcw,
  FileInput,
  PackagePlus,
  Banknote,
  ReceiptText,
  CalendarDays,
  Landmark,
  LogOut,
  Menu,
  X
} from "lucide-react";
import CreateProjectModal from "./CreateProjectModal";

const getInitials = (name = "") => {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Sidebar = ({ activeTab, setActiveTab, onLogout, user }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Dropdown state
  const [isPerencanaanOpen, setIsPerencanaanOpen] = useState(false);
  const [isPelaksanaanOpen, setIsPelaksanaanOpen] = useState(false);
  const [isFinanceOpen, setIsFinanceOpen] = useState(false);
  const [isPurchasingOpen, setIsPurchasingOpen] = useState(false);
  const [isHspkOpen, setIsHspkOpen] = useState(false);

  useEffect(() => {
    if (["data-survey", "bv", "rab"].includes(activeTab)) setIsPerencanaanOpen(true);
    if (["time-schedule", "global-schedule", "join-opname", "bast", "complain", "item-tracking"].includes(activeTab)) setIsPelaksanaanOpen(true);
    if (["finance", "pengajuan-bayar", "pembayaran-supplier", "pembayaran-jasa", "buku-besar"].includes(activeTab)) setIsFinanceOpen(true);
    if (["po-material", "po-jasa", "habis-pakai"].includes(activeTab)) setIsPurchasingOpen(true);
    if (["upload-hspk", "work-categories"].includes(activeTab)) setIsHspkOpen(true);
  }, [activeTab]);

  const handleNavigation = (e, tab) => {
    e.preventDefault();
    setActiveTab(tab);
    window.history.pushState(null, '', '/' + tab);
    setIsMobileOpen(false); // Close on mobile after navigation
  };

  const NavItem = ({ icon: Icon, label, tab }) => (
    <li>
      <a
        href={`#${tab}`}
        onClick={(e) => handleNavigation(e, tab)}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all group ${activeTab === tab
            ? "bg-[#d4af37]/10 text-[#d4af37]"
            : "text-[#888] hover:bg-white/5 hover:text-white"
          }`}
      >
        <Icon size={18} className={activeTab === tab ? "text-[#d4af37]" : "text-[#888] group-hover:text-white"} />
        <span>{label}</span>
      </a>
    </li>
  );

  const SubNavItem = ({ icon: Icon, label, tab }) => (
    <li>
      <a
        href={`#${tab}`}
        onClick={(e) => handleNavigation(e, tab)}
        className={`flex items-center gap-3 pl-11 pr-4 py-2.5 rounded-lg text-sm font-medium transition-all group ${activeTab === tab
            ? "bg-[#d4af37]/10 text-[#d4af37]"
            : "text-[#888] hover:bg-white/5 hover:text-white"
          }`}
      >
        <Icon size={16} className={activeTab === tab ? "text-[#d4af37]" : "text-[#888] group-hover:text-white"} />
        <span>{label}</span>
      </a>
    </li>
  );

  return (
    <>
      {/* MOBILE TOGGLE BUTTON */}
      <button
        className="md:hidden fixed top-5 left-5 z-50 bg-[#161513] text-white p-2 rounded-md border border-[#333] shadow-lg"
        onClick={() => setIsMobileOpen(true)}
      >
        <Menu size={24} />
      </button>

      {/* OVERLAY FOR MOBILE */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-[90] backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* SIDEBAR CONTAINER */}
      <aside
        className={`fixed md:relative top-0 left-0 h-full w-[280px] bg-[#0c0b09] border-r border-[#222] flex flex-col z-[100] transition-transform duration-300 ease-in-out shrink-0 overflow-y-auto overflow-x-hidden ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
      >
        {/* HEADER / BRAND */}
        <div className="p-6 bg-[#0c0b09] flex justify-between items-start shrink-0">
          <div>
            <div className="text-[#d4af37] text-2xl font-black tracking-wider uppercase mb-1 drop-shadow-md">
              DIVES CORP.
            </div>
            <div className="text-[#888] text-[10px] font-bold tracking-[0.2em] uppercase">
              Interior &amp; Contractor
            </div>
          </div>
          <button className="md:hidden text-[#888] hover:text-white" onClick={() => setIsMobileOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-4 py-2 pb-6 flex flex-col gap-1">
          <ul className="flex flex-col gap-1 m-0 p-0 list-none">
            <NavItem icon={LayoutDashboard} label="Dashboard" tab="dashboard" />
            <NavItem icon={KanbanSquare} label="Project Board" tab="project-board" />

            {/* DROPDOWN: HSPK */}
            <li>
              <button
                type="button"
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all text-[#888] hover:bg-white/5 hover:text-white ${isHspkOpen ? "bg-white/5 text-white" : ""}`}
                onClick={() => setIsHspkOpen(!isHspkOpen)}
              >
                <div className="flex items-center gap-3">
                  <Upload size={18} className={isHspkOpen ? "text-white" : "text-[#888]"} />
                  <span>Upload HSPK</span>
                </div>
                {isHspkOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {isHspkOpen && (
                <ul className="mt-1 flex flex-col gap-1 list-none p-0">
                  <SubNavItem icon={Upload} label="Upload Data" tab="upload-hspk" />
                  <SubNavItem icon={Layers} label="Kategori Pekerjaan" tab="work-categories" />
                </ul>
              )}
            </li>

            {/* DROPDOWN: PERENCANAAN */}
            <li>
              <button
                type="button"
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all text-[#888] hover:bg-white/5 hover:text-white ${isPerencanaanOpen ? "bg-white/5 text-white" : ""}`}
                onClick={() => setIsPerencanaanOpen(!isPerencanaanOpen)}
              >
                <div className="flex items-center gap-3">
                  <Layers size={18} className={isPerencanaanOpen ? "text-white" : "text-[#888]"} />
                  <span>Perencanaan</span>
                </div>
                {isPerencanaanOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {isPerencanaanOpen && (
                <ul className="mt-1 flex flex-col gap-1 list-none p-0">
                  <SubNavItem icon={Map} label="Data Survey" tab="data-survey" />
                  <SubNavItem icon={ClipboardList} label="Back Up Volume" tab="bv" />
                  <SubNavItem icon={Wallet} label="RAB & Budgeting" tab="rab" />
                </ul>
              )}
            </li>

            {/* DROPDOWN: PELAKSANAAN */}
            <li>
              <button
                type="button"
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all text-[#888] hover:bg-white/5 hover:text-white ${isPelaksanaanOpen ? "bg-white/5 text-white" : ""}`}
                onClick={() => setIsPelaksanaanOpen(!isPelaksanaanOpen)}
              >
                <div className="flex items-center gap-3">
                  <Wrench size={18} className={isPelaksanaanOpen ? "text-white" : "text-[#888]"} />
                  <span>Pelaksanaan</span>
                </div>
                {isPelaksanaanOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {isPelaksanaanOpen && (
                <ul className="mt-1 flex flex-col gap-1 list-none p-0">
                  <SubNavItem icon={CalendarDays} label="Global Schedule" tab="global-schedule" />
                  <SubNavItem icon={History} label="Time Schedule" tab="time-schedule" />
                  <SubNavItem icon={ClipboardCheck} label="Join Opname" tab="join-opname" />
                  <SubNavItem icon={FileText} label="Berita Acara (BAST)" tab="bast" />
                  <SubNavItem icon={PieChart} label="Complain" tab="complain" />
                  <SubNavItem icon={MapPin} label="Item Tracking" tab="item-tracking" />
                </ul>
              )}
            </li>

            {/* DROPDOWN: PURCHASING */}
            <li>
              <button
                type="button"
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all text-[#888] hover:bg-white/5 hover:text-white ${isPurchasingOpen ? "bg-white/5 text-white" : ""}`}
                onClick={() => setIsPurchasingOpen(!isPurchasingOpen)}
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart size={18} className={isPurchasingOpen ? "text-white" : "text-[#888]"} />
                  <span>Purchasing</span>
                </div>
                {isPurchasingOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {isPurchasingOpen && (
                <ul className="mt-1 flex flex-col gap-1 list-none p-0">
                  <SubNavItem icon={ClipboardList} label="PO Material" tab="po-material" />
                  <SubNavItem icon={ClipboardList} label="PO Jasa" tab="po-jasa" />
                  <SubNavItem icon={PackagePlus} label="Pembelian Habis Pakai" tab="habis-pakai" />
                </ul>
              )}
            </li>

            {/* DROPDOWN: FINANCE */}
            <li>
              <button
                type="button"
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all text-[#888] hover:bg-white/5 hover:text-white ${isFinanceOpen ? "bg-white/5 text-white" : ""}`}
                onClick={() => setIsFinanceOpen(!isFinanceOpen)}
              >
                <div className="flex items-center gap-3">
                  <FileText size={18} className={isFinanceOpen ? "text-white" : "text-[#888]"} />
                  <span>Finance</span>
                </div>
                {isFinanceOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {isFinanceOpen && (
                <ul className="mt-1 flex flex-col gap-1 list-none p-0">
                  <SubNavItem icon={Wallet} label="Kebutuhan Material & Jasa" tab="finance" />
                  <SubNavItem icon={FileInput} label="Pengajuan Bayar" tab="pengajuan-bayar" />
                  <SubNavItem icon={Banknote} label="Pembayaran Supplier" tab="pembayaran-supplier" />
                  <SubNavItem icon={Banknote} label="Pembayaran Jasa" tab="pembayaran-jasa" />
                  <SubNavItem icon={Landmark} label="Buku Besar Kas/Bank" tab="buku-besar" />
                </ul>
              )}
            </li>
          </ul>

          {/* CREATE PROJECT BUTTON */}
          <button
            type="button"
            className="mt-6 mx-2 py-3 px-4 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg border border-dashed border-[#555] hover:border-[#d4af37] transition-all"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={18} />
            <span>Create Project</span>
          </button>
        </nav>

        {/* CREATE PROJECT MODAL */}
        <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

        {/* FOOTER */}
        <div className="p-4 border-t border-[#222] bg-[#0c0b09] mt-auto">
          {user && (
            <div className="flex items-center gap-3 bg-[#161513] p-3 rounded-xl mb-4 border border-[#2a2a2a]">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#d4af37] to-[#a8862a] flex items-center justify-center text-[#0c0b09] font-bold text-sm shadow-md">
                {getInitials(user.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-bold truncate">{user.name}</div>
                <div className="text-[#888] text-xs uppercase tracking-wider">{user.role}</div>
              </div>
            </div>
          )}

          <ul className="flex flex-col gap-1 m-0 p-0 list-none">
            <li>
              <a href="#settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#888] hover:text-white hover:bg-white/5 transition-all text-sm font-medium" onClick={(e) => e.preventDefault()}>
                <Settings size={18} />
                <span>Profile Settings</span>
              </a>
            </li>
            <li>
              <a href="#support" className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#888] hover:text-white hover:bg-white/5 transition-all text-sm font-medium" onClick={(e) => e.preventDefault()}>
                <HelpCircle size={18} />
                <span>Support</span>
              </a>
            </li>
            <li>
              <a
                href="#logout"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#ef4444] hover:bg-[#ef4444]/10 transition-all text-sm font-bold"
                onClick={(e) => {
                  e.preventDefault();
                  if (onLogout) onLogout();
                }}
              >
                <LogOut size={18} />
                <span>Logout</span>
              </a>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
