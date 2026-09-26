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
  editable,
  busy,
}: {
  entity: Entity;
  snapshot: Snapshot;
  onClose: () => void;
  onSelect: (id: string) => void;
  onSave: (e: Entity) => void;
  editable: boolean;
  busy: boolean;
}) {
  const [draft, setDraft] = useState<Entity>(structuredClone(entity));
  const [relType, setRelType] = useState("depends_on");
  const [target, setTarget] = useState("");
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
        <h2>{entity.title}</h2>
        <p>{entity.summary}</p>
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
        {entity.outcome && (
          <>
            <div className="section-label">Verifiable outcome</div>
            <p>{entity.outcome}</p>
            <div className="criterion">{entity.validation_criterion}</div>
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
