import React, { useState, useEffect } from 'react';
import styles from '../styles/RabBudgeting.module.css';
import Header from '../components/Header';
import {
  RefreshCw, Trash2, Edit2, Zap, DollarSign, Calculator, Layers, FileSpreadsheet
} from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useRabItems } from '../hooks/useRabItems';
import { hspkService } from '../services/hspkService';

// ================================================================
// MODAL SUNTIK AHSP MASTER / EDIT RAB ITEM
// ================================================================
function EditRabModal({ isOpen, onClose, item, onSuccess }) {
  const [rapUnitPrice, setRapUnitPrice] = useState('');
  const [overheadPercent, setOverheadPercent] = useState('10');
  const [sourceJobTypeId, setSourceJobTypeId] = useState('');
  const [jobTypes, setJobTypes] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [mode, setMode] = useState('manual'); // 'manual' or 'ahsp'
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && item) {
      setRapUnitPrice(item.rapUnitPrice != null ? String(item.rapUnitPrice) : '');
      setOverheadPercent(item.overheadPercent != null ? String(item.overheadPercent) : '10');
      setSourceJobTypeId(item.sourceJobTypeId || '');
      setMode(item.sourceJobTypeId ? 'ahsp' : 'manual');
      setError(null);

      setLoadingMaster(true);
      hspkService.getJobTypes({ limit: 100 })
        .then(res => setJobTypes(Array.isArray(res) ? res : res?.data || []))
        .catch(() => {})
        .finally(() => setLoadingMaster(false));
    }
  }, [isOpen, item]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!item) return;
    setSaving(true);
    setError(null);

    try {
      const { rabService } = await import('../services/rabService');
      if (mode === 'ahsp' && sourceJobTypeId) {
        // Suntik harga master AHSP
        await rabService.switchJob(item.id, sourceJobTypeId, overheadPercent ? parseFloat(overheadPercent) : undefined);
      } else {
        // Update manual harga modal RAP & Overhead
        await rabService.update(item.id, {
          rapUnitPrice: parseFloat(rapUnitPrice || 0),
          overheadPercent: parseFloat(overheadPercent || 0),
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Gagal memperbarui harga RAB');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !item) return null;

  const currentVol = Number(item.volume || 0);
  const currentRap = parseFloat(rapUnitPrice || 0);
  const currentOverhead = parseFloat(overheadPercent || 0);
  const calculatedRabUnit = currentRap + (currentRap * (currentOverhead / 100));
  const calculatedRabTotal = calculatedRabUnit * currentVol;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox}>
        <div className={styles.modalHeader}>
          <h3>Set / Suntik Harga RAB — {item.name}</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: 10, borderRadius: 4 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <button
                type="button"
                className={mode === 'manual' ? styles.btnGold : styles.btnOutline}
                onClick={() => setMode('manual')}
                style={{ flex: 1, padding: 8 }}
              >
                Input Manual Harga Modal
              </button>
              <button
                type="button"
                className={mode === 'ahsp' ? styles.btnGold : styles.btnOutline}
                onClick={() => setMode('ahsp')}
                style={{ flex: 1, padding: 8 }}
              >
                Suntik AHSP Master HSPK
              </button>
            </div>

            {mode === 'ahsp' ? (
              <div className={styles.formGroup}>
                <label>PILIH MASTER PEKERJAAN AHSP</label>
                <select
                  value={sourceJobTypeId}
                  onChange={(e) => setSourceJobTypeId(e.target.value)}
                  style={{ padding: 12, background: '#1d1810', color: '#f2ead9', border: '1px solid #322b1e', borderRadius: 4 }}
                >
                  <option value="">— Pilih AHSP Master —</option>
                  {jobTypes.map(j => (
                    <option key={j.id} value={j.id}>
                      [{j.code || 'AHSP'}] {j.name} — Rp {Number(j.unitPrice || 0).toLocaleString('id-ID')}/{j.paymentUnit}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className={styles.formGroup}>
                <label>HARGA SATUAN RAP (MODAL/HPP PER {item.paymentUnit})</label>
                <input
                  type="number"
                  placeholder="Contoh: 150000"
                  value={rapUnitPrice}
                  onChange={(e) => setRapUnitPrice(e.target.value)}
                />
              </div>
            )}

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>OVERHEAD & PROFIT (%)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="10"
                  value={overheadPercent}
                  onChange={(e) => setOverheadPercent(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>VOLUME TERLINK</label>
                <input
                  type="text"
                  disabled
                  value={`${currentVol.toLocaleString('id-ID')} ${item.paymentUnit || ''}`}
                  style={{ background: '#221e15' }}
                />
              </div>
            </div>

            {/* PREVIEW HARGA */}
            <div style={{ background: '#1d1810', border: '1px solid #322b1e', padding: 14, borderRadius: 4 }}>
              <span style={{ fontSize: '0.72rem', color: '#7d6733', fontFamily: 'JetBrains Mono, monospace' }}>KALKULASI HARGA JUAL (RAB)</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#a89c85' }}>Harga Satuan RAB:</span>
                  <p style={{ margin: 0, fontWeight: 700, color: '#e8c874' }}>
                    Rp {calculatedRabUnit.toLocaleString('id-ID', { maximumFractionDigits: 0 })} / {item.paymentUnit || 'unit'}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#a89c85' }}>Total Harga RAB:</span>
                  <p style={{ margin: 0, fontWeight: 700, color: '#e8c874' }}>
                    Rp {calculatedRabTotal.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </div>

            {/* RINCIAN KOMPONEN BAHAN JIKA ADA */}
            {item.components?.length > 0 && (
              <div>
                <span style={{ fontSize: '0.75rem', color: '#7d6733', fontWeight: 600 }}>RINCIAN KOMPONEN AHSP TERLINK ({item.components.length} KOMPONEN)</span>
                <table className={styles.compTable}>
                  <thead>
                    <tr>
                      <th>Komponen</th>
                      <th>Kategori</th>
                      <th>Koef.</th>
                      <th>Harga Satuan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.components.map((c, ci) => (
                      <tr key={ci}>
                        <td>{c.name}</td>
                        <td style={{ textTransform: 'uppercase', color: '#a89c85' }}>{c.section}</td>
                        <td>{c.coefficient}</td>
                        <td>Rp {Number(c.unitPrice || 0).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnOutline} onClick={onClose} disabled={saving}>Batal</button>
            <button type="submit" className={styles.btnGold} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Harga RAB'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ================================================================
// KOMPONEN UTAMA — RAB BUDGETING PAGE
// ================================================================
export default function RabBudgeting() {
  const { projects, loading: loadingProjects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const { rabItems, loading: loadingRab, error: rabError, refresh, deleteRabItem } = useRabItems(selectedProjectId);

  const [editItem, setEditItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleOpenEdit = (item) => {
    setEditItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Hapus item RAB "${name}"?`)) return;
    try {
      await deleteRabItem(id);
    } catch (err) {
      alert(err.message);
    }
  };

  // Kalkulasi total RAP & RAB
  const totalRapSum = rabItems.reduce((acc, i) => acc + Number(i.rapTotalPrice || 0), 0);
  const totalRabSum = rabItems.reduce((acc, i) => acc + Number(i.rabTotalPrice || 0), 0);
  const totalProfitSum = totalRabSum - totalRapSum;

  return (
    <div className={styles.wrapper}>
      <Header />

      {/* HEADER PAGE */}
      <div className={styles.pageHeader}>
        <div className={styles.titleBlock}>
          <h2>RAB & BUDGETING</h2>
          <p>Kelola Rencana Anggaran Biaya (RAB) dan Rencana Anggaran Pelaksanaan (RAP) project.</p>
        </div>
      </div>

      {/* PROJECT SELECTOR */}
      <div className={styles.projectSelector}>
        <div className={styles.selectorLabel}>PILIH PROJECT</div>
        <select
          className={styles.selectProject}
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
        >
          <option value="">— Pilih Project —</option>
          {loadingProjects ? (
            <option disabled>Memuat projects...</option>
          ) : (
            projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.client?.name || '-'} ({p.discipline} {p.hspkPeriod})
              </option>
            ))
          )}
        </select>
      </div>

      {/* STATS SUMMARY */}
      {selectedProjectId && (
        <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <p className={styles.statNum}>{rabItems.length}</p>
            <p className={styles.statLbl}>Total Item Pekerjaan</p>
          </div>
          <div className={styles.statBox}>
            <p className={styles.statNum}>Rp {totalRapSum.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</p>
            <p className={styles.statLbl}>Total RAP (Modal / HPP)</p>
          </div>
          <div className={styles.statBox}>
            <p className={styles.statNum}>Rp {totalRabSum.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</p>
            <p className={styles.statLbl}>Total RAB (Harga Jual)</p>
          </div>
          <div className={styles.statBox}>
            <p className={styles.statNum} style={{ color: totalProfitSum >= 0 ? '#10b981' : '#ef4444' }}>
              Rp {totalProfitSum.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
            </p>
            <p className={styles.statLbl}>Estimasi Margin / Profit</p>
          </div>
        </div>
      )}

      {/* RAB TABLE */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <div className={styles.titleAccent} />
            <h3>Rincian Anggaran — {selectedProject?.name || 'Project'}</h3>
          </div>
          {selectedProjectId && (
            <button className={styles.btnOutline} onClick={refresh}>
              <RefreshCw size={14} /> Refresh Data
            </button>
          )}
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>NO</th>
                <th>ITEM PEKERJAAN</th>
                <th>VOLUME</th>
                <th>SATUAN</th>
                <th>RAP SATUAN</th>
                <th>OVERHEAD %</th>
                <th>RAB SATUAN</th>
                <th>TOTAL RAB (RP)</th>
                <th>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {!selectedProjectId ? (
                <tr>
                  <td colSpan={9} className={styles.noData}>
                    Pilih project untuk menampilkan rincian RAB & Budgeting.
                  </td>
                </tr>
              ) : loadingRab ? (
                <tr>
                  <td colSpan={9} className={styles.noData}>
                    <RefreshCw size={18} style={{ display: 'inline', marginRight: 8 }} /> Memuat data RAB...
                  </td>
                </tr>
              ) : rabError ? (
                <tr>
                  <td colSpan={9} className={styles.noData} style={{ color: '#ef4444' }}>
                    {rabError}
                  </td>
                </tr>
              ) : rabItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className={styles.noData}>
                    Belum ada item RAB untuk project ini. Buka halaman <strong>BackUp Volume (BV)</strong> lalu gunakan tombol <em>"Link to RAB"</em> untuk memasukkan pekerjaan ke RAB.
                  </td>
                </tr>
              ) : (
                rabItems.map((item, idx) => {
                  const isHeader = item.isHeaderOnly;
                  const rapSatuan = Number(item.rapUnitPrice || 0);
                  const rabSatuan = Number(item.rabUnitPrice || 0);
                  const totalRab = Number(item.rabTotalPrice || 0);

                  return (
                    <tr key={item.id} className={isHeader ? styles.headerRow : ''}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: isHeader ? 700 : 400 }}>
                        {item.name}
                        {item.sourceJobTypeId && (
                          <span style={{ display: 'inline-block', marginLeft: 8, fontSize: '0.68rem', padding: '2px 6px', background: '#221e15', color: '#e8c874', border: '1px solid #7d6733', borderRadius: 3 }}>
                            AHSP Master
                          </span>
                        )}
                      </td>
                      <td>{isHeader ? '-' : Number(item.volume || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</td>
                      <td>{isHeader ? '-' : (item.paymentUnit || '-')}</td>
                      <td>{isHeader ? '-' : `Rp ${rapSatuan.toLocaleString('id-ID')}`}</td>
                      <td>{isHeader ? '-' : `${item.overheadPercent ?? 10}%`}</td>
                      <td style={{ color: '#e8c874', fontWeight: 600 }}>
                        {isHeader ? '-' : `Rp ${rabSatuan.toLocaleString('id-ID')}`}
                      </td>
                      <td style={{ color: '#c9a24b', fontWeight: 700 }}>
                        {isHeader ? '-' : `Rp ${totalRab.toLocaleString('id-ID')}`}
                      </td>
                      <td>
                        <div className={styles.actionsCell}>
                          {!isHeader && (
                            <button
                              className={styles.btnIcon}
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              title="Set / Suntik Harga AHSP"
                            >
                              <Zap size={13} /> Harga
                            </button>
                          )}
                          <button
                            className={styles.btnDanger}
                            type="button"
                            onClick={() => handleDelete(item.id, item.name)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL MOUNTING */}
      <EditRabModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={editItem}
        onSuccess={refresh}
      />
    </div>
  );
}
