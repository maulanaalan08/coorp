import { useState, useEffect, useCallback, useMemo } from "react";
import { timeScheduleService } from "../services/timeScheduleService";
import { joinOpnameService } from "../services/joinOpnameService";
import toast from "react-hot-toast";
import { toInputDate } from "../services/utils";

export function useJoinOpname(initialProjectId) {
  const [projectId, setProjectId] = useState(initialProjectId || "");
  const [projectList, setProjectList] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectError, setProjectError] = useState(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [selectedDate, setSelectedDate] = useState("");
  const [progressInputs, setProgressInputs] = useState({});
  const [busyItems, setBusyItems] = useState({});
  const [notice, setNotice] = useState(null);

  const showNotice = useCallback((type, message) => {
    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  }, []);

  const buildProgressInputs = useCallback((items, date) => {
    const result = {};
    if (!date) return result;
    items.forEach((item) => {
      const breakdown = (item.dailyBreakdown || []).find((day) => toInputDate(day.date) === date);
      result[item.rabItemId] = {
        percent: breakdown ? String(breakdown.progress ?? 0) : "0",
        files: null,
        existingPhotoUrls: breakdown?.photoUrls || []
      };
    });
    return result;
  }, []);

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const json = await joinOpnameService.getProjects();
      const projects = Array.isArray(json) ? json : (json?.data || json?.projects || []);
      setProjectList(projects);
      // Auto-selection dihilangkan atas permintaan user
      // if (!projectId && projects.length > 0) setProjectId(projects[0].id);
    } catch (err) {
      setProjectError(err.message);
    } finally {
      setLoadingProjects(false);
    }
  }, [projectId]);

  const fetchJoinOpname = useCallback(async (id) => {
    if (!id) { setData(null); return; }
    setLoading(true); setError(null);
    try {
      const json = await joinOpnameService.getJoinOpname(id);
      setData(json);
      if (!selectedDate && json?.days?.length) {
        const initDate = toInputDate(json.days[0].date);
        setSelectedDate(initDate);
        setProgressInputs(buildProgressInputs(json.items || [], initDate));
      } else {
        setProgressInputs(buildProgressInputs(json.items || [], selectedDate));
      }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, [selectedDate, buildProgressInputs]);

  useEffect(() => { if (initialProjectId) setProjectId(initialProjectId); }, [initialProjectId]);
  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { if (projectId) fetchJoinOpname(projectId); else setData(null); }, [projectId, fetchJoinOpname]);

  const handleProjectChange = (e) => {
    setProjectId(e.target.value);
    setData(null); setError(null); setProgressInputs({}); setSelectedDate("");
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    setProgressInputs(buildProgressInputs(data?.items || [], date));
  };

  const handleProgressChange = (rabItemId, value) => {
    let numericValue = value.replace(/[^0-9.]/g, "");
    if (numericValue !== "" && Number(numericValue) > 100) numericValue = "100";
    setProgressInputs((prev) => ({
      ...prev,
      [rabItemId]: { ...prev[rabItemId], percent: numericValue }
    }));
  };

  const handleFileChange = (rabItemId, files) => {
    setProgressInputs((prev) => ({
      ...prev,
      [rabItemId]: { ...prev[rabItemId], files: files }
    }));
  };

  const handleSaveProgress = async (item) => {
    if (!projectId) return;
    if (!selectedDate) return showNotice("error", "Pilih tanggal progress terlebih dahulu.");

    const inputData = progressInputs[item.rabItemId];
    const progress = Number(inputData?.percent || 0);

    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      return showNotice("error", "Progress harus berada di antara 0 sampai 100.");
    }

    setBusyItems((prev) => ({ ...prev, [item.rabItemId]: true }));
    
    toast.promise(joinOpnameService.updateProgress(item.rabItemId, selectedDate, progress, inputData.files), {
      loading: 'Menyimpan progress...',
      success: `Progress "${item.name}" berhasil disimpan.`,
      error: 'Gagal menyimpan progress.'
    }).then(() => {
      fetchJoinOpname(projectId);
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setBusyItems((prev) => ({ ...prev, [item.rabItemId]: false }));
    });
  };

  const items = data?.items || [];
  const days = data?.days || [];
  const totalDays = data?.totalDays || 0;
  const startDate = data?.startDate || null;

  const groupedItems = useMemo(() => {
    const groups = new Map();
    items.forEach((item) => {
      const groupName = item.groupName || "Tanpa Group";
      if (!groups.has(groupName)) groups.set(groupName, []);
      groups.get(groupName).push(item);
    });
    return Array.from(groups.entries());
  }, [items]);

  const selectedDay = useMemo(() => days.find((day) => toInputDate(day.date) === selectedDate), [days, selectedDate]);

  const summary = useMemo(() => {
    if (!items.length) return { totalItems: 0, completed: 0, onProgress: 0, notStarted: 0, averageProgress: 0 };
    let completed = 0, onProgress = 0, notStarted = 0, total = 0;
    items.forEach((item) => {
      const progress = Number(item.rekapProgress) || 0;
      total += progress;
      if (progress === 0) notStarted += 1;
      else if (progress >= 100) completed += 1;
      else onProgress += 1;
    });
    return { totalItems: items.length, completed, onProgress, notStarted, averageProgress: total / items.length };
  }, [items]);

  return {
    projectId, projectList, loadingProjects, projectError,
    data, loading, error, notice,
    selectedDate, progressInputs, busyItems,
    handleProjectChange, handleDateChange, handleProgressChange, handleFileChange, handleSaveProgress,
    items, days, totalDays, startDate, groupedItems, selectedDay, summary
  };
}