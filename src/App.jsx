// src/App.jsx
import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from 'react-hot-toast';

// --- Komponen Autentikasi (dimuat langsung: gerbang utama) ---
import { useAuth } from "./hooks/useAuth";
import AuthPage from "./pages/AuthPage";
import "./styles/Auth.css";

// --- Komponen Layout (dimuat langsung: selalu dipakai) ---
import Sidebar from "./components/Sidebar";
import { NavContext } from "./contexts/NavContext";

// --- Halaman di-lazy-load per route: tidak semua data dimuat saat buka app ---
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProjectBoard = lazy(() => import("./pages/ProjectBoard"));
const ProjectDetailDashboard = lazy(() => import("./pages/ProjectDetailDashboard"));
const UploadHspk = lazy(() => import("./pages/UploadHspk"));
const BackUpVolume = lazy(() => import("./pages/BackUpVolume"));
const DataSurvey = lazy(() => import("./pages/DataSurvey"));
const RabBudgeting = lazy(() => import("./pages/RabBudgeting"));
const SpkPage = lazy(() => import("./pages/SpkPage"));
const GlobalSchedulePage = lazy(() => import("./pages/GlobalSchedulePage"));
const TimeSchedulePage = lazy(() => import("./pages/TimeSchedulePage"));
const JoinOpnamePage = lazy(() => import("./pages/JoinOpnamePage"));
const FinancePage = lazy(() => import("./pages/FinancePage"));
const PurchaseOrderPage = lazy(() => import("./pages/PurchaseOrderPage"));
const PurchaseOrderJasaPage = lazy(() => import("./pages/PurchaseOrderJasaPage"));
const ReturPembelianPage = lazy(() => import("./pages/ReturPembelianPage"));
const PengajuanBayarPage = lazy(() => import("./pages/PengajuanBayarPage"));
const PembayaranSupplierPage = lazy(() => import("./pages/PembayaranSupplierPage"));
const PembayaranMaterialPage = lazy(() => import("./pages/PembayaranMaterialPage"));
const InvoicePenagihanPage = lazy(() => import("./pages/InvoicePenagihanPage"));
const LaporanHarianPage = lazy(() => import("./pages/LaporanHarianPage"));
const ComplaintPage = lazy(() => import("./pages/ComplaintPage"));
const PrintPOPage = lazy(() => import("./pages/PrintPOPage"));
const BastPage = lazy(() => import("./pages/BastPage"));
const ItemTrackingPage = lazy(() => import("./pages/ItemTrackingPage"));
const RiwayatHabisPakaiPage = lazy(() => import("./pages/RiwayatHabisPakaiPage"));
const BukuBesarPage = lazy(() => import("./pages/BukuBesarPage"));
const WorkCategoriesPage = lazy(() => import("./pages/WorkCategoriesPage"));

function RouteLoader() {
  return (
    <div className="auth-splash" style={{ height: '100%' }}>
      <div className="splash-logo" style={{ fontSize: '1rem' }}>DIVES CORP.</div>
      <div className="splash-spinner" />
    </div>
  );
}

