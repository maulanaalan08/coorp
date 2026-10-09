import { buildApiUrl, parseJsonSafe } from "./utils";

const API_BASE_URL = "http://localhost:4000/api";

async function handleResponse(response) {
  const json = await parseJsonSafe(response);
  if (!response.ok) throw new Error(json?.error || json?.message || `Error status ${response.status}`);
  return json;
}
export const joinOpnameService = {
  getAuthHeaders: () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  },
  getProjects: async () => {
    const response = await fetch(buildApiUrl(API_BASE_URL, "/projects"), {
      headers: joinOpnameService.getAuthHeaders()
    });
    return handleResponse(response);
  },

  getJoinOpname: async (projectId, filterValue, workSubCategoryId) => {
    const params = {};
    if (filterValue && filterValue !== "General") {
      if (filterValue.length > 20) {
        params.workCategoryId = filterValue;
      } else {
        params.discipline = filterValue;
      }
    }
    if (workSubCategoryId) {
      params.workSubCategoryId = workSubCategoryId;
    }
    const response = await fetch(buildApiUrl(API_BASE_URL, `/projects/${projectId}/join-opname`, params), {
      headers: joinOpnameService.getAuthHeaders()
    });
    return handleResponse(response);
  },

  updateProgress: async (rabItemId, date, progressPercent, files = null) => {
    const formData = new FormData();
    formData.append("date", date);
    formData.append("progressPercent", progressPercent);

    if (files && files.length > 0) {
      const { compressFiles } = await import('../utils/imageCompression.js');
      const compressedFiles = await compressFiles(files);
      for (let i = 0; i < compressedFiles.length; i++) {
        formData.append("foto", compressedFiles[i]);
      }
    }

    const response = await fetch(buildApiUrl(API_BASE_URL, `/rab-items/${rabItemId}/progress`), {
      method: "PUT",
      body: formData, // fetch otomatis mengatur headers Content-Type multipart/form-data
      headers: joinOpnameService.getAuthHeaders()
    });
    return handleResponse(response);
  },

  exportPdf: (projectId, filterValue, date, type, workSubCategoryId) => {
    const url = new URL(`${API_BASE_URL}/projects/${projectId}/join-opname/export/pdf`);
    if (filterValue && filterValue !== "General") {
      if (filterValue.length > 20) {
        url.searchParams.append("workCategoryId", filterValue);
      } else {
        url.searchParams.append("discipline", filterValue);
      }
    }
    if (workSubCategoryId) {
      url.searchParams.append("workSubCategoryId", workSubCategoryId);
    }
    if (date) url.searchParams.append("date", date);
    if (type) url.searchParams.append("type", type);
    window.open(url.toString(), "_blank");
  },

  exportExcel: (projectId, filterValue, date, type = "daily", workSubCategoryId = null, monthStr = null) => {
    const url = new URL(`${API_BASE_URL}/projects/${projectId}/join-opname/export/excel`);
    if (filterValue && filterValue !== "General") {
      if (filterValue.length > 20) {
        url.searchParams.append("workCategoryId", filterValue);
      } else {
        url.searchParams.append("discipline", filterValue);
      }
    }
    if (workSubCategoryId) {
      url.searchParams.append("workSubCategoryId", workSubCategoryId);
    }
    if (date) url.searchParams.append("date", date);
    if (type) url.searchParams.append("type", type);
    if (monthStr) url.searchParams.append("month", monthStr);
    window.location.href = url.toString();
  }
};