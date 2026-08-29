import React from "react";
import { RefreshCw, Lock, Pencil, Trash2 } from "lucide-react";

const ProjectTableRow = ({
  project,
  hasSurvey,
  surveyChecking,
  onViewDetails,
  onCreateSurvey,
  onCreateBv,
  onOpenEdit,
  onDelete,
}) => {
  const bvDisabled = surveyChecking || !hasSurvey;

  return (
    <tr>
      <td className="fw-bold">{project.name}</td>
      <td className="text-gray">{project.client?.name || "-"}</td>
      <td className="text-gray">{project.location || "-"}</td>
      <td>
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${project.progress ?? 0}%` }}
            />
          </div>
          <span className="progress-text">{project.progress ?? 0}%</span>
        </div>
      </td>
      <td>
        <span className={`phase-badge ${project.phaseClass || "phase-planning"}`}>
          {project.phase || "PLANNING"}
        </span>
      </td>
      <td className="project-actions-cell">
        <button
          className="btn-view-details"
          onClick={() => onViewDetails?.(project.id)}
          type="button"
        >
          VIEW DETAILS
        </button>

        <button
          className="btn-create-survey"
          onClick={() => onCreateSurvey?.(project.id, project.name)}
          type="button"
        >
          CREATE SURVEY
        </button>

        <button
          className={`btn-create-bv ${hasSurvey ? "bv-enabled" : "bv-locked"}`}
          onClick={() => {
            if (!hasSurvey) return;
            onCreateBv?.(project.id, project.name);
          }}
          disabled={bvDisabled}
          title={
            surveyChecking
              ? "Sedang memeriksa data Survey..."
              : !hasSurvey
              ? "Survey harus diinput terlebih dahulu"
              : "Create BV"
          }
          type="button"
        >
          {surveyChecking ? (
            <>
              <RefreshCw size={14} className="button-spinner" /> CHECK...
            </>
          ) : hasSurvey ? (
            "CREATE BV"
          ) : (
            <>
              <Lock size={14} /> LOCKED
            </>
          )}
        </button>

        <div className="project-row-tools">
          <button
            className="project-tool-btn edit-btn"
            onClick={() => onOpenEdit(project)}
            title="Edit Project"
            type="button"
          >
            <Pencil size={18} />
          </button>

          <button
            className="project-tool-btn delete-btn"
            onClick={() => onDelete(project.id, project.name)}
            title="Hapus Project"
            type="button"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default ProjectTableRow;