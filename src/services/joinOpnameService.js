import { buildApiUrl, parseJsonSafe } from "./utils";

const API_BASE_URL = "http://localhost:4000/api";

async function handleResponse(response) {
  const json = await parseJsonSafe(response);
  if (!response.ok) throw new Error(json?.error || json?.message || `Error status ${response.status}`);
  return json;
}

export const joinOpnameService = {
  getProjects: async () => {
    const response = await fetch(buildApiUrl(API_BASE_URL, "/projects"));
    return handleResponse(response);
  },

  getJoinOpname: async (projectId, discipline) => {
    const response = await fetch(buildApiUrl(API_BASE_URL, `/projects/${projectId}/join-opname`, { discipline }));
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
    });
    return handleResponse(response);
  }
};