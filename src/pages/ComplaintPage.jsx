import React, { useState, useEffect } from 'react';
import { useComplaints } from '../hooks/useComplaints';
import { complaintService } from '../services/complaintService';
import { flattenComplaintItems } from '../utils/complaintHelper';
import { formatDate } from '../services/utils';
import ComplaintAddHeaderModal from "../components/ComplaintAddHeaderModal";
import ComplaintEditItemModal from "../components/ComplaintEditItemModal";
import Bast2Modal from "../components/Bast2Modal";
import ProjectSelector from "../components/ProjectSelector";
import toast from 'react-hot-toast';
import { Image, FileText, CheckCircle, Clock } from 'lucide-react';
import styles from '../styles/BackUpVolume.module.css';
import "../styles/Complaint.css"; 

export default function ComplaintPage() {
  const [projectList, setProjectList] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  const { complaintReport, isLoading, error, refetch, saveComplaint } = useComplaints(projectId);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddDefectModal, setShowAddDefectModal] = useState(null);
  const [showBast2Modal, setShowBast2Modal] = useState(false);
  const [editData, setEditData] = useState(null);

  const [activeTab, setActiveTab] = useState("COMPLAINT");
  const [bast2List, setBast2List] = useState([]);
  const [loadingBast2, setLoadingBast2] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchBast2List();
    } else {
      setBast2List([]);
    }
  }, [projectId]);

  const fetchBast2List = async () => {
    try {
      setLoadingBast2(true);
      const res = await complaintService.getBast2List(projectId);
      setBast2List(res || []);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat riwayat BAST 2");
    } finally {
      setLoadingBast2(false);
    }
  };

  // Fetch projects list
  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const { fetchAPI } = await import('../services/api');
        const res = await fetchAPI('/projects');
        setProjectList(res || []);
      } catch (err) {
        toast.error("Gagal mengambil daftar proyek.");
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  const handleProjectChange = (e) => {
    setProjectId(e.target.value);
  };

  const handleAddHeaderSave = async (newHeaderData) => {
    const newFilesMap = {};
    const baseCategories = complaintReport ? complaintReport.categories : [];
    
    const formattedNewCategory = {
      name: newHeaderData.name,
      items: newHeaderData.items.map((it, itemIndex) => {
        const flatGlobalIndex = flattenComplaintItems(baseCategories).length + itemIndex;
        // Map before photos
        it.files.forEach((f, fileIndex) => {
          newFilesMap[`photoBefore_${flatGlobalIndex}_${fileIndex}`] = f;
        });
        return {
          defectList: it.defectList,
          status: false
        };
      })
    };
    
    const newCategories = [...baseCategories, formattedNewCategory];
    
    try {
      await saveComplaint(newCategories, newFilesMap);
      toast.success("Berhasil menambahkan Header Complain.");
      setShowAddModal(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddDefectSave = async (data) => {
    const baseCategories = complaintReport.categories;
    const newCategories = JSON.parse(JSON.stringify(baseCategories)); 
    
    newCategories.forEach((cat) => {
      const matchCatId = cat.id === data.categoryId;
      const matchCatOrder = !cat.id && cat.order === data.categoryId;
      if (matchCatId || matchCatOrder) {
        data.items.forEach(it => {
          cat.items.push({ defectList: it.defectList, status: false, _tempFiles: it.files });
        });
      }
    });
    
    const newFilesMap = {};
    const newFlatItems = flattenComplaintItems(newCategories);
    
    newFlatItems.forEach(flatEntry => {
       if (flatEntry.item._tempFiles) {
          flatEntry.item._tempFiles.forEach((f, fileIndex) => {
             newFilesMap[`photoBefore_${flatEntry.globalIndex}_${fileIndex}`] = f;
          });
          delete flatEntry.item._tempFiles; // remove from request body
       }
    });

    try {
      await saveComplaint(newCategories, newFilesMap);
      toast.success("Berhasil menambahkan Defect ke Area tersebut.");
      setShowAddDefectModal(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEditItemSave = async (updatedItemData) => {
    const baseCategories = complaintReport.categories;
    const newCategories = JSON.parse(JSON.stringify(baseCategories)); 
    
    const newFilesMap = {};
    const flatItems = flattenComplaintItems(baseCategories);
    
    newCategories.forEach((cat, cIdx) => {
      const matchCatId = cat.id === updatedItemData.categoryId;
      const matchCatOrder = !cat.id && cat.order === updatedItemData.categoryId;
      if (matchCatId || matchCatOrder) {
        cat.name = updatedItemData.areaName;
      }
      
      cat.items.forEach((it, iIdx) => {
        if (it.id === updatedItemData.itemId) {
          it.defectList = updatedItemData.defectList;
          it.status = updatedItemData.status;
          it.repairDate = updatedItemData.repairDate;
          it.repairDefectReport = updatedItemData.repairDefectReport;
          
          it.existingPhotoBeforeUrls = updatedItemData.existingBefore;
          it.existingPhotoAfterUrls = updatedItemData.existingAfter;
          
          const flatEntry = flatItems.find(f => f.categoryIndex === cIdx && f.itemIndexInCategory === iIdx);
          if (flatEntry) {
            if (updatedItemData.newBefore && updatedItemData.newBefore.length > 0) {
              updatedItemData.newBefore.forEach((f, fileIndex) => {
                newFilesMap[`photoBefore_${flatEntry.globalIndex}_${fileIndex}`] = f;
              });
            }
            if (updatedItemData.newAfter && updatedItemData.newAfter.length > 0) {
              updatedItemData.newAfter.forEach((f, fileIndex) => {
                newFilesMap[`photoAfter_${flatEntry.globalIndex}_${fileIndex}`] = f;
              });
            }
          }
        }
      });
    });

    try {
      await saveComplaint(newCategories, newFilesMap);
      toast.success("Berhasil memperbarui data Defect.");
      setEditData(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm("Yakin ingin menghapus seluruh area defect list ini?")) return;
    try {
      const newCategories = complaintReport.categories.filter(cat => (cat.id || cat.order) !== categoryId);
      await saveComplaint(newCategories, {});
      toast.success("Berhasil menghapus area.");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteItem = async (categoryId, itemId) => {
    if (!window.confirm("Yakin ingin menghapus defect ini?")) return;
    try {
      const newCategories = JSON.parse(JSON.stringify(complaintReport.categories));
      const catIndex = newCategories.findIndex(cat => (cat.id || cat.order) === categoryId);
      if (catIndex > -1) {
        newCategories[catIndex].items = newCategories[catIndex].items.filter(it => (it.id || it.order) !== itemId);
        await saveComplaint(newCategories, {});
        toast.success("Berhasil menghapus defect.");
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openDefectPdf = () => {
    if (complaintReport && complaintReport.id) {
      complaintService.downloadPdf(complaintReport.id);
    }
  };

  const openBastPdf = () => {
    if (complaintReport && complaintReport.id) {
      complaintService.downloadBast2Pdf(complaintReport.id);
    }
  };

  const handleBast2Submit = async (formData) => {
    try {
      if (complaintReport && complaintReport.id) {
        await complaintService.createBast2(projectId, complaintReport.id, formData);
        toast.success("BAST 2 berhasil disimpan!");
        setShowBast2Modal(false);
        fetchBast2List();
        setActiveTab("BAST2");
      }
    } catch (err) {
      toast.error(err.message || "Gagal menggenerate BAST 2");
    }
  };

  const handleDeleteBast2 = async (id) => {
    if (!window.confirm("Yakin ingin menghapus dokumen BAST 2 ini?")) return;
    try {
      await complaintService.deleteBast2(id);
      toast.success("BAST 2 berhasil dihapus");
      fetchBast2List();
    } catch (err) {
      toast.error(err.message || "Gagal menghapus BAST 2");
    }
  };

  const isAllDone = complaintReport && complaintReport.categories.length > 0 && complaintReport.categories.every(cat => 
    cat.items.every(item => item.status === true)
  );

  return (
    <div className="complaint-container">
      <div className="complaint-header">
        <div>
          <h1 className="page-title">Manajemen Complain</h1>
          <p className="page-subtitle">Kelola laporan defect list dan berita acara serah terima perbaikan (BAST).</p>
        </div>
      </div>

      <ProjectSelector 
        projectId={projectId}
        projectList={projectList}
        loading={loadingProjects}
        onChange={handleProjectChange}
      />

      {!projectId ? (
        <div className="complaint-card empty-state">
          <h2>Pilih Project Terlebih Dahulu</h2>
          <p>Pilih project di atas untuk melihat atau menambahkan laporan complain.</p>
        </div>
      ) : (
        <>
          {/* Tabs Navigation */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #333', paddingBottom: '12px' }}>
            <button 
              onClick={() => setActiveTab('COMPLAINT')}
              style={{ 
                padding: '8px 16px', fontWeight: 'bold', fontSize: '14px', borderRadius: '6px', cursor: 'pointer', border: 'none',
                background: activeTab === 'COMPLAINT' ? '#d4af37' : '#1e1e1e',
                color: activeTab === 'COMPLAINT' ? '#000' : '#888'
              }}
            >
              Daftar Complain
            </button>
            <button 
              onClick={() => setActiveTab('BAST2')}
              style={{ 
                padding: '8px 16px', fontWeight: 'bold', fontSize: '14px', borderRadius: '6px', cursor: 'pointer', border: 'none',
                background: activeTab === 'BAST2' ? '#d4af37' : '#1e1e1e',
                color: activeTab === 'BAST2' ? '#000' : '#888'
              }}
            >
              Riwayat BAST 2
            </button>
          </div>

          {activeTab === 'COMPLAINT' && (
            <>
              {isLoading && <div className="loading-state">Memuat data complaint...</div>}
              {error && <div className="error-state">{error}</div>}

              {!isLoading && !error && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 className="section-title" style={{ marginBottom: 0 }}>Daftar Complain</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn-download" 
                    onClick={openDefectPdf} 
                    disabled={!complaintReport}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <FileText size={16} /> View Defect List
                  </button>
                  <button 
                    className="btn-download" 
                    onClick={openBastPdf} 
                    disabled={!complaintReport || !isAllDone}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '8px', 
                      background: (!complaintReport || !isAllDone) ? '#333' : '#10b981',
                      color: (!complaintReport || !isAllDone) ? '#666' : '#fff'
                    }}
                    title={!isAllDone ? "Seluruh komplain harus berstatus Selesai" : "Lihat BAST"}
                  >
                    <FileText size={16} /> View BAST Complain
                  </button>
                  <button 
                    className="btn-download" 
                    onClick={() => setShowBast2Modal(true)} 
                    disabled={!complaintReport || !isAllDone}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '8px', 
                      background: (!complaintReport || !isAllDone) ? '#333' : '#10b981',
                      color: (!complaintReport || !isAllDone) ? '#666' : '#fff'
                    }}
                    title={!isAllDone ? "Seluruh komplain harus berstatus Selesai" : "Generate BAST 2"}
                  >
                    <FileText size={16} /> BAST 2
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={() => setShowAddModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    + Tambah Area Complain
                  </button>
                </div>
              </div>

              {!complaintReport || complaintReport.categories.length === 0 ? (
                <div className="complaint-card empty-state">
                  <p>Belum ada laporan komplain untuk project ini.</p>
                </div>
              ) : (
                <div className="complaint-report-wrapper">
                  {complaintReport.categories.map((category) => {
                    const isHeaderDone = category.items.every(it => it.status === true);
                    
                    return (
                      <div key={category.id || category.order} className="complaint-card" style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '12px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h3 style={{ margin: 0, color: '#d4af37' }}>{category.name}</h3>
                            <button 
                              className={styles.btnOutline} 
                              onClick={() => setShowAddDefectModal(category)}
                              style={{ padding: '2px 8px', fontSize: '10px' }}
                            >
                              + Tambah Defect
                            </button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={`status-badge ${isHeaderDone ? 'done' : 'ongoing'}`}>
                              {isHeaderDone ? <><CheckCircle size={14}/> Selesai</> : <><Clock size={14}/> On going</>}
                            </span>
                            <button
                               onClick={() => handleDeleteCategory(category.id || category.order)}
                               style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', cursor: 'pointer' }}
                               title="Hapus Tabel Defect List ini"
                            >
                               Hapus Tabel
                            </button>
                          </div>
                        </div>

                        <table className="complaint-table">
                          <thead>
                            <tr>
                              <th>Defect List</th>
                              <th>Foto Before</th>
                              <th>Foto After</th>
                              <th>Tgl Perbaikan</th>
                              <th>Laporan Hasil</th>
                              <th>Status</th>
                              <th>Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {category.items.map((item) => {
                              const beforePhotos = (item.photos || []).filter(p => p.type === "BEFORE");
                              const afterPhotos = (item.photos || []).filter(p => p.type === "AFTER");
                              
                              return (
                                <tr key={item.id}>
                                  <td style={{ wordWrap: 'break-word', wordBreak: 'break-word', maxWidth: '250px' }}>{item.defectList}</td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                      {beforePhotos.map((p, i) => (
                                        <a key={p.id} href={`http://localhost:4000${p.url}`} target="_blank" rel="noreferrer" className="photo-link">
                                          <Image size={12}/> F{i+1}
                                        </a>
                                      ))}
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                      {afterPhotos.map((p, i) => (
                                        <a key={p.id} href={`http://localhost:4000${p.url}`} target="_blank" rel="noreferrer" className="photo-link after">
                                          <Image size={12}/> F{i+1}
                                        </a>
                                      ))}
                                      {afterPhotos.length === 0 && <span className="muted">-</span>}
                                    </div>
                                  </td>
                                  <td>{item.repairDate ? formatDate(item.repairDate) : <span className="muted">-</span>}</td>
                                  <td style={{ wordWrap: 'break-word', wordBreak: 'break-word', maxWidth: '300px' }}>{item.repairDefectReport || <span className="muted">-</span>}</td>
                                  <td>
                                    <span style={{ color: item.status ? '#10b981' : '#f59e0b', fontWeight: 'bold', fontSize: '12px' }}>
                                      {item.status ? 'Selesai' : 'On going'}
                                    </span>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <button 
                                        className="btn-action" 
                                        onClick={() => setEditData({ category, item })}
                                        style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent', border: '1px solid #d4af37', color: '#d4af37', borderRadius: '4px', cursor: 'pointer' }}
                                      >
                                        Edit
                                      </button>
                                      <button 
                                        className="btn-action" 
                                        onClick={() => handleDeleteItem(category.id || category.order, item.id || item.order)}
                                        style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', cursor: 'pointer' }}
                                      >
                                        Hapus
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'BAST2' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 className="section-title" style={{ marginBottom: 0 }}>Riwayat Dokumen BAST 2</h2>
              </div>
              
              {loadingBast2 ? (
                <div className="loading-state">Memuat riwayat BAST 2...</div>
              ) : bast2List.length === 0 ? (
                <div className="complaint-card empty-state">
                  <p>Belum ada BAST 2 yang digenerate untuk project ini.</p>
                </div>
              ) : (
                <div className="complaint-card">
                  <table className="complaint-table">
                    <thead>
                      <tr>
                        <th>No. BAST</th>
                        <th>No. SPK</th>
                        <th>Tanggal Handover</th>
                        <th>Pemberi Tugas</th>
                        <th>Penerima Pekerjaan</th>
                        <th>Status</th>
                        <th>Dibuat Pada</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bast2List.map(bast => (
                        <tr key={bast.id}>
                          <td><strong>{bast.bastNumber}</strong></td>
                          <td>{bast.spkNumber}</td>
                          <td>{formatDate(bast.handoverDate)}</td>
                          <td>{bast.pihakPertamaName}</td>
                          <td>{bast.pihakKeduaName}</td>
                          <td>{bast.statusText}</td>
                          <td>{formatDate(bast.createdAt)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="btn-action" 
                                onClick={() => complaintService.viewSavedBast2Pdf(bast.id)}
                                style={{ padding: '4px 8px', fontSize: '11px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <FileText size={12}/> View PDF
                              </button>
                              <button 
                                className="btn-action" 
                                onClick={() => handleDeleteBast2(bast.id)}
                                style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', cursor: 'pointer' }}
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showAddModal && (
        <ComplaintAddHeaderModal 
          onClose={() => setShowAddModal(false)}
          onSave={handleAddHeaderSave}
        />
      )}
      
      {showAddDefectModal && (
        <ComplaintAddHeaderModal 
          existingCategory={showAddDefectModal}
          onClose={() => setShowAddDefectModal(null)}
          onSave={handleAddDefectSave}
        />
      )}

      {editData && (
        <ComplaintEditItemModal
          category={editData.category}
          item={editData.item}
          onClose={() => setEditData(null)}
          onSave={handleEditItemSave}
        />
      )}

      <Bast2Modal 
        isOpen={showBast2Modal}
        onClose={() => setShowBast2Modal(false)}
        onSubmit={handleBast2Submit}
        isSubmitting={false}
      />
    </div>
  );
}