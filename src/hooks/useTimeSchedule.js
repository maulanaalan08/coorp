import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { timeScheduleService } from "../services/timeScheduleService";
import { workCategoryService } from "../services/workCategoryService";

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

  const [discipline, setDiscipline] = useState("General");
  const [filterLabel, setFilterLabel] = useState("General");
  const [activeSubCategoryId, setActiveSubCategoryId] = useState("");
  const [filterSubcategories, setFilterSubcategories] = useState([]);
  const [loadingFilterSubcategories, setLoadingFilterSubcategories] = useState(false);
  const [subCategoryCounts, setSubCategoryCounts] = useState({});
  const subcategoryRequestRef = useRef(0);

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

  // Muat subkategori saat kategori aktif berubah (hierarki: Kategori -> Subkategori)
  useEffect(() => {
    setActiveSubCategoryId("");
    setFilterSubcategories([]);
    setSubCategoryCounts({});

    if (!projectId || !discipline || discipline === "General") {
      subcategoryRequestRef.current += 1;
      setLoadingFilterSubcategories(false);
      return;
    }

    const reqId = subcategoryRequestRef.current + 1;
    subcategoryRequestRef.current = reqId;
    setLoadingFilterSubcategories(true);

    workCategoryService.getSubcategories(discipline)
      .then((rows) => {
        if (subcategoryRequestRef.current !== reqId) return;
        const list = Array.isArray(rows) ? rows : rows?.data || [];
        setFilterSubcategories(list.filter((r) => r.isActive !== false));
      })
      .catch((err) => {
        if (subcategoryRequestRef.current !== reqId) return;
        console.error("Gagal mengambil subkategori:", err);
        setFilterSubcategories([]);
      })
      .finally(() => {
        if (subcategoryRequestRef.current === reqId) setLoadingFilterSubcategories(false);
      });

    return () => {
      if (subcategoryRequestRef.current === reqId) subcategoryRequestRef.current += 1;
    };
  }, [projectId, discipline]);

  const fetchSchedule = useCallback(async (id = projectId, disc = discipline, subCatId = activeSubCategoryId) => {
    if (!id) return setData(null);
    setLoading(true);
    setError(null);
    try {
      const json = await timeScheduleService.getSchedule(id, disc, subCatId);
      setData(json);
      setStartDateInput(json?.startDate ? String(json.startDate).slice(0, 10) : "");
      setEditDrafts({});

      // Jika memuat seluruh kategori (subCatId kosong), update counter item per subkategori
      if (!subCatId) {
        const counts = {};
        (json?.items || []).forEach((it) => {
          if (it.workSubCategoryId) {
            counts[it.workSubCategoryId] = (counts[it.workSubCategoryId] || 0) + 1;
          }
        });
        setSubCategoryCounts(counts);
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat memuat Time Schedule.");
    } finally {
      setLoading(false);
    }
  }, [projectId, discipline, activeSubCategoryId]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => {
    if (projectId) fetchSchedule(projectId, discipline, activeSubCategoryId);
    else setData(null);
  }, [projectId, discipline, activeSubCategoryId, fetchSchedule]);

  const periods = data?.periods || [];
  const items = data?.items || [];
  const cumulativeTotal = data?.cumulativeTotal || {};

  const scheduledCount = useMemo(() => items.filter((it) => it.startDate != null && it.endDate != null).length, [items]);
  const lastProgress = useMemo(() => {
    if (periods.length === 0) return 0;
    const lastPeriodIndex = periods[periods.length - 1].index;
    const raw = Number(cumulativeTotal[String(lastPeriodIndex)] ?? cumulativeTotal[lastPeriodIndex] ?? 0);
    return Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 0;
  }, [cumulativeTotal, periods]);

  const groupedItems = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      const key = item.groupName || "Tanpa Group";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return Array.from(map.entries());
  }, [items]);

  const chart = useMemo(() => {
    const width = 720, height = 260;
    const padding = { top: 16, right: 20, bottom: 34, left: 46 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    if (periods.length === 0) return { width, height, padding, points: [], areaPath: "", linePath: "", innerW, innerH };

    const xFor = (index, maxIdx) => padding.left + (maxIdx === 1 ? innerW / 2 : ((index - 1) / (maxIdx - 1)) * innerW);
    const yFor = (pct) => padding.top + innerH - (Math.min(100, Math.max(0, pct)) / 100) * innerH;

    const maxIdx = periods.length;
    const points = periods.map((p, i) => {
      const raw = Number(cumulativeTotal[String(p.index)] ?? cumulativeTotal[p.index] ?? 0);
      const pct = Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 0;
      return { index: p.index, label: p.label, pct, x: xFor(i + 1, maxIdx), y: yFor(pct), start: p.start, end: p.end };
    });

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const areaPath = points.length > 0 ? `${linePath} L${points[points.length - 1].x},${yFor(0)} L${points[0].x},${yFor(0)} Z` : "";

    return { width, height, padding, points, areaPath, linePath, innerW, innerH, xFor, yFor };
  }, [periods, cumulativeTotal]);

  return {
    projectId, setProjectId, projectList, loadingProjects, projectError, fetchProjects, fetchSchedule,
    data, loading, error, notice, showNotice,
    discipline, setDiscipline, filterLabel, setFilterLabel,
    activeSubCategoryId, setActiveSubCategoryId,
    filterSubcategories, loadingFilterSubcategories, subCategoryCounts,
    startDateInput, setStartDateInput, savingStartDate, setSavingStartDate,
    editDrafts, setEditDrafts, busyItems, setBusyItems, hoverPoint, setHoverPoint,
    periods, items, scheduledCount, lastProgress, groupedItems, chart
  };
}