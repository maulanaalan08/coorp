import { useState, useEffect } from "react";
import "../styles/CreateProjectModal.css";
import { X } from "lucide-react";

const CreateProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
  const [projectName, setProjectName] = useState("");
  const [client, setClient] = useState("");
  const [location, setLocation] = useState("");
  
  // State baru untuk filter disiplin
  const [selectedDiscipline, setSelectedDiscipline] = useState("");
  
  const [selectedComboIndex, setSelectedComboIndex] = useState("");
  const [hspkOptions, setHspkOptions] = useState([]);
  const [hspkLoading, setHspkLoading] = useState(true);

  useEffect(() => {
    const fetchHspk = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/hspk/available-combos");
        if (!res.ok) throw new Error("Failed to fetch HSPK data");
        const result = await res.json();
        setHspkOptions(result);
      } catch (err) {
        console.error(err);
        setHspkOptions([]);
      } finally {
        setHspkLoading(false);
      }
    };
    if (isOpen) {
      fetchHspk();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter HSPK berdasarkan disiplin yang dipilih user
  const filteredHspkOptions = hspkOptions.filter((combo) => {
    if (!selectedDiscipline) return false;
    return combo.discipline?.toUpperCase() === selectedDiscipline.toUpperCase();
  });

  // Handler saat disiplin diubah (Sipil -> Interior atau sebaliknya)
  const handleDisciplineChange = (e) => {
    setSelectedDiscipline(e.target.value);
    setSelectedComboIndex(""); // Reset pilihan combo agar index tidak meleset
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mengambil combo berdasarkan array yang sudah difilter
    const selectedCombo = filteredHspkOptions[Number(selectedComboIndex)];

    if (!selectedCombo?.period) {
      alert("Pilih data HSPK dulu.");
      return;
    }
    if (!projectName.trim() || !location.trim() || !client.trim()) {
      alert("Semua field wajib diisi.");
      return;
    }

    try {
      const response = await fetch("http://localhost:4000/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectName.trim(),
          clientName: client.trim(),
          location: location.trim(),
          hspkPeriod: selectedCombo?.period,
          discipline: selectedCombo?.discipline,
          grade: selectedCombo?.grade,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      alert("Project berhasil dibuat!");

      // Reset form
      setProjectName("");
      setClient("");
      setLocation("");
      setSelectedDiscipline("");
      setSelectedComboIndex("");

      if (onProjectCreated) {
        onProjectCreated();
      }

      onClose();
    } catch (err) {
      console.error(err);
      alert("Gagal membuat project");
    }
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

              {/* Input Pilihan Disiplin Pekerjaan */}
              <div className="form-group full">
                <label>Kategori Pekerjaan</label>
                <select
                  value={selectedDiscipline}
                  onChange={handleDisciplineChange}
                  required
                >
                  <option value="" disabled>-- Pilih Kategori --</option>
                  <option value="SIPIL">Sipil</option>
                  <option value="INTERIOR">Interior</option>
                </select>
              </div>

              {/* Input Pilihan Data HSPK (Muncul mengikuti Filter di atas) */}
              <div className="form-group full">
                <label htmlFor="hspkCombo">Pilih Data HSPK</label>
                <select
                  id="hspkCombo"
                  value={selectedComboIndex}
                  onChange={(e) => setSelectedComboIndex(e.target.value)}
                  required
                  disabled={!selectedDiscipline} // Disable kalau belum pilih disiplin
                >
                  <option value="" disabled>
                    {hspkLoading
                      ? "-- memuat --"
                      : !selectedDiscipline
                      ? "-- Pilih kategori pekerjaan dulu --"
                      : "-- pilih data HSPK --"}
                  </option>
                  {filteredHspkOptions.map((combo, index) => (
                    <option key={index} value={index}>
                      {combo.period} — {combo.discipline} — Grade {combo.grade}
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