import React from "react";
import { useJoinOpname } from "../hooks/useJoinOpname";
import { formatPercent, formatDate, formatNumber, toInputDate } from "../services/utils";
import JoinOpnameTable from "../components/JoinOpnameTable";
import "../styles/JoinOpname.css"; // Menggunakan CSS bawaan tanpa modifikasi

function JoinOpnamePage({ initialProjectId = null }) {
  const {
    projectId, projectList, loadingProjects, projectError,
    data, loading, error, notice,
    selectedDate, progressInputs, busyItems,
    handleProjectChange, handleDateChange, handleProgressChange, handleFileChange, handleSaveProgress,
    items, days, totalDays, startDate, groupedItems, selectedDay, summary
  } = useJoinOpname(initialProjectId);

  return (
    <div className="join-opname-page">
      <div className="join-opname-header">
        <div>
          <h1>Join Opname</h1>
          <p>Input progress aktual pekerjaan lapangan beserta foto dokumentasi.</p>
        </div>
        <div className="join-opname-header-badge">
          {loading ? "Memuat..." : `${totalDays} Hari`}
        </div>
      </div>

      {notice && <div className={`jo-notice jo-notice-${notice.type}`}>{notice.message}</div>}

      <div className="jo-card jo-project-card">
        <div className="jo-section-title">Pilih Project</div>
        <div className="rab-project-picker">
          <select className="rab-project-select" value={projectId || ""} onChange={handleProjectChange} disabled={loadingProjects}>
            <option value="">{loadingProjects ? "Memuat project..." : "-- pilih project --"}</option>
            {projectList.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <span className="rab-project-select-icon">▼</span>
        </div>
        {projectError && <div className="jo-error-text">{projectError}</div>}
      </div>

      {!projectId ? (
        <div className="jo-card jo-empty">
          <h2>Pilih Project Terlebih Dahulu</h2>
          <p>Pilih project untuk melihat data Join Opname.</p>
        </div>
      ) : (
        <>
          <div className="jo-card jo-project-info">
            <div><span>Tanggal Mulai Proyek</span><strong>{formatDate(startDate)}</strong></div>
            <div>
              <span>Tanggal Opname</span>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={handleDateChange} 
                disabled={loading}
                style={{ background: 'transparent', color: '#fff', border: '1px solid #333', padding: '4px 8px', borderRadius: '4px' }} 
              />
            </div>
            <div><span>Hari ke-</span><strong>{selectedDay?.dayNumber || "-"}</strong></div>
            <div><span>Total Hari</span><strong>{totalDays}</strong></div>
          </div>

          <div className="jo-summary-grid">
            <div className="jo-card jo-summary-card"><span>Total Item</span><strong>{summary.totalItems}</strong></div>
            <div className="jo-card jo-summary-card"><span>Belum Mulai</span><strong>{summary.notStarted}</strong></div>
            <div className="jo-card jo-summary-card"><span>On Progress</span><strong>{summary.onProgress}</strong></div>
            <div className="jo-card jo-summary-card"><span>Selesai</span><strong>{summary.completed}</strong></div>
            <div className="jo-card jo-summary-card"><span>Rata-rata Progress</span><strong>{formatPercent(summary.averageProgress)}%</strong></div>
          </div>

          {loading && <div className="jo-card jo-loading"><div className="jo-spinner" /><span>Memuat data Join Opname...</span></div>}
          {error && !loading && (
            <div className="jo-card jo-error-card">
              <strong>Gagal memuat data</strong><p>{error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <div className="jo-card jo-table-card">
              <div className="jo-table-header">
                <div>
                  <h2>Rekap Progress</h2>
                  <p>Input progress dan upload foto pada tanggal yang dipilih, lalu simpan.</p>
                </div>
                <div className="jo-selected-date">{formatDate(selectedDate)}</div>
              </div>
              <JoinOpnameTable 
                groupedItems={groupedItems} 
                progressInputs={progressInputs} 
                busyItems={busyItems} 
                selectedDate={selectedDate}
                handleProgressChange={handleProgressChange}
                handleFileChange={handleFileChange}
                handleSaveProgress={handleSaveProgress}
              />
            </div>
          )}

          {!loading && !error && data && items.length > 0 && (
            <div className="jo-card jo-breakdown-card">
              <div className="jo-table-header">
                <div><h2>Breakdown Progress Harian</h2><p>Progress, bobot, dan volume terlaksana setiap hari.</p></div>
              </div>
              <div className="jo-table-wrapper">
                <table className="jo-table jo-daily-table">
                  <thead>
                    <tr>
                      <th>Pekerjaan</th>
                      <th>Bobot</th>
                      {days.map((day) => (
                        <th key={day.dayNumber}>
                          <div>Hari {day.dayNumber}</div>
                          <small>{formatDate(day.date)}</small>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.rabItemId}>
                        <td className="jo-name-cell">{item.name}</td>
                        <td>{formatPercent(item.weight)}%</td>
                        {days.map((day) => {
                          const breakdown = item.dailyBreakdown?.find((r) => r.dayNumber === day.dayNumber);
                          return (
                            <td key={day.dayNumber} className={selectedDate === toInputDate(day.date) ? "jo-current-day-cell" : ""}>
                              <div className="jo-day-progress">
                                <strong>{formatPercent(breakdown?.progress || 0)}%</strong>
                                <small>Vol: {formatNumber(breakdown?.volume || 0)}</small>
                                {breakdown?.photoUrl && <span style={{fontSize: '8px', color: '#b9a35a'}}>📷 Ada Foto</span>}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default JoinOpnamePage;