import React, { useState } from "react";
import styles from "../styles/Dashboard.module.css";
import {
  Network,
  Compass,
  UserCog,
  TriangleAlert,
  RefreshCw,
  Plus,
  Filter,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
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

  // Create dan Edit memakai modal yang sama.
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleDeleteProject = async (id, name) => {
    if (!window.confirm(`Hapus project "${name}"?`)) return;

    toast.promise(deleteProject(id), {
      loading: 'Menghapus project...',
      success: 'Project berhasil dihapus!',
      error: 'Gagal menghapus project.'
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

  React.useEffect(() => {
    if (loading) {
      toast.loading('Memuat data project...', { id: 'load-projects' });
    } else {
      toast.dismiss('load-projects');
      if (error) toast.error('Gagal memuat data project');
    }
  }, [loading, error]);

  // ============================================================
  // STATS COUNTERS
  // ============================================================
  const totalActive = projects.length;
  const planningCount = projects.filter((p) => (p.phase || "PLANNING").toUpperCase() === "PLANNING").length;
  const constructionCount = projects.filter((p) => (p.phase || "").toUpperCase() === "CONSTRUCTION").length;
  const issueCount = projects.filter((p) => (p.phase || "").toUpperCase() === "ISSUE DETECTED").length;

  return (
    <div className={styles.dashboardWrapper}>
      <Header />

      <div className={styles.dashboardContent}>
        {/* STATS SECTION */}
        <div className={styles.statsGrid}>
          <StatCard icon={Network} label="SEMUA AKTIF" value={totalActive} desc="Proyek Aktif" iconClass="textYellow" />
          <StatCard icon={Compass} label="TAHAP 1" value={planningCount} desc="Tahap Perencanaan" iconClass="textGray" />
          <StatCard icon={UserCog} label="TAHAP 2" value={constructionCount} desc="Tahap Konstruksi" iconClass="textGray" />
          <StatCard icon={TriangleAlert} label="PERLU TINDAKAN" value={issueCount} desc="Masalah Belum Selesai" isDanger />
        </div>

        {/* PROJECTS TABLE SECTION */}
        <div className={styles.projectsSection}>
          <div className={styles.projectsHeader}>
            <div className={styles.projectsTitle}>
              <div className={styles.titleAccent} />
              <h3>Proyek Aktif Terbaru</h3>
            </div>
            <div className={styles.projectsActions}>
              <button className={styles.iconBtn} onClick={loadProjects} disabled={loading || loadingSurvey} type="button" title="Muat Ulang">
                <RefreshCw size={18} />
              </button>
              <button className={styles.newProjectBtn} onClick={() => setIsModalOpen(true)} type="button">
                <Plus size={18} /> Proyek Baru
              </button>
              <button className={styles.iconBtn} type="button" title="Filter"><Filter size={18} /></button>
              <button className={styles.iconBtn} type="button" title="Lainnya"><MoreVertical size={18} /></button>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.projectsTable}>
              <thead>
                <tr>
                  <th>NAMA PROYEK</th>
                  <th>KLIEN</th>
                  <th>LOKASI</th>
                  <th>PROGRES</th>
                  <th>TAHAP SAAT INI</th>
                  <th>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className={`${styles.textCenter} ${styles.textGray}`}>Memuat proyek...</td></tr>
                ) : error ? (
                  <tr><td colSpan={6} className={`${styles.textCenter} ${styles.textDanger}`}>{error}</td></tr>
                ) : projects.length === 0 ? (
                  <tr><td colSpan={6} className={`${styles.textCenter} ${styles.textGray}`}>Belum ada proyek. Klik "Proyek Baru" untuk menambahkan.</td></tr>
                ) : (
                  projects.map((project, index) => (
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

          <div className={styles.projectsFooter}>
            <span className={styles.textGray}>Menampilkan {projects.length} proyek</span>
            <div>
              <button className={styles.iconBtn} type="button"><ChevronLeft size={16} /></button>
              <button className={styles.iconBtn} type="button"><ChevronRight size={16} /></button>
            </div>
          </div>
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