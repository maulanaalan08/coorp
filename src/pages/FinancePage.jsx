import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Wallet,
  ClipboardList,
  Scale,
  Percent,
  Search,
  ChevronRight,
  Save,
  CheckCircle,
  XCircle,
  Package,
  Clock,
} from "lucide-react";
import styles from "../styles/FinancePage.module.css";
import Header from "../components/Header";
import ProjectSelector from "../components/ProjectSelector";
import { useProjects } from "../hooks/useProjects";
import { useRabGroups } from "../hooks/useRabGroups";
import { useMaterialRequests } from "../hooks/useMaterialRequests";
import { usePO } from "../hooks/usePO";
import { poService } from "../services/poService";
import toast from "react-hot-toast";

const fmtRp = (n) =>
  "Rp " +
  Number(n || 0).toLocaleString("id-ID", {
    maximumFractionDigits: 0,
  });

const fmtPct = (n) => Number(n || 0).toFixed(2) + "%";
const fmtVol = (n) => {
  const num = Number(n || 0);
  return isNaN(num) ? "0" : parseFloat(num.toFixed(2)).toString();
};

const FILTER_TABS = [
  { key: "BELUM_APPROVE", label: "Belum Approve" },
  { key: "MENUNGGU_ATASAN", label: "Menunggu Atasan" },
  { key: "REJECTED", label: "Ditolak" },
  { key: "ALL", label: "Semua PO" },
];

const PO_TYPE_TABS = [
  { key: "ALL", label: "Semua" },
  { key: "MATERIAL", label: "PO Material" },
  { key: "JASA", label: "PO Jasa" },
  { key: "HABIS_PAKAI", label: "PO Habis Pakai" },
];

