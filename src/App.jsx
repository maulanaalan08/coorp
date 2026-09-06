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
import BastPage from "./pages/BastPage";
import ItemTrackingPage from "./pages/ItemTrackingPage";
import { Bot } from "lucide-react";

function App() {
  const { isAuthenticated, loginAuth, logoutAuth, user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [globalProjectId, setGlobalProjectId] = useState(null);

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
    <div className="flex w-full h-screen bg-[#0c0b09] overflow-hidden">

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
      <main className="flex-1 h-screen overflow-y-auto relative w-full">
        {activeTab === "dashboard" && (
          <Dashboard
            onCreateBv={(projectId) => {
              setGlobalProjectId(projectId);
              setActiveTab("bv");
            }}
            onCreateSurvey={(projectId) => {
              setGlobalProjectId(projectId);
              setActiveTab("data-survey");
            }}
            onViewDetails={() => setActiveTab("project-board")}
          />
        )}
        {activeTab === "project-board" && <ProjectBoard />}
        {activeTab === "upload-hspk" && <UploadHspk />}
        {activeTab === "data-survey" && <DataSurvey initialProjectId={globalProjectId} />}
        {(activeTab === "bv" || activeTab === "backup-volume") && <BackUpVolume initialProjectId={globalProjectId} />}
        {activeTab === "rab" && <RabBudgeting />}
        {activeTab === "finance" && <FinancePage />}
        {activeTab === "purchase-orders" && <PurchaseOrderPage />}
        {activeTab === "time-schedule" && <TimeSchedulePage />}
        {activeTab === "join-opname" && <JoinOpnamePage />}
        {activeTab === "bast" && <BastPage />}
        {activeTab === "complain" && <ComplaintPage />}
        {activeTab === "item-tracking" && <ItemTrackingPage />}
      </main>

      {/* Floating Chatbot Placeholder */}
      <button
        type="button"
        onClick={() => alert("Chatbot feature coming soon!")}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-[#d4af37] to-[#a8862a] text-[#0c0b09] flex justify-center items-center shadow-lg shadow-[#d4af37]/40 border-none cursor-pointer z-50 hover:scale-110 transition-transform duration-200"
      >
        <Bot size={28} />
      </button>
    </div>
  );
}

export default App;