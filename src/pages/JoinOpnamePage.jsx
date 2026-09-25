import React from "react";
import { useJoinOpname } from "../hooks/useJoinOpname";
import { formatPercent, formatDate, formatNumber, toInputDate } from "../services/utils";
import { joinOpnameService } from "../services/joinOpnameService";
import JoinOpnameTable from "../components/JoinOpnameTable";
import ProjectSelector from "../components/ProjectSelector";
import { Image } from "lucide-react";
import "../styles/JoinOpname.css";
import "../styles/TimeSchedulePage.css";
import toast from "react-hot-toast";

function JoinOpnamePage({ initialProjectId = null }) {
  const dailyTableWrapperRef = React.useRef(null);

  const {
    projectId, projectList, loadingProjects, projectError,
    data, loading, error, notice,
    selectedDate, progressInputs, busyItems,
    handleProjectChange, handleDateChange, handleProgressChange, handleFileChange, handleSaveProgress,
    items, days, totalDays, startDate, groupedItems, selectedDay, summary,
    discipline, setDiscipline
  } = useJoinOpname(initialProjectId);

  React.useEffect(() => {
    if (loadingProjects || loading) {
      toast.loading('Memuat data Join Opname...', { id: 'loading-jo' });
    } else {
      toast.dismiss('loading-jo');
      if (error || projectError) {
        toast.error(error || projectError);
      }
    }
  }, [loadingProjects, loading, error, projectError]);

  React.useEffect(() => {
    // Auto-scroll to current day column
    if (dailyTableWrapperRef.current) {
      // Find the first cell of the current day
      const currentDayEl = dailyTableWrapperRef.current.querySelector('.jo-current-day-cell');
      if (currentDayEl) {
        const wrapper = dailyTableWrapperRef.current;
        // Calculate the scroll position to center the cell
        const scrollLeft = currentDayEl.offsetLeft - (wrapper.clientWidth / 2) + (currentDayEl.clientWidth / 2);
        wrapper.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [selectedDate, days]);

  return (
    <div className="join-opname-page">
      <div className="join-opname-header">
        <div>
          <h1>RAP Join Opname</h1>
          <p>Input progress aktual pekerjaan lapangan beserta foto dokumentasi.</p>
        </div>
        <div className="join-opname-header-badge">
          {loading ? "Memuat..." : `${totalDays} Hari`}
        </div>
      </div>

      <div className="jo-card jo-project-card">
        <ProjectSelector 
          projectId={projectId}
          projectList={projectList}
          loading={loadingProjects}
          onChange={handleProjectChange}
        />
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
            <div className="jo-card jo-summary-card" style={{ borderTop: '3px solid #e5e7eb' }}><span>Total Item</span><strong style={{ color: '#e5e7eb' }}>{summary.totalItems}</strong></div>
            <div className="jo-card jo-summary-card" style={{ borderTop: '3px solid #ef4444' }}><span>Belum Mulai</span><strong style={{ color: '#ef4444' }}>{summary.notStarted}</strong></div>
            <div className="jo-card jo-summary-card" style={{ borderTop: '3px solid #eab308' }}><span>On Progress</span><strong style={{ color: '#eab308' }}>{summary.onProgress}</strong></div>
            <div className="jo-card jo-summary-card" style={{ borderTop: '3px solid #d946ef' }}><span>Quality Check</span><strong style={{ color: '#d946ef' }}>{summary.qualityCheck}</strong></div>
            <div className="jo-card jo-summary-card" style={{ borderTop: '3px solid #22c55e' }}><span>Selesai</span><strong style={{ color: '#22c55e' }}>{summary.completed}</strong></div>
            <div className="jo-card jo-summary-card" style={{ borderTop: '3px solid #d4af37' }}><span>Akumulasi Bobot</span><strong style={{ color: '#d4af37' }}>{formatPercent(summary.accumulatedWeight)}%</strong></div>
          </div>
          
          <div className="jo-card" style={{ 
            marginTop: '16px', 
            borderLeft: summary.unfilledDays > 0 ? '4px solid #ef4444' : '4px solid #22c55e', 
            backgroundColor: summary.unfilledDays > 0 ? '#1a1010' : '#0a1a10',
            padding: '12px 16px'
          }}>
            <div style={{ color: summary.unfilledDays > 0 ? '#ef4444' : '#22c55e', fontWeight: 'bold', fontSize: '13px' }}>
              {summary.unfilledDays > 0 
                ? `⚠️ Perhatian: Terdapat ${summary.unfilledDays} hari kerja di mana progress harian tidak diisi secara lengkap.` 
                : '✔️ Semua hari kerja telah diisi dengan lengkap sejauh ini.'}
            </div>
          </div>

          {loading && <div className="jo-card jo-loading"><div className="jo-spinner" /><span>Memuat data Join Opname...</span></div>}
          {error && !loading && (
            <div className="jo-card jo-error-card">
              <strong>Gagal memuat data</strong><p>{error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <>
              <div className="jo-card jo-control-card" style={{ marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '14px', marginBottom: '8px', color: '#9ca3af' }}>Filter Disiplin Pekerjaan</h2>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {["General", "INTERIOR", "SIPIL"].map((d) => (
                      <button
                        key={d}
                        className={`tsp-btn ${discipline === d ? 'tsp-btn-primary' : ''}`}
                        style={{ minWidth: '100px', cursor: 'pointer' }}
                        onClick={() => setDiscipline(d)}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="jo-card jo-table-card">
                <div className="jo-table-header">
                  <div>
                    <h2>Rekap Progress</h2>
                    <p>Input progress dan upload foto pada tanggal yang dipilih, lalu simpan.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div className="jo-selected-date">{formatDate(selectedDate)}</div>
                    <button className="jo-btn jo-btn-primary" onClick={() => joinOpnameService.exportExcel(projectId, discipline, selectedDate)}>
                      ⬇ Excel
                    </button>
                    <select 
                      className="jo-btn jo-btn-primary"
                      style={{ appearance: 'none', cursor: 'pointer' }}
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          joinOpnameService.exportPdf(projectId, discipline, selectedDate, e.target.value);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="" disabled>⬇ PDF</option>
                      <option value="daily">Harian</option>
                      <option value="weekly">Mingguan</option>
                      <option value="monthly">Bulanan</option>
                      <option value="overall">Keseluruhan</option>
                    </select>
                  </div>
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
            </>
          )}

          {!loading && !error && data && items.length > 0 && (
            <div className="jo-card jo-breakdown-card">
              <div className="jo-table-header">
                <div><h2>Breakdown Progress Harian</h2><p>Progress, bobot, dan volume terlaksana setiap hari.</p></div>
              </div>
              <div className="jo-table-wrapper" ref={dailyTableWrapperRef}>
                <table className="jo-table jo-daily-table">
                  <thead>
                    <tr>
                      <th className="jo-daily-sticky-name">Pekerjaan</th>
                      <th className="jo-daily-sticky-weight">Bobot</th>
                      {days.map((day) => {
                        const isRealTimeToday = new Date(day.date).setHours(0,0,0,0) === new Date().setHours(0,0,0,0);
                        return (
                          <th 
                            key={day.dayNumber}
                            style={isRealTimeToday ? { background: '#eab308', color: '#000' } : {}}
                          >
                            <div style={isRealTimeToday ? { fontWeight: 'bold', color: '#000' } : {}}>Hari {day.dayNumber}</div>
                            <small style={isRealTimeToday ? { color: '#111', fontWeight: 'bold' } : {}}>{formatDate(day.date)}</small>
                          </th>
                        );
                      })}
                      <th className="jo-daily-sticky-right">Rekap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.rabItemId}>
                        <td className="jo-name-cell jo-daily-sticky-name">{item.name}</td>
                        <td className="jo-daily-sticky-weight">{formatPercent(item.weight)}%</td>
                        {days.map((day) => {
                          const breakdown = item.dailyBreakdown?.find((r) => r.dayNumber === day.dayNumber);
                          const isOob = breakdown && !breakdown.inSchedule && !breakdown.hasProgress;
                          const isMissed = breakdown?.inSchedule && (!breakdown.progress || breakdown.progress <= 0) && (new Date(day.date).setHours(0,0,0,0) <= new Date().setHours(0,0,0,0));
                          
                          return (
                            <td key={day.dayNumber} className={selectedDate === toInputDate(day.date) ? "jo-current-day-cell" : ""}>
                              {item.hasChildren ? (
                                <div className="jo-day-progress jo-muted" style={{opacity: 0.3}}>-</div>
                              ) : isOob ? (
                                <div className="jo-day-progress jo-muted" style={{opacity: 0.3}}>-</div>
                              ) : (
                                <div className="jo-day-progress">
                                  <strong style={{ color: isMissed ? '#ef4444' : 'inherit' }}>
                                    {formatPercent(breakdown?.progress || 0)}%
                                  </strong>
                                  <small>Vol: {formatNumber(breakdown?.volume || 0)}</small>
                                
                                {/* Fungsi untuk melihat foto aktual lapangan jika URL tersedia */}
                                {breakdown?.photoUrls && breakdown.photoUrls.length > 0 && (
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      handleDateChange({ target: { value: toInputDate(day.date) } });
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="jo-btn jo-btn-secondary"
                                    style={{ 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '4px', 
                                      padding: '2px 6px', 
                                      fontSize: '10px', 
                                      marginTop: '4px',
                                      border: 'none',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Image size={12} />
                                    Lihat Foto
                                  </button>
                                )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="jo-daily-sticky-right"><strong>{formatPercent(item.rekapProgress)}%</strong></td>
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