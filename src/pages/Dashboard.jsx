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
  X,
  Save,
  Pencil,
  Trash2
} from "lucide-react";

import Header from "../components/Header";
import StatCard from "../components/StatCard";
import ProjectTableRow from "../components/ProjectTableRow";
import CreateProjectModal from "../components/CreateProjectModal";
import { useProjects } from "../hooks/useProjects";

// ================================================================
// INLINE EDIT MODAL — Desain selaras dengan CreateProjectModal
// ================================================================
function EditProjectModal({ editProject, editForm, editError, savingEdit, onClose, onChange, onSubmit }) {
  if (!editProject) return null;

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !savingEdit) onClose(); }}>
      <div className="modal-content" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h3>Edit Project</h3>
          <button className="close-btn" type="button" onClick={onClose} disabled={savingEdit}>
            <X size={20} />
          </button>
        </div>

        <form className="project-form" onSubmit={onSubmit}>
          {editError && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.35)',
              color: '#ef4444',
              padding: '12px 16px',
              borderRadius: 4,
              fontSize: '0.85rem',
              marginBottom: 20
            }}>
              {editError}
            </div>
          )}

          <div className="card">
            <h2>Informasi Project</h2>
            <div className="grid">
              <div className="form-group">
                <label>Project Name</label>
                <input
                  id="edit-name"
                  name="name"
                  type="text"
                  value={editForm.name}
                  onChange={onChange}
                  placeholder="Nama project"
                  disabled={savingEdit}
                  required
                />
              </div>

              <div className="form-group">
                <label>Client Name</label>
                <input
                  id="edit-clientName"
                  name="clientName"
                  type="text"
                  value={editForm.clientName}
                  onChange={onChange}
                  placeholder="Nama client"
                  disabled={savingEdit}
                />
              </div>

              <div className="form-group full">
                <label>Location</label>
                <input
                  id="edit-location"
                  name="location"
                  type="text"
                  value={editForm.location}
                  onChange={onChange}
                  placeholder="Lokasi project"
                  disabled={savingEdit}
                />
              </div>

              <div className="form-group">
                <label>HSPK Period</label>
                <input
                  id="edit-hspkPeriod"
                  name="hspkPeriod"
                  type="number"
                  value={editForm.hspkPeriod}
                  onChange={onChange}
                  placeholder="Contoh: 2026"
                  disabled={savingEdit}
                />
              </div>

              <div className="form-group">
                <label>Discipline</label>
                <select
                  id="edit-discipline"
                  name="discipline"
                  value={editForm.discipline}
                  onChange={onChange}
                  disabled={savingEdit}
                >
                  <option value="">— Pilih Disiplin —</option>
                  <option value="SIPIL">Sipil</option>
                  <option value="INTERIOR">Interior</option>
                </select>
              </div>

              <div className="form-group">
                <label>Grade</label>
                <select
                  id="edit-grade"
                  name="grade"
                  value={editForm.grade}
                  onChange={onChange}
                  disabled={savingEdit}
                >
                  <option value="">— Pilih Grade —</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
            </div>
          </div>

          <div className="actions">
            <button type="button" className="cancel" onClick={onClose} disabled={savingEdit}>
              Cancel
            </button>
            <button type="submit" className="create" disabled={savingEdit}>
              {savingEdit ? (
                <><RefreshCw size={16} style={{ display: 'inline', marginRight: 6, animation: 'spin 1s linear infinite' }} /> Saving...</>
              ) : (
                <><Save size={16} style={{ display: 'inline', marginRight: 6 }} /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
    updateProject,
    deleteProject,
  } = useProjects();

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "", location: "", hspkPeriod: "", discipline: "", grade: "", clientName: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleDeleteProject = async (id, name) => {
    if (!window.confirm(`Hapus project "${name}"?`)) return;
    try {
      await deleteProject(id);
    } catch (err) {
      alert(err.message);
    }
  };

  const openEditProjectModal = (project) => {
    setEditError(null);
    setEditProject(project);
    setEditForm({
      name: project?.name || "",
      location: project?.location || "",
      hspkPeriod: project?.hspkPeriod != null ? String(project.hspkPeriod) : "",
      discipline: project?.discipline || "",
      grade: project?.grade || "",
      clientName: project?.client?.name || "",
    });
  };

  const closeEditProjectModal = () => {
    if (savingEdit) return;
    setEditProject(null);
    setEditError(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEditProject = async (e) => {
    e.preventDefault();
    if (!editProject?.id || !editForm.name.trim()) return;
    setSavingEdit(true);
    try {
      await updateProject(editProject.id, {
        name: editForm.name.trim(),
        location: editForm.location.trim(),
        hspkPeriod: editForm.hspkPeriod === "" ? null : Number(editForm.hspkPeriod),
        discipline: editForm.discipline.trim(),
        grade: editForm.grade.trim(),
        clientName: editForm.clientName.trim(),
      });
      closeEditProjectModal();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

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
          <StatCard icon={Network} label="ALL ACTIVE" value={totalActive} desc="Active Projects" iconClass="textYellow" />
          <StatCard icon={Compass} label="PHASE 1" value={planningCount} desc="In Planning Phase" iconClass="textGray" />
          <StatCard icon={UserCog} label="PHASE 2" value={constructionCount} desc="In Construction Phase" iconClass="textGray" />
          <StatCard icon={TriangleAlert} label="ACTION REQUIRED" value={issueCount} desc="Unresolved Issues" isDanger />
        </div>

        {/* PROJECTS TABLE SECTION */}
        <div className={styles.projectsSection}>
          <div className={styles.projectsHeader}>
            <div className={styles.projectsTitle}>
              <div className={styles.titleAccent} />
              <h3>Recent Active Projects</h3>
            </div>
            <div className={styles.projectsActions}>
              <button className={styles.iconBtn} onClick={loadProjects} disabled={loading || loadingSurvey} type="button" title="Refresh">
                <RefreshCw size={18} />
              </button>
              <button className={styles.newProjectBtn} onClick={() => setIsModalOpen(true)} type="button">
                <Plus size={18} /> New Project
              </button>
              <button className={styles.iconBtn} type="button" title="Filter"><Filter size={18} /></button>
              <button className={styles.iconBtn} type="button" title="More"><MoreVertical size={18} /></button>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.projectsTable}>
              <thead>
                <tr>
                  <th>PROJECT NAME</th>
                  <th>CLIENT</th>
                  <th>LOCATION</th>
                  <th>PROGRESS</th>
                  <th>CURRENT PHASE</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className={`${styles.textCenter} ${styles.textGray}`}>Loading projects...</td></tr>
                ) : error ? (
                  <tr><td colSpan={6} className={`${styles.textCenter} ${styles.textDanger}`}>{error}</td></tr>
                ) : projects.length === 0 ? (
                  <tr><td colSpan={6} className={`${styles.textCenter} ${styles.textGray}`}>No projects yet. Click "New Project" to add one.</td></tr>
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
            <span className={styles.textGray}>Showing {projects.length} projects</span>
            <div>
              <button className={styles.iconBtn} type="button"><ChevronLeft size={16} /></button>
              <button className={styles.iconBtn} type="button"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onProjectCreated={loadProjects} />

      <EditProjectModal
        editProject={editProject}
        editForm={editForm}
        editError={editError}
        savingEdit={savingEdit}
        onClose={closeEditProjectModal}
        onChange={handleEditChange}
        onSubmit={handleSaveEditProject}
      />
    </div>
  );
};

export default Dashboard;