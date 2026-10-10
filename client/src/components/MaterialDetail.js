import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";
import { Modal, Swatch, shortName } from "./UI";
import Icon from "./Icon";
import { materialProperties, reportedProperties, propertyValue, evidenceLabel } from "./materialProperties";
export default function MaterialDetail({ material: m, onClose }) {
  const { compareIds, toggleCompare, setRequirements } = useWorkspace();
  const navigate = useNavigate();
  const close = useCallback(onClose, [onClose]);
  const reported = reportedProperties(m);
  const unavailable = materialProperties.filter(p => !p.derived && m.properties[p.key] == null);
  return (
    <Modal
      title={shortName(m.name)}
      subtitle={`${m.category} / ${evidenceLabel(m.dataKind)} / ${m.metadata?.registrySlug || m.externalId || m.id}`}
      onClose={close}
      wide
    >
      <div className="detail-grid">
        <div>
          <Swatch material={m} large />
          <div className="source-note">
            <Icon name="info" />
            <div>
              <strong>{m.source}</strong>
              <p>{m.sourceNote}</p>
              <p className="source-links"><a href={m.sourceUrl} target="_blank" rel="noreferrer">Open original source record</a><br/><a href={m.datasetUrl} target="_blank" rel="noreferrer">Dataset citation</a></p>
              <p>{m.license}</p>
            </div>
          </div>
        </div>
        <div className="detail-content">
          <p className="detail-description">{m.description}</p>
          {m.metadata?.standards?.length > 0 && <section className="registry-designations">
            <h3 className="detail-section-title">Grade designations</h3>
            <dl>{m.metadata.standards.map(s => <div key={`${s.standard}-${s.code}`}><dt>{s.standard}</dt><dd>{s.code}</dd></div>)}</dl>
          </section>}
          <h3 className="detail-section-title">Reported properties</h3>
          {reported.length ? <dl className="property-list">
            {reported.map(({ key, label, unit, derived }) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>
                  {propertyValue(m, key)}
                  <small>{unit}</small>
                  {(derived || (!m.metadata?.registrySlug && m.metadata?.propertyBasis?.[key])) && <span className="property-basis">{derived ? "derived" : m.metadata.propertyBasis[key]}</span>}
                </dd>
                {(!m.metadata?.registrySlug && (m.metadata?.propertyConditions?.[key] || m.metadata?.propertyCitations?.[key])) && <div className="property-context">
                  {m.metadata?.propertyConditions?.[key] && <span>{m.metadata.propertyConditions[key]}</span>}
                  {m.metadata?.propertyCitations?.[key] && <a href={m.metadata.propertyCitations[key].url} target="_blank" rel="noreferrer">{m.metadata.propertyCitations[key].label || `Table ${m.metadata.propertyCitations[key].table}, page ${m.metadata.propertyCitations[key].page}`}</a>}
                </div>}
              </div>
            ))}
          </dl> : <p>This record contains no values for the catalog’s supported properties.</p>}
          {m.metadata?.screeningNote && !m.metadata?.registrySlug && <p className="record-screening-note">{m.metadata.screeningNote}</p>}
          {m.metadata?.nativeProperties?.length > 0 && <details className="unavailable-properties"><summary>Original source properties and conditions</summary><dl className="property-list">{m.metadata.nativeProperties.map((p,i) => <div key={i}><dt>{p.name}</dt><dd>{p.value} <small>{p.unit}</small></dd><div className="property-context">{p.basis} · STP: {p.stp} · uncertainty: {p.uncertainty || "unspecified"}{p.url && <a href={p.url} target="_blank" rel="noreferrer">Temperature data and original reference</a>}</div></div>)}</dl></details>}
          {m.metadata?.unmappedProperties?.length > 0 && <details className="unavailable-properties"><summary>{m.metadata.unmappedProperties.length} source entries excluded from screening</summary><p>The registry has an undefined or unsupported property type. The original value is retained for review.</p><ul>{m.metadata.unmappedProperties.map((p, i) => <li key={i}>{p.propertyType}: {p.value} {p.unit}</li>)}</ul></details>}
          {unavailable.length > 0 && <details className="unavailable-properties">
            <summary>{unavailable.length} properties unavailable in this record</summary>
            <p>The source does not provide these values for this record and its conditions.</p>
            <ul>{unavailable.map(p => <li key={p.key}>{p.label}</li>)}</ul>
          </details>}
          {(m.metadata?.processing || m.metadata?.testType || m.metadata?.microstructure || m.metadata?.productForm) && <div className="record-conditions">
            <h3 className="detail-section-title">Record conditions</h3>
            <dl className="property-list">
              {m.metadata.productForm && <div><dt>Product form</dt><dd>{m.metadata.productForm}</dd></div>}
              {m.metadata.standard && <div><dt>Standard</dt><dd>{m.metadata.standard}</dd></div>}
              {m.metadata.processing && <div><dt>Processing</dt><dd>{m.metadata.processing}</dd></div>}
              {m.metadata.testType && <div><dt>Test</dt><dd>{m.metadata.testType === "T" ? "Tensile" : m.metadata.testType === "C" ? "Compression" : m.metadata.testType}</dd></div>}
              {m.metadata.microstructure && <div><dt>Microstructure</dt><dd>{m.metadata.microstructure}</dd></div>}
            </dl>
          </div>}
          {m.applications.length > 0 && <>
            <h3 className="detail-section-title">Listed applications</h3>
            <div className="tags">{m.applications.map(a => <span key={a}>{a}</span>)}</div>
          </>}

        </div>
      </div>
      {m.breakdown && (
        <div className="detail-ranking">
          <span className="eyebrow">WHY IT RANKS HERE</span>
          <p>
            Preference score: <strong>{m.score} / 100</strong>
          </p>
          <div className="score-breakdown">
            {Object.entries(m.breakdown).map(([key, v]) => (
              <div key={key}>
                <span>{key}</span>
                <strong>{v.contribution.toFixed(1)} pts</strong>
                <small>
                  {v.missing ? "Property not reported · zero contribution" : `${v.normalizedWeight}% normalized priority · ${v.normalized}% normalized`}
                </small>
              </div>
            ))}
          </div>
          {m.reasons.length > 0 && (
            <div className="tags">
              {m.reasons.map((r) => (
                <span key={r.label}>
                  <Icon name="check" size={13} />
                  {r.label}: {r.value}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <footer className="modal-footer">
        <button
          className="button button-secondary"
          onClick={() => toggleCompare(m.id)}
        >
          <Icon name={compareIds.includes(m.id) ? "check" : "compare"} />
          {compareIds.includes(m.id)
            ? "Added to comparison"
            : "Add to comparison"}
        </button>
        <button
          className="button"
          onClick={() => {
            setRequirements((prev) => ({ ...prev, category: m.category }));
            navigate("/selection");
            onClose();
          }}
        >
          Use family in selection
          <Icon name="arrow" />
        </button>
      </footer>
    </Modal>
  );
}
