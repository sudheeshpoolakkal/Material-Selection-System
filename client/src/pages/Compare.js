import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";
import {
  Empty,
  Swatch,
  shortName,
  exportCSV,
  ErrorMessage,
} from "../components/UI";
import Icon from "../components/Icon";
import MaterialDetail from "../components/MaterialDetail";
import { propertyValue, materialProperties } from "../components/materialProperties";
const rows = [
  ["Density", "density", "g/cm³", "min"],
  ["Tensile strength", "tensileStrength", "MPa", "max"],
  ["Bulk modulus (computed)", "bulkModulus", "GPa", "max"],
  ["Shear modulus (computed)", "shearModulus", "GPa", "max"],
  ["Yield strength", "yieldStrength", "MPa", "max"],
  ["Young’s modulus", "youngModulus", "GPa", "max"],
  ["Specific strength", "specificStrength", "kN·m/kg", "max"],
  ["Thermal conductivity", "thermalConductivity", "W/m·K", "max"],
  ["Service ceiling", "maxServiceTemp", "°C", "max"],
  ["Corrosion resistance", "corrosionResistance", "", ""],
  ["Relative cost", "cost", "", ""],
  ["Specific heat capacity", "specificHeat", "J/kg·K", ""],
  ["Thermal expansion (20–100 °C)", "thermalExpansion", "µm/m·K", ""],
  ["Electrical resistivity", "electricalResistivity", "µΩ·m", ""],
  ["Elongation (A5)", "elongation", "%", ""],
  ["Elongation (A80)", "elongationA80", "%", ""],
  ["Magnetizable", "magnetizable", "", ""],
  ["Elastic modulus (method unspecified)", "elasticModulus", "GPa", ""],
  ["Elongation (gauge unspecified)", "elongationUnspecified", "%", ""],
  ["Melting point", "meltingPoint", "°C", ""],
  ["Brinell hardness", "hardnessBrinell", "HB", ""],
  ["Rockwell C hardness", "hardnessRockwellC", "HRC", ""],
  ["Rockwell B hardness", "hardnessRockwellB", "HRB", ""],
  ["Rockwell R hardness", "hardnessRockwellR", "HRR", ""],
  ["Rockwell M hardness", "hardnessRockwellM", "HRM", ""],
  ["Shore A hardness", "hardnessShoreA", "Shore A", ""],
  ["Shore 00 hardness", "hardnessShore00", "Shore 00", ""],
  ["Vickers hardness", "hardnessVickers", "HV", ""],
  ["Electrical conductivity", "electricalConductivityIACS", "% IACS", ""],
  ...materialProperties.slice(30).map(p => [p.label, p.key, p.unit, ""]),
];
export default function Compare() {
  const { materials, compareIds, setCompareIds, error, compareError, compareLoading } = useWorkspace();
  const [detail, setDetail] = useState(null);
  const selected = compareIds
    .map((id) => materials.find((m) => m.id === id))
    .filter(Boolean);
  return (
    <div className="page compare-page">
      <div className="page-heading">
        <div>
          
          <h1>
            Compare materials<span className="heading-period">.</span>
          </h1>
          <p>
            Compare properties for up to four materials.
          </p>
        </div>
        {selected.length > 0 && (
          <button
            className="button button-secondary"
            onClick={() => exportCSV(selected, "starbase-comparison.csv")}
          >
            <Icon name="download" />
            Export comparison
          </button>
        )}
      </div>
      <ErrorMessage message={error || compareError} />
      {compareLoading && <p role="status">Loading selected database records…</p>}
      {selected.length ? (
        <>
          <div className="comparison-scroll">
            <div
              className="comparison-grid"
              style={{
                gridTemplateColumns: `190px repeat(${selected.length}, minmax(205px, 1fr))`,
              }}
            >
              <div className="comparison-label comparison-intro">
                <span className="eyebrow">THE SHORTLIST</span>
                <h3>
                  {selected.length} materials
                  <br />
                  
                </h3>
                <p>
                  Highlights show the lowest density and the highest values in
                  the other numeric rows. Their usefulness depends on your
                  design.
                </p>
                <button
                  className="text-button"
                  onClick={() => setCompareIds([])}
                >
                  Clear comparison
                  <Icon name="close" size={14} />
                </button>
              </div>
              {selected.map((m) => (
                <div className="comparison-material" key={m.id}>
                  <button
                    className="remove-material icon-button"
                    aria-label={`Remove ${m.name} from comparison`}
                    onClick={() =>
                      setCompareIds((prev) => prev.filter((id) => id !== m.id))
                    }
                  >
                    <Icon name="close" size={15} />
                  </button>
                  <Swatch material={m} />
                  <span
                    className={`family-badge badge-${m.category.toLowerCase()}`}
                  >
                    {m.category}
                  </span>
                  <button
                    className="material-title"
                    onClick={() => setDetail(m)}
                  >
                    {shortName(m.name)}
                    <Icon name="arrowUp" size={14} />
                  </button>
                </div>
              ))}
              {rows.filter(([, key]) => selected.some(m => m.properties[key] != null)).map(([label, key, unit, direction]) => {
                const best = direction
                  ? (direction === "min" ? Math.min : Math.max)(
                      ...selected.map((m) => m.properties[key]).filter(Number.isFinite),
                    )
                  : null;
                return (
                  <React.Fragment key={key}>
                    <div className="comparison-label">
                      <strong>{label}</strong>
                      <small>{unit || "Qualitative reference"}</small>
                    </div>
                    {selected.map((m) => (
                      <div
                        key={m.id}
                        className={`comparison-value ${selected.length > 1 && m.properties[key] === best ? "preferred" : ""}`}
                      >
                        <strong>{propertyValue(m, key) ?? "Not reported"}</strong>
                        {selected.length > 1 && m.properties[key] === best && (
                          <span className="value-indicator">
                            <Icon name="check" size={12} />
                            {direction === "min" ? "Lowest" : "Highest"}
                          </span>
                        )}
                      </div>
                    ))}
                  </React.Fragment>
                );
              })}
              <div className="comparison-label"><strong>Product form</strong></div>
              {selected.map(m => <div className="comparison-value" key={m.id}>{m.metadata?.productForm || "Not reported"}</div>)}
              <div className="comparison-label"><strong>Reference conditions</strong></div>
              {selected.map(m => <div className="comparison-value" key={m.id}>{m.metadata?.standard || m.metadata?.processing || "See source record"}{m.properties.testTemperature != null && ` · ${m.properties.testTemperature} °C`}</div>)}
              {selected.some(m => m.metadata?.standards?.length) && <><div className="comparison-label"><strong>Grade designations</strong></div>{selected.map(m => <div className="comparison-value" key={m.id}>{(m.metadata?.standards || []).map(s => `${s.standard} ${s.code}`).join(" · ") || "Not supplied"}</div>)}</>}
              <div className="comparison-label">
                <strong>Manufacturing routes</strong>
                <small>Evidence supplied</small>
              </div>
              {selected.map((m) => (
                <div className="comparison-value muted" key={m.id}>
                  Not documented
                </div>
              ))}
              <div className="comparison-label">
                <strong>Applications</strong>
                <small>Listed in reference catalog</small>
              </div>
              {selected.map((m) => (
                <div className="comparison-apps" key={m.id}>
                  {m.applications.map((a) => (
                    <span key={a}>{a}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="compare-footer">
            <p>
              <Icon name="info" size={16} />A highlighted value is a comparison
              aid. Range comparisons use the lower published bound. Physical reference values retain their source temperatures. It does not establish suitability for your application.
            </p>
            <Link className="button button-secondary" to="/materials">
              <Icon name="plus" />
              Add another material
            </Link>
          </div>
        </>
      ) : (
        <Empty
          title="The best decisions start with a comparison."
          description="Choose materials from the library or your selection results, then examine their properties here."
        >
          <Link className="button" to="/materials">
            Explore material library
            <Icon name="arrow" />
          </Link>
        </Empty>
      )}
      {detail && (
        <MaterialDetail material={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}
