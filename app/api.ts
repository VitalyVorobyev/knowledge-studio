/// <reference types="vite/client" />
import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Entity, Snapshot, Views } from "./types";
export const desktop = isTauri();
export async function load(): Promise<Snapshot> {
  if (desktop) return invoke("load_workspace");
  const modules = import.meta.glob("../knowledge/entities/*.json", {
    eager: true,
    import: "default",
  });
  const manifest = (await import("../knowledge/manifest.json")).default;
  const views = (await import("../views/workspace.json")).default as Views;
  const entities = Object.values(modules) as Entity[];
  const sourceModules = import.meta.glob("../sources/*.md", {
    eager: true,
    query: "?raw",
    import: "default",
  });
  const documents = Object.fromEntries(
    entities
      .filter((e) => e.kind === "Source")
      .map((e) => [
        e.id,
        String(sourceModules[`../sources/${e.details.file}`]),
      ]),
  );
  const backlinks: Snapshot["backlinks"] = {};
  for (const e of entities) {
    for (const r of e.relations)
      (backlinks[r.target] ??= []).push({ source: e.id, type: r.type });
    for (const ev of e.evidence)
      (backlinks[ev.source] ??= []).push({
        source: e.id,
        type: `evidence: ${ev.section}`,
      });
  }
  return {
    manifest,
    documents,
    entities: entities.sort((a, b) => a.id.localeCompare(b.id)),
    views,
    backlinks,
    revision: "preview",
    root: "Read-only browser preview · open desktop app to edit files",
    git: "",
    demo_applied: entities.some((e) => e.details.change_request === "CR-01"),
  };
}
export function saveEntity(
  entity: Entity,
  revision: string,
): Promise<Snapshot> {
  return invoke("save_entity", { entity, revision });
}
export function saveViews(views: Views, revision: string): Promise<Snapshot> {
  return invoke("save_views", { views, revision });
}
export function demo(apply: boolean, revision: string): Promise<Snapshot> {
  return invoke("demo_change", { apply, revision });
}
export function diff(): Promise<string> {
  return invoke("git_diff");
}
