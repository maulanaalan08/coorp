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

  getGlobalSchedule: async () => {
    const res = await fetch(`${API_BASE_URL}/global-schedule`);
    return handleResponse(res);
  },

  getSchedule: async (projectId, filterValue) => {
    const url = new URL(`${API_BASE_URL}/projects/${projectId}/rap-time-schedule`);
    if (filterValue && filterValue !== 'General') {
      if (filterValue.length > 20) {
        url.searchParams.append('workCategoryId', filterValue);
      } else {
        url.searchParams.append('discipline', filterValue);
      }
    }
    const res = await fetch(url.toString());
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

  updateItemSchedule: async (rabItemId, startDate, endDate) => {
    const res = await fetch(`${API_BASE_URL}/rap-items/${rabItemId}/schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate }),
    });
    return handleResponse(res);
  },

  updateBatchSchedule: async (projectId, schedules) => {
    const res = await fetch(`${API_BASE_URL}/projects/${projectId}/rap-time-schedule/batch`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedules }),
    });
    return handleResponse(res);
  },

  deleteItemSchedule: async (rabItemId) => {
    const res = await fetch(`${API_BASE_URL}/rap-items/${rabItemId}/schedule`, {
      method: "DELETE",
    });
    return handleResponse(res);
  },

  exportExcel(projectId, filterValue) {
    const url = new URL(`${API_BASE_URL}/projects/${projectId}/time-schedule/export`);
    if (filterValue && filterValue !== 'General') {
      if (filterValue.length > 20) {
        url.searchParams.append('workCategoryId', filterValue);
      } else {
        url.searchParams.append('discipline', filterValue);
      }
    }
    window.open(url.toString(), "_blank");
  }
};