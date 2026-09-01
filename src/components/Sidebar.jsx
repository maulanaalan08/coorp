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
  ChevronDown,
  ChevronRight,
  Layers,
  Wrench,
  PieChart
} from "lucide-react";

import CreateProjectModal from "./CreateProjectModal";

const Sidebar = ({ activeTab, setActiveTab }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // DROPDOWN MENU STATE
  const [isPerencanaanOpen, setIsPerencanaanOpen] = useState(false);
  const [isPelaksanaanOpen, setIsPelaksanaanOpen] = useState(false);

  useEffect(() => {
    if (["data-survey", "bv", "rab", "finance"].includes(activeTab)) {
      setIsPerencanaanOpen(true);
    }
    if (["time-schedule", "join-opname", "complain"].includes(activeTab)) {
      setIsPelaksanaanOpen(true);
    }
  }, [activeTab]);

  // Helper Navigasi
  const handleNavigation = (e, tab) => {
    e.preventDefault();
    setActiveTab(tab);
  };

  return (
    <aside className={styles.sidebar}>
      {/* HEADER / BRAND */}
      <div className={styles['sidebar-header']}>
        <div className={styles['logo-title']}>DIVES CORP.</div>
        <div className={styles['logo-subtitle']}>INTERIOR & CONTRACTOR</div>
      </div>

      {/* NAVIGATION */}
      <nav className={styles['sidebar-nav']}>
        <ul className={styles['nav-list']}>
          {/* DASHBOARD */}
          <li className={`${styles['nav-item']} ${activeTab === "dashboard" ? styles.active : ""}`}>
            <a href="#dashboard" className={styles['nav-link']} onClick={(e) => handleNavigation(e, "dashboard")}>
              <LayoutDashboard className={styles['nav-icon']} />
              <span>Dashboard</span>
            </a>
          </li>

          {/* PROJECT BOARD */}
          <li className={`${styles['nav-item']} ${activeTab === "project-board" ? styles.active : ""}`}>
            <a href="#project-board" className={styles['nav-link']} onClick={(e) => handleNavigation(e, "project-board")}>
              <KanbanSquare className={styles['nav-icon']} />
              <span>Project Board</span>
            </a>
          </li>

          {/* UPLOAD HSPK */}
          <li className={`${styles['nav-item']} ${activeTab === "upload-hspk" ? styles.active : ""}`}>
            <a href="#upload-hspk" className={styles['nav-link']} onClick={(e) => handleNavigation(e, "upload-hspk")}>
              <Upload className={styles['nav-icon']} />
              <span>Upload HSPK</span>
            </a>
          </li>

          {/* 1. DROPDOWN PERENCANAAN */}
          <li className={`${styles['nav-item']} ${styles['has-dropdown']}`}>
            <button
              className={`${styles['nav-link']} ${styles['dropdown-toggle']} ${isPerencanaanOpen ? styles['dropdown-open'] : ""}`}
              onClick={() => setIsPerencanaanOpen(!isPerencanaanOpen)}
              type="button"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Layers className={styles['nav-icon']} />
                <span>Perencanaan</span>
              </div>
              {isPerencanaanOpen ? <ChevronDown size={16} className={styles.chevron} /> : <ChevronRight size={16} className={styles.chevron} />}
            </button>

            <ul className={`${styles['sub-nav-list']} ${isPerencanaanOpen ? styles.open : ""}`}>
              <li className={`${styles['sub-nav-item']} ${activeTab === "data-survey" ? styles.active : ""}`}>
                <a href="#data-survey" className={styles['sub-nav-link']} onClick={(e) => handleNavigation(e, "data-survey")}>
                  <Map className={styles['nav-icon']} size={18} />
                  <span>Data Survey</span>
                </a>
              </li>
              <li className={`${styles['sub-nav-item']} ${activeTab === "bv" ? styles.active : ""}`}>
                <a href="#bv" className={styles['sub-nav-link']} onClick={(e) => handleNavigation(e, "bv")}>
                  <ClipboardList className={styles['nav-icon']} size={18} />
                  <span>BackUp Volume</span>
                </a>
              </li>
              <li className={`${styles['sub-nav-item']} ${activeTab === "rab" ? styles.active : ""}`}>
                <a href="#rab" className={styles['sub-nav-link']} onClick={(e) => handleNavigation(e, "rab")}>
                  <Wallet className={styles['nav-icon']} size={18} />
                  <span>RAB & Budgeting</span>
                </a>
              </li>
              <li className={`${styles['sub-nav-item']} ${activeTab === "finance" ? styles.active : ""}`}>
                <a href="#finance" className={styles['sub-nav-link']} onClick={(e) => handleNavigation(e, "finance")}>
                  <PieChart className={styles['nav-icon']} size={18} />
                  <span>Finance & Margins</span>
                </a>
              </li>
            </ul>
          </li>

          {/* 2. DROPDOWN PELAKSANAAN */}
          <li className={`${styles['nav-item']} ${styles['has-dropdown']}`}>
            <button
              className={`${styles['nav-link']} ${styles['dropdown-toggle']} ${isPelaksanaanOpen ? styles['dropdown-open'] : ""}`}
              onClick={() => setIsPelaksanaanOpen(!isPelaksanaanOpen)}
              type="button"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Wrench className={styles['nav-icon']} />
                <span>Pelaksana</span>
              </div>
              {isPelaksanaanOpen ? <ChevronDown size={16} className={styles.chevron} /> : <ChevronRight size={16} className={styles.chevron} />}
            </button>

            <ul className={`${styles['sub-nav-list']} ${isPelaksanaanOpen ? styles.open : ""}`}>
              <li className={`${styles['sub-nav-item']} ${activeTab === "time-schedule" ? styles.active : ""}`}>
                <a href="#time-schedule" className={styles['sub-nav-link']} onClick={(e) => handleNavigation(e, "time-schedule")}>
                  <History className={styles['nav-icon']} size={18} />
                  <span>Time Schedule</span>
                </a>
              </li>
              <li className={`${styles['sub-nav-item']} ${activeTab === "join-opname" ? styles.active : ""}`}>
                <a href="#join-opname" className={styles['sub-nav-link']} onClick={(e) => handleNavigation(e, "join-opname")}>
                  <ClipboardCheck className={styles['nav-icon']} size={18} />
                  <span>Join Opname</span>
                </a>
              </li>
              <li className={`${styles['sub-nav-item']} ${activeTab === "complain" ? styles.active : ""}`}>
                <a href="#complain" className={styles['sub-nav-link']} onClick={(e) => handleNavigation(e, "complain")}>
                  <ClipboardCheck className={styles['nav-icon']} size={18} />
                  <span>Complain</span>
                </a>
              </li>
            </ul>
          </li>

          {/* AI DOCUMENT GENERATOR */}
          <li className={`${styles['nav-item']} ${activeTab === "ai-docs" ? styles.active : ""}`}>
            <a href="#ai-docs" className={styles['nav-link']} onClick={(e) => handleNavigation(e, "ai-docs")}>
              <FileText className={styles['nav-icon']} />
              <span>AI Document Generator</span>
            </a>
          </li>
        </ul>

        {/* CREATE PROJECT BUTTON */}
        <button type="button" className={styles['create-btn']} onClick={() => setIsModalOpen(true)}>
          <Plus className={styles['btn-icon']} />
          <span>Create Project</span>
        </button>
      </nav>

      {/* CREATE PROJECT MODAL */}
      <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* FOOTER */}
      <div className={styles['sidebar-footer']}>
        <ul className={styles['nav-list']}>
          <li className={styles['nav-item']}>
            <a href="#settings" className={styles['nav-link']} onClick={(e) => e.preventDefault()}>
              <Settings className={styles['nav-icon']} />
              <span>Profile Settings</span>
            </a>
          </li>
          <li className={styles['nav-item']}>
            <a href="#support" className={styles['nav-link']} onClick={(e) => e.preventDefault()}>
              <HelpCircle className={styles['nav-icon']} />
              <span>Support</span>
            </a>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;