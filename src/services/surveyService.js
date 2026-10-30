// src/services/surveyService.js
import { fetchAPI } from './api';

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '');

export const surveyService = {
  // Ambil semua survey milik sebuah project
  getByProjectId: (projectId) =>
    fetchAPI(`/projects/${projectId}/surveys`),

  // Buat survey baru (FormData: field surveyData + foto photo_{aIdx}_{pIdx})
  create: (projectId, formData) =>
    fetchAPI(`/projects/${projectId}/surveys`, {
      method: 'POST',
      body: formData,
    }),

  // Update survey (FormData)
  update: (surveyId, formData) =>
    fetchAPI(`/surveys/${surveyId}`, {
      method: 'PUT',
      body: formData,
    }),

  // Hapus survey
  delete: (surveyId) =>
    fetchAPI(`/surveys/${surveyId}`, { method: 'DELETE' }),

  // URL untuk buka/unduh PDF (bukan fetch, langsung di <a href>)
  getPdfViewUrl: (surveyId) => `${BASE_URL}/api/surveys/${surveyId}/pdf/view`,
  getPdfDownloadUrl: (surveyId) => `${BASE_URL}/api/surveys/${surveyId}/pdf/download`,

  // Hasil desain 3D per project: screenshot/render + link Google Drive.
  get3dResult: (projectId) =>
    fetchAPI(`/projects/${projectId}/survey-3d`),

  save3dResult: (projectId, formData) =>
    fetchAPI(`/projects/${projectId}/survey-3d`, {
      method: 'PUT',
      body: formData,
    }),
};
