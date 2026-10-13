import React, { useState } from "react";
import { useTimeSchedule } from "../hooks/useTimeSchedule";
import { timeScheduleService } from "../services/timeScheduleService";
import TimeScheduleTable from "../components/TimeScheduleTable";
import TimeScheduleCalendar from "../components/TimeScheduleCalendar";
import ProjectSelector from "../components/ProjectSelector";
import Header from "../components/Header";
import "../styles/TimeSchedulePage.css";
import toast from "react-hot-toast";

function TimeSchedulePage({ projectId: initialProjectId = null }) {
  const {
    projectId, setProjectId, projectList, loadingProjects, projectError, fetchProjects, fetchSchedule,
    data, loading, error, notice, showNotice, 
    discipline, setDiscipline, filterLabel, setFilterLabel,
    activeSubCategoryId, setActiveSubCategoryId,
    filterSubcategories, loadingFilterSubcategories, subCategoryCounts,
    startDateInput, setStartDateInput, savingStartDate, setSavingStartDate,
    editDrafts, setEditDrafts, busyItems, setBusyItems, hoverPoint, setHoverPoint, 
    periods, items, scheduledCount, lastProgress, groupedItems, chart
  } = useTimeSchedule(initialProjectId);

  const [activeTab, setActiveTab] = useState("input"); // "input" | "chart"
  const [savingBatch, setSavingBatch] = useState(false);

  const handleProjectChange = (e) => {
    setProjectId(e.target.value || null);
    setEditDrafts({});
    setHoverPoint(null);
  };

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
    
    toast.promise(timeScheduleService.updateItemSchedule(item.rabItemId, draft.startDate, draft.endDate), {
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

  const handleSaveAllSchedules = async () => {
    const schedulesToSave = [];
    for (const [rabItemId, draft] of Object.entries(editDrafts)) {
      const item = items.find(i => i.rabItemId === rabItemId);
      if (!item) continue;
      
      const startDate = draft.startDate ?? (item.startDate ? String(item.startDate).slice(0, 10) : "");
      const endDate = draft.endDate ?? (item.endDate ? String(item.endDate).slice(0, 10) : "");

      if (startDate && endDate) {
        schedulesToSave.push({
          rabItemId,
          startDate,
          endDate,
        });
      }
    }
    
    if (schedulesToSave.length === 0) {
      return toast.error("Tidak ada jadwal valid untuk disimpan.");
    }
    
    setSavingBatch(true);
    toast.promise(timeScheduleService.updateBatchSchedule(projectId, schedulesToSave), {
      loading: 'Menyimpan semua jadwal...',
      success: `${schedulesToSave.length} jadwal berhasil disimpan.`,
      error: 'Gagal menyimpan semua jadwal.'
    }).then(() => {
      setEditDrafts({});
      fetchSchedule(projectId);
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setSavingBatch(false);
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
      <div className="flex flex-col min-h-screen bg-[#0c0b09] text-white">
        <Header />
        <div className="tsp-page" style={{ flex: 1, minHeight: 'auto', paddingTop: '8px' }}>
          <div className="tsp-card tsp-empty-state tsp-error-state">
            <h2>Gagal Memuat Project</h2>
            <p>{projectError}</p>
            <button className="tsp-btn tsp-btn-primary" onClick={fetchProjects}>Coba Lagi</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0c0b09] text-white">
      <Header />
      <div className="tsp-page" style={{ flex: 1, minHeight: 'auto', paddingTop: '8px' }}>
        <header className="tsp-header">
        <div>
          <h1 className="tsp-title">RAP Time Schedule Proyek</h1>
          <p className="tsp-subtitle">Kelola jadwal pelaksanaan dan pantau progres melalui Kurva S.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="tsp-badge">{loading ? "Memuat..." : `${periods.length} Minggu Proyek`}</div>
          {projectId && (
            <button className="tsp-btn tsp-btn-primary" onClick={() => timeScheduleService.exportExcel(projectId, discipline)} disabled={loading}>
              ⬇ Export Excel
            </button>
          )}
        </div>
      </header>

      <div className="tsp-card tsp-project-card">
        <h2 className="tsp-card-title">Pilih Project</h2>
        <ProjectSelector 
          projectId={projectId}
          projectList={projectList}
          loading={loadingProjects}
          onChange={handleProjectChange}
        />
        <div style={{ marginTop: '16px' }}>
          {projectError && <p className="tsp-error">{projectError}</p>}
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
          <div className="tsp-controls-row">
            <div className="tsp-card tsp-control-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h2 className="tsp-card-title" style={{ marginBottom: '8px' }}>Label Utama (Kategori)</h2>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    className={`tsp-btn ${discipline === 'General' ? 'tsp-btn-primary' : ''}`}
                    style={{ minWidth: '90px' }}
                    onClick={() => {
                      setDiscipline('General');
                      setFilterLabel('General');
                    }}
                  >
                    Semua
                  </button>
                  {projectList
                    .find((p) => p.id === projectId)
                    ?.workCategories
                    ?.filter((c) => c.isActive && c.workCategory?.isActive && String(c.workCategory?.code).toUpperCase() !== 'GENERAL')
                    .map((c) => (
                      <button
                        type="button"
                        key={c.workCategoryId}
                        className={`tsp-btn ${discipline === c.workCategoryId ? 'tsp-btn-primary' : ''}`}
                        style={{ minWidth: '90px' }}
                        onClick={() => {
                          setDiscipline(c.workCategoryId);
                          setFilterLabel(c.workCategory.code.toUpperCase());
                        }}
                      >
                        {c.workCategory.code.toUpperCase()}
                      </button>
                    ))}
                </div>
              </div>

              {discipline !== 'General' && (
                <div style={{ borderTop: '1px solid #2a261e', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Sub Label (Subkategori)
                    </span>
                    {loadingFilterSubcategories && (
                      <span style={{ fontSize: '11px', color: '#888' }}>Memuat...</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      className={`tsp-btn tsp-btn-sm ${!activeSubCategoryId ? 'tsp-btn-primary' : ''}`}
                      onClick={() => setActiveSubCategoryId('')}
                    >
                      Semua
                    </button>
                    {!loadingFilterSubcategories && filterSubcategories.length === 0 ? (
                      <span style={{ fontSize: '12px', color: '#888' }}>Belum ada subkategori aktif</span>
                    ) : (
                      filterSubcategories.map((subcat) => {
                        const count = subCategoryCounts[subcat.id];
                        const countLabel = count !== undefined ? ` (${count})` : '';
                        return (
                          <button
                            type="button"
                            key={subcat.id}
                            className={`tsp-btn tsp-btn-sm ${activeSubCategoryId === subcat.id ? 'tsp-btn-primary' : ''}`}
                            onClick={() => setActiveSubCategoryId(subcat.id)}
                          >
                            {subcat.code || subcat.name}{countLabel}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="tsp-card tsp-control-card" style={{ marginLeft: '16px' }}>
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
             <div style={{ display: 'flex', gap: '10px' }}>
               <button 
                  className={`tsp-btn ${activeTab === 'input' ? 'tsp-btn-primary' : ''}`}
                  onClick={() => setActiveTab('input')}
               >
                  Input Jadwal
               </button>
               <button 
                  className={`tsp-btn ${activeTab === 'chart' ? 'tsp-btn-primary' : ''}`}
                  onClick={() => setActiveTab('chart')}
               >
                  Lihat Kalender Jadwal
               </button>
             </div>
             {activeTab === 'input' && Object.keys(editDrafts).length > 0 && (
               <button 
                 className="tsp-btn tsp-btn-primary" 
                 style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                 onClick={handleSaveAllSchedules}
                 disabled={savingBatch}
               >
                 {savingBatch ? "Menyimpan..." : "Simpan Semua Perubahan"}
               </button>
             )}
          </div>

          <div className="tsp-card tsp-gantt-card">
            <h2 className="tsp-card-title">{activeTab === 'input' ? "Tabel Jadwal Pekerjaan" : "Kalender Jadwal"}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {activeTab === 'chart' && (
                <TimeScheduleCalendar 
                  items={items} 
                  groupedItems={groupedItems} 
                  periods={periods} 
                  discipline={discipline}
                  projectStartDate={data?.startDate}
                />
              )}
              {activeTab === 'input' && (
                <TimeScheduleTable 
                  variant={activeTab}
                  items={items} 
                  groupedItems={groupedItems} 
                  periods={periods} 
                  editDrafts={editDrafts} 
                  setEditDrafts={setEditDrafts} 
                  busyItems={busyItems} 
                  handleSaveItemSchedule={handleSaveItemSchedule} 
                  handleDeleteItemSchedule={handleDeleteItemSchedule} 
                />
              )}
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

export default TimeSchedulePage;
