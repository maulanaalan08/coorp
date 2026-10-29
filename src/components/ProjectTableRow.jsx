import React from "react";
import {
  RefreshCw,
  Lock,
  Pencil,
  Trash2,
  Eye,
  FileText,
  ClipboardList,
  MapPin,
  Compass,
  UserCog,
  CheckCircle2,
  TriangleAlert,
} from "lucide-react";

const getPhaseBadge = (phaseRaw) => {
  const p = (phaseRaw || "PLANNING").toUpperCase();
  if (p === "PLANNING" || p === "PERENCANAAN") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
        <Compass size={12} /> Perencanaan
      </span>
    );
  }
  if (p === "CONSTRUCTION" || p === "KONSTRUKSI") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/30">
        <UserCog size={12} /> Konstruksi
      </span>
    );
  }
  if (p === "COMPLETED" || p === "SELESAI") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
        <CheckCircle2 size={12} /> Selesai
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
      <TriangleAlert size={12} /> {phaseRaw}
    </span>
  );
};

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
  const progressVal = Math.min(100, Math.max(0, Number(project.progress ?? 0)));

  return (
    <tr className="hover:bg-white/[0.025] transition-colors border-b border-[#1f1d18] last:border-none">
      {/* Nama Proyek */}
      <td className="py-3.5 px-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-[#f2ead9] text-sm hover:text-[#d4af37] transition-colors cursor-pointer" onClick={() => onViewDetails?.(project.id)}>
            {project.name}
          </span>
          {project.hspkPeriod && (
            <span className="text-[11px] text-[#7d7363] font-mono">
              Periode HSPK: {project.hspkPeriod}
            </span>
          )}
        </div>
      </td>

      {/* Klien */}
      <td className="py-3.5 px-4 text-sm text-[#bbb1a0]">
        {project.client?.name || "-"}
      </td>

      {/* Lokasi */}
      <td className="py-3.5 px-4 text-sm text-[#8e8474]">
        <div className="flex items-center gap-1.5">
          <MapPin size={13} className="text-[#a89c85] shrink-0" />
          <span className="truncate max-w-[150px]">{project.location || "-"}</span>
        </div>
      </td>

      {/* Progres */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-3">
          <div className="w-24 bg-[#23201a] h-2 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progressVal}%`,
                background:
                  progressVal >= 100
                    ? "linear-gradient(90deg, #10b981, #34d399)"
                    : "linear-gradient(90deg, #b89326, #e8c874)",
              }}
            />
          </div>
          <span className="text-xs font-mono font-bold text-[#e8e3d8]">
            {progressVal}%
          </span>
        </div>
      </td>

      {/* Tahap Saat Ini */}
      <td className="py-3.5 px-4 whitespace-nowrap">
        {getPhaseBadge(project.phase)}
      </td>

      {/* Aksi */}
      <td className="py-3.5 px-4">
        <div className="flex items-center justify-end gap-1.5 flex-nowrap">
          {/* Tombol Lihat Detail */}
          <button
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#1e1c18] text-[#d4af37] border border-[#4a4231] hover:bg-[#2a261e] transition-all"
            onClick={() => onViewDetails?.(project.id)}
            type="button"
            title="Lihat Detail Proyek"
          >
            <Eye size={13} />
            <span>Detail</span>
          </button>

          {/* Tombol Survey */}
          <button
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              hasSurvey
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
            }`}
            onClick={() => onCreateSurvey?.(project.id, project.name)}
            type="button"
            title={hasSurvey ? "Buka Data Survey" : "Input Survey Baru"}
          >
            <FileText size={13} />
            <span>{hasSurvey ? "Survey ✓" : "Survey"}</span>
          </button>

          {/* Tombol BV */}
          <button
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              bvDisabled
                ? "bg-[#1f1d19] text-[#666] border border-[#333] cursor-not-allowed"
                : "bg-gradient-to-r from-[#d4af37] to-[#b89326] text-[#0c0b09] shadow-sm hover:brightness-110"
            }`}
            onClick={() => {
              if (bvDisabled) return;
              onCreateBv?.(project.id, project.name);
            }}
            disabled={bvDisabled}
            title={
              surveyChecking
                ? "Sedang memeriksa data Survey..."
                : !hasSurvey
                ? "Survey harus diinput terlebih dahulu"
                : "Buka Back Up Volume"
            }
            type="button"
          >
            {surveyChecking ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                <span>Cek...</span>
              </>
            ) : hasSurvey ? (
              <>
                <ClipboardList size={13} />
                <span>BV</span>
              </>
            ) : (
              <>
                <Lock size={12} />
                <span>BV</span>
              </>
            )}
          </button>

          {/* Tools: Edit & Delete */}
          <div className="flex items-center gap-0.5 border-l border-[#2e2a22] pl-1.5 ml-1">
            <button
              className="p-1.5 rounded-lg text-[#888] hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
              onClick={() => onOpenEdit(project)}
              title="Ubah Proyek"
              type="button"
            >
              <Pencil size={14} />
            </button>

            <button
              className="p-1.5 rounded-lg text-[#888] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              onClick={() => onDelete(project.id, project.name)}
              title="Hapus Proyek"
              type="button"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
};

export default ProjectTableRow;
