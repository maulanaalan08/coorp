import React, { useEffect, useState } from "react";
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
  ChevronRight 
} from "lucide-react";

import Header from "../components/Header";
import StatCard from "../components/StatCard";
import ProjectTableRow from "../components/ProjectTableRow";
import CreateProjectModal from "../components/CreateProjectModal";
import EditProjectModal from "../components/EditProjectModal";
import { projectService } from "../services/projectService";

const Dashboard = ({ onViewDetails, onCreateBv, onCreateSurvey }) => {
  // ============================================================
  // STATES
  // ============================================================
  const [projects, setProjects] = useState([]);
  const [surveyStatus, setSurveyStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingSurvey, setLoadingSurvey] = useState(false);
  const [error, setError] = useState(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "", location: "", hspkPeriod: "", discipline: "", grade: "", clientName: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);

  // ============================================================
  // FETCH / LOAD DATA
  // ============================================================
  const checkSurveyStatus = async (projectList) => {
    if (!Array.isArray(projectList) || projectList.length === 0) {
      setSurveyStatus({});
      return;
    }
    setLoadingSurvey(true);
    try {
      const results = await Promise.all(
        projectList.map(async (project) => {
          try {
            const res = await projectService.getSurveys(project.id);
            const surveys = Array.isArray(res) ? res : res?.data || [];
            return { projectId: project.id, hasSurvey: surveys.length > 0 };
          } catch {
            return { projectId: project.id, hasSurvey: false };
          }
        })
      );
      const statusMap = {};
      results.forEach((item) => { statusMap[item.projectId] = item.hasSurvey; });
      setSurveyStatus(statusMap);
    } finally {
      setLoadingSurvey(false);
    }
  };

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getAll();
      const projectList = Array.isArray(data) ? data : data?.data || [];
      setProjects(projectList);
      await checkSurveyStatus(projectList);
    } catch (err) {
      setProjects([]);
      setError("Failed to load projects. Make sure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // ============================================================
  // HANDLERS (DELETE & EDIT)
  // ============================================================
  const handleDeleteProject = async (id, name) => {
    if (!window.confirm(`Hapus project "${name}"?`)) return;
    try {
      await projectService.delete(id);
      await loadProjects();
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
      await projectService.update(editProject.id, {
        name: editForm.name.trim(),
        location: editForm.location.trim(),
        hspkPeriod: editForm.hspkPeriod === "" ? null : Number(editForm.hspkPeriod),
        discipline: editForm.discipline.trim(),
        grade: editForm.grade.trim(),
        clientName: editForm.clientName.trim(),
      });
      closeEditProjectModal();
      await loadProjects();
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
              <button className={styles.iconBtn} onClick={loadProjects} disabled={loading || loadingSurvey} type="button">
                <RefreshCw size={18} />
              </button>
              <button className={styles.newProjectBtn} onClick={() => setIsModalOpen(true)} type="button">
                <Plus size={18} /> New Project
              </button>
              <button className={styles.iconBtn} type="button"><Filter size={18} /></button>
              <button className={styles.iconBtn} type="button"><MoreVertical size={18} /></button>
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