export type Relation = { type: string; target: string };
export type Entity = {
  id: string;
  kind: string;
  title: string;
  summary: string;
  status: string;
  confidence: number;
  owner: string | null;
  effort: [number, number] | null;
  outcome: string | null;
  work_type: string | null;
  validation_criterion: string | null;
  skill: string | null;
  milestone: string | null;
  evidence: { source: string; section: string }[];
  relations: Relation[];
  details: Record<string, string>;
};
export type Views = {
  schema_version: number;
  layouts: Record<string, Record<string, { x: number; y: number }>>;
  planning: Record<string, { start: number; duration: number }>;
};
export type Snapshot = {
  manifest: { schema_version: number; project: string; synthetic: boolean };
  entities: Entity[];
  views: Views;
  backlinks: Record<string, { source: string; type: string }[]>;
  documents: Record<string, string>;
  revision: string;
  root: string;
  git: string;
  demo_applied: boolean;
};
export const affected = [
  "REQ-001",
  "REQ-002",
  "CMP-001",
  "EXP-001",
  "EXP-002",
  "RSK-001",
  "WP-001",
  "WP-002",
  "WP-006",
  "MS-002",
  "MS-003",
];
export const statuses = [
  "proposed",
  "accepted",
  "active",
  "planned",
  "done",
  "blocked",
  "open",
  "assumption",
  "passed",
  "failed",
  "superseded",
];
export const relations = [
  "implements",
  "depends_on",
  "blocks",
  "validates",
  "derived_from",
  "supersedes",
  "owned_by",
  "implemented_in",
  "uses",
  "motivated_by",
];
export const colors: Record<string, string> = {
  Product: "#2d635e",
  Capability: "#327872",
  Requirement: "#3875a2",
  Component: "#5c6995",
  Repository: "#63718b",
  Interface: "#597c88",
  WorkPackage: "#327872",
  Decision: "#8b683f",
  Risk: "#b15245",
  Experiment: "#896895",
  Dataset: "#777b47",
  Validation: "#408573",
  Milestone: "#a77832",
  Team: "#697d8b",
  Source: "#827664",
};
export function coverage(entities: Entity[]) {
  const reqs = entities.filter((e) => e.kind === "Requirement");
  const vals = entities.filter((e) => e.kind === "Validation");
  return {
    total: reqs.length,
    planned: reqs.filter((r) =>
      vals.some((v) =>
        v.relations.some((l) => l.type === "validates" && l.target === r.id),
      ),
    ).length,
    passed: reqs.filter((r) =>
      vals.some(
        (v) =>
          v.status === "passed" &&
          v.relations.some((l) => l.type === "validates" && l.target === r.id),
      ),
    ).length,
  };
}
export function effortSum(entities: Entity[]): [number, number] {
  return entities.reduce<[number, number]>(
    (a, e) => [a[0] + (e.effort?.[0] ?? 0), a[1] + (e.effort?.[1] ?? 0)],
    [0, 0],
  );
}
