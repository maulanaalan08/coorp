import { useEffect, useMemo, useRef, useState, Fragment } from "react";
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
  Tag,
  History,
  Info,
} from "lucide-react";
import BvRabHistoryPanel from "../components/BvRabHistoryPanel";
import BvRabApprovalBar from "../components/BvRabApprovalBar";
import ProjectSelector from "../components/ProjectSelector";
import styles from "../styles/RabBudgeting.module.css";
import Header from "../components/Header";
import { useProjects } from "../hooks/useProjects";
import { useRabGroups } from "../hooks/useRabGroups";
import { useRabItems } from "../hooks/useRabItems";
import toast from "react-hot-toast";
import { workCategoryService } from "../services/workCategoryService";
import {
  buildRabSwitchClassification,
  getWorkClassificationLabel,
  resolveBulkRabWorkCategoryId,
} from "../utils/workSubCategorySelection";
import { countGroupItemsBySubCategory, filterGroupTreeBySubCategory } from "../utils/workSubCategoryFilter";

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

const ALL_CATEGORY_FILTER = 'SEMUA';
const BV_RAB_APPROVAL_UI_ENABLED = false;
const DISCIPLINE_BADGE = { INTERIOR: '#a0522d', SIPIL: '#4682b4', GENERAL: '#666', MEP: '#2e8b57', SEMUA: '#666' };

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
  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  })();
  const [projectId, setProjectId] = useState(initialProjectId);
  const [approvalLocked, setApprovalLocked] = useState(false);
  const [search, setSearch] = useState("");
  const [budgetMode, setBudgetMode] = useState("rap");
  const canEditRap = ["SUPER_ADMIN", "PROJECT_MANAGER", "PERENCANA"].includes(user?.role) && !approvalLocked;
  // Overhead (%) edit 3 komponen default tetap terbatas untuk 3 role di atas.
  const canEditOverhead = ["SUPER_ADMIN", "PROJECT_MANAGER", "PERENCANA"].includes(user?.role) && !approvalLocked;
  // Tambah komponen OVH baru: semua role yang login boleh, selama project tidak terkunci approval.
  const canAddOvhComponent = Boolean(user?.role) && !approvalLocked;
  const canExportRap = ["SUPER_ADMIN", "PROJECT_MANAGER", "PERENCANA"].includes(user?.role);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const [activeFilter, setActiveFilter] = useState(() => {
    const raw = window.location.hash.replace('#', '');
    if (!raw.startsWith('rab')) return ALL_CATEGORY_FILTER;
    const parts = raw.split('/');
    const filter = parts[1]?.toUpperCase();
    return filter || ALL_CATEGORY_FILTER;
  });
  const [activeSubCategoryId, setActiveSubCategoryId] = useState('');
  const [filterSubcategories, setFilterSubcategories] = useState([]);
  const [loadingFilterSubcategories, setLoadingFilterSubcategories] = useState(false);
  const filterSubcategoryRequestRef = useRef(0);

  useEffect(() => {
    const onHash = () => {
      const raw = window.location.hash.replace('#', '');
      if (!raw.startsWith('rab')) {
        window.location.hash = `rab/${ALL_CATEGORY_FILTER}`;
        return;
      }
      const parts = raw.split('/');
      const filter = parts[1]?.toUpperCase();
      setActiveFilter(filter || ALL_CATEGORY_FILTER);
    };
    window.addEventListener('hashchange', onHash);
    onHash();
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // ==========================================================
  // CUSTOM HOOKS
  // ==========================================================
  const { projects: projectList, loading: loadingProjects } = useProjects();

  const project = useMemo(() => projectList.find(p => p.id === projectId), [projectList, projectId]);

  // Kategori proyek dinamis (sama pola dengan BV)
  const configuredProjectCategories = (project?.workCategories || [])
    .filter((entry) => entry.isActive && entry.workCategory?.isActive !== false)
    .filter((entry) => String(entry.workCategory?.code || '').trim().toUpperCase() !== 'GENERAL')
    .sort((a, b) =>
      (a.workCategory?.sortOrder ?? 0) - (b.workCategory?.sortOrder ?? 0)
      || String(a.workCategory?.name || '').localeCompare(String(b.workCategory?.name || '')),
    );
  const projectCategoryOptions = configuredProjectCategories.map((entry) => ({
    id: entry.workCategoryId,
    workCategoryId: entry.workCategoryId,
    code: String(entry.workCategory?.code || '').toUpperCase(),
    name: String(entry.workCategory?.code || '').toUpperCase(),
    grade: entry.grade || null,
    pricingMode: entry.pricingMode || null,
  }));
  const categoryFilterOptions = [
    { id: ALL_CATEGORY_FILTER, workCategoryId: null, code: ALL_CATEGORY_FILTER, name: 'Semua' },
    ...projectCategoryOptions,
  ];
  const selectedFilterCategory = activeFilter === ALL_CATEGORY_FILTER
    ? null
    : projectCategoryOptions.find((cat) => cat.code === activeFilter) || null;
  const activeCategoryLabel = activeFilter === ALL_CATEGORY_FILTER
    ? 'Semua'
    : selectedFilterCategory?.name || activeFilter;

  useEffect(() => {
    setActiveSubCategoryId('');
    setFilterSubcategories([]);
    const categoryId = selectedFilterCategory?.workCategoryId;
    if (!categoryId) {
      filterSubcategoryRequestRef.current += 1;
      setLoadingFilterSubcategories(false);
      return;
    }

    const requestId = filterSubcategoryRequestRef.current + 1;
    filterSubcategoryRequestRef.current = requestId;
    setLoadingFilterSubcategories(true);
    workCategoryService.getSubcategories(categoryId)
      .then((rows) => {
        if (filterSubcategoryRequestRef.current !== requestId) return;
        const list = Array.isArray(rows) ? rows : rows?.data || [];
        setFilterSubcategories(list.filter((row) => row.isActive !== false));
      })
      .catch((error) => {
        if (filterSubcategoryRequestRef.current !== requestId) return;
        console.error(error);
        setFilterSubcategories([]);
      })
      .finally(() => {
        if (filterSubcategoryRequestRef.current === requestId) setLoadingFilterSubcategories(false);
      });

    return () => {
      if (filterSubcategoryRequestRef.current === requestId) filterSubcategoryRequestRef.current += 1;
    };
  }, [projectId, selectedFilterCategory?.workCategoryId]);

  // Redirect hash ke SEMUA jika kategori tidak ditemukan pada project
  useEffect(() => {
    if (!projectId || activeFilter === ALL_CATEGORY_FILTER) return;
    if (!projectCategoryOptions.some((cat) => cat.code === activeFilter)) {
      window.location.hash = `rab/${ALL_CATEGORY_FILTER}`;
    }
  }, [projectId, activeFilter, projectCategoryOptions.map((cat) => cat.code).join('|')]);

  // Kirim workCategoryId ke backend saat kategori spesifik dipilih
  const activeWorkCategoryId = selectedFilterCategory?.workCategoryId || null;
  const activeDiscipline = (!activeWorkCategoryId && activeFilter !== ALL_CATEGORY_FILTER) ? activeFilter : '';

  const { rabGroups: groups, loadingGroups, errorGroups: fetchError, refreshGroups, createGroup, deleteGroup } = useRabGroups(projectId, activeDiscipline, activeWorkCategoryId);
  const { deleteRabItem, updateRabItem, deleteBulk, bulkPrice, bulkSwitchJob, switchJob, loading: loadingItems } = useRabItems(projectId);

  // State untuk Tambah Group
  const [groupModal, setGroupModal] = useState(null);

  // State untuk Edit Individual + detail breakdown OVH
  const [editModal, setEditModal] = useState(null);
  const [ohDetailItem, setOhDetailItem] = useState(null);
const [ovhNewComponent, setOvhNewComponent] = useState({ name: "", percent: "" });

  // State untuk Hapus Massal & Checkbox
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  
  // State untuk 3 Modal Bulk (Sapu Jagat) yang sesuai Backend
  const [bulkPriceModal, setBulkPriceModal] = useState(null);
  const [bulkSwitchModal, setBulkSwitchModal] = useState(null);
  const [bulkNameModal, setBulkNameModal] = useState(null);

  const [historyOpen, setHistoryOpen] = useState(false);

  // ==========================================================
  // FLATTEN ITEM & SUBTOTAL
  // ==========================================================
  const flattenItems = (groupList) =>
    (groupList || []).flatMap((group) => [
      ...(group.items || []),
      ...flattenItems(group.children),
    ]);

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

  // Backend sudah memfilter berdasarkan kategori; tidak perlu filter lokal ganda.
  const filterGroupByDiscipline = (groupList, label) => groupList;

  const categoryGroups = groups;
  const subcategoryGroups = useMemo(
    () => (activeSubCategoryId
      ? filterGroupTreeBySubCategory(categoryGroups, activeSubCategoryId)
      : categoryGroups),
    [categoryGroups, activeSubCategoryId],
  );

  const visibleGroups = useMemo(() => {
    return filterGroups(subcategoryGroups, search.trim().toLowerCase());
  }, [subcategoryGroups, search]);

  const allItems = useMemo(() => flattenItems(categoryGroups), [categoryGroups]);
  const visibleAllItems = useMemo(() => flattenItems(visibleGroups), [visibleGroups]);

  const sumGroupRecursive = (group) => {
    const totalField = budgetMode === "rab" && isSuperAdmin ? "rabTotalPrice" : "rapTotalPrice";
    let total = (group.items || []).reduce((sum, item) => sum + Number(item[totalField] || 0), 0);
    for (const child of group.children || []) {
      total += sumGroupRecursive(child);
    }
    return total;
  };

  const totalRab = visibleAllItems.reduce((sum, item) => sum + Number(item.rabTotalPrice || 0), 0);
  const totalRap = visibleAllItems.reduce((sum, item) => sum + Number(item.rapTotalPrice || 0), 0);
  const margin = totalRab - totalRap;
  const marginPercent = totalRab > 0 ? (margin / totalRab) * 100 : 0;
  const selectedMode = budgetMode === "rab" && isSuperAdmin ? "RAB Selling" : "RAP Costing";

  // Nominal tiap komponen OH, sama seperti backend: nominal = RAP total x persen / 100.
  // (RAB - RAP) selalu sama dengan total OH ketiga komponen.
  const sumOhComponent = (field) =>
    visibleAllItems.reduce((sum, item) => {
      const rapTotal = Number(item.rapTotalPrice || 0);
      const pct = Number(item[field] ?? 0);
      return sum + rapTotal * (pct / 100);
    }, 0);
  const totalOperational = sumOhComponent("operationalPercent");
  const totalWasteBudget = sumOhComponent("wastePercent");
  const totalProfit = sumOhComponent("profitPercent");
  const totalOh = totalOperational + totalWasteBudget + totalProfit;
  const showRabBreakdown = budgetMode === "rab" && isSuperAdmin;

  const filledItemCount = visibleAllItems.filter((it) => {
    if (it.isByOwner || it.isStip) return true;
    return Number(it.rapUnitPrice || 0) > 0;
  }).length;
  const progressPercent = visibleAllItems.length > 0 ? Math.round((filledItemCount / visibleAllItems.length) * 100) : 0;
  const byOwnerCount = visibleAllItems.filter((it) => it.isByOwner).length;
  const stipCount = visibleAllItems.filter((it) => it.isStip).length;
  const specialCount = byOwnerCount + stipCount;

  useEffect(() => {
    if (loadingProjects || loadingGroups || loadingItems) {
      toast.loading('Memuat data RAB...', { id: 'loading-rab' });
    } else {
      toast.dismiss('loading-rab');
    }
  }, [loadingProjects, loadingGroups, loadingItems]);

  // Tutup seluruh modal dan bersihkan pilihan saat proyek berganti.
  useEffect(() => {
    setGroupModal(null);
    setEditModal(null);
    setSelectedItemIds([]);
    setBulkPriceModal(null);
    setBulkSwitchModal(null);
    setBulkNameModal(null);
    setHistoryOpen(false);
    setShowExportMenu(false);
  }, [projectId]);

  // Saat approval mengunci, tutup modal/pilihan agar tidak ada aksi terhadap
  // data yang sedang menunggu review.
  useEffect(() => {
    if (!approvalLocked) return;
    setGroupModal(null);
    setEditModal(null);
    setSelectedItemIds([]);
    setBulkPriceModal(null);
    setBulkSwitchModal(null);
    setBulkNameModal(null);
    setHistoryOpen(false);
  }, [approvalLocked]);

  // ==========================================================
  // ADD GROUP & SUB-GROUP
  // ==========================================================
  const openGroupForm = (parentId = null) => {
    if (approvalLocked) {
      toast.error('BV/RAB sedang menunggu review atau sudah disetujui. Buat revisi baru dulu.');
      return;
    }
    setGroupModal({ parentId, name: "", reference: "" });
  };

  const handleSaveGroup = async () => {
    if (approvalLocked) return toast.error("BV/RAB sedang dikunci oleh approval.");
    if (!groupModal?.name?.trim()) return toast.error("Nama wajib diisi.");
    
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
    if (approvalLocked) {
      toast.error('BV/RAB sedang menunggu review atau sudah disetujui. Buat revisi baru dulu.');
      return;
    }
    if (!window.confirm("Hapus group ini? Semua sub-group dan baris pekerjaan di dalamnya akan ikut terhapus.")) return;
    toast.promise(deleteGroup(id), {
      loading: 'Menghapus group...',
      success: 'Group berhasil dihapus!',
      error: 'Gagal menghapus group.'
    }).catch(error => console.error(error));
  };

  const deleteItem = async (id) => {
    if (approvalLocked) {
      toast.error('BV/RAB sedang menunggu review atau sudah disetujui. Buat revisi baru dulu.');
      return;
    }
    if (!window.confirm("Hapus baris pekerjaan ini?")) return;
    toast.promise(deleteRabItem(id).then(() => refreshGroups()), {
      loading: 'Menghapus item...',
      success: 'Item berhasil dihapus!',
      error: 'Gagal menghapus item.'
    }).catch(error => console.error(error));
  };

  const toggleSelection = (id) => {
    if (approvalLocked) return;
    setSelectedItemIds((prev) => prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]);
  };

  const toggleAllCheckboxes = () => {
    if (approvalLocked) return;
    const visibleSelectable = visibleAllItems.filter((it) => !it.hasChildren);
    if (selectedItemIds.length > 0) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(visibleSelectable.map(item => item.id));
    }
  };

  const handleBulkDelete = async () => {
    if (approvalLocked) {
      toast.error('BV/RAB sedang menunggu review atau sudah disetujui. Buat revisi baru dulu.');
      return;
    }
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
  const openEdit = (item, itemNumber = "") => {
    if (approvalLocked) {
      toast.error('BV/RAB sedang menunggu review atau sudah disetujui. Buat revisi baru dulu.');
      return;
    }

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
      // RAP Costing: perencana mengisi satu OH total.
      // RAB Billing: admin memecahnya menjadi operasional, waste, laba.
      ohTotalPercent: item.overheadPercent ?? item.overhead ?? 0,
      operationalPercent: item.operationalPercent ?? item.overheadPercent ?? item.overhead ?? 0,
      wastePercent: item.wastePercent ?? 0,
      profitPercent: item.profitPercent ?? 0,
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

  // OH = tiga komponen dan bisa diedit langsung dari tabel, baik di mode
  // RAP Costing maupun RAB Billing. Satu field diubah, dua lainnya dipertahankan.
  const handleUpdateOhComponent = async (item, field, rawValue) => {
    if (approvalLocked) return toast.error("BV/RAB sedang dikunci oleh approval.");
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < 0) {
      return toast.error("Nilai OVH tidak valid.");
    }
    const payload = {
      operationalPercent: Number(item.operationalPercent ?? item.overheadPercent ?? item.overhead ?? 0),
      wastePercent: Number(item.wastePercent ?? 0),
      profitPercent: Number(item.profitPercent ?? 0),
      ohComponents: Array.isArray(item.ohComponents) ? item.ohComponents : null,
      [field]: value,
    };
    toast.promise(
      updateRabItem(item.id, payload).then(() => refreshGroups()),
      {
        loading: "Menyimpan OVH...",
        success: "OVH tersimpan.",
        error: "Gagal menyimpan OVH.",
      },
    ).catch((e) => console.error(e));
  };

  const handleUpdateOverhead = async (item, newValue) => {
    if (approvalLocked) return toast.error("BV/RAB sedang dikunci oleh approval.");
    const totalOh = Number(newValue);
    if (!Number.isFinite(totalOh) || totalOh < 0) {
      return toast.error("Overhead tidak valid.");
    }
    const wastePercent = Number(item.wastePercent ?? 0);
    const profitPercent = Number(item.profitPercent ?? 0);
    const operationalPercent = Math.max(0, totalOh - wastePercent - profitPercent);
    toast.promise(
      updateRabItem(item.id, { operationalPercent, wastePercent, profitPercent }).then(() => refreshGroups()),
      {
        loading: "Menyimpan overhead...",
        success: "Overhead berhasil diperbarui.",
        error: "Gagal memperbarui overhead.",
      },
    ).catch((e) => console.error(e));
  };

  const toggleByOwner = () => {
    setEditModal((prev) => {
      const next = !prev.isByOwner;
      return { ...prev, isByOwner: next, rapUnitPrice: next ? 0 : prev.rapUnitPrice };
    });
  };

  const handleAddOvhComponent = async (item, name, rawPercent) => {
    if (!name || name.trim().length === 0) return toast.error("Nama komponen wajib diisi.");
    const percent = Number(rawPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 1000) {
      return toast.error("Persen komponen harus antara 0 dan 1000.");
    }

    // Pastikan 3 komponen default selalu ada, bahkan kalohComponents kosong/undefined
    // (misal item baru dari link-to-rab yang belum generate komponen default).
    let current = Array.isArray(item.ohComponents) ? [...item.ohComponents] : [];
    if (current.length === 0) {
      const total = Number(item.overheadPercent ?? 0);
      current = [
        { id: "operational", name: "Operasional", percent: total, kind: "OPERATIONAL" },
        { id: "waste", name: "Waste Anggaran", percent: 0, kind: "WASTE" },
        { id: "profit", name: "Laba Rencana", percent: 0, kind: "PROFIT" },
      ];
    }
    if (current.length >= 10) return toast.error("Komponen OVH maksimal 10.");
    if (current.find((c) => c.name.toLowerCase() === name.trim().toLowerCase())) {
      return toast.error("Nama komponen sudah ada.");
    }
    const nextId = `custom-${Date.now()}`;
    const ohComponents = [
      ...current,
      { id: nextId, name: name.trim(), percent, kind: "CUSTOM" },
    ];
    toast.promise(
      updateRabItem(item.id, { ohComponents }).then(() => {
        setOvhNewComponent({ name: "", percent: "" });
        refreshGroups();
      }),
      {
        loading: "Menambah komponen OVH...",
        success: "Komponen OVH ditambahkan.",
        error: "Gagal menambah komponen OVH.",
      },
    ).catch((e) => console.error(e));
  };

  const handleRemoveOvhComponent = async (item, componentId) => {
    if (["operational", "waste", "profit"].includes(componentId)) {
      return toast.error("Komponen default tidak boleh dihapus.");
    }
    const ohComponents = (Array.isArray(item.ohComponents) ? item.ohComponents : []).filter(
      (c) => c.id !== componentId,
    );
    toast.promise(
      updateRabItem(item.id, { ohComponents }).then(refreshGroups),
      {
        loading: "Menghapus komponen OVH...",
        success: "Komponen OVH dihapus.",
        error: "Gagal menghapus komponen OVH.",
      },
    ).catch((e) => console.error(e));
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
      const item = editModal?.item || {};
      const itemWorkCategoryId = item.workCategoryId || activeWorkCategoryId;
      const discipline = itemWorkCategoryId ? '' : (item.discipline || activeDiscipline || "");
      // Grade mengikuti kategori item (bukan tab aktif): kalau item punya kategori,
      // ambil grade dari konfigurasi proyek untuk kategori tersebut — supaya saat
      // browsing di tab SEMUA pun hasil pencarian tetap scoped ke grade yang dipilih
      // saat pembuatan project, bukan semua grade di periode itu.
      const categoryConfig = itemWorkCategoryId
        ? (project?.workCategories || []).find((wc) => wc.workCategoryId === itemWorkCategoryId)
        : null;
      const grade = itemWorkCategoryId
        ? (categoryConfig?.grade || item.grade || selectedFilterCategory?.grade || null)
        : (item.grade || project?.grade || null);
      const params = new URLSearchParams({ q: query.trim() });
      if (itemWorkCategoryId) {
        params.set("workCategoryId", itemWorkCategoryId);
      } else if (discipline && discipline !== ALL_CATEGORY_FILTER) {
        params.set("discipline", discipline);
      }
      if (grade) params.set("grade", grade);
      if (project?.hspkPeriod) params.set("period", project.hspkPeriod);

      const response = await fetch(`${API_BASE}/jobs?${params.toString()}`);
      if (response.ok) {
        const results = await response.json();
        setEditModal((prev) => ({
          ...prev,
          switchResults: Array.isArray(results) ? results : [],
        }));
      }
    } catch (error) {
      console.error("Gagal memuat hasil pencarian:", error);
    }
  };

  // Cari bahan/alat/upah (jasa) dari master PriceItem untuk mengisi nama + satuan + harga
  const searchBahan = async (query, targetIdx) => {
    setEditModal((prev) => ({ ...prev, bahanQuery: query, bahanTargetIdx: targetIdx }));
    if (query.trim().length < 2) {
      return setEditModal((prev) => ({ ...prev, bahanResults: [] }));
    }
    try {
      // cari BAHAN, ALAT, dan UPAH (jasa: mandor, tukang, dll) sekaligus, lalu gabung
      const q = encodeURIComponent(query.trim());
      const [rb, ra, ru] = await Promise.all([
        fetch(`${API_BASE}/price-items?type=BAHAN&q=${q}`),
        fetch(`${API_BASE}/price-items?type=ALAT&q=${q}`),
        fetch(`${API_BASE}/price-items?type=UPAH&q=${q}`),
      ]);
      const [db, da, du] = await Promise.all([
        rb.ok ? rb.json() : [],
        ra.ok ? ra.json() : [],
        ru.ok ? ru.json() : [],
      ]);
      const merged = [
        ...(Array.isArray(db) ? db : []),
        ...(Array.isArray(da) ? da : []),
        ...(Array.isArray(du) ? du : []),
      ];
      setEditModal((prev) => ({ ...prev, bahanResults: merged.slice(0, 30) }));
    } catch {
      setEditModal((prev) => ({ ...prev, bahanResults: [] }));
    }
  };

  // Pilih bahan/alat/upah dari hasil pencarian -> isi baris komponen
  const pickBahan = (priceItem) => {
    setEditModal((prev) => {
      const rows = [...prev.components];
      const idx = prev.bahanTargetIdx ?? 0;
      rows[idx] = {
        ...rows[idx],
        name: priceItem.name,
        unit: priceItem.unit || rows[idx].unit,
        section: priceItem.type === "ALAT" ? "ALAT" : priceItem.type === "UPAH" ? "UPAH" : "BAHAN",
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
    if (approvalLocked) return toast.error("BV/RAB sedang dikunci oleh approval.");
    if (!editModal) return;
    const { item, pricingMode, isByOwner, isStip, rapUnitPrice, sourceJobId } = editModal;
    const breakdownPayload = {
      operationalPercent: Number(editModal.operationalPercent) || 0,
      wastePercent: Number(editModal.wastePercent) || 0,
      profitPercent: Number(editModal.profitPercent) || 0,
    };
    if (pricingMode === "manual") {
      const updatePromise = updateRabItem(item.id, {
          rapUnitPrice: isByOwner || isStip ? 0 : Number(rapUnitPrice),
          operationalPercent: Number(editModal.operationalPercent) || 0,
          wastePercent: Number(editModal.wastePercent) || 0,
          profitPercent: Number(editModal.profitPercent) || 0,
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

      const switchClassification = buildRabSwitchClassification({
        itemWorkCategoryId: item.workCategoryId,
        activeWorkCategoryId,
        activeDiscipline,
        allCategoryFilter: ALL_CATEGORY_FILTER,
      });
      const switchPromise = switchJob(
        item.id,
        sourceJobId,
        breakdownPayload,
        switchClassification.ahspDiscipline,
        switchClassification.workCategoryId,
      ).then(() => refreshGroups());

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
          section: ["BAHAN", "UPAH", "ALAT"].includes(c.section) ? c.section : "BAHAN",
          coefficient: Number(c.coefficient),
          unitPrice: Number(String(c.unitPrice).replace(/[^0-9]/g, "")) || 0,
        }));

      if (rows.length === 0) {
        return toast.error("Isi minimal satu baris bahan/alat.");
      }

      const compPromise = updateRabItem(item.id, {
        components: rows,
        ...breakdownPayload,
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
    if (approvalLocked) return toast.error("BV/RAB sedang dikunci oleh approval.");
    if (!bulkPriceModal) return;
    if (!canEditRap && !isSuperAdmin) return toast.error("Akses edit tidak tersedia untuk role ini.");
    if (!bulkPriceModal.rapUnitPrice && !bulkPriceModal.operationalPercent && !bulkPriceModal.wastePercent && !bulkPriceModal.profitPercent) return toast.error("Isi salah satu nilai!");

    const bulkPricePromise = bulkPrice(
        selectedItemIds,
        bulkPriceModal.rapUnitPrice !== "" ? Number(bulkPriceModal.rapUnitPrice) : undefined,
        {
          operationalPercent: bulkPriceModal.operationalPercent !== "" ? Number(bulkPriceModal.operationalPercent) : undefined,
          wastePercent: bulkPriceModal.wastePercent !== "" ? Number(bulkPriceModal.wastePercent) : undefined,
          profitPercent: bulkPriceModal.profitPercent !== "" ? Number(bulkPriceModal.profitPercent) : undefined,
        },
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
      let bulkWorkCategoryId;
      try {
        bulkWorkCategoryId = resolveBulkRabWorkCategoryId(
          allItems,
          selectedItemIds,
          activeWorkCategoryId,
        );
      } catch (error) {
        setBulkSwitchModal((prev) => ({ ...prev, switchResults: [] }));
        return toast.error(error.message);
      }
      const categoryConfig = bulkWorkCategoryId
        ? (project?.workCategories || []).find((entry) => entry.workCategoryId === bulkWorkCategoryId)
        : null;
      const grade = categoryConfig?.grade || null;
      const params = new URLSearchParams({ q: query.trim() });
      if (bulkWorkCategoryId) {
        params.set("workCategoryId", bulkWorkCategoryId);
      } else if (activeDiscipline && activeDiscipline !== ALL_CATEGORY_FILTER) {
        params.set("discipline", activeDiscipline);
      }
      if (grade) params.set("grade", grade);
      if (project?.hspkPeriod) params.set("period", project.hspkPeriod);

      const res = await fetch(`${API_BASE}/jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBulkSwitchModal((prev) => ({ ...prev, switchResults: Array.isArray(data) ? data : [] }));
      }
    } catch (error) {
      console.error("Gagal memuat hasil pencarian:", error);
    }
  };

  const handleSaveBulkSwitch = async () => {
    if (approvalLocked) return toast.error("BV/RAB sedang dikunci oleh approval.");
    if (!bulkSwitchModal) return;
    if (!bulkSwitchModal.sourceJobId) return toast.error("ID Master Pekerjaan wajib dipilih!");
    
    let bulkWorkCategoryId;
    try {
      bulkWorkCategoryId = resolveBulkRabWorkCategoryId(
        allItems,
        selectedItemIds,
        activeWorkCategoryId,
      );
    } catch (error) {
      return toast.error(error.message);
    }
    const switchClassification = buildRabSwitchClassification({
      activeWorkCategoryId: bulkWorkCategoryId,
      activeDiscipline,
      allCategoryFilter: ALL_CATEGORY_FILTER,
    });
    const bulkSwitchPromise = bulkSwitchJob(
        selectedItemIds,
        bulkSwitchModal.sourceJobId,
        {
          operationalPercent: bulkSwitchModal.operationalPercent !== "" ? Number(bulkSwitchModal.operationalPercent) : undefined,
          wastePercent: bulkSwitchModal.wastePercent !== "" ? Number(bulkSwitchModal.wastePercent) : undefined,
          profitPercent: bulkSwitchModal.profitPercent !== "" ? Number(bulkSwitchModal.profitPercent) : undefined,
        },
        switchClassification.ahspDiscipline,
        switchClassification.workCategoryId,
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
    if (approvalLocked) return toast.error("BV/RAB sedang dikunci oleh approval.");
    if (!bulkNameModal) return;
    if (!bulkNameModal.name || !bulkNameModal.rapUnitPrice) return toast.error("Nama item dan harga baru wajib diisi!");
    
    const sapuJagatPromise = fetch(`${API_BASE}/projects/${projectId}/rab-items/bulk-price-by-name`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
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
  const exportRabExcel = async (mode = "COMBINED") => {
    if (mode === "RAP" && !canExportRap) {
      return toast.error("Export RAP hanya untuk SUPER_ADMIN, PROJECT_MANAGER, atau PERENCANA.");
    }
    if (mode !== "RAP" && !isSuperAdmin) {
      return toast.error("Export RAB dan RAP + RAB hanya untuk SUPER_ADMIN.");
    }
    if (!projectId) return;
    try {
      const params = new URLSearchParams({ mode });
      const response = await fetch(`${API_BASE}/projects/${projectId}/rab-items/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Gagal export RAP/RAB.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      const label = mode === "COMBINED" ? "RAP_RAB" : mode;
      link.download = `${label}_${project?.name || projectId}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Export ${label} seluruh kategori berhasil.`);
    } catch (error) {
      toast.error(error.message);
    }
  };
  const exportBvExcel = async () => {
    if (!projectId) return;
    try {
      const params = new URLSearchParams();
      if (activeWorkCategoryId) params.set("workCategoryId", activeWorkCategoryId);
      else if (activeDiscipline && activeDiscipline !== ALL_CATEGORY_FILTER) params.set("discipline", activeDiscipline);
      const response = await fetch(`${API_BASE}/projects/${projectId}/bv-items/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Gagal export BV.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `BV_${project?.name || projectId}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.message);
    }
  };
  const exportFullExcel = async () => {
    if (!isSuperAdmin) return toast.error("Hanya SUPER_ADMIN yang dapat export lengkap.");
    if (!projectId) return;
    const response = await fetch(`${API_BASE}/projects/${projectId}/export-all-tabs`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
    if (!response.ok) return toast.error("Gagal export lengkap.");
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a"); link.href = url; link.download = `Project_${project?.name || projectId}.xlsx`; link.click(); URL.revokeObjectURL(url);
  };
  const scheduleExport = async () => {
    if (!projectId) return;
    const response = await fetch(`${API_BASE}/projects/${projectId}/time-schedule/export`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
    if (!response.ok) return toast.error("Gagal export Time Schedule.");
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a"); link.href = url; link.download = `TimeSchedule_${project?.name || projectId}.xlsx`; link.click(); URL.revokeObjectURL(url);
  };
  const openRabDocument = async ({ mode = "RAP" } = {}) => {
    if (!projectId) return;
    if (mode === "RAB" && !isSuperAdmin) {
      return toast.error("Hanya SUPER_ADMIN yang dapat membuka RAB Selling.");
    }

    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      return toast.error("Popup diblokir browser. Izinkan popup untuk membuka dokumen RAB.");
    }
    previewWindow.document.write('<p style="font-family:Arial,sans-serif;padding:24px">Memuat dokumen RAB...</p>');

    try {
      const params = new URLSearchParams({ mode });
      if (activeWorkCategoryId) params.set("workCategoryId", activeWorkCategoryId);
      else if (activeDiscipline && activeDiscipline !== ALL_CATEGORY_FILTER) params.set("discipline", activeDiscipline);
      const response = await fetch(`${API_BASE}/projects/${projectId}/rab-items/view?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Gagal membuka dokumen RAB.");
      }
      const html = await response.text();
      previewWindow.document.open();
      previewWindow.document.write(html);
      previewWindow.document.close();
    } catch (error) {
      previewWindow.close();
      toast.error(error.message);
    }
  };
  const viewRap = () => openRabDocument({ mode: "RAP" });
  const viewRab = () => openRabDocument({ mode: "RAB" });

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
          <div className={styles["rab-title-row"]}>
            <h2 className={styles["rab-title"]}>RAB &amp; Budgeting</h2>
            <span className={styles["rab-status-badge"]}>{project?.rabStatus === "LOCKED" ? "LOCKED" : "DRAFT"}</span>
          </div>
          <p className={styles["rab-subtitle"]}>{selectedMode} · RAB Selling terbatas untuk SUPER_ADMIN</p>
        </div>
        <div style={{ minWidth: '300px' }}>
          <ProjectSelector 
            projectId={projectId}
            projectList={projectList}
            loading={loadingProjects}
            onChange={(e) => {
              setApprovalLocked(true);
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
            {BV_RAB_APPROVAL_UI_ENABLED && (
              <BvRabApprovalBar projectId={projectId} onLockedChange={setApprovalLocked} />
            )}

            {/* Toolbar utama */}
            <div className={styles["rab-toolbar"]}>
              {canEditRap && (
                <>
                  <button className={[styles["rab-btn"], styles["rab-btn-small"]].join(" ")} onClick={toggleAllCheckboxes} type="button">
                    ☑ Pilih/Batal Semua
                  </button>
                  <span className={styles["rab-count"]}>{selectedItemIds.length} item terpilih</span>
                  <button
                    className={[styles["rab-btn"], styles["rab-btn-small"]].join(" ")}
                    onClick={() => selectedItemIds.length ? setBulkPriceModal({ rapUnitPrice: "", operationalPercent: "", wastePercent: "", profitPercent: "" }) : toast.error("Pilih baris yang akan diedit harganya terlebih dahulu!")}
                    disabled={selectedItemIds.length === 0}
                    type="button"
                  >
                    <Pencil size={14} /> Edit Harga
                  </button>
                  <button
                    className={[styles["rab-btn"], styles["rab-btn-small"], styles["rab-btn-success"]].join(" ")}
                    onClick={() => selectedItemIds.length ? setBulkSwitchModal({ sourceJobId: "", switchQuery: "", switchResults: [], operationalPercent: "", wastePercent: "", profitPercent: "" }) : toast.error("Pilih baris yang akan disuntik AHSP terlebih dahulu!")}
                    disabled={selectedItemIds.length === 0}
                    type="button"
                  >
                    <RefreshCw size={14} /> Suntik AHSP
                  </button>
                  <button
                    className={[styles["rab-btn"], styles["rab-btn-small"], styles["rab-btn-danger"]].join(" ")}
                    onClick={handleBulkDelete}
                    disabled={selectedItemIds.length === 0}
                    type="button"
                  >
                    <Trash2 size={14} /> Hapus
                  </button>
                  <button
                    className={[styles["rab-btn"], styles["rab-btn-small"], styles["rab-btn-primary"]].join(" ")}
                    onClick={() => projectId ? setBulkNameModal({ name: "", rapUnitPrice: "" }) : toast.error("Pilih project terlebih dahulu!")}
                    type="button"
                  >
                    <Tag size={14} /> By Nama
                  </button>
                </>
              )}

              <button
                className={[styles["rab-btn"], styles["rab-btn-small"]].join(" ")}
                onClick={() => setHistoryOpen(true)}
                disabled={approvalLocked}
                type="button"
              >
                <History size={14} /> Riwayat
              </button>

              <span className="spacer" />

              <div className={styles["rab-modebar"]}>
                <div className={styles["rab-segmented"]}>
                  <button type="button" className={budgetMode === "rap" ? styles["on"] : ""} onClick={() => setBudgetMode("rap")}>
                    RAP Costing
                  </button>
                  <button type="button" className={budgetMode === "rab" ? styles["on"] : ""} onClick={() => setBudgetMode("rab")} disabled={!isSuperAdmin} title={!isSuperAdmin ? "Hanya SUPER_ADMIN" : ""}>
                    RAB Selling {!isSuperAdmin && <span className={styles["rab-lock"]}>🔒</span>}
                  </button>
                </div>
              </div>

              <div style={{ position: 'relative' }} ref={exportMenuRef}>
                <button
                  className={styles["rab-btn"]}
                  onClick={() => projectId ? setShowExportMenu(!showExportMenu) : toast.error("Pilih project terlebih dahulu!")}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  type="button"
                >
                  ⬇ Export <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: showExportMenu ? 'rotate(180deg)' : 'none' }} />
                </button>
                {showExportMenu && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                    zIndex: 100,
                    minWidth: '220px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '6px 0'
                  }}>
                    {[
                      ...((isSuperAdmin || canEditRap) ? [
                        { label: `Export RAP (Semua Kategori)`, action: () => exportRabExcel("RAP") },
                      ] : []),
                      ...(isSuperAdmin ? [
                        { label: `Export RAB (Semua Kategori)`, action: () => exportRabExcel("RAB") },
                        { label: `Export RAP + RAB (Semua Kategori)`, action: () => exportRabExcel("COMBINED") },
                      ] : []),
                      { label: `BackUp Volume (${activeCategoryLabel})`, action: exportBvExcel },
                      { divider: true },
                      ...(isSuperAdmin ? [{ label: 'Semua Label (Lengkap)', action: exportFullExcel }] : []),
                      { label: 'Time Schedule', action: scheduleExport }
                    ].map((item, idx) => item.divider ? (
                      <div key={idx} style={{ height: '1px', backgroundColor: '#333', margin: '4px 0' }} />
                    ) : (
                      <button
                        key={idx}
                        onClick={() => { item.action(); setShowExportMenu(false); }}
                        style={{
                          padding: '10px 16px',
                          background: 'transparent',
                          border: 'none',
                          color: '#fff',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '13px',
                          width: '100%'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.15)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {(isSuperAdmin || canEditRap) && (
                <button className={styles["rab-btn"]} onClick={viewRap} type="button">View RAP</button>
              )}
              {isSuperAdmin && (
                <button className={styles["rab-btn"]} onClick={viewRab} type="button">View RAB</button>
              )}

              {isSuperAdmin && (project?.rabStatus === "LOCKED" ? (
                <button className={[styles["rab-btn"], styles["rab-btn-danger"]].join(" ")} onClick={handleCancelFinance} type="button">Batal Kirim Finance</button>
              ) : (
                <button className={[styles["rab-btn"], styles["rab-btn-success"]].join(" ")} onClick={handleSyncFinance} type="button">Kirim ke Finance</button>
              ))}

              <button className={styles["rab-btn"]} onClick={refreshGroups} type="button">
                <RefreshCw size={15} /> Refresh
              </button>
            </div>

              {projectId && (
                <div className={styles["rab-filter-panel"]}>
                  <div className={styles["rab-filter-row"]}>
                    <span className={styles["rab-filter-label"]}>Kategori</span>
                    {categoryFilterOptions.map((opt) => {
                      const cnt = allItems.filter((it) => {
                        if (opt.code === ALL_CATEGORY_FILTER) return true;
                        const itemCode = String(it.workCategory?.code || it.discipline || 'GENERAL').toUpperCase();
                        return itemCode === opt.code;
                      }).length;
                      return (
                        <a
                          key={opt.id}
                          href={`#rab/${opt.code}`}
                          onClick={(e) => {
                            e.preventDefault();
                            window.location.hash = `rab/${opt.code}`;
                          }}
                          className={[styles["rab-chip"], activeFilter === opt.code ? styles["on"] : ""].join(" ")}
                        >
                          {opt.name} <span className={styles["cnt"]}>({cnt})</span>
                        </a>
                      );
                    })}
                  </div>
                  {selectedFilterCategory?.workCategoryId && (
                    <div className={styles["rab-filter-row"]}>
                      <span className={styles["rab-filter-label"]}>Subkategori</span>
                      <button
                        type="button"
                        className={[styles["rab-chip"], !activeSubCategoryId ? styles["on"] : ""].join(" ")}
                        onClick={() => setActiveSubCategoryId('')}
                      >
                        Semua
                      </button>
                      {loadingFilterSubcategories ? (
                        <span className={styles["rab-filter-state"]}>Memuat...</span>
                      ) : filterSubcategories.length === 0 ? (
                        <span className={styles["rab-filter-state"]}>Belum ada subkategori aktif</span>
                      ) : (
                        filterSubcategories.map((subcategory) => (
                          <button
                            type="button"
                            key={subcategory.id}
                            className={[styles["rab-chip"], activeSubCategoryId === subcategory.id ? styles["on"] : ""].join(" ")}
                            onClick={() => setActiveSubCategoryId(subcategory.id)}
                          >
                            {subcategory.code || subcategory.name}
                            <span className={styles["cnt"]}>({countGroupItemsBySubCategory(categoryGroups, subcategory.id)})</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Ringkasan Billing: tampilkan alokasi OH saat mode RAB Selling. */}
              <div className={styles["rab-stats-grid"]}>
                <div className={styles["rab-plate"]}>
                  <div className={styles["rab-stat-header"]}><ClipboardList size={18} className={styles["rab-stat-icon"]} /><span className={styles["rab-stat-label"]}>Total RAP</span></div>
                  <div className={[styles["rab-stat-value"], styles["gold"]].join(" ")}>{fmtRp(totalRap)}</div>
                  <div className={styles["rab-stat-desc"]}>Modal pelaksanaan murni</div>
                </div>
                {showRabBreakdown ? (
                  <>
                    <div className={styles["rab-plate"]}>
                      <div className={styles["rab-stat-header"]}><Wallet size={18} className={styles["rab-stat-icon"]} /><span className={styles["rab-stat-label"]}>Operasional</span></div>
                      <div className={styles["rab-stat-value"]}>{fmtRp(totalOperational)}</div>
                      <div className={styles["rab-stat-desc"]}>Budget biaya operasional</div>
                    </div>
                    <div className={styles["rab-plate"]}>
                      <div className={styles["rab-stat-header"]}><Scale size={18} className={styles["rab-stat-icon"]} /><span className={styles["rab-stat-label"]}>Waste Anggaran</span></div>
                      <div className={styles["rab-stat-value"]}>{fmtRp(totalWasteBudget)}</div>
                      <div className={styles["rab-stat-desc"]}>Cadangan risiko biaya</div>
                    </div>
                    <div className={styles["rab-plate"]}>
                      <div className={styles["rab-stat-header"]}><TrendingUp size={18} className={styles["rab-stat-icon"]} /><span className={styles["rab-stat-label"]}>Laba Rencana</span></div>
                      <div className={styles["rab-stat-value"]}>{fmtRp(totalProfit)}</div>
                      <div className={styles["rab-stat-desc"]}>Target laba, bukan pengeluaran</div>
                    </div>
                    <div className={styles["rab-plate"]}>
                      <div className={styles["rab-stat-header"]}><Scale size={18} className={styles["rab-stat-icon"]} /><span className={styles["rab-stat-label"]}>Total OVH</span></div>
                      <div className={styles["rab-stat-value"]}>{fmtRp(totalOh)}</div>
                      <div className={styles["rab-stat-desc"]}>Operasional + waste + laba</div>
                    </div>
                    <div className={styles["rab-plate"]}>
                      <div className={styles["rab-stat-header"]}><Wallet size={18} className={styles["rab-stat-icon"]} /><span className={styles["rab-stat-label"]}>Total RAB Billing</span></div>
                      <div className={[styles["rab-stat-value"], styles["gold"]].join(" ")}>{fmtRp(totalRab)}</div>
                      <div className={styles["rab-stat-desc"]}>RAP + Total OVH</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles["rab-plate"]}>
                      <div className={styles["rab-stat-header"]}><TrendingUp size={18} className={styles["rab-stat-icon"]} /><span className={styles["rab-stat-label"]}>Progres Pengisian</span></div>
                      <div className={styles["rab-stat-value"]}>{progressPercent}%</div>
                      <div className={styles["rab-pbar"]}><div style={{ width: `${progressPercent}%` }} /></div>
                      <div className={styles["rab-stat-desc"]}>{filledItemCount} dari {visibleAllItems.length} item sudah punya harga</div>
                    </div>
                    <div className={styles["rab-plate"]}>
                      <div className={styles["rab-stat-header"]}><Wallet size={18} className={styles["rab-stat-icon"]} /><span className={styles["rab-stat-label"]}>Item Khusus</span></div>
                      <div className={styles["rab-stat-value"]}>{specialCount}</div>
                      <div className={styles["rab-stat-desc"]}>{byOwnerCount} By Owner · {stipCount} Stip</div>
                    </div>
                  </>
                )}
              </div>

              {/* Legend */}
              <div className={styles["rab-legend"]}>
                <span className={styles["rab-legend-label"]}>Sumber harga:</span>
                <span className={styles["rab-legend-item"]}><span className={[styles["rab-dot"], styles["gold"]].join(" ")} /> AHSP</span>
                <span className={styles["rab-legend-item"]}><span className={[styles["rab-dot"], styles["silver"]].join(" ")} /> Manual</span>
                <span className={styles["rab-legend-item"]}><span className={[styles["rab-dot"], styles["blue"]].join(" ")} /> Komponen</span>
                <span className={styles["rab-legend-item"]}><span className={[styles["rab-dot"], styles["purple"]].join(" ")} /> By Owner</span>
                <span className={styles["rab-legend-item"]}><span className={[styles["rab-dot"], styles["red"]].join(" ")} /> Stip</span>
                <span className={styles["rab-legend-item"]} title="Border kiri emas = baris belum punya harga / belum diisi">ℹ Belum diisi</span>
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
                      onDeleteGroup={canEditRap ? handleDeleteGroup : null}
                      onEditItem={canEditRap ? openEdit : null}
                      onDeleteItem={canEditRap ? deleteItem : null}
                      onUpdateOverhead={canEditOverhead ? handleUpdateOverhead : null}
                      onUpdateOhComponent={canEditOverhead ? handleUpdateOhComponent : null}
                      onShowOhDetail={(it, num) => setOhDetailItem({ item: it, itemNumber: num })}
                      canEditRap={canEditRap}
                      canEditOverhead={canEditOverhead}
                      budgetMode={budgetMode}
                      isSuperAdmin={isSuperAdmin}
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

      {/* ================= DETAIL OH BREAKDOWN ================= */}
      {ohDetailItem && (() => {
        const it = ohDetailItem.item;
        const rapUnit = Number(it.rapUnitPrice || 0);
        const vol = Number(it.volume || 0);
        const rapTotal = Number(it.rapTotalPrice ?? rapUnit * vol);
        const opsPct = Number(it.operationalPercent ?? it.overheadPercent ?? it.overhead ?? 0);
        const wastePct = Number(it.wastePercent ?? 0);
        const profitPct = Number(it.profitPercent ?? 0);
        const components = Array.isArray(it.ohComponents) && it.ohComponents.length > 0
          ? it.ohComponents
          : [
              { id: "operational", name: "Operasional", percent: opsPct },
              { id: "waste", name: "Waste Anggaran", percent: wastePct },
              { id: "profit", name: "Laba Rencana", percent: profitPct },
            ];
        const totalPct = components.reduce((sum, component) => sum + Number(component.percent || 0), 0);
        const opsNom = rapTotal * (opsPct / 100);
        const wasteNom = rapTotal * (wastePct / 100);
        const profitNom = rapTotal * (profitPct / 100);
        const customNom = (Array.isArray(components)
          ? components.filter((c) => !["operational", "waste", "profit"].includes(c.id))
          : []
        ).reduce((sum, c) => sum + rapTotal * (Number(c.percent || 0) / 100), 0);
        const ohNom = opsNom + wasteNom + profitNom + customNom;
        const rabTotal = Number(it.rabTotalPrice ?? rapTotal + ohNom);
        return (
          <div className={styles["rab-modal-overlay"]} onClick={() => setOhDetailItem(null)}>
            <div className={styles["rab-modal"]} onClick={(e) => e.stopPropagation()}>
              <h3>Detail OVH</h3>
              <p className={styles["rab-edit-meta"]}>
                {it.name} · {it.paymentUnit} · Vol: {vol.toFixed(2)}
              </p>

              <table className={styles["rab-oh-detail-table"]}>
                <thead>
                  <tr>
                    <th>Komponen</th>
                    <th style={{ textAlign: "right" }}>Persen</th>
                    <th style={{ textAlign: "right" }}>Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(it.ohComponents) && it.ohComponents.length > 0
                    ? it.ohComponents
                    : [
                        { id: "operational", name: "Operasional", percent: opsPct },
                        { id: "waste", name: "Waste Anggaran", percent: wastePct },
                        { id: "profit", name: "Laba Rencana", percent: profitPct },
                      ]
                  ).map((component) => {
                    const isDefault = ["operational", "waste", "profit"].includes(component.id);
                    return (
                      <tr key={component.id}>
                        <td>
                          {component.name}
                          {!isDefault && canEditOverhead && (
                            <button
                              className={styles["rab-btn"]}
                              type="button"
                              onClick={() => handleRemoveOvhComponent(item, component.id)}
                              style={{ marginLeft: "8px", fontSize: "12px", padding: "2px 8px" }}
                              aria-label={`Hapus komponen ${component.name}`}
                            >
                              ×
                            </button>
                          )}
                        </td>
                        <td className={styles["rab-mono"]} style={{ textAlign: "right" }}>{Number(component.percent || 0).toFixed(2)}%</td>
                        <td className={styles["rab-mono"]} style={{ textAlign: "right" }}>{fmtRp(rapTotal * (Number(component.percent || 0) / 100))}</td>
                      </tr>
                    );
                  })}
                  <tr className={styles["rab-oh-detail-total"]}>
                    <td>Total OVH</td>
                    <td className={styles["rab-mono"]} style={{ textAlign: "right" }}>{totalPct.toFixed(2)}%</td>
                    <td className={styles["rab-mono"]} style={{ textAlign: "right" }}>{fmtRp(ohNom)}</td>
                  </tr>
                  <tr>
                    <td colSpan="3" style={{ padding: "10px 0 8px", borderTop: "1px solid", borderColor: "currentColor", opacity: 0.6 }}>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <label className={styles["rab-form-label"]} style={{ margin: 0, fontSize: "13px" }}>
                          Tambah komponen OVH
                        </label>
                        <input
                          className={styles["rab-form-input"]}
                          style={{ width: "160px", fontSize: "13px" }}
                          placeholder="Nama komponen"
                          value={ovhNewComponent.name}
                          onChange={(e) => setOvhNewComponent({ ...ovhNewComponent, name: e.target.value })}
                        />
                        <input
                          className={styles["rab-form-input"]}
                          style={{ width: "110px", fontSize: "13px" }}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Persen"
                          value={ovhNewComponent.percent}
                          onChange={(e) => setOvhNewComponent({ ...ovhNewComponent, percent: e.target.value })}
                        />
                        <button
                          className={[styles["rab-btn"], styles["rab-btn-small"]].join(" ")}
                          type="button"
                          onClick={() => canAddOvhComponent && handleAddOvhComponent(it, ovhNewComponent.name, ovhNewComponent.percent)}
                          disabled={!canAddOvhComponent}
                        >
                          Tambah
                        </button>
                      </div>
                      <p className={styles["rab-form-hint"]} style={{ margin: "0 0 0 8px", fontSize: "12px" }}>
                        Maksimal 10 komponen. Komponen default tidak bisa dihapus.
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className={styles["rab-oh-detail-table"]} style={{ marginTop: "14px" }}>
                <tbody>
                  <tr>
                    <td>RAP Total</td>
                    <td className={styles["rab-mono"]} style={{ textAlign: "right" }}>{fmtRp(rapTotal)}</td>
                  </tr>
                  <tr className={styles["rab-oh-detail-total"]}>
                    <td>RAB Total</td>
                    <td className={styles["rab-mono"]} style={{ textAlign: "right" }}>{fmtRp(rabTotal)}</td>
                  </tr>
                </tbody>
              </table>

              <p className={styles["rab-form-hint"]}>
                RAB = RAP × (1 + Total OVH% ÷ 100). Waste di sini adalah waste anggaran RAB,
                terpisah dari Waste Volume pada BV.
              </p>

              <div className={styles["rab-modal-actions"]}>
                <button className={styles["rab-btn"]} onClick={() => setOhDetailItem(null)} type="button">Tutup</button>
                {canEditOverhead && (
                  <button
                    className={[styles["rab-btn"], styles["rab-btn-primary"]].join(" ")}
                    type="button"
                    onClick={() => { setOhDetailItem(null); openEdit(it, ohDetailItem.itemNumber); }}
                  >
                    Edit OVH
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= EDIT MODAL INDIVIDUAL ================= */}
      {editModal && (
        <div className={styles["rab-modal-overlay"]}>
          <div className={styles["rab-modal"]}>
            <h3>Edit Baris Pekerjaan</h3>
            <p className={styles["rab-edit-meta"]}>{editModal.item.name} · {editModal.item.paymentUnit} · Vol: {Number(editModal.item.volume).toFixed(2)}</p>

            <div className={styles["rab-toggle-row"]}>
              <button type="button" className={[styles["rab-btn"], styles["rab-btn-small"], editModal.isByOwner ? styles["rab-btn-active"] : ""].join(" ")} onClick={toggleByOwner}>
                {editModal.isByOwner ? "✓ By Owner" : "Set By Owner"}
              </button>
              <button type="button" className={[styles["rab-btn"], styles["rab-btn-small"], editModal.isStip ? styles["rab-btn-active"] : ""].join(" ")} onClick={toggleStip}>
                {editModal.isStip ? "Batal Set Stip" : "Set Harga Stip (-)"}
              </button>
            </div>

            <div className={styles["rab-oh-grid"]}>
              <label className={styles["rab-form-label"]}>
                Operasional (%)
                <input type="number" step="0.01" className={styles["rab-form-input"]} value={editModal.isByOwner || editModal.isStip ? "" : editModal.operationalPercent} disabled={editModal.isByOwner || editModal.isStip} onChange={(e) => setEditModal({ ...editModal, operationalPercent: e.target.value })} />
              </label>
              <label className={styles["rab-form-label"]}>
                Waste Anggaran (%)
                <input type="number" step="0.01" className={styles["rab-form-input"]} value={editModal.isByOwner || editModal.isStip ? "" : editModal.wastePercent} disabled={editModal.isByOwner || editModal.isStip} onChange={(e) => setEditModal({ ...editModal, wastePercent: e.target.value })} />
              </label>
              <label className={styles["rab-form-label"]}>
                Laba / Profit (%)
                <input type="number" step="0.01" className={styles["rab-form-input"]} value={editModal.isByOwner || editModal.isStip ? "" : editModal.profitPercent} disabled={editModal.isByOwner || editModal.isStip} onChange={(e) => setEditModal({ ...editModal, profitPercent: e.target.value })} />
              </label>
            </div>

            <p className={styles["rab-form-hint"]} style={{ marginBottom: '24px' }}>
              Total OVH: <strong>{(
                (Number(editModal.operationalPercent) || 0) +
                (Number(editModal.wastePercent) || 0) +
                (Number(editModal.profitPercent) || 0)
              ).toFixed(2)}%</strong> — RAB dihitung otomatis dari RAP + ketiga komponen ini.
            </p>

            <div className={styles["rab-mode-cards"]}>
              <div className={[styles["rab-mode-card"], editModal.pricingMode === "manual" ? styles["active"] : ""].join(" ")} onClick={() => setEditModal({ ...editModal, pricingMode: "manual" })}>
                <div className={styles["rab-mode-title"]}>📝 Input Manual</div>
                <div className={styles["rab-mode-desc"]}>Ketik harga modal langsung + overhead / profit.</div>
              </div>
              <div className={[styles["rab-mode-card"], editModal.pricingMode === "ahsp" ? styles["active"] : ""].join(" ")} onClick={() => setEditModal({ ...editModal, pricingMode: "ahsp" })}>
                <div className={styles["rab-mode-title"]}>🔄 Tarik Master AHSP</div>
                <div className={styles["rab-mode-desc"]}>Ambil harga otomatis dari master pekerjaan AHSP.</div>
              </div>
              <div className={[styles["rab-mode-card"], editModal.pricingMode === "komponen" ? styles["active"] : ""].join(" ")} onClick={() => setEditModal({ ...editModal, pricingMode: "komponen" })}>
                <div className={styles["rab-mode-title"]}>🧱 Rincian Bahan, Alat &amp; Jasa</div>
                <div className={styles["rab-mode-desc"]}>Susun modal dari bahan, alat, dan jasa (upah/mandor) custom.</div>
              </div>
            </div>

            {editModal.pricingMode === "manual" && (
              <div className={styles["rab-ahsp-box"]}>
                <label className={styles["rab-form-label"]}>
                  Harga Modal / RAP (Satuan)
                  <input type="text" className={styles["rab-form-input"]} value={editModal.isByOwner || editModal.isStip ? "" : formatInputNumber(editModal.rapUnitPrice)} disabled={editModal.isByOwner || editModal.isStip} onChange={(e) => setEditModal({ ...editModal, rapUnitPrice: parseInputNumber(e.target.value) })} />
                </label>
              </div>
            )}

            {editModal.pricingMode === "ahsp" && (
              <div className={styles["rab-ahsp-box"]}>
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
                {editModal.sourceJobId && (
                  <div className={styles["rab-ahsp-hint"]}>
                    AHSP terpilih: {editModal.switchResults.find(j => j.id === editModal.sourceJobId)?.name || editModal.sourceJobId}
                  </div>
                )}
              </div>
            )}

            {editModal.pricingMode === "komponen" && (
              <div className={styles["rab-ahsp-box"]}>
                <p className={styles["rab-form-hint"]} style={{ marginTop: 0 }}>
                  Dipakai untuk item yang tidak ada padanannya di AHSP (mis. furniture custom).
                  Isi bahan dan alat, lalu sisanya dihitung dari overhead di atas.
                </p>

                <table className={styles["rab-komp-table"]}>
                  <thead>
                    <tr>
                      <th style={{ width: '34%' }}>Bahan / Alat / Jasa</th>
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
                            <option value="UPAH">Jasa</option>
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
                          {p.type === "UPAH" ? "Jasa" : p.type === "ALAT" ? "Alat" : "Bahan"} · {p.unit} · {fmtRp(p.price)}
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
                      (1 + (
                        (Number(editModal.operationalPercent) || 0) +
                        (Number(editModal.wastePercent) || 0) +
                        (Number(editModal.profitPercent) || 0)
                      ) / 100)
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
            <div className={styles["rab-oh-grid"]} style={{ marginTop: '16px' }}>
              <label className={styles["rab-form-label"]}>Operasional (%)
                <input type="number" step="0.01" className={styles["rab-form-input"]} placeholder="Kosongkan bila tidak diubah" value={bulkPriceModal.operationalPercent} onChange={(e) => setBulkPriceModal({ ...bulkPriceModal, operationalPercent: e.target.value })} />
              </label>
              <label className={styles["rab-form-label"]}>Waste Anggaran (%)
                <input type="number" step="0.01" className={styles["rab-form-input"]} placeholder="Kosongkan bila tidak diubah" value={bulkPriceModal.wastePercent} onChange={(e) => setBulkPriceModal({ ...bulkPriceModal, wastePercent: e.target.value })} />
              </label>
              <label className={styles["rab-form-label"]}>Laba / Profit (%)
                <input type="number" step="0.01" className={styles["rab-form-input"]} placeholder="Kosongkan bila tidak diubah" value={bulkPriceModal.profitPercent} onChange={(e) => setBulkPriceModal({ ...bulkPriceModal, profitPercent: e.target.value })} />
              </label>
            </div>
            <p className={styles["rab-form-hint"]}>
              Total OVH: <strong>{(
                (Number(bulkPriceModal.operationalPercent) || 0) +
                (Number(bulkPriceModal.wastePercent) || 0) +
                (Number(bulkPriceModal.profitPercent) || 0)
              ).toFixed(2)}%</strong> — kolom yang dikosongkan memakai nilai item masing-masing.
            </p>
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
            <div className={styles["rab-oh-grid"]} style={{ marginTop: '16px' }}>
              <label className={styles["rab-form-label"]}>Operasional (%)
                <input type="number" step="0.01" className={styles["rab-form-input"]} placeholder="Kosongkan untuk pakai default" value={bulkSwitchModal.operationalPercent} onChange={(e) => setBulkSwitchModal({ ...bulkSwitchModal, operationalPercent: e.target.value })} />
              </label>
              <label className={styles["rab-form-label"]}>Waste Anggaran (%)
                <input type="number" step="0.01" className={styles["rab-form-input"]} placeholder="Kosongkan untuk pakai default" value={bulkSwitchModal.wastePercent} onChange={(e) => setBulkSwitchModal({ ...bulkSwitchModal, wastePercent: e.target.value })} />
              </label>
              <label className={styles["rab-form-label"]}>Laba / Profit (%)
                <input type="number" step="0.01" className={styles["rab-form-input"]} placeholder="Kosongkan untuk pakai default" value={bulkSwitchModal.profitPercent} onChange={(e) => setBulkSwitchModal({ ...bulkSwitchModal, profitPercent: e.target.value })} />
              </label>
            </div>
            <p className={styles["rab-form-hint"]}>
              Total OVH: <strong>{(
                (Number(bulkSwitchModal.operationalPercent) || 0) +
                (Number(bulkSwitchModal.wastePercent) || 0) +
                (Number(bulkSwitchModal.profitPercent) || 0)
              ).toFixed(2)}%</strong> — dikosongkan berarti memakai default Master AHSP / nilai item.
            </p>
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

      <BvRabHistoryPanel
        projectId={projectId}
        module="RAB"
        open={historyOpen && !approvalLocked}
        onClose={() => setHistoryOpen(false)}
        onUndone={() => refreshGroups()}
      />

    </div>
  );
};

// ==========================================================
// GROUP NODE & ITEMS TABLE
// ==========================================================
// ==========================================================
// HELPERS
// ==========================================================
function getItemSource(item) {
  if (item.isByOwner) return { key: "owner", label: "By Owner" };
  if (item.isStip) return { key: "stip", label: "Stip" };
  if (Array.isArray(item.components) && item.components.length > 0) return { key: "komp", label: "Komponen" };
  if (item.sourceJobTypeId) return { key: "ahsp", label: "AHSP" };
  return { key: "manual", label: "Manual" };
}

function getItemRef(item, source) {
  if (source.key === "ahsp") {
    const ref = item.sourceJobType?.reference || item.reference;
    const sourceLabel = item.workCategory?.code || item.discipline || 'kategori dinamis';
    if (ref) return `AHSP ${ref} · ${sourceLabel}${item.grade ? ` · Grade ${item.grade}` : ""}`;
  }
  if (source.key === "manual" && item.reference) return `Ref: ${item.reference}`;
  if (source.key === "komp") return "Rincian bahan & alat manual";
  if (source.key === "manual") return "Harga diisi manual";
  if (source.key === "owner") return "Pekerjaan oleh owner";
  if (source.key === "stip") return "Pekerjaan sesuai stipulasi";
  return "";
}

function renderNumber(item, idx, parentNum, isParent) {
  if (isParent) return String(idx + 1);
  return `${parentNum}.${idx + 1}`;
}

function RabGroupNode({
  group,
  depth,
  sumGroupRecursive,
  onDeleteGroup,
  onEditItem,
  onDeleteItem,
  onUpdateOverhead,
  onUpdateOhComponent,
  onShowOhDetail,
  canEditRap,
  canEditOverhead,
  budgetMode,
  isSuperAdmin,
  selectedItemIds,
  onToggleSelect,
}) {
  const subtotal = sumGroupRecursive(group);
  const groupRef = group.reference || group.name;
  const childRows = (group.items || []).filter((it) => !it.parentId);

  return (
    <div className={styles["rab-group-block"]} style={{ marginLeft: depth > 0 ? 18 : 0 }}>
      <div className={styles["rab-group-hdr"]}>
        {group.reference && <span className={styles["rab-group-ref"]}>{group.reference}</span>}
        <span className={styles["rab-group-name"]}>{group.name}</span>
        {!group.workCategory?.code && group.discipline && group.discipline !== "GENERAL" && (
          <span className={styles["rab-group-discipline"]} style={{ background: DISCIPLINE_BADGE[group.discipline] || "#666", color: "#fff" }}>
            {group.discipline}
          </span>
        )}
        {group.workCategory?.code && group.workCategory?.code !== 'GENERAL' && (
          <span className={styles["rab-group-discipline"]} style={{ background: DISCIPLINE_BADGE[group.workCategory?.code] || "#666", color: "#fff" }}>
            {group.workCategory.code}
          </span>
        )}
        <span className={styles["rab-group-subtotal"]}>{fmtRp(subtotal)}</span>
        {onDeleteGroup && (
          <button className={[styles["rab-btn"], styles["rab-btn-small"], styles["rab-btn-danger"]].join(" ")} onClick={() => onDeleteGroup(group.id)} type="button" title="Hapus group">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {(group.items || []).length > 0 && (
        <RabItemsTable
          items={group.items || []}
          parentNum={group.reference || "1"}
          onEdit={onEditItem}
          onDelete={onDeleteItem}
          onUpdateOverhead={onUpdateOverhead}
          onUpdateOhComponent={onUpdateOhComponent}
          onShowOhDetail={onShowOhDetail}
          canEditRap={canEditRap}
          canEditOverhead={canEditOverhead}
          budgetMode={budgetMode}
          isSuperAdmin={isSuperAdmin}
          selectedItemIds={selectedItemIds}
          onToggleSelect={onToggleSelect}
          visibleAllItems={[]}
          onToggleAll={() => {}}
        />
      )}
      {(group.children || []).map((child) => (
        <RabGroupNode
          key={child.id}
          group={child}
          depth={depth + 1}
          sumGroupRecursive={sumGroupRecursive}
          onDeleteGroup={onDeleteGroup}
          onEditItem={onEditItem}
          onDeleteItem={onDeleteItem}
          onUpdateOverhead={onUpdateOverhead}
          onUpdateOhComponent={onUpdateOhComponent}
          onShowOhDetail={onShowOhDetail}
          canEditRap={canEditRap}
          canEditOverhead={canEditOverhead}
          budgetMode={budgetMode}
          isSuperAdmin={isSuperAdmin}
          selectedItemIds={selectedItemIds}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}

function RabItemsTable({ items, parentNum, onEdit, onDelete, onUpdateOverhead, onUpdateOhComponent, onShowOhDetail, canEditRap, canEditOverhead, budgetMode, isSuperAdmin, selectedItemIds, onToggleSelect, visibleAllItems, onToggleAll }) {
  const parents = (items || []).filter((it) => !it.parentId);
  const childrenByParent = useMemo(() => {
    const map = new Map();
    for (const it of items || []) {
      if (it.parentId) {
        if (!map.has(it.parentId)) map.set(it.parentId, []);
        map.get(it.parentId).push(it);
      }
    }
    return map;
  }, [items]);

  const renderRow = (item, idx, isParent = false, hasChildren = false) => {
      const source = getItemSource(item);
      const rowClass = [
        selectedItemIds.includes(item.id) ? styles["rab-row-selected"] : "",
        isParent ? styles["rab-parent-row"] : styles["rab-child-row"],
        !item.isByOwner && !item.isStip && Number(item.rapUnitPrice || 0) <= 0 && !hasChildren ? styles["rab-unfilled"] : "",
      ].filter(Boolean).join(" ");

      // Mode RAB Selling untuk SUPER_ADMIN: kolom RAP & RAB tampil berdampingan;
      // lever edit utama adalah Overhead (%) yang sudah memperbarui RAB otomatis.
      const isSellingMode = budgetMode === "rab" && isSuperAdmin;
      const rapUnit = item.rapUnitPrice;
      const rapTotal = item.rapTotalPrice;
      const rabUnit = item.rabUnitPrice;
      const rabTotal = item.rabTotalPrice;
      const unitPriceDisplay = isSellingMode ? rabUnit : rapUnit;
      const totalPriceDisplay = isSellingMode ? rabTotal : rapTotal;
      const emptyPrice = Number(unitPriceDisplay || 0) <= 0 && !item.isByOwner && !item.isStip && !hasChildren;
      const itemRef = !hasChildren ? getItemRef(item, source) : "Header / Sub-Group";
      const itemNumber = renderNumber(item, idx, parentNum, isParent);
      const classification = getWorkClassificationLabel(item);
      const subcategoryLabel = hasChildren ? '' : classification.subcategory;

    return (
      <tr key={item.id} className={rowClass}>
        <td style={{ textAlign: "center" }}>
          {!hasChildren && (
            <input
              type="checkbox"
              className={styles["rab-checkbox"]}
              checked={selectedItemIds.includes(item.id)}
              onChange={() => onToggleSelect(item.id)}
            />
          )}
        </td>
        <td className={styles["rab-mono"]}>{renderNumber(item, idx, parentNum, isParent)}</td>
        <td>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <span className={styles["rab-item-name"]}>{item.name}</span>
          </div>
        </td>
        <td>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
            {!hasChildren && <span className={[styles["rab-src"], styles[source.key]].join(" ")}>{source.label}</span>}
            {item.workCategory?.code && item.workCategory?.code !== 'GENERAL' && (
              <span className={styles["rab-group-discipline"]} style={{ background: DISCIPLINE_BADGE[item.workCategory?.code] || "#666", color: "#fff" }}>
                {item.workCategory.code}
              </span>
            )}
            {item.discipline && item.discipline !== "GENERAL" && !item.workCategory?.code && (
              <span className={styles["rab-group-discipline"]} style={{ background: DISCIPLINE_BADGE[item.discipline] || "#666", color: "#fff" }}>
                {item.discipline}
              </span>
            )}
          </div>
        </td>
        <td>{subcategoryLabel}</td>
        <td>
          {!hasChildren && emptyPrice && <span className={styles["rab-unfilled-tag"]}>BELUM DIISI</span>}
        </td>
        <td>{hasChildren ? "" : item.paymentUnit}</td>
        <td className={styles["rab-mono"]}>{item.volume != null && !hasChildren ? Number(item.volume).toFixed(2) : ""}</td>
        {isSellingMode && (
          <>
            <td className={styles["rab-mono"]}>{hasChildren ? "" : fmtRp(rapUnit)}</td>
            <td className={styles["rab-mono"]}>{hasChildren ? "" : fmtRp(rapTotal)}</td>
          </>
        )}
        {isSellingMode && (
          <>
            {[
              ["operationalPercent", "Operasional"],
              ["wastePercent", "Waste"],
              ["profitPercent", "Laba"],
            ].map(([field, label]) => (
              <td key={field} className={[styles["rab-mono"], styles["rab-oh-cell"]].join(" ")}>
                {!hasChildren && (
                  canEditOverhead && onUpdateOhComponent ? (
                    <input
                      className={styles["rab-oh-inline-input"]}
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={Number(
                        field === "operationalPercent"
                          ? (item.operationalPercent ?? item.overheadPercent ?? item.overhead ?? 0)
                          : (item[field] ?? 0),
                      )}
                      key={`${item.id}-${field}-${item[field] ?? item.overheadPercent ?? 0}`}
                      aria-label={`${label} (%) untuk ${item.name}`}
                      title={`${label} (%) — Enter atau pindah fokus untuk menyimpan`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      onBlur={(e) => {
                        const previous = Number(
                          field === "operationalPercent"
                            ? (item.operationalPercent ?? item.overheadPercent ?? item.overhead ?? 0)
                            : (item[field] ?? 0),
                        );
                        const next = Number(e.currentTarget.value);
                        if (Number.isFinite(next) && next !== previous) {
                          onUpdateOhComponent(item, field, next);
                        }
                      }}
                    />
                  ) : (
                    `${Number(
                      field === "operationalPercent"
                        ? (item.operationalPercent ?? item.overheadPercent ?? item.overhead ?? 0)
                        : (item[field] ?? 0),
                    ).toFixed(2)}%`
                  )
                )}
              </td>
            ))}
            <td className={[styles["rab-mono"], styles["rab-oh-cell"]].join(" ")}>
              {!hasChildren && (
                <div className={styles["rab-oh-inline"]}>
                  <strong>{Number(item.overheadPercent ?? item.overhead ?? 0).toFixed(2)}%</strong>
                  <button
                    className={styles["rab-oh-detail"]}
                    title="Lihat rincian OVH"
                    onClick={() => onShowOhDetail && onShowOhDetail(item, itemNumber)}
                    type="button"
                  >
                    <Info size={12} />
                  </button>
                </div>
              )}
            </td>
          </>
        )}
        <td className={[styles["rab-mono"], emptyPrice ? styles["rab-empty-price"] : ""].join(" ")}>
          {hasChildren ? "" : emptyPrice ? "-" : fmtRp(unitPriceDisplay)}
        </td>
        <td className={styles["rab-mono"]}>{hasChildren ? "" : fmtRp(totalPriceDisplay)}</td>
        {isSellingMode && (
          <td className={styles["rab-mono"]}>
            {hasChildren ? "" : fmtRp(Number(item.rabTotalPrice || 0) - Number(item.rapTotalPrice || 0))}
          </td>
        )}
        <td className={styles["rab-row-actions"]}>
          {onEdit && !hasChildren && (
            <button className={[styles["rab-btn"], styles["rab-btn-small"]].join(" ")} onClick={() => onEdit(item, itemNumber)} type="button" title={isSellingMode ? "Edit RAB" : "Edit"}><Pencil size={14} /></button>
          )}
          {onDelete && (
            <button className={[styles["rab-btn"], styles["rab-btn-small"], styles["rab-btn-danger"]].join(" ")} onClick={() => onDelete(item.id)} type="button" title="Hapus"><Trash2 size={14} /></button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <table className={styles["rab-items-table"]}>
      <thead>
        <tr>
          <th style={{ width: "36px", textAlign: "center" }}>✓</th>
          <th style={{ width: "55px", textAlign: "center" }}>No</th>
          <th style={{ width: "23%" }}>Uraian Pekerjaan</th>
          <th style={{ width: "8%" }}>Kategori</th>
          <th style={{ width: "10%" }}>Subkategori</th>
          <th style={{ width: "8%" }}>Status</th>
          <th style={{ width: "7%" }}>Sat</th>
          <th style={{ width: "7%" }}>Vol</th>
          {budgetMode === "rab" && isSuperAdmin && (
            <>
              <th style={{ width: "10%" }}>RAP Satuan</th>
              <th style={{ width: "10%" }}>RAP Total</th>
              <th style={{ width: "7%" }}>Ops %</th>
              <th style={{ width: "7%" }}>Waste %</th>
              <th style={{ width: "7%" }}>Laba %</th>
              <th style={{ width: "8%" }} title="Total komponen OVH">OVH %</th>
            </>
          )}
          <th style={{ width: "10%" }}>{budgetMode === "rab" && isSuperAdmin ? "RAB Satuan" : "RAP Satuan"}</th>
          <th style={{ width: "10%" }}>{budgetMode === "rab" && isSuperAdmin ? "RAB Total" : "RAP Total"}</th>
          {budgetMode === "rab" && isSuperAdmin && <th style={{ width: "8%" }} title="Selisih RAB - RAP = operasional + waste anggaran + laba">Total OVH</th>}
          <th style={{ width: "60px" }}></th>
        </tr>
      </thead>
      <tbody>
        {parents.map((item, idx) => {
          const childItems = childrenByParent.get(item.id) || [];
          return (
            <Fragment key={item.id}>
              {renderRow(item, idx, true, childItems.length > 0)}
              {childItems.map((child, cidx) => renderRow(child, cidx, false, false))}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

export default RabBudgeting;
