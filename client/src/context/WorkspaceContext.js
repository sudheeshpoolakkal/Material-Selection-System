import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";
export const WorkspaceContext = createContext();
export const useWorkspace = () => useContext(WorkspaceContext);
export const defaults = {
  application: "",
  category: "",
  minTensileStrength: "",
  maxDensity: "",
  minServiceTemp: "",
  minThermalConductivity: "",
  corrosionResistance: "",
  maxCost: "",
  process: "",
  volume: "",
  maxWeight: "",
  weights: { strength: 35, lightness: 40, cost: 25, thermal: 0, stiffness: 0, vacuum: 0 },
  minBulkModulus: "",
  maxTotalMassLoss: "",
  maxCVCM: "",
  dataKind: "literature-extracted",
};
const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? localStorage.getItem(key.replace("starbase.", "materia."))) ?? fallback;
  } catch {
    return fallback;
  }
};
export function WorkspaceProvider({ children }) {
  const [materials, setMaterials] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [catalogSummary, setCatalogSummary] = useState({ total: 0, categories: [], applications: [], sources: [], coverage: [] });
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState("");
  const [compareIds, setCompareIds] = useState(() => {
    const value = read("starbase.compare", []);
    return Array.isArray(value)
      ? value.filter(Number.isInteger).slice(0, 4)
      : [];
  });
  const [requirements, setRequirements] = useState(() => {
    const saved = read("starbase.requirements", null);
    return saved && typeof saved === "object" && !Array.isArray(saved)
      ? {
          ...defaults,
          ...saved,
          weights: { ...defaults.weights, ...saved.weights },
        }
      : defaults;
  });
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get("/api/materials/summary");
      if (data && typeof data === "object" && Array.isArray(data.categories)) {
        setCatalogSummary({
          total: Number(data.total) || 0,
          categories: Array.isArray(data.categories) ? data.categories : [],
          applications: Array.isArray(data.applications) ? data.applications : [],
          sources: Array.isArray(data.sources) ? data.sources : [],
          coverage: Array.isArray(data.coverage) ? data.coverage : [],
        });
      } else {
        throw new Error("Invalid catalog summary format");
      }
    } catch {
      setCatalogSummary({ total: 0, categories: [], applications: [], sources: [], coverage: [] });
      setError(
        "The material database is unavailable. Check that the API is running, then retry.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    let active = true;
    setCompareLoading(true);
    setCompareError("");
    Promise.all(compareIds.map(id => axios.get(`/api/materials/${id}`)))
      .then(responses => { if (active) setMaterials(responses.map(r => r.data)); })
      .catch(() => { if (active) { setMaterials([]); setCompareError("Could not load the selected database records. A record may no longer be available."); } })
      .finally(() => { if (active) setCompareLoading(false); });
    return () => { active = false; };
  }, [compareIds]);
  useEffect(
    () => { localStorage.setItem("starbase.compare", JSON.stringify(compareIds)); },
    [compareIds],
  );
  useEffect(
    () => { localStorage.setItem("starbase.requirements", JSON.stringify(requirements)); },
    [requirements],
  );
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  function toggleCompare(id) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length === 4) {
        setNotice("Compare up to four materials. Remove one to add another.");
        return prev;
      }
      return [...prev, id];
    });
  }
  return (
    <WorkspaceContext.Provider
      value={{
        materials,
        catalogSummary,
        compareLoading,
        compareError,
        loading,
        error,
        reload: load,
        compareIds,
        setCompareIds,
        toggleCompare,
        requirements,
        setRequirements,
        notice,
        setNotice,
      }}
    >
      {children}
      {notice && (
        <div className="toast" role="status">
          <span className="status-dot" />
          {notice}
        </div>
      )}
    </WorkspaceContext.Provider>
  );
}
