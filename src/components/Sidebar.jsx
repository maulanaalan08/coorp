import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  KanbanSquare,
  CheckSquare,
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
  ArrowLeftRight,
  TrendingUp,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen
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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem("dives-sidebar-collapsed") === "1"; }
    catch { return false; }
  });

  const toggleCollapsed = () => {
    setIsCollapsed((current) => {
      const next = !current;
      try { localStorage.setItem("dives-sidebar-collapsed", next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  };

  const toggleSection = (setter) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      try { localStorage.setItem("dives-sidebar-collapsed", "0"); } catch { /* ignore */ }
      setter(true);
      return;
    }
    setter((current) => !current);
  };

  // Dropdown state
  const [isPerencanaanOpen, setIsPerencanaanOpen] = useState(false);
  const [isDocumentOpen, setIsDocumentOpen] = useState(false);
  const [isPelaksanaanOpen, setIsPelaksanaanOpen] = useState(false);
  const [isFinanceOpen, setIsFinanceOpen] = useState(false);
  const [isPurchasingOpen, setIsPurchasingOpen] = useState(false);
  const [isHspkOpen, setIsHspkOpen] = useState(false);

  useEffect(() => {
    if (["data-survey", "bv", "rab"].includes(activeTab)) setIsPerencanaanOpen(true);
    if (["spk-client", "spk-subcon"].includes(activeTab)) setIsDocumentOpen(true);
    if (["time-schedule", "global-schedule", "join-opname", "bast", "complain", "item-tracking", "kelola-jasa", "po-jasa"].includes(activeTab)) setIsPelaksanaanOpen(true);
    if (["finance", "pengajuan-bayar", "permintaan-bayar", "pembayaran-supplier", "invoice-supplier", "pembayaran-jasa", "invoice-jasa", "pembayaran-finance", "invoice-penjualan", "invoice-operasional", "buku-besar", "transfer-bank", "laporan-laba"].includes(activeTab)) setIsFinanceOpen(true);
    if (["po-material", "habis-pakai"].includes(activeTab)) setIsPurchasingOpen(true);
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
        title={isCollapsed ? label : undefined}
        className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-all group ${isCollapsed ? "justify-center px-2 py-3" : "px-4 py-3"} ${activeTab === tab
            ? "bg-[#d4af37]/10 text-[#d4af37]"
            : "text-[#888] hover:bg-white/5 hover:text-white"
          }`}
      >
        <Icon size={18} className={`shrink-0 ${activeTab === tab ? "text-[#d4af37]" : "text-[#888] group-hover:text-white"}`} />
        {!isCollapsed && <span className="truncate">{label}</span>}
      </a>
    </li>
  );

  const SubNavItem = ({ icon: Icon, label, tab }) => {
    const isActive =
      activeTab === tab ||
      (tab === "kelola-jasa" && activeTab === "po-jasa") ||
      (tab === "invoice-supplier" && activeTab === "pembayaran-supplier") ||
      (tab === "invoice-jasa" && activeTab === "pembayaran-jasa");
    return (
      <li>
        <a
          href={`#${tab}`}
          onClick={(e) => handleNavigation(e, tab)}
          title={isCollapsed ? label : undefined}
          className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-all group ${isCollapsed ? "justify-center px-2 py-2.5" : "pl-11 pr-4 py-2.5"} ${isActive
              ? "bg-[#d4af37]/10 text-[#d4af37]"
              : "text-[#888] hover:bg-white/5 hover:text-white"
            }`}
        >
          <Icon size={16} className={`shrink-0 ${isActive ? "text-[#d4af37]" : "text-[#888] group-hover:text-white"}`} />
          {!isCollapsed && <span className="truncate">{label}</span>}
        </a>
      </li>
    );
  };

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
        className={`fixed md:relative top-0 left-0 h-full bg-[#0c0b09] border-r border-[#222] flex flex-col z-[100] transition-[width,transform] duration-300 ease-in-out shrink-0 overflow-y-auto overflow-x-hidden ${isCollapsed ? "md:w-[72px] w-[280px]" : "w-[280px]"} ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
      >
        {/* HEADER / BRAND */}
        <div className={`${isCollapsed ? "p-3 justify-center" : "p-6 justify-between"} bg-[#0c0b09] flex items-start shrink-0 relative`}>
          <div className={isCollapsed ? "text-center" : ""}>
            <div className={`text-[#d4af37] font-black tracking-wider uppercase drop-shadow-md ${isCollapsed ? "text-xl mb-0" : "text-2xl mb-1"}`}>
              {isCollapsed ? "D" : "DIVES CORP."}
            </div>
            {!isCollapsed && (
              <div className="text-[#888] text-[10px] font-bold tracking-[0.2em] uppercase">
                Interior &amp; Contractor
              </div>
            )}
          </div>
          <button
            className={`hidden md:flex items-center justify-center text-[#888] hover:text-[#d4af37] hover:bg-white/5 rounded-md transition-all ${isCollapsed ? "absolute right-1 top-3 w-6 h-7" : "w-8 h-8"}`}
            onClick={toggleCollapsed}
            type="button"
            title={isCollapsed ? "Perbesar sidebar" : "Minimize sidebar"}
            aria-label={isCollapsed ? "Perbesar sidebar" : "Minimize sidebar"}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={18} />}
          </button>
          <button className="md:hidden text-[#888] hover:text-white" onClick={() => setIsMobileOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className={`flex-1 pb-6 flex flex-col gap-1 ${isCollapsed ? "px-2 pt-2" : "px-4 pt-2"}`}>
          <ul className="flex flex-col gap-1 m-0 p-0 list-none">
            <NavItem icon={LayoutDashboard} label="Dashboard" tab="dashboard" />
            <NavItem icon={KanbanSquare} label="Project Board" tab="project-board" />
            <NavItem icon={CheckSquare} label="Papan Tugas" tab="task-board" />

            {/* DROPDOWN: HSPK */}
            <li>
              <button
                type="button"
                title={isCollapsed ? "Upload HSPK" : undefined}
                className={`w-full flex items-center rounded-lg text-sm font-medium transition-all text-[#888] hover:bg-white/5 hover:text-white ${isCollapsed ? "justify-center px-2 py-3" : "justify-between px-4 py-3"} ${isHspkOpen && !isCollapsed ? "bg-white/5 text-white" : ""}`}
                onClick={() => toggleSection(setIsHspkOpen)}
                aria-expanded={isHspkOpen && !isCollapsed}
              >
                <div className={`flex items-center ${isCollapsed ? "" : "gap-3"}`}>
                  <Upload size={18} className={`shrink-0 ${isHspkOpen && !isCollapsed ? "text-white" : "text-[#888]"}`} />
                  {!isCollapsed && <span>Upload HSPK</span>}
                </div>
                {!isCollapsed && (isHspkOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
              </button>
              {isHspkOpen && !isCollapsed && (
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
                title={isCollapsed ? "Perencanaan" : undefined}
                className={`w-full flex items-center rounded-lg text-sm font-medium transition-all text-[#888] hover:bg-white/5 hover:text-white ${isCollapsed ? "justify-center px-2 py-3" : "justify-between px-4 py-3"} ${isPerencanaanOpen && !isCollapsed ? "bg-white/5 text-white" : ""}`}
                onClick={() => toggleSection(setIsPerencanaanOpen)}
                aria-expanded={isPerencanaanOpen && !isCollapsed}
              >
                <div className={`flex items-center ${isCollapsed ? "" : "gap-3"}`}>
                  <Layers size={18} className={`shrink-0 ${isPerencanaanOpen && !isCollapsed ? "text-white" : "text-[#888]"}`} />
                  {!isCollapsed && <span>Perencanaan</span>}
                </div>
                {!isCollapsed && (isPerencanaanOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
              </button>
              {isPerencanaanOpen && !isCollapsed && (
                <ul className="mt-1 flex flex-col gap-1 list-none p-0">
                  <SubNavItem icon={Map} label="Data Survey" tab="data-survey" />
                  <SubNavItem icon={ClipboardList} label="Back Up Volume" tab="bv" />
                  <SubNavItem icon={Wallet} label="RAB & Budgeting" tab="rab" />
                </ul>
              )}
            </li>

            {/* DROPDOWN: DOCUMENT */}
            <li>
              <button
                type="button"
                title={isCollapsed ? "Document" : undefined}
                aria-expanded={isDocumentOpen && !isCollapsed}
                className={`w-full flex items-center rounded-lg text-sm font-medium transition-all text-[#888] hover:bg-white/5 hover:text-white ${isCollapsed ? "justify-center px-2 py-3" : "justify-between px-4 py-3"} ${isDocumentOpen && !isCollapsed ? "bg-white/5 text-white" : ""}`}
                onClick={() => toggleSection(setIsDocumentOpen)}
              >
                <div className={`flex items-center ${isCollapsed ? "" : "gap-3"}`}>
                  <FileText size={18} className={`shrink-0 ${isDocumentOpen && !isCollapsed ? "text-white" : "text-[#888]"}`} />
                  {!isCollapsed && <span>Document</span>}
                  </div>
                  {!isCollapsed && (isDocumentOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                  </button>
                  {isDocumentOpen && !isCollapsed && (
                  <ul className="mt-1 flex flex-col gap-1 list-none p-0">
                    <SubNavItem icon={FileText} label="SPK Client" tab="spk-client" />
                    <SubNavItem icon={FileText} label="SPK Subcon" tab="spk-subcon" />
                  </ul>
                  )}
            </li>

            {/* DROPDOWN: PELAKSANAAN */}
            <li>
              <button
                type="button"
                title={isCollapsed ? "Pelaksanaan" : undefined}
                className={`w-full flex items-center rounded-lg text-sm font-medium transition-all text-[#888] hover:bg-white/5 hover:text-white ${isCollapsed ? "justify-center px-2 py-3" : "justify-between px-4 py-3"} ${isPelaksanaanOpen && !isCollapsed ? "bg-white/5 text-white" : ""}`}
                onClick={() => toggleSection(setIsPelaksanaanOpen)}
                aria-expanded={isPelaksanaanOpen && !isCollapsed}
              >
                <div className={`flex items-center ${isCollapsed ? "" : "gap-3"}`}>
                  <Wrench size={18} className={`shrink-0 ${isPelaksanaanOpen && !isCollapsed ? "text-white" : "text-[#888]"}`} />
                  {!isCollapsed && <span>Pelaksanaan</span>}
                </div>
                {!isCollapsed && (isPelaksanaanOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
              </button>
              {isPelaksanaanOpen && !isCollapsed && (
                <ul className="mt-1 flex flex-col gap-1 list-none p-0">
                  <SubNavItem icon={CalendarDays} label="Global Schedule" tab="global-schedule" />
                  <SubNavItem icon={History} label="Time Schedule" tab="time-schedule" />
                  <SubNavItem icon={ClipboardCheck} label="Join Opname" tab="join-opname" />
                  <SubNavItem icon={FileText} label="Berita Acara (BAST)" tab="bast" />
                  <SubNavItem icon={PieChart} label="Complain" tab="complain" />
                  <SubNavItem icon={MapPin} label="Item Tracking" tab="item-tracking" />
                  <SubNavItem icon={ClipboardList} label="Kelola Jasa" tab="kelola-jasa" />
                </ul>
              )}
            </li>

            {/* DROPDOWN: PURCHASING */}
            <li>
              <button
                type="button"
                title={isCollapsed ? "Purchasing" : undefined}
                className={`w-full flex items-center rounded-lg text-sm font-medium transition-all text-[#888] hover:bg-white/5 hover:text-white ${isCollapsed ? "justify-center px-2 py-3" : "justify-between px-4 py-3"} ${isPurchasingOpen && !isCollapsed ? "bg-white/5 text-white" : ""}`}
                onClick={() => toggleSection(setIsPurchasingOpen)}
                aria-expanded={isPurchasingOpen && !isCollapsed}
              >
                <div className={`flex items-center ${isCollapsed ? "" : "gap-3"}`}>
                  <ShoppingCart size={18} className={`shrink-0 ${isPurchasingOpen && !isCollapsed ? "text-white" : "text-[#888]"}`} />
                  {!isCollapsed && <span>Purchasing</span>}
                </div>
                {!isCollapsed && (isPurchasingOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
              </button>
              {isPurchasingOpen && !isCollapsed && (
                <ul className="mt-1 flex flex-col gap-1 list-none p-0">
                  <SubNavItem icon={ClipboardList} label="PO Material" tab="po-material" />
                  <SubNavItem icon={PackagePlus} label="Pembelian Habis Pakai" tab="habis-pakai" />
                </ul>
              )}
            </li>

            {/* DROPDOWN: FINANCE */}
            <li>
              <button
                type="button"
                title={isCollapsed ? "Finance" : undefined}
                className={`w-full flex items-center rounded-lg text-sm font-medium transition-all text-[#888] hover:bg-white/5 hover:text-white ${isCollapsed ? "justify-center px-2 py-3" : "justify-between px-4 py-3"} ${isFinanceOpen && !isCollapsed ? "bg-white/5 text-white" : ""}`}
                onClick={() => toggleSection(setIsFinanceOpen)}
                aria-expanded={isFinanceOpen && !isCollapsed}
              >
                <div className={`flex items-center ${isCollapsed ? "" : "gap-3"}`}>
                  <FileText size={18} className={`shrink-0 ${isFinanceOpen && !isCollapsed ? "text-white" : "text-[#888]"}`} />
                  {!isCollapsed && <span>Finance</span>}
                </div>
                {!isCollapsed && (isFinanceOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
              </button>
              {isFinanceOpen && !isCollapsed && (
                <ul className="mt-1 flex flex-col gap-1 list-none p-0">
                  <SubNavItem icon={Wallet} label="Kebutuhan Material & Jasa" tab="finance" />
                  <SubNavItem icon={FileInput} label="Pengajuan Bayar" tab="pengajuan-bayar" />
                  <SubNavItem icon={ReceiptText} label="Invoice Supplier" tab="invoice-supplier" />
                  <SubNavItem icon={ReceiptText} label="Invoice Jasa" tab="invoice-jasa" />
                  <SubNavItem icon={Banknote} label="Pembayaran Finance" tab="pembayaran-finance" />
                  <SubNavItem icon={ReceiptText} label="Invoice Penjualan" tab="invoice-penjualan" />
                  <SubNavItem icon={ReceiptText} label="Invoice Operasional" tab="invoice-operasional" />
                  <SubNavItem icon={FileInput} label="Permintaan Bayar" tab="permintaan-bayar" />
                  <SubNavItem icon={Landmark} label="Buku Besar Kas/Bank" tab="buku-besar" />
                  <SubNavItem icon={ArrowLeftRight} label="Transfer Antar Bank" tab="transfer-bank" />
                  <SubNavItem icon={TrendingUp} label="Laporan Laba Rugi" tab="laporan-laba" />
                </ul>
              )}
            </li>
          </ul>

          {/* CREATE PROJECT BUTTON */}
          <button
            type="button"
            title={isCollapsed ? "Create Project" : undefined}
            className={`mt-6 py-3 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg border border-dashed border-[#555] hover:border-[#d4af37] transition-all ${isCollapsed ? "mx-0 px-2" : "mx-2 px-4"}`}
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={18} className="shrink-0" />
            {!isCollapsed && <span>Create Project</span>}
          </button>
        </nav>

        {/* CREATE PROJECT MODAL */}
        <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

        {/* FOOTER */}
        <div className={`${isCollapsed ? "p-2" : "p-4"} border-t border-[#222] bg-[#0c0b09] mt-auto`}>
          {user && (
            <div
              className={`${isCollapsed ? "p-2 mb-3 justify-center" : "p-3 mb-4"} flex items-center bg-[#161513] rounded-xl border border-[#2a2a2a] gap-3`}
              title={isCollapsed ? `${user.name} — ${user.role}` : undefined}
            >
              {user.photoUrl ? (
                <img src={`${import.meta.env.VITE_API_URL || "http://localhost:4000"}${user.photoUrl}`} alt="Foto profil" className="w-10 h-10 shrink-0 rounded-full object-cover border border-[#d4af37] shadow-md" />
              ) : (
                <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-[#d4af37] to-[#a8862a] flex items-center justify-center text-[#0c0b09] font-bold text-sm shadow-md">
                  {getInitials(user.name)}
                </div>
              )}
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-bold truncate">{user.name}</div>
                  <div className="text-[#888] text-xs uppercase tracking-wider">{user.role}</div>
                </div>
              )}
            </div>
          )}

          <ul className="flex flex-col gap-1 m-0 p-0 list-none">
            <li>
              <a href="#settings" title={isCollapsed ? "Setting" : undefined} className={`flex items-center gap-3 rounded-lg transition-all text-sm font-medium ${isCollapsed ? "justify-center px-2 py-2.5" : "px-3 py-2"} ${activeTab === "settings" ? "bg-[#d4af37]/10 text-[#d4af37]" : "text-[#888] hover:text-white hover:bg-white/5"}`} onClick={(e) => handleNavigation(e, "settings")}>
                <Settings size={18} className="shrink-0" />
                {!isCollapsed && <span>Setting</span>}
              </a>
            </li>
            <li>
              <a href="#support" title={isCollapsed ? "Support" : undefined} className={`flex items-center gap-3 rounded-lg text-[#888] hover:text-white hover:bg-white/5 transition-all text-sm font-medium ${isCollapsed ? "justify-center px-2 py-2.5" : "px-3 py-2"}`} onClick={(e) => e.preventDefault()}>
                <HelpCircle size={18} className="shrink-0" />
                {!isCollapsed && <span>Support</span>}
              </a>
            </li>
            <li>
              <a
                href="#logout"
                title={isCollapsed ? "Logout" : undefined}
                className={`flex items-center gap-3 rounded-lg text-[#ef4444] hover:bg-[#ef4444]/10 transition-all text-sm font-bold ${isCollapsed ? "justify-center px-2 py-2.5" : "px-3 py-2"}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (onLogout) onLogout();
                }}
              >
                <LogOut size={18} className="shrink-0" />
                {!isCollapsed && <span>Logout</span>}
              </a>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
