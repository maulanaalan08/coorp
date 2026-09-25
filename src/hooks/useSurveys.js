import { useState, useEffect, useCallback } from 'react';
import { surveyService } from '../services/surveyService';

export const useSurveys = (projectId) => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSurveys = useCallback(async () => {
    if (!projectId) {
      setSurveys([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await surveyService.getByProjectId(projectId);
      setSurveys(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat data survey');
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createSurvey = useCallback(async (formData) => {
    try {
      const result = await surveyService.create(projectId, formData);
      await fetchSurveys();
      return result;
    } catch (err) {
      throw new Error(err.message || 'Gagal menyimpan survey');
    }
  }, [projectId, fetchSurveys]);

  const updateSurvey = useCallback(async (surveyId, formData) => {
    try {
      const result = await surveyService.update(surveyId, formData);
      await fetchSurveys();
      return result;
    } catch (err) {
      throw new Error(err.message || 'Gagal memperbarui survey');
    }
  }, [fetchSurveys]);

  const deleteSurvey = useCallback(async (surveyId) => {
    try {
      await surveyService.delete(surveyId);
      await fetchSurveys();
    } catch (err) {
      throw new Error(err.message || 'Gagal menghapus survey');
    }
  }, [fetchSurveys]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  return {
    surveys,
    loading,
    error,
    refresh: fetchSurveys,
    createSurvey,
    updateSurvey,
    deleteSurvey,
  };
};
