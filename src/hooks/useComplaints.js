import { useState, useEffect, useCallback } from 'react';
import { complaintService } from '../services/complaintService';
import { buildComplaintFormData } from '../utils/complaintHelper';

export const useComplaints = (projectId) => {
  const [complaintReport, setComplaintReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchComplaintReport = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await complaintService.getComplaintsByProject(projectId);
      // We assume 1 Project = 1 Complaint Report
      if (data && data.length > 0) {
        setComplaintReport(data[0]);
      } else {
        setComplaintReport(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal mengambil data complaint');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchComplaintReport();
  }, [fetchComplaintReport]);

  const saveComplaint = async (newCategories, newFilesMap) => {
    if (!projectId) return;
    
    const formData = await buildComplaintFormData(newCategories, newFilesMap);
    
    try {
      if (complaintReport && complaintReport.id) {
        await complaintService.updateComplaint(complaintReport.id, formData);
      } else {
        await complaintService.createComplaint(projectId, formData);
      }
      await fetchComplaintReport();
      return true;
    } catch (err) {
      console.error(err);
      throw new Error(err.response?.data?.error || 'Gagal menyimpan complaint');
    }
  };

  const deleteComplaintReport = async () => {
    if (!complaintReport || !complaintReport.id) return;
    try {
      await complaintService.deleteComplaint(complaintReport.id);
      await fetchComplaintReport();
    } catch (err) {
      console.error(err);
      throw new Error(err.response?.data?.error || 'Gagal menghapus laporan');
    }
  };

  return {
    complaintReport,
    isLoading,
    error,
    refetch: fetchComplaintReport,
    saveComplaint,
    deleteComplaintReport
  };
};