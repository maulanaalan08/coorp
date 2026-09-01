import React, { useState, useEffect, useMemo } from "react";
import {
  Wallet,
  ClipboardList,
  Scale,
  Percent,
  Search,
  ChevronDown,
  PieChart,
  ChevronRight,
  Save
} from "lucide-react";
import styles from "../styles/FinancePage.module.css";
import Header from "../components/Header";
import ProjectSelector from "../components/ProjectSelector";
import { useProjects } from "../hooks/useProjects";
import { useRabGroups } from "../hooks/useRabGroups";
import { useMaterialRequests } from "../hooks/useMaterialRequests";
import toast from "react-hot-toast";

const fmtRp = (n) =>
  "Rp " +
  Number(n || 0).toLocaleString("id-ID", {
    maximumFractionDigits: 0,
  });

const fmtPct = (n) => Number(n || 0).toFixed(2) + "%";

const FinancePage = () => {
  const [projectId, setProjectId] = useState(null);
  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState({});

  const { projects: projectList, loading: loadingProjects } = useProjects();
  const project = useMemo(() => projectList.find((p) => p.id === projectId), [projectList, projectId]);

  const { rabGroups: groups = [], loadingGroups: loadingRab, errorGroups: rabError } = useRabGroups(projectId);
  const { mrItems, loadingMr, mrError, updateBulkMaterialRequests } = useMaterialRequests(projectId);

  // Local state for edited inputs
  const [editedItems, setEditedItems] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Sync editedItems when mrItems loads
  useEffect(() => {
    if (mrItems && mrItems.length > 0) {
      const initialEdits = {};
      mrItems.forEach((item) => {
        initialEdits[item.id] = {
          orderedVolume: item.orderedVolume !== null ? item.orderedVolume : "",
          catatanFinance: item.catatanFinance !== null ? item.catatanFinance : "",
        };
      });
      setEditedItems(initialEdits);
    } else {
      setEditedItems({});
    }
  }, [mrItems]);

  useEffect(() => {
    setExpandedRows({});
  }, [projectId]);

  useEffect(() => {
    if (loadingProjects || loadingRab || loadingMr) {
      toast.loading('Memuat data Finance...', { id: 'loading-finance' });
    } else {
      toast.dismiss('loading-finance');
      if (rabError || mrError) {
        toast.error('Gagal memuat data');
      }
    }
  }, [loadingProjects, loadingRab, loadingMr, rabError, mrError]);

  // Handle Input Changes
  const handleEditChange = (id, field, value) => {
    setEditedItems(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  // Handle Save
  const handleSave = async () => {
    setIsSaving(true);
    const payloadItems = mrItems.map(item => ({
      id: item.id,
      orderedVolume: editedItems[item.id]?.orderedVolume !== "" ? Number(editedItems[item.id].orderedVolume) : 0,
      catatanFinance: editedItems[item.id]?.catatanFinance || ""
    }));

    toast.promise(updateBulkMaterialRequests(payloadItems), {
      loading: 'Menyimpan data...',
      success: 'Data berhasil disimpan!',
      error: 'Gagal menyimpan data.'
    }).then(() => {
      // success
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setIsSaving(false);
    });
  };

  // Flatten items for display
  const flattenedItems = useMemo(() => {
    const list = [];

    const traverseGroup = (g, pathName) => {
      // Backend uses 'buildPath(rabItem.group)'
      const currentName = pathName ? `${pathName} ▸ ${g.name}` : g.name;

      (g.items || []).forEach((item) => {
        list.push({ ...item, groupName: currentName });
      });

      (g.children || []).forEach((child) => {
        traverseGroup(child, currentName);
      });
    };

    groups.forEach(g => traverseGroup(g, ""));
    return list;
  }, [groups]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return flattenedItems;
    const query = search.toLowerCase();
    return flattenedItems.filter(
      (item) =>
        item.name?.toLowerCase().includes(query) ||
        item.groupName?.toLowerCase().includes(query)
    );
  }, [flattenedItems, search]);

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const findMrItem = (item, comp) => {
    const vol = Number((Number(comp.coefficient) * Number(item.volume)).toFixed(4));
    return mrItems.find(mr =>
      mr.itemName === comp.name &&
      mr.estimatedVolume === vol &&
      mr.pricePerUnit === Number(comp.unitPrice)
    );
  };

  // Calculations
  const totalRap = flattenedItems.reduce((sum, item) => sum + Number(item.rapTotalPrice || 0), 0);
  const totalBeli = mrItems.reduce((sum, mr) => {
    const volume = Number(editedItems[mr.id]?.orderedVolume || 0);
    const unitPrice = Number(mr.pricePerUnit || 0);
    return sum + (volume * unitPrice);
  }, 0);
  const sisaBudget = totalRap - totalBeli;
  const persentasePemakaian = totalRap > 0 ? (totalBeli / totalRap) * 100 : 0;

  const loading = loadingProjects || loadingRab || loadingMr;
  const errorMsg = rabError || mrError;

  return (
    <div className={styles.financeWrapper}>
      <Header />
      <header className={styles.financeHeader}>
        <div className={styles.headerMain}>
          <p className={styles.eyebrow}>
            {project?.name ? `Project: ${project.name}` : "Financial Overview"}
          </p>
          <h2 className={styles.title}>Kebutuhan Material</h2>
          <p className={styles.subtitle}>
            Kelola pengadaan dan kebutuhan material (Purchasing).
          </p>
        </div>
        <div style={{ minWidth: '300px' }}>
          <ProjectSelector 
            projectId={projectId}
            projectList={projectList}
            loading={loadingProjects}
            onChange={(e) => setProjectId(e.target.value || null)}
          />
        </div>
      </header>

      <main className={styles.content}>
        {!projectId ? (
          <div className={styles.emptyState}>
            <PieChart size={48} className={styles.emptyIcon} />
            <h3>No Project Selected</h3>
            <p>Select a project from the dropdown above to view financial details.</p>
          </div>
        ) : loading ? (
          <div className={styles.emptyState}>
            <p>Loading data...</p>
          </div>
        ) : errorMsg ? (
          <div className={styles.emptyState}>
            <p style={{ color: "#f87171" }}>{errorMsg}</p>
          </div>
        ) : (
          <>
            <div className={styles.statsGrid}>
              <div className={`${styles.statCard} ${styles.revenue}`}>
                <div className={styles.statHeader}>
                  <Wallet size={16} className={styles.statIcon} />
                  <span>Total Budget (RAP Material)</span>
                </div>
                <div className={styles.statValue}>{fmtRp(totalRap)}</div>
                <div className={styles.statDesc}>Alokasi budget dari perencanaan</div>
              </div>

              <div className={`${styles.statCard} ${styles.cost}`}>
                <div className={styles.statHeader}>
                  <ClipboardList size={16} className={styles.statIcon} />
                  <span>Total Pembelian (Estimasi)</span>
                </div>
                <div className={styles.statValue}>{fmtRp(totalBeli)}</div>
                <div className={styles.statDesc}>Volume dibeli × Harga Satuan (Bahan/Alat)</div>
              </div>

              <div className={`${styles.statCard} ${styles.profit}`}>
                <div className={styles.statHeader}>
                  <Scale size={16} className={styles.statIcon} />
                  <span>Sisa Budget (Laba Ditahan)</span>
                </div>
                <div className={styles.statValue}>{fmtRp(sisaBudget)}</div>
                <div className={styles.statDesc}>Budget RAP - Realisasi PO</div>
              </div>

              <div className={`${styles.statCard} ${styles.margin}`}>
                <div className={styles.statHeader}>
                  <Percent size={16} className={styles.statIcon} />
                  <span>Pemakaian Budget</span>
                </div>
                <div className={styles.statValue}>{fmtPct(persentasePemakaian)}</div>
                <div className={styles.statDesc}>Berdasarkan data PO tersimpan</div>
              </div>
            </div>

            <div className={styles.tableSection}>
              <div className={styles.tableHeader}>
                <h3 className={styles.tableTitle}>Itemized Breakdown</h3>
                <div className={styles.searchBox}>
                  <Search size={14} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search item or group..."
                    className={styles.searchInput}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.financeTable}>
                  <thead>
                    <tr>
                      <th style={{ width: "30px" }}></th>
                      <th>GROUP</th>
                      <th>ITEM DESCRIPTION</th>
                      <th className={styles.cellRight}>VOLUME</th>
                      <th className={styles.cellRight}>COST/UNIT</th>
                      <th className={styles.cellRight}>REV/UNIT</th>
                      <th className={styles.cellRight}>TOTAL COST (RAP)</th>
                      <th className={styles.cellRight}>TOTAL REV (RAB)</th>
                      <th className={styles.cellRight}>PROFIT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const isExpanded = expandedRows[item.id];
                      const vol = Number(item.volume || 0);
                      const rapUnit = Number(item.rapUnitPrice || 0);
                      const rabUnit = Number(item.rabUnitPrice || 0);
                      const rapTotal = rapUnit * vol;
                      const rabTotal = rabUnit * vol;
                      const profit = rabTotal - rapTotal;
                      const hasComponents = item.components && item.components.length > 0;

                      return (
                        <React.Fragment key={item.id}>
                          <tr className={styles.itemRow} onClick={() => toggleRow(item.id)}>
                            <td>
                              {hasComponents ? (
                                <ChevronRight
                                  size={16}
                                  style={{
                                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                                    transition: "transform 0.2s ease",
                                  }}
                                />
                              ) : null}
                            </td>
                            <td className={styles.groupCell}>{item.groupName}</td>
                            <td className={styles.itemCell}>{item.name}</td>
                            <td className={`${styles.cellMono} ${styles.cellRight}`}>
                              {vol.toFixed(2)} {item.paymentUnit || "m2"}
                            </td>
                            <td className={`${styles.cellMono} ${styles.cellRight}`}>{fmtRp(rapUnit)}</td>
                            <td className={`${styles.cellMono} ${styles.cellRight}`}>{fmtRp(rabUnit)}</td>
                            <td className={`${styles.cellMono} ${styles.cellRight}`}>{fmtRp(rapTotal)}</td>
                            <td className={`${styles.cellMono} ${styles.cellRight}`}>{fmtRp(rabTotal)}</td>
                            <td
                              className={`${styles.cellMono} ${styles.cellRight}`}
                              style={{ color: profit >= 0 ? "#4ade80" : "#f87171" }}
                            >
                              {profit >= 0 ? "+" : ""}
                              {fmtRp(profit)}
                            </td>
                          </tr>

                          {/* EXPANDED ROW UNTUK KOMPONEN */}
                          {isExpanded && (
                            <tr className={styles.expandedRow}>
                              <td colSpan="9">
                                <div className={styles.componentsWrapper}>
                                  {!hasComponents ? (
                                    <p className={styles.noComponents}>Tidak ada komponen AHSP untuk item ini (Input Manual / By Owner).</p>
                                  ) : (
                                    <table className={styles.componentsTable}>
                                      <thead>
                                        <tr>
                                          <th>KOMPONEN (TENAGA/BAHAN/ALAT)</th>
                                          <th>KATEGORI</th>
                                          <th>EST. VOLUME</th>
                                          <th>SATUAN</th>
                                          <th>HARGA SATUAN</th>
                                          <th>TOTAL MODAL</th>
                                          <th style={{ width: "120px" }}>VOL. DIBELI (PO)</th>
                                          <th style={{ width: "90px" }}>STATUS</th>
                                          <th>CATATAN FINANCE</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {item.components.map((c) => {
                                          const isUpah = c.section === "UPAH";
                                          if (isUpah) return null; // Sembunyikan UPAH di bagian Finance

                                          const mr = findMrItem(item, c);
                                          const lineTotal = Number(c.coefficient) * Number(c.unitPrice);

                                          let statusClass = styles.statusPending;
                                          let statusText = "PENDING";
                                          if (mr) {
                                            statusText = mr.status;
                                            if (mr.status === "COMPLETED") statusClass = styles.statusCompleted;
                                            else if (mr.status === "PARTIAL") statusClass = styles.statusPartial;
                                          }

                                          return (
                                            <tr key={c.id}>
                                              <td>{c.name}</td>
                                              <td>{c.section}</td>
                                              <td className={styles.cellMono}>
                                                {mr && mr.estimatedVolume 
                                                  ? Number(mr.estimatedVolume).toFixed(4)
                                                  : (Number(c.coefficient) * Number(item.volume)).toFixed(4)}
                                              </td>
                                              <td>{c.unit}</td>
                                              <td className={styles.cellMono}>{fmtRp(c.unitPrice)}</td>
                                              <td className={styles.cellMono}>{fmtRp(lineTotal)}</td>
                                              <td>
                                                {mr ? (
                                                  <input
                                                    type="number"
                                                    className={styles.editInput}
                                                    value={editedItems[mr.id]?.orderedVolume ?? ""}
                                                    onChange={(e) => handleEditChange(mr.id, "orderedVolume", e.target.value)}
                                                    placeholder="0"
                                                    onClick={(e) => e.stopPropagation()}
                                                  />
                                                ) : (
                                                  <span style={{ color: "#666" }}>-</span>
                                                )}
                                              </td>
                                              <td>
                                                {mr ? (
                                                  <span className={`${styles.statusBadge} ${statusClass}`}>
                                                    {statusText}
                                                  </span>
                                                ) : (
                                                  <span style={{ color: "#666" }}>-</span>
                                                )}
                                              </td>
                                              <td>
                                                {mr ? (
                                                  <input
                                                    type="text"
                                                    className={styles.editInput}
                                                    value={editedItems[mr.id]?.catatanFinance ?? ""}
                                                    onChange={(e) => handleEditChange(mr.id, "catatanFinance", e.target.value)}
                                                    placeholder="Tambah catatan..."
                                                    onClick={(e) => e.stopPropagation()}
                                                  />
                                                ) : (
                                                  <span style={{ color: "#666", fontStyle: "italic", fontSize: "11px" }}>Bukan Bahan/Alat</span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan="9" style={{ textAlign: "center", padding: "30px", color: "#888" }}>
                          No items match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className={styles.actionRow}>
                <button
                  className={styles.primaryBtn}
                  onClick={handleSave}
                  disabled={isSaving || mrItems.length === 0}
                >
                  <Save size={16} />
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan Finance"}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default FinancePage;
