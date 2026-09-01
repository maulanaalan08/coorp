import React from 'react';
import { useComplaints } from '../hooks/useComplaints';
import { complaintService } from '../services/complaintService';
import ComplaintForm from '../components/ComplaintForm';
import "../styles/Complaint.css"; 
import toast from 'react-hot-toast';

export default function ComplaintPage() {
  const projectId = "123-abc"; 
  
  const { complaints, isLoading, error, refetch } = useComplaints(projectId);

  // Menambahkan fungsi untuk memanggil endpoint DELETE backend[cite: 4, 6]
  const handleDelete = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus laporan ini?")) {
      toast.promise(complaintService.deleteComplaint(id), {
        loading: 'Menghapus laporan...',
        success: 'Berhasil menghapus laporan!',
        error: 'Gagal menghapus laporan.'
      }).then(() => {
        refetch();
      }).catch(err => console.error(err));
    }
  };

  React.useEffect(() => {
    if (isLoading) {
      toast.loading('Memuat data complaint...', { id: 'loading-complaint' });
    } else {
      toast.dismiss('loading-complaint');
      if (error) toast.error('Gagal memuat data');
    }
  }, [isLoading, error]);

  return (
    <div className="complaint-container">
      <h1 className="page-title">Manajemen Complaint</h1>
      
      <div style={{ marginBottom: '32px' }}>
        <h2 className="section-title">Buat Laporan Baru</h2>
        <ComplaintForm projectId={projectId} onSuccess={refetch} />
      </div>

      <div>
        <h2 className="section-title">Daftar Laporan</h2>
        
        {!isLoading && !error && (
          <ul className="complaint-list">
            {complaints.length === 0 ? (
              <p className="help-text">Belum ada laporan complaint.</p>
            ) : (
              complaints.map((c) => (
                <li key={c.id} className="complaint-list-item">
                  <span>Laporan ID: {c.id}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => complaintService.downloadPdf(c.id)}
                      className="btn-download"
                    >
                      Download PDF
                    </button>
                    {/* Tombol Hapus[cite: 1, 6] */}
                    <button 
                      onClick={() => handleDelete(c.id)}
                      className="btn-danger"
                      style={{ margin: 0, width: 'auto', padding: '8px 16px' }}
                    >
                      Hapus
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}