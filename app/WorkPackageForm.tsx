import { useState, type FormEvent } from "react";
import { X, Plus } from "lucide-react";
import type { Entity, Snapshot } from "./types";

export function WorkPackageForm({
  snapshot,
  busy,
  onClose,
  onCreate,
}: {
  snapshot: Snapshot;
  busy: boolean;
  onClose: () => void;
  onCreate: (entity: Entity) => void;
}) {
  const next =
    Math.max(
      0,
      ...snapshot.entities
        .filter((e) => e.kind === "WorkPackage")
        .map((e) => Number(e.id.slice(3))),
    ) + 1;
  const [id, setId] = useState(`WP-${String(next).padStart(3, "0")}`);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [outcome, setOutcome] = useState("");
  const [criterion, setCriterion] = useState("");
  const [workType, setWorkType] = useState("known");
  const [owner, setOwner] = useState("");
  const [milestone, setMilestone] = useState("");
  const [skill, setSkill] = useState("");
  const [low, setLow] = useState("");
  const [high, setHigh] = useState("");
  const [source, setSource] = useState("");
  const [section, setSection] = useState("");
  const [dependency, setDependency] = useState("");
  const sources = snapshot.entities.filter((e) => e.kind === "Source");
  const selectedSource = sources.find((e) => e.id === source);
  const validEffort =
    (!low && !high) ||
    (low !== "" &&
      high !== "" &&
      Number(low) >= 0 &&
      Number(high) >= Number(low));
  const validId =
    /^WP-\d{3}$/.test(id) && !snapshot.entities.some((e) => e.id === id);
  const valid =
    validId &&
    title.trim() &&
    outcome.trim() &&
    criterion.trim() &&
    source &&
    section &&
    validEffort;
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || busy) return;
    const relations = [
      ...(owner ? [{ type: "owned_by", target: owner }] : []),
      ...(dependency ? [{ type: "depends_on", target: dependency }] : []),
    ];
    onCreate({
      id,
      kind: "WorkPackage",
      title: title.trim(),
      summary: summary.trim(),
      status: "proposed",
      confidence: 0.5,
      owner: owner || null,
      effort: low && high ? [Number(low), Number(high)] : null,
      outcome: outcome.trim(),
      work_type: workType,
      validation_criterion: criterion.trim(),
      skill: skill.trim() || null,
      milestone: milestone || null,
      evidence: [{ source, section }],
      relations,
      details: {},
      repo_url: null,
      location: null,
    });
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal wp-form"
        role="dialog"
        aria-modal="true"
        aria-label="New work package"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <header>
          <div>
            <code>SEMANTIC MODEL / NEW WORK PACKAGE</code>
            <h2>Define a verifiable outcome</h2>
          </div>
          <button type="button" aria-label="Close form" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <p>
          Creates one structured file. IDs stay permanent in Git history; keep
          estimates and dates unknown until evidence supports them.
        </p>
        <div className="wp-form-grid">
          <label>
            ID
            <input
              aria-label="Work package ID"
              value={id}
              onChange={(e) => setId(e.target.value.toUpperCase())}
              required
            />
          </label>
          <label>
            Type
            <select
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
            >
              <option value="known">Known</option>
              <option value="integration">Integration</option>
              <option value="research">Research</option>
            </select>
          </label>
          <label className="wide">
            Title
            <input
              aria-label="Work package title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label className="wide">
            Summary
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
            />
          </label>
          <label className="wide">
            Outcome
            <textarea
              aria-label="Verifiable outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              rows={2}
              required
            />
          </label>
          <label className="wide">
            Validation criterion
            <textarea
              aria-label="Validation criterion"
              value={criterion}
              onChange={(e) => setCriterion(e.target.value)}
              rows={2}
              required
            />
          </label>
          <label>
            Source
            <select
              aria-label="Evidence source"
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setSection("");
              }}
              required
            >
              <option value="">Choose source…</option>
              {sources.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.id} · {e.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Section
            <select
              aria-label="Evidence section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              required
            >
              <option value="">Choose section…</option>
              {Object.keys(selectedSource?.details ?? {})
                .filter((s) => s !== "file")
                .map((s) => (
                  <option key={s}>{s}</option>
                ))}
            </select>
          </label>
          <label>
            Owner
            <select value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="">Unknown</option>
              {snapshot.entities
                .filter((e) => e.kind === "Team")
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Milestone
            <select
              value={milestone}
              onChange={(e) => setMilestone(e.target.value)}
            >
              <option value="">Unknown</option>
              {snapshot.entities
                .filter((e) => e.kind === "Milestone")
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Effort min · person-weeks
            <input
              type="number"
              min="0"
              step="0.1"
              value={low}
              onChange={(e) => setLow(e.target.value)}
            />
          </label>
          <label>
            Effort max · person-weeks
            <input
              type="number"
              min="0"
              step="0.1"
              value={high}
              onChange={(e) => setHigh(e.target.value)}
            />
          </label>
          <label>
            Skill area
            <input value={skill} onChange={(e) => setSkill(e.target.value)} />
          </label>
          <label>
            Depends on
            <select
              value={dependency}
              onChange={(e) => setDependency(e.target.value)}
            >
              <option value="">None yet</option>
              {snapshot.entities
                .filter((e) => e.kind === "WorkPackage")
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.id} · {e.title}
                  </option>
                ))}
            </select>
          </label>
        </div>
        {!validId && (
          <p className="form-hint">Use an unused ID such as WP-014.</p>
        )}
        {!validEffort && (
          <p className="form-hint">
            Set both effort bounds, or leave both unknown.
          </p>
        )}
        <footer>
          <span>Review the new file in Git after saving.</span>
          <button className="primary" disabled={!valid || busy} type="submit">
            <Plus size={15} /> Create work package
          </button>
        </footer>
      </form>
    </div>
  );
}
