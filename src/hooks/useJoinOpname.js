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
  const [discipline, setDiscipline] = useState("General");
  const [filterLabel, setFilterLabel] = useState("General");

  const [unsavedChanges, setUnsavedChanges] = useState(new Set());
  const [savingBatch, setSavingBatch] = useState(false);

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
    const targetTime = new Date(date).getTime();
    
    items.forEach((item) => {
      const breakdown = (item.dailyBreakdown || []).find((day) => toInputDate(day.date) === date);
      
      let defaultPercent = "0";
      if (breakdown && breakdown.hasProgress) {
        defaultPercent = String(breakdown.progress ?? 0);
      }

      result[item.rabItemId] = {
        percent: defaultPercent,
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

  const fetchJoinOpname = useCallback(async (id, disc = discipline) => {
    if (!id) { setData(null); return; }
    setLoading(true); setError(null);
    try {
      const json = await joinOpnameService.getJoinOpname(id, disc === "General" ? "" : disc);
      setData(json);
      if (!selectedDate && json?.days?.length) {
        const todayStr = toInputDate(new Date());
        const maxDateStr = toInputDate(json.days[json.days.length - 1].date);
        const initDate = todayStr > maxDateStr ? maxDateStr : todayStr;
        setSelectedDate(initDate);
        setProgressInputs(buildProgressInputs(json.items || [], initDate));
      } else {
        setProgressInputs(buildProgressInputs(json.items || [], selectedDate));
      }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, [selectedDate, buildProgressInputs, discipline]);

  useEffect(() => { if (initialProjectId) setProjectId(initialProjectId); }, [initialProjectId]);
  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { if (projectId) fetchJoinOpname(projectId, discipline); else setData(null); }, [projectId, discipline, fetchJoinOpname]);

  const handleProjectChange = (e) => {
    if (unsavedChanges.size > 0 && !window.confirm("Ada pekerjaan yang belum disimpan! Yakin ingin pindah project?")) return;
    setProjectId(e.target.value);
    setData(null); setError(null); setProgressInputs({}); setSelectedDate("");
    setUnsavedChanges(new Set());
  };

  const handleDateChange = (e) => {
    if (unsavedChanges.size > 0 && !window.confirm("Ada pekerjaan yang belum disimpan! Yakin ingin pindah tanggal?")) return;
    const date = e.target.value;
    setSelectedDate(date);
    setProgressInputs(buildProgressInputs(data?.items || [], date));
    setUnsavedChanges(new Set());
  };

  const handleProgressChange = (rabItemId, value) => {
    let numericValue = value.replace(/[^0-9.-]/g, "");
    if (numericValue !== "" && numericValue !== "-" && Number(numericValue) > 100) numericValue = "100";
    setProgressInputs((prev) => ({
      ...prev,
      [rabItemId]: { ...prev[rabItemId], percent: numericValue }
    }));
    setUnsavedChanges(prev => new Set(prev).add(rabItemId));
  };

  const handleFileChange = (rabItemId, files) => {
    setProgressInputs((prev) => ({
      ...prev,
      [rabItemId]: { ...prev[rabItemId], files: files }
    }));
    setUnsavedChanges(prev => new Set(prev).add(rabItemId));
  };

  const handleSaveProgress = async (item) => {
    if (!projectId) return;
    if (!selectedDate) return showNotice("error", "Pilih tanggal progress terlebih dahulu.");

    const inputData = progressInputs[item.rabItemId];
    const progress = Number(inputData?.percent || 0);

    if (!Number.isFinite(progress) || progress > 100) {
      return showNotice("error", "Progress maksimal 100%.");
    }

    setBusyItems((prev) => ({ ...prev, [item.rabItemId]: true }));
    
    toast.promise(joinOpnameService.updateProgress(item.rabItemId, selectedDate, progress, inputData.files), {
      loading: 'Menyimpan progress...',
      success: `Progress "${item.name}" berhasil disimpan.`,
      error: (err) => err.message || 'Gagal menyimpan progress.'
    }).then(() => {
      setUnsavedChanges((prev) => {
        const next = new Set(prev);
        next.delete(item.rabItemId);
        return next;
      });
      fetchJoinOpname(projectId);
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setBusyItems((prev) => ({ ...prev, [item.rabItemId]: false }));
    });
  };

  const handleSaveAllProgress = async () => {
    if (!projectId) return;
    if (!selectedDate) return showNotice("error", "Pilih tanggal progress terlebih dahulu.");
    if (unsavedChanges.size === 0) return;

    const itemsToSave = (data?.items || []).filter(i => unsavedChanges.has(i.rabItemId) && !i.hasChildren);
    if (itemsToSave.length === 0) return;

    setSavingBatch(true);
    const newBusy = {};
    itemsToSave.forEach(i => newBusy[i.rabItemId] = true);
    setBusyItems(prev => ({ ...prev, ...newBusy }));

    const promises = itemsToSave.map(item => {
      const inputData = progressInputs[item.rabItemId];
      const progress = Number(inputData?.percent || 0);
      return joinOpnameService.updateProgress(item.rabItemId, selectedDate, progress, inputData.files);
    });

    toast.promise(Promise.all(promises), {
      loading: 'Menyimpan semua progress...',
      success: `Berhasil menyimpan ${itemsToSave.length} pekerjaan.`,
      error: 'Beberapa progress gagal disimpan.'
    }).then(() => {
      setUnsavedChanges(new Set());
      fetchJoinOpname(projectId);
    }).finally(() => {
      setSavingBatch(false);
      setBusyItems(prev => {
        const next = { ...prev };
        itemsToSave.forEach(i => next[i.rabItemId] = false);
        return next;
      });
    });
  };

  const items = data?.items || [];
  const days = data?.days || [];
  const totalDays = data?.totalDays || 0;
  const startDate = data?.startDate || null;

  const groupedItems = useMemo(() => {
    const groups = new Map();
    items.forEach((item) => {
      // Find breakdown for the selectedDate
      const breakdown = (item.dailyBreakdown || []).find((day) => toInputDate(day.date) === selectedDate);
      
      // Filter logic: Only include if it has children, or if it's in schedule, or already has progress today
      const shouldInclude = item.hasChildren || (breakdown && (breakdown.inSchedule || breakdown.hasProgress));

      if (shouldInclude) {
        const groupName = item.groupName || "Tanpa Group";
        if (!groups.has(groupName)) groups.set(groupName, []);
        groups.get(groupName).push(item);
      }
    });

    // Remove empty groups (in case a parent group has no valid children)
    return Array.from(groups.entries()).filter(([_, groupItems]) => groupItems.some(it => !it.hasChildren));
  }, [items, selectedDate]);

  const selectedDay = useMemo(() => days.find((day) => toInputDate(day.date) === selectedDate), [days, selectedDate]);

  const summary = useMemo(() => {
    if (!items.length) return { totalItems: 0, completed: 0, qualityCheck: 0, onProgress: 0, notStarted: 0, accumulatedWeight: 0, unfilledDays: 0 };
    let completed = 0, qualityCheck = 0, onProgress = 0, notStarted = 0;
    let accumulatedWeight = 0;

    items.forEach((item) => {
      const progress = Number(item.rekapProgress) || 0;
      
      if (!item.hasChildren) {
         accumulatedWeight += (Number(item.weight) * progress) / 100;
      }

      if (progress >= 100) completed += 1;
      else if (progress >= 95) qualityCheck += 1;
      else if (progress > 50) onProgress += 1;
      else notStarted += 1;
    });

    let unfilledDays = 0;
    if (days.length > 0) {
      const today = new Date().setHours(0,0,0,0);
      days.forEach(day => {
        const dayTime = new Date(day.date).setHours(0,0,0,0);
        if (dayTime > today) return; // Ignore future days
        
        let hasExpected = false;
        let missed = false;
        
        items.forEach(item => {
          if (item.hasChildren) return;
          if (item.rekapProgress >= 100) return; // Ignore jika sudah 100%
          
          const breakdown = item.dailyBreakdown?.find(r => r.dayNumber === day.dayNumber);
          if (breakdown?.inSchedule) {
            hasExpected = true;
            if (!breakdown.hasProgress) {
              missed = true;
            }
          }
        });
        
        if (hasExpected && missed) {
          unfilledDays++;
        }
      });
    }

    return { totalItems: items.length, completed, qualityCheck, onProgress, notStarted, accumulatedWeight, unfilledDays };
  }, [items, days]);

  return {
    projectId, projectList, loadingProjects, projectError,
    data, loading, error, notice,
    selectedDate, progressInputs, busyItems,
    handleProjectChange, handleDateChange, handleProgressChange, handleFileChange, handleSaveProgress,
    items, days, totalDays, startDate, groupedItems, selectedDay, summary,
    discipline, setDiscipline, filterLabel, setFilterLabel,
    unsavedChanges, savingBatch, handleSaveAllProgress
  };
}