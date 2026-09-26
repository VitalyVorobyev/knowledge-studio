/// <reference types="vite/client" />
import { invoke, isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { Entity, Snapshot, Views } from "./types";
export const desktop = isTauri();
export async function recentProjects(): Promise<string[]> {
  return desktop ? invoke("recent_projects") : [];
}
export async function chooseProject(): Promise<string | null> {
  return desktop
    ? ((await open({ directory: true, multiple: false })) as string | null)
    : null;
}
export async function exampleProject(): Promise<string> {
  return desktop ? invoke("example_project") : "";
}
export async function openProject(path: string): Promise<Snapshot> {
  return desktop ? invoke("open_project", { path }) : load();
}
export async function load(): Promise<Snapshot> {
  if (desktop) return invoke("load_workspace");
  const modules = import.meta.glob(
    "../examples/packinspect/knowledge-studio/entities/*.json",
    { eager: true, import: "default" },
  );
  const manifest = (
    await import("../examples/packinspect/knowledge-studio/manifest.json")
  ).default;
  const views = (
    await import("../examples/packinspect/knowledge-studio/views/workspace.json")
  ).default as Views;
  const entities = Object.values(modules) as Entity[];
  const sourceModules = import.meta.glob(
    "../examples/packinspect/sources/*.md",
    { eager: true, query: "?raw", import: "default" },
  );
  const documents = Object.fromEntries(
    entities
      .filter((e) => e.kind === "Source" && e.location?.type === "local")
      .map((e) => [
        e.id,
        String(
          sourceModules[
            `../examples/packinspect/${e.location && "path" in e.location ? e.location.path : ""}`
          ],
        ),
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
    root: "PackInspect browser preview",
    git: "",
    demo_applied: false,
  };
}
export function saveEntity(
  entity: Entity,
  revision: string,
): Promise<Snapshot> {
  return invoke("save_entity", { entity, revision });
}
export function createWorkPackage(
  entity: Entity,
  revision: string,
): Promise<Snapshot> {
  return invoke("create_work_package", { entity, revision });
}
export function deleteWorkPackage(
  id: string,
  revision: string,
): Promise<Snapshot> {
  return invoke("delete_work_package", { id, revision });
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
