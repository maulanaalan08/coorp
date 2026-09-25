import { useState, useEffect } from "react";
import "../styles/CreateProjectModal.css";
import { X } from "lucide-react";
import { hspkService } from "../services/hspkService";
import { projectService } from "../services/projectService";
import { workCategoryService } from "../services/workCategoryService";
import toast from "react-hot-toast";

const CreateProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
  const [projectName, setProjectName] = useState("");
  const [client, setClient] = useState("");
  const [location, setLocation] = useState("");

  // Periode HSPK (dari upload yang sudah ada di DB)
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [hspkLoading, setHspkLoading] = useState(true);

  // Kategori pekerjaan dinamis
  const [workCategories, setWorkCategories] = useState([]);
  // selectedCategories: { [categoryId]: { pricingMode, grade, isActive } }
  const [selectedCategories, setSelectedCategories] = useState({});
  // Grades per kategori: { [categoryId]: ["A", "B"] }
  const [categoryGrades, setCategoryGrades] = useState({});

  // Load periode + kategori saat modal buka
  useEffect(() => {
    if (!isOpen) return;

    const fetchPeriods = async () => {
      try {
        const result = await hspkService.getAvailableCombos();
        const combos = Array.isArray(result) ? result : [];
        const uniqPeriods = Array.from(new Set(combos.map((r) => r.period)))
          .filter(Boolean)
          .sort((a, b) => Number(b) - Number(a));
        setPeriods(uniqPeriods);
      } catch (err) {
        console.error(err);
        setPeriods([]);
      } finally {
        setHspkLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const cats = await workCategoryService.getAll();
        const activeCats = (Array.isArray(cats) ? cats : []).filter((c) => c.isActive);
        setWorkCategories(activeCats);
      } catch (err) {
        console.error("Gagal load kategori:", err);
        setWorkCategories([]);
      }
    };

    fetchPeriods();
    fetchCategories();
  }, [isOpen]);

  // Load grade per kategori saat periode berubah
  useEffect(() => {
    if (!selectedPeriod) {
      setCategoryGrades({});
      return;
    }

    let cancelled = false;
    const loadGrades = async () => {
      const gradesMap = {};
      await Promise.all(
        workCategories.map(async (cat) => {
          try {
            // Semua upload baru tersimpan berdasarkan workCategoryId, termasuk
            // SIPIL dan INTERIOR. Fallback discipline menjaga data legacy tetap terbaca.
            const categoryGradesResult = await hspkService.getGradesByPeriodCategory(
              selectedPeriod,
              cat.id
            );
            const dynamicGrades = Array.isArray(categoryGradesResult)
              ? categoryGradesResult
              : [];
            const categoryCode = String(cat.code || "").toUpperCase();
            const isLegacyCategory = categoryCode === "SIPIL" || categoryCode === "INTERIOR";

            if (dynamicGrades.length > 0 || !isLegacyCategory) {
              gradesMap[cat.id] = dynamicGrades;
            } else {
              const legacyGrades = await hspkService.getGradesByPeriodDiscipline(
                selectedPeriod,
                categoryCode
              );
              gradesMap[cat.id] = Array.isArray(legacyGrades) ? legacyGrades : [];
            }
          } catch {
            gradesMap[cat.id] = [];
          }
        })
      );
      if (!cancelled) setCategoryGrades(gradesMap);
    };

    if (workCategories.length > 0) loadGrades();
    return () => {
      cancelled = true;
    };
  }, [selectedPeriod, workCategories]);

  if (!isOpen) return null;

  const toggleCategory = (catId) => {
    setSelectedCategories((prev) => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        isActive: !prev[catId]?.isActive,
      },
    }));
  };

  const setCategoryMode = (catId, mode) => {
    setSelectedCategories((prev) => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        pricingMode: mode,
        grade: mode === "CUSTOM" ? "" : prev[catId]?.grade || "",
      },
    }));
  };

  const setCategoryGrade = (catId, grade) => {
    setSelectedCategories((prev) => ({
      ...prev,
      [catId]: { ...prev[catId], grade },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!projectName.trim() || !location.trim() || !client.trim()) {
      toast.error("Semua field wajib diisi.");
      return;
    }
    if (!selectedPeriod) {
      toast.error("Pilih periode data HSPK.");
      return;
    }

    const activeCats = Object.entries(selectedCategories).filter(
      ([, cfg]) => cfg.isActive
    );
    if (activeCats.length === 0) {
      toast.error("Pilih minimal satu kategori pekerjaan.");
      return;
    }

    // Sipil dan Interior wajib ikut dalam setiap project.
    const requiredCodes = ["SIPIL", "INTERIOR"];
    for (const code of requiredCodes) {
      const category = workCategories.find(
        (item) => String(item.code).toUpperCase() === code
      );
      if (!category || !selectedCategories[category.id]?.isActive) {
        toast.error(`Kategori ${code === "SIPIL" ? "Sipil" : "Interior"} wajib dipilih.`);
        return;
      }
    }

    // Validasi: kategori HSPK wajib punya grade
    for (const [catId, cfg] of activeCats) {
      if (cfg.pricingMode === "HSPK" && !cfg.grade) {
        const cat = workCategories.find((c) => c.id === catId);
        toast.error(
          `Grade wajib dipilih untuk kategori HSPK ${cat?.name || cat?.code}.`
        );
        return;
      }
    }

    const categories = activeCats.map(([workCategoryId, cfg]) => ({
      workCategoryId,
      pricingMode: cfg.pricingMode,
      grade: cfg.grade || null,
      isActive: true,
    }));

    const gradeForCode = (code) => {
      const cat = workCategories.find(
        (item) => String(item.code).toUpperCase() === code
      );
      const cfg = cat ? selectedCategories[cat.id] : null;
      return cfg?.pricingMode === "HSPK" ? cfg.grade || null : null;
    };

    const createPromise = projectService.create({
      name: projectName.trim(),
      clientName: client.trim(),
      location: location.trim(),
      hspkPeriod: Number(selectedPeriod),
      categories,
      // Legacy fields tetap dikirim agar klien lama yang membaca ini kompatibel.
      interiorGrade: gradeForCode("INTERIOR"),
      sipilGrade: gradeForCode("SIPIL"),
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
        setSelectedCategories({});
        setCategoryGrades({});

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
                {periods.length === 0 && !hspkLoading && (
                  <small className="cat-period-note">
                    Belum ada data HSPK. Upload HSPK dulu.
                  </small>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Kategori Pekerjaan</h2>
            <p className="cat-intro">
              Centang kategori yang dipakai proyek ini. Mode HSPK mengambil harga
              dari upload sesuai periode; mode Custom memakai input manual.
            </p>
            <div className="cat-grid">
              {workCategories.length === 0 && (
                <p className="cat-empty">Tidak ada kategori aktif.</p>
              )}
              {workCategories.map((cat) => {
                const cfg = selectedCategories[cat.id] || {
                  pricingMode: "CUSTOM",
                  grade: "",
                  isActive: false,
                };
                const grades = categoryGrades[cat.id] || [];
                const isLegacy = cat.code === "SIPIL" || cat.code === "INTERIOR";
                return (
                  <div
                    key={cat.id}
                    className={`cat-card ${cfg.isActive ? "is-active" : "is-inactive"}`}
                  >
                    <label
                      className="cat-card-header"
                      onClick={() => toggleCategory(cat.id)}
                    >
                      <input
                        type="checkbox"
                        checked={cfg.isActive}
                        onChange={() => toggleCategory(cat.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="cat-card-name">{cat.name}</span>
                      <span className="cat-card-code">{cat.code}</span>
                    </label>
                    {cfg.isActive && (
                      <div className="cat-card-body">
                        <div className="cat-field">
                          <span className="cat-field-label">Sumber Harga</span>
                          <select
                            className="cat-select"
                            value={cfg.pricingMode}
                            onChange={(e) => setCategoryMode(cat.id, e.target.value)}
                          >
                            <option value="CUSTOM">Custom (manual)</option>
                            <option value="HSPK" disabled={grades.length === 0}>
                              HSPK{grades.length === 0 ? " — belum ada data" : ""}
                            </option>
                          </select>
                        </div>
                        {cfg.pricingMode === "HSPK" && (
                          <div className="cat-field">
                            <span className="cat-field-label">Grade {cat.name}</span>
                            <select
                              className="cat-select"
                              value={cfg.grade}
                              onChange={(e) => setCategoryGrade(cat.id, e.target.value)}
                            >
                              <option value="" disabled>
                                -- pilih grade --
                              </option>
                              {grades.map((g) => (
                                <option key={g} value={g}>
                                  Grade {g}
                                </option>
                              ))}
                            </select>
                            {grades.length === 0 && selectedPeriod && (
                              <small className="cat-hint">
                                Belum ada upload HSPK {isLegacy ? cat.code : cat.name}{" "}
                                untuk periode {selectedPeriod}.
                              </small>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
