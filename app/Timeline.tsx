import type { Entity, Views } from "./types";
export function Timeline({
  entities,
  all,
  views,
  onSelect,
  onPlan,
  editable,
  origin,
}: {
  entities: Entity[];
  all: Entity[];
  views: Views;
  onSelect: (id: string) => void;
  onPlan: (id: string, start: number, duration: number) => void;
  editable: boolean;
  origin: string | null;
}) {
  function drag(
    event: React.PointerEvent<HTMLDivElement>,
    e: Entity,
    resize: boolean,
  ) {
    if (!editable) return;
    event.preventDefault();
    event.stopPropagation();
    const bar = event.currentTarget;
    const track = bar.closest(".time-track") as HTMLElement;
    const unit = track.clientWidth / 28;
    const p = views.planning[e.id] ?? { start: 0, duration: 4 };
    const x = event.clientX;
    let next = { ...p };
    bar.setPointerCapture(event.pointerId);
    const move = (ev: PointerEvent) => {
      const delta = Math.round((ev.clientX - x) / unit);
      next = resize
        ? {
            start: p.start,
            duration: Math.max(1, Math.min(28 - p.start, p.duration + delta)),
          }
        : {
            start: Math.max(0, Math.min(28 - p.duration, p.start + delta)),
            duration: p.duration,
          };
      const el = track.querySelector(".time-bar") as HTMLElement;
      el.style.left = `${(next.start / 28) * 100}%`;
      el.style.width = `${(next.duration / 28) * 100}%`;
    };
    const end = () => {
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", end);
      bar.removeEventListener("pointercancel", cancel);
      const el = track.querySelector(".time-bar") as HTMLElement;
      el.style.left = `${(p.start / 28) * 100}%`;
      el.style.width = `${(p.duration / 28) * 100}%`;
      if (next.start !== p.start || next.duration !== p.duration)
        onPlan(e.id, next.start, next.duration);
    };
    const cancel = () => {
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", end);
      bar.removeEventListener("pointercancel", cancel);
      const el = track.querySelector(".time-bar") as HTMLElement;
      el.style.left = `${(p.start / 28) * 100}%`;
      el.style.width = `${(p.duration / 28) * 100}%`;
    };
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", end);
    bar.addEventListener("pointercancel", cancel);
  }
  const wp = entities.filter((e) => e.kind === "WorkPackage");
  return (
    <>
      <div className="notice">
        Provisional plan ·{" "}
        {origin ? `week 1 starts ${origin}` : "origin date unknown"}. Drag bars
        to move; drag the right edge to resize. Keyboard: ← / → move; Shift +
        arrow resizes. These edits change knowledge-studio/views/workspace.json
        only.
      </div>
      <div className="timeline">
        <div className="time-head">
          <span>Engineering outcome</span>
          <div>
            {Array.from({ length: 28 }, (_, i) => (
              <b key={i}>{i + 1}</b>
            ))}
          </div>
        </div>
        {wp.map((e) => {
          const p = views.planning[e.id];
          if (!p)
            return (
              <div className="time-row" key={e.id}>
                <button className="time-label" onClick={() => onSelect(e.id)}>
                  <code>{e.id}</code>
                  <span>{e.title}</span>
                </button>
                <div
                  className="time-track"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    paddingLeft: 14,
                  }}
                >
                  Unscheduled{" "}
                  {editable && (
                    <button onClick={() => onPlan(e.id, 0, 4)}>
                      Add provisional bar
                    </button>
                  )}
                </div>
              </div>
            );
          const warnings = e.relations.filter(
            (r) =>
              r.type === "depends_on" &&
              views.planning[r.target] &&
              views.planning[r.target].start +
                views.planning[r.target].duration >
                p.start,
          );
          return (
            <div className="time-row" key={e.id}>
              <button className="time-label" onClick={() => onSelect(e.id)}>
                <code>{e.id}</code>
                <span>{e.title}</span>
                {warnings.length > 0 && (
                  <i
                    title={`Starts before dependencies finish: ${warnings.map((x) => x.target).join(", ")}`}
                  >
                    ⚠
                  </i>
                )}
              </button>
              <div className="time-track">
                <div
                  className={`time-bar ${e.status === "done" ? "done" : ""}`}
                  style={{
                    left: `${(p.start / 28) * 100}%`,
                    width: `${(p.duration / 28) * 100}%`,
                  }}
                  role="slider"
                  tabIndex={editable ? 0 : -1}
                  aria-label={`${e.id} planned start week`}
                  aria-valuemin={1}
                  aria-valuemax={28}
                  aria-valuenow={p.start + 1}
                  aria-valuetext={`Start week ${p.start + 1}, duration ${p.duration} weeks`}
                  onDoubleClick={() => onSelect(e.id)}
                  onPointerDown={(ev) => drag(ev, e, false)}
                  onKeyDown={(ev) => {
                    if (
                      !editable ||
                      !["ArrowLeft", "ArrowRight"].includes(ev.key)
                    )
                      return;
                    ev.preventDefault();
                    const delta = ev.key === "ArrowRight" ? 1 : -1;
                    onPlan(
                      e.id,
                      ev.shiftKey
                        ? p.start
                        : Math.max(
                            0,
                            Math.min(28 - p.duration, p.start + delta),
                          ),
                      ev.shiftKey
                        ? Math.max(
                            1,
                            Math.min(28 - p.start, p.duration + delta),
                          )
                        : p.duration,
                    );
                  }}
                >
                  <span>
                    {p.duration}w · {e.owner ?? "owner unknown"}
                  </span>
                  <div
                    className="resize"
                    onPointerDown={(ev) => drag(ev, e, true)}
                    title="Resize planned duration"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="milestones">
        {all
          .filter((e) => e.kind === "Milestone")
          .map((e) => (
            <button key={e.id} onClick={() => onSelect(e.id)}>
              <small>
                {e.id} · {e.status}
              </small>
              <strong>◇ {e.title}</strong>
              <span>{e.details.target_date ?? "date unknown"}</span>
            </button>
          ))}
      </div>
      <p className="footnote">
        Effort is in person-weeks; bar length is elapsed planning time.
        Milestone targets remain semantic fields and are not silently
        rescheduled. ⚠ indicates an overlapping dependency.
      </p>
    </>
  );
}
