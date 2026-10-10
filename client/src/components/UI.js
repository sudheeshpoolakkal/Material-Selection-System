import React, { useEffect, useRef, useId } from "react";
import Icon from "./Icon";
import { evidenceLabel, propertyValue, materialProperties } from "./materialProperties";
import { createPortal } from "react-dom";
export function Modal({ title, subtitle, children, onClose, wide = false }) {
  const ref = useRef();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const before = document.activeElement;
    const shell = document.querySelector(".app-shell");
    if (shell) shell.inert = true;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const handler = (e) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const els = [
          ...ref.current.querySelectorAll(
            'button,a,input,select,textarea,[tabindex="0"]',
          ),
        ].filter((el) => !el.disabled && el.getClientRects().length);
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = old;
      if (shell) shell.inert = false;
      document.removeEventListener("keydown", handler);
      before?.focus();
    };
  }, []);
  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <header className="modal-header">
          <div>
            
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <Icon name="close" />
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}
export function Empty({ title, description, children }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name="layers" size={28} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function ErrorMessage({ message }) {
  return message ? (
    <div className="error-message" role="alert">
      <Icon name="info" />
      {message}
    </div>
  ) : null;
}
export function Swatch({ material, large = false }) {
  return (
    <div className={`record-swatch ${large ? "record-swatch-large" : ""}`}>
      <span>{material.category}</span>
      <strong>{material.metadata?.registrySlug ? shortName(material.name) : material.externalId || shortName(material.name)}</strong>
      <span>{evidenceLabel(material.dataKind)}</span>
    </div>
  );
}
export function Field({label,unit,children,hint}) {
 const id=useId();
 const attach=child=>{
  if(!React.isValidElement(child)) return child;
  if(['input','select','textarea'].includes(child.type)) return React.cloneElement(child,{id,'aria-describedby':hint?id+'-hint':undefined});
  if(child.props.children) return React.cloneElement(child,{},React.Children.map(child.props.children,attach));
  return child;
 };
 return <div className="field"><label htmlFor={id}>{label}{unit&&<small aria-hidden="true">{unit}</small>}</label>{React.Children.map(children,attach)}{hint&&<small id={id+'-hint'} className="field-hint">{hint}</small>}</div>;
}
export function exportCSV(materials, filename = "starbase-selection.csv") {
  const fields = [
    "Material",
    "Family",
    "Density (g/cm3)",
    "Tensile screening value (MPa)",
    "Conductivity (W/mK)",
    "Service ceiling (C)",
    "Corrosion",
    "Relative cost",
    "Preference score",
    "Estimated mass (kg)",
    "Bulk modulus (GPa)", "Shear modulus (GPa)", "Yield strength (MPa)", "Young modulus (GPa)", "Test temperature (C)",
    "Evidence type", "Density evidence", "Source record ID", "Source", "Source URL", "License", "Source version",
    "Tensile source range/minimum (MPa)", "Tensile evidence", "Product form", "Standard", "Specific heat (J/kgK)", "Thermal expansion (um/mK)", "Electrical resistivity (uohm m)", "Elongation A5 (%)", "Elongation A80 (%)", "Magnetizable", "Screening note",
    "Registry designations", "Elastic modulus unspecified method (GPa)", "Elongation unspecified gauge (%)", "Melting point (C)", "Brinell (HB)", "Rockwell C (HRC)", "Rockwell B (HRB)", "Rockwell R (HRR)", "Rockwell M (HRM)", "Shore A", "Shore 00", "Vickers (HV)", "Electrical conductivity (% IACS)",
    ...materialProperties.slice(30).map(p => `${p.label} (${p.unit})`),
  ];
  const escape = (v) => {
    let text = String(v ?? "");
    if (typeof v === "string" && /^[=+@\-\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const lines = materials.map((m) =>
    [
      m.name,
      m.category,
      m.properties.density,
      m.properties.tensileStrength,
      m.properties.thermalConductivity,
      m.properties.maxServiceTemp,
      m.properties.corrosionResistance,
      m.properties.cost,
      m.score,
      m.estimatedMass,
      m.properties.bulkModulus, m.properties.shearModulus, m.properties.yieldStrength, m.properties.youngModulus, m.properties.testTemperature,
      m.dataKind, m.metadata?.propertyBasis?.density, m.externalId, m.source, m.sourceUrl, m.license, m.sourceVersion,
      propertyValue(m, "tensileStrength"), m.metadata?.propertyBasis?.tensileStrength, m.metadata?.productForm, m.metadata?.standard, m.properties.specificHeat, m.properties.thermalExpansion, m.properties.electricalResistivity, m.properties.elongation, m.properties.elongationA80, m.properties.magnetizable, m.metadata?.screeningNote,
      (m.metadata?.standards || []).map(s => `${s.standard} ${s.code}`).join("; "), m.properties.elasticModulus, m.properties.elongationUnspecified, m.properties.meltingPoint, m.properties.hardnessBrinell, m.properties.hardnessRockwellC, m.properties.hardnessRockwellB, m.properties.hardnessRockwellR, m.properties.hardnessRockwellM, m.properties.hardnessShoreA, m.properties.hardnessShore00, m.properties.hardnessVickers, m.properties.electricalConductivityIACS,
      ...materialProperties.slice(30).map(p => m.properties[p.key]),
    ]
      .map(escape)
      .join(","),
  );
  const url = URL.createObjectURL(
    new Blob(
      ["\uFEFF" + [fields.map(escape).join(","), ...lines].join("\r\n")],
      { type: "text/csv;charset=utf-8;" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
export const shortName = (name) =>
  name
    .replace("Carbon Fiber Reinforced Polymer (CFRP)", "Carbon fiber composite")
    .replace(" (Polyetheretherketone)", "")
    .replace("Titanium Ti-6Al-4V (Grade 5)", "Titanium Ti-6Al-4V");
