import React, { useState } from 'react';
import styles from '../styles/BackUpVolume.module.css';
import Header from '../components/Header';
import { 
  ArrowLeft, Plus, ChevronDown, ChevronUp, Edit2, Trash2, 
  Save, Upload, ShoppingCart, Link as LinkIcon 
} from 'lucide-react';

import ModalTambahBaris from '../components/ModalTambahBaris';
import ModalTambahGroup from '../components/ModalTambahGroup';
import ModalTambahSubGroup from '../components/ModalTambahSubGroup';

export default function BackUpVolume() {
  const [openGroup, setOpenGroup] = useState(true);
  
  // State Modal Controls
  const [isBarisModalOpen, setIsBarisModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isSubGroupModalOpen, setIsSubGroupModalOpen] = useState(false);

  return (
    <div className={styles.bvWrapper}>
      <Header />

      {/* Header Title Section */}
      <div>
        <button className={styles.backLink}>
          <ArrowLeft size={14} /> Back to RAB Financial View
        </button>
        <div className={styles.bvHeader}>
          <div className={styles.headerTitle}>
            <h2>BV — BACK UP VOLUME</h2>
            <p>Citra Harmony (HSPK 2027) — Interior Grade B</p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.btnGold} onClick={() => setIsGroupModalOpen(true)}>
              <Plus size={16} /> Tambah Group Pekerjaan
            </button>
            <button className={styles.btnOutline} onClick={() => setIsSubGroupModalOpen(true)}>
              <Plus size={16} /> Tambah Sub-Group
            </button>
            <button className={styles.btnOutline} onClick={() => setIsBarisModalOpen(true)}>
              <Plus size={16} /> Tambah Baris Pekerjaan
            </button>
          </div>
        </div>
      </div>

      {/* Group I Pekerjaan Persiapan */}
      <div className={styles.groupCard}>
        <div className={styles.groupHeader} onClick={() => setOpenGroup(!openGroup)}>
          <div className={styles.groupTitle}>
            {openGroup ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            <span>I. PEKERJAAN PERSIAPAN</span>
          </div>
          <div className={styles.groupMeta}>
            <div className={styles.groupVolume}>
              <label>TOTAL GROUP VOLUME</label>
              <span>1,240.50 <small>m2</small></span>
            </div>
            <Edit2 size={16} className={styles.closeBtn} />
            <Trash2 size={16} className={styles.closeBtn} />
          </div>
        </div>

        {openGroup && (
          <div className={styles.groupBody}>
            {/* SubGroup A */}
            <div className={styles.subGroupCard}>
              <div className={styles.subGroupHeader}>
                <h4>A. MOBILISASI & DEMOBILISASI</h4>
                <span className={styles.subTotal}>Sub-total: 1.00 Ls</span>
              </div>

              {/* Item 1.1 */}
              <div className={styles.itemRow}>
                <div className={styles.itemMainInfo}>
                  <div className={styles.itemLeft}>
                    <span className={styles.itemCode}>1.1</span>
                    <span className={styles.itemDesc}>Mobilisasi alat bantu & scaffolding panggung</span>
                  </div>
                  <div className={styles.itemRight}>
                    <span className={styles.itemVol}>1.00</span>
                    <span className={styles.itemUnit}>Ls</span>
                    <span className={styles.tagBadge}><LinkIcon size={12} /> Linked to RAB</span>
                  </div>
                </div>
              </div>

              {/* Item 1.2 */}
              <div className={styles.itemRow}>
                <div className={styles.itemMainInfo}>
                  <div className={styles.itemLeft}>
                    <span className={styles.itemCode}>1.2</span>
                    <span className={styles.itemDesc}>Proteksi area kerja & pembersihan sisa konstruksi</span>
                  </div>
                  <div className={styles.itemRight}>
                    <span className={styles.itemVol}>245.00</span>
                    <span className={styles.itemUnit}>m2</span>
                    <span className={styles.tagBadge}>Manual Entry</span>
                  </div>
                </div>

                {/* Dimensions Parameters Nested */}
                <div className={styles.dimensionBox}>
                  <div className={styles.dimHeader}>
                    <span>DIMENSION PARAMETERS</span>
                    <span><ShoppingCart size={12} /> Source via E-Procurement</span>
                  </div>
                  <table className={styles.dimTable}>
                    <thead>
                      <tr>
                        <th>Label/Zone</th>
                        <th className="numCol">Length (m)</th>
                        <th className="numCol">Width (m)</th>
                        <th className="numCol">Height (m)</th>
                        <th className="numCol">Waste (%)</th>
                        <th className="numCol">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Main Lobby Area A</td>
                        <td className="numCol">12.50</td>
                        <td className="numCol">8.20</td>
                        <td className="numCol">-</td>
                        <td className="numCol">5.0%</td>
                        <td className="numCol" style={{ color: 'var(--gold)' }}>107.63</td>
                      </tr>
                      <tr>
                        <td>Corridor Zone 2</td>
                        <td className="numCol">25.00</td>
                        <td className="numCol">5.00</td>
                        <td className="numCol">-</td>
                        <td className="numCol">10.0%</td>
                        <td className="numCol" style={{ color: 'var(--gold)' }}>137.50</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Bar */}
      <div className={styles.floatingFooter}>
        <span className={styles.draftText}><Save size={16} /> Draft Saved 12:45</span>
        <button className={styles.btnGold}><Upload size={16} /> Update RAB Summary</button>
      </div>

      {/* Modals Mounting */}
      <ModalTambahBaris isOpen={isBarisModalOpen} onClose={() => setIsBarisModalOpen(false)} />
      <ModalTambahGroup isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} />
      <ModalTambahSubGroup isOpen={isSubGroupModalOpen} onClose={() => setIsSubGroupModalOpen(false)} />
    </div>
  );
}