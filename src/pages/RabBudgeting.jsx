import { useEffect, useMemo, useRef, useState } from "react";
import {
  Wallet,
  ClipboardList,
  Scale,
  TrendingUp,
  Search,
  ChevronDown,
  ChevronLeft,
  RefreshCw,
  Pencil,
  Trash2,
  Plus,
  Save,
} from "lucide-react";
import ProjectSelector from "../components/ProjectSelector";
import styles from "../styles/RabBudgeting.module.css";
import Header from "../components/Header";
import { useProjects } from "../hooks/useProjects";
import { useRabGroups } from "../hooks/useRabGroups";
import { useRabItems } from "../hooks/useRabItems";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "http://localhost:4000/api";

const fmtRp = (n) =>
  "Rp " +
  Number(n || 0).toLocaleString("id-ID", {
    maximumFractionDigits: 0,
  });

const formatInputNumber = (val) => {
  if (val === "" || val === null || val === undefined) return "";
  const numStr = String(val).replace(/[^0-9]/g, "");
  if (!numStr) return "";
  return Number(numStr).toLocaleString("id-ID");
};

const parseInputNumber = (val) => {
  if (!val) return "";
  return String(val).replace(/[^0-9]/g, "");
};

// Baris kosong untuk rincian bahan/alat manual (item custom yang tidak ada di AHSP)
const blankComponent = () => ({
  name: "",
  unit: "",
  section: "BAHAN",
  coefficient: "1",
  unitPrice: "",
});

// Subtotal satu baris komponen = koefisien x harga satuan
const compLineTotal = (c) =>
  (Number(c.coefficient) || 0) * (Number(String(c.unitPrice).replace(/[^0-9]/g, "")) || 0);

