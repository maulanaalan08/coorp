// src/services/authService.js
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/auth`
  : "http://localhost:4000/api/auth";

export const authService = {
  /**
   * Login user — POST /api/auth/login
   * @param {{ username: string, password: string }} payload
   */
  async login(payload) {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Login gagal.");
    return data;
  },

  /**
   * Register user — POST /api/auth/register
   * @param {{ username: string, password: string, name: string, role: string }} payload
   */
  async register(payload) {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Pendaftaran gagal.");
    return data;
  },

  /** Ambil token dari localStorage */
  getToken() {
    return localStorage.getItem("token");
  },

  /** Ambil data user dari localStorage */
  getUser() {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  },

  /**
   * Buat object header Authorization: Bearer <token>
   * Contoh pemakaian di service lain:
   *   headers: { ...authService.getAuthHeader() }
   */
  getAuthHeader() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
};