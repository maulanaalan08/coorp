import { useCallback, useState } from 'react';
import { fetchAPI } from '../services/api';

export function useBvRabHistory(projectId, module = 'ALL') {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!projectId) {
      setEntries([]);
      return [];
    }
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ module, limit: '75' });
      const data = await fetchAPI(`/projects/${projectId}/bv-rab-history?${query}`);
      const rows = Array.isArray(data) ? data : [];
      setEntries(rows);
      return rows;
    } catch (err) {
      setError(err.message || 'Gagal memuat riwayat.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [projectId, module]);

  const undo = useCallback(async (id) => {
    await fetchAPI(`/bv-rab-history/${id}/undo`, { method: 'POST' });
    await refresh();
  }, [refresh]);

  return { entries, loading, error, refresh, undo };
}
