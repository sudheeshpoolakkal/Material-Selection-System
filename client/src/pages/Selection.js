import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useWorkspace, defaults } from "../context/WorkspaceContext";
import { AuthContext } from "../context/AuthContext";
import Icon from "../components/Icon";
import {
  Field,
  Empty,
  ErrorMessage,
  shortName,
  exportCSV,
  Modal,
} from "../components/UI";
import MaterialDetail from "../components/MaterialDetail";
import { materialProperties, propertyValue, evidenceLabel } from "../components/materialProperties";
const templates = [
  ["Vacuum outgassing", { category: "Spacecraft materials", dataKind: "experimental", maxTotalMassLoss: 1, maxCVCM: 0.1, weights: { strength: 0, lightness: 0, cost: 0, thermal: 0, stiffness: 0, vacuum: 100 } }],
  ["Computed crystal stiffness", { category: "Crystalline", dataKind: "computed", minBulkModulus: 100, weights: { strength: 0, lightness: 0, cost: 0, thermal: 0, stiffness: 100 } }],
  [
    "Lightweight structure",
    {
      minTensileStrength: 250,
      maxDensity: 4.6,
      weights: { strength: 35, lightness: 50, cost: 15, thermal: 0 },
    },
  ],
  [
    "Heat management",
    {
      minThermalConductivity: 100,
      weights: { strength: 0, lightness: 15, cost: 25, thermal: 60 },
    },
  ],
  [
    "Corrosive environment",
    {
      corrosionResistance: "Excellent",
      weights: { strength: 30, lightness: 20, cost: 50, thermal: 0 },
    },
  ],
];
function TradeoffChart({ materials: candidates, onSelect }) {
  const materials = candidates.filter(m => Number.isFinite(m.properties.density) && Number.isFinite(m.properties.tensileStrength));
  if (!materials.length) return <p className="source-note">The strength–density chart needs both reported properties. These records can still be inspected and compared using their available properties.</p>;
  const maxX = Math.max(...materials.map((m) => m.properties.density), 3),
    maxY = Math.max(
      ...materials.map((m) => m.properties.tensileStrength),
      1000,
    );
  const colors = {
    Metal: "#64796c",
    Polymer: "#b59770",
    Ceramic: "#ac827b",
    Composite: "#373f4a",
    Elastomer: "#9a885d",
  };
  return (
    <div className="tradeoff-chart">
      <div className="chart-heading">
        <div>
          <span className="eyebrow">THE TRADE-OFF MAP</span>
          <h3>Strength vs. density</h3>
        </div>
        <span>Click a material to inspect</span>
      </div>
      <svg
        viewBox="0 0 620 205"
        role="group"
        aria-label="Scatter plot of tensile strength against density"
      >
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <line
              x1="56"
              x2="597"
              y1={150 - i * 40}
              y2={150 - i * 40}
              stroke="#e9e8e2"
              strokeDasharray="3 4"
            />
            <text
              x="46"
              y={154 - i * 40}
              textAnchor="end"
              fill="#8a8b83"
              fontSize="10"
            >
              {Math.round((maxY * i) / 3)}
            </text>
          </g>
        ))}
        <text
          x="14"
          y="98"
          transform="rotate(-90 14 98)"
          fontSize="10"
          fill="#777b71"
        >
          Tensile strength (MPa)
        </text>
        <line x1="56" y1="151" x2="597" y2="151" stroke="#cfd3c9" />
        {[0, 1, 2, 3, 4].map((i) => (
          <text
            key={i}
            x={56 + i * 135}
            y="169"
            textAnchor="middle"
            fill="#8a8b83"
            fontSize="10"
          >
            {((maxX * i) / 4).toFixed(1)}
          </text>
        ))}
        <text x="327" y="194" textAnchor="middle" fontSize="10" fill="#777b71">
          Density (g/cm³) →
        </text>
        {materials.map((m) => (
          <g
            key={m.id}
            tabIndex="0"
            role="button"
            aria-label={`Inspect ${m.name} on chart`}
            onClick={() => onSelect(m)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(m);
              }
            }}
            className="chart-dot"
          >
            <circle
              cx={56 + (m.properties.density / maxX) * 540}
              cy={150 - (m.properties.tensileStrength / maxY) * 120}
              r="6"
              fill={colors[m.category]}
              stroke="white"
              strokeWidth="2"
            />
            <title>
              {m.name}: {m.properties.tensileStrength} MPa,{" "}
              {m.properties.density} g/cm³
            </title>
          </g>
        ))}
      </svg>
      <div className="chart-legend">
        {Object.entries(colors).map(([k, c]) => (
          <span key={k}>
            <i style={{ background: c }} />
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}
export default function Selection() {
  const {
    catalogSummary,
    requirements: r,
    setRequirements,
    setNotice,
    compareIds,
    toggleCompare,
  } = useWorkspace();
  const { token } = useContext(AuthContext);
  const [params, setParams] = useSearchParams();
  const projectId = params.get("project");
  const [project, setProject] = useState(null),
    [result, setResult] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [detail, setDetail] = useState(null),
    [method, setMethod] = useState(false),
    [saveModal, setSaveModal] = useState(false),
    [projects, setProjects] = useState([]),
    [chosen, setChosen] = useState("");
  const navigate = useNavigate();
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const apps = catalogSummary.applications;
  useEffect(() => {
    if (!projectId || !token) {
      setProject(null);
      return;
    }
    let active = true;
    Promise.all([
      axios.get(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(`/api/projects/${projectId}/selection`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(([p, s]) => {
        if (!active) return;
        setProject(p.data);
        const saved = {
          ...defaults,
          ...s.data.requirements,
          weights: { ...defaults.weights, ...s.data.requirements.weights },
        };
        setRequirements(saved);
        if (Object.keys(s.data.requirements).length)
          axios
            .post("/api/materials/recommend", saved)
            .then(({ data }) => {
              if (active) setResult(data);
            })
            .catch(() => {
              if (active) setError("Could not evaluate saved requirements.");
            });
      })
      .catch(() => {
        if (active)
          setError(
            "Unable to open this project. Check your access permissions.",
          );
      });
    return () => {
      active = false;
    };
  }, [projectId, token, setRequirements]);
  useEffect(() => {
    setResult(null);
  }, [r]);
  function update(key, val) {
    setRequirements((prev) => ({ ...prev, [key]: val }));
  }
  async function run(e) {
    e?.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data } = await axios.post("/api/materials/recommend", r);
      setResult(data);
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "Could not run the selection. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function openSave() {
    if (!token) {
      navigate(
        "/login?next=" +
          encodeURIComponent(
            "/selection" + (projectId ? "?project=" + projectId : ""),
          ),
      );
      return;
    }
    if (projectId) {
      await save(projectId);
      return;
    }
    try {
      const { data } = await axios.get("/api/projects", auth);
      setProjects(
        data.filter((p) => ["owner", "write", "admin"].includes(p.user_role)),
      );
      setChosen("");
      setSaveModal(true);
    } catch {
      setError("Could not load your projects.");
    }
  }
  async function save(id) {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      await axios.put(
        `/api/projects/${id}/selection`,
        { requirements: r },
        auth,
      );
      setNotice("Requirements and ranked candidates saved to your project.");
      setSaveModal(false);
      if (!projectId) setParams({ project: id });
    } catch (e) {
      setError(e.response?.data?.message || "Could not save selection.");
    } finally {
      setBusy(false);
    }
  }
  const numeric = (key, label, unit, hint) => (
    <Field label={label} unit={unit} hint={hint}>
      <input
        type="number"
        step="any"
        min={key === "minServiceTemp" ? -273.15 : 0}
        value={r[key]}
        placeholder="No limit"
        onChange={(e) => update(key, e.target.value)}
      />
    </Field>
  );
  return (
    <div className="page selection-page">
      <div className="page-heading">
        <div>
          
          <h1>
            Selection studio<span className="heading-period">.</span>
          </h1>
          <p>Set requirements and compare the candidates that meet them.</p>
        </div>
        <button
          className="button button-secondary"
          onClick={() => setMethod(true)}
        >
          <Icon name="info" />
          How ranking works
        </button>
      </div>
      {project && (
        <div className="project-banner">
          <Icon name="projects" />
          <div>
            <strong>{project.name}</strong>
            <span>
              Project selection ·{" "}
              {project.can_write ? "Editable" : "Read-only project"}
            </span>
          </div>
          <Link to="/dashboard">
            Back to projects
            <Icon name="arrow" size={16} />
          </Link>
        </div>
      )}
      <div className="selection-layout">
        <form className="requirements-panel" onSubmit={run}>
          <div className="panel-title">
            <Icon name="sliders" />
            <h2>Design requirements</h2>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setRequirements(defaults);
                setError("");
              }}
            >
              Reset
            </button>
          </div>
          <div className="requirement-section">
            <span className="eyebrow">Application</span>
            <Field label="Intended application">
              <select
                value={r.application}
                onChange={(e) => update("application", e.target.value)}
              >
                <option value="">Any application</option>
                {apps.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </Field>
            <Field label="Material family">
              <select
                value={r.category}
                onChange={(e) => update("category", e.target.value)}
              >
                <option value="">All families</option>
                {catalogSummary.categories.map(c => c.name).map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </Field>
            <Field label="Evidence type"><select value={r.dataKind || ""} onChange={e => update("dataKind", e.target.value)}><option value="">All evidence types</option><option value="literature-extracted">Supplier / reference</option><option value="experimental">Experimental</option><option value="computed">Computed</option></select></Field>
          </div>
          <div className="requirement-section">
            <span className="eyebrow">Performance limits</span>
            {numeric("minTensileStrength", "Minimum tensile strength", "MPa")}
            {numeric("maxTotalMassLoss", "Maximum total mass loss", "%", "NASA ASTM E595 sample and cure conditions apply.")}
            {numeric("maxCVCM", "Maximum vacuum condensables", "%")}
            {numeric("minBulkModulus", "Minimum bulk modulus", "GPa", "Stiffness from the NIST computed dataset; not tensile strength.")}
            {numeric("maxDensity", "Maximum density", "g/cm³")}
            {numeric(
              "minServiceTemp",
              "Required service ceiling",
              "°C",
              "Screens the catalog temperature ceiling only.",
            )}
            {numeric("minThermalConductivity", "Minimum conductivity", "W/m·K")}
            <Field label="Minimum corrosion resistance">
              <select
                value={r.corrosionResistance}
                onChange={(e) => update("corrosionResistance", e.target.value)}
              >
                <option value="">No requirement</option>
                {["Poor", "Moderate", "Good", "Excellent"].map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="requirement-section">
            <span className="eyebrow">Mass & cost</span>
            {numeric("volume", "Component volume", "cm³")}
            {numeric(
              "maxWeight",
              "Maximum component mass",
              "kg",
              "Mass = density × volume. Volume is required.",
            )}
            <Field
              label="Maximum relative cost"
              hint="Cost tiers are relative, not supplier prices."
            >
              <select
                value={r.maxCost}
                onChange={(e) => update("maxCost", e.target.value)}
              >
                <option value="">Any cost tier</option>
                {["Low", "Moderate", "High", "Very High"].map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </Field>
            <Field
              label="Required manufacturing route"
              hint="Process compatibility is absent from this dataset. A required route excludes unverified candidates."
            >
              <select
                value={r.process}
                onChange={(e) => update("process", e.target.value)}
              >
                <option value="">Not constrained</option>
                {[
                  "CNC machining",
                  "Casting",
                  "Injection molding",
                  "Additive manufacturing",
                  "Composite lay-up",
                  "Sintering",
                ].map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="requirement-section priorities">
            <span className="eyebrow">Priorities</span>
            <p>Adjust the balance. Weights are normalized automatically.</p>
            {[
              ["strength", "Strength"],
              ["lightness", "Low weight"],
              ["cost", "Affordability"],
              ["thermal", "Heat conduction"],
              ["stiffness", "Bulk stiffness"],
              ["vacuum", "Low vacuum condensables"],
            ].map(([key, label]) => (
              <label key={key} className="priority">
                <span>
                  {label}
                  <strong>{r.weights[key]}</strong>
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={r.weights[key]}
                  aria-label={`${label} priority`}
                  onChange={(e) =>
                    setRequirements((prev) => ({
                      ...prev,
                      weights: {
                        ...prev.weights,
                        [key]: Number(e.target.value),
                      },
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="requirements-action">
            <button
              className="button"
              disabled={busy || !catalogSummary.total}
              type="submit"
            >
              {busy ? "Evaluating…" : "Find suitable materials"}
              <Icon name="arrow" />
            </button>
          </div>
        </form>
        <div className="selection-results">
          <ErrorMessage message={error} />
          {!result ? (
            <>
              <div className="studio-intro">
                <h2>Find materials that fit.</h2>
                <p>Choose your requirements and set your priorities. Run a selection to see candidates, compare their properties, and understand the ranking.</p>
              </div>
              <div className="template-section">
                
                <h3>Start with a scenario</h3>
                {templates.map(([title, values], i) => (
                  <button
                    key={title}
                    className="template-row"
                    onClick={() => {
                      setRequirements({ ...defaults, ...values });
                      setNotice(
                        "Scenario loaded. Adjust the requirements, then run your selection.",
                      );
                    }}
                  >
                    <span className="template-number">0{i + 1}</span>
                    <span>
                      {title}
                      <small>
                        {i === 0 ? "Explore NIST computed elastic moduli" : i === 1 ? "Balance strength and mass" : i === 2 ? "Requires reported conductivity" : "Requires reported corrosion data"}
                      </small>
                    </span>
                    <Icon name="arrowUp" />
                  </button>
                ))}
              </div>
              <div className="source-note">
                <Icon name="info" />
                <p>
                  Selection supports early design screening. Properties come from cited source records; fatigue, safety factors, exact
                  processing conditions, and supplier certification require
                  further verification.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="results-heading">
                <div>
                  <span className="eyebrow">YOUR MATERIAL SHORTLIST</span>
                  <h2>
                    {result.count} suitable material
                    {result.count !== 1 ? "s" : ""}
                    <span className="heading-count">
                      {result.total} screened
                    </span>
                  </h2>
                  <p>
                    Showing the top {result.materials.length} of {result.count.toLocaleString()} matches. Missing weighted properties contribute zero; inspect each record’s evidence type and test conditions.
                  </p>
                </div>
                <div className="results-actions">
                  <button
                    className="icon-button"
                    aria-label="Export selection as CSV"
                    disabled={!result.count}
                    onClick={() => exportCSV(result.materials)}
                  >
                    <Icon name="download" />
                  </button>
                  <button
                    className="button button-sm"
                    disabled={busy || project?.can_write === false}
                    onClick={openSave}
                  >
                    <Icon name="save" size={15} />
                    {token ? "Save to project" : "Sign in to save"}
                  </button>
                </div>
              </div>
              {result.count > 0 ? (
                <>
                  <TradeoffChart
                    materials={result.materials}
                    onSelect={setDetail}
                  />
                  <div className="ranking-labels">
                    <span>RANK / MATERIAL</span>
                    <span>PREFERENCE SCORE</span>
                  </div>
                  {result.materials.map((m) => (
                    <article
                      key={m.id}
                      className={`result-card ${m.rank === 1 ? "result-best" : ""}`}
                    >
                      <div className="result-card-top">
                        <span className="rank-number">
                          {String(m.rank).padStart(2, "0")}
                        </span>
                        <div className="result-name">
                          <div>
                            <span
                              className={`family-badge badge-${m.category.toLowerCase()}`}
                            >
                              {m.category}
                            </span>
                            {m.rank === 1 && (
                              <span className="best-badge">
                                Highest preference score
                              </span>
                            )}
                          </div>
                          <button
                            className="material-title"
                            onClick={() => setDetail(m)}
                          >
                            {shortName(m.name)}
                            <Icon name="arrowUp" size={16} />
                          </button>
                        </div>
                        <div className="result-score">
                          <strong>{m.score.toFixed(1)}</strong>
                          <span>/ 100</span>
                        </div>
                      </div>
                      <div className="result-properties">
                        {[
                          ...["density", "tensileStrength", "thermalConductivity", "bulkModulus", "youngModulus"]
                            .filter(key => m.properties[key] != null).slice(0, 3)
                            .map(key => { const p = materialProperties.find(p => p.key === key); return [p.label, propertyValue(m, key), p.unit]; }),
                          ...(m.estimatedMass != null ? [["Estimated mass", m.estimatedMass, "kg"]] : []),
                        ].map(([k, v, u]) => (
                          <div key={k}>
                            <span>{k}</span>
                            <strong>
                              {v ?? "Not reported"}
                              <small>{v != null ? u : ""}</small>
                            </strong>
                          </div>
                        ))}
                      </div>
                      <p className="muted small" style={{padding: "0 22px"}}>{evidenceLabel(m.dataKind)} · {m.source}{m.missingPriorities?.length > 0 ? ` · Missing priority data: ${m.missingPriorities.join(", ")}` : ""}</p>
                      <div className="result-bottom">
                        <span>
                          <Icon name="check" size={14} />
                          {m.reasons.length
                            ? `${m.reasons.length} property constraints satisfied`
                            : "Ranked by your weighted priorities"}
                        </span>
                        <button
                          className="compare-button"
                          onClick={() => toggleCompare(m.id)}
                          aria-label={`Compare ${m.name}`}
                        >
                          <Icon
                            name={compareIds.includes(m.id) ? "check" : "plus"}
                            size={14}
                          />
                          {compareIds.includes(m.id) ? "Added" : "Compare"}
                        </button>
                      </div>
                    </article>
                  ))}
                </>
              ) : (
                <Empty
                  title="No materials meet these limits"
                  description={
                    r.process
                      ? "This catalog has no manufacturing compatibility data. Remove the process constraint to evaluate other properties."
                      : "Try relaxing a limit or selecting a broader application. Your requirements have been kept."
                  }
                >
                  <button
                    className="button button-secondary"
                    onClick={() => setRequirements(defaults)}
                  >
                    Reset requirements
                  </button>
                </Empty>
              )}
              <details className="exclusion-details">
                <summary>
                  {(result.excludedCount ?? result.excluded.length).toLocaleString()} excluded material
                  {(result.excludedCount ?? result.excluded.length) !== 1 ? "s" : ""}
                  <span>Inspect up to 100 exclusion examples</span>
                </summary>
                {result.excluded.map((m) => (
                  <div key={m.id}>
                    <strong>{shortName(m.name)}</strong>
                    <p>{m.reasons.join(" · ")}</p>
                  </div>
                ))}
              </details>
            </>
          )}
        </div>
      </div>
      {compareIds.length > 0 && (
        <Link className="floating-compare button" to="/compare">
          <Icon name="compare" />
          Compare {compareIds.length} materials
          <Icon name="arrow" />
        </Link>
      )}
      {detail && (
        <MaterialDetail material={detail} onClose={() => setDetail(null)} />
      )}{" "}
      {method && (
        <Modal
          title="A score you can understand"
          onClose={() => setMethod(false)}
        >
          <div className="modal-body prose">
            <p>
              First, hard constraints remove materials whose catalog values fall
              outside your limits. Missing required data also excludes a
              candidate.
            </p>
            <p>
              Remaining materials are scored against the{" "}
              <strong>full reference catalog</strong> using min–max
              normalization. Strength and conductivity favor larger values;
              density and relative cost favor smaller values.
            </p>
            <div className="formula">
              score = Σ (normalized property × normalized priority) × 100
            </div>
            <p>
              Priorities are relative and automatically normalized to sum to
              one. Cost tiers map to an ordinal scale: Low = 1, Moderate = 2,
              High = 3, Very High = 4.
            </p>
            <p>
              The score expresses your preferences; it is not a probability,
              structural safety result, or certification. Open any result to see
              the contribution of every priority.
            </p>
          </div>
        </Modal>
      )}
      {saveModal && (
        <Modal
          title="Save your selection"
          subtitle="Store these requirements and ranked results in a project."
          onClose={() => setSaveModal(false)}
        >
          <div className="modal-body">
            {projects.length ? (
              <>
                <Field label="Project">
                  <select
                    value={chosen}
                    onChange={(e) => setChosen(e.target.value)}
                  >
                    <option value="">Choose a project</option>
                    {projects.map((p) => (
                      <option key={p.project_id} value={p.project_id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <button
                  className="button full-width"
                  disabled={!chosen || busy}
                  onClick={() => save(chosen)}
                >
                  Save selection
                  <Icon name="save" />
                </button>
              </>
            ) : (
              <Empty
                title="Create a project first"
                description="Your current requirements will stay in this browser."
              >
                <Link className="button" to="/dashboard">
                  Go to projects
                  <Icon name="arrow" />
                </Link>
              </Empty>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
