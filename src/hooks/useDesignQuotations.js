import { useState, useEffect, useCallback } from 'react';
import { designQuotationService } from '../services/designQuotationService';

export const useDesignQuotations = (projectId) => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchQuotations = useCallback(async () => {
    if (!projectId) {
      setQuotations([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await designQuotationService.getByProjectId(projectId);
      setQuotations(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat penawaran desain');
      setQuotations([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createQuotation = useCallback(
    async (payload) => {
      const result = await designQuotationService.create(projectId, payload);
      await fetchQuotations();
      return result;
    },
    [projectId, fetchQuotations],
  );

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  return { quotations, loading, error, refresh: fetchQuotations, createQuotation };
};
