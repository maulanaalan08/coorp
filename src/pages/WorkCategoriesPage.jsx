import { Fragment, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  Check,
  Layers,
  Loader2,
  Power,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { workCategoryService } from "../services/workCategoryService";
import { toast } from "react-hot-toast";
import "../styles/WorkCategoriesPage.css";

const WorkCategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: "", name: "" });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);
  const [subcategoriesByCategory, setSubcategoriesByCategory] = useState({});
  const [loadingSubcategoriesId, setLoadingSubcategoriesId] = useState(null);
  const [submittingSubcategory, setSubmittingSubcategory] = useState(false);
  const [busySubcategoryId, setBusySubcategoryId] = useState(null);
  const [subcategoryForm, setSubcategoryForm] = useState(null);

  const loadSubcategories = async (categoryId) => {
    setLoadingSubcategoriesId(categoryId);
    try {
      const data = await workCategoryService.getSubcategories(categoryId);
      setSubcategoriesByCategory((current) => ({
        ...current,
        [categoryId]: Array.isArray(data) ? data : data?.data || [],
      }));
    } catch (err) {
      toast.error(err?.message || "Gagal memuat subkategori.");
    } finally {
      setLoadingSubcategoriesId((current) => current === categoryId ? null : current);
    }
  };

  const toggleSubcategories = async (categoryId) => {
    if (expandedCategoryId === categoryId) {
      setExpandedCategoryId(null);
      setSubcategoryForm(null);
      return;
    }
    setExpandedCategoryId(categoryId);
    setSubcategoryForm(null);
    await loadSubcategories(categoryId);
  };

  const openSubcategoryForm = (categoryId, subcategory = null) => {
    setSubcategoryForm({
      categoryId,
      id: subcategory?.id || null,
      code: subcategory?.code || "",
      name: subcategory?.name || "",
    });
  };

  const handleSubcategorySubmit = async (e) => {
    e.preventDefault();
    if (!subcategoryForm?.name.trim() || !subcategoryForm?.code.trim()) {
      toast.error("Kode dan nama subkategori wajib diisi.");
      return;
    }

    setSubmittingSubcategory(true);
    try {
      const payload = {
        code: subcategoryForm.code.trim().toUpperCase(),
        name: subcategoryForm.name.trim(),
      };
      if (subcategoryForm.id) {
        await workCategoryService.updateSubcategory(
          subcategoryForm.categoryId,
          subcategoryForm.id,
          payload,
        );
        toast.success("Subkategori diperbarui.");
      } else {
        await workCategoryService.createSubcategory(subcategoryForm.categoryId, payload);
        toast.success("Subkategori ditambahkan.");
      }
      const categoryId = subcategoryForm.categoryId;
      setSubcategoryForm(null);
      await loadSubcategories(categoryId);
    } catch (err) {
      toast.error(err?.message || "Gagal menyimpan subkategori.");
    } finally {
      setSubmittingSubcategory(false);
    }
  };

  const handleToggleSubcategory = async (categoryId, subcategory) => {
    setBusySubcategoryId(subcategory.id);
    try {
      await workCategoryService.updateSubcategory(categoryId, subcategory.id, {
        isActive: subcategory.isActive === false,
      });
      await loadSubcategories(categoryId);
    } catch (err) {
      toast.error(err?.message || "Gagal mengubah status subkategori.");
    } finally {
      setBusySubcategoryId(null);
    }
  };

  const handleDeleteSubcategory = async (categoryId, subcategory) => {
    setBusySubcategoryId(subcategory.id);
    try {
      let references = null;
      try {
        const impact = await workCategoryService.getSubcategoryReferences(categoryId, subcategory.id);
        references = impact?.references || null;
      } catch (error) {
        if (!/404|tidak ditemukan/i.test(error?.message || "")) throw error;
      }
      const usedCount = Number(references?.bvItems || 0) + Number(references?.rabItems || 0);
      const warning = usedCount > 0
        ? ` Subkategori dipakai oleh ${usedCount} item BV/RAB dan tidak dapat dihapus.`
        : " Subkategori yang masih dipakai item BV/RAB tidak dapat dihapus.";
      if (!window.confirm(`Hapus subkategori "${subcategory.name}"?${warning}`)) return;
      await workCategoryService.removeSubcategory(categoryId, subcategory.id);
      toast.success("Subkategori dihapus.");
      await loadSubcategories(categoryId);
    } catch (err) {
      toast.error(err?.message || "Gagal menghapus subkategori.");
    } finally {
      setBusySubcategoryId(null);
    }
  };

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await workCategoryService.getAll();
      setCategories(data || []);
    } catch (err) {
      toast.error(err?.message || "Gagal memuat kategori.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: "", name: "" });
    setIsModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({
      code: cat.code,
      name: cat.name,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setForm({ code: "", name: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Nama kategori wajib diisi.");
      return;
    }
    if (!form.code.trim()) {
      toast.error("Kode kategori wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
      };

      if (editing) {
        await workCategoryService.update(editing.id, payload);
        toast.success("Kategori diperbarui.");
      } else {
        await workCategoryService.create(payload);
        toast.success("Kategori baru dibuat.");
      }
      closeModal();
      await loadCategories();
    } catch (err) {
      toast.error(err?.message || "Gagal menyimpan kategori.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (cat) => {
    const nextActive = cat.isActive === false;
    setTogglingId(cat.id);
    try {
      await workCategoryService.update(cat.id, { isActive: nextActive });
      toast.success(
        `Kategori berhasil ${nextActive ? "diaktifkan" : "dinonaktifkan"}.`,
      );
      await loadCategories();
    } catch (err) {
      toast.error(err?.message || "Gagal mengubah status kategori.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (cat) => {
    setDeletingId(cat.id);
    try {
      const impact = await workCategoryService.getReferences(cat.id);
      const references = impact?.references || {};
      const affected = [
        ["konfigurasi Project", references.projectConfigs],
        ["harga HSPK", references.priceItems],
        ["pekerjaan AHSP", references.jobTypes],
        ["riwayat upload", references.uploadBatches],
        ["item BV", references.bvItems],
        ["item RAB", references.rabItems],
      ].filter(([, count]) => Number(count) > 0);
      const impactText = affected.length
        ? `\n\nDampak penghapusan:\n${affected
            .map(([label, count]) => `• ${count} ${label}`)
            .join("\n")}\n\nData HSPK/BV/RAB tetap disimpan tanpa kategori, sedangkan konfigurasi kategori pada Project dilepas.`
        : "\n\nKategori ini belum dipakai oleh data lain.";

      if (
        !window.confirm(
          `Hapus permanen kategori "${cat.name}"? Kategori akan benar-benar dihapus dan tidak dapat dipulihkan.${impactText}`,
        )
      )
        return;

      const res = await workCategoryService.remove(cat.id);
      toast.success(res?.message || "Kategori berhasil dihapus permanen.");
      await loadCategories();
    } catch (err) {
      toast.error(err?.message || "Gagal menghapus kategori.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="wcp-page">
      <header className="wcp-header">
        <div>
          <h1 className="wcp-title">
            <Layers size={24} />
            Kategori Pekerjaan
          </h1>
          <p className="wcp-subtitle">
            Kelola kategori yang tersedia untuk proyek dan upload HSPK.
          </p>
        </div>
        <button className="wcp-btn-primary" onClick={openCreate}>
          <Plus size={18} />
          Tambah Kategori
        </button>
      </header>

      <section className="wcp-card">
        {loading ? (
          <div className="wcp-empty">
            <Loader2 className="wcp-spin" size={28} />
            <span>Memuat kategori...</span>
          </div>
        ) : categories.length === 0 ? (
          <div className="wcp-empty">
            <AlertTriangle size={28} />
            <span>Belum ada kategori pekerjaan.</span>
          </div>
        ) : (
          <div className="wcp-table-wrap">
            <table className="wcp-table">
              <thead>
                <tr>
                  <th className="wcp-col-order">#</th>
                  <th>Kode</th>
                  <th>Nama Kategori</th>
                  <th className="wcp-col-status">Status</th>
                  <th className="wcp-col-action">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {categories
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
                  .map((cat, categoryIndex) => (
                    <Fragment key={cat.id}>
                    <tr
                      className={cat.isActive === false ? "wcp-row-inactive" : ""}
                    >
                      <td className="wcp-col-order">{categoryIndex + 1}</td>
                      <td>
                        <span className="wcp-code">{cat.code}</span>
                      </td>
                      <td>{cat.name}</td>
                      <td className="wcp-col-status">
                        {cat.isActive === false ? (
                          <span className="wcp-badge wcp-badge-inactive">
                            Nonaktif
                          </span>
                        ) : (
                          <span className="wcp-badge wcp-badge-active">
                            Aktif
                          </span>
                        )}
                      </td>
                      <td className="wcp-col-action">
                        <button
                          className="wcp-manage-sub-btn"
                          onClick={() => toggleSubcategories(cat.id)}
                          aria-expanded={expandedCategoryId === cat.id}
                        >
                          {expandedCategoryId === cat.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          Kelola Subkategori
                        </button>
                        <button
                          className={`wcp-icon-btn wcp-toggle ${
                            cat.isActive === false ? "wcp-activate" : "wcp-deactivate"
                          }`}
                          onClick={() => handleToggleStatus(cat)}
                          disabled={togglingId === cat.id || deletingId === cat.id}
                          title={cat.isActive === false ? "Aktifkan" : "Nonaktifkan"}
                          aria-label={`${cat.isActive === false ? "Aktifkan" : "Nonaktifkan"} ${cat.name}`}
                        >
                          {togglingId === cat.id ? (
                            <Loader2 className="wcp-spin" size={16} />
                          ) : (
                            <Power size={16} />
                          )}
                        </button>
                        <button
                          className="wcp-icon-btn wcp-edit"
                          onClick={() => openEdit(cat)}
                          disabled={togglingId === cat.id || deletingId === cat.id}
                          title="Ubah"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="wcp-icon-btn wcp-delete"
                          onClick={() => handleDelete(cat)}
                          disabled={deletingId === cat.id || togglingId === cat.id}
                          title="Hapus permanen"
                          aria-label={`Hapus permanen ${cat.name}`}
                        >
                          {deletingId === cat.id ? (
                            <Loader2 className="wcp-spin" size={16} />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedCategoryId === cat.id && (
                      <tr key={`${cat.id}-subcategories`} className="wcp-subcategory-row">
                        <td colSpan={5}>
                          <div className="wcp-subcategory-panel">
                            <div className="wcp-subcategory-toolbar">
                              <strong>Subkategori {cat.code}</strong>
                              <button
                                type="button"
                                className="wcp-btn-secondary wcp-btn-compact"
                                onClick={() => openSubcategoryForm(cat.id)}
                              >
                                <Plus size={15} /> Tambah
                              </button>
                            </div>

                            {subcategoryForm?.categoryId === cat.id && (
                              <form className="wcp-subcategory-form" onSubmit={handleSubcategorySubmit}>
                                <input
                                  value={subcategoryForm.code}
                                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, code: e.target.value.toUpperCase() })}
                                  placeholder="Kode"
                                  maxLength={20}
                                  required
                                />
                                <input
                                  value={subcategoryForm.name}
                                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
                                  placeholder="Nama subkategori"
                                  required
                                />
                                <button type="submit" className="wcp-btn-primary wcp-btn-compact" disabled={submittingSubcategory}>
                                  {submittingSubcategory ? <Loader2 className="wcp-spin" size={15} /> : <Check size={15} />}
                                  Simpan
                                </button>
                                <button type="button" className="wcp-btn-secondary wcp-btn-compact" onClick={() => setSubcategoryForm(null)}>
                                  Batal
                                </button>
                              </form>
                            )}

                            {loadingSubcategoriesId === cat.id ? (
                              <div className="wcp-subcategory-empty"><Loader2 className="wcp-spin" size={18} /> Memuat...</div>
                            ) : (subcategoriesByCategory[cat.id] || []).length === 0 ? (
                              <div className="wcp-subcategory-empty">Belum ada subkategori.</div>
                            ) : (
                              <div className="wcp-subcategory-list">
                                {(subcategoriesByCategory[cat.id] || [])
                                  .slice()
                                  .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
                                  .map((sub, subcategoryIndex) => (
                                    <div key={sub.id} className={`wcp-subcategory-item ${sub.isActive === false ? "wcp-subcategory-inactive" : ""}`}>
                                      <span className="wcp-col-order">{subcategoryIndex + 1}</span>
                                      <span className="wcp-code">{sub.code}</span>
                                      <span className="wcp-subcategory-name">{sub.name}</span>
                                      <span className={`wcp-badge ${sub.isActive === false ? "wcp-badge-inactive" : "wcp-badge-active"}`}>
                                        {sub.isActive === false ? "Nonaktif" : "Aktif"}
                                      </span>
                                      <span className="wcp-subcategory-actions">
                                        <button type="button" className="wcp-icon-btn wcp-toggle" disabled={busySubcategoryId === sub.id} onClick={() => handleToggleSubcategory(cat.id, sub)} title={sub.isActive === false ? "Aktifkan" : "Nonaktifkan"}>
                                          <Power size={15} />
                                        </button>
                                        <button type="button" className="wcp-icon-btn wcp-edit" disabled={busySubcategoryId === sub.id} onClick={() => openSubcategoryForm(cat.id, sub)} title="Edit">
                                          <Pencil size={15} />
                                        </button>
                                        <button type="button" className="wcp-icon-btn wcp-delete" disabled={busySubcategoryId === sub.id} onClick={() => handleDeleteSubcategory(cat.id, sub)} title="Hapus">
                                          {busySubcategoryId === sub.id ? <Loader2 className="wcp-spin" size={15} /> : <Trash2 size={15} />}
                                        </button>
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="wcp-modal-overlay" onClick={closeModal}>
          <div
            className="wcp-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wcp-modal-header">
              <h3>{editing ? "Edit Kategori" : "Tambah Kategori"}</h3>
              <button className="wcp-close-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="wcp-form">
              <div className="wcp-field">
                <label>Nama Kategori</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Mechanical Electrical Plumbing"
                  autoFocus
                />
              </div>
              <div className="wcp-field">
                <label>Kode</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  placeholder="Contoh: MEP"
                  maxLength={20}
                />
                <small className="wcp-hint">
                  Kode unik, maksimal 20 karakter.
                </small>
              </div>
              <div className="wcp-actions">
                <button
                  type="button"
                  className="wcp-btn-secondary"
                  onClick={closeModal}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="wcp-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="wcp-spin" size={18} />
                  ) : editing ? (
                    <>
                      <Check size={18} /> Simpan
                    </>
                  ) : (
                    <>
                      <Plus size={18} /> Tambah
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCategoriesPage;
