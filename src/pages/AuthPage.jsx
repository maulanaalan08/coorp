// src/pages/AuthPage.jsx
import React, { useState } from "react";
import { authService } from "../services/authService";
import Alert from "../components/Alert";
import "../styles/Auth.css";

export default function AuthPage({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState("login");
  const [alert, setAlert] = useState({ message: "", type: "" });
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    role: "PERENCANA",
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const showAlert = (message, type) => {
    setAlert({ message, type });
    setTimeout(() => setAlert({ message: "", type: "" }), 4000);
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setAlert({ message: "", type: "" });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password.trim()) {
      showAlert("Username dan password tidak boleh kosong.", "error");
      return;
    }
    setLoading(true);
    try {
      const data = await authService.login({
        username: formData.username.trim(),
        password: formData.password,
      });
      showAlert(data.message || "Login berhasil!", "success");
      // Delay 800ms agar user sempat lihat pesan sukses
      setTimeout(() => onLoginSuccess(data.user, data.token), 800);
    } catch (error) {
      showAlert(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim() || !formData.password.trim()) {
      showAlert("Semua field wajib diisi.", "error");
      return;
    }
    if (formData.password.length < 6) {
      showAlert("Password minimal 6 karakter.", "error");
      return;
    }
    setLoading(true);
    try {
      const data = await authService.register(formData);
      showAlert(data.message || "Akun berhasil dibuat!", "success");
      setTimeout(() => {
        setActiveTab("login");
        setFormData({ ...formData, name: "", password: "" });
      }, 1500);
    } catch (error) {
      showAlert(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* ── Kolom Kiri: Branding ── */}
      <div className="auth-branding">
        <div className="brand-logo">DIVES CORP.</div>
        <div className="brand-tagline">Interior &amp; Contractor</div>

        <div className="brand-divider" />

        <h1 className="brand-headline">
          Kelola proyek dengan <em>presisi</em> dan kepercayaan.
        </h1>
        <p className="brand-description">
          Platform manajemen proyek terpadu untuk tim interior dan kontraktor — dari RAB hingga laporan akhir dalam satu sistem.
        </p>

        <div className="brand-badges">
          <span className="brand-badge">RAB &amp; Budgeting</span>
          <span className="brand-badge">Time Schedule</span>
          <span className="brand-badge">Back Up Volume</span>
          <span className="brand-badge">Laporan Keuangan</span>
        </div>
      </div>

      {/* ── Kolom Kanan: Form Auth ── */}
      <div className="auth-form-panel">
        <div className="auth-form-header">
          <h2 className="auth-form-title">
            {activeTab === "login" ? "Selamat Datang" : "Buat Akun Baru"}
          </h2>
          <p className="auth-form-subtitle">
            {activeTab === "login"
              ? "Masuk ke akun Anda untuk melanjutkan."
              : "Daftarkan akun untuk memulai."}
          </p>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <div
            className={`auth-tab ${activeTab === "login" ? "active" : ""}`}
            onClick={() => switchTab("login")}
          >
            Login
          </div>
          <div
            className={`auth-tab ${activeTab === "register" ? "active" : ""}`}
            onClick={() => switchTab("register")}
          >
            Register
          </div>
        </div>

        {/* Form Login */}
        {activeTab === "login" ? (
          <form className="auth-form" key="login" onSubmit={handleLoginSubmit}>
            <div className="auth-input-group">
              <label htmlFor="login-username">Username</label>
              <input
                type="text"
                id="login-username"
                name="username"
                placeholder="Masukkan username Anda"
                value={formData.username}
                onChange={handleInputChange}
                autoComplete="username"
                required
              />
            </div>
            <div className="auth-input-group">
              <label htmlFor="login-password">Password</label>
              <input
                type="password"
                id="login-password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                autoComplete="current-password"
                required
              />
            </div>

            <Alert key={alert.message} message={alert.message} type={alert.type} />

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="btn-spinner" />
                  Memverifikasi...
                </>
              ) : (
                "Masuk"
              )}
            </button>
          </form>
        ) : (
          /* Form Register */
          <form className="auth-form" key="register" onSubmit={handleRegisterSubmit}>
            <div className="auth-input-group">
              <label htmlFor="reg-name">Nama Lengkap</label>
              <input
                type="text"
                id="reg-name"
                name="name"
                placeholder="Nama lengkap Anda"
                value={formData.name}
                onChange={handleInputChange}
                autoComplete="name"
                required
              />
            </div>
            <div className="auth-input-group">
              <label htmlFor="reg-username">Username</label>
              <input
                type="text"
                id="reg-username"
                name="username"
                placeholder="Pilih username unik"
                value={formData.username}
                onChange={handleInputChange}
                autoComplete="username"
                required
              />
            </div>
            <div className="auth-input-group">
              <label htmlFor="reg-password">Password</label>
              <input
                type="password"
                id="reg-password"
                name="password"
                placeholder="Minimal 6 karakter"
                value={formData.password}
                onChange={handleInputChange}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="auth-input-group">
              <label htmlFor="reg-role">Role</label>
              <div className="auth-select-wrapper">
                <select
                  id="reg-role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  <option value="PERENCANA">Perencana</option>
                  <option value="PELAKSANA">Pelaksana</option>
                  <option value="FINANCE">Finance</option>
                  <option value="PURCHASING">Purchasing</option>
                  <option value="PROJECT_MANAGER">Project Manager</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
            </div>

            <Alert key={alert.message} message={alert.message} type={alert.type} />

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="btn-spinner" />
                  Mendaftarkan...
                </>
              ) : (
                "Daftar Akun"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}