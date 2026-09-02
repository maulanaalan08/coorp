import React, { useState } from 'react';
import ProjectSelector from '../components/ProjectSelector';
import { useProjects } from '../hooks/useProjects';
import { useBast } from '../hooks/useBast';
import { bastService } from '../services/bastService';
import BastModal from '../components/BastModal';
import { Plus, Eye, Download, Pencil, Trash2 } from 'lucide-react';
import styles from '../styles/BastPage.module.css';
import toast from 'react-hot-toast';

const BastPage = () => {
  const { projects, loading: loadingProjects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  
  const { 
    basts, loading, refresh, createBast, updateBast, deleteBast 
  } = useBast(selectedProjectId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBast, setEditingBast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenCreate = () => {
    if (!selectedProjectId) {
      toast.error('Pilih project terlebih dahulu!');
      return;
    }
    setEditingBast(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (bast) => {
    setEditingBast(bast);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBast(null);
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingBast) {
        await updateBast(editingBast.id, formData);
        toast.success('BAST berhasil diupdate!');
      } else {
        await createBast(formData);
        toast.success('BAST berhasil dibuat!');
      }
      handleCloseModal();
    } catch (error) {
      toast.error(error.message || 'Gagal menyimpan BAST');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus BAST ini beserta fotonya?')) {
      toast.promise(deleteBast(id), {
        loading: 'Menghapus BAST...',
        success: 'BAST berhasil dihapus!',
        error: 'Gagal menghapus BAST',
      });
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Berita Acara (BAST)</h1>
          <p className={styles.pageSubtitle}>Kelola dan cetak Berita Acara Serah Terima Pekerjaan</p>
        </div>
        <button className={styles.btnPrimary} onClick={handleOpenCreate}>
          <Plus size={18} /> Buat BAST
        </button>
      </div>

      <div className={styles.selectorWrapper}>
        <ProjectSelector 
          projectList={projects}
          projectId={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          loading={loadingProjects}
        />
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.bastTable}>
          <thead>
            <tr>
              <th>No. BAST</th>
              <th>No. SPK</th>
              <th>Tgl. Serah Terima</th>
              <th>Kontraktor</th>
              <th>Owner</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {!selectedProjectId ? (
              <tr>
                <td colSpan={6}>
                  <div className={styles.emptyState}>
                    <p>Pilih project untuk melihat data BAST.</p>
                  </div>
                </td>
              </tr>
            ) : loading ? (
              <tr>
                <td colSpan={6}>
                  <div className={styles.emptyState}>
                    <p>Memuat data...</p>
                  </div>
                </td>
              </tr>
            ) : basts.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className={styles.emptyState}>
                    <p>Belum ada data BAST untuk project ini.</p>
                  </div>
                </td>
              </tr>
            ) : (
              basts.map((bast) => (
                <tr key={bast.id}>
                  <td>{bast.bastNumber || '-'}</td>
                  <td>{bast.spkNumber || '-'}</td>
                  <td>{new Date(bast.handoverDate).toLocaleDateString('id-ID')}</td>
                  <td>{bast.pihakKeduaName || '-'}</td>
                  <td>{bast.pihakPertamaName || '-'}</td>
                  <td>
                    <div className={styles.actionsCell}>
                      <a 
                        href={bastService.getPdfViewUrl(bast.id)} 
                        target="_blank" 
                        rel="noreferrer"
                        className={`${styles.btnAction} ${styles.view}`}
                        title="View PDF"
                      >
                        <Eye size={16} />
                      </a>
                      <a 
                        href={bastService.getPdfDownloadUrl(bast.id)} 
                        className={`${styles.btnAction} ${styles.download}`}
                        title="Download PDF"
                      >
                        <Download size={16} />
                      </a>
                      <button 
                        className={`${styles.btnAction} ${styles.edit}`}
                        onClick={() => handleOpenEdit(bast)}
                        title="Edit BAST"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        className={`${styles.btnAction} ${styles.delete}`}
                        onClick={() => handleDelete(bast.id)}
                        title="Hapus BAST"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <BastModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        initialData={editingBast}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default BastPage;
