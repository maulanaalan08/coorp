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
            <div className="edit-modal-eyebrow">PROJECT MANAGEMENT</div>
            <h2>Edit Project</h2>
            <p>Perbarui informasi project yang dipilih.</p>
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
            <label htmlFor="edit-name">Project Name</label>
            <input
              id="edit-name"
              name="name"
              type="text"
              value={editForm.name}
              onChange={onChange}
              placeholder="Nama project"
              disabled={savingEdit}
            />
          </div>

          <div className="edit-form-group">
            <label htmlFor="edit-clientName">Client Name</label>
            <input
              id="edit-clientName"
              name="clientName"
              type="text"
              value={editForm.clientName}
              onChange={onChange}
              placeholder="Nama client"
              disabled={savingEdit}
            />
          </div>

          <div className="edit-form-group">
            <label htmlFor="edit-location">Location</label>
            <input
              id="edit-location"
              name="location"
              type="text"
              value={editForm.location}
              onChange={onChange}
              placeholder="Lokasi project"
              disabled={savingEdit}
            />
          </div>

          <div className="edit-form-group">
            <label htmlFor="edit-hspkPeriod">HSPK Period</label>
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
            <label htmlFor="edit-discipline">Discipline</label>
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
              Cancel
            </button>

            <button type="submit" className="edit-save-btn" disabled={savingEdit}>
              {savingEdit ? (
                <>
                  <RefreshCw size={16} className="button-spinner" /> Saving...
                </>
              ) : (
                <>
                  <Save size={16} /> Save Changes
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