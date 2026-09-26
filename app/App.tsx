import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Box,
  GitBranch,
  Network,
  CalendarRange,
  ListTodo,
  Users,
  ShieldAlert,
  CheckSquare,
  FlaskConical,
  FileText,
  Search,
  RefreshCw,
  ArrowRight,
  GitCompareArrows,
  Command,
  PanelLeftClose,
  Layers,
  Check,
  X,
  Plus,
} from "lucide-react";
import * as api from "./api";
import {
  affected,
  colors,
  coverage,
  effortSum,
  relations,
  statuses,
  type Entity,
  type Snapshot,
  type Views,
} from "./types";
import { Graph } from "./Graph";
import { Timeline } from "./Timeline";
import { Inspector } from "./Inspector";
import { WorkPackageForm } from "./WorkPackageForm";
const pages = [
  ["Overview", Activity, "Program health and evidence at a glance"],
  ["Capability map", Layers, "From product intent to engineering capabilities"],
  [
    "Requirements",
    CheckSquare,
    "Trace accepted targets to implementation and evidence",
  ],
  ["Architecture", Box, "System boundaries, interfaces and implementation"],
  [
    "Repositories",
    GitBranch,
    "Ownership and implementation across code boundaries",
  ],
  ["Dependencies", Network, "Engineering outcomes and their prerequisites"],
  [
    "Roadmap",
    CalendarRange,
    "Provisional sequencing, milestones and dependency pressure",
  ],
  ["Work packages", ListTodo, "Verifiable outcomes with bounded estimates"],
  ["Resources", Users, "Effort demand by owner and confidence"],
  ["Risks", ShieldAlert, "Uncertainty, exposure and mitigation"],
  [
    "Validation",
    CheckSquare,
    "Protocol coverage is distinct from verified acceptance",
  ],
  [
    "Decisions & experiments",
    FlaskConical,
    "Record rationale, investigate uncertainty",
  ],
  ["Sources", FileText, "Tracked sources and stable section references"],
] as const;
export function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [recents, setRecents] = useState<string[]>([]);
  const [picker, setPicker] = useState(true);
  const [page, setPage] = useState("Overview");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [changedOnly, setChangedOnly] = useState(false);
  const [relationFilter, setRelationFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<"demo" | "diff" | null>(null);
  const [diff, setDiff] = useState("");
  const [newWork, setNewWork] = useState(false);
  async function run(operation: () => Promise<Snapshot>, message = "") {
    setBusy(true);
    setError("");
    try {
      const s = await operation();
      setSnapshot(s);
      setNotice(message);
      return s;
    } catch (e) {
      setError(String(e));
      return null;
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!api.desktop) {
      void run(api.load);
      setPicker(false);
      return;
    }
    void api.recentProjects().then(async (paths) => {
      setRecents(paths);
      if (paths[0]) {
        try {
          const s = await api.openProject(paths[0]);
          setSnapshot(s);
          setPicker(false);
        } catch (e) {
          setError(String(e));
        }
      }
    });
  }, []);
  async function openProject(path: string) {
    setBusy(true);
    setError("");
    try {
      const next = await api.openProject(path);
      setSnapshot(next);
      setRecents(await api.recentProjects());
      setPicker(false);
      setSelected(null);
      setNewWork(false);
      setSearch("");
      setKind("");
      setStatus("");
      setPage("Overview");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>("#global-search")?.focus();
      }
      if (e.key === "Escape") {
        setModal(null);
        setNewWork(false);
        setSelected(null);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const entities = useMemo(
    () =>
      snapshot?.entities.filter(
        (e) =>
          (!search ||
            `${e.id} ${e.title} ${e.summary} ${e.owner} ${Object.values(e.details).join(" ")}`
              .toLowerCase()
              .includes(search.toLowerCase())) &&
          (!status || e.status === status) &&
          (!kind || e.kind === kind) &&
          (!changedOnly || e.details.change_request === "CR-01"),
      ) ?? [],
    [snapshot, search, status, kind, changedOnly],
  );
  const lookup = (id: string) => snapshot?.entities.find((e) => e.id === id);
  const chosen = selected ? lookup(selected) : null;
  function saveViews(views: Views) {
    if (!snapshot || busy) return;
    void run(
      () => api.saveViews(views, snapshot.revision),
      "View state saved to knowledge-studio/views/workspace.json",
    );
  }
  const select = (id: string) => setSelected(id);
  const typeTag = (e: Entity) => (
    <span
      className="type-tag"
      style={{ color: colors[e.kind], borderColor: colors[e.kind] + "44" }}
    >
      {e.kind}
    </span>
  );
  const statusTag = (s: string) => (
    <span className={`status status-${s}`}>{s}</span>
  );
  function table(
    items: Entity[],
    extra: "effort" | "trace" | "default" = "default",
  ) {
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Entity / engineering outcome</th>
              <th>Status</th>
              <th>{extra === "effort" ? "Effort · person-weeks" : "Owner"}</th>
              <th>
                {extra === "trace" ? "Validation evidence" : "Confidence"}
              </th>
              <th>{extra === "effort" ? "Milestone" : "Relations"}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} onClick={() => select(e.id)}>
                <td>
                  <button className="row-title" onClick={() => select(e.id)}>
                    <code>{e.id}</code>
                    <strong>{e.title}</strong>
                    {e.details.change_request && <i className="change-dot" />}
                  </button>
                  <small>{extra === "effort" ? e.outcome : e.summary}</small>
                </td>
                <td>{statusTag(e.status)}</td>
                <td>
                  {extra === "effort"
                    ? e.effort
                      ? `${e.effort.join("–")} pw`
                      : "Unknown"
                    : (lookup(e.owner ?? "")?.title ?? "—")}
                </td>
                <td>
                  {extra === "trace" ? (
                    <span>
                      {snapshot!.entities
                        .filter(
                          (v) =>
                            v.kind === "Validation" &&
                            v.relations.some(
                              (r) =>
                                r.type === "validates" && r.target === e.id,
                            ),
                        )
                        .map((v) => (
                          <button
                            className="mini-link"
                            key={v.id}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              select(v.id);
                            }}
                          >
                            {v.id} · {v.status}
                          </button>
                        ))}
                    </span>
                  ) : (
                    <div className="confidence">
                      <span style={{ width: `${e.confidence * 100}%` }} />
                      <small>{Math.round(e.confidence * 100)}%</small>
                    </div>
                  )}
                </td>
                <td>
                  {extra === "effort" ? (
                    lookup(e.milestone ?? "")?.title
                  ) : (
                    <span className="muted">
                      {e.relations.length} outgoing ·{" "}
                      {snapshot!.backlinks[e.id]?.length ?? 0} incoming
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="empty">
            No matching entities. Clear a filter to broaden this view.
          </div>
        )}
      </div>
    );
  }
  function graph(types: string[]) {
    const items = entities
      .filter((e) => types.includes(e.kind))
      .sort(
        (a, b) =>
          types.indexOf(a.kind) - types.indexOf(b.kind) ||
          a.id.localeCompare(b.id),
      );
    return (
      <>
        <div className="legend">
          {types.map((t) => (
            <span key={t}>
              <i style={{ background: colors[t] }} />
              {t}
            </span>
          ))}
          <label>
            Relation{" "}
            <select
              value={relationFilter}
              onChange={(e) => setRelationFilter(e.target.value)}
            >
              <option value="">All types</option>
              {relations.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
        </div>
        {items.length ? (
          <Graph
            key={page}
            entities={items}
            views={snapshot!.views}
            view={page}
            onSelect={select}
            editable={api.desktop && !busy}
            relationFilter={relationFilter}
            onLayout={(id, pos) =>
              saveViews({
                ...snapshot!.views,
                layouts: {
                  ...snapshot!.views.layouts,
                  [page]: { ...snapshot!.views.layouts[page], [id]: pos },
                },
              })
            }
            onResetLayout={() => {
              const layouts = { ...snapshot!.views.layouts };
              delete layouts[page];
              saveViews({ ...snapshot!.views, layouts });
            }}
          />
        ) : (
          <div className="empty">No nodes match these filters.</div>
        )}
      </>
    );
  }
  function cards(items: Entity[]) {
    return (
      <div className="entity-cards">
        {items.map((e) => (
          <button
            className="entity-card"
            key={e.id}
            onClick={() => select(e.id)}
          >
            <div>
              {typeTag(e)}
              <code>{e.id}</code>
            </div>
            <h3>{e.title}</h3>
            <p>{e.summary}</p>
            <footer>
              {statusTag(e.status)}
              <span>{Math.round(e.confidence * 100)}% confidence</span>
            </footer>
          </button>
        ))}
        {items.length === 0 && (
          <div className="empty">No matching entities.</div>
        )}
      </div>
    );
  }
  function content() {
    if (!snapshot) return null;
    const work = entities.filter((e) => e.kind === "WorkPackage");
    switch (page) {
      case "Overview": {
        const c = coverage(entities);
        const knownWork = work.filter((e) => e.effort);
        const effort = effortSum(knownWork);
        return (
          <>
            <div className="overview-intro">
              <div>
                <span className="eyebrow">
                  {snapshot.manifest.project.toUpperCase()} / SYSTEM MODEL
                </span>
                <h2>
                  Engineering intent,
                  <br />
                  <em>connected to evidence.</em>
                </h2>
                <p>
                  {snapshot.manifest.synthetic
                    ? "Synthetic example workspace."
                    : "Project knowledge from tracked sources."}
                  <br />
                  Explore the same knowledge through thirteen perspectives.
                </p>
              </div>
              <div className="system-sketch">
                <div>
                  CAPABILITIES{" "}
                  <b>
                    {entities.filter((e) => e.kind === "Capability").length}
                  </b>
                </div>
                <ArrowRight />
                <div>
                  REQUIREMENTS{" "}
                  <b>
                    {entities.filter((e) => e.kind === "Requirement").length}
                  </b>
                </div>
                <ArrowRight />
                <div>
                  VALIDATIONS{" "}
                  <b>
                    {entities.filter((e) => e.kind === "Validation").length}
                  </b>
                </div>
                <span>LOCAL · TRACEABLE · GIT-NATIVE</span>
              </div>
            </div>
            <div className="metrics">
              <button onClick={() => setPage("Capability map")}>
                <small>Knowledge entities</small>
                <strong>{entities.length}</strong>
                <span>15 typed entity families</span>
              </button>
              <button onClick={() => setPage("Validation")}>
                <small>Verified requirements</small>
                <strong>
                  {c.passed}
                  <em> / {c.total}</em>
                </strong>
                <span>{c.planned} linked to validation protocols</span>
              </button>
              <button onClick={() => setPage("Resources")}>
                <small>Engineering effort</small>
                <strong>
                  {knownWork.length ? effort.join("–") : "Unknown"}
                  {knownWork.length > 0 && <em> pw</em>}
                </strong>
                <span>
                  {knownWork.length} of {work.length} packages estimated
                </span>
              </button>
              <button onClick={() => setPage("Risks")}>
                <small>Open risks</small>
                <strong>
                  {
                    entities.filter(
                      (e) => e.kind === "Risk" && e.status === "open",
                    ).length
                  }
                </strong>
                <span>Exposure requires evidence to close</span>
              </button>
            </div>
            <div className="overview-columns">
              <section className="panel">
                <div className="panel-heading">
                  <h3>Release gates</h3>
                  <button onClick={() => setPage("Roadmap")}>
                    Open roadmap <ArrowRight size={14} />
                  </button>
                </div>
                {entities
                  .filter((e) => e.kind === "Milestone")
                  .map((e, i) => (
                    <button
                      className="gate"
                      onClick={() => select(e.id)}
                      key={e.id}
                    >
                      <span className="gate-number">0{i + 1}</span>
                      <div>
                        <strong>{e.title}</strong>
                        <p>{e.details.gate}</p>
                      </div>
                      <time>{e.details.target_date ?? "Date unknown"}</time>
                    </button>
                  ))}
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h3>Open questions</h3>
                  <span className="muted">Evidence before certainty</span>
                </div>
                {entities
                  .filter(
                    (e) =>
                      ["Decision", "Risk", "Experiment"].includes(e.kind) &&
                      ["open", "proposed", "assumption"].includes(e.status),
                  )
                  .slice(0, 3)
                  .map((e) => (
                    <button
                      className="question"
                      key={e.id}
                      onClick={() => select(e.id)}
                    >
                      {typeTag(e)}
                      <strong>{e.title}</strong>
                      <ArrowRight size={14} />
                    </button>
                  ))}
                {snapshot.manifest.synthetic &&
                  snapshot.manifest.project === "PackInspect" && (
                    <div className="scenario-strip">
                      <div>
                        <code>CR-01 · SYNTHETIC PM CHANGE</code>
                        <p>
                          Four cameras. 120 parts/min.
                          <br />
                          What changes downstream?
                        </p>
                      </div>
                      <button
                        className="primary"
                        onClick={() => setModal("demo")}
                      >
                        Review impact <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
              </section>
            </div>
            <div className="provenance-line">
              <GitBranch size={16} />
              <span>Semantic model → saved projections → local runtime</span>
              <span>
                {snapshot.manifest.synthetic
                  ? "All content in this example is fictional."
                  : "Evidence linked to project sources."}
              </span>
            </div>
          </>
        );
      }
      case "Capability map":
        return graph(["Product", "Capability", "Requirement"]);
      case "Architecture":
        return graph(["Component", "Interface", "Repository"]);
      case "Repositories":
        return (
          <>
            {graph(["Repository", "Component", "Team"])}
            <div className="below-graph">
              {cards(entities.filter((e) => e.kind === "Repository"))}
            </div>
          </>
        );
      case "Dependencies":
        return graph(["WorkPackage", "Risk", "Milestone"]);
      case "Requirements":
        return (
          <>
            <div className="notice">
              Accepted requirements and assumptions remain distinct. Click a row
              for implementation links, incoming validations and exact source
              sections.
            </div>
            {table(
              entities.filter((e) => e.kind === "Requirement"),
              "trace",
            )}
          </>
        );
      case "Work packages":
        return table(work, "effort");
      case "Roadmap":
        return (
          <Timeline
            entities={entities}
            all={snapshot.entities}
            views={snapshot.views}
            onSelect={select}
            editable={api.desktop && !busy}
            origin={snapshot.manifest.planning_origin}
            onPlan={(id, start, duration) =>
              saveViews({
                ...snapshot.views,
                planning: {
                  ...snapshot.views.planning,
                  [id]: { start, duration },
                },
              })
            }
          />
        );
      case "Resources":
        return (
          <>
            <div className="notice">
              Demand across all planned work, including completed outcomes.
              Unknown owners, estimates and capacity remain unknown.
            </div>
            <div className="resource-list">
              {snapshot.entities
                .filter((e) => e.kind === "Team")
                .map((owner) => {
                  const tasks = work.filter((e) => e.owner === owner.id);
                  const effort = effortSum(tasks);
                  const knownWork = tasks.filter((e) => e.effort);
                  return (
                    <section className="panel resource" key={owner.id}>
                      <header>
                        <div>
                          <code>{owner.id}</code>
                          <h3>{owner.title}</h3>
                          <p>
                            {owner.details.skill ?? "Skill unknown"} ·{" "}
                            {owner.details.capacity
                              ? `${owner.details.capacity} people assumed`
                              : "Capacity unknown"}
                          </p>
                        </div>
                        <strong>
                          {knownWork.length ? effort.join("–") : "Unknown"}{" "}
                          <small>person-weeks</small>
                        </strong>
                      </header>
                      <div className="effort-bar">
                        {tasks.map((e) => (
                          <button
                            title={`${e.id}: ${e.effort ? `${e.effort.join("–")} pw` : "estimate unknown"}`}
                            key={e.id}
                            style={{
                              flex: e.effort?.[1] ?? 1,
                              opacity: 0.45 + e.confidence * 0.55,
                            }}
                            onClick={() => select(e.id)}
                          >
                            {e.id}
                          </button>
                        ))}
                      </div>
                      <footer>
                        {tasks.length} outcomes ·{" "}
                        {tasks.filter((e) => e.work_type === "research").length}{" "}
                        research · {tasks.filter((e) => !e.effort).length}{" "}
                        unestimated
                      </footer>
                    </section>
                  );
                })}
            </div>
          </>
        );
      case "Risks":
        return (
          <>
            <div className="risk-grid">
              {entities
                .filter((e) => e.kind === "Risk")
                .sort(
                  (a, b) =>
                    Number(b.details.likelihood) * Number(b.details.impact) -
                    Number(a.details.likelihood) * Number(a.details.impact),
                )
                .map((e) => (
                  <button
                    className="risk-card"
                    key={e.id}
                    onClick={() => select(e.id)}
                  >
                    <header>
                      <code>{e.id}</code>
                      <span className="risk-score">
                        {e.details.likelihood && e.details.impact
                          ? `${Number(e.details.likelihood) * Number(e.details.impact)} / 25`
                          : "Unknown"}
                      </span>
                    </header>
                    <h3>{e.title}</h3>
                    <p>{e.summary}</p>
                    <div className="risk-dimensions">
                      <span>
                        Likelihood{" "}
                        {e.details.likelihood
                          ? `${e.details.likelihood}/5`
                          : "unknown"}
                      </span>
                      <span>
                        Impact{" "}
                        {e.details.impact ? `${e.details.impact}/5` : "unknown"}
                      </span>
                    </div>
                    <footer>
                      <small>MITIGATION</small>
                      <p>{e.details.mitigation}</p>
                    </footer>
                  </button>
                ))}
            </div>
            <p className="footnote">
              Exposure is a qualitative prioritization score (likelihood ×
              impact), not a probability of failure.
            </p>
          </>
        );
      case "Validation": {
        const reqs = entities.filter((e) => e.kind === "Requirement");
        const vals = snapshot.entities.filter((e) => e.kind === "Validation");
        return (
          <>
            <div className="notice">
              <span className="matrix-cell passed">✓</span> Passed protocol{" "}
              <span className="matrix-cell planned">○</span> Planned protocol ·
              A link alone does not mean a requirement is verified.
            </div>
            <div className="table-wrap">
              <table className="matrix">
                <thead>
                  <tr>
                    <th>Requirement</th>
                    {vals.map((v) => (
                      <th key={v.id}>
                        <button onClick={() => select(v.id)}>
                          <code>{v.id}</code>
                          <span>{v.title}</span>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reqs.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <button
                          className="row-title"
                          onClick={() => select(r.id)}
                        >
                          <code>{r.id}</code>
                          <strong>{r.title}</strong>
                        </button>
                      </td>
                      {vals.map((v) => {
                        const linked = v.relations.some(
                          (l) => l.type === "validates" && l.target === r.id,
                        );
                        return (
                          <td key={v.id}>
                            {linked ? (
                              <button
                                aria-label={`${r.id} ${v.id} ${v.status}`}
                                className={`matrix-cell ${v.status}`}
                                onClick={() => select(v.id)}
                              >
                                {v.status === "passed" ? "✓" : "○"}
                              </button>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {reqs.length === 0 && (
                <div className="empty">
                  No requirements match these filters.
                </div>
              )}
            </div>
          </>
        );
      }
      case "Decisions & experiments":
        return (
          <>
            <div className="section-label">
              Decisions · rationale and unresolved choices
            </div>
            {cards(entities.filter((e) => e.kind === "Decision"))}
            <div className="section-label spaced">
              Experiments · evidence still to be produced
            </div>
            {cards(entities.filter((e) => e.kind === "Experiment"))}
          </>
        );
      case "Sources":
        return (
          <>
            <div className="notice">
              Select a source to read its sections and see every entity that
              cites it.
            </div>
            {cards(entities.filter((e) => e.kind === "Source"))}
            <div className="section-label spaced">
              Datasets · metadata and references only
            </div>
            {cards(entities.filter((e) => e.kind === "Dataset"))}
          </>
        );
      default:
        return null;
    }
  }
  return (
    <div className="studio">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Box size={23} />
          </span>
          <div>
            <strong>{snapshot?.manifest.project ?? "Knowledge Studio"}</strong>
            <small>KNOWLEDGE STUDIO</small>
          </div>
        </div>
        <div className="workspace-label">
          <i />{" "}
          {snapshot?.manifest.synthetic
            ? "Synthetic example"
            : "Project workspace"}{" "}
          <span>v2</span>
        </div>
        <nav>
          {pages.map(([name, Icon], i) => (
            <button
              className={page === name ? "active" : ""}
              aria-label={name}
              title={name}
              key={name}
              onClick={() => {
                setPage(name);
                setRelationFilter("");
              }}
            >
              <Icon size={16} />
              <span>{name}</span>
              <small>{String(i + 1).padStart(2, "0")}</small>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <GitBranch size={15} />
          <div>
            <strong>Local files. Shared context.</strong>
            <small>Agent-authored · human-reviewed</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            {snapshot?.manifest.project ?? "Select project"} <span>/</span>{" "}
            {page}
          </div>
          <div className="search">
            <Search size={15} />
            <input
              id="global-search"
              aria-label="Search knowledge"
              value={search}
              placeholder="Search knowledge…"
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd>⌘ K</kbd>
          </div>
          <button
            title="Reload and validate files"
            aria-label="Reload workspace"
            disabled={busy}
            onClick={() =>
              void run(api.load, "Reloaded and validated local files")
            }
          >
            <RefreshCw size={16} className={busy ? "spin" : ""} />
          </button>
          {api.desktop && (
            <button onClick={() => setPicker(true)}>Switch project</button>
          )}
          <span className="local-badge">
            <i />
            {api.desktop ? "LOCAL" : "PREVIEW"}
          </span>
        </header>
        <div className="page-heading">
          <div>
            <span className="eyebrow">
              PROJECT KNOWLEDGE /{" "}
              {String(pages.findIndex((p) => p[0] === page) + 1).padStart(
                2,
                "0",
              )}
            </span>
            <h1>{page}</h1>
            <p>{pages.find((p) => p[0] === page)?.[2]}</p>
          </div>
          <div className="heading-actions">
            {page === "Work packages" && api.desktop && (
              <button
                className="primary"
                disabled={!snapshot || busy}
                onClick={() => setNewWork(true)}
              >
                <Plus size={15} /> New work package
              </button>
            )}
            {snapshot?.manifest.synthetic &&
              snapshot.manifest.project === "PackInspect" && (
                <button
                  disabled={!snapshot || busy}
                  onClick={() => setModal("demo")}
                >
                  <GitCompareArrows size={16} />
                  PM change demo
                </button>
              )}
            <button
              disabled={!api.desktop || busy}
              onClick={async () => {
                setModal("diff");
                setDiff("Loading Git diff…");
                try {
                  setDiff(
                    (await api.diff()) ||
                      "No uncommitted changes in knowledge, views or sources.",
                  );
                } catch (e) {
                  setDiff(String(e));
                }
              }}
            >
              <GitBranch size={15} />
              Review diff
            </button>
          </div>
        </div>
        <div className="filters">
          <span>
            {entities.length} / {snapshot?.entities.length ?? "—"} entities
          </span>
          <select
            aria-label="Filter entity type"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="">All entity types</option>
            {[...new Set(snapshot?.entities.map((e) => e.kind))]
              .sort()
              .map((k) => (
                <option key={k}>{k}</option>
              ))}
          </select>
          <select
            aria-label="Filter status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          {snapshot?.manifest.synthetic && (
            <label>
              <input
                type="checkbox"
                checked={changedOnly}
                onChange={(e) => setChangedOnly(e.target.checked)}
              />
              CR-01 changes
            </label>
          )}
          {(search || kind || status || changedOnly) && (
            <button
              className="text-button"
              onClick={() => {
                setSearch("");
                setKind("");
                setStatus("");
                setChangedOnly(false);
              }}
            >
              Clear filters
            </button>
          )}
          <span className="filter-right">
            {snapshot?.git.trim()
              ? "Uncommitted file changes"
              : api.desktop
                ? "Working tree clean"
                : "Read-only browser preview"}
          </span>
        </div>
        {error && (
          <div className="error" role="alert">
            <strong>Workspace operation failed</strong>
            <span>{error}</span>
            <button onClick={() => void run(api.load)}>Reload files</button>
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              <X size={14} />
            </button>
          </div>
        )}
        {notice && (
          <div className="toast" role="status">
            <Check size={14} />
            {notice}
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <X size={12} />
            </button>
          </div>
        )}
        <main>
          {snapshot ? (
            content()
          ) : (
            <div className="loading">
              <Command size={36} />
              <h2>
                {error ? "Cannot load workspace" : "Loading local knowledge…"}
              </h2>
              <p>
                {error
                  ? "Fix the reported model error, then reload. No data was overwritten."
                  : "Reading semantic files, validating references and building backlinks."}
              </p>
            </div>
          )}
        </main>
        <footer className="statusbar">
          <span>
            <i />{" "}
            {busy
              ? "Working…"
              : snapshot
                ? api.desktop
                  ? "Model validated · schema v2"
                  : "Static synthetic fixture · schema v2"
                : "Waiting for workspace"}
          </span>
          <span title={snapshot?.root}>{snapshot?.root}</span>
          <code>{snapshot?.revision.slice(0, 8)}</code>
        </footer>
      </div>
      {picker && api.desktop && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Choose project"
          >
            <header>
              <div>
                <code>KNOWLEDGE STUDIO</code>
                <h2>Open a project</h2>
              </div>
              {snapshot && (
                <button
                  onClick={() => setPicker(false)}
                  aria-label="Close project picker"
                >
                  <X size={20} />
                </button>
              )}
            </header>
            <p>
              Choose a Git checkout containing knowledge-studio/manifest.json.
            </p>
            <button
              className="primary"
              onClick={async () => {
                const path = await api.chooseProject();
                if (path) void openProject(path);
              }}
            >
              Choose folder…
            </button>
            <button
              onClick={async () => void openProject(await api.exampleProject())}
            >
              Open PackInspect example
            </button>
            <div className="section-label spaced">Recent projects</div>
            {recents.map((path) => (
              <button
                className="question"
                key={path}
                onClick={() => void openProject(path)}
              >
                {path}
              </button>
            ))}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
      {chosen && snapshot && (
        <Inspector
          key={chosen.id + snapshot.revision}
          entity={chosen}
          snapshot={snapshot}
          onClose={() => setSelected(null)}
          onSelect={select}
          editable={api.desktop}
          busy={busy}
          onSave={(entity) =>
            void run(
              () => api.saveEntity(entity, snapshot.revision),
              `Saved ${entity.id} to semantic files`,
            )
          }
          onDelete={(id) =>
            void run(
              () => api.deleteWorkPackage(id, snapshot.revision),
              `Deleted ${id}; removed its saved layout and plan`,
            ).then((next) => {
              if (next) setSelected(null);
            })
          }
        />
      )}
      {newWork && snapshot && (
        <WorkPackageForm
          snapshot={snapshot}
          busy={busy}
          onClose={() => setNewWork(false)}
          onCreate={(entity) =>
            void run(
              () => api.createWorkPackage(entity, snapshot.revision),
              `Created ${entity.id} in semantic files`,
            ).then((next) => {
              if (next) {
                setNewWork(false);
                setSelected(entity.id);
              }
            })
          }
        />
      )}
      {modal && snapshot && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className={`modal ${modal === "diff" ? "diff-modal" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={modal === "demo" ? "PM change proposal" : "Git diff"}
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <div>
                <code>
                  {modal === "demo"
                    ? "CR-01 / CHANGE PROPOSAL"
                    : "GIT / LOCAL REVIEW"}
                </code>
                <h2>
                  {modal === "demo"
                    ? "Four cameras. 120 parts/min."
                    : "Review file changes"}
                </h2>
              </div>
              <button aria-label="Close dialog" onClick={() => setModal(null)}>
                <X size={20} />
              </button>
            </header>
            {modal === "diff" ? (
              <pre>{diff}</pre>
            ) : (
              <>
                <p>
                  The synthetic PM request in SRC-006 changes 11 entities.
                  Applying it accepts the targets for planning; validation
                  remains outstanding. Milestone shifts are proposals. Saved
                  timeline positions remain unchanged for review.
                </p>
                <div className="change-summary">
                  <div>
                    <small>Camera views</small>
                    <strong>2 → 4</strong>
                  </div>
                  <div>
                    <small>Parts / minute</small>
                    <strong>80 → 120</strong>
                  </div>
                  <div>
                    <small>Affected WP effort</small>
                    <strong>7–15 → 12–22 pw</strong>
                  </div>
                </div>
                <div className="impact-list">
                  {affected.map((id) => (
                    <button
                      key={id}
                      onClick={() => {
                        select(id);
                        setModal(null);
                      }}
                    >
                      <code>{id}</code>
                      <span>{lookup(id)?.title}</span>
                      <small>
                        {id.startsWith("MS")
                          ? "+3 weeks, proposed"
                          : id.startsWith("EXP")
                            ? "new benchmark scope"
                            : id.startsWith("WP")
                              ? "scope / estimate"
                              : id.startsWith("RSK")
                                ? "exposure 25/25"
                                : "updated constraint"}
                      </small>
                      <ArrowRight size={13} />
                    </button>
                  ))}
                </div>
                <footer>
                  <span>
                    {api.desktop
                      ? "Deterministic files · no automatic commit"
                      : "Open the desktop app to apply this proposal."}
                  </span>
                  <button
                    className="primary"
                    disabled={!api.desktop || busy}
                    onClick={() => {
                      void run(
                        () =>
                          api.demo(!snapshot.demo_applied, snapshot.revision),
                        snapshot.demo_applied
                          ? "CR-01 reset; baseline restored"
                          : "CR-01 applied to 11 entities. Review the Git diff.",
                      );
                      setModal(null);
                    }}
                  >
                    {snapshot.demo_applied
                      ? "Reset demo to baseline"
                      : "Apply synthetic proposal"}
                  </button>
                </footer>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
