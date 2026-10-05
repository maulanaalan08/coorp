import React, { useState, useEffect, useRef } from "react";
import { timeScheduleService } from "../services/timeScheduleService";
import { joinOpnameService } from "../services/joinOpnameService";
import { CalendarDays, X } from "lucide-react";
import styles from "../styles/GlobalSchedulePage.module.css";
import toast from "react-hot-toast";

const GlobalSchedulePage = () => {
  const [allProjects, setAllProjects] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [showCompleted, setShowCompleted] = useState(false);
  const [showUnscheduled, setShowUnscheduled] = useState(false);

  // Timeline data
  const [months, setMonths] = useState([]);
  const [allWeeks, setAllWeeks] = useState([]);

  // Drag to scroll
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Modal Detail State
  const [selectedProject, setSelectedProject] = useState(null);
  const [modalJoSummary, setModalJoSummary] = useState(null);
  const [loadingJoModal, setLoadingJoModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await timeScheduleService.getGlobalSchedule();
      setAllProjects(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal memuat jadwal global");
      toast.error("Gagal memuat jadwal global");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = allProjects.filter((p) => {
      const hasSchedule = p.scheduleStartDate && p.scheduleEndDate;
      if (!hasSchedule) {
        return showUnscheduled;
      }
      
      const endDate = new Date(p.scheduleEndDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Start of today
      
      if (endDate < now) {
        return showCompleted;
      }
      
      return true; // Scheduled and not completed
    });

    setProjects(filtered);
    generateTimeline(filtered);
  }, [allProjects, showCompleted, showUnscheduled]);

  const handleMouseDown = (e) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleBarClick = async (project) => {
    setSelectedProject(project);
    setLoadingJoModal(true);
    setModalJoSummary(null);
    try {
      const json = await joinOpnameService.getJoinOpname(project.id, "");
      const items = json?.items || [];
      let accumulatedWeight = 0;
      items.forEach(item => {
        const progress = Number(item.rekapProgress) || 0;
        if (!item.hasChildren) {
          accumulatedWeight += (Number(item.weight) * progress) / 100;
        }
      });
      setModalJoSummary(accumulatedWeight);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data bobot JO");
    } finally {
      setLoadingJoModal(false);
    }
  };

  const generateTimeline = (projectList) => {
    if (projectList.length === 0) {
      setMonths([]);
      setAllWeeks([]);
      return;
    }

    let minDate = null;
    let maxDate = null;

    projectList.forEach((p) => {
      const start = p.scheduleStartDate ? new Date(p.scheduleStartDate) : null;
      const end = p.scheduleEndDate ? new Date(p.scheduleEndDate) : null;
      if (start && (!minDate || start < minDate)) minDate = start;
      if (end && (!maxDate || end > maxDate)) maxDate = end;
    });

    if (!minDate || !maxDate) {
      minDate = new Date();
      maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 1);
    }

    // Expand minDate to start of month, maxDate to end of month
    const startObj = new Date(minDate);
    startObj.setDate(1);
    startObj.setHours(0, 0, 0, 0);

    const endObj = new Date(maxDate);
    endObj.setMonth(endObj.getMonth() + 1);
    endObj.setDate(0);
    endObj.setHours(23, 59, 59, 999);

    const weeks = [];
    let curr = new Date(startObj);

    // align to Monday
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    curr.setDate(diff);

    let weekIndex = 1;
    while (curr <= endObj) {
      const wStart = new Date(curr);
      const wEnd = new Date(curr);
      wEnd.setDate(wEnd.getDate() + 6);
      wEnd.setHours(23, 59, 59, 999);

      const now = new Date();
      weeks.push({
        id: weekIndex,
        start: wStart,
        end: wEnd,
        month: wStart.getMonth(),
        year: wStart.getFullYear(),
        label: `${wStart.getDate()}/${wStart.getMonth() + 1} - ${wEnd.getDate()}/${wEnd.getMonth() + 1}`,
        isCurrentWeek: now >= wStart && now <= wEnd
      });

      curr.setDate(curr.getDate() + 7);
      weekIndex++;
    }

    // Group by month based on week's start date
    const monthsMap = new Map();
    weeks.forEach((w) => {
      const key = `${w.year}-${w.month}`;
      if (!monthsMap.has(key)) {
        const monthName = new Date(w.year, w.month).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
        monthsMap.set(key, {
          id: key,
          label: monthName,
          weeks: []
        });
      }
      monthsMap.get(key).weeks.push(w);
    });

    setAllWeeks(weeks);
    setMonths(Array.from(monthsMap.values()));
  };

  const getWeekState = (project, week) => {
    if (!project.scheduleStartDate || !project.scheduleEndDate) return null;
    const pStart = new Date(project.scheduleStartDate).getTime();
    const pEnd = new Date(project.scheduleEndDate).getTime();
    const wStart = week.start.getTime();
    const wEnd = week.end.getTime();

    // Check overlap
    if (pStart <= wEnd && pEnd >= wStart) {
      // Determine if it's the start, end, or middle
      const isStart = pStart >= wStart && pStart <= wEnd;
      const isEnd = pEnd >= wStart && pEnd <= wEnd;
      
      // If a project is shorter than a week, it can be both start and end
      return { active: true, isStart, isEnd };
    }
    return null;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <CalendarDays size={28} color="#d4af37" /> Global Schedule
        </h1>
        <p className={styles.subtitle}>Pantau timeline seluruh project secara bersamaan.</p>
      </div>

      <div className={styles.filterContainer}>
        <button
          className={`${styles.filterChip} ${showCompleted ? styles.activeChip : ''}`}
          onClick={() => setShowCompleted(!showCompleted)}
        >
          {showCompleted ? 'Menampilkan' : 'Sembunyikan'} Project Selesai (Lewat Tanggal)
        </button>
        <button
          className={`${styles.filterChip} ${showUnscheduled ? styles.activeChip : ''}`}
          onClick={() => setShowUnscheduled(!showUnscheduled)}
        >
          {showUnscheduled ? 'Menampilkan' : 'Sembunyikan'} Project Belum Terjadwal
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Memuat data global schedule...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : projects.length === 0 ? (
        <div className={styles.loading}>Belum ada project.</div>
      ) : (
        <div 
          className={styles.ganttContainer}
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <table className={styles.ganttTable}>
            <thead>
              {/* Row 1: Month Headers */}
              <tr>
                <th rowSpan={2} className={styles.projectColHeader}>
                  Project Info
                </th>
                {months.map((m) => (
                  <th key={m.id} colSpan={m.weeks.length} className={styles.monthHeader}>
                    {m.label}
                  </th>
                ))}
              </tr>
              {/* Row 2: Week Headers */}
              <tr>
                {allWeeks.map((w) => (
                  <th key={w.id} className={`${styles.weekHeader} ${w.isCurrentWeek ? styles.currentWeekHeader : ''}`}>
                    Mg {w.id}<br/>
                    <span style={{ fontSize: '10px', color: w.isCurrentWeek ? '#222' : '#666' }}>{w.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const hasSchedule = p.scheduleStartDate && p.scheduleEndDate;
                
                return (
                  <tr key={p.id}>
                    <td className={styles.projectCell}>
                      <div className={styles.projectName}>{p.name}</div>
                      <div className={styles.clientName}>{p.clientName}</div>
                      {!hasSchedule && (
                        <div className={styles.noScheduleText}>Belum ada jadwal pekerjaan</div>
                      )}
                    </td>
                    
                    {allWeeks.map((w) => {
                      const state = getWeekState(p, w);
                      const isActive = state?.active;
                      
                      return (
                        <td key={w.id} className={`${styles.weekCell} ${isActive ? styles.active : ''} ${w.isCurrentWeek ? styles.currentWeekCell : ''}`}>
                          {isActive && (
                            <div className={styles.barWrapper}>
                              <div 
                                className={styles.ganttBar}
                                onClick={() => handleBarClick(p)}
                                style={{
                                  borderTopLeftRadius: state.isStart ? '12px' : '0',
                                  borderBottomLeftRadius: state.isStart ? '12px' : '0',
                                  borderTopRightRadius: state.isEnd ? '12px' : '0',
                                  borderBottomRightRadius: state.isEnd ? '12px' : '0',
                                  width: '100%',
                                }}
                                title={`${p.name}\n${new Date(p.scheduleStartDate).toLocaleDateString('id-ID')} - ${new Date(p.scheduleEndDate).toLocaleDateString('id-ID')}`}
                              />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedProject && (
        <div className={styles.modalOverlay} onClick={() => setSelectedProject(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{selectedProject.name}</h2>
              <button className={styles.closeButton} onClick={() => setSelectedProject(null)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailRow}>
                <span>Klien</span>
                <strong>{selectedProject.clientName || "-"}</strong>
              </div>
              <div className={styles.detailRow}>
                <span>Jadwal Pekerjaan</span>
                <strong>
                  {new Date(selectedProject.scheduleStartDate).toLocaleDateString('id-ID')} - {new Date(selectedProject.scheduleEndDate).toLocaleDateString('id-ID')}
                </strong>
              </div>
              <div className={styles.detailRow} style={{ marginTop: '16px', borderTop: '1px solid #333', paddingTop: '16px' }}>
                <span>Akumulasi Bobot (JO)</span>
                <strong>
                  {loadingJoModal ? (
                    <span style={{ color: '#888' }}>Memuat...</span>
                  ) : (
                    <span style={{ color: '#d4af37', fontSize: '18px' }}>
                      {modalJoSummary !== null ? `${modalJoSummary.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '-'}
                    </span>
                  )}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSchedulePage;
