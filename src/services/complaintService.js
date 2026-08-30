import axios from 'axios';

// Ganti dengan baseURL API Anda
const API_URL = 'http://localhost:4000/api'; 

export const complaintService = {
  getComplaintsByProject: async (projectId) => {
    const response = await axios.get(`${API_URL}/projects/${projectId}/complaints`);
    return response.data;
  },

  getComplaintById: async (id) => {
    const response = await axios.get(`${API_URL}/complaints/${id}`);
    return response.data;
  },

  createComplaint: async (projectId, formData) => {
    const response = await axios.post(`${API_URL}/projects/${projectId}/complaints`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateComplaint: async (id, formData) => {
    const response = await axios.put(`${API_URL}/complaints/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteComplaint: async (id) => {
    const response = await axios.delete(`${API_URL}/complaints/${id}`);
    return response.data;
  },

  downloadPdf: (id) => {
    window.open(`${API_URL}/complaints/${id}/pdf/download`, '_blank');
  }
};