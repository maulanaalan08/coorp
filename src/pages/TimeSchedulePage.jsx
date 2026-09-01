import React from "react";
import { useTimeSchedule } from "../hooks/useTimeSchedule";
import { timeScheduleService } from "../services/timeScheduleService";
import { formatWeight } from "../services/utils";
import TimeScheduleTable from "../components/TimeScheduleTable";
import "../styles/TimeSchedulePage.css";
import toast from "react-hot-toast";

function TimeSchedulePage({ projectId: initialProjectId = null }) {
  const {
    projectId, setProjectId, projectList, loadingProjects, projectError, fetchProjects, fetchSchedule,
    data, loading, error, notice, showNotice, 
    startDateInput, setStartDateInput, savingStartDate, setSavingStartDate,
    editDrafts, setEditDrafts, busyItems, setBusyItems, hoverPoint, setHoverPoint, 
    maxWeek, weekDates, items, scheduledCount, lastProgress, groupedItems, weekRange, chart
  } = useTimeSchedule(initialProjectId);

  const handleProjectChange = (e) => {
    setProjectId(e.target.value || null);
    setEditDrafts({});
    setHoverPoint(null);
  };

  // Fungsi untuk menyimpan Tanggal Mulai Proyek
  const handleSaveStartDate = async () => {
    if (!projectId) return toast.error("Pilih project.");
    if (!startDateInput) return toast.error("Pilih tanggal mulai.");
    setSavingStartDate(true);
    
    toast.promise(timeScheduleService.updateStartDate(projectId, startDateInput), {
      loading: 'Menyimpan tanggal mulai...',
      success: 'Tanggal mulai berhasil disimpan.',
      error: 'Gagal menyimpan tanggal.'
    }).then(() => {
      fetchSchedule(projectId);
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setSavingStartDate(false);
    });
  };

  const handleSaveItemSchedule = async (item, draft) => {
    setBusyItems((prev) => ({ ...prev, [item.rabItemId]: true }));
    
    toast.promise(timeScheduleService.updateItemSchedule(item.rabItemId, Number(draft.startWeek), Number(draft.endWeek)), {
      loading: 'Menyimpan jadwal...',
      success: `Jadwal "${item.name}" disimpan.`,
      error: 'Gagal menyimpan jadwal.'
    }).then(() => {
      fetchSchedule(projectId);
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setBusyItems((prev) => ({ ...prev, [item.rabItemId]: false }));
    });
  };

  const handleDeleteItemSchedule = async (item) => {
    setBusyItems((prev) => ({ ...prev, [item.rabItemId]: true }));
    
    toast.promise(timeScheduleService.deleteItemSchedule(item.rabItemId), {
      loading: 'Menghapus jadwal...',
      success: `Jadwal "${item.name}" dihapus.`,
      error: 'Gagal menghapus jadwal.'
    }).then(() => {
      setEditDrafts((prev) => { const next = { ...prev }; delete next[item.rabItemId]; return next; });
      fetchSchedule(projectId);
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setBusyItems((prev) => ({ ...prev, [item.rabItemId]: false })); 
    });
  };

  React.useEffect(() => {
    if (loadingProjects || loading) {
      toast.loading('Memuat data Time Schedule...', { id: 'loading-ts' });
    } else {
      toast.dismiss('loading-ts');
      if (error || projectError) {
        toast.error(error || projectError);
      }
    }
  }, [loadingProjects, loading, error, projectError]);

  if (!loadingProjects && projectList.length === 0 && projectError) {
    return (
      <div className="tsp-page">
        <div className="tsp-card tsp-empty-state tsp-error-state">
          <h2>Gagal Memuat Project</h2>
          <p>{projectError}</p>
          <button className="tsp-btn tsp-btn-primary" onClick={fetchProjects}>Coba Lagi</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tsp-page">
      <header className="tsp-header">
        <div>
          <h1 className="tsp-title">RAP Time Schedule Proyek</h1>
          <p className="tsp-subtitle">Kelola jadwal pelaksanaan dan pantau progres melalui Kurva S.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="tsp-badge">{loading ? "Memuat..." : `${maxWeek} Minggu Proyek`}</div>
          {projectId && (
            <button className="tsp-btn tsp-btn-primary" onClick={() => timeScheduleService.exportExcel(projectId)} disabled={loading}>
              ⬇ Export Excel
            </button>
          )}
        </div>
      </header>

      <div className="tsp-card tsp-project-card">
        <h2 className="tsp-card-title">Pilih Project</h2>
        <div className="rab-project-picker">
          <select className="rab-project-select" value={projectId || ""} onChange={handleProjectChange} disabled={loadingProjects}>
            <option value="">{loadingProjects ? "Memuat project..." : "-- pilih project --"}</option>
            {projectList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {!projectId ? (
        <div className="tsp-card tsp-empty-state"><h2>Pilih Project Terlebih Dahulu</h2></div>
      ) : loading && !data ? (
        <div className="tsp-card tsp-empty-state"><div className="tsp-spinner" /><p>Memuat data...</p></div>
      ) : error ? (
        <div className="tsp-card tsp-empty-state tsp-error-state"><p>{error}</p><button className="tsp-btn tsp-btn-primary" onClick={() => fetchSchedule(projectId)}>Coba Lagi</button></div>
      ) : (
        <>
          {/* ==============================================
              START DATE
          ============================================== */}
          <div className="tsp-controls-row">
            <div className="tsp-card tsp-control-card">
              <h2 className="tsp-card-title">Tanggal Mulai Proyek</h2>
              <div className="tsp-control-row">
                <input 
                  type="date" 
                  className="tsp-input" 
                  value={startDateInput} 
                  onChange={(e) => setStartDateInput(e.target.value)} 
                />
                <button 
                  className="tsp-btn tsp-btn-primary" 
                  onClick={handleSaveStartDate} 
                  disabled={savingStartDate}
                >
                  {savingStartDate ? "Menyimpan..." : "Simpan Tanggal Mulai"}
                </button>
              </div>
            </div>
          </div>

          <div className="tsp-card tsp-gantt-card">
            <h2 className="tsp-card-title">Tabel Jadwal Pekerjaan</h2>
            <TimeScheduleTable 
              items={items} 
              groupedItems={groupedItems} 
              weekRange={weekRange} 
              weekDates={weekDates} 
              editDrafts={editDrafts} 
              setEditDrafts={setEditDrafts} 
              busyItems={busyItems} 
              handleSaveItemSchedule={handleSaveItemSchedule} 
              handleDeleteItemSchedule={handleDeleteItemSchedule} 
            />
          </div>
        </>
      )}
    </div>
  );
}

export default TimeSchedulePage;