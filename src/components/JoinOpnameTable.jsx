import React from 'react';
import { formatCurrency, formatNumber, formatPercent, formatDate } from '../services/utils';
import { Save, Image } from 'lucide-react';

const DISCIPLINE_BADGE = { INTERIOR: '#a0522d', SIPIL: '#4682b4', GENERAL: '#666' };

export default function JoinOpnameTable({ groupedItems, progressInputs, busyItems, selectedDate, handleProgressChange, handleFileChange, handleSaveProgress }) {
  return (
    <div className="jo-table-wrapper">
      <table className="jo-table">
        <thead>
          <tr>
            <th>Label</th>
            <th>Pekerjaan</th>
            <th>Satuan</th>
            <th>Volume</th>
            <th>Nilai RAP</th>
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
                const inputData = progressInputs[item.rabItemId] || { percent: "0", files: null, existingPhotoUrls: [] };
                const busy = !!busyItems[item.rabItemId];

                return (
                  <tr key={item.rabItemId}>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '10px' }}>
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
                              fontWeight: 600,
                            }}
                          >
                            {item.workCategoryCode || item.discipline}
                          </span>
                        )}
                        {(item.workSubCategoryCode || item.workSubCategoryName || item.workSubCategory?.code || item.workSubCategory?.name) && !item.hasChildren && (
                          <span
                            style={{
                              fontSize: '9px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#23201b',
                              color: '#d4af37',
                              border: '1px solid #4a4231',
                              fontWeight: 600,
                            }}
                            title={`Sub Label: ${item.workSubCategoryName || item.workSubCategoryCode || item.workSubCategory?.name || item.workSubCategory?.code}`}
                          >
                            {item.workSubCategoryCode || item.workSubCategoryName || item.workSubCategory?.code || item.workSubCategory?.name}
                          </span>
                        )}
                        {item.isByOwner && <span className="tsp-owner-tag">By Owner</span>}
                        {item.isStip && <span className="tsp-stip-tag">Stip</span>}
                        {!item.workCategoryCode && !item.discipline && !(item.workSubCategoryCode || item.workSubCategoryName || item.workSubCategory) && !item.isByOwner && !item.isStip && "-"}
                      </div>
                    </td>
                    <td className="jo-name-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {item.isChild && <span style={{ color: '#9ca3af' }}>↳ </span>}
                        <span>{item.name}</span>
                        {item.hasChildren && <span className="jo-tag jo-tag-parent">Parent</span>}
                      </div>
                    </td>
                    <td>{item.paymentUnit || "-"}</td>
                    <td>{formatNumber(item.volume)}</td>
                    <td className="jo-sticky-col jo-col-price">{formatCurrency(item.rapTotalPrice)}</td>
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
                              type="number" max="100" step="0.01"
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
                            multiple
                            accept="image/*" 
                            onChange={(e) => handleFileChange(item.rabItemId, e.target.files)}
                            disabled={busy}
                            style={{ fontSize: '10px' }}
                          />
                          {inputData.existingPhotoUrls && inputData.existingPhotoUrls.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {inputData.existingPhotoUrls.map((url, i) => (
                                <a 
                                  key={i}
                                  href={`http://localhost:4000${url}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="jo-btn jo-btn-secondary"
                                  style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '4px', 
                                    padding: '2px 6px', 
                                    fontSize: '10px', 
                                    marginTop: '4px',
                                    textDecoration: 'none'
                                  }}
                                >
                                  <Image size={12} />
                                  Foto {i + 1}
                                </a>
                              ))}
                            </div>
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