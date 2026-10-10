import React from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";
import Icon from "../components/Icon";
export default function Guide() {
  const { catalogSummary } = useWorkspace();
  return (
    <div className="page guide-page">
      <div className="page-heading">
        <div>
          
          <h1>
            How Starbase works<span className="heading-period">.</span>
          </h1>
          <p>Understand the decision before you make it.</p>
        </div>
      </div>
      <div className="guide-grid">
        {[
          [
            "01",
            "Explore the reference library",
            "Browse the available material families and source datasets. Open a material to inspect its properties, listed applications, and the status of its source data.",
          ],
          [
            "02",
            "Define limits and priorities",
            "Select an application and set performance limits. Requirements screen candidates; weights express your preferences between strength, lightness, cost, and conductivity.",
          ],
          [
            "03",
            "Understand the shortlist",
            "The studio excludes candidates that fail a specified limit or lack required evidence. Remaining materials receive a transparent, weighted preference score. Open a result to inspect the contributions.",
          ],
          [
            "04",
            "Compare and keep your work",
            "Compare up to four materials, export the values as CSV, and sign in to save requirements and ranked recommendations to a shared project.",
          ],
        ].map(([n, title, body]) => (
          <section key={n}>
            <span className="guide-number">{n}</span>
            <h2>{title}</h2>
            <p>{body}</p>
          </section>
        ))}
      </div>
      <div className="guide-evidence">
        <span className="eyebrow">KNOW THE LIMITS OF YOUR DATA</span>
        <h2>A useful starting point. A decision still needs evidence.</h2>
        <p>
          The catalog contains {catalogSummary.total.toLocaleString()} source records. Supplier grades retain product forms, published strength ranges, physical properties and source pages. Registry references add international grade codes and more material families; their underlying property citations and test conditions are not supplied. Tensile screening uses the lower published limit when a range or minimum is given. Research records retain computed elastic moduli or experimental conditions. Record counts include multiple conditions for the same material. Prices, environmental corrosion performance and service limits require separate supporting data.
        </p>
        <p>
          Tensile strength is not a complete load calculation. Corrosion ratings
          depend on the actual environment. Composite properties depend on
          direction and lay-up. Confirm the material grade, condition, supplier,
          and design safety factors before a final selection.
        </p>
        <div className="source-links">{catalogSummary.sources.map(s => <p key={s.sourceKey}><a href={s.url} target="_blank" rel="noreferrer">{s.name}</a> · {s.count.toLocaleString()} records · {s.dataKind} · {s.license}</p>)}</div>
        <Link to="/selection" className="button">
          Open selection studio
          <Icon name="arrow" />
        </Link>
      </div>
    </div>
  );
}
