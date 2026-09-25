import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  Check,
  Layers,
  Loader2,
} from "lucide-react";
import { workCategoryService } from "../services/workCategoryService";
import { toast } from "react-hot-toast";
import "../styles/WorkCategoriesPage.css";

const WorkCategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: "", name: "", sortOrder: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

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
    setForm({ code: "", name: "", sortOrder: categories.length });
    setIsModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({
      code: cat.code,
      name: cat.name,
      sortOrder: cat.sortOrder,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setForm({ code: "", name: "", sortOrder: 0 });
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
        sortOrder: Number.isNaN(Number(form.sortOrder))
          ? 0
          : Number(form.sortOrder),
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

  const handleDelete = async (cat) => {
    if (!window.confirm(`Yakin hapus kategori "${cat.name}"?`)) return;
    setDeletingId(cat.id);
    try {
      const res = await workCategoryService.remove(cat.id);
      toast.success(res?.message || "Kategori dihapus.");
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
                  .map((cat) => (
                    <tr
                      key={cat.id}
                      className={cat.isActive === false ? "wcp-row-inactive" : ""}
                    >
                      <td className="wcp-col-order">{cat.sortOrder}</td>
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
                          className="wcp-icon-btn wcp-edit"
                          onClick={() => openEdit(cat)}
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="wcp-icon-btn wcp-delete"
                          onClick={() => handleDelete(cat)}
                          disabled={deletingId === cat.id}
                          title="Hapus"
                        >
                          {deletingId === cat.id ? (
                            <Loader2 className="wcp-spin" size={16} />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </td>
                    </tr>
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
              <div className="wcp-field">
                <label>Urutan</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: e.target.value })
                  }
                  placeholder="0"
                />
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
