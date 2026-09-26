import { describe, expect, it } from "vitest";
import type { Entity } from "./types";
import {
  layoutPositions,
  shouldFocusRelations,
  visibleLinks,
} from "./graphLayout";

const item = (
  id: string,
  kind = "WorkPackage",
  relations: Entity["relations"] = [],
): Entity => ({
  id,
  kind,
  title: id,
  summary: "",
  status: "open",
  confidence: 0.5,
  owner: null,
  effort: null,
  outcome: null,
  work_type: null,
  validation_criterion: null,
  skill: null,
  milestone: null,
  evidence: [],
  relations,
  details: {},
  repo_url: null,
  location: null,
});

describe("Graph layout for sparse project maps", () => {
  const work = Array.from({ length: 12 }, (_, i) =>
    item(`WP-${String(i + 1).padStart(3, "0")}`),
  );
  work[0].relations = [{ type: "uses", target: "RSK-003" }];
  const entities = [
    ...work,
    item("RSK-001", "Risk"),
    item("RSK-002", "Risk"),
    item("RSK-003", "Risk"),
    item("MS-001", "Milestone"),
    item("MS-002", "Milestone"),
    item("MS-003", "Milestone"),
  ];

  it("focuses the only relationship without treating unrelated nodes as dependencies", () => {
    const links = visibleLinks(entities, "");
    expect(links).toEqual([
      { source: "WP-001", target: "RSK-003", type: "uses" },
    ]);
    expect(shouldFocusRelations(entities.length, links)).toBe(true);
    const focused = entities.filter(
      (e) => e.id === "WP-001" || e.id === "RSK-003",
    );
    const positions = layoutPositions(focused, links);
    expect(positions["WP-001"].x).toBeLessThan(positions["RSK-003"].x);
    expect(positions["WP-001"].y).toBe(positions["RSK-003"].y);
  });

  it("spreads all nodes over rows and columns without overlap", () => {
    const positions = layoutPositions(entities, visibleLinks(entities, ""));
    expect(
      new Set(Object.values(positions).map((p) => `${p.x},${p.y}`)).size,
    ).toBe(entities.length);
    expect(new Set(work.map((e) => positions[e.id].x)).size).toBeGreaterThan(1);
    expect(new Set(work.map((e) => positions[e.id].y)).size).toBeGreaterThan(1);
    expect(Math.max(...Object.values(positions).map((p) => p.x))).toBeLessThan(
      1200,
    );
  });

  it("does not manufacture relationships for an empty relation filter", () => {
    expect(visibleLinks(entities, "depends_on")).toEqual([]);
    expect(shouldFocusRelations(entities.length, [])).toBe(false);
  });
});