const FinancePage = ({ initialProjectId = null }) => {
const [projectId, setProjectId] = useState(initialProjectId);
const [search, setSearch] = useState("");
const [expandedRows, setExpandedRows] = useState({});
const [poFilter, setPoFilter] = useState("BELUM_APPROVE");
const [poTypeFilter, setPoTypeFilter] = useState("ALL");
const [expandedPo, setExpandedPo] = useState({});
const [poList, setPoList] = useState([]);
const [loadingPo, setLoadingPo] = useState(false);
const [busyPoId, setBusyPoId] = useState(null);

  const { projects: projectList, loading: loadingProjects } = useProjects();
  const project = useMemo(() => projectList.find((p) => p.id === projectId), [projectList, projectId]);

  const { rabGroups: groups = [], loadingGroups: loadingRab, errorGroups: rabError } = useRabGroups(projectId);

  const allRabItems = useMemo(() => {
    const list = [];
    groups.forEach((g) => {
      list.push(...(g.items || []));
      (g.children || []).forEach((c) => {
        list.push(...(c.items || []));
      });
    });
    return list;
  }, [groups]);

  const getRapForJasa = useCallback((it) => {
    return allRabItems.find(r => 
      r.id === it.rabItemId || 
      String(r.itemName || '').trim().toLowerCase() === String(it.description || '').trim().toLowerCase()
    ) || null;
  }, [allRabItems]);
  const { mrItems, loadingMr, mrError, updateBulkMaterialRequests, refreshMaterialRequests } = useMaterialRequests(projectId);
  const { refreshPOs } = usePO();

  const [editedItems, setEditedItems] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const [approvalTick, setApprovalTick] = useState(0);
  const bumpApproval = () => setApprovalTick((t) => t + 1);

  const fetchPoList = async () => {
    if (!projectId) {
      setPoList([]);
      return;
    }
    setLoadingPo(true);
    try {
      const data = await poService.getPOs({ projectId });
      setPoList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setPoList([]);
    } finally {
      setLoadingPo(false);
    }
  };

  useEffect(() => {
    fetchPoList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, approvalTick]);

  useEffect(() => {
    if (projectId) {
      refreshMaterialRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvalTick]);

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
    setExpandedPo({});
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

  useEffect(() => {
    const onPoChanged = () => {
      refreshPOs();
      if (projectId) refreshMaterialRequests();
      bumpApproval();
    };
    window.addEventListener('po-status-changed', onPoChanged);
    return () => window.removeEventListener('po-status-changed', onPoChanged);
  }, [projectId, refreshPOs, refreshMaterialRequests]);

  const handleEditChange = (id, field, value) => {
    setEditedItems((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const payloadItems = mrItems.map((item) => ({
      id: item.id,
      orderedVolume: editedItems[item.id]?.orderedVolume !== "" ? Number(editedItems[item.id].orderedVolume) : 0,
      catatanFinance: editedItems[item.id]?.catatanFinance || "",
    }));

    toast.promise(updateBulkMaterialRequests(payloadItems), {
      loading: 'Menyimpan data...',
      success: 'Data berhasil disimpan!',
      error: 'Gagal menyimpan data.',
    }).then(() => {
    }).catch((err) => {
      console.error(err);
    }).finally(() => {
      setIsSaving(false);
    });
  };

  const flattenedItems = useMemo(() => {
    const list = [];
    const traverseGroup = (g, pathName) => {
      const currentName = pathName ? `${pathName} ▸ ${g.name}` : g.name;
      (g.items || []).forEach((item) => list.push({ ...item, groupName: currentName }));
      (g.children || []).forEach((child) => traverseGroup(child, currentName));
    };
    groups.forEach((g) => traverseGroup(g, ""));
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
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const findMrItem = (item, comp) => {
    const vol = Number((Number(comp.coefficient) * Number(item.volume)).toFixed(4));
    return mrItems.find(
      (mr) =>
        mr.itemName === comp.name &&
        mr.estimatedVolume === vol &&
        mr.pricePerUnit === Number(comp.unitPrice)
    );
  };

  const totalRap = flattenedItems.reduce((sum, item) => sum + Number(item.rapTotalPrice || 0), 0);
  const totalBeli = mrItems.reduce((sum, mr) => {
    const volume = Number(mr.orderedVolume || 0);
    const unitPrice = Number(mr.pricePerUnit || 0);
    return sum + volume * unitPrice;
  }, 0);
  const sisaBudget = totalRap - totalBeli;
  const persentasePemakaian = totalRap > 0 ? (totalBeli / totalRap) * 100 : 0;

  const filteredPOs = useMemo(() => {
    let list = poList;
    if (poFilter === "BELUM_APPROVE") list = list.filter((p) => p.status === "BELUM_APPROVE");
    else if (poFilter === "MENUNGGU_ATASAN") list = list.filter((p) => p.status === "MENUNGGU_ATASAN");
    else if (poFilter === "REJECTED") list = list.filter((p) => p.status === "REJECTED");
    if (poTypeFilter !== "ALL") list = list.filter((p) => p.kategoriPO === poTypeFilter);
    return list;
  }, [poList, poFilter, poTypeFilter]);

  const handleVerifyPO = async (po) => {
    setBusyPoId(po.id);
    try {
      await poService.verifyPO(po.id, "");
      toast.success(`${po.poNumber} diverifikasi`);
      bumpApproval();
      window.dispatchEvent(new CustomEvent('po-status-changed', { detail: { poId: po.id } }));
    } catch (err) {
      toast.error(err.message || "Gagal verifikasi PO");
    } finally {
      setBusyPoId(null);
    }
  };

  const handleRejectPO = async (po) => {
    const reason = window.prompt(`Alasan menolak ${po.poNumber}:`);
    if (!reason || !reason.trim()) return;
    setBusyPoId(po.id);
    try {
      await poService.rejectPO(po.id, reason.trim());
      toast.success(`${po.poNumber} ditolak`);
      bumpApproval();
      window.dispatchEvent(new CustomEvent('po-status-changed', { detail: { poId: po.id } }));
    } catch (err) {
      toast.error(err.message || "Gagal menolak PO");
    } finally {
      setBusyPoId(null);
    }
  };

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
          <h2 className={styles.title}>Kebutuhan Material & Jasa</h2>
          <p className={styles.subtitle}>
            Kelola pengadaan dan kebutuhan material serta jasa (Purchasing).
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
            <Wallet size={48} className={styles.emptyIcon} />
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
            {/* DAFTAR PO UNTUK VERIFIKASI FINANCE */}
            <div className={styles.tableSection}>
              <div className={styles.tableHeader}>
                <h3 className={styles.tableTitle}>
                  <Clock size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                  Daftar PO untuk Verifikasi Finance
                </h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {PO_TYPE_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => { setPoTypeFilter(tab.key); setExpandedPo({}); }}
                      className={poTypeFilter === tab.key ? styles.filterActive : styles.filterBtn}
                      style={{ marginRight: 6, fontSize: 12 }}
                    >
                      {tab.label}
                    </button>
                  ))}
                  {FILTER_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => { setPoFilter(tab.key); setExpandedPo({}); }}
                      className={poFilter === tab.key ? styles.filterActive : styles.filterBtn}
                      style={{ marginRight: 6, fontSize: 12 }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.financeTable}>
                  <thead>
                    <tr>
                      <th style={{ width: "30px" }}></th>
                      <th>NO PO</th>
                      <th>JENIS</th>
                      <th>SUPPLIER</th>
                      <th className={styles.cellRight}>TOTAL</th>
                      <th style={{ textAlign: 'center' }}>STATUS</th>
                      <th style={{ textAlign: 'center' }}>AKSI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingPo ? (
                      <tr><td colSpan="7" className="text-center py-4 text-[#888]">Memuat PO...</td></tr>
                    ) : filteredPOs.length === 0 ? (
                      <tr><td colSpan="7" className="text-center py-4 text-[#888]">Tidak ada PO {poFilter.toLowerCase()}.</td></tr>
                    ) : (
                      filteredPOs.map((po) => {
                        const open = !!expandedPo[po.id];
                        const busy = busyPoId === po.id;
                        const statusClass =
                          po.status === "REJECTED" ? styles.statusRejected :
                          po.status === "BELUM_APPROVE" ? styles.statusPending :
                          po.status === "MENUNGGU_ATASAN" ? styles.statusPartial :
                          styles.statusNone;
                        const typeClass =
                          po.kategoriPO === "HABIS_PAKAI" ? styles.statusHabisPakai :
                          po.kategoriPO === "JASA" ? styles.statusJasa || styles.statusMaterial :
                          styles.statusMaterial;
                        return (
                          <React.Fragment key={po.id}>
                            <tr className={styles.itemRow} onClick={() => setExpandedPo((prev) => ({ ...prev, [po.id]: !prev[po.id] }))}>
                              <td>
                                <ChevronRight
                                  size={16}
                                  style={{
                                    transform: open ? "rotate(90deg)" : "rotate(0deg)",
                                    transition: "transform 0.2s ease",
                                  }}
                                />
                              </td>
                              <td className={styles.itemCell}>{po.poNumber}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`${styles.statusBadge} ${typeClass}`}>
                                  {po.kategoriPO === "HABIS_PAKAI" ? "HABIS PAKAI" :
                                   po.kategoriPO === "JASA" ? "JASA" : "MATERIAL"}
                                </span>
                              </td>
                              <td className={styles.groupCell}>{po.supplier?.name || po.jasa?.nama || "-"}</td>
                              <td className={`${styles.cellMono} ${styles.cellRight}`}>{fmtRp(po.grandTotal)}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`${styles.statusBadge} ${statusClass}`}>{po.status || "-"}</span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {po.status === "BELUM_APPROVE" && (
                                  <button
                                    className={styles.primaryBtn}
                                    style={{ padding: '4px 10px', fontSize: 11 }}
                                    disabled={busy}
                                    onClick={(e) => { e.stopPropagation(); handleVerifyPO(po); }}
                                  >
                                    <CheckCircle size={12} /> Approve Finance
                                  </button>
                                )}
                              </td>
                            </tr>
                            {open && (
                              <tr className={styles.expandedRow}>
                                <td colSpan="7" style={{ padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
                                  <div style={{ marginBottom: 8, fontSize: 12, color: '#888' }}>Detail Item</div>
                                  <table className={styles.componentsTable}>
                                    <thead>
                                      <tr>
                                        <th>DESKRIPSI</th>
                                        <th className={styles.cellRight}>QTY</th>
                                        <th>UNIT</th>
                                        <th className={styles.cellRight}>HARGA SATUAN</th>
                                        <th className={styles.cellRight}>SUBTOTAL</th>
                                        <th className={styles.cellRight}>KET. VOLUME</th>
                                        <th className={styles.cellRight}>KET. HARGA</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(po.items || []).map((it) => (
                                        <tr key={it.id}>
                                          <td>{it.description}</td>
                                          <td className={`${styles.cellMono} ${styles.cellRight}`}>{fmtVol(it.qty)}</td>
                                          <td>{it.unit || '-'}</td>
                                          <td className={`${styles.cellMono} ${styles.cellRight}`}>{fmtRp(it.unitPrice)}</td>
                                          <td className={`${styles.cellMono} ${styles.cellRight}`}>{fmtRp(it.total)}</td>
                                          <td className={styles.cellRight} style={{ fontSize: 11, color: '#ef4444' }}>
                                            {po.kategoriPO === 'HABIS_PAKAI'
                                              ? (po.keteranganVolume || it.keteranganVolume || '-')
                                              : (() => {
                                                  const rapData = getRapForJasa(it);
                                                  const rap = it.materialRequest?.estimatedVolume || it.estimatedVolume || rapData?.rapQty || 0;
                                                  if (!rap) return <span style={{ color: '#444' }}>-</span>;
                                                  const diff = Number(it.qty || 0) - Number(rap);
                                                  if (diff > 0) return <span>Over +{fmtVol(diff)}</span>;
                                                  if (diff < 0) return <span style={{ color: '#f59e0b' }}>Under {fmtVol(diff)}</span>;
                                                  return <span style={{ color: '#22c55e' }}>Sesuai</span>;
                                                })()}
                                          </td>
                                          <td className={styles.cellRight} style={{ fontSize: 11, color: '#f97316' }}>
                                            {po.kategoriPO === 'HABIS_PAKAI'
                                              ? (po.keteranganHarga || it.keteranganHarga || '-')
                                              : (() => {
                                                  const rapData = getRapForJasa(it);
                                                  const rapP = it.materialRequest?.pricePerUnit || it.pricePerUnit || rapData?.rapPrice || 0;
                                                  if (!rapP) return <span style={{ color: '#444' }}>-</span>;
                                                  const diff = Number(it.unitPrice || 0) - Number(rapP);
                                                  if (diff > 0) return <span>Over +{fmtRp(diff)}</span>;
                                                  if (diff < 0) return <span style={{ color: '#f59e0b' }}>Under {fmtRp(diff)}</span>;
                                                  return <span style={{ color: '#22c55e' }}>Sesuai</span>;
                                                })()}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {po.status === "BELUM_APPROVE" && (
                                    <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                                      <button
                                        className={styles.primaryBtn}
                                        disabled={busy}
                                        onClick={() => handleVerifyPO(po)}
                                      >
                                        <CheckCircle size={14} /> Approve Finance & Teruskan ke Atasan
                                      </button>
                                      <button
                                        className={styles.dangerBtn}
                                        disabled={busy}
                                        onClick={() => handleRejectPO(po)}
                                      >
                                        <XCircle size={14} /> Tolak
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <div className={`${styles.statCard} ${styles.revenue}`}>
                <div className={styles.statHeader}>
                  <Wallet size={16} className={styles.statIcon} />
                  <span>Total Budget (RAP Material & Jasa)</span>
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
                                          if (isUpah) return null;

                                          const mr = findMrItem(item, c);
                                          const lineTotal = Number(c.coefficient) * Number(c.unitPrice);

                                          let statusClass = styles.statusPending;
                                          let statusText = "PENDING";
                                          if (mr) {
                                            const mrStatus = mr.procurementStatus || mr.status || "PENDING";
                                            statusText = mrStatus;
                                            if (mrStatus === "COMPLETED") statusClass = styles.statusCompleted;
                                            else if (mrStatus === "PARTIAL") statusClass = styles.statusPartial;
                                          }

                                          return (
                                            <tr key={c.id}>
                                              <td>{c.name}</td>
                                              <td>{c.section}</td>
                                              <td className={styles.cellMono}>
                                                {mr && mr.estimatedVolume
                                                  ? Number(mr.estimatedVolume).toFixed(2)
                                                  : (Number(c.coefficient) * Number(item.volume)).toFixed(2)}
                                              </td>
                                              <td>{c.unit}</td>
                                              <td className={styles.cellMono}>{fmtRp(c.unitPrice)}</td>
                                              <td className={styles.cellMono}>{fmtRp(lineTotal)}</td>
                                              <td>
                                                {mr ? (
                                                  <span className={styles.cellMono}>{Number(mr.orderedVolume || 0).toFixed(2)}</span>
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
