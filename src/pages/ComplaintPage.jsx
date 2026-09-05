import React, { useState, useEffect } from 'react';
import { useComplaints } from '../hooks/useComplaints';
import { complaintService } from '../services/complaintService';
import { flattenComplaintItems } from '../utils/complaintHelper';
import { formatDate } from '../services/utils';
import ComplaintAddHeaderModal from "../components/ComplaintAddHeaderModal";
import ComplaintEditItemModal from "../components/ComplaintEditItemModal";
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
  const [editData, setEditData] = useState(null);

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
                          <span className={`status-badge ${isHeaderDone ? 'done' : 'ongoing'}`}>
                            {isHeaderDone ? <><CheckCircle size={14}/> Selesai</> : <><Clock size={14}/> On going</>}
                          </span>
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
                                  <td>{item.defectList}</td>
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
                                  <td>{item.repairDefectReport || <span className="muted">-</span>}</td>
                                  <td>
                                    <span style={{ color: item.status ? '#10b981' : '#f59e0b', fontWeight: 'bold', fontSize: '12px' }}>
                                      {item.status ? 'Selesai' : 'On going'}
                                    </span>
                                  </td>
                                  <td>
                                    <button 
                                      className="btn-action" 
                                      onClick={() => setEditData({ category, item })}
                                      style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent', border: '1px solid #d4af37', color: '#d4af37', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                      Edit
                                    </button>
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
    </div>
  );
}