function App() {
  const { isAuthenticated, loginAuth, logoutAuth, user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [globalProjectId, setGlobalProjectId] = useState(null);

  // Sinkronkan tab saat pertama load dengan URL path, agar /finance, /bv, dll berfungsi saat diakses langsung
  useEffect(() => {
    const path = window.location.pathname.replace(/^\//, '').replace(/\/$/, '') || 'dashboard';
    const tabFromPath = path.split('/')[0];
    const validTabs = [
      'dashboard', 'project-board', 'project-detail', 'upload-hspk', 'data-survey',
      'bv', 'backup-volume', 'rab', 'spk-client', 'spk-subcon', 'finance', 'pembelian-siap-pakai', 'po-material', 'po-jasa', 'kelola-jasa',
      'retur-pembelian', 'pengajuan-bayar', 'pembayaran-supplier', 'pembayaran-jasa', 'invoice-penagihan',
      'laporan-harian', 'global-schedule', 'time-schedule', 'join-opname', 'bast', 'complain',
      'item-tracking', 'habis-pakai', 'buku-besar', 'work-categories'
    ];
    if (validTabs.includes(tabFromPath)) {
      setActiveTab(tabFromPath);
    }
  }, []);

  // Deteksi token expired (401 dari API) → auto-logout + redirect ke login
  useEffect(() => {
    const onAuthExpired = () => {
      logoutAuth();
    };
    window.addEventListener('auth-expired', onAuthExpired);
    return () => window.removeEventListener('auth-expired', onAuthExpired);
  }, [logoutAuth]);

  // Notifikasi bell: lompat ke halaman tujuan + proyeknya langsung terpilih
  const navigateDariNotifikasi = (tab, projectId) => {
    if (projectId) setGlobalProjectId(projectId);
    setActiveTab(tab || "dashboard");
    window.location.hash = tab || "dashboard";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Cek apakah mode khusus print PO (via URL parameter)
  const urlParams = new URLSearchParams(window.location.search);
  const printPoId = urlParams.get("print-po");

  // Jika URL memiliki parameter print-po, langsung render halaman print tanpa layout biasa
  if (printPoId) {
    return (
      <Suspense fallback={<RouteLoader />}>
        <PrintPOPage poId={printPoId} />
      </Suspense>
    );
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
    <NavContext.Provider value={navigateDariNotifikasi}>
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
          <Suspense fallback={<RouteLoader />}>
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
            {activeTab === "project-board" && (
              <ProjectBoard
                onProjectClick={(projectId) => {
                  setGlobalProjectId(projectId);
                  setActiveTab("project-detail");
                }}
              />
            )}
            {activeTab === "project-detail" && (
              <ProjectDetailDashboard
                projectId={globalProjectId}
                onBack={() => setActiveTab("project-board")}
              />
            )}
            {activeTab === "upload-hspk" && <UploadHspk />}
            {activeTab === "work-categories" && <WorkCategoriesPage />}
            {activeTab === "data-survey" && <DataSurvey initialProjectId={globalProjectId} />}
            {(activeTab === "bv" || activeTab === "backup-volume") && (
              <BackUpVolume
                initialProjectId={globalProjectId}
                onProjectChange={setGlobalProjectId}
                onGoToRab={(pid) => {
                  setGlobalProjectId(pid);
                  setActiveTab("rab");
                  window.location.hash = "rab";
                }}
              />
            )}
            {activeTab === "rab" && (
              <RabBudgeting
                key={globalProjectId || "none"}
                initialProjectId={globalProjectId}
                onProjectChange={setGlobalProjectId}
                onBackToBv={(pid) => {
                  if (pid) setGlobalProjectId(pid);
                  setActiveTab("bv");
                  window.location.hash = "bv";
                }}
              />
            )}
            {activeTab === "spk-client" && <SpkPage key={`client-${globalProjectId || "none"}`} initialProjectId={globalProjectId} type="CLIENT" />}
            {activeTab === "spk-subcon" && <SpkPage key={`subcon-${globalProjectId || "none"}`} initialProjectId={globalProjectId} type="SUBCON" />}
            {activeTab === "finance" && <FinancePage key={globalProjectId || "none"} initialProjectId={globalProjectId} />}
            {activeTab === "pembelian-siap-pakai" && <FinancePage key={globalProjectId || "none"} initialProjectId={globalProjectId} />}
            {activeTab === "po-material" && <PurchaseOrderPage />}
            {(activeTab === "po-jasa" || activeTab === "kelola-jasa") && <PurchaseOrderJasaPage />}
            {activeTab === "retur-pembelian" && <ReturPembelianPage />}
            {activeTab === "pengajuan-bayar" && <PengajuanBayarPage key={globalProjectId || "none"} initialProjectId={globalProjectId} />}
            {activeTab === "pembayaran-supplier" && <PembayaranMaterialPage />}
            {activeTab === "pembayaran-jasa" && <PembayaranSupplierPage />}
            {activeTab === "invoice-penagihan" && <InvoicePenagihanPage />}
            {activeTab === "laporan-harian" && <LaporanHarianPage />}
            {activeTab === "global-schedule" && <GlobalSchedulePage />}
            {activeTab === "time-schedule" && <TimeSchedulePage />}
            {activeTab === "join-opname" && <JoinOpnamePage />}
            {activeTab === "bast" && <BastPage />}
            {activeTab === "complain" && <ComplaintPage />}
            {activeTab === "item-tracking" && <ItemTrackingPage onNavigate={setActiveTab} />}
            {activeTab === "habis-pakai" && <RiwayatHabisPakaiPage />}
            {activeTab === "buku-besar" && <BukuBesarPage />}
          </Suspense>
        </main>
      </div>
    </NavContext.Provider>
  );
}

export default App;