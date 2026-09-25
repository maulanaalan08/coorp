import { useState, useEffect, useCallback } from "react";
import { projectService } from "../services/projectService";

export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [surveyStatus, setSurveyStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingSurvey, setLoadingSurvey] = useState(false);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getAll();
      const projectList = Array.isArray(data) ? data : data?.data || [];
      setProjects(projectList);

      // Ambil status survey secara paralel hanya jika projek tidak kosong
      if (projectList.length > 0) {
        setLoadingSurvey(true);

        // Gunakan Promise.allSettled agar jika 1 survey error, yang lain tetap jalan
        const surveyPromises = projectList.map(async (project) => {
          try {
            const res = await projectService.getSurveys(project.id);
            const surveys = Array.isArray(res) ? res : res?.data || [];
            return { projectId: project.id, hasSurvey: surveys.length > 0 };
          } catch {
            return { projectId: project.id, hasSurvey: false };
          }
        });

        const results = await Promise.all(surveyPromises);

        const statusMap = {};
        results.forEach((item) => {
          statusMap[item.projectId] = item.hasSurvey;
        });
        setSurveyStatus(statusMap);
        setLoadingSurvey(false);
      } else {
        setSurveyStatus({});
      }

      return projectList;
    } catch (err) {
      setError("Failed to load projects. Make sure the backend server is running.");
      setProjects([]);
      setSurveyStatus({});
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (projectData) => {
    try {
      const newProject = await projectService.create(projectData);
      await fetchProjects();
      return newProject;
    } catch (err) {
      throw new Error(err.message || "Failed to create project");
    }
  }, [fetchProjects]);

  const updateProject = useCallback(async (id, projectData) => {
    try {
      const updated = await projectService.update(id, projectData);
      await fetchProjects();
      return updated;
    } catch (err) {
      throw new Error(err.message || "Failed to update project");
    }
  }, [fetchProjects]);

  const deleteProject = useCallback(async (id) => {
    try {
      await projectService.delete(id);
      await fetchProjects();
    } catch (err) {
      throw new Error(err.message || "Failed to delete project");
    }
  }, [fetchProjects]);

  useEffect(() => {
    fetchProjects().catch(() => { });
  }, [fetchProjects]);

  return {
    projects,
    surveyStatus,
    loading,
    loadingSurvey,
    error,
    refresh: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
};