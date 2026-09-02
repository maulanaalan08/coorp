// src/App.jsx
import React, { useState } from "react";
import { Toaster } from 'react-hot-toast';

// --- Komponen Autentikasi ---
import { useAuth } from "./hooks/useAuth";
import AuthPage from "./pages/AuthPage";
import "./styles/Auth.css";

// --- Komponen Layout & Halaman Dashboard ---
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import ProjectBoard from "./pages/ProjectBoard";
import UploadHspk from "./pages/UploadHspk";
import BackUpVolume from "./pages/BackUpVolume";
import DataSurvey from "./pages/DataSurvey";
import RabBudgeting from "./pages/RabBudgeting";
import TimeSchedulePage from "./pages/TimeSchedulePage";
import JoinOpnamePage from "./pages/JoinOpnamePage";
import FinancePage from "./pages/FinancePage";
import PurchaseOrderPage from "./pages/PurchaseOrderPage";
import ComplaintPage from "./pages/ComplaintPage";
import PrintPOPage from "./pages/PrintPOPage";
import { Bot } from "lucide-react";

function App() {
  const { isAuthenticated, loginAuth, logoutAuth, user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Cek apakah mode khusus print PO (via URL parameter)
  const urlParams = new URLSearchParams(window.location.search);
  const printPoId = urlParams.get("print-po");

  // Jika URL memiliki parameter print-po, langsung render halaman print tanpa layout biasa
  if (printPoId) {
    return <PrintPOPage poId={printPoId} />;
  }

  // Tampilkan splash screen saat masih mengecek session (mencegah flash ke login)
  if (isLoading) {
    return (
      <div className="auth-splash">
        <div className="splash-logo">DIVES CORP.</div>
        <div className="splash-spinner" />
      </div>
    );
  }

  // JIKA BELUM LOGIN: Tampilkan Halaman Login / Register
  if (!isAuthenticated) {
    return <AuthPage onLoginSuccess={loginAuth} />;
  }

  // JIKA SUDAH LOGIN: Tampilkan Layout Utama (Sidebar + Main Content)
  return (
    <div style={{ display: "flex", width: "100vw", minHeight: "100vh", backgroundColor: "#0c0b09" }}>

      {/* Konfigurasi Notifikasi Toaster dari react-hot-toast */}
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#1a1814',
            color: '#fff',
            border: '1px solid #d4af37',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: '#d4af37',
              secondary: '#1a1814',
            },
          },
        }}
      />
      
      {/* Sidebar - Kita bisa passing prop onLogout agar user bisa keluar dari menu sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={logoutAuth} 
        user={user} 
      />

      {/* Konten Utama berdasarkan tab yang aktif */}
      <main style={{ flex: 1, marginLeft: "260px", overflowY: "auto" }}>
        {activeTab === "dashboard" && (
          <Dashboard
            onCreateBv={() => setActiveTab("bv")}
            onViewDetails={() => setActiveTab("project-board")}
          />
        )}
        {activeTab === "project-board" && <ProjectBoard />}
        {activeTab === "upload-hspk" && <UploadHspk />}
        {activeTab === "data-survey" && <DataSurvey />}
        {(activeTab === "bv" || activeTab === "backup-volume") && <BackUpVolume />}
        {activeTab === "rab" && <RabBudgeting />}
        {activeTab === "finance" && <FinancePage />}
        {activeTab === "purchase-orders" && <PurchaseOrderPage />}
        {activeTab === "time-schedule" && <TimeSchedulePage />}
        {activeTab === "join-opname" && <JoinOpnamePage />}
        {activeTab === "complain" && <ComplaintPage />}
      </main>

      {/* Floating Chatbot Placeholder */}
      <button 
        type="button" 
        onClick={() => alert("Chatbot feature coming soon!")}
        style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          backgroundColor: "#d4af37",
          color: "#0c0b09",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          boxShadow: "0 4px 12px rgba(212, 175, 55, 0.4)",
          border: "none",
          cursor: "pointer",
          zIndex: 9999,
          transition: "transform 0.2s ease",
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
      >
        <Bot size={32} />
      </button>
    </div>
  );
}

export default App;