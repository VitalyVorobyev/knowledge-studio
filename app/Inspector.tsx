import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { X, ArrowUpRight, Save, Plus, Trash2 } from "lucide-react";
import {
  type Entity,
  type Snapshot,
  statuses,
  relations,
  colors,
} from "./types";
export function Inspector({
  entity,
  snapshot,
  onClose,
  onSelect,
  onSave,
  onDelete,
  editable,
  busy,
}: {
  entity: Entity;
  snapshot: Snapshot;
  onClose: () => void;
  onSelect: (id: string) => void;
  onSave: (e: Entity) => void;
  onDelete: (id: string) => void;
  editable: boolean;
  busy: boolean;
}) {
  const [draft, setDraft] = useState<Entity>(structuredClone(entity));
  const [relType, setRelType] = useState("depends_on");
  const [target, setTarget] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(entity);
  const lookup = (id: string) => snapshot.entities.find((e) => e.id === id);
  function owner(value: string) {
    setDraft({
      ...draft,
      owner: value || null,
      relations: [
        ...draft.relations.filter((r) => r.type !== "owned_by"),
        ...(value ? [{ type: "owned_by", target: value }] : []),
      ],
    });
  }
  return (
    <aside className="inspector" aria-label="Entity inspector">
      <header>
        <span style={{ color: colors[entity.kind] }}>
          {entity.kind} / {entity.id}
        </span>
        <button aria-label="Close inspector" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      <div className="inspector-body">
        {editable && entity.kind === "WorkPackage" ? (
          <>
            <label>
              Title
              <input
                aria-label="Work package title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label>
              Summary
              <textarea
                aria-label="Work package summary"
                value={draft.summary}
                onChange={(e) =>
                  setDraft({ ...draft, summary: e.target.value })
                }
                rows={2}
              />
            </label>
          </>
        ) : (
          <>
            <h2>{entity.title}</h2>
            <p>{entity.summary}</p>
          </>
        )}
        {entity.details.change_request && (
          <div className="change-badge">
            Changed by {entity.details.change_request}
          </div>
        )}
        <div className="section-label">Targeted semantic edits</div>
        <div className="edit-grid">
          <label>
            Status
            <select
              aria-label="Entity status"
              disabled={!editable}
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            >
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Confidence
            <input
              aria-label="Entity confidence"
              disabled={!editable}
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={draft.confidence}
              onChange={(e) =>
                setDraft({ ...draft, confidence: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <label>
          Owner
          <select
            aria-label="Entity owner"
            disabled={!editable}
            value={draft.owner ?? ""}
            onChange={(e) => owner(e.target.value)}
          >
            <option value="">Unassigned</option>
            {snapshot.entities
              .filter((e) => e.kind === "Team")
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
          </select>
        </label>
        {entity.kind === "WorkPackage" && (
          <>
            <div className="section-label">Verifiable outcome</div>
            {editable ? (
              <>
                <label>
                  Outcome
                  <textarea
                    aria-label="Work package outcome"
                    value={draft.outcome ?? ""}
                    onChange={(e) =>
                      setDraft({ ...draft, outcome: e.target.value })
                    }
                    rows={2}
                  />
                </label>
                <label>
                  Validation criterion
                  <textarea
                    aria-label="Work package validation criterion"
                    value={draft.validation_criterion ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        validation_criterion: e.target.value,
                      })
                    }
                    rows={2}
                  />
                </label>
                <label>
                  Work type
                  <select
                    value={draft.work_type ?? ""}
                    onChange={(e) =>
                      setDraft({ ...draft, work_type: e.target.value || null })
                    }
                  >
                    <option value="">Unknown</option>
                    <option value="known">Known</option>
                    <option value="integration">Integration</option>
                    <option value="research">Research</option>
                  </select>
                </label>
                <label>
                  Skill area
                  <input
                    value={draft.skill ?? ""}
                    onChange={(e) =>
                      setDraft({ ...draft, skill: e.target.value || null })
                    }
                  />
                </label>
                <label>
                  Milestone
                  <select
                    value={draft.milestone ?? ""}
                    onChange={(e) =>
                      setDraft({ ...draft, milestone: e.target.value || null })
                    }
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
              </>
            ) : (
              <>
                <p>{entity.outcome}</p>
                <div className="criterion">{entity.validation_criterion}</div>
              </>
            )}
            {editable ? (
              <>
                <div className="edit-grid">
                  <label>
                    Effort min · person-weeks
                    <input
                      aria-label="Effort minimum"
                      type="number"
                      min="0"
                      step="0.1"
                      value={draft.effort?.[0] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        const min = Number(value);
                        setDraft({
                          ...draft,
                          effort:
                            value === ""
                              ? null
                              : [min, Math.max(min, draft.effort?.[1] ?? min)],
                        });
                      }}
                    />
                  </label>
                  <label>
                    Effort max · person-weeks
                    <input
                      aria-label="Effort maximum"
                      type="number"
                      min="0"
                      step="0.1"
                      value={draft.effort?.[1] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        const max = Number(value);
                        setDraft({
                          ...draft,
                          effort:
                            value === ""
                              ? null
                              : [Math.min(max, draft.effort?.[0] ?? max), max],
                        });
                      }}
                    />
                  </label>
                </div>
                {draft.effort && (
                  <button
                    className="text-button"
                    onClick={() => setDraft({ ...draft, effort: null })}
                  >
                    Clear estimate
                  </button>
                )}
              </>
            ) : (
              <dl>
                <dt>Effort range</dt>
                <dd>
                  {entity.effort
                    ? `${entity.effort.join("–")} person-weeks`
                    : "Unknown"}
                </dd>
                <dt>Work type</dt>
                <dd>{entity.work_type ?? "Unknown"}</dd>
                <dt>Skill area</dt>
                <dd>{entity.skill ?? "Unknown"}</dd>
                <dt>Milestone</dt>
                <dd>
                  {entity.milestone ? (
                    <button
                      className="text-button"
                      onClick={() => onSelect(entity.milestone!)}
                    >
                      {lookup(entity.milestone)?.title}
                    </button>
                  ) : (
                    "Unknown"
                  )}
                </dd>
              </dl>
            )}
          </>
        )}
        {entity.kind === "Source" && (
          <>
            <div className="section-label">
              Source ·{" "}
              {entity.location?.type === "local"
                ? entity.location.path
                : entity.location?.type === "external"
                  ? entity.location.url
                  : "unknown"}
            </div>
            {entity.location?.type === "external" && (
              <button
                onClick={() =>
                  void openUrl(
                    entity.location?.type === "external"
                      ? entity.location.url
                      : "",
                  )
                }
              >
                Open external source <ArrowUpRight size={14} />
              </button>
            )}
            <pre className="source-document">
              {snapshot.documents[entity.id] ??
                "External source: follow the URL above for the authoritative record."}
            </pre>
          </>
        )}
        {entity.repo_url && (
          <button
            className="evidence"
            onClick={() => void openUrl(entity.repo_url!)}
          >
            Open repository <ArrowUpRight size={14} />
          </button>
        )}
        {entity.kind !== "Source" && Object.keys(entity.details).length > 0 && (
          <>
            <div className="section-label">
              {entity.kind === "Source"
                ? "Source document · exact sections"
                : "Properties"}
            </div>
            {Object.entries(entity.details).map(([k, v]) => (
              <div className="property" key={k} id={k}>
                <code>{k}</code>
                <p>{v}</p>
              </div>
            ))}
          </>
        )}
        <div className="section-label">
          Outgoing relations · {draft.relations.length}
        </div>
        <div className="link-list">
          {draft.relations.map((r) => (
            <div className="relation" key={r.type + r.target}>
              <button onClick={() => onSelect(r.target)}>
                <small>{r.type.replaceAll("_", " ")}</small>
                <span>
                  <code>{r.target}</code> {lookup(r.target)?.title}
                </span>
              </button>
              {editable && r.type !== "owned_by" && (
                <button
                  aria-label={`Remove ${r.type} ${r.target}`}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      relations: draft.relations.filter((x) => x !== r),
                    })
                  }
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
        {editable && (
          <div className="add-relation">
            <select
              aria-label="Relation type"
              value={relType}
              onChange={(e) => setRelType(e.target.value)}
            >
              {relations
                .filter((r) => r !== "owned_by")
                .map((r) => (
                  <option key={r}>{r}</option>
                ))}
            </select>
            <select
              aria-label="Relation target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">Choose target…</option>
              {snapshot.entities
                .filter((e) => e.id !== entity.id)
                .map((e) => (
                  <option value={e.id} key={e.id}>
                    {e.id} · {e.title}
                  </option>
                ))}
            </select>
            <button
              disabled={
                !target ||
                draft.relations.some(
                  (r) => r.type === relType && r.target === target,
                )
              }
              onClick={() => {
                setDraft({
                  ...draft,
                  relations: [...draft.relations, { type: relType, target }],
                });
                setTarget("");
              }}
            >
              <Plus size={14} />
              Add relation
            </button>
          </div>
        )}
        <div className="section-label">
          Backlinks · {snapshot.backlinks[entity.id]?.length ?? 0}
        </div>
        <div className="link-list">
          {snapshot.backlinks[entity.id]?.map((b, i) => (
            <button
              key={b.source + b.type + i}
              onClick={() => onSelect(b.source)}
            >
              <small>{b.type.replaceAll("_", " ")}</small>
              <span>
                <code>{b.source}</code> {lookup(b.source)?.title}
              </span>
              <ArrowUpRight size={12} />
            </button>
          )) ?? <p>No incoming references yet.</p>}
        </div>
        <div className="section-label">Source evidence</div>
        {entity.evidence.length ? (
          entity.evidence.map((ev, i) => (
            <button
              className="evidence"
              key={ev.source + ev.section + i}
              onClick={() => onSelect(ev.source)}
            >
              <code>
                {ev.source} / {ev.section}
              </code>
              <span>{lookup(ev.source)?.details[ev.section]}</span>
            </button>
          ))
        ) : (
          <p className="muted">Source document is a root evidence item.</p>
        )}
        {editable && entity.kind === "WorkPackage" && (
          <div className="delete-section">
            <div className="section-label">Remove work package</div>
            {(snapshot.backlinks[entity.id]?.length ?? 0) > 0 ? (
              <p>
                Remove the {snapshot.backlinks[entity.id].length} incoming
                references shown above before deleting this file.
              </p>
            ) : (
              <>
                <p>
                  Deletes this entity file and its saved layout and provisional
                  plan. Git can restore the file.
                </p>
                {deleteConfirm ? (
                  <div className="delete-actions">
                    <button onClick={() => setDeleteConfirm(false)}>
                      Cancel
                    </button>
                    <button
                      className="danger"
                      disabled={busy}
                      onClick={() => onDelete(entity.id)}
                    >
                      Delete {entity.id}
                    </button>
                  </div>
                ) : (
                  <button
                    className="danger"
                    disabled={busy}
                    onClick={() => setDeleteConfirm(true)}
                  >
                    <Trash2 size={14} /> Delete work package…
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <footer>
        {editable ? (
          <>
            <span>
              {dirty
                ? "Unsaved semantic changes"
                : "Files are the source of truth"}
            </span>
            <button
              className="primary"
              disabled={!dirty || busy}
              onClick={() => onSave(draft)}
            >
              <Save size={14} />
              Save changes
            </button>
          </>
        ) : (
          <span>
            Read-only preview · editing is available in the desktop app
          </span>
        )}
      </footer>
    </aside>
  );
}
