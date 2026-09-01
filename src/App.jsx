// src/App.jsx
import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import ProjectBoard from "./pages/ProjectBoard";
import UploadHspk from "./pages/UploadHspk";
import BackUpVolume from "./pages/BackUpVolume";
import DataSurvey from "./pages/DataSurvey";
import RabBudgeting from "./pages/RabBudgeting";
import TimeSchedulePage from "./pages/TimeSchedulePage";
import JoinOpnamePage from "./pages/JoinOpnamePage";
import ComplaintPage from "./pages/ComplaintPage";
import FinancePage from "./pages/FinancePage";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div style={{ display: "flex", width: "100vw", minHeight: "100vh", backgroundColor: "#0c0b09" }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

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
        {activeTab === "time-schedule" && <TimeSchedulePage />}
        {activeTab === "join-opname" && <JoinOpnamePage />}
        {activeTab === "complain" && <ComplaintPage />}
      </main>
    </div>
  );
}

export default App;