import { useState, useEffect, useCallback, useRef } from 'react';
import { surveyService } from '../services/surveyService';
import { createLatestRequestGuard } from './latestRequestGuard';

export const useSurveys = (projectId) => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const guardRef = useRef(null);
  if (!guardRef.current) {
    guardRef.current = createLatestRequestGuard();
  }

  const fetchSurveys = useCallback(async () => {
    const guard = guardRef.current;
    const token = guard.begin(projectId);
    if (!projectId) {
      setSurveys([]);
      return;
    }
    // Kosongkan tampilan saat ganti project supaya tidak memakai data project lama.
    setSurveys([]);
    setLoading(true);
    setError(null);
    try {
      const data = await surveyService.getByProjectId(projectId);
      if (!guard.isCurrent(token, projectId)) return;
      setSurveys(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      if (!guard.isCurrent(token, projectId)) return;
      setError(err.message || 'Gagal memuat data survey');
      setSurveys([]);
    } finally {
      if (guard.isCurrent(token, projectId)) {
        setLoading(false);
      }
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
    return () => {
      guardRef.current.invalidate();
    };
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
