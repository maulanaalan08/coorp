import { useState, useEffect, useCallback } from 'react';
import { complaintService } from '../services/complaintService';

export const useComplaints = (projectId) => {
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Gunakan useCallback agar fungsi tidak dirender ulang terus-menerus
  const fetchComplaints = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await complaintService.getComplaintsByProject(projectId);
      setComplaints(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal mengambil data complaint');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Otomatis fetch data saat projectId tersedia/berubah
  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  return {
    complaints,
    isLoading,
    error,
    refetch: fetchComplaints
  };
};