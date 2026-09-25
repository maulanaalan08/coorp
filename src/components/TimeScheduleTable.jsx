import React from 'react';
import { formatCurrency, formatWeight, formatDate } from '../services/utils';
import { Save, Trash2 } from 'lucide-react';

const DISCIPLINE_BADGE = { INTERIOR: '#a0522d', SIPIL: '#4682b4', GENERAL: '#666' };

const formatDateShort = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

export default function TimeScheduleTable({
  variant = 'input', // 'input' | 'chart'
  items, groupedItems, periods, editDrafts, setEditDrafts, busyItems, handleSaveItemSchedule, handleDeleteItemSchedule
}) {
  const getDraft = (item) => {
    const currentDraft = editDrafts[item.rabItemId] || {};
    return {
      startDate: currentDraft.startDate ?? (item.startDate ? String(item.startDate).slice(0, 10) : ""),
      endDate: currentDraft.endDate ?? (item.endDate ? String(item.endDate).slice(0, 10) : ""),
    };
  };

  const updateDraft = (rabItemId, patch) => {
    setEditDrafts((prev) => ({ ...prev, [rabItemId]: { ...(prev[rabItemId] || {}), ...patch } }));
  };

  const validateDraft = (draft) => {
    if (!draft.startDate || !draft.endDate) return "Tanggal wajib diisi.";
    const start = new Date(draft.startDate);
    const end = new Date(draft.endDate);
    if (end < start) return "Selesai < Mulai.";
    return null;
  };

  if (items.length === 0) {
    return <div className="tsp-empty-state"><p>Belum ada item pekerjaan.</p></div>;
  }

  const isChart = variant === 'chart';

  return (
    <div className="tsp-gantt-scroll">
      <table className="tsp-gantt-table">
        <thead>
          <tr>
            <th className="tsp-sticky-col tsp-col-name">Nama Pekerjaan</th>
            <th className="tsp-sticky-col tsp-col-label">Label</th>
            <th className="tsp-sticky-col tsp-col-unit">Satuan</th>
            <th className="tsp-sticky-col tsp-col-volume">Volume</th>
            <th className="tsp-sticky-col tsp-col-price">Nilai RAP</th>
            <th className="tsp-sticky-col tsp-col-weight">Bobot</th>
            {!isChart && <th className="tsp-sticky-col tsp-col-range">Rentang Tanggal</th>}
            {!isChart && <th className="tsp-sticky-col tsp-col-action">Aksi</th>}
            {isChart && periods.map((p) => {
              return (
                <th key={p.index} className="tsp-week-col" style={{ minWidth: '80px' }}>
                  <div>{p.label}</div>
                  <div className="tsp-week-date">{formatDateShort(p.start)} - {formatDateShort(p.end)}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {groupedItems.map(([groupName, groupItems]) => (
            <React.Fragment key={groupName}>
              <tr className="tsp-group-heading-row">
                <td className="tsp-sticky-col tsp-group-heading" colSpan={isChart ? 6 : 8}>{groupName}</td>
                {isChart && periods.map((p) => <td key={p.index} className="tsp-week-col tsp-group-heading-cell" />)}
              </tr>
              {groupItems.map((item) => {
                const draft = getDraft(item);
                const busy = !!busyItems[item.rabItemId];
                const disabled = item.hasChildren;
                const hasSchedule = item.startDate != null && item.endDate != null;
                const draftErr = validateDraft(draft);

                return (
                  <tr key={item.rabItemId} className={item.hasChildren ? "tsp-parent-row" : ""}>
                    <td className="tsp-sticky-col tsp-col-name">
                      <div className="tsp-name-wrapper">
                        {item.isChild && <span className="tsp-child-indent">↳ </span>}
                        {item.name}
                      </div>
                    </td>
                    <td className="tsp-sticky-col tsp-col-label">
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {(item.workCategoryCode || item.discipline) && (item.workCategoryCode || item.discipline) !== 'GENERAL' && (
                          <span
                            style={{
                              fontSize: '9px',
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: DISCIPLINE_BADGE[item.workCategoryCode || item.discipline] || '#666',
                              color: '#fff',
                            }}
                          >
                            {item.workCategoryCode || item.discipline}
                          </span>
                        )}
                        {item.isByOwner && <span className="tsp-owner-tag">By Owner</span>}
                        {item.isStip && <span className="tsp-stip-tag">Stip</span>}
                      </div>
                    </td>
                    <td className="tsp-sticky-col tsp-col-unit">{item.paymentUnit || "-"}</td>
                    <td className="tsp-sticky-col tsp-col-volume">{item.volume ?? 0}</td>
                    <td className="tsp-sticky-col tsp-col-price">{formatCurrency(item.rapTotalPrice)}</td>
                    <td className="tsp-sticky-col tsp-col-weight">{formatWeight(item.weight)}%</td>
                    
                    {!isChart && (
                      <>
                        <td className="tsp-sticky-col tsp-col-range">
                          {disabled ? <span className="tsp-muted">Tidak dapat diedit</span> : (
                            <div className="tsp-range-inputs" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input type="date" className="tsp-input tsp-date-input" style={{ padding: '6px', fontSize: '11px', flex: 1, minWidth: 0 }} value={draft.startDate} onChange={(e) => updateDraft(item.rabItemId, { startDate: e.target.value })} disabled={busy} />
                              <span style={{ fontSize: '10px', color: '#9ca3af' }}>s/d</span>
                              <input type="date" className="tsp-input tsp-date-input" style={{ padding: '6px', fontSize: '11px', flex: 1, minWidth: 0 }} value={draft.endDate} onChange={(e) => updateDraft(item.rabItemId, { endDate: e.target.value })} disabled={busy} />
                            </div>
                          )}
                          {!disabled && draftErr && <div className="tsp-field-error">{draftErr}</div>}
                        </td>
                        <td className="tsp-sticky-col tsp-col-action">
                          {!disabled && (
                            <div className="tsp-action-buttons">
                              <button 
                                className="tsp-btn tsp-btn-primary tsp-btn-icon" 
                                title="Simpan Jadwal"
                                disabled={busy || !!draftErr || (draft.startDate === (item.startDate ? String(item.startDate).slice(0, 10) : "") && draft.endDate === (item.endDate ? String(item.endDate).slice(0, 10) : ""))}
                                onClick={() => handleSaveItemSchedule(item, draft)}
                              >
                                <Save size={16} />
                              </button>
                              {hasSchedule && (
                                <button 
                                  className="tsp-btn tsp-btn-danger tsp-btn-icon" 
                                  title="Hapus Jadwal"
                                  disabled={busy}
                                  onClick={() => handleDeleteItemSchedule(item)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </>
                    )}

                    {isChart && periods.map((p) => {
                      // Do not hide the row entirely if hasSchedule is false, 
                      // instead just don't render progress block in these cells
                      if (!hasSchedule || item.hasChildren || item.isByOwner) {
                         return <td key={p.index} className="tsp-week-col tsp-empty-cell" />;
                      }

                      const pw = item.periodWeight?.[p.index];
                      const isActive = pw > 0;
                      return (
                        <td key={p.index} className={`tsp-week-col ${isActive ? 'tsp-active-cell' : ''}`}>
                          {isActive && <div className="tsp-progress-block" title={`Bobot: ${formatWeight(pw)}%`} />}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
