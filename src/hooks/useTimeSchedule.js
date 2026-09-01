import { useState, useEffect, useCallback, useMemo } from "react";
import { timeScheduleService } from "../services/timeScheduleService";

// Gunakan named export secara eksplisit di sini
export function useTimeSchedule(initialProjectId) {
  const [projectId, setProjectId] = useState(initialProjectId || null);
  const [projectList, setProjectList] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectError, setProjectError] = useState(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [startDateInput, setStartDateInput] = useState("");
  const [savingStartDate, setSavingStartDate] = useState(false);
  
  const [editDrafts, setEditDrafts] = useState({});
  const [busyItems, setBusyItems] = useState({});
  const [hoverPoint, setHoverPoint] = useState(null);

  const showNotice = useCallback((type, message) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  }, []);

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const json = await timeScheduleService.getProjects();
      const projects = Array.isArray(json) ? json : json?.data || json?.projects || [];
      setProjectList(projects);
      // Auto-selection dihilangkan atas permintaan user
      // if (!projectId && projects.length > 0) setProjectId(projects[0].id);
    } catch (err) {
      setProjectError(err.message || "Gagal mengambil daftar project.");
    } finally {
      setLoadingProjects(false);
    }
  }, [projectId]);

  const fetchSchedule = useCallback(async (id) => {
    if (!id) return setData(null);
    setLoading(true);
    setError(null);
    try {
      const json = await timeScheduleService.getSchedule(id);
      setData(json);
      setStartDateInput(json?.startDate ? String(json.startDate).slice(0, 10) : "");
      setEditDrafts({});
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat memuat Time Schedule.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { if (projectId) fetchSchedule(projectId); else setData(null); }, [projectId, fetchSchedule]);

  const maxWeek = data?.maxWeek || 0;
  const weekDates = data?.weekDates || [];
  const items = data?.items || [];
  const cumulativeTotal = data?.cumulativeTotal || {};

  const scheduledCount = useMemo(() => items.filter((it) => it.startWeek != null && it.endWeek != null).length, [items]);
  const lastProgress = useMemo(() => {
    if (!maxWeek) return 0;
    const raw = Number(cumulativeTotal[String(maxWeek)] ?? cumulativeTotal[maxWeek] ?? 0);
    return Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 0;
  }, [cumulativeTotal, maxWeek]);

  const groupedItems = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      const key = item.groupName || "Tanpa Group";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return Array.from(map.entries());
  }, [items]);

  const weekRange = useMemo(() => Array.from({ length: maxWeek }, (_, i) => i + 1), [maxWeek]);

  const chart = useMemo(() => {
    const width = 720, height = 260;
    const padding = { top: 16, right: 20, bottom: 34, left: 46 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    if (!maxWeek || maxWeek < 1) return { width, height, padding, points: [], areaPath: "", linePath: "", innerW, innerH };

    const xFor = (week) => padding.left + (maxWeek === 1 ? innerW / 2 : ((week - 1) / (maxWeek - 1)) * innerW);
    const yFor = (pct) => padding.top + innerH - (Math.min(100, Math.max(0, pct)) / 100) * innerH;

    const points = weekRange.map((week) => {
      const raw = Number(cumulativeTotal[String(week)] ?? cumulativeTotal[week] ?? 0);
      const pct = Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 0;
      const weekInfo = weekDates.find((w) => w.week === week);
      return { week, pct, x: xFor(week), y: yFor(pct), start: weekInfo?.start, end: weekInfo?.end };
    });

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const areaPath = points.length > 0 ? `${linePath} L${points[points.length - 1].x},${yFor(0)} L${points[0].x},${yFor(0)} Z` : "";

    return { width, height, padding, points, areaPath, linePath, innerW, innerH, xFor, yFor };
  }, [maxWeek, weekRange, cumulativeTotal, weekDates]);

  return {
    projectId, setProjectId, projectList, loadingProjects, projectError, fetchProjects, fetchSchedule,
    data, loading, error, notice, showNotice,
    startDateInput, setStartDateInput, savingStartDate, setSavingStartDate,
    editDrafts, setEditDrafts, busyItems, setBusyItems, hoverPoint, setHoverPoint,
    maxWeek, weekDates, items, scheduledCount, lastProgress, groupedItems, weekRange, chart
  };
}