const RabBudgeting = ({ initialProjectId = null, onBack, onProjectChange, onBackToBv }) => {
  const [projectId, setProjectId] = useState(initialProjectId);
  const [search, setSearch] = useState("");
  
  // ==========================================================
  // CUSTOM HOOKS
  // ==========================================================
  const { projects: projectList, loading: loadingProjects } = useProjects();
  const { rabGroups: groups, loadingGroups, errorGroups: fetchError, refreshGroups, createGroup, deleteGroup } = useRabGroups(projectId);
  const { deleteRabItem, updateRabItem, deleteBulk, bulkPrice, bulkSwitchJob, loading: loadingItems } = useRabItems(projectId);

  const project = useMemo(() => projectList.find(p => p.id === projectId), [projectList, projectId]);

  // State untuk Tambah Group
  const [groupModal, setGroupModal] = useState(null);

  // State untuk Edit Individual
  const [editModal, setEditModal] = useState(null);

  // State untuk Hapus Massal & Checkbox
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  
  // State untuk 3 Modal Bulk (Sapu Jagat) yang sesuai Backend
  const [bulkPriceModal, setBulkPriceModal] = useState(null);
  const [bulkSwitchModal, setBulkSwitchModal] = useState(null);
  const [bulkNameModal, setBulkNameModal] = useState(null);

  useEffect(() => {
    if (initialProjectId !== null) {
      setProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  // ==========================================================
  // FLATTEN ITEM & SUBTOTAL
  // ==========================================================
  const flattenItems = (groupList) =>
    (groupList || []).flatMap((group) => [
      ...(group.items || []),
      ...flattenItems(group.children),
    ]);

  const allItems = useMemo(() => flattenItems(groups), [groups]);

  const sumGroupRecursive = (group) => {
    let total = (group.items || []).reduce((sum, item) => sum + Number(item.rabTotalPrice || 0), 0);
    for (const child of group.children || []) {
      total += sumGroupRecursive(child);
    }
    return total;
  };

  const totalRab = allItems.reduce((sum, item) => sum + Number(item.rabTotalPrice || 0), 0);
  const totalRap = allItems.reduce((sum, item) => sum + Number(item.rapTotalPrice || 0), 0);
  const selisih = totalRap - totalRab;

  // ==========================================================
  // SEARCH & FILTER
  // ==========================================================
  const matchesQuery = (item, query) =>
    item.name?.toLowerCase().includes(query) ||
    item.category?.toLowerCase().includes(query) ||
    item.reference?.toLowerCase().includes(query);

  const filterGroups = (groupList, query) => {
    if (!query) return groupList;
    return (groupList || []).map((group) => {
      const filteredItems = (group.items || []).filter((item) => matchesQuery(item, query));
      const filteredChildren = filterGroups(group.children, query);
      if (filteredItems.length === 0 && filteredChildren.length === 0) return null;
      return { ...group, items: filteredItems, children: filteredChildren };
    }).filter(Boolean);
  };

  const visibleGroups = useMemo(() => filterGroups(groups, search.trim().toLowerCase()), [groups, search]);

  useEffect(() => {
    if (loadingProjects || loadingGroups || loadingItems) {
      toast.loading('Memuat data RAB...', { id: 'loading-rab' });
    } else {
      toast.dismiss('loading-rab');
    }
  }, [loadingProjects, loadingGroups, loadingItems]);

  // ==========================================================
  // ADD GROUP & SUB-GROUP
  // ==========================================================
  const openGroupForm = (parentId = null) => {
    setGroupModal({ parentId, name: "", reference: "" });
  };

  const handleSaveGroup = async () => {
    if (!groupModal.name.trim()) return toast.error("Nama wajib diisi.");
    
    toast.promise(createGroup({
      name: groupModal.name.trim(),
      reference: groupModal.reference.trim() || null,
      parentId: groupModal.parentId,
    }), {
      loading: 'Menyimpan group...',
      success: 'Group berhasil disimpan!',
      error: 'Gagal menyimpan group.'
    }).then(() => {
      setGroupModal(null);
    }).catch(error => console.error(error));
  };

  // ==========================================================
  // DELETE ACTIONS & SELECTION
  // ==========================================================
  const handleDeleteGroup = async (id) => {
    if (!window.confirm("Hapus group ini? Semua sub-group dan baris pekerjaan di dalamnya akan ikut terhapus.")) return;
    toast.promise(deleteGroup(id), {
      loading: 'Menghapus group...',
      success: 'Group berhasil dihapus!',
      error: 'Gagal menghapus group.'
    }).catch(error => console.error(error));
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Hapus baris pekerjaan ini?")) return;
    toast.promise(deleteRabItem(id).then(() => refreshGroups()), {
      loading: 'Menghapus item...',
      success: 'Item berhasil dihapus!',
      error: 'Gagal menghapus item.'
    }).catch(error => console.error(error));
  };

  const toggleSelection = (id) => {
    setSelectedItemIds((prev) => prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]);
  };

  const toggleAllCheckboxes = () => {
    if (selectedItemIds.length > 0) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(allItems.map(item => item.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItemIds.length === 0) return;
    if (!window.confirm(`Hapus ${selectedItemIds.length} item secara permanen?`)) return;
    
    toast.promise(deleteBulk(selectedItemIds).then(() => {
      setSelectedItemIds([]);
      return refreshGroups();
    }), {
      loading: 'Menghapus item terpilih...',
      success: 'Berhasil menghapus item terpilih!',
      error: 'Gagal menghapus item.'
    }).catch(error => console.error(error));
  };

  // ==========================================================
  // EDIT ITEM INDIVIDUAL
  // ==========================================================
  const openEdit = (item) => {
    const existingComps = Array.isArray(item.components)
      ? item.components.map((c) => ({
          name: c.name,
          unit: c.unit,
          section: c.section,
          coefficient: String(c.coefficient),
          unitPrice: String(c.unitPrice),
        }))
      : [blankComponent()];
    setEditModal({
      item,
      pricingMode: "manual",
      rapUnitPrice: item.rapUnitPrice ?? 0,
      overheadPercent: item.overheadPercent ?? item.overhead ?? 0,
      isByOwner: !!item.isByOwner,
      isStip: !!item.isStip,
      sourceJobId: "",
      switchQuery: "",
      switchResults: [],
      components: existingComps,
      bahanQuery: "",
      bahanResults: [],
      bahanTargetIdx: null,
    });
  };

  const toggleByOwner = () => {
    setEditModal((prev) => {
      const next = !prev.isByOwner;
      return { ...prev, isByOwner: next, rapUnitPrice: next ? 0 : prev.rapUnitPrice };
    });
  };

  const toggleStip = () => {
    setEditModal((prev) => {
      const next = !prev.isStip;
      return { ...prev, isStip: next, rapUnitPrice: next ? 0 : prev.rapUnitPrice };
    });
  };

  const searchSwitchJobs = async (query) => {
    setEditModal((prev) => ({ ...prev, switchQuery: query }));
    if (query.trim().length < 2) {
      setEditModal((prev) => ({ ...prev, switchResults: [] }));
      return;
    }
    try {
      const params = new URLSearchParams({ q: query.trim() });
      const response = await fetch(`${API_BASE}/jobs?${params.toString()}`);
      if (response.ok) {
        const results = await response.json();
        setEditModal((prev) => ({
          ...prev,
          switchResults: Array.isArray(results) ? results : [],
        }));
      }
    } catch {}
  };

  // Cari bahan/alat dari master PriceItem untuk mengisi nama + satuan + harga
  const searchBahan = async (query, targetIdx) => {
    setEditModal((prev) => ({ ...prev, bahanQuery: query, bahanTargetIdx: targetIdx }));
    if (query.trim().length < 2) {
      return setEditModal((prev) => ({ ...prev, bahanResults: [] }));
    }
    try {
      // cari BAHAN dan ALAT sekaligus, lalu gabung
      const q = encodeURIComponent(query.trim());
      const [rb, ra] = await Promise.all([
        fetch(`${API_BASE}/price-items?type=BAHAN&q=${q}`),
        fetch(`${API_BASE}/price-items?type=ALAT&q=${q}`),
      ]);
      const [db, da] = await Promise.all([
        rb.ok ? rb.json() : [],
        ra.ok ? ra.json() : [],
      ]);
      const merged = [...(Array.isArray(db) ? db : []), ...(Array.isArray(da) ? da : [])];
      setEditModal((prev) => ({ ...prev, bahanResults: merged.slice(0, 30) }));
    } catch {
      setEditModal((prev) => ({ ...prev, bahanResults: [] }));
    }
  };

  // Pilih bahan dari hasil pencarian -> isi baris komponen
  const pickBahan = (priceItem) => {
    setEditModal((prev) => {
      const rows = [...prev.components];
      const idx = prev.bahanTargetIdx ?? 0;
      rows[idx] = {
        ...rows[idx],
        name: priceItem.name,
        unit: priceItem.unit || rows[idx].unit,
        section: priceItem.type === "ALAT" ? "ALAT" : "BAHAN",
        unitPrice: String(Math.round(Number(priceItem.price) || 0)),
      };
      return { ...prev, components: rows, bahanResults: [], bahanQuery: "" };
    });
  };

  const addComponentRow = () =>
    setEditModal((prev) => ({ ...prev, components: [...prev.components, blankComponent()] }));

  const removeComponentRow = (idx) =>
    setEditModal((prev) => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== idx),
    }));

  const setComponentField = (idx, field, value) =>
    setEditModal((prev) => {
      const rows = [...prev.components];
      rows[idx] = { ...rows[idx], [field]: value };
      return { ...prev, components: rows };
    });

  const handleSaveEdit = async () => {
    const { item, pricingMode, isByOwner, isStip, overheadPercent, rapUnitPrice, sourceJobId } = editModal;
    if (pricingMode === "manual") {
      const updatePromise = updateRabItem(item.id, {
          rapUnitPrice: isByOwner || isStip ? 0 : Number(rapUnitPrice),
          overheadPercent: Number(overheadPercent),
          isByOwner,
          isStip,
      }).then(() => refreshGroups());
      
      toast.promise(updatePromise, {
        loading: 'Menyimpan harga manual...',
        success: 'Harga manual berhasil disimpan!',
        error: 'Gagal menyimpan harga manual.'
      }).then(() => {
        setEditModal(null);
      }).catch(err => console.error(err));
    } else if (pricingMode === "ahsp") {
      if (!sourceJobId) return toast.error("Pilih Master Pekerjaan (AHSP) dari daftar!");
      const payload = { newJobTypeId: sourceJobId };
      if (overheadPercent !== "") payload.customOverhead = Number(overheadPercent);

      const switchPromise = fetch(`${API_BASE}/rab-items/${item.id}/switch-job`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(res => {
        if (!res.ok) throw new Error("Gagal menghubungkan data AHSP.");
        return refreshGroups();
      });

      toast.promise(switchPromise, {
        loading: 'Menarik data Master AHSP...',
        success: 'Berhasil menghubungkan data AHSP!',
        error: 'Gagal menarik data Master AHSP.'
      }).then(() => {
        setEditModal(null);
      }).catch(err => console.error(err));
    } else if (pricingMode === "komponen") {
      // Rincian bahan & alat manual untuk item custom (tidak ada padanan AHSP).
      // Backend menghitung modal dari total komponen, lalu RAB = modal + overhead%.
      const rows = (editModal.components || [])
        .filter((c) => c.name.trim() && Number(c.coefficient) > 0)
        .map((c) => ({
          name: c.name.trim(),
          unit: c.unit.trim() || "-",
          section: c.section === "ALAT" ? "ALAT" : "BAHAN",
          coefficient: Number(c.coefficient),
          unitPrice: Number(String(c.unitPrice).replace(/[^0-9]/g, "")) || 0,
        }));

      if (rows.length === 0) {
        return toast.error("Isi minimal satu baris bahan/alat.");
      }

      const compPromise = updateRabItem(item.id, {
        components: rows,
        overheadPercent: Number(overheadPercent) || 0,
        isByOwner,
        isStip,
      }).then(() => refreshGroups());

      toast.promise(compPromise, {
        loading: 'Menyimpan rincian bahan & alat...',
        success: 'Rincian bahan & alat tersimpan!',
        error: 'Gagal menyimpan rincian bahan & alat.'
      }).then(() => {
        setEditModal(null);
      }).catch(err => console.error(err));
    }
  };

  // ==========================================================
  // BULK ACTIONS
  // ==========================================================
  const handleSaveBulkPrice = async () => {
    if (!bulkPriceModal.rapUnitPrice && !bulkPriceModal.overheadPercent) return toast.error("Isi salah satu nilai!");
    
    const bulkPricePromise = bulkPrice(
        selectedItemIds,
        bulkPriceModal.rapUnitPrice !== "" ? Number(bulkPriceModal.rapUnitPrice) : undefined,
        bulkPriceModal.overheadPercent !== "" ? Number(bulkPriceModal.overheadPercent) : undefined
    ).then(() => refreshGroups());
    
    toast.promise(bulkPricePromise, {
      loading: 'Menyimpan harga massal...',
      success: 'Harga massal berhasil disimpan!',
      error: 'Gagal menyimpan harga massal.'
    }).then(() => {
      setBulkPriceModal(null);
      setSelectedItemIds([]);
    }).catch(e => console.error(e));
  };

  const searchBulkSwitchJobs = async (query) => {
    setBulkSwitchModal((prev) => ({ ...prev, switchQuery: query }));
    if (query.trim().length < 2) return setBulkSwitchModal((prev) => ({ ...prev, switchResults: [] }));
    try {
      const res = await fetch(`${API_BASE}/jobs?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setBulkSwitchModal((prev) => ({ ...prev, switchResults: Array.isArray(data) ? data : [] }));
      }
    } catch {}
  };

  const handleSaveBulkSwitch = async () => {
    if (!bulkSwitchModal.sourceJobId) return toast.error("ID Master Pekerjaan wajib dipilih!");
    
    const bulkSwitchPromise = bulkSwitchJob(
        selectedItemIds,
        bulkSwitchModal.sourceJobId,
        bulkSwitchModal.overheadPercent !== "" ? Number(bulkSwitchModal.overheadPercent) : undefined
    ).then(() => refreshGroups());
    
    toast.promise(bulkSwitchPromise, {
      loading: 'Mengubah master pekerjaan massal...',
      success: 'Berhasil mengubah master pekerjaan!',
      error: 'Gagal mengubah master pekerjaan.'
    }).then(() => {
      setBulkSwitchModal(null);
      setSelectedItemIds([]);
    }).catch(e => console.error(e));
  };

  const handleSaveBulkName = async () => {
    if (!bulkNameModal.name || !bulkNameModal.rapUnitPrice) return toast.error("Nama item dan harga baru wajib diisi!");
    
    const sapuJagatPromise = fetch(`${API_BASE}/projects/${projectId}/rab-items/bulk-price-by-name`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: bulkNameModal.name, newUnitPrice: Number(bulkNameModal.rapUnitPrice) })
    }).then(res => {
      if (!res.ok) throw new Error("Gagal Sapu Jagat.");
      return refreshGroups();
    });
    
    toast.promise(sapuJagatPromise, {
      loading: 'Menyapu jagat...',
      success: 'Berhasil mengubah harga massal by name!',
      error: 'Gagal melakukan Sapu Jagat.'
    }).then(() => {
      setBulkNameModal(null);
    }).catch(e => console.error(e));
  };

  // ==========================================================
  // EXPORT & VIEW
  // ==========================================================
  const exportRabExcel = () => projectId && window.open(`${API_BASE}/projects/${projectId}/rab-items/export`, "_blank");
  const exportBvExcel = () => projectId && window.open(`${API_BASE}/projects/${projectId}/bv-items/export`, "_blank");
  const exportFullExcel = () => projectId && window.open(`${API_BASE}/projects/${projectId}/export-full`, "_blank");
  const scheduleExport = () => projectId && window.open(`${API_BASE}/projects/${projectId}/time-schedule/export`, "_blank");
  const viewRab = () => projectId && window.open(`${API_BASE}/projects/${projectId}/rab-items/view`, "_blank");

  // ==========================================================
  // SYNC FINANCE
  // ==========================================================
  const handleSyncFinance = async () => {
    if (!window.confirm("Yakin ingin mengirim RAB ini ke Finance? Proses ini akan membuat daftar Procurement dan mengunci RAB.")) return;
    
    const syncPromise = fetch(`${API_BASE}/projects/${projectId}/sync-finance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(async res => {
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal mengirim data ke Finance.");
      }
    });

    toast.promise(syncPromise, {
      loading: 'Mengirim RAB ke Finance...',
      success: 'Berhasil dikirim ke Finance! RAB sekarang terkunci.',
      error: 'Gagal mengirim RAB ke Finance.'
    }).then(() => {
      setTimeout(() => window.location.reload(), 1500); 
    }).catch(err => console.error(err));
  };

  const handleCancelFinance = async () => {
    if (!window.confirm("Yakin ingin membatalkan kiriman ke Finance? Ini akan menghapus data di dasbor Finance dan membuka kunci RAB.")) return;
    
    const cancelPromise = fetch(`${API_BASE}/projects/${projectId}/cancel-finance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(async res => {
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal membatalkan sinkronisasi.");
      }
    });

    toast.promise(cancelPromise, {
      loading: 'Membatalkan kiriman ke Finance...',
      success: 'Batal kirim berhasil. RAB kembali terbuka (DRAFT).',
      error: 'Gagal membatalkan sinkronisasi.'
    }).then(() => {
      setTimeout(() => window.location.reload(), 1500);
    }).catch(err => console.error(err));
  };

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <div className={styles["rab-wrapper"]}>
      <Header />
      <header className={styles["rab-header"]}>
        {onBack && (
          <button className={styles["rab-back-btn"]} onClick={onBack} type="button">
            <ChevronLeft size={18} /> Kembali
          </button>
        )}
        {/* Modul BV = hulu dari RAB: selalu tersedia, proyek ikut terbawa */}
        {onBackToBv && (
          <button className={styles["rab-back-btn"]} onClick={() => onBackToBv(projectId)} type="button">
            <ChevronLeft size={18} /> Kembali ke BV
          </button>
        )}
        <div className={styles["rab-header-main"]}>
          <p className={styles["rab-eyebrow"]}>{project?.name ? `Project: ${project.name}` : "Financial Control"}</p>
          <h2 className={styles["rab-title"]}>RAB &amp; Budgeting</h2>
          <p className={styles["rab-subtitle"]}>Rencana Anggaran Biaya (RAB) vs Rencana Anggaran Pelaksanaan (RAP)</p>
        </div>
        <div style={{ minWidth: '300px' }}>
          <ProjectSelector 
            projectId={projectId}
            projectList={projectList}
            loading={loadingProjects}
            onChange={(e) => {
              setProjectId(e.target.value || null);
              onProjectChange?.(e.target.value || null);
            }}
          />
        </div>
      </header>

      <main className={styles["rab-content"]}>
        {!projectId ? (
          <div className={styles["rab-empty-state"]}>
            <ClipboardList size={42} className={styles["rab-empty-icon"]} />
            <h3>Belum ada project yang dipilih</h3>
            <p>Pilih project yang sudah memiliki laporan Survey dari dropdown di atas untuk melihat RAB.</p>
          </div>
        ) : (
          <>
            <div className={styles["rab-toolbar"]}>
              {/* TOMBOL EXPORT DLL */}
              <button className={styles["rab-btn"]} onClick={exportRabExcel}>⬇ Export RAB</button>
              <button className={styles["rab-btn"]} onClick={exportBvExcel}>⬇ Export BV</button>
              <button className={styles["rab-btn"]} onClick={scheduleExport}>⬇ Export Schedule</button>
              <button className={styles["rab-btn"]} onClick={exportFullExcel}>⬇ Export Lengkap</button>
              <button className={styles["rab-btn"]} onClick={viewRab}>👁 View RAB</button>
              
              {project?.rabStatus === "LOCKED" ? (
                <button className={[styles["rab-btn"], styles["rab-btn-danger"]].join(" ")} onClick={handleCancelFinance} type="button">
                  Batal Kirim Finance
                </button>
              ) : (
                <button className={[styles["rab-btn"], styles["rab-btn-success"]].join(" ")} onClick={handleSyncFinance} type="button">
                  Kirim ke Finance
                </button>
              )}

              <button className={[styles["rab-btn"], styles["rab-refresh-btn"]].join(" ")} onClick={refreshGroups} type="button">
                <RefreshCw size={15} /> Refresh
              </button>
            </div>

            {/* TOOLBAR BULK ACTIONS (Sapu Jagat) */}
            <div className={styles["rab-toolbar-bulk"]}>
              <strong>Bulk Actions:</strong>
              
              <button className={[styles["rab-btn"], styles["rab-btn-small"]].join(" ")} onClick={toggleAllCheckboxes}>
                ☑ Pilih/Batal Semua
              </button>
              
              <button className={[styles["rab-btn"], styles["rab-btn-small"], styles["rab-btn-danger"]].join(" ")} onClick={handleBulkDelete}>
                Hapus Terpilih
              </button>
              
              <button className={[styles["rab-btn"], styles["rab-btn-small"]].join(" ")} onClick={() => selectedItemIds.length ? setBulkPriceModal({ rapUnitPrice: "", overheadPercent: "" }) : toast.error("Pilih baris yang akan diedit harganya terlebih dahulu!")}>
                Edit Harga Terpilih
              </button>
              
              <button className={[styles["rab-btn"], styles["rab-btn-small"], styles["rab-btn-success"]].join(" ")} onClick={() => selectedItemIds.length ? setBulkSwitchModal({ sourceJobId: "", switchQuery: "", switchResults: [], overheadPercent: "" }) : toast.error("Pilih baris yang akan disuntik AHSP terlebih dahulu!")}>
                Suntik AHSP Terpilih
              </button>
              
              <button className={[styles["rab-btn"], styles["rab-btn-small"], styles["rab-btn-primary"]].join(" ")} onClick={() => projectId ? setBulkNameModal({ name: "", rapUnitPrice: "" }) : toast.error("Pilih project terlebih dahulu!")}>
                Edit Harga (By Nama)
              </button>
            </div>

            <div className={styles["rab-stats-grid"]}>
              <div className={[styles["rab-plate"], selisih > 0 ? styles["is-danger"] : ""].join(" ")}>
                <div className={styles["rab-stat-header"]}><Wallet size={18} className={styles["rab-stat-icon"]} /><span className={styles["rab-stat-label"]}>Total RAB</span></div>
                <div className={[styles["rab-stat-value"], styles["is-mono"]].join(" ")}>{fmtRp(totalRab)}</div>
                <div className={styles["rab-stat-desc"]}>Harga Jual / Kontrak</div>
              </div>
              <div className={styles["rab-plate"]}>
                <div className={styles["rab-stat-header"]}><ClipboardList size={18} className={styles["rab-stat-icon"]} /><span className={styles["rab-stat-label"]}>Total RAP</span></div>
                <div className={[styles["rab-stat-value"], styles["is-mono"]].join(" ")}>{fmtRp(totalRap)}</div>
                <div className={styles["rab-stat-desc"]}>Modal Pelaksanaan Murni</div>
              </div>
              <div className={[styles["rab-plate"], selisih > 0 ? styles["is-danger"] : ""].join(" ")}>
                <div className={styles["rab-stat-header"]}><Scale size={18} className={styles["rab-stat-icon"]} /><span className={styles["rab-stat-label"]}>Selisih</span></div>
                <div className={[styles["rab-stat-value"], styles["is-mono"]].join(" ")}>{selisih > 0 ? "+" : ""}{fmtRp(selisih)}</div>
                <div className={styles["rab-stat-desc"]}>RAP dikurangi RAB</div>
              </div>
              <div className={styles["rab-plate"]}>
                <div className={styles["rab-stat-header"]}><TrendingUp size={18} className={styles["rab-stat-icon"]} /><span className={styles["rab-stat-label"]}>Item</span></div>
                <div className={[styles["rab-stat-value"], styles["is-mono"]].join(" ")}>{allItems.length}</div>
                <div className={styles["rab-stat-desc"]}>Jumlah item pekerjaan</div>
              </div>
            </div>

            <div className={[styles["rab-plate"], styles["rab-search-plate"]].join(" ")}>
              <div className={styles["rab-search-box"]}>
                <Search size={15} className={styles["rab-search-icon"]} />
                <input type="text" placeholder="Cari nama, kategori, atau reference..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>

            <div className={[styles["rab-plate"], styles["rab-tree-plate"]].join(" ")}>
              {loadingGroups ? (
                <p className={styles["rab-state-message"]}>Memuat data RAB...</p>
              ) : fetchError ? (
                <p className={[styles["rab-state-message"], styles["rab-state-error"]].join(" ")}>{fetchError}</p>
              ) : visibleGroups.length === 0 ? (
                <p className={styles["rab-state-message"]}>Belum ada Group Pekerjaan. Buat dari tombol di atas.</p>
              ) : (
                visibleGroups.map((group) => (
                  <RabGroupNode
                    key={group.id} group={group} depth={0}
                    sumGroupRecursive={sumGroupRecursive}
                    onDeleteGroup={handleDeleteGroup}
                    onAddSubGroup={openGroupForm}
                    onEditItem={openEdit}
                    onDeleteItem={deleteItem}
                    selectedItemIds={selectedItemIds}
                    onToggleSelect={toggleSelection}
                  />
                ))
              )}
            </div>
          </>
        )}
      </main>

      {/* ================= MODAL TAMBAH GROUP ================= */}
      {groupModal && (
        <div className={styles["rab-modal-overlay"]}>
          <div className={styles["rab-modal"]}>
            <h3>{groupModal.parentId ? "Tambah Sub-Group Pekerjaan" : "Tambah Group Pekerjaan"}</h3>
            <label className={styles["rab-form-label"]} style={{ marginTop: '16px' }}>
              Nama
              <input type="text" className={styles["rab-form-input"]} placeholder="mis. PEKERJAAN PERSIAPAN" value={groupModal.name} onChange={(e) => setGroupModal({ ...groupModal, name: e.target.value })} />
            </label>
            <label className={styles["rab-form-label"]} style={{ marginTop: '16px' }}>
              Referensi (opsional)
              <input type="text" className={styles["rab-form-input"]} placeholder="mis. 1 atau 1.1" value={groupModal.reference} onChange={(e) => setGroupModal({ ...groupModal, reference: e.target.value })} />
            </label>
            <div className={styles["rab-modal-actions"]} style={{ marginTop: '24px' }}>
              <button className={styles["rab-btn"]} onClick={() => setGroupModal(null)} type="button">Batal</button>
              <button className={[styles["rab-btn"], styles["rab-btn-primary"]].join(" ")} onClick={handleSaveGroup} type="button">Simpan Group</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT MODAL INDIVIDUAL ================= */}
      {editModal && (
        <div className={styles["rab-modal-overlay"]}>
          <div className={styles["rab-modal"]}>
            <h3>Edit Baris Pekerjaan</h3>
            <p className={styles["rab-edit-label"]}>{editModal.item.name} — {editModal.item.paymentUnit} — Vol: {Number(editModal.item.volume).toFixed(2)}</p>

            <div className={styles["rab-toggle-row"]}>
              <button type="button" className={[styles["rab-btn"], styles["rab-btn-small"], editModal.isByOwner ? styles["rab-btn-active"] : ""].join(" ")} onClick={toggleByOwner}>
                {editModal.isByOwner ? "✓ By Owner" : "Set By Owner"}
              </button>
              <button type="button" className={[styles["rab-btn"], styles["rab-btn-small"], editModal.isStip ? styles["rab-btn-active"] : ""].join(" ")} onClick={toggleStip}>
                {editModal.isStip ? "Batal Set Stip" : "Set Harga Stip (-)"}
              </button>
            </div>

            <label className={styles["rab-form-label"]} style={{ marginTop: '16px' }}>
              Persentase Overhead / Profit (%)
              <input type="number" step="0.01" className={styles["rab-form-input"]} value={editModal.isByOwner || editModal.isStip ? "" : editModal.overheadPercent} disabled={editModal.isByOwner || editModal.isStip} onChange={(e) => setEditModal({ ...editModal, overheadPercent: e.target.value })} />
            </label>

            <p className={styles["rab-form-hint"]} style={{ marginBottom: '24px' }}>Profit ini akan digunakan di Mode Manual maupun Tarik AHSP.</p>

            <div className={styles["rab-tab-container"]}>
              <button type="button" className={[styles["rab-tab-btn"], editModal.pricingMode === "manual" ? styles["active"] : ""].join(" ")} onClick={() => setEditModal({ ...editModal, pricingMode: "manual" })}>
                📝 Input Manual
              </button>
              <button type="button" className={[styles["rab-tab-btn"], editModal.pricingMode === "ahsp" ? styles["active"] : ""].join(" ")} onClick={() => setEditModal({ ...editModal, pricingMode: "ahsp" })}>
                🔄 Tarik Master AHSP
              </button>
              <button type="button" className={[styles["rab-tab-btn"], editModal.pricingMode === "komponen" ? styles["active"] : ""].join(" ")} onClick={() => setEditModal({ ...editModal, pricingMode: "komponen" })}>
                🧱 Rincian Bahan &amp; Alat
              </button>
            </div>

            {editModal.pricingMode === "manual" && (
              <div style={{ padding: '12px', background: '#1a1a1a', borderRadius: '6px', border: '1px solid #333' }}>
                <label className={styles["rab-form-label"]}>
                  Harga Modal / RAP (Satuan)
                  <input type="text" className={styles["rab-form-input"]} value={editModal.isByOwner || editModal.isStip ? "" : formatInputNumber(editModal.rapUnitPrice)} disabled={editModal.isByOwner || editModal.isStip} onChange={(e) => setEditModal({ ...editModal, rapUnitPrice: parseInputNumber(e.target.value) })} />
                </label>
              </div>
            )}

            {editModal.pricingMode === "ahsp" && (
              <div style={{ padding: '12px', background: '#1a1a1a', borderRadius: '6px', border: '1px solid #333' }}>
                <label className={styles["rab-form-label"]}>
                  Cari Jenis Pekerjaan Master
                  <input className={styles["rab-form-input"]} placeholder="Ketik nama pekerjaan dari AHSP..." value={editModal.switchQuery} onChange={(e) => searchSwitchJobs(e.target.value)} />
                </label>
                {editModal.switchResults.length > 0 && (
                  <label className={styles["rab-form-label"]} style={{ marginTop: '12px' }}>
                    Pilih Hasil Pencarian:
                    <select className={styles["rab-form-input"]} size={4} value={editModal.sourceJobId || ""} onChange={(e) => setEditModal({ ...editModal, sourceJobId: e.target.value })}>
                      <option value="" disabled>-- Klik salah satu Master AHSP di bawah ini --</option>
                      {editModal.switchResults.map((job) => (
                        <option key={job.id} value={job.id}>{job.reference ? `${job.reference} — ` : ""}{job.name}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}


            {editModal.pricingMode === "komponen" && (
              <div style={{ padding: '12px', background: '#1a1a1a', borderRadius: '6px', border: '1px solid #333' }}>
                <p className={styles["rab-form-hint"]} style={{ marginTop: 0 }}>
                  Dipakai untuk item yang tidak ada padanannya di AHSP (mis. furniture custom).
                  Isi bahan dan alat, lalu sisanya dihitung dari overhead di atas.
                </p>

                <table className={styles["rab-komp-table"]}>
                  <thead>
                    <tr>
                      <th style={{ width: '34%' }}>Bahan / Alat</th>
                      <th style={{ width: '9%' }}>Satuan</th>
                      <th style={{ width: '9%' }}>Jenis</th>
                      <th style={{ width: '11%' }}>Koef./Qty</th>
                      <th style={{ width: '17%' }}>Harga Satuan</th>
                      <th style={{ width: '14%' }}>Subtotal</th>
                      <th style={{ width: '6%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(editModal.components || []).map((c, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            className={styles["rab-form-input"]}
                            style={{ marginTop: 0 }}
                            placeholder="ketik min. 2 huruf untuk cari..."
                            value={c.name}
                            onChange={(e) => {
                              setComponentField(idx, "name", e.target.value);
                              searchBahan(e.target.value, idx);
                            }}
                          />
                        </td>
                        <td>
                          <input
                            className={styles["rab-form-input"]}
                            style={{ marginTop: 0 }}
                            placeholder="-"
                            value={c.unit}
                            onChange={(e) => setComponentField(idx, "unit", e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className={styles["rab-form-input"]}
                            style={{ marginTop: 0 }}
                            value={c.section}
                            onChange={(e) => setComponentField(idx, "section", e.target.value)}
                          >
                            <option value="BAHAN">Bahan</option>
                            <option value="ALAT">Alat</option>
                          </select>
                        </td>
                        <td>
                          <input
                            className={styles["rab-form-input"]}
                            style={{ marginTop: 0 }}
                            value={c.coefficient}
                            onChange={(e) => setComponentField(idx, "coefficient", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className={styles["rab-form-input"]}
                            style={{ marginTop: 0 }}
                            value={formatInputNumber(c.unitPrice)}
                            onChange={(e) => setComponentField(idx, "unitPrice", parseInputNumber(e.target.value))}
                          />
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--rab-gold-bright)' }}>
                          {fmtRp(compLineTotal(c))}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={[styles["rab-btn"], styles["rab-btn-small"]].join(" ")}
                            onClick={() => removeComponentRow(idx)}
                            title="Hapus baris"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {editModal.bahanResults.length > 0 && (
                  <div className={styles["rab-komp-results"]}>
                    {editModal.bahanResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={styles["rab-komp-result-item"]}
                        onClick={() => pickBahan(p)}
                      >
                        <span>{p.name}</span>
                        <span style={{ opacity: 0.7 }}>
                          {p.type} · {p.unit} · {fmtRp(p.price)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
                  <button
                    type="button"
                    className={[styles["rab-btn"], styles["rab-btn-small"]].join(" ")}
                    onClick={addComponentRow}
                  >
                    + Tambah Baris
                  </button>
                  <span className={styles["rab-form-hint"]} style={{ margin: 0 }}>
                    Modal ({(editModal.components || []).length} baris):{" "}
                    <strong>{fmtRp((editModal.components || []).reduce((s, c) => s + compLineTotal(c), 0))}</strong>
                    {" "}· Harga jual: <strong>{fmtRp(
                      (editModal.components || []).reduce((s, c) => s + compLineTotal(c), 0) *
                      (1 + (Number(editModal.overheadPercent) || 0) / 100)
                    )}</strong>
                  </span>
                </div>
              </div>
            )}

            <div className={styles["rab-modal-actions"]} style={{ marginTop: '24px' }}>
              <button className={styles["rab-btn"]} onClick={() => setEditModal(null)} type="button">Batal</button>
              <button className={[styles["rab-btn"], styles["rab-btn-primary"]].join(" ")} onClick={handleSaveEdit} type="button">Simpan Perubahan</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL BULK PRICE ================= */}
      {bulkPriceModal && (
        <div className={styles["rab-modal-overlay"]}>
          <div className={styles["rab-modal"]}>
            <h3>Edit Harga Massal (Terpilih)</h3>
            <label className={styles["rab-form-label"]} style={{ marginTop: '16px' }}>Harga Baru (RAP Satuan)
              <input type="text" className={styles["rab-form-input"]} placeholder="Kosongkan jika tidak ingin ubah" value={formatInputNumber(bulkPriceModal.rapUnitPrice)} onChange={(e) => setBulkPriceModal({ ...bulkPriceModal, rapUnitPrice: parseInputNumber(e.target.value) })} />
            </label>
            <label className={styles["rab-form-label"]} style={{ marginTop: '16px' }}>Overhead Baru (%)
              <input type="number" className={styles["rab-form-input"]} placeholder="Kosongkan jika tidak ingin ubah" value={bulkPriceModal.overheadPercent} onChange={(e) => setBulkPriceModal({ ...bulkPriceModal, overheadPercent: e.target.value })} />
            </label>
            <div className={styles["rab-modal-actions"]} style={{ marginTop: '24px' }}>
              <button className={styles["rab-btn"]} onClick={() => setBulkPriceModal(null)}>Batal</button>
              <button className={[styles["rab-btn"], styles["rab-btn-primary"]].join(" ")} onClick={handleSaveBulkPrice}>Update Massal</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL BULK SWITCH AHSP ================= */}
      {bulkSwitchModal && (
        <div className={styles["rab-modal-overlay"]}>
          <div className={styles["rab-modal"]}>
            <h3>Suntik AHSP Massal (Terpilih)</h3>
            <div style={{ padding: '12px', background: '#1a1a1a', borderRadius: '6px', border: '1px solid #333', marginTop: '16px' }}>
              <label className={styles["rab-form-label"]}>Cari Master Pekerjaan
                <input className={styles["rab-form-input"]} placeholder="Ketik nama pekerjaan..." value={bulkSwitchModal.switchQuery} onChange={(e) => searchBulkSwitchJobs(e.target.value)} />
              </label>
              {bulkSwitchModal.switchResults.length > 0 && (
                <select className={styles["rab-form-input"]} size={4} style={{ marginTop: '12px' }} value={bulkSwitchModal.sourceJobId || ""} onChange={(e) => setBulkSwitchModal({ ...bulkSwitchModal, sourceJobId: e.target.value })}>
                  <option value="" disabled>-- Pilih Master AHSP --</option>
                  {bulkSwitchModal.switchResults.map((job) => (
                    <option key={job.id} value={job.id}>{job.reference ? `${job.reference} — ` : ""}{job.name}</option>
                  ))}
                </select>
              )}
            </div>
            <label className={styles["rab-form-label"]} style={{ marginTop: '16px' }}>Custom Overhead (%)
              <input type="number" className={styles["rab-form-input"]} placeholder="Kosongkan untuk pakai default" value={bulkSwitchModal.overheadPercent} onChange={(e) => setBulkSwitchModal({ ...bulkSwitchModal, overheadPercent: e.target.value })} />
            </label>
            <div className={styles["rab-modal-actions"]} style={{ marginTop: '24px' }}>
              <button className={styles["rab-btn"]} onClick={() => setBulkSwitchModal(null)}>Batal</button>
              <button className={[styles["rab-btn"], styles["rab-btn-success"]].join(" ")} onClick={handleSaveBulkSwitch}>Suntik Massal</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL SAPU JAGAT BY NAMA ================= */}
      {bulkNameModal && (
        <div className={styles["rab-modal-overlay"]}>
          <div className={styles["rab-modal"]}>
            <h3>Sapu Jagat: Update By Nama</h3>
            <label className={styles["rab-form-label"]} style={{ marginTop: '16px' }}>Nama Item (Harus Sama Persis)
              <input type="text" className={styles["rab-form-input"]} placeholder="Misal: Cat Dinding Dalam" value={bulkNameModal.name} onChange={(e) => setBulkNameModal({ ...bulkNameModal, name: e.target.value })} />
            </label>
            <label className={styles["rab-form-label"]} style={{ marginTop: '16px' }}>Harga Baru (RAP Satuan)
              <input type="text" className={styles["rab-form-input"]} value={formatInputNumber(bulkNameModal.rapUnitPrice)} onChange={(e) => setBulkNameModal({ ...bulkNameModal, rapUnitPrice: parseInputNumber(e.target.value) })} />
            </label>
            <div className={styles["rab-modal-actions"]} style={{ marginTop: '24px' }}>
              <button className={styles["rab-btn"]} onClick={() => setBulkNameModal(null)}>Batal</button>
              <button className={[styles["rab-btn"], styles["rab-btn-danger"]].join(" ")} onClick={handleSaveBulkName}>Eksekusi Sapu Jagat</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// ==========================================================
// GROUP NODE & ITEMS TABLE
// ==========================================================
function RabGroupNode({ 
  group, 
  depth, 
  sumGroupRecursive, 
  onDeleteGroup, 
  onAddSubGroup, // Prop ini bisa dibiarkan (atau dihapus dari pemanggilan di atas) jika sewaktu-waktu dibutuhkan kembali
  onEditItem, 
  onDeleteItem, 
  selectedItemIds, 
  onToggleSelect 
}) {
  const subtotal = sumGroupRecursive(group);
  return (
    <div className={styles["rab-group-block"]} style={{ marginLeft: depth > 0 ? 18 : 0 }}>
      <div className={depth === 0 ? styles["rab-group-row"] : styles["rab-subgroup-row"]}>
        <div>
          <span className={styles["rab-group-label"]}>{group.name}</span>
        </div>
        <div className={styles["rab-group-actions"]}>
          <span className={styles["rab-group-subtotal"]}>{fmtRp(subtotal)}</span>
          {/* Tombol Tambah Sub-Group Dihapus dari sini sesuai permintaan */}
          
          <button className={[styles["rab-btn"], styles["rab-btn-small"], styles["rab-btn-danger"]].join(" ")} onClick={() => onDeleteGroup(group.id)} type="button" title="Hapus"><Trash2 size={14} /></button>
        </div>
      </div>
      {(group.items || []).length > 0 && (
        <RabItemsTable 
          items={group.items} 
          onEdit={onEditItem} 
          onDelete={onDeleteItem} 
          selectedItemIds={selectedItemIds}
          onToggleSelect={onToggleSelect}
        />
      )}
      {(group.children || []).map((child) => (
        <RabGroupNode
          key={child.id} group={child} depth={depth + 1}
          sumGroupRecursive={sumGroupRecursive}
          onDeleteGroup={onDeleteGroup}
          onAddSubGroup={onAddSubGroup}
          onEditItem={onEditItem} onDeleteItem={onDeleteItem}
          selectedItemIds={selectedItemIds}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}

function RabItemsTable({ items, onEdit, onDelete, selectedItemIds, onToggleSelect }) {
  let counter = 0;

  return (
    <table className={styles["rab-items-table"]}>
      <thead>
        <tr>
          <th style={{ width: "30px", textAlign: "center" }}>✓</th>
          <th>Uraian Pekerjaan</th>
          <th>Satuan</th>
          <th>Volume</th>
          <th>RAP Satuan</th>
          <th>RAP Total</th>
          <th>RAB Satuan</th>
          <th>RAB Total</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const isChild = !!item.parentId;
          const hasChildren = item.hasChildren || items.some((child) => child.parentId === item.id);
          const no = isChild ? "" : ++counter;
          const special = item.isByOwner ? "By Owner" : item.isStip ? "-" : null;

          let displayRapTotal = Number(item.rapTotalPrice || 0);
          let displayRabTotal = Number(item.rabTotalPrice || 0);

          if (hasChildren) {
            const childItems = items.filter(child => child.parentId === item.id);
            displayRapTotal = childItems.reduce((sum, child) => sum + Number(child.rapTotalPrice || 0), 0);
            displayRabTotal = childItems.reduce((sum, child) => sum + Number(child.rabTotalPrice || 0), 0);
          }

          return (
            <tr key={item.id} className={selectedItemIds.includes(item.id) ? styles["rab-row-selected"] : ""}>
              <td style={{ textAlign: "center" }}>
                {/* Checkbox disembunyikan jika baris ini memiliki child */}
                {!hasChildren && (
                  <input 
                    type="checkbox" 
                    className={styles["rab-checkbox"]}
                    checked={selectedItemIds.includes(item.id)} 
                    onChange={() => onToggleSelect(item.id)} 
                  />
                )}
              </td>
              <td>
                {isChild ? "— " : ""}
                {item.name}
                {hasChildren && <span style={{ fontSize: "10px", marginLeft: "6px", color: "#d4af37", background: "rgba(212,175,55,0.1)", padding: "2px 6px", borderRadius: "4px" }}>Parent</span>}
              </td>
              <td>{hasChildren ? "" : item.paymentUnit}</td>
              <td className={styles["rab-mono"]}>{item.volume != null && !hasChildren ? Number(item.volume).toFixed(2) : ""}</td>
              {special && !hasChildren ? (
                <>
                  <td className={[styles["rab-text-center"], styles["rab-special-cell"]].join(" ")}>{special}</td>
                  <td className={[styles["rab-text-center"], styles["rab-special-cell"]].join(" ")}>{special}</td>
                  <td className={[styles["rab-text-center"], styles["rab-special-cell"]].join(" ")}>{special}</td>
                  <td className={[styles["rab-text-center"], styles["rab-special-cell"]].join(" ")}>{special}</td>
                </>
              ) : (
                <>
                  <td className={styles["rab-mono"]}>{hasChildren ? "" : fmtRp(item.rapUnitPrice)}</td>
                  <td className={styles["rab-mono"]}>{fmtRp(displayRapTotal)}</td>
                  <td className={styles["rab-mono"]}>{hasChildren ? "" : fmtRp(item.rabUnitPrice)}</td>
                  <td className={[styles["rab-mono"], styles["rab-fw-bold"]].join(" ")}>{fmtRp(displayRabTotal)}</td>
                </>
              )}
              <td className={styles["rab-row-actions"]}>
                {!hasChildren && (
                  <button className={[styles["rab-btn"], styles["rab-btn-small"]].join(" ")} onClick={() => onEdit(item)} type="button" title="Edit"><Pencil size={14} /></button>
                )}
                <button className={[styles["rab-btn"], styles["rab-btn-small"], styles["rab-btn-danger"]].join(" ")} onClick={() => onDelete(item.id)} type="button" title="Hapus"><Trash2 size={14} /></button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default RabBudgeting;
