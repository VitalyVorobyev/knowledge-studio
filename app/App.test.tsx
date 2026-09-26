// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Inspector } from "./Inspector";
import { Timeline } from "./Timeline";
import { coverage, effortSum, type Entity, type Snapshot } from "./types";
import fixture from "../examples/packinspect/knowledge-studio/entities/WP-001.json";
import source from "../examples/packinspect/knowledge-studio/entities/SRC-001.json";
import owner from "../examples/packinspect/knowledge-studio/entities/OWN-002.json";
const entity = fixture as Entity;
const snapshot: Snapshot = {
  manifest: {
    schema_version: 2,
    project: "PackInspect",
    synthetic: true,
    planning_origin: "2026-10-05",
  },
  entities: [entity, source as Entity, owner as Entity],
  documents: { "SRC-001": "# Synthetic source\n## scope\nTest evidence" },
  views: {
    schema_version: 2,
    layouts: {},
    planning: { "WP-001": { start: 0, duration: 4 } },
  },
  backlinks: {},
  revision: "v1",
  root: "fixture",
  git: "",
  demo_applied: false,
};
afterEach(cleanup);
describe("Entity editing", () => {
  it("persists an explicit status change while preserving outcome and evidence", () => {
    const save = vi.fn();
    render(
      <Inspector
        entity={entity}
        snapshot={snapshot}
        onClose={() => {}}
        onSelect={() => {}}
        onSave={save}
        editable
        busy={false}
      />,
    );
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Entity status"), {
      target: { value: "blocked" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(save).toHaveBeenCalledWith({ ...entity, status: "blocked" });
  });
  it("navigates evidence to its source", () => {
    const select = vi.fn();
    render(
      <Inspector
        entity={entity}
        snapshot={snapshot}
        onClose={() => {}}
        onSelect={select}
        onSave={() => {}}
        editable={false}
        busy={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /SRC-001 \/ scope/ }));
    expect(select).toHaveBeenCalledWith("SRC-001");
    expect(screen.getByLabelText("Entity status")).toBeDisabled();
  });
  it("adds a typed dependency to the draft before saving", () => {
    const save = vi.fn();
    render(
      <Inspector
        entity={entity}
        snapshot={snapshot}
        onClose={() => {}}
        onSelect={() => {}}
        onSave={save}
        editable
        busy={false}
      />,
    );
    fireEvent.change(screen.getByLabelText("Relation target"), {
      target: { value: "SRC-001" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add relation" }));
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(save.mock.calls[0][0].relations).toContainEqual({
      type: "depends_on",
      target: "SRC-001",
    });
  });
});
describe("Provisional timeline", () => {
  it("moves and resizes with keyboard without touching the entity", () => {
    const plan = vi.fn();
    render(
      <Timeline
        entities={[entity]}
        all={[entity]}
        views={snapshot.views}
        onSelect={() => {}}
        onPlan={plan}
        editable
        origin="2026-10-05"
      />,
    );
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(plan).toHaveBeenLastCalledWith("WP-001", 1, 4);
    fireEvent.keyDown(slider, { key: "ArrowRight", shiftKey: true });
    expect(plan).toHaveBeenLastCalledWith("WP-001", 0, 5);
    expect(entity.effort).toEqual([2, 4]);
  });
});
describe("Evidence metrics", () => {
  it("does not count planned protocols as verified requirements", () => {
    const req = { ...entity, id: "REQ-001", kind: "Requirement" };
    const val = {
      ...entity,
      id: "VAL-001",
      kind: "Validation",
      status: "planned",
      relations: [{ type: "validates", target: "REQ-001" }],
    };
    expect(coverage([req, val])).toEqual({ total: 1, planned: 1, passed: 0 });
    expect(coverage([req, { ...val, status: "passed" }]).passed).toBe(1);
  });
  it("adds effort ranges without treating duration as effort", () => {
    expect(effortSum([entity, { ...entity, effort: [3, 7] }])).toEqual([5, 11]);
  });
});
