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

  updateProgress: async (rabItemId, date, progressPercent, file) => {
    const formData = new FormData();
    formData.append("date", date);
    formData.append("progressPercent", progressPercent);
    if (file) {
      formData.append("foto", file); // Sesuai dengan konfigurasi multer backend[cite: 15]
    }

    const response = await fetch(buildApiUrl(API_BASE_URL, `/rab-items/${rabItemId}/progress`), {
      method: "PUT",
      body: formData, // fetch otomatis mengatur headers Content-Type multipart/form-data
    });
    return handleResponse(response);
  }
};