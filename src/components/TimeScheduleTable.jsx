import React from 'react';
import { formatCurrency, formatWeight, formatDate } from '../services/utils';
import { Save, Trash2 } from 'lucide-react';

export default function TimeScheduleTable({
  items, groupedItems, weekRange, weekDates, editDrafts, setEditDrafts, busyItems, handleSaveItemSchedule, handleDeleteItemSchedule
}) {
  const getDraft = (item) => {
    const currentDraft = editDrafts[item.rabItemId] || {};
    return {
      startWeek: currentDraft.startWeek ?? (item.startWeek != null ? String(item.startWeek) : ""),
      endWeek: currentDraft.endWeek ?? (item.endWeek != null ? String(item.endWeek) : ""),
    };
  };

  const updateDraft = (rabItemId, patch) => {
    setEditDrafts((prev) => ({ ...prev, [rabItemId]: { ...(prev[rabItemId] || {}), ...patch } }));
  };

  const validateDraft = (draft) => {
    const start = Number(draft.startWeek);
    const end = Number(draft.endWeek);
    if (!Number.isInteger(start) || !Number.isInteger(end)) return "Wajib angka bulat.";
    if (start < 1) return "Min. minggu 1.";
    if (end < start) return "Selesai < Mulai.";
    return null;
  };

  if (items.length === 0) {
    return <div className="tsp-empty-state"><p>Belum ada item pekerjaan.</p></div>;
  }

  return (
    <div className="tsp-gantt-scroll">
      <table className="tsp-gantt-table">
        <thead>
          <tr>
            <th className="tsp-sticky-col tsp-col-name">Nama Pekerjaan</th>
            <th className="tsp-col-unit">Satuan</th>
            <th className="tsp-col-volume">Volume</th>
            <th className="tsp-col-price">Nilai RAB</th>
            <th className="tsp-col-weight">Bobot</th>
            <th className="tsp-sticky-col tsp-col-range">Rentang Minggu</th>
            <th className="tsp-sticky-col tsp-col-action">Aksi</th>
            {weekRange.map((w) => {
              const wd = weekDates.find((x) => x.week === w);
              return (
                <th key={w} className="tsp-week-col">
                  <div>Minggu {w}</div>
                  {wd && (wd.start || wd.end) && <div className="tsp-week-date">{formatDate(wd.start)} - {formatDate(wd.end)}</div>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {groupedItems.map(([groupName, groupItems]) => (
            <React.Fragment key={groupName}>
              <tr className="tsp-group-heading-row">
                <td className="tsp-sticky-col tsp-group-heading" colSpan={7}>{groupName}</td>
                {weekRange.map((w) => <td key={w} className="tsp-week-col tsp-group-heading-cell" />)}
              </tr>
              {groupItems.map((item) => {
                const draft = getDraft(item);
                const busy = !!busyItems[item.rabItemId];
                const disabled = item.hasChildren;
                const hasSchedule = item.startWeek != null && item.endWeek != null;
                const draftErr = validateDraft(draft);

                return (
                  <tr key={item.rabItemId} className={item.hasChildren ? "tsp-parent-row" : ""}>
                    <td className="tsp-sticky-col tsp-col-name">
                      <div className="tsp-name-wrapper">
                        {item.isChild && <span className="tsp-child-indent">↳ </span>}
                        {item.name}
                        {item.isByOwner && <span className="tsp-owner-tag">By Owner</span>}
                        {item.isStip && <span className="tsp-stip-tag">Stip</span>}
                      </div>
                    </td>
                    <td className="tsp-col-unit">{item.paymentUnit || "-"}</td>
                    <td className="tsp-col-volume">{item.volume ?? 0}</td>
                    <td className="tsp-col-price">{formatCurrency(item.rabTotalPrice)}</td>
                    <td className="tsp-col-weight">{formatWeight(item.weight)}%</td>
                    <td className="tsp-sticky-col tsp-col-range">
                      {disabled ? <span className="tsp-muted">Tidak dapat diedit</span> : (
                        <div className="tsp-range-inputs">
                          <input type="number" min={1} className="tsp-week-input" value={draft.startWeek} onChange={(e) => updateDraft(item.rabItemId, { startWeek: e.target.value })} disabled={busy} />
                          <span>-</span>
                          <input type="number" min={1} className="tsp-week-input" value={draft.endWeek} onChange={(e) => updateDraft(item.rabItemId, { endWeek: e.target.value })} disabled={busy} />
                        </div>
                      )}
                      {!disabled && draftErr && <div className="tsp-field-error">{draftErr}</div>}
                    </td>
                    <td className="tsp-sticky-col tsp-col-action">
                      {!disabled && (
                        <div className="tsp-action-buttons" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <button className="tsp-btn tsp-btn-primary tsp-btn-sm" style={{ padding: '6px' }} onClick={() => handleSaveItemSchedule(item, draft)} disabled={busy} title="Simpan">
                            <Save size={14} />
                          </button>
                          {hasSchedule && (
                            <button className="tsp-btn tsp-btn-danger tsp-btn-sm" style={{ padding: '6px' }} onClick={() => handleDeleteItemSchedule(item)} disabled={busy} title="Hapus">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    {weekRange.map((w) => {
                      const inRange = hasSchedule && w >= item.startWeek && w <= item.endWeek;
                      return (
                        <td key={w} className="tsp-week-col">
                          {inRange && <div className={`tsp-bar ${item.hasChildren ? "tsp-bar-parent" : ""}`} title={`${item.name} — Minggu ${w}`} />}
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