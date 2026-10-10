import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";
import Icon from "../components/Icon";
import {
  Empty,
  ErrorMessage,
  shortName,
  exportCSV,
} from "../components/UI";
import MaterialDetail from "../components/MaterialDetail";
import { materialProperties, reportedProperties, propertyValue, evidenceLabel } from "../components/materialProperties";
export default function Materials() {
  const { catalogSummary, error: summaryError, reload, compareIds, toggleCompare } = useWorkspace();
  const [query, setQuery] = useState(""),
    [family, setFamily] = useState(""),
    [sort, setSort] = useState("name"),
    [view, setView] = useState("list"),
    [detail, setDetail] = useState(null),
    [source, setSource] = useState(""),
    [kind, setKind] = useState(""),
    [property, setProperty] = useState(""),
    [collection, setCollection] = useState("all"),
    [page, setPage] = useState(1),
    [result, setResult] = useState({ materials: [], total: 0, pages: 0 }),
    [loading, setLoading] = useState(true),
    [requestError, setRequestError] = useState(""),
    [retry, setRetry] = useState(0);
  const initializedCollection = useRef(false);
  const categories = Array.isArray(catalogSummary?.categories) ? catalogSummary.categories : [];
  const sources = Array.isArray(catalogSummary?.sources) ? catalogSummary.sources : [];
  const coverage = Array.isArray(catalogSummary?.coverage) ? catalogSummary.coverage : [];
  useEffect(() => {
    if (!initializedCollection.current && (catalogSummary?.total || 0) > 0) {
      initializedCollection.current = true;
      if (sources.some(s => s.dataKind === "literature-extracted")) setCollection("engineering");
    }
  }, [catalogSummary, sources]);
  const families = categories.map(c => {
    const count = collection === "engineering" ? Number(c.engineeringCount || 0) : collection === "research" ? Number(c.researchCount ?? c.count) : c.count;
    return [c.name, c.name === "Metal" ? "Metals & alloys" : c.name === "Crystalline" ? "Crystalline materials" : c.name, `${(count || 0).toLocaleString()} source records`, count || 0];
  }).filter(c => c[3] > 0);
  const filtered = Array.isArray(result?.materials) ? result.materials : [];
  const sourceKind = sources.find(s => s.sourceKey === source)?.dataKind;
  const columnKeys = collection === "engineering" || kind === "literature-extracted" || sourceKind === "literature-extracted"
    ? ["density", "tensileStrength", family === "Elastomer" ? "elongationUnspecified" : ["Polymer", "Composite", "Ceramic"].includes(family) ? "elasticModulus" : "yieldStrength"]
    : family === "Metal" || kind === "experimental" || sourceKind === "experimental"
    ? ["density", "yieldStrength", "youngModulus"]
    : family === "Crystalline" || kind === "computed" || sourceKind === "computed"
      ? ["bulkModulus", "shearModulus"]
      : ["density", "tensileStrength", "bulkModulus"];
  const sortProperty = { density: "density", strength: "tensileStrength", bulk: "bulkModulus" }[sort];
  const columns = [...new Set([...[property, sortProperty].filter(Boolean), ...columnKeys])]
    .slice(0, 3).map(key => materialProperties.find(p => p.key === key));
  const error = requestError || summaryError;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setRequestError("");
    const timer = setTimeout(() => {
      axios.get("/api/materials", { params: { q: query, category: family, source, kind, property, collection, sort, page, limit: 24 }, signal: controller.signal })
        .then(({data}) => {
          if (data && Array.isArray(data.materials)) {
            setResult(data);
          } else {
            setResult({ materials: [], total: 0, pages: 0 });
            setRequestError("The material catalog is unavailable. Please try again.");
          }
        })
        .catch(e => {
          if (!axios.isCancel(e)) {
            setResult({ materials: [], total: 0, pages: 0 });
            setRequestError("The material catalog is unavailable. Please try again.");
          }
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, family, source, kind, property, collection, sort, page, retry]);
  function reset() { setFamily(""); setQuery(""); setSource(""); setKind(""); setProperty(""); setPage(1); }
  function retryConnection() { reload(); setRetry(value => value + 1); }
  return (
    <div className="page library-page">
      <div className="page-heading">
        <div><h1>Material library</h1><p>Explore properties. Find candidates for your next design.</p></div>
        <Link to="/selection" className="button">Start a selection <Icon name="arrow" size={18} /></Link>
      </div>
      <div className="collection-tabs" role="group" aria-label="Catalog collection">
        {[["engineering", "Engineering grades"], ["research", "Research data"], ["all", "All records"]].map(([key, label]) => <button key={key} aria-pressed={collection === key} className={collection === key ? "active" : ""} onClick={() => { setCollection(key); setSource(""); setKind(""); setFamily(""); setPage(1); }}>{label}</button>)}
      </div>
      <div className="family-tabs" role="group" aria-label="Material families">
        <button className={!family ? "active" : ""} aria-pressed={!family} onClick={() => { setFamily(""); setPage(1); }}>All materials</button>
        {families.map(([key, title, , count]) => <button key={key} className={family === key ? "active" : ""} aria-pressed={family === key} onClick={() => { setFamily(key); setPage(1); }}>{title}<span>{count.toLocaleString()}</span></button>)}
      </div>
      <section className="catalog-section">
        <div className="section-heading">
          <div>

            <h2>
              {family
                ? families.find((f) => f[0] === family)?.[1] || family
                : collection === "engineering" ? "Engineering grades" : collection === "research" ? "Research data" : "All materials"}
              <span className="heading-count">{result.total.toLocaleString()}</span>
            </h2>
          </div>
          <button
            className="button button-secondary button-sm"
            disabled={!filtered.length}
            onClick={() => exportCSV(filtered, "starbase-catalog.csv")}
          >
            <Icon name="download" size={16} />
            Export page
          </button>
        </div>
        <div className="catalog-toolbar">
          <div className="search-input">
            <Icon name="search" />
            <input
              aria-label="Search materials"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search name, grade code, formula or source ID…"
            />
            {query && (
              <button
                className="icon-button"
                onClick={() => { setQuery(""); setPage(1); }}
                aria-label="Clear search"
              >
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
          <label className="sort-control">
            Sort by
            <select
              aria-label="Sort materials"
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
            >
              <option value="name">Name A–Z</option>
              <option value="density">Lowest density</option>
              <option value="strength">Highest tensile strength</option>
              <option value="bulk">Highest bulk modulus</option>
            </select>
          </label>
          <div className="view-toggle">
            <button
              className={view === "grid" ? "active" : ""}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <Icon name="grid" size={16} />
            </button>
            <button
              className={view === "list" ? "active" : ""}
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <Icon name="list" size={17} />
            </button>
          </div>
        </div>
        <div className="catalog-source-filters">
          <label>Data source<select aria-label="Data source" value={source} onChange={e => { setSource(e.target.value); setPage(1); }}>
            <option value="">All sources in this collection</option>
            {sources.filter(s => collection === "all" || (collection === "engineering" ? s.dataKind === "literature-extracted" : s.dataKind !== "literature-extracted")).map(s => <option key={s.sourceKey} value={s.sourceKey}>{s.name}</option>)}
          </select></label>
          <label>Evidence type<select aria-label="Evidence type" value={kind} onChange={e => { setKind(e.target.value); setPage(1); }}>
            <option value="">All evidence types</option>
            {collection !== "engineering" && <><option value="experimental">Experimental</option><option value="computed">Computed</option></>}
            {collection !== "research" && <option value="literature-extracted">Supplier / reference</option>}
          </select></label>
          <label>Reported property<select aria-label="Reported property" value={property} onChange={e => { setProperty(e.target.value); setPage(1); }}>
            <option value="">Any property</option>
            {coverage.filter(p => p.count > 0).map(p => <option key={p.propertyKey} value={p.propertyKey}>{p.name}</option>)}
          </select></label>
        </div>
        {family && (
          <div className="active-filter">
            <span>{family}</span>
            <button
              onClick={() => { setFamily(""); setPage(1); }}
              aria-label="Clear family filter"
            >
              <Icon name="close" size={12} />
            </button>
            <small>{result.total.toLocaleString()} records in this family</small>
          </div>
        )}
        <ErrorMessage message={error} />
        {error && (
          <button className="button button-secondary" onClick={retryConnection}>
            Retry connection
          </button>
        )}
        {loading ? (
          <div className="material-grid">
            {[1, 2, 3].map((x) => (
              <div key={x} className="skeleton-card" />
            ))}
          </div>
        ) : !error && !filtered.length ? (
          <Empty
            title="No materials found"
            description="Try another search, or reset the filters to see all available materials."
          >
            <button
              className="button button-secondary"
              onClick={reset}
            >
              Reset search
            </button>
          </Empty>
        ) : view === "grid" ? (
          <div className="material-grid">
            {filtered.map((m) => (
              <article className="material-card" key={m.id}>
                <div className="material-card-content">
                  <div className="material-meta">
                    <span
                      className={`family-badge badge-${m.category.toLowerCase()}`}
                    >
                      {m.category}
                    </span>
                    <span className="material-code">
                      MAT-{String(m.id).padStart(3, "0")}
                    </span>
                  </div>
                  <button
                    className="material-title"
                    onClick={() => setDetail(m)}
                  >
                    {shortName(m.name)}
                    <Icon name="arrowUp" size={17} />
                  </button>
                  <p>{m.description}</p>
                  <div className="card-properties">
                    {reportedProperties(m).sort((a, b) => Number(b.key === property) - Number(a.key === property)).slice(0, 2).map(p => <div key={p.key}>
                      <span>{p.label}</span>
                      <strong>{propertyValue(m, p.key)}<small>{p.unit}</small></strong>
                    </div>)}
                  </div>
                  <footer>
                    <span className="reference-label">
                      <span />
                      {evidenceLabel(m.dataKind)}
                    </span>
                    <button
                      className={`compare-button ${compareIds.includes(m.id) ? "selected" : ""}`}
                      onClick={() => toggleCompare(m.id)}
                      aria-label={`${compareIds.includes(m.id) ? "Remove" : "Compare"} ${m.name}`}
                      aria-pressed={compareIds.includes(m.id)}
                    >
                      <Icon
                        name={compareIds.includes(m.id) ? "check" : "plus"}
                        size={14}
                      />
                      {compareIds.includes(m.id) ? "Added" : "Compare"}
                    </button>
                  </footer>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Family</th>
                  {columns.map(p => <th key={p.key}>{p.label} <small>{p.unit}</small></th>)}
                  <th>Compare</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <button
                        className="table-name"
                        onClick={() => setDetail(m)}
                      >
                        {shortName(m.name)}
                        <Icon name="arrowUp" size={13} />
                      </button>
                    </td>
                    <td>
                      <span
                        className={`family-badge badge-${m.category.toLowerCase()}`}
                      >
                        {m.category}
                      </span>
                    </td>
                    {columns.map(p => <td key={p.key}>{propertyValue(m, p.key) ?? <span className="missing-value" aria-label="Not provided by this source record">—</span>}</td>)}
                    <td>
                      <button
                        className="compare-button"
                        aria-label={`${compareIds.includes(m.id) ? "Remove" : "Compare"} ${m.name}`}
                        aria-pressed={compareIds.includes(m.id)}
                        onClick={() => toggleCompare(m.id)}
                      >
                        <Icon
                          name={compareIds.includes(m.id) ? "check" : "plus"}
                          size={16}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && result.total > 0 && <nav className="catalog-pagination" aria-label="Material pages">
          <span>{((page - 1) * 24 + 1).toLocaleString()}–{Math.min(page * 24, result.total).toLocaleString()} of {result.total.toLocaleString()} records</span>
          <div><button className="button button-secondary button-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page} of {result.pages.toLocaleString()}</span>
          <button className="button button-secondary button-sm" disabled={page >= result.pages} onClick={() => setPage(p => p + 1)}>Next</button></div>
        </nav>}
        <div className="catalog-disclaimer">
          <Icon name="info" size={15} />
          <p>
            A dash means the source record provides no value. Use the reported-property filter to find records with the data you need. Open a record for its citation and test conditions.
          </p>
        </div>
      </section>
      {compareIds.length > 0 && (
        <div className="compare-dock">
          <span className="dock-icon">
            <Icon name="compare" />
          </span>
          <div>
            <strong>
              {compareIds.length} material{compareIds.length > 1 ? "s" : ""}{" "}
              selected
            </strong>

          </div>
          <Link className="button" to="/compare">
            Compare materials
            <Icon name="arrow" size={16} />
          </Link>
        </div>
      )}
      {detail && (
        <MaterialDetail material={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}
