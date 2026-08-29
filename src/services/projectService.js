// src/services/projectService.js
import { fetchAPI } from './api';

export const projectService = {
  // Get all projects
  getAll: () => fetchAPI('/projects'),

  // Get single project
  getById: (id) => fetchAPI(`/projects/${id}`),

  // Check survey status for a project
  getSurveys: (projectId) => fetchAPI(`/projects/${projectId}/surveys`),

  // Create new project
  create: (projectData) =>
    fetchAPI('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    }),

  // Update project
  update: (id, projectData) =>
    fetchAPI(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    }),

  // Delete project
  delete: (id) =>
    fetchAPI(`/projects/${id}`, {
      method: 'DELETE',
    }),
};