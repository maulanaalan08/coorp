import React from "react";
import { X, RefreshCw, Save } from "lucide-react";

const EditProjectModal = ({
  editProject,
  editForm,
  editError,
  savingEdit,
  onClose,
  onChange,
  onSubmit,
}) => {
  if (!editProject) return null;

  return (
    <div
      className="edit-project-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="edit-project-modal">
        <div className="edit-modal-header">
          <div>
            <div className="edit-modal-eyebrow">MANAJEMEN PROYEK</div>
            <h2>Ubah Proyek</h2>
            <p>Perbarui informasi proyek yang dipilih.</p>
          </div>
          <button
            type="button"
            className="edit-modal-close"
            onClick={onClose}
            disabled={savingEdit}
            title="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        {editError && <div className="edit-modal-error">{editError}</div>}

        <form className="edit-project-form" onSubmit={onSubmit}>
          <div className="edit-form-group">
            <label htmlFor="edit-name">Nama Proyek</label>
            <input
              id="edit-name"
              name="name"
              type="text"
              value={editForm.name}
              onChange={onChange}
              placeholder="Nama proyek"
              disabled={savingEdit}
            />
          </div>

          <div className="edit-form-group">
            <label htmlFor="edit-clientName">Nama Klien</label>
            <input
              id="edit-clientName"
              name="clientName"
              type="text"
              value={editForm.clientName}
              onChange={onChange}
              placeholder="Nama klien"
              disabled={savingEdit}
            />
          </div>

          <div className="edit-form-group">
            <label htmlFor="edit-location">Lokasi</label>
            <input
              id="edit-location"
              name="location"
              type="text"
              value={editForm.location}
              onChange={onChange}
              placeholder="Lokasi proyek"
              disabled={savingEdit}
            />
          </div>

          <div className="edit-form-group">
            <label htmlFor="edit-hspkPeriod">Periode HSPK</label>
            <input
              id="edit-hspkPeriod"
              name="hspkPeriod"
              type="number"
              value={editForm.hspkPeriod}
              onChange={onChange}
              placeholder="Contoh: 2026"
              disabled={savingEdit}
            />
          </div>

          <div className="edit-form-group">
            <label htmlFor="edit-discipline">Disiplin Pekerjaan</label>
            <input
              id="edit-discipline"
              name="discipline"
              type="text"
              value={editForm.discipline}
              onChange={onChange}
              placeholder="Contoh: SIPIL / INTERIOR"
              disabled={savingEdit}
            />
          </div>

          <div className="edit-form-group">
            <label htmlFor="edit-grade">Grade</label>
            <input
              id="edit-grade"
              name="grade"
              type="text"
              value={editForm.grade}
              onChange={onChange}
              placeholder="Contoh: A"
              disabled={savingEdit}
            />
          </div>

          <div className="edit-modal-footer">
            <button
              type="button"
              className="edit-cancel-btn"
              onClick={onClose}
              disabled={savingEdit}
            >
              Batal
            </button>

            <button type="submit" className="edit-save-btn" disabled={savingEdit}>
              {savingEdit ? (
                <>
                  <RefreshCw size={16} className="button-spinner" /> Menyimpan...
                </>
              ) : (
                <>
                  <Save size={16} /> Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProjectModal;