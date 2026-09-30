import React, { useState, useEffect } from "react";
import { timeScheduleService } from "../services/timeScheduleService";
import { CalendarDays } from "lucide-react";
import styles from "../styles/GlobalSchedulePage.module.css";
import toast from "react-hot-toast";

const GlobalSchedulePage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Timeline data
  const [months, setMonths] = useState([]);
  const [allWeeks, setAllWeeks] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await timeScheduleService.getGlobalSchedule();
      setProjects(data || []);
      generateTimeline(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal memuat jadwal global");
      toast.error("Gagal memuat jadwal global");
    } finally {
      setLoading(false);
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

      weeks.push({
        id: weekIndex,
        start: wStart,
        end: wEnd,
        month: wStart.getMonth(),
        year: wStart.getFullYear(),
        label: `${wStart.getDate()}/${wStart.getMonth() + 1} - ${wEnd.getDate()}/${wEnd.getMonth() + 1}`
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

      {loading ? (
        <div className={styles.loading}>Memuat data global schedule...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : projects.length === 0 ? (
        <div className={styles.loading}>Belum ada project.</div>
      ) : (
        <div className={styles.ganttContainer}>
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
                  <th key={w.id} className={styles.weekHeader}>
                    Mg {w.id}<br/>
                    <span style={{ fontSize: '10px', color: '#666' }}>{w.label}</span>
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
                        <td key={w.id} className={`${styles.weekCell} ${isActive ? styles.active : ''}`}>
                          {isActive && (
                            <div className={styles.barWrapper}>
                              <div 
                                className={styles.ganttBar}
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
    </div>
  );
};

export default GlobalSchedulePage;
