// src/App.jsx
import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import ProjectBoard from "./pages/ProjectBoard";
import UploadHspk from "./pages/UploadHspk";
import BackUpVolume from "./pages/BackUpVolume";

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
        
        {/* Menerima tab 'bv' (sesuai Sidebar.jsx) maupun 'backup-volume' */}
        {(activeTab === "bv" || activeTab === "backup-volume") && <BackUpVolume />}
      </main>
    </div>
  );
}

export default App;