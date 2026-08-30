import React from 'react';
import { useComplaints } from '../hooks/useComplaints';
import { complaintService } from '../services/complaintService';
import ComplaintForm from '../components/ComplaintForm';
import "../styles/Complaint.css"; 

export default function ComplaintPage() {
  const projectId = "123-abc"; 
  
  const { complaints, isLoading, error, refetch } = useComplaints(projectId);

  // Menambahkan fungsi untuk memanggil endpoint DELETE backend[cite: 4, 6]
  const handleDelete = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus laporan ini?")) {
      try {
        await complaintService.deleteComplaint(id);
        refetch();
      } catch (err) {
        alert("Gagal menghapus laporan");
      }
    }
  };

  return (
    <div className="complaint-container">
      <h1 className="page-title">Manajemen Complaint</h1>
      
      <div style={{ marginBottom: '32px' }}>
        <h2 className="section-title">Buat Laporan Baru</h2>
        <ComplaintForm projectId={projectId} onSuccess={refetch} />
      </div>

      <div>
        <h2 className="section-title">Daftar Laporan</h2>
        
        {isLoading && <p className="status-loading">Memuat data...</p>}
        {error && <p className="status-error">{error}</p>}
        
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
                      className="btn-submit"
                      style={{ margin: 0, backgroundColor: '#ef4444', width: 'auto', padding: '8px 16px' }}
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