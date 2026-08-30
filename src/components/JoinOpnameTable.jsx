import React from 'react';
import { formatCurrency, formatNumber, formatPercent, formatDate } from '../services/utils';
import { Save } from 'lucide-react';

export default function JoinOpnameTable({ groupedItems, progressInputs, busyItems, selectedDate, handleProgressChange, handleFileChange, handleSaveProgress }) {
  return (
    <div className="jo-table-wrapper">
      <table className="jo-table">
        <thead>
          <tr>
            <th>Group</th>
            <th>Pekerjaan</th>
            <th>Satuan</th>
            <th>Volume</th>
            <th>Nilai RAB</th>
            <th>Bobot</th>
            <th>Progress Rekap</th>
            <th>Status</th>
            <th className="jo-input-column">Progress {formatDate(selectedDate)}</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {groupedItems.map(([groupName, groupItems]) => (
            <React.Fragment key={groupName}>
              <tr className="jo-group-row">
                <td colSpan={10}>{groupName}</td>
              </tr>
              {groupItems.map((item) => {
                const inputData = progressInputs[item.rabItemId] || { percent: "0", file: null, existingPhotoUrl: null };
                const busy = !!busyItems[item.rabItemId];

                return (
                  <tr key={item.rabItemId}>
                    <td>{item.groupName || "-"}</td>
                    <td className="jo-name-cell">
                      {item.name}
                      {item.isByOwner && <span className="jo-tag jo-tag-owner">By Owner</span>}
                      {item.isStip && <span className="jo-tag jo-tag-stip">Stip</span>}
                      {item.hasChildren && <span className="jo-tag jo-tag-parent">Parent</span>}
                    </td>
                    <td>{item.paymentUnit || "-"}</td>
                    <td>{formatNumber(item.volume)}</td>
                    <td>{formatCurrency(item.rabTotalPrice)}</td>
                    <td>{formatPercent(item.weight)}%</td>
                    <td><strong>{formatPercent(item.rekapProgress)}%</strong></td>
                    <td>
                      <span className={`jo-status jo-status-${(item.status || "").toLowerCase().replace(/\s+/g, "-")}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="jo-input-cell">
                      {item.hasChildren ? (
                        <span className="jo-muted">Parent</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div className="jo-progress-input-wrapper">
                            <input
                              type="number" min="0" max="100" step="0.01"
                              value={inputData.percent}
                              onChange={(e) => handleProgressChange(item.rabItemId, e.target.value)}
                              disabled={busy}
                              className="jo-progress-input"
                            />
                            <span>%</span>
                          </div>
                          {/* File input untuk foto progres */}
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => handleFileChange(item.rabItemId, e.target.files[0])}
                            disabled={busy}
                            style={{ fontSize: '10px' }}
                          />
                          {inputData.existingPhotoUrl && (
                            <a href={`http://localhost:4000${inputData.existingPhotoUrl}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', color: '#b9a35a' }}>
                              Lihat Foto Aktual
                            </a>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {!item.hasChildren && (
                        <button
                          type="button"
                          className="jo-btn jo-btn-save"
                          onClick={() => handleSaveProgress(item)}
                          disabled={busy}
                          title="Simpan"
                          style={{ padding: '6px' }}
                        >
                          {busy ? "..." : <Save size={14} />}
                        </button>
                      )}
                    </td>
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