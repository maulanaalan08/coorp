// src/services/api.js
const API_BASE_URL = 'http://localhost:4000/api';

export const fetchAPI = async (endpoint, options = {}) => {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || errorData?.error || `HTTP Error: ${response.status}`);
  }

  return response.json();
};