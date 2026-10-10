import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import Icon from "../components/Icon";
import { Modal, Empty, Field, ErrorMessage } from "../components/UI";
const date = (v) =>
  new Date(
    v.replace(" ", "T") + (v.includes("Z") ? "" : "Z"),
  ).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export default function Dashboard() {
  const { token, user } = useContext(AuthContext);
  const { setNotice } = useWorkspace();
  const [projects, setProjects] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [modal, setModal] = useState(null),
    [name, setName] = useState(""),
    [application, setApplication] = useState("General Mechanical"),
    [busy, setBusy] = useState(false),
    [modalError, setModalError] = useState(""),
    [project, setProject] = useState(null),
    [email, setEmail] = useState(""),
    [permission, setPermission] = useState("read"),
    [weight, setWeight] = useState(""),
    [cost, setCost] = useState("");
  const config = { headers: { Authorization: `Bearer ${token}` } };
  async function load() {
    setError("");
    try {
      const { data } = await axios.get("/api/projects", config);
      setProjects(data);
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load projects.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (token) load();
    else setLoading(false);
  }, [token]);
  function open(kind, p) {
    setModal(kind);
    setModalError("");
    setName(p?.name || "");
    setApplication(p?.application || "General Mechanical");
    setProject(p || null);
    setEmail("");
    setWeight("");
    setCost("");
    if (kind === "team" || kind === "specs") details(p.project_id);
  }
  async function details(id) {
    try {
      const { data } = await axios.get(`/api/projects/${id}`, config);
      setProject(data);
    } catch {
      setModalError("Could not load project details.");
    }
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setModalError("");
    try {
      if (modal === "create") {
        await axios.post("/api/projects", { name, application }, config);
        setNotice(
          "Project created. Open its selection studio to define requirements.",
        );
      } else if (modal === "rename") {
        await axios.put(
          `/api/projects/${project.project_id}`,
          { name },
          config,
        );
        setNotice("Project renamed.");
      } else if (modal === "delete") {
        await axios.delete(`/api/projects/${project.project_id}`, config);
        setNotice("Project deleted.");
      } else if (modal === "team") {
        await axios.post(
          `/api/projects/${project.project_id}/collaborators`,
          { email, permission_level: permission },
          config,
        );
        setEmail("");
        await details(project.project_id);
        await load();
        setNotice("Project access updated.");
        return;
      } else if (modal === "specs") {
        await axios.post(
          `/api/projects/${project.project_id}/specs`,
          { max_weight: weight, target_cost: cost },
          config,
        );
        setWeight("");
        setCost("");
        await details(project.project_id);
        await load();
        return;
      }
      setModal(null);
      await load();
    } catch (e) {
      setModalError(
        e.response?.data?.message || "Could not complete this action.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove(type, id) {
    setBusy(true);
    try {
      await axios.delete(
        `/api/projects/${project.project_id}/${type}/${id}`,
        config,
      );
      await details(project.project_id);
      await load();
    } catch (e) {
      setModalError(e.response?.data?.message || "Could not remove this item.");
    } finally {
      setBusy(false);
    }
  }
  const shown = projects.filter(
    (p) =>
      (filter === "all" ||
        (filter === "owned"
          ? p.user_role === "owner"
          : p.user_role !== "owner")) &&
      `${p.name} ${p.application} ${p.owner_name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (!token)
    return (
      <div className="page">
        <div className="page-heading">
          <div>
            
            <h1>
              Projects
              <span className="heading-period">.</span>
            </h1>
            <p>
              Keep requirements, recommendations, and your team in one place.
            </p>
          </div>
        </div>
        <Empty
          title="Keep your selections together."
          description="Sign in to create projects, save your selection results, and collaborate with your team."
        >
          <Link to="/login?next=/dashboard" className="button">
            Sign in
            <Icon name="arrow" />
          </Link>
          <Link to="/register?next=/dashboard" className="text-button">
            Create an account
          </Link>
        </Empty>
      </div>
    );
  return (
    <div className="page projects-page">
      <div className="page-heading">
        <div>
          
          <h1>
            Projects<span className="heading-period">.</span>
          </h1>
          <p>
            {user.name ? `${user.name.split(" ")[0]}, keep` : "Keep"} your
            projects moving from requirements to decisions.
          </p>
        </div>
        <button className="button" onClick={() => open("create")}>
          <Icon name="plus" />
          New project
        </button>
      </div>
      <div className="project-stats">
        {[
          [projects.length, "Accessible projects"],
          [
            projects.filter((p) => p.user_role === "owner").length,
            "Owned by you",
          ],
          [
            projects.filter((p) => p.user_role !== "owner").length,
            "Shared with you",
          ],
          [
            projects.reduce((n, p) => n + Number(p.specs_count), 0),
            "Legacy specifications",
          ],
        ].map(([v, k]) => (
          <div key={k}>
            <span>{k}</span>
            <strong>{String(v).padStart(2, "0")}</strong>
          </div>
        ))}
      </div>
      <div className="section-heading">
        <div>
          
          <h2>My projects</h2>
        </div>
        <div className="segmented">
          {[
            ["all", "All projects"],
            ["owned", "Owned"],
            ["shared", "Shared"],
          ].map(([v, label]) => (
            <button
              key={v}
              className={filter === v ? "active" : ""}
              onClick={() => setFilter(v)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="search-input project-search">
        <Icon name="search" />
        <input
          aria-label="Search projects"
          placeholder="Search your projects…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <ErrorMessage message={error} />
      {error && (
        <button className="button button-secondary" onClick={load}>
          Retry
        </button>
      )}
      {loading ? (
        <div className="skeleton-card" />
      ) : !shown.length ? (
        <Empty
          title={
            projects.length
              ? "No matching projects"
              : "Your next idea belongs here."
          }
          description={
            projects.length
              ? "Try a different search or filter."
              : "Create your first project and turn requirements into an informed material shortlist."
          }
        >
          <button className="button" onClick={() => open("create")}>
            <Icon name="plus" />
            Create a project
          </button>
        </Empty>
      ) : (
        <div className="project-grid">
          {shown.map((p, i) => (
            <article className="project-card" key={p.project_id}>
              <div className="project-card-top">
                <span className="project-glyph">
                  <Icon name="projects" size={24} />
                </span>
                <span className="project-role">
                  {p.user_role === "owner"
                    ? "Owned by you"
                    : `${p.user_role} access`}
                </span>
              </div>
              <span className="eyebrow">
                PROJECT {String(i + 1).padStart(2, "0")}
              </span>
              <Link
                className="project-title"
                to={`/selection?project=${p.project_id}`}
              >
                {p.name}
                <Icon name="arrowUp" size={18} />
              </Link>
              <p>{p.application}</p>
              <div className="project-owner">
                <span className="mini-avatar">
                  {(p.owner_name || p.owner_email)[0].toUpperCase()}
                </span>
                <span>
                  {p.owner_name || p.owner_email}
                  <small>Created {date(p.created_at)}</small>
                </span>
              </div>
              <div className="project-card-actions">
                <Link
                  className="button button-secondary button-sm"
                  to={`/selection?project=${p.project_id}`}
                >
                  Open selection
                  <Icon name="arrow" size={15} />
                </Link>
                <button
                  className="icon-button"
                  onClick={() => open("team", p)}
                  aria-label={`Team for ${p.name}`}
                  title="Project team"
                >
                  <Icon name="user" />
                </button>
                <button
                  className="icon-button"
                  onClick={() => open("specs", p)}
                  aria-label={`Legacy specifications for ${p.name}`}
                  title="Legacy specifications"
                >
                  <Icon name="list" />
                </button>
                <button
                  className="icon-button"
                  disabled={!["owner", "write", "admin"].includes(p.user_role)}
                  onClick={() => open("rename", p)}
                  aria-label={`Rename ${p.name}`}
                  title="Rename project"
                >
                  <Icon name="sliders" />
                </button>
                {p.user_role === "owner" && (
                  <button
                    className="icon-button"
                    onClick={() => open("delete", p)}
                    aria-label={`Delete ${p.name}`}
                    title="Delete project"
                  >
                    <Icon name="trash" size={17} />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {modal && (
        <Modal
          title={
            {
              create: "Create a project",
              rename: "Rename project",
              delete: "Delete project?",
              team: "Project team",
              specs: "Legacy specifications",
            }[modal]
          }
          subtitle={
            project?.name || "Give your next engineering idea a place to grow."
          }
          onClose={() => setModal(null)}
        >
          <form onSubmit={submit} className="modal-body">
            <ErrorMessage message={modalError} />
            {(modal === "create" || modal === "rename") && (
              <>
                <Field label="Project name">
                  <input
                    autoFocus
                    required
                    maxLength="255"
                    placeholder="e.g. Lightweight UAV airframe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                {modal === "create" && (
                  <Field label="Application / design context">
                    <input
                      required
                      value={application}
                      maxLength="255"
                      onChange={(e) => setApplication(e.target.value)}
                    />
                  </Field>
                )}
                <button className="button full-width" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : modal === "create"
                      ? "Create project"
                      : "Save name"}
                  <Icon name="arrow" />
                </button>
              </>
            )}
            {modal === "delete" && (
              <>
                <p className="muted">
                  This permanently removes the project, its requirements, saved
                  recommendations, specifications, and collaborator access.
                </p>
                <div className="modal-footer inline-footer">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setModal(null)}
                  >
                    Keep project
                  </button>
                  <button className="button button-danger" disabled={busy}>
                    Delete project
                  </button>
                </div>
              </>
            )}
            {modal === "team" && (
              <>
                <p className="muted small">
                  Invite an existing registered account. Read can inspect, write
                  can edit requirements, and admin can edit. The owner manages
                  team access.
                </p>
                <div className="member-row">
                  <span className="avatar">
                    {(user.name || user.email)[0].toUpperCase()}
                  </span>
                  <span>
                    {project?.owner_name || "Project owner"}
                    <small>Owner</small>
                  </span>
                </div>
                {project?.collaborators?.map((c) => (
                  <div className="member-row" key={c.user_id}>
                    <span className="mini-avatar">
                      {(c.name || c.email)[0].toUpperCase()}
                    </span>
                    <span>
                      {c.name || c.email}
                      <small>
                        {c.email} · {c.permission_level}
                      </small>
                    </span>
                    {project.user_role === "owner" && (
                      <button
                        type="button"
                        className="icon-button"
                        disabled={busy}
                        onClick={() => remove("collaborators", c.user_id)}
                        aria-label={`Remove ${c.email}`}
                      >
                        <Icon name="close" size={16} />
                      </button>
                    )}
                  </div>
                ))}
                {project?.user_role === "owner" && (
                  <>
                    <Field label="Registered email address">
                      <input
                        type="email"
                        required
                        placeholder="teammate@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </Field>
                    <Field label="Permission">
                      <select
                        value={permission}
                        onChange={(e) => setPermission(e.target.value)}
                      >
                        <option value="read">Read — inspect selections</option>
                        <option value="write">Write — edit selections</option>
                        <option value="admin">Admin — edit project</option>
                      </select>
                    </Field>
                    <button className="button full-width" disabled={busy}>
                      Add or update collaborator
                      <Icon name="plus" />
                    </button>
                  </>
                )}
              </>
            )}
            {modal === "specs" && (
              <>
                <p className="muted small">
                  These mass and USD budget records are preserved from the
                  original project. Use the selection studio for property-based
                  screening; supplier pricing is not in this catalog.
                </p>
                {project?.specs?.map((s) => (
                  <div className="legacy-spec" key={s.spec_id}>
                    <span>
                      Max mass<strong>{s.max_weight} kg</strong>
                    </span>
                    <span>
                      Budget
                      <strong>${Number(s.target_cost).toLocaleString()}</strong>
                    </span>
                    {project.can_write && (
                      <button
                        className="icon-button"
                        type="button"
                        disabled={busy}
                        onClick={() => remove("specs", s.spec_id)}
                        aria-label="Remove legacy specification"
                      >
                        <Icon name="close" size={15} />
                      </button>
                    )}
                  </div>
                ))}
                {project?.can_write && (
                  <>
                    <div className="form-row">
                      <Field label="Mass limit (kg)">
                        <input
                          required
                          type="number"
                          min="0.001"
                          step="any"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                        />
                      </Field>
                      <Field label="Budget (USD)">
                        <input
                          required
                          type="number"
                          min="0.01"
                          step="any"
                          value={cost}
                          onChange={(e) => setCost(e.target.value)}
                        />
                      </Field>
                    </div>
                    <button className="button full-width" disabled={busy}>
                      Add legacy specification
                      <Icon name="plus" />
                    </button>
                  </>
                )}
              </>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
