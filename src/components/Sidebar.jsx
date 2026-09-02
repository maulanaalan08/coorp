// src/components/Sidebar.jsx
import { useState, useEffect } from "react";
import styles from "../styles/Sidebar.module.css";

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
  LogOut,
} from "lucide-react";

import CreateProjectModal from "./CreateProjectModal";

/** Ambil 1–2 huruf inisial dari nama */
const getInitials = (name = "") => {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Sidebar = ({ activeTab, setActiveTab, onLogout, user }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Dropdown state
  const [isPerencanaanOpen, setIsPerencanaanOpen] = useState(false);
  const [isPelaksanaanOpen, setIsPelaksanaanOpen] = useState(false);
  const [isFinanceOpen, setIsFinanceOpen] = useState(false);
  const [isPurchasingOpen, setIsPurchasingOpen] = useState(false);

  // Auto-buka dropdown sesuai tab aktif
  useEffect(() => {
    if (["data-survey", "bv", "rab"].includes(activeTab)) {
      setIsPerencanaanOpen(true);
    }
    if (["time-schedule", "join-opname", "complain", "item-tracking"].includes(activeTab)) {
      setIsPelaksanaanOpen(true);
    }
    if (["finance", "pembelian-siap-pakai"].includes(activeTab)) {
      setIsFinanceOpen(true);
    }
  }, [activeTab]);

  const handleNavigation = (e, tab) => {
    e.preventDefault();
    setActiveTab(tab);
  };

  return (
    <aside className={styles.sidebar}>
      {/* HEADER / BRAND */}
      <div className={styles["sidebar-header"]}>
        <div className={styles["logo-title"]}>DIVES CORP.</div>
        <div className={styles["logo-subtitle"]}>INTERIOR &amp; CONTRACTOR</div>
      </div>

      {/* NAVIGATION */}
      <nav className={styles["sidebar-nav"]}>
        <ul className={styles["nav-list"]}>

          {/* DASHBOARD */}
          <li className={`${styles["nav-item"]} ${activeTab === "dashboard" ? styles.active : ""}`}>
            <a href="#dashboard" className={styles["nav-link"]} onClick={(e) => handleNavigation(e, "dashboard")}>
              <LayoutDashboard className={styles["nav-icon"]} />
              <span>Dashboard</span>
            </a>
          </li>

          {/* PROJECT BOARD */}
          <li className={`${styles["nav-item"]} ${activeTab === "project-board" ? styles.active : ""}`}>
            <a href="#project-board" className={styles["nav-link"]} onClick={(e) => handleNavigation(e, "project-board")}>
              <KanbanSquare className={styles["nav-icon"]} />
              <span>Project Board</span>
            </a>
          </li>

          {/* UPLOAD HSPK */}
          <li className={`${styles["nav-item"]} ${activeTab === "upload-hspk" ? styles.active : ""}`}>
            <a href="#upload-hspk" className={styles["nav-link"]} onClick={(e) => handleNavigation(e, "upload-hspk")}>
              <Upload className={styles["nav-icon"]} />
              <span>Upload HSPK</span>
            </a>
          </li>

          {/* DROPDOWN: PERENCANAAN */}
          <li className={`${styles["nav-item"]} ${styles["has-dropdown"]}`}>
            <button
              type="button"
              className={`${styles["dropdown-toggle"]} ${isPerencanaanOpen ? styles["dropdown-open"] : ""}`}
              onClick={() => setIsPerencanaanOpen((v) => !v)}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <Layers className={styles["nav-icon"]} style={{ margin: 0 }} />
                Perencanaan
              </span>
              {isPerencanaanOpen
                ? <ChevronDown className={styles.chevron} size={14} />
                : <ChevronRight className={styles.chevron} size={14} />}
            </button>
            <ul className={`${styles["sub-nav-list"]} ${isPerencanaanOpen ? styles.open : ""}`}>
              <li className={`${styles["sub-nav-item"]} ${activeTab === "data-survey" ? styles.active : ""}`}>
                <a href="#data-survey" className={styles["sub-nav-link"]} onClick={(e) => handleNavigation(e, "data-survey")}>
                  <Map size={14} /> Data Survey
                </a>
              </li>
              <li className={`${styles["sub-nav-item"]} ${activeTab === "bv" ? styles.active : ""}`}>
                <a href="#bv" className={styles["sub-nav-link"]} onClick={(e) => handleNavigation(e, "bv")}>
                  <ClipboardList size={14} /> Back Up Volume
                </a>
              </li>
              <li className={`${styles["sub-nav-item"]} ${activeTab === "rab" ? styles.active : ""}`}>
                <a href="#rab" className={styles["sub-nav-link"]} onClick={(e) => handleNavigation(e, "rab")}>
                  <Wallet size={14} /> RAB &amp; Budgeting
                </a>
              </li>
            </ul>
          </li>

          {/* DROPDOWN: PELAKSANAAN */}
          <li className={`${styles["nav-item"]} ${styles["has-dropdown"]}`}>
            <button
              type="button"
              className={`${styles["dropdown-toggle"]} ${isPelaksanaanOpen ? styles["dropdown-open"] : ""}`}
              onClick={() => setIsPelaksanaanOpen((v) => !v)}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <Wrench className={styles["nav-icon"]} style={{ margin: 0 }} />
                Pelaksanaan
              </span>
              {isPelaksanaanOpen
                ? <ChevronDown className={styles.chevron} size={14} />
                : <ChevronRight className={styles.chevron} size={14} />}
            </button>
            <ul className={`${styles["sub-nav-list"]} ${isPelaksanaanOpen ? styles.open : ""}`}>
              <li className={`${styles["sub-nav-item"]} ${activeTab === "time-schedule" ? styles.active : ""}`}>
                <a href="#time-schedule" className={styles["sub-nav-link"]} onClick={(e) => handleNavigation(e, "time-schedule")}>
                  <History size={14} /> Time Schedule
                </a>
              </li>
              <li className={`${styles["sub-nav-item"]} ${activeTab === "join-opname" ? styles.active : ""}`}>
                <a href="#join-opname" className={styles["sub-nav-link"]} onClick={(e) => handleNavigation(e, "join-opname")}>
                  <ClipboardCheck size={14} /> Join Opname
                </a>
              </li>
              <li className={`${styles["sub-nav-item"]} ${activeTab === "complain" ? styles.active : ""}`}>
                <a href="#complain" className={styles["sub-nav-link"]} onClick={(e) => handleNavigation(e, "complain")}>
                  <PieChart size={14} /> Complain
                </a>
              </li>
              <li className={`${styles["sub-nav-item"]} ${activeTab === "item-tracking" ? styles.active : ""}`}>
                <a href="#item-tracking" className={styles["sub-nav-link"]} onClick={(e) => handleNavigation(e, "item-tracking")}>
                  <MapPin size={14} /> Item Tracking
                </a>
              </li>
            </ul>
          </li>

          {/* DROPDOWN: FINANCE */}
          <li className={`${styles["nav-item"]} ${styles["has-dropdown"]}`}>
            <button
              type="button"
              className={`${styles["dropdown-toggle"]} ${isFinanceOpen ? styles["dropdown-open"] : ""}`}
              onClick={() => setIsFinanceOpen((v) => !v)}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <FileText className={styles["nav-icon"]} style={{ margin: 0 }} />
                Finance
              </span>
              {isFinanceOpen
                ? <ChevronDown className={styles.chevron} size={14} />
                : <ChevronRight className={styles.chevron} size={14} />}
            </button>
            <ul className={`${styles["sub-nav-list"]} ${isFinanceOpen ? styles.open : ""}`}>
              <li className={`${styles["sub-nav-item"]} ${activeTab === "finance" ? styles.active : ""}`}>
                <a href="#finance" className={styles["sub-nav-link"]} onClick={(e) => handleNavigation(e, "finance")}>
                  <Wallet size={14} /> Kebutuhan Material
                </a>
              </li>
              <li className={`${styles["sub-nav-item"]} ${activeTab === "pembelian-siap-pakai" ? styles.active : ""}`}>
                <a href="#pembelian-siap-pakai" className={styles["sub-nav-link"]} onClick={(e) => handleNavigation(e, "pembelian-siap-pakai")}>
                  <Package size={14} /> Pembelian Siap Pakai
                </a>
              </li>
            </ul>
          </li>

          {/* DROPDOWN: PURCHASING */}
          <li className={`${styles["nav-item"]} ${styles["has-dropdown"]}`}>
            <button
              type="button"
              className={`${styles["dropdown-toggle"]} ${isPurchasingOpen ? styles["dropdown-open"] : ""}`}
              onClick={() => setIsPurchasingOpen((v) => !v)}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <ShoppingCart className={styles["nav-icon"]} style={{ margin: 0 }} />
                Purchasing
              </span>
              {isPurchasingOpen
                ? <ChevronDown className={styles.chevron} size={14} />
                : <ChevronRight className={styles.chevron} size={14} />}
            </button>
            <ul className={`${styles["sub-nav-list"]} ${isPurchasingOpen ? styles.open : ""}`}>
              {/* Menu purchasing ditambahkan di sini */}
            </ul>
          </li>

        </ul>

        {/* CREATE PROJECT BUTTON */}
        <button type="button" className={styles["create-btn"]} onClick={() => setIsModalOpen(true)}>
          <Plus className={styles["btn-icon"]} />
          <span>Create Project</span>
        </button>
      </nav>

      {/* CREATE PROJECT MODAL */}
      <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* FOOTER */}
      <div className={styles["sidebar-footer"]}>
        {/* User Card */}
        {user && (
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">{getInitials(user.name)}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{user.role}</div>
            </div>
          </div>
        )}

        <ul className={styles["nav-list"]}>
          <li className={styles["nav-item"]}>
            <a href="#settings" className={styles["nav-link"]} onClick={(e) => e.preventDefault()}>
              <Settings className={styles["nav-icon"]} />
              <span>Profile Settings</span>
            </a>
          </li>
          <li className={styles["nav-item"]}>
            <a href="#support" className={styles["nav-link"]} onClick={(e) => e.preventDefault()}>
              <HelpCircle className={styles["nav-icon"]} />
              <span>Support</span>
            </a>
          </li>
          {/* Logout */}
          <li className={styles["nav-item"]}>
            <a
              href="#logout"
              className={styles["nav-link"]}
              style={{ color: "#ef4444" }}
              onClick={(e) => {
                e.preventDefault();
                if (onLogout) onLogout();
              }}
            >
              <LogOut className={styles["nav-icon"]} style={{ color: "#ef4444" }} />
              <span>Logout</span>
            </a>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
