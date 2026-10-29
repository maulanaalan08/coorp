import React, { useState, useMemo, useEffect } from "react";
import styles from "../styles/Dashboard.module.css";
import {
  Network,
  Compass,
  UserCog,
  TriangleAlert,
  RefreshCw,
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

import Header from "../components/Header";
import StatCard from "../components/StatCard";
import ProjectTableRow from "../components/ProjectTableRow";
import CreateProjectModal from "../components/CreateProjectModal";
import { useProjects } from "../hooks/useProjects";
import toast from "react-hot-toast";

// ================================================================
// KOMPONEN UTAMA DASHBOARD
// ================================================================
const Dashboard = ({ onViewDetails, onCreateBv, onCreateSurvey }) => {
  const {
    projects,
    surveyStatus,
    loading,
    loadingSurvey,
    error,
    refresh: loadProjects,
    deleteProject,
  } = useProjects();

  // Modal State (Create & Edit memakai modal yang sama)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhase, setSelectedPhase] = useState("ALL"); // 'ALL' | 'PLANNING' | 'CONSTRUCTION' | 'ISSUE'

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleDeleteProject = async (id, name) => {
    if (!window.confirm(`Hapus proyek "${name}"?`)) return;

    toast.promise(deleteProject(id), {
      loading: "Menghapus proyek...",
      success: "Proyek berhasil dihapus!",
      error: "Gagal menghapus proyek.",
    }).catch((err) => {
      console.error(err);
    });
  };

  const openEditProjectModal = (project) => {
    setEditProject(project);
  };

  const closeEditProjectModal = () => {
    setEditProject(null);
  };

  useEffect(() => {
    if (loading) {
      toast.loading("Memuat data proyek...", { id: "load-projects" });
    } else {
      toast.dismiss("load-projects");
      if (error) toast.error("Gagal memuat data proyek");
    }
  }, [loading, error]);

  // Reset page when search or phase changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedPhase, pageSize]);

  // ============================================================
  // STATS COUNTERS
  // ============================================================
  const totalActive = projects.length;
  const planningCount = projects.filter(
    (p) => (p.phase || "PLANNING").toUpperCase() === "PLANNING"
  ).length;
  const constructionCount = projects.filter(
    (p) => (p.phase || "").toUpperCase() === "CONSTRUCTION"
  ).length;
  const issueCount = projects.filter(
    (p) => (p.phase || "").toUpperCase() === "ISSUE DETECTED"
  ).length;

  // ============================================================
  // FILTERING & PAGINATION LOGIC
  // ============================================================
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Phase Filter
      const phaseUpper = (p.phase || "PLANNING").toUpperCase();
      if (selectedPhase === "PLANNING" && phaseUpper !== "PLANNING") return false;
      if (selectedPhase === "CONSTRUCTION" && phaseUpper !== "CONSTRUCTION") return false;
      if (selectedPhase === "ISSUE" && phaseUpper !== "ISSUE DETECTED") return false;

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (p.name || "").toLowerCase().includes(q);
        const clientMatch = (p.client?.name || "").toLowerCase().includes(q);
        const locMatch = (p.location || "").toLowerCase().includes(q);
        if (!nameMatch && !clientMatch && !locMatch) return false;
      }

      return true;
    });
  }, [projects, selectedPhase, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));

  // Ensure currentPage doesn't exceed totalPages
  const activePage = Math.min(currentPage, totalPages);

  const paginatedProjects = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return filteredProjects.slice(start, start + pageSize);
  }, [filteredProjects, activePage, pageSize]);

  const startIdx = filteredProjects.length === 0 ? 0 : (activePage - 1) * pageSize + 1;
  const endIdx = Math.min(activePage * pageSize, filteredProjects.length);

  // Generate pagination page numbers
  const pageNumbers = useMemo(() => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (activePage > 3) pages.push("...");

      const start = Math.max(2, activePage - 1);
      const end = Math.min(totalPages - 1, activePage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (activePage < totalPages - 2) pages.push("...");
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  }, [totalPages, activePage]);

  return (
    <div className={styles.dashboardWrapper}>
      <Header />

      <div className={styles.dashboardContent}>
        {/* STATS SECTION */}
        <div className={styles.statsGrid}>
          <StatCard
            icon={Network}
            label="SEMUA AKTIF"
            value={totalActive}
            desc="Proyek Terdaftar"
            colorScheme="gold"
            isActive={selectedPhase === "ALL"}
            onClick={() => setSelectedPhase("ALL")}
          />
          <StatCard
            icon={Compass}
            label="TAHAP 1"
            value={planningCount}
            desc="Tahap Perencanaan"
            colorScheme="blue"
            isActive={selectedPhase === "PLANNING"}
            onClick={() => setSelectedPhase("PLANNING")}
          />
          <StatCard
            icon={UserCog}
            label="TAHAP 2"
            value={constructionCount}
            desc="Tahap Konstruksi"
            colorScheme="emerald"
            isActive={selectedPhase === "CONSTRUCTION"}
            onClick={() => setSelectedPhase("CONSTRUCTION")}
          />
          <StatCard
            icon={TriangleAlert}
            label="PERLU TINDAKAN"
            value={issueCount}
            desc="Masalah Belum Selesai"
            colorScheme="rose"
            isDanger={issueCount > 0}
            isActive={selectedPhase === "ISSUE"}
            onClick={() => setSelectedPhase("ISSUE")}
          />
        </div>

        {/* PROJECTS TABLE SECTION */}
        <div className={styles.projectsSection}>
          <div className={styles.projectsHeader}>
            <div className={styles.projectsTitle}>
              <div className={styles.titleAccent} />
              <h3>Proyek Aktif Terbaru</h3>
              <span className={styles.projectsCountBadge}>
                {filteredProjects.length} Proyek
              </span>
            </div>

            {/* ACTION CONTROLS */}
            <div className={styles.projectsActions}>
              {/* Search Bar */}
              <div className={styles.searchBox}>
                <Search size={15} className="text-[#888] shrink-0" />
                <input
                  type="text"
                  placeholder="Cari proyek, klien, lokasi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className={styles.searchClearBtn}
                    onClick={() => setSearchQuery("")}
                    type="button"
                    title="Hapus pencarian"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Phase Dropdown */}
              <select
                className={styles.phaseSelect}
                value={selectedPhase}
                onChange={(e) => setSelectedPhase(e.target.value)}
              >
                <option value="ALL">Semua Tahap</option>
                <option value="PLANNING">Tahap 1: Perencanaan</option>
                <option value="CONSTRUCTION">Tahap 2: Konstruksi</option>
                <option value="ISSUE">Perlu Tindakan</option>
              </select>

              {/* Refresh Button */}
              <button
                className={styles.iconBtn}
                onClick={loadProjects}
                disabled={loading || loadingSurvey}
                type="button"
                title="Muat Ulang Data"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>

              {/* New Project Button */}
              <button
                className={styles.newProjectBtn}
                onClick={() => setIsModalOpen(true)}
                type="button"
              >
                <Plus size={16} /> Proyek Baru
              </button>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className={styles.tableContainer}>
            <table className={styles.projectsTable}>
              <thead>
                <tr>
                  <th style={{ width: "26%" }}>NAMA PROYEK</th>
                  <th style={{ width: "16%" }}>KLIEN</th>
                  <th style={{ width: "16%" }}>LOKASI</th>
                  <th style={{ width: "16%" }}>PROGRES</th>
                  <th style={{ width: "12%" }}>TAHAP SAAT INI</th>
                  <th style={{ width: "14%", textAlign: "right" }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className={`${styles.textCenter} ${styles.textGray}`} style={{ padding: "40px" }}>
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={16} className="animate-spin text-[#d4af37]" />
                        <span>Memuat data proyek...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className={`${styles.textCenter} ${styles.textDanger}`} style={{ padding: "40px" }}>
                      {error}
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`${styles.textCenter} ${styles.textGray}`} style={{ padding: "50px 20px" }}>
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="text-sm">
                          {searchQuery || selectedPhase !== "ALL"
                            ? "Tidak ada proyek yang sesuai dengan filter atau kata kunci pencarian."
                            : "Belum ada proyek terdaftar."}
                        </span>
                        {(searchQuery || selectedPhase !== "ALL") && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery("");
                              setSelectedPhase("ALL");
                            }}
                            className="text-xs text-[#d4af37] underline hover:brightness-110 mt-1"
                          >
                            Atur ulang filter &amp; pencarian
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedProjects.map((project, index) => (
                    <ProjectTableRow
                      key={project.id ?? index}
                      project={project}
                      hasSurvey={surveyStatus[project.id] === true}
                      surveyChecking={surveyStatus[project.id] === undefined || loadingSurvey}
                      onViewDetails={onViewDetails}
                      onCreateSurvey={onCreateSurvey}
                      onCreateBv={onCreateBv}
                      onOpenEdit={openEditProjectModal}
                      onDelete={handleDeleteProject}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS */}
          {!loading && filteredProjects.length > 0 && (
            <div className={styles.projectsFooter}>
              {/* Info text & Page size selector */}
              <div className={styles.footerLeft}>
                <span>
                  Menampilkan <strong className="text-[#f2ead9]">{startIdx}</strong>–
                  <strong className="text-[#f2ead9]">{endIdx}</strong> dari{" "}
                  <strong className="text-[#f2ead9]">{filteredProjects.length}</strong> proyek
                </span>

                <div className={styles.pageSizeSelector}>
                  <span>Baris per halaman:</span>
                  <select
                    className={styles.pageSizeSelect}
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    <option value={5}>5</option>
                    <option value={8}>8</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>
              </div>

              {/* Page Buttons */}
              <div className={styles.paginationControls}>
                <button
                  className={styles.pageBtn}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={activePage <= 1}
                  type="button"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>

                {pageNumbers.map((p, idx) =>
                  p === "..." ? (
                    <span key={`ellipsis-${idx}`} className={styles.pageEllipsis}>
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${p}`}
                      className={`${styles.pageBtn} ${
                        activePage === p ? styles.pageBtnActive : ""
                      }`}
                      onClick={() => setCurrentPage(p)}
                      type="button"
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  className={styles.pageBtn}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={activePage >= totalPages}
                  type="button"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProjectCreated={loadProjects}
      />

      <CreateProjectModal
        isOpen={Boolean(editProject)}
        initialProject={editProject}
        onClose={closeEditProjectModal}
        onProjectSaved={loadProjects}
      />
    </div>
  );
};

export default Dashboard;
