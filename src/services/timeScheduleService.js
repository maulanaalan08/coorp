const API_BASE_URL = "http://localhost:4000/api";

async function handleResponse(res) {
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || json?.message || `Error status ${res.status}`);
  return json;
}

export const timeScheduleService = {
  getProjects: async () => {
    const res = await fetch(`${API_BASE_URL}/projects`);
    return handleResponse(res);
  },

  getSchedule: async (projectId) => {
    const res = await fetch(`${API_BASE_URL}/projects/${projectId}/time-schedule`);
    return handleResponse(res);
  },

  updateStartDate: async (projectId, startDate) => {
    const res = await fetch(`${API_BASE_URL}/projects/${projectId}/start-date`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate }),
    });
    return handleResponse(res);
  },

  updateItemSchedule: async (rabItemId, startWeek, endWeek) => {
    const res = await fetch(`${API_BASE_URL}/rab-items/${rabItemId}/schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startWeek, endWeek }),
    });
    return handleResponse(res);
  },

  deleteItemSchedule: async (rabItemId) => {
    const res = await fetch(`${API_BASE_URL}/rab-items/${rabItemId}/schedule`, {
      method: "DELETE",
    });
    return handleResponse(res);
  },

  exportExcel: (projectId) => {
    window.open(`${API_BASE_URL}/projects/${projectId}/time-schedule/export`, "_blank");
  }
};