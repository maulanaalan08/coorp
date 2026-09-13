import { useState, useEffect } from "react";
import "../styles/CreateProjectModal.css";
import { X } from "lucide-react";
import { hspkService } from "../services/hspkService";
import { projectService } from "../services/projectService";
import toast from "react-hot-toast";

const CreateProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
  const [projectName, setProjectName] = useState("");
  const [client, setClient] = useState("");
  const [location, setLocation] = useState("");

  // State untuk periode dan grade ganda
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [interiorGrades, setInteriorGrades] = useState([]);
  const [sipilGrades, setSipilGrades] = useState([]);
  const [selectedInteriorGrade, setSelectedInteriorGrade] = useState("");
  const [selectedSipilGrade, setSelectedSipilGrade] = useState("");

  const [hspkLoading, setHspkLoading] = useState(true);

  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const result = await hspkService.getAvailableCombos();
        // ambil periode unik dari combo
        const uniqPeriods = Array.from(
          new Set((Array.isArray(result) ? result : []).map((r) => r.period))
        ).sort((a, b) => Number(b) - Number(a));
        setPeriods(uniqPeriods);
      } catch (err) {
        console.error(err);
        setPeriods([]);
      } finally {
        setHspkLoading(false);
      }
    };
    if (isOpen) {
      fetchPeriods();
    }
  }, [isOpen]);

  // Load grade Interior saat periode dipilih
  useEffect(() => {
    if (!selectedPeriod) {
      setInteriorGrades([]);
      setSelectedInteriorGrade("");
      return;
    }
    hspkService
      .getGradesByPeriodDiscipline(selectedPeriod, "INTERIOR")
      .then((res) => {
        const grades = Array.isArray(res) ? res : [];
        setInteriorGrades(grades);
        if (grades.length === 1) setSelectedInteriorGrade(grades[0]);
        else if (!grades.includes(selectedInteriorGrade))
          setSelectedInteriorGrade("");
      })
      .catch((err) => {
        console.error("Gagal load grade interior:", err);
        setInteriorGrades([]);
      });
  }, [selectedPeriod]);

  // Load grade Sipil saat periode dipilih
  useEffect(() => {
    if (!selectedPeriod) {
      setSipilGrades([]);
      setSelectedSipilGrade("");
      return;
    }
    hspkService
      .getGradesByPeriodDiscipline(selectedPeriod, "SIPIL")
      .then((res) => {
        const grades = Array.isArray(res) ? res : [];
        setSipilGrades(grades);
        if (grades.length === 1) setSelectedSipilGrade(grades[0]);
        else if (!grades.includes(selectedSipilGrade)) setSelectedSipilGrade("");
      })
      .catch((err) => {
        console.error("Gagal load grade sipil:", err);
        setSipilGrades([]);
      });
  }, [selectedPeriod]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPeriod || !selectedInteriorGrade || !selectedSipilGrade) {
      toast.error("Pilih periode, grade Interior, dan grade Sipil.");
      return;
    }
    if (!projectName.trim() || !location.trim() || !client.trim()) {
      toast.error("Semua field wajib diisi.");
      return;
    }

    const createPromise = projectService.create({
      name: projectName.trim(),
      clientName: client.trim(),
      location: location.trim(),
      hspkPeriod: Number(selectedPeriod),
      interiorGrade: selectedInteriorGrade,
      sipilGrade: selectedSipilGrade,
    });

    toast
      .promise(createPromise, {
        loading: "Membuat project...",
        success: "Project berhasil dibuat!",
        error: "Gagal membuat project.",
      })
      .then(() => {
        setProjectName("");
        setClient("");
        setLocation("");
        setSelectedPeriod("");
        setSelectedInteriorGrade("");
        setSelectedSipilGrade("");

        if (onProjectCreated) onProjectCreated();
        onClose();
      })
      .catch((err) => console.error(err));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Create New Project</h3>
          <button className="close-btn" type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form className="project-form" onSubmit={handleSubmit}>
          <div className="card">
            <h2>Basic Information</h2>
            <div className="grid">
              <div className="form-group">
                <label>Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Client Name</label>
                <input
                  type="text"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  required
                />
              </div>

              <div className="form-group full">
                <label>Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </div>

              <div className="form-group full">
                <label>Periode Data HSPK</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    {hspkLoading ? "-- memuat --" : "-- pilih periode --"}
                  </option>
                  {periods.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Grade Interior</label>
                <select
                  value={selectedInteriorGrade}
                  onChange={(e) => setSelectedInteriorGrade(e.target.value)}
                  required
                  disabled={!selectedPeriod}
                >
                  <option value="" disabled>
                    {!selectedPeriod
                      ? "Pilih periode dulu"
                      : "-- pilih grade interior --"}
                  </option>
                  {interiorGrades.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Grade Sipil</label>
                <select
                  value={selectedSipilGrade}
                  onChange={(e) => setSelectedSipilGrade(e.target.value)}
                  required
                  disabled={!selectedPeriod}
                >
                  <option value="" disabled>
                    {!selectedPeriod
                      ? "Pilih periode dulu"
                      : "-- pilih grade sipil --"}
                  </option>
                  {sipilGrades.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="actions">
            <button type="button" className="cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="create">
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
