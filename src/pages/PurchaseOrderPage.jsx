import React, { useState, useMemo, useEffect } from 'react';
import { Search, CheckCircle, Printer, ShoppingCart, Plus, Package, Edit } from 'lucide-react';
import styles from '../styles/PurchaseOrderPage.module.css';
import Header from '../components/Header';
import { usePO } from '../hooks/usePO';
import { useMaterialRequests, useFinanceMaterialRequests } from '../hooks/useMaterialRequests';
import { useProjects } from '../hooks/useProjects';
import ProjectSelector from '../components/ProjectSelector';
import { poService } from '../services/poService';
import PurchaseOrderModal from '../components/PurchaseOrderModal';
import toast from 'react-hot-toast';

const fmtRp = (n) =>
  "Rp " + Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

const fmtVol = (n) => {
  const num = Number(n || 0);
  return isNaN(num) ? '0' : parseFloat(num.toFixed(3)).toString();
};

const PurchaseOrderPage = () => {
  const [activeTab, setActiveTab] = useState('buat-po'); // 'buat-po' atau 'riwayat-po'
  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [editingPo, setEditingPo] = useState(null);

  const { projects: projectList, loading: loadingProjects } = useProjects();
  const { mrItems, loadingMr, refreshMaterialRequests } = useMaterialRequests(projectId);
  const { requests: financeMRs, loading: loadingFinanceMR, refreshFinanceMR } = useFinanceMaterialRequests();
  const { pos, loading, error, approve, refreshPOs } = usePO();

  // Gabungkan data dari finance endpoint (lebih kaya, split per toko)
  // Filter berdasarkan project yang dipilih
  const financeMrItems = useMemo(() => {
    if (!projectId || !financeMRs.length) return [];
    const matched = financeMRs.find(mr => mr.projectId === projectId);
    return matched ? matched.items || [] : [];
  }, [projectId, financeMRs]);

  const handleApprove = async (id) => {
    toast.promise(approve(id), {
      loading: 'Meng-approve PO...',
      success: 'PO berhasil di-approve!',
      error: 'Gagal menyetujui PO'
    });
  };

  const handlePrint = (id) => {
    poService.printPO(id);
  };

  const filteredPOs = useMemo(() => {
    if (!search.trim()) return pos;
    const query = search.toLowerCase();
    return pos.filter(
      (po) =>
        po.poNumber?.toLowerCase().includes(query) ||
        po.supplier?.name?.toLowerCase().includes(query) ||
        po.items?.some(i => i.description?.toLowerCase().includes(query))
    );
  }, [pos, search]);

  // Gunakan data finance MR jika tersedia (lebih kaya, split per toko), fallback ke mrItems
  const displayItems = financeMrItems.length > 0 ? financeMrItems : mrItems;
  const hasFinanceData = financeMrItems.length > 0;

  // Grouping Material Request Items
  const groupedMrItems = useMemo(() => {
    const groups = {};
    displayItems.forEach(item => {
      const gName = item.groupName || 'Tanpa Group';
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(item);
    });
    return groups;
  }, [displayItems]);

  // getItemPoStatus dihapus karena kita ambil langsung dari item.orderedVolume dan item.status

  const toggleSelectItem = (item) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(i => i.id === item.id);
      if (isSelected) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, { ...item, orderedQty: item.orderedVolume || 0 }];
      }
    });
  };

  const handleCreatePoClick = () => {
    if (selectedItems.length === 0) {
      toast.error('Pilih minimal 1 item untuk dibuat PO!');
      return;
    }
    setIsPoModalOpen(true);
  };

  const handlePoSuccess = () => {
    setIsPoModalOpen(false);
    setEditingPo(null);
    setSelectedItems([]);
    refreshMaterialRequests();
    refreshFinanceMR();
    if (refreshPOs) refreshPOs();
  };

  return (
    <div className={styles.poWrapper}>
      <Header />

      <header className={styles.financeHeader}>
        <div className={styles.headerMain}>
          <p className={styles.eyebrow}>Purchase Orders</p>
          <h2 className={styles.title}>Manajemen PO</h2>
          <p className={styles.subtitle}>Kelola pembuatan PO dari material request dan riwayat PO.</p>
        </div>
        <div style={{ minWidth: '300px' }}>
          {activeTab === 'buat-po' && (
            <ProjectSelector
              projectId={projectId}
              projectList={projectList}
              loading={loadingProjects}
              onChange={(e) => {
                setProjectId(e.target.value || null);
                setSelectedItems([]);
              }}
            />
          )}
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'buat-po' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('buat-po')}
          >
            <Package size={16} /> Buat PO Material
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'riwayat-po' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('riwayat-po')}
          >
            <ShoppingCart size={16} /> Riwayat Surat PO
          </button>
        </div>

        {activeTab === 'buat-po' && (
          <div className={styles.tabContent}>
            <div className={styles.toolbar}>
              <h3 className={styles.sectionTitle}>Material Requests</h3>
              <button className={styles.createPoBtn} onClick={handleCreatePoClick}>
                <Plus size={16} /> Buat PO Terpilih ({selectedItems.length})
              </button>
            </div>

            {!projectId ? (
              <div className={styles.emptyState}>
                <Package size={48} className={styles.emptyIcon} />
                <h3>Pilih Project</h3>
                <p>Silakan pilih project dari dropdown di atas untuk melihat kebutuhan material.</p>
              </div>
            ) : (loadingMr || loadingFinanceMR) ? (
              <div className={styles.emptyState}>
                <p>Memuat kebutuhan material...</p>
              </div>
            ) : displayItems.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Tidak ada material request untuk project ini.</p>
              </div>
            ) : (
              <div className={styles.mrGroups}>
                {Object.entries(groupedMrItems).map(([groupName, items]) => (
                  <div key={groupName} className={styles.mrGroupCard}>
                    <h3 className={styles.mrGroupTitle}>{groupName}</h3>
                    <div className={styles.tableWrapper}>
                      <table className={styles.poTable}>
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}>Pilih</th>
                            <th>ITEM MATERIAL</th>
                            <th>SATUAN</th>
                            <th className={styles.cellRight}>EST VOL</th>
                            <th className={styles.cellRight}>TELAH DI-ORDER</th>
                            <th className={styles.cellRight}>HARGA SATUAN</th>
                            {hasFinanceData && <th>SUPPLIER / TOKO</th>}
                            {hasFinanceData && <th>NO. PO</th>}
                            <th style={{ textAlign: 'center' }}>STATUS PO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(item => {
                            const isSelected = selectedItems.some(i => i.id === item.id);
                            return (
                              <tr key={item.id} className={isSelected ? styles.selectedRow : ''}>
                                <td style={{ textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectItem(item)}
                                    className={styles.checkbox}
                                  />
                                </td>
                                <td>{item.itemName}</td>
                                <td>{item.unit}</td>
                                <td className={`${styles.cellMono} ${styles.cellRight}`}>{fmtVol(item.estimatedVolume)}</td>
                                <td className={`${styles.cellMono} ${styles.cellRight}`}>{fmtVol(item.orderedVolume || 0)}</td>
                                <td className={`${styles.cellMono} ${styles.cellRight}`}>{fmtRp(item.pricePerUnit)}</td>
                                {hasFinanceData && (
                                  <td>
                                    <span style={{ fontSize: '0.85rem' }}>{item.supplierName || '-'}</span>
                                  </td>
                                )}
                                {hasFinanceData && (
                                  <td>
                                    <span className={styles.cellMono} style={{ fontSize: '0.8rem' }}>{item.poNumber || '-'}</span>
                                  </td>
                                )}
                                <td style={{ textAlign: 'center' }}>
                                  <span className={`${styles.statusBadge} ${item.status === 'COMPLETED' ? styles.statusApproved :
                                      item.status === 'PARTIAL' ? styles.statusPending :
                                        styles.statusNone
                                    }`}>
                                    {item.status || 'PENDING'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'riwayat-po' && (
          <div className={styles.tabContent}>
            {loading ? (
              <div className={styles.emptyState}>
                <p>Memuat data PO...</p>
              </div>
            ) : error ? (
              <div className={styles.emptyState}>
                <p style={{ color: "#f87171" }}>{error}</p>
              </div>
            ) : (
              <div className={styles.tableSection}>
                <div className={styles.tableHeader}>
                  <h3 className={styles.tableTitle}>Riwayat Surat PO</h3>
                  <div className={styles.searchBox}>
                    <Search size={14} className={styles.searchIcon} />
                    <input
                      type="text"
                      placeholder="Cari No. PO, Supplier, Item..."
                      className={styles.searchInput}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.tableWrapper}>
                  <table className={styles.poTable}>
                    <thead>
                      <tr>
                        <th>NO. PO</th>
                        <th>TANGGAL</th>
                        <th>TOKO / SUPPLIER</th>
                        <th>NAMA PROYEK</th>
                        <th>DAFTAR BARANG (QTY)</th>
                        <th className={styles.cellRight}>GRAND TOTAL</th>
                        <th style={{ textAlign: 'center' }}>STATUS</th>
                        <th>AKSI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPOs.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: "center", padding: "30px", color: "#888" }}>
                            Tidak ada data PO ditemukan.
                          </td>
                        </tr>
                      ) : (
                        filteredPOs.map((po) => {
                          const isApproved = po.status === 'APPROVED' || po.status === 'approve' || po.status === 'Approved';

                          return (
                            <tr key={po.id}>
                              <td className={styles.cellMono}>{po.poNumber}</td>
                              <td>{new Date(po.tanggal).toLocaleDateString('id-ID')}</td>
                              <td>{po.supplier?.name || po.supplierId}</td>
                              <td>{projectList.find(p => p.id === po.projectId)?.name || 'Proyek tidak diketahui'}</td>
                              <td style={{ fontSize: '0.85rem', maxWidth: '250px' }}>
                                {po.items && po.items.length > 0 ? (
                                  <ul style={{ margin: 0, paddingLeft: '16px', color: '#ccc' }}>
                                    {po.items.slice(0, 3).map((item, idx) => (
                                      <li key={item.id || idx}>{item.description} - <b>{item.qty} {item.unit}</b></li>
                                    ))}
                                    {po.items.length > 3 && (
                                      <li style={{ listStyle: 'none', fontStyle: 'italic', color: '#888', marginLeft: '-16px', marginTop: '4px' }}>
                                        + {po.items.length - 3} item lainnya...
                                      </li>
                                    )}
                                  </ul>
                                ) : (
                                  <span style={{ color: '#888' }}>Kosong</span>
                                )}
                              </td>
                              <td className={`${styles.cellMono} ${styles.cellRight}`}>{fmtRp(po.grandTotal)}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`${styles.statusBadge} ${isApproved ? styles.statusApproved : styles.statusPending}`}>
                                  {isApproved ? 'Approved' : 'Belum Approve'}
                                </span>
                              </td>
                              <td>
                                <div className={styles.actionCell}>
                                  {!isApproved && (
                                    <button
                                      className={styles.approveBtn}
                                      onClick={() => handleApprove(po.id)}
                                      title="Approve PO"
                                    >
                                      <CheckCircle size={16} />
                                    </button>
                                  )}
                                  {!isApproved && (
                                    <button
                                      className={styles.printBtn}
                                      onClick={() => {
                                        setEditingPo(po);
                                        setIsPoModalOpen(true);
                                      }}
                                      title="Edit PO"
                                      style={{ backgroundColor: '#2563eb' }}
                                    >
                                      <Edit size={16} />
                                    </button>
                                  )}
                                  <button
                                    className={styles.printBtn}
                                    onClick={() => handlePrint(po.id)}
                                    title="Cetak PDF"
                                  >
                                    <Printer size={16} />
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
            )}
          </div>
        )}
      </main>

      {(isPoModalOpen || editingPo) && (
        <PurchaseOrderModal
          selectedItems={selectedItems}
          projectId={projectId}
          editingPo={editingPo}
          onClose={() => {
            setIsPoModalOpen(false);
            setEditingPo(null);
          }}
          onSuccess={handlePoSuccess}
        />
      )}
    </div>
  );
};

export default PurchaseOrderPage;
