import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, GitCompare, LockKeyhole, RotateCcw, Send, X } from 'lucide-react';
import { fetchAPI } from '../services/api';

const STATUS_TEXT = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Menunggu review',
  APPROVED: 'Disetujui',
  CHANGES_REQUESTED: 'Perlu revisi',
};

function readRole() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')?.role || '';
  } catch {
    return '';
  }
}

export default function BvRabApprovalBar({ projectId, onStateChange, onLockedChange }) {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadedProjectId, setLoadedProjectId] = useState(null);
  const requestIdRef = useRef(0);
  const projectIdRef = useRef(projectId);
  const role = readRole();

  projectIdRef.current = projectId;

  const refresh = useCallback(async (targetProjectId = projectId) => {
    const requestId = ++requestIdRef.current;
    if (!targetProjectId) {
      setCurrent(null);
      setHistory([]);
      setDiff(null);
      setLoadedProjectId(null);
      onStateChange?.(null);
      onLockedChange?.(false);
      return;
    }
    setLoading(true);
    onLockedChange?.(true);
    try {
      const data = await fetchAPI(`/projects/${targetProjectId}/bv-rab-approval`);
      if (requestId !== requestIdRef.current || projectIdRef.current !== targetProjectId) return;
      const active = data?.current || null;
      setCurrent(active);
      setHistory(data?.history || []);
      setLoadedProjectId(targetProjectId);
      onStateChange?.(active);
      onLockedChange?.(['PENDING_REVIEW', 'APPROVED'].includes(active?.status));
    } catch (error) {
      if (requestId === requestIdRef.current && projectIdRef.current === targetProjectId) {
        toast.error(error.message || 'Gagal memuat status approval.');
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [projectId, onStateChange, onLockedChange]);

  useEffect(() => {
    setCurrent(null);
    setHistory([]);
    setDiff(null);
    setLoadedProjectId(null);
    setLoading(true);
    setBusy(false);
    onStateChange?.(null);
    onLockedChange?.(Boolean(projectId));
    refresh(projectId);
    return () => {
      requestIdRef.current += 1;
    };
  }, [projectId, refresh]);

  const run = async (path, options, success, forProjectId = projectId) => {
    setBusy(true);
    try {
      await fetchAPI(path, options);
      toast.success(success);
      setDiff(null);
      if (projectIdRef.current === forProjectId) {
        await refresh(forProjectId);
      }
    } catch (error) {
      toast.error(error.message || 'Proses approval gagal.');
    } finally {
      setBusy(false);
    }
  };

  const actionReady = loadedProjectId === projectId && !loading;
  const actionProjectId = actionReady ? loadedProjectId : null;

  const submit = () => {
    if (!actionProjectId || !['DRAFT', 'CHANGES_REQUESTED'].includes(current?.status || 'DRAFT')) return;
    return run(
      `/projects/${actionProjectId}/bv-rab-approval/submit`,
      { method: 'POST', body: JSON.stringify({ expectedVersion: current?.version || 1 }) },
      'BV/RAB dikirim untuk review.',
      actionProjectId,
    );
  };

  const decide = (decision) => {
    if (!actionProjectId || current?.status !== 'PENDING_REVIEW' || !['OWNER', 'ADMIN'].includes(role)) return;
    let comment;
    if (decision === 'CHANGES_REQUESTED') {
      comment = window.prompt('Tuliskan catatan revisi:');
      if (!comment?.trim()) return;
    }
    return run(
      `/projects/${actionProjectId}/bv-rab-approval/decision`,
      { method: 'POST', body: JSON.stringify({ decision, comment, expectedVersion: current.version }) },
      decision === 'APPROVED' ? 'BV/RAB disetujui dan baseline disimpan.' : 'Revisi telah diminta.',
      actionProjectId,
    );
  };

  const createRevision = () => {
    if (!actionProjectId || current?.status !== 'APPROVED') return;
    return run(
      `/projects/${actionProjectId}/bv-rab-approval/revisions`,
      { method: 'POST', body: JSON.stringify({}) },
      'Revisi baru dibuat. Data dapat diedit kembali.',
      actionProjectId,
    );
  };

  const loadDiff = async () => {
    if (!actionProjectId || busy) return;
    const requestedProjectId = actionProjectId;
    setBusy(true);
    try {
      const data = await fetchAPI(`/projects/${requestedProjectId}/bv-rab-approval/baseline/diff`);
      if (projectIdRef.current === requestedProjectId && loadedProjectId === requestedProjectId) {
        setDiff(data?.diff || null);
      }
    } catch (error) {
      if (projectIdRef.current === requestedProjectId) {
        toast.error(error.message || 'Gagal membandingkan baseline.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (!projectId) return null;
  const status = current?.status || 'DRAFT';
  const version = current?.version || 1;
  const canSubmit = actionReady && ['DRAFT', 'CHANGES_REQUESTED'].includes(status);
  const canReview = actionReady && ['OWNER', 'ADMIN'].includes(role) && status === 'PENDING_REVIEW';
  const canRevise = actionReady && status === 'APPROVED';
  const latestApproved = actionReady
    ? history.find((entry) => entry.status === 'APPROVED' && entry.baselineAvailable)
    : null;
  const locked = ['PENDING_REVIEW', 'APPROVED'].includes(status);

  const counts = actionReady && diff ? {
    bv: diff.bv.added.length + diff.bv.changed.length + diff.bv.removed.length,
    rab: diff.rab.added.length + diff.rab.changed.length + diff.rab.removed.length,
  } : null;

  return (
    <section style={{ border: '1px solid var(--border, #d8dee9)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, background: 'var(--card, #fff)' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {locked ? <LockKeyhole size={16} /> : <Check size={16} />}
        <strong>Approval BV/RAB</strong>
        <span style={{ padding: '3px 8px', borderRadius: 999, background: locked ? '#fff3cd' : '#e8f5e9', fontSize: 12 }}>
          {!actionReady ? 'Memuat…' : STATUS_TEXT[status]}
        </span>
        <span style={{ color: '#6b7280', fontSize: 12 }}>Revisi {current?.revision || 1} · versi {version}</span>

        <span style={{ flex: 1 }} />
        {canSubmit && (
          <button type="button" disabled={busy || !actionReady} onClick={submit}>
            <Send size={14} /> Ajukan Review
          </button>
        )}
        {canReview && (
          <>
            <button type="button" disabled={busy || !actionReady} onClick={() => decide('APPROVED')}>
              <Check size={14} /> Setujui
            </button>
            <button type="button" disabled={busy || !actionReady} onClick={() => decide('CHANGES_REQUESTED')}>
              <X size={14} /> Minta Revisi
            </button>
          </>
        )}
        {canRevise && (
          <button type="button" disabled={busy || !actionReady} onClick={createRevision}>
            <RotateCcw size={14} /> Buat Revisi
          </button>
        )}
        {latestApproved && (
          <button type="button" disabled={busy || !actionReady} onClick={loadDiff}>
            <GitCompare size={14} /> Bandingkan Baseline
          </button>
        )}
      </div>

      {current?.reviewComment && (
        <div style={{ marginTop: 8, color: '#92400e', fontSize: 13 }}>
          Catatan review: {current.reviewComment}
        </div>
      )}
      {locked && (
        <div style={{ marginTop: 6, color: '#6b7280', fontSize: 12 }}>
          {status === 'PENDING_REVIEW'
            ? 'Data BV/RAB dikunci sementara sampai reviewer memberi keputusan.'
            : 'Baseline resmi tersimpan. Klik Buat Revisi sebelum melakukan perubahan baru.'}
        </div>
      )}
      {counts && (
        <div style={{ marginTop: 8, fontSize: 13 }}>
          Perubahan dari baseline: <strong>{counts.bv} BV</strong> · <strong>{counts.rab} RAB</strong>
        </div>
      )}
    </section>
  );